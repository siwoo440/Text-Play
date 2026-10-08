// 연습용 로그인: 실제 로그인 서비스를 연결하기 전에 계정 나누기를 이 브라우저 안에서 해 볼 수 있게 한다. 비밀번호 없이 이름만 받는다(보안이 없으므로 연습용).
import type { AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AuthAdapter, AuthResult, PracticeAccount, SignInInput } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { PRACTICE_SERVER_PREFIX } from "@chatbot/lib/account/snapshot-store"; // 연습용 서버 저장 키의 앞부분

export const PRACTICE_ACCOUNTS_KEY = "mateverse:v1:practice-accounts"; // 연습용 계정 목록 저장 키
export const PRACTICE_NAME_LIMIT = 20; // 계정 이름 최대 글자 수
const PRACTICE_ACCOUNT_LIMIT = 12; // 기억해 두는 연습용 계정 수

function hashName(name: string): string // 이름에서 계정 식별자에 쓸 글 만들기(같은 이름이면 같은 값)
{ // 함수 시작
    let hash = 5381; // 시작 값
    for (const letter of name.normalize("NFC").toLowerCase()) // 글자 순회
    { // 순회 시작
        hash = ((hash * 33) ^ (letter.codePointAt(0) ?? 0)) >>> 0; // 섞기
    } // 순회 종료
    return hash.toString(36); // 영문 소문자·숫자로
} // 함수 종료

function readAccounts(storage: Storage): PracticeAccount[] // 저장된 연습용 계정 읽기(모양이 다르면 빈 목록)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        const parsed: unknown = JSON.parse(storage.getItem(PRACTICE_ACCOUNTS_KEY) ?? "[]"); // 해석
        return Array.isArray(parsed) ? parsed.filter((item): item is PracticeAccount => typeof item === "object" && item !== null && typeof (item as PracticeAccount).accountId === "string" && typeof (item as PracticeAccount).name === "string" && typeof (item as PracticeAccount).usedAt === "string") : []; // 계정 목록
    } // 시도 종료
    catch // 글이 깨짐
    { // 실패 시작
        return []; // 빈 목록
    } // 실패 종료
} // 함수 종료

export function createPracticeAuthAdapter(storage: Storage, now: () => string = () => new Date().toISOString()): AuthAdapter // 연습용 로그인 만들기
{ // 함수 시작
    const signIn = async (input: SignInInput): Promise<AuthResult> => // 이름으로 들어가기(없으면 만듦)
    { // 함수 시작
        const name = (input.name ?? "").trim(); // 다듬은 이름
        if (name.length === 0 || name.length > PRACTICE_NAME_LIMIT) // 빈 이름·긴 이름
        { // 조건 시작
            return { ok: false, reason: "invalid-name" }; // 거절
        } // 조건 종료
        const signedInAt = now(); // 로그인 시각
        const account: PracticeAccount = { accountId: `practice-${hashName(name)}`, name, usedAt: signedInAt }; // 연습용 계정
        storage.setItem(PRACTICE_ACCOUNTS_KEY, JSON.stringify([account, ...readAccounts(storage).filter((item) => item.accountId !== account.accountId)].slice(0, PRACTICE_ACCOUNT_LIMIT))); // 최근에 쓴 계정을 앞에 두고 저장
        const session: AccountSession = { accountId: account.accountId, name, email: null, provider: "practice", signedInAt }; // 세션
        return { ok: true, session }; // 로그인 성공
    }; // 함수 종료
    return { // 로그인 계약 구현
        mode: "practice", // 연습용
        socialProviders: async () => [], // 간편 로그인 없음
        startSocialSignIn: async () => undefined, // 간편 로그인 없음
        completeSocialSignIn: async () => ({ ok: false, reason: "unavailable" }), // 간편 로그인 없음
        signIn, // 로그인
        signUp: signIn, // 연습용은 가입과 로그인이 같음
        requestPasswordReset: async () => ({ ok: false, reason: "unavailable" }), // 비밀번호가 없어 다시 정할 것도 없음
        canCompletePasswordReset: () => false, // 비밀번호가 없음
        completePasswordReset: async () => ({ ok: false, reason: "unavailable" }), // 비밀번호가 없음
        signOut: async () => undefined, // 서비스 쪽에 정리할 것이 없음
        deleteAccount: async (session) => // 계정 지우기(쓴 계정 목록에서 빼고, 연습용 서버의 저장본도 함께 지움)
        { // 함수 시작
            try // 지우기 시도
            { // 시도 시작
                storage.setItem(PRACTICE_ACCOUNTS_KEY, JSON.stringify(readAccounts(storage).filter((item) => item.accountId !== session.accountId))); // 목록에서 빼기
                storage.removeItem(`${PRACTICE_SERVER_PREFIX}${session.accountId}`); // 연습용 서버의 저장본 지우기
                return { ok: true }; // 지움
            } // 시도 종료
            catch // 저장소를 쓰지 못함
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 지우지 못함
            } // 실패 종료
        }, // 함수 종료
        listAccounts: () => readAccounts(storage), // 이 브라우저에서 쓴 계정
    }; // 구현 반환
} // 함수 종료
