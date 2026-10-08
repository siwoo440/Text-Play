// Supabase 연결: 로그인 계약(AuthAdapter)과 서버 저장 계약(SnapshotStore)의 실제 구현. Supabase가 여는 주소(로그인 /auth/v1, 표 /rest/v1)를 그대로 부른다. 스위치를 켜기 전에는 쓰이지 않는다.
import type { AccountProvider, AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AuthAdapter, AuthFailure, AuthResult, SignInInput, SocialProvider } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import type { PushResult, RemoteSnapshot, SnapshotStore } from "@chatbot/lib/account/snapshot-store"; // 서버 저장 계약

export interface SupabaseConfig // 연결 설정
{ // 구조 시작
    url: string; // 프로젝트 주소
    anonKey: string; // 공개 키
} // 구조 종료

interface SupabaseTokens // 출입증(로그인한 동안 요청에 붙이는 값)
{ // 구조 시작
    accessToken: string; // 요청에 붙이는 출입증(짧게 유효)
    refreshToken: string; // 출입증을 새로 받는 표
    expiresAt: number; // 출입증이 끝나는 시각(밀리초)
    userId: string; // 사용자 식별자
} // 구조 종료

export interface SupabaseOptions // 바꿔 끼울 수 있는 부품(테스트용)
{ // 구조 시작
    storage: Storage; // 출입증을 두는 저장소
    session?: Storage; // 간편 로그인 확인 글을 잠깐 두는 탭 저장소
    fetcher?: typeof fetch; // 요청 함수
    now?: () => number; // 지금 시각(밀리초)
    redirect?: (href: string) => void; // 다른 주소로 보내기
} // 구조 종료

export const SUPABASE_TOKENS_KEY = "mateverse:v1:auth"; // 출입증 저장 키(계정 칸과 상관없이 하나)
export const SUPABASE_VERIFIER_KEY = "mateverse:v1:auth-verifier"; // 간편 로그인 확인 글 저장 키(탭 저장소)
export const PASSWORD_MIN_LENGTH = 8; // 비밀번호 최소 길이
const SNAPSHOT_TABLE = "mv_snapshots"; // 저장본 표 이름
const DELETE_ACCOUNT_FUNCTION = "mv_delete_account"; // 계정 지우기 함수 이름(데이터베이스 설정 파일이 만듦)
const REFRESH_MARGIN_MS = 60_000; // 출입증이 이만큼 남으면 새로 받음
const supportedProviders: readonly SocialProvider[] = ["google", "kakao"]; // 앱이 받는 간편 로그인
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 이메일 모양

function readTokens(storage: Storage): SupabaseTokens | null // 출입증 읽기(없거나 모양이 다르면 없음)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        const parsed = JSON.parse(storage.getItem(SUPABASE_TOKENS_KEY) ?? "null") as Partial<SupabaseTokens> | null; // 해석
        return parsed !== null && typeof parsed === "object" && typeof parsed.accessToken === "string" && typeof parsed.refreshToken === "string" && typeof parsed.expiresAt === "number" && typeof parsed.userId === "string" ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt, userId: parsed.userId } : null; // 출입증 반환
    } // 시도 종료
    catch // 글이 깨짐
    { // 실패 시작
        return null; // 없음
    } // 실패 종료
} // 함수 종료

function toFailure(body: unknown): AuthFailure // 서비스가 알려 준 오류를 실패 이유로
{ // 함수 시작
    const text = JSON.stringify(body ?? "").toLowerCase(); // 오류 글
    if (text.includes("email_not_confirmed") || text.includes("email not confirmed")) // 메일 확인 전
    { // 조건 시작
        return "confirm-email"; // 메일 확인 안내
    } // 조건 종료
    if (text.includes("invalid_credentials") || text.includes("invalid login credentials") || text.includes("invalid_grant")) // 틀린 정보
    { // 조건 시작
        return "wrong-credentials"; // 틀린 정보 안내
    } // 조건 종료
    if (text.includes("user_already_exists") || text.includes("already registered") || text.includes("email_exists")) // 가입한 메일
    { // 조건 시작
        return "email-taken"; // 가입한 메일 안내
    } // 조건 종료
    if (text.includes("same_password") || text.includes("different from the old password")) // 예전과 같은 비밀번호
    { // 조건 시작
        return "same-password"; // 다른 비밀번호 안내
    } // 조건 종료
    if (text.includes("rate_limit") || text.includes("rate limit")) // 요청이 너무 잦음(메일은 한 시간에 보낼 수 있는 수가 정해져 있음)
    { // 조건 시작
        return "too-many"; // 잠시 뒤 안내
    } // 조건 종료
    if (text.includes("weak_password") || text.includes("password should be")) // 약한 비밀번호
    { // 조건 시작
        return "weak-password"; // 비밀번호 안내
    } // 조건 종료
    return text.includes("email_address_invalid") || text.includes("invalid email") ? "invalid-email" : "unavailable"; // 이메일 오류 아니면 서비스 오류
} // 함수 종료

function toBase64Url(bytes: Uint8Array): string // 주소에 넣을 수 있는 글로 바꾸기
{ // 함수 시작
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // 기호를 바꾸고 채움 글자를 뗌
} // 함수 종료

function createClient(config: SupabaseConfig, options: SupabaseOptions) // 두 구현이 함께 쓰는 요청 도구
{ // 함수 시작
    const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args)); // 요청 함수
    const now = options.now ?? (() => Date.now()); // 지금 시각
    const call = async (path: string, init: { method?: string; body?: unknown; token?: string; prefer?: string } = {}): Promise<{ status: number; body: unknown }> => // 요청 한 번
    { // 함수 시작
        const headers: Record<string, string> = { apikey: config.anonKey, authorization: `Bearer ${init.token ?? config.anonKey}` }; // 공개 키와 출입증
        if (init.body !== undefined) // 보낼 내용 있음
        { // 조건 시작
            headers["content-type"] = "application/json"; // 형식 표시
        } // 조건 종료
        if (init.prefer !== undefined) // 돌려받을 모양 지정
        { // 조건 시작
            headers.prefer = init.prefer; // 표시
        } // 조건 종료
        const response = await fetcher(`${config.url}${path}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) }); // 요청
        return { status: response.status, body: await response.json().catch(() => null) as unknown }; // 상태와 내용
    }; // 함수 종료
    const saveSession = (body: unknown): AccountSession | null => // 로그인 결과에서 출입증을 보관하고 계정 세션 만들기
    { // 함수 시작
        const record = body as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; user?: { id?: unknown; email?: unknown; app_metadata?: { provider?: unknown }; user_metadata?: { full_name?: unknown; name?: unknown } } } | null; // 로그인 결과
        const user = record?.user; // 사용자
        if (typeof record?.access_token !== "string" || typeof record.refresh_token !== "string" || typeof user?.id !== "string") // 로그인 결과가 아님
        { // 조건 시작
            return null; // 없음
        } // 조건 종료
        const issuedAt = now(); // 받은 시각
        options.storage.setItem(SUPABASE_TOKENS_KEY, JSON.stringify({ accessToken: record.access_token, refreshToken: record.refresh_token, expiresAt: issuedAt + (typeof record.expires_in === "number" ? record.expires_in : 3600) * 1000, userId: user.id } satisfies SupabaseTokens)); // 출입증 보관
        const email = typeof user.email === "string" ? user.email : null; // 이메일
        const given = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : ""; // 서비스가 준 이름
        const provider: AccountProvider = user.app_metadata?.provider === "google" ? "google" : user.app_metadata?.provider === "kakao" ? "kakao" : "email"; // 로그인 방법
        return { accountId: user.id.toLowerCase(), name: (given.trim() || email?.split("@")[0] || "member").slice(0, 60), email, provider, signedInAt: new Date(issuedAt).toISOString() }; // 계정 세션
    }; // 함수 종료
    const refresh = async (): Promise<string | null> => // 출입증 새로 받기(안 되면 없음)
    { // 함수 시작
        const tokens = readTokens(options.storage); // 지금 출입증
        if (tokens === null) // 로그인하지 않음
        { // 조건 시작
            return null; // 없음
        } // 조건 종료
        const result = await call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: tokens.refreshToken } }); // 새로 받기
        return result.status === 200 && saveSession(result.body) !== null ? readTokens(options.storage)?.accessToken ?? null : null; // 새 출입증
    }; // 함수 종료
    const accessToken = async (): Promise<string | null> => // 쓸 수 있는 출입증(곧 끝나면 새로 받음)
    { // 함수 시작
        const tokens = readTokens(options.storage); // 지금 출입증
        return tokens === null ? null : tokens.expiresAt - now() > REFRESH_MARGIN_MS ? tokens.accessToken : refresh(); // 남은 시간이 넉넉하면 그대로
    }; // 함수 종료
    const authed = async (path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<{ status: number; body: unknown }> => // 출입증을 붙인 요청(끝난 출입증이면 한 번 새로 받아 다시)
    { // 함수 시작
        const token = await accessToken(); // 출입증
        if (token === null) // 로그인하지 않음
        { // 조건 시작
            throw new Error("not signed in"); // 요청하지 못함
        } // 조건 종료
        const first = await call(path, { ...init, token }); // 요청
        const renewed = first.status === 401 ? await refresh() : null; // 출입증이 끝났으면 새로 받기
        return renewed === null ? first : call(path, { ...init, token: renewed }); // 새 출입증으로 다시
    }; // 함수 종료
    return { call, saveSession, refresh, accessToken, authed, now }; // 도구 반환
} // 함수 종료

export function createSupabaseAuthAdapter(config: SupabaseConfig, options: SupabaseOptions): AuthAdapter // Supabase 로그인 구현
{ // 함수 시작
    const client = createClient(config, options); // 요청 도구
    const session = options.session; // 탭 저장소
    const finish = (result: { status: number; body: unknown }, emptyMeansConfirm: boolean): AuthResult => // 로그인 요청 결과 정리
    { // 함수 시작
        if (result.status < 200 || result.status >= 300) // 거절
        { // 조건 시작
            return { ok: false, reason: toFailure(result.body) }; // 이유 반환
        } // 조건 종료
        const account = client.saveSession(result.body); // 출입증 보관과 세션
        return account !== null ? { ok: true, session: account } : { ok: false, reason: emptyMeansConfirm ? "confirm-email" : "unavailable" }; // 가입 뒤 출입증이 없으면 메일 확인이 필요한 것
    }; // 함수 종료
    const withPassword = async (input: SignInInput, path: string, emptyMeansConfirm: boolean): Promise<AuthResult> => // 이메일·비밀번호 요청
    { // 함수 시작
        const email = (input.email ?? "").trim().toLowerCase(); // 다듬은 이메일
        const password = input.password ?? ""; // 비밀번호
        if (!EMAIL_PATTERN.test(email)) // 이메일 모양 아님
        { // 조건 시작
            return { ok: false, reason: "invalid-email" }; // 거절
        } // 조건 종료
        if (password.length < PASSWORD_MIN_LENGTH) // 짧은 비밀번호
        { // 조건 시작
            return { ok: false, reason: "weak-password" }; // 거절
        } // 조건 종료
        try // 요청 시도
        { // 시도 시작
            return finish(await client.call(path, { method: "POST", body: { email, password } }), emptyMeansConfirm); // 결과 정리
        } // 시도 종료
        catch // 서비스에 닿지 못함
        { // 실패 시작
            return { ok: false, reason: "unavailable" }; // 서비스 오류
        } // 실패 종료
    }; // 함수 종료
    const canCompletePasswordReset = (params: URLSearchParams): boolean => params.get("type") === "recovery" && params.get("error") === null && (params.get("access_token") ?? "").length > 0 && (params.get("refresh_token") ?? "").length > 0; // 재설정 링크가 준 값인지(종류가 재설정이고, 오류가 없고, 출입증 두 개가 있음)
    return { // 로그인 계약 구현
        mode: "live", // 실제 서비스
        listAccounts: () => [], // 연습용 계정 목록 없음
        requestPasswordReset: async (rawEmail, redirectTo) => // 비밀번호를 다시 정하는 메일 보내기(가입하지 않은 주소여도 서비스는 성공으로 답함)
        { // 함수 시작
            const email = rawEmail.trim().toLowerCase(); // 다듬은 이메일
            if (!EMAIL_PATTERN.test(email)) // 이메일 모양 아님
            { // 조건 시작
                return { ok: false, reason: "invalid-email" }; // 거절
            } // 조건 종료
            try // 요청 시도
            { // 시도 시작
                const result = await client.call(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: { email } }); // 메일 요청(링크를 누르면 redirectTo로 돌아옴)
                return result.status >= 200 && result.status < 300 ? { ok: true } : { ok: false, reason: result.status === 429 ? "too-many" : toFailure(result.body) }; // 보냈거나 거절된 이유
            } // 시도 종료
            catch // 서비스에 닿지 못함
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 서비스 오류
            } // 실패 종료
        }, // 함수 종료
        canCompletePasswordReset, // 재설정 링크 판정
        completePasswordReset: async (params, password) => // 새 비밀번호 정하기(메일의 링크가 준 출입증으로 바꾸고 그 계정으로 로그인)
        { // 함수 시작
            const accessToken = params.get("access_token"); // 링크가 준 출입증
            const refreshToken = params.get("refresh_token"); // 링크가 준 출입증을 새로 받는 표
            if (!canCompletePasswordReset(params) || accessToken === null || refreshToken === null) // 쓸 수 없는 링크
            { // 조건 시작
                return { ok: false, reason: "link-expired" }; // 메일을 다시 받게 함
            } // 조건 종료
            if (password.length < PASSWORD_MIN_LENGTH) // 짧은 비밀번호
            { // 조건 시작
                return { ok: false, reason: "weak-password" }; // 거절
            } // 조건 종료
            try // 요청 시도
            { // 시도 시작
                const result = await client.call("/auth/v1/user", { method: "PUT", token: accessToken, body: { password } }); // 비밀번호 바꾸기
                if (result.status === 401 || result.status === 403) // 출입증이 끝났거나 이미 씀
                { // 조건 시작
                    return { ok: false, reason: "link-expired" }; // 메일을 다시 받게 함
                } // 조건 종료
                if (result.status < 200 || result.status >= 300) // 그 밖의 거절
                { // 조건 시작
                    return { ok: false, reason: toFailure(result.body) }; // 이유 반환
                } // 조건 종료
                const account = client.saveSession({ access_token: accessToken, refresh_token: refreshToken, expires_in: Number(params.get("expires_in")) || 3600, user: result.body }); // 링크가 준 출입증을 보관하고 계정 세션 만들기
                return account !== null ? { ok: true, session: account } : { ok: false, reason: "unavailable" }; // 로그인
            } // 시도 종료
            catch // 서비스에 닿지 못함
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 서비스 오류
            } // 실패 종료
        }, // 함수 종료
        signIn: (input) => withPassword(input, "/auth/v1/token?grant_type=password", false), // 로그인
        signUp: (input) => withPassword(input, "/auth/v1/signup", true), // 회원가입
        socialProviders: async () => // 프로젝트에서 켜 둔 간편 로그인
        { // 함수 시작
            try // 읽기 시도
            { // 시도 시작
                const result = await client.call("/auth/v1/settings"); // 프로젝트 설정
                const external = (result.body as { external?: Record<string, unknown> } | null)?.external ?? {}; // 켜 둔 서비스
                return supportedProviders.filter((provider) => external[provider] === true); // 앱이 받는 것만
            } // 시도 종료
            catch // 서비스에 닿지 못함
            { // 실패 시작
                return []; // 버튼을 보이지 않음
            } // 실패 종료
        }, // 함수 종료
        startSocialSignIn: async (provider, redirectTo) => // 간편 로그인 시작(서비스 화면으로 보냄)
        { // 함수 시작
            const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32))); // 이 탭만 아는 확인 글
            const challenge = toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)))); // 확인 글의 지문(서비스에는 지문만 보냄)
            session?.setItem(SUPABASE_VERIFIER_KEY, verifier); // 돌아왔을 때 쓰려고 탭에 남김
            const target = `${config.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}&code_challenge=${challenge}&code_challenge_method=s256`; // 서비스 주소
            (options.redirect ?? ((href: string) => window.location.assign(href)))(target); // 보내기
        }, // 함수 종료
        completeSocialSignIn: async (params) => // 간편 로그인 마무리(돌아온 주소의 코드로 출입증 받기)
        { // 함수 시작
            const code = params.get("code"); // 서비스가 준 코드
            const verifier = session?.getItem(SUPABASE_VERIFIER_KEY) ?? null; // 탭에 남긴 확인 글
            session?.removeItem(SUPABASE_VERIFIER_KEY); // 한 번 쓰고 지움
            if (code === null || verifier === null || params.get("error") !== null) // 거절됐거나 확인 글이 없음
            { // 조건 시작
                return { ok: false, reason: "unavailable" }; // 로그인하지 못함
            } // 조건 종료
            try // 요청 시도
            { // 시도 시작
                const result = finish(await client.call("/auth/v1/token?grant_type=pkce", { method: "POST", body: { auth_code: code, code_verifier: verifier } }), false); // 출입증 받기
                return result.ok ? result : { ok: false, reason: "unavailable" }; // 실패는 모두 서비스 오류로
            } // 시도 종료
            catch // 서비스에 닿지 못함
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 서비스 오류
            } // 실패 종료
        }, // 함수 종료
        signOut: async () => // 로그아웃
        { // 함수 시작
            const tokens = readTokens(options.storage); // 지금 출입증
            options.storage.removeItem(SUPABASE_TOKENS_KEY); // 이 기기의 출입증부터 지움
            if (tokens !== null) // 로그인해 있었음
            { // 조건 시작
                await client.call("/auth/v1/logout", { method: "POST", token: tokens.accessToken }).catch(() => undefined); // 서비스에 알림(실패해도 이 기기에서는 로그아웃)
            } // 조건 종료
        }, // 함수 종료
        deleteAccount: async () => // 계정 지우기(탈퇴): 데이터베이스의 함수가 내 계정을 지우고, 저장본은 계정과 함께 지워짐
        { // 함수 시작
            try // 요청 시도
            { // 시도 시작
                const result = await client.authed(`/rest/v1/rpc/${DELETE_ACCOUNT_FUNCTION}`, { method: "POST", body: {} }); // 내 출입증으로 지우기 함수 부르기
                if (result.status < 200 || result.status >= 300) // 거절(함수를 만들지 않았거나 서버가 받지 않음)
                { // 조건 시작
                    return { ok: false, reason: "unavailable" }; // 지우지 못함(로그인은 그대로)
                } // 조건 종료
                options.storage.removeItem(SUPABASE_TOKENS_KEY); // 지운 계정의 출입증을 이 기기에서 지움
                return { ok: true }; // 지움
            } // 시도 종료
            catch // 로그인하지 않았거나 서비스에 닿지 못함
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 지우지 못함
            } // 실패 종료
        }, // 함수 종료
    }; // 구현 반환
} // 함수 종료

function toSnapshot(row: unknown): RemoteSnapshot | null // 표의 줄을 저장본으로
{ // 함수 시작
    const record = row as { revision?: unknown; state?: unknown; updated_at?: unknown; device_id?: unknown } | null; // 줄
    return record !== null && typeof record === "object" && typeof record.state === "string" && Number.isInteger(Number(record.revision)) ? { revision: Number(record.revision), state: record.state, updatedAt: typeof record.updated_at === "string" ? record.updated_at : "", deviceId: typeof record.device_id === "string" ? record.device_id : "" } : null; // 저장본 반환
} // 함수 종료

export function createSupabaseSnapshotStore(config: SupabaseConfig, options: SupabaseOptions): SnapshotStore // Supabase 저장본 구현(표 mv_snapshots에 계정마다 한 줄)
{ // 함수 시작
    const client = createClient(config, options); // 요청 도구
    const request = client.authed; // 출입증을 붙인 요청
    const pull = async (accountId: string): Promise<RemoteSnapshot | null> => // 저장본 받기
    { // 함수 시작
        const result = await request(`/rest/v1/${SNAPSHOT_TABLE}?select=revision,state,updated_at,device_id&user_id=eq.${encodeURIComponent(accountId)}&limit=1`); // 내 줄 읽기
        if (result.status !== 200 || !Array.isArray(result.body)) // 읽지 못함
        { // 조건 시작
            throw new Error(`snapshot pull failed: ${result.status}`); // 맞추기 도구가 연결 실패로 처리
        } // 조건 종료
        return result.body.length === 0 ? null : toSnapshot(result.body[0]); // 없으면 null
    }; // 함수 종료
    const conflict = async (accountId: string): Promise<PushResult> => ({ ok: false, reason: "conflict", remote: await pull(accountId).catch(() => null) }); // 겹침(서버 것을 함께 알림)
    return { // 서버 저장 계약 구현
        mode: "live", // 실제 서비스
        pull, // 받기
        push: async (accountId, state, expectedRevision, deviceId) => // 올리기
        { // 함수 시작
            try // 요청 시도
            { // 시도 시작
                const result = expectedRevision === null // 처음인지
                    ? await request(`/rest/v1/${SNAPSHOT_TABLE}`, { method: "POST", prefer: "return=representation", body: { user_id: accountId, revision: 1, state, device_id: deviceId } }) // 새 줄 만들기(이미 있으면 서버가 거절)
                    : await request(`/rest/v1/${SNAPSHOT_TABLE}?user_id=eq.${encodeURIComponent(accountId)}&revision=eq.${expectedRevision}`, { method: "PATCH", prefer: "return=representation", body: { revision: expectedRevision + 1, state, device_id: deviceId } }); // 내가 본 번호일 때만 고치기
                const saved = Array.isArray(result.body) ? toSnapshot(result.body[0]) : null; // 저장된 줄
                if (result.status >= 200 && result.status < 300 && saved !== null) // 저장됨
                { // 조건 시작
                    return { ok: true, revision: saved.revision, updatedAt: saved.updatedAt }; // 새 번호
                } // 조건 종료
                return result.status === 409 || (result.status === 200 && Array.isArray(result.body) && result.body.length === 0) ? conflict(accountId) : { ok: false, reason: "unavailable" }; // 번호가 달라 바뀐 줄이 없으면 겹침
            } // 시도 종료
            catch // 로그인하지 않았거나 서버에 닿지 못함
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 저장하지 못함
            } // 실패 종료
        }, // 함수 종료
    }; // 구현 반환
} // 함수 종료
