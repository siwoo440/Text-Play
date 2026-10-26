// 요청한 사람 확인: 서버 통로가 "누가 보냈는지"를 가린다. 내 컴퓨터에서 온 요청은 혼자 시험하는 용도로 그대로 받고, 바깥에서 온 요청은 공개를 켠 경우에만, 로그인한 사람에게서만 받는다.
import { createHash } from "node:crypto"; // 출입증의 지문 만들기(확인한 결과를 기억할 때 출입증 자체를 들고 있지 않게)
import { readAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정
import { isChatAllowedFrom, isLocalHost } from "@chatbot/lib/llm/chat-gate"; // 내 컴퓨터 주소·공개 여부 판정

export type ChatCaller = // 요청한 사람
    | { kind: "local" } // 내 컴퓨터(혼자 시험)
    | { kind: "member"; userId: string } // 로그인한 사람(계정 구분값)
    | { kind: "refused"; status: number; code: "local-only" | "login-required" | "auth-unavailable" }; // 받지 않음(이유)

export type TokenCheck = { ok: true; userId: string } | { ok: false; reason: "invalid" | "unavailable" }; // 출입증 확인 결과(invalid: 쓸 수 없는 출입증, unavailable: 계정 서비스에 닿지 못함)
export type TokenVerifier = (token: string) => Promise<TokenCheck>; // 출입증 확인 함수

export const VERIFY_CACHE_MS = 60_000; // 확인한 결과를 기억하는 시간(메시지마다 계정 서비스에 묻지 않게)
const VERIFY_CACHE_LIMIT = 5000; // 기억해 두는 출입증 수

const verified = new Map<string, { userId: string; until: number }>(); // 확인해 둔 출입증(지문 → 계정과 기억이 끝나는 시각)

export function resetCallerCache(): void // 기억 비우기(테스트용)
{ // 함수 시작
    verified.clear(); // 비움
} // 함수 종료

function fingerprint(token: string): string // 출입증의 지문
{ // 함수 시작
    return createHash("sha256").update(token).digest("hex"); // 지문 반환
} // 함수 종료

export function createTokenVerifier(env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = (...args) => fetch(...args), now: () => number = () => Date.now()): TokenVerifier | null // 계정 서비스(Supabase)에 물어 출입증을 확인하는 함수(계정 서비스를 연결하지 않았으면 없음)
{ // 함수 시작
    const config = readAccountServiceConfig({ service: env.NEXT_PUBLIC_ACCOUNT_SERVICE, url: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }); // 계정 서비스 설정
    if (config.mode !== "supabase") // 연습용 로그인(서버가 확인할 방법이 없음)
    { // 조건 시작
        return null; // 확인할 수 없음
    } // 조건 종료
    return async (token) => // 출입증 확인
    { // 함수 시작
        const key = fingerprint(token); // 지문
        const known = verified.get(key); // 기억해 둔 결과
        if (known !== undefined && known.until > now()) // 아직 기억하는 중
        { // 조건 시작
            return { ok: true, userId: known.userId }; // 다시 묻지 않음
        } // 조건 종료
        verified.delete(key); // 기억이 끝난 것은 지움
        try // 확인 시도
        { // 시도 시작
            const response = await fetcher(`${config.url}/auth/v1/user`, { headers: { apikey: config.anonKey, authorization: `Bearer ${token}` } }); // 이 출입증의 주인 묻기
            if (response.status === 401 || response.status === 403) // 쓸 수 없는 출입증
            { // 조건 시작
                return { ok: false, reason: "invalid" }; // 다시 로그인해야 함
            } // 조건 종료
            const body = response.ok ? await response.json().catch(() => null) as { id?: unknown } | null : null; // 사용자 정보
            if (typeof body?.id !== "string" || body.id.length === 0) // 사용자 정보가 아님(서비스 오류)
            { // 조건 시작
                return { ok: false, reason: "unavailable" }; // 확인하지 못함
            } // 조건 종료
            const userId = body.id.toLowerCase(); // 계정 구분값(앱의 계정 식별자와 같은 모양)
            if (verified.size >= VERIFY_CACHE_LIMIT) // 너무 많이 기억함
            { // 조건 시작
                verified.clear(); // 모두 비우고 다시 쌓음
            } // 조건 종료
            verified.set(key, { userId, until: now() + VERIFY_CACHE_MS }); // 잠깐 기억
            return { ok: true, userId }; // 확인됨
        } // 시도 종료
        catch // 계정 서비스에 닿지 못함
        { // 실패 시작
            return { ok: false, reason: "unavailable" }; // 확인하지 못함
        } // 실패 종료
    }; // 함수 종료
} // 함수 종료

function bearerToken(request: Request): string | null // 요청 머리말의 출입증
{ // 함수 시작
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? ""); // 출입증 꺼내기
    return match === null ? null : match[1]; // 출입증 또는 없음
} // 함수 종료

export async function identifyCaller(request: Request, env: Record<string, string | undefined> = process.env, verifier: TokenVerifier | null | undefined = undefined): Promise<ChatCaller> // 요청한 사람 가리기
{ // 함수 시작
    if (isLocalHost(request.headers.get("host"))) // 내 컴퓨터로 온 요청
    { // 조건 시작
        return { kind: "local" }; // 혼자 시험
    } // 조건 종료
    if (!isChatAllowedFrom(request.headers.get("host"), env)) // 공개를 켜지 않음
    { // 조건 시작
        return { kind: "refused", status: 403, code: "local-only" }; // 바깥 요청은 받지 않음
    } // 조건 종료
    const token = bearerToken(request); // 출입증
    if (token === null) // 로그인하지 않음
    { // 조건 시작
        return { kind: "refused", status: 401, code: "login-required" }; // 로그인해야 함
    } // 조건 종료
    const verify = verifier === undefined ? createTokenVerifier(env) : verifier; // 출입증 확인 함수
    if (verify === null) // 계정 서비스를 연결하지 않음
    { // 조건 시작
        return { kind: "refused", status: 503, code: "auth-unavailable" }; // 누구인지 확인할 수 없어 받지 않음
    } // 조건 종료
    const check = await verify(token); // 확인
    if (check.ok) // 로그인한 사람
    { // 조건 시작
        return { kind: "member", userId: check.userId }; // 계정 구분값
    } // 조건 종료
    return check.reason === "invalid" ? { kind: "refused", status: 401, code: "login-required" } : { kind: "refused", status: 503, code: "auth-unavailable" }; // 다시 로그인하거나 잠시 뒤 다시
} // 함수 종료
