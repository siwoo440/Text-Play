// 계정 세션: 지금 이 브라우저에 누가 로그인해 있는지를 앱 데이터와 따로 적어 둔다(앱 데이터 내보내기에 섞이지 않게).
export type AccountProvider = "practice" | "email" | "google" | "kakao"; // 로그인 방법(연습용, 이메일, 간편 로그인)

export interface AccountSession // 로그인한 계정
{ // 구조 시작
    accountId: string; // 계정 식별자(저장 칸의 이름에 쓰므로 영문 소문자·숫자·줄표만)
    name: string; // 화면에 보이는 계정 이름
    email: string | null; // 이메일(연습용 계정은 없음)
    provider: AccountProvider; // 로그인 방법
    signedInAt: string; // 로그인한 시각
} // 구조 종료

export const ACCOUNT_SESSION_KEY = "mateverse:v1:account"; // 계정 세션 저장 키
export const ACCOUNT_SESSION_EVENT = "mateverse:account-change"; // 같은 탭에서 세션이 바뀌었을 때 알리는 이벤트
const providers: readonly AccountProvider[] = ["practice", "email", "google", "kakao"]; // 로그인 방법 목록
const ACCOUNT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/; // 계정 식별자 모양

export function isAccountId(value: unknown): value is string // 계정 식별자 판정(저장 칸 이름으로 안전한지)
{ // 함수 시작
    return typeof value === "string" && ACCOUNT_ID_PATTERN.test(value); // 모양 확인
} // 함수 종료

function isAccountSession(value: unknown): value is AccountSession // 세션 모양 판정
{ // 함수 시작
    if (typeof value !== "object" || value === null) // 객체 아님
    { // 조건 시작
        return false; // 세션 아님
    } // 조건 종료
    const record = value as Record<string, unknown>; // 읽은 값
    return isAccountId(record.accountId) // 식별자
        && typeof record.name === "string" && record.name.trim().length > 0 && record.name.length <= 60 // 이름
        && (record.email === null || (typeof record.email === "string" && record.email.length <= 320)) // 이메일
        && providers.includes(record.provider as AccountProvider) // 로그인 방법
        && typeof record.signedInAt === "string"; // 로그인 시각
} // 함수 종료

export function readAccountSession(storage: Storage | undefined): AccountSession | null // 세션 읽기(없거나 모양이 다르면 로그인하지 않은 것)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        const raw = storage?.getItem(ACCOUNT_SESSION_KEY) ?? null; // 저장된 글
        const parsed: unknown = raw === null ? null : JSON.parse(raw); // 해석
        return isAccountSession(parsed) ? { accountId: parsed.accountId, name: parsed.name, email: parsed.email, provider: parsed.provider, signedInAt: parsed.signedInAt } : null; // 세션 반환
    } // 시도 종료
    catch // 저장소를 못 읽거나 글이 깨짐
    { // 실패 시작
        return null; // 로그인하지 않은 것으로 봄
    } // 실패 종료
} // 함수 종료

export function readActiveSession(storage: Storage | undefined, live: boolean): AccountSession | null // 지금 방식에 맞는 세션만 읽기(연습용 계정은 연습용일 때만, 실제 계정은 실제 서비스일 때만)
{ // 함수 시작
    const session = readAccountSession(storage); // 저장된 세션
    return session !== null && (session.provider === "practice") !== live ? session : null; // 방식이 바뀌었으면 로그인하지 않은 것으로 봄(다른 방식의 계정 칸을 열지 않게)
} // 함수 종료

export function writeAccountSession(storage: Storage, session: AccountSession | null): void // 세션 저장(null이면 로그아웃)
{ // 함수 시작
    if (session === null) // 로그아웃
    { // 조건 시작
        storage.removeItem(ACCOUNT_SESSION_KEY); // 세션 지움
    } // 조건 종료
    else // 로그인
    { // 저장 시작
        storage.setItem(ACCOUNT_SESSION_KEY, JSON.stringify(session)); // 세션 저장
    } // 저장 종료
    if (typeof window !== "undefined") // 브라우저
    { // 조건 시작
        window.dispatchEvent(new Event(ACCOUNT_SESSION_EVENT)); // 같은 탭의 화면에 알림
    } // 조건 종료
} // 함수 종료
