// 계정별 저장 칸: 로그인한 계정마다 앱 데이터(상태·백업·작성 중 임시 저장)를 다른 열쇠 이름으로 저장하게 한다. 로그인하지 않은 손님은 지금까지 쓰던 열쇠를 그대로 쓴다.
import { getAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정
import { ACCOUNT_SESSION_KEY, readActiveSession } from "@chatbot/lib/account/account-session"; // 계정 세션

const APP_PREFIX = "mateverse:v1:"; // 앱 데이터 열쇠의 앞부분
const DRAFT_PREFIX = "mateverse:draft:"; // 작성 중 임시 저장 열쇠의 앞부분(편집기가 씀)
const sharedKeys = new Set([ACCOUNT_SESSION_KEY, "mateverse:v1:usage-time", "mateverse:v1:practice-accounts", "mateverse:v1:auth", "mateverse:v1:auth-verifier"]); // 계정과 상관없이 기기 전체가 함께 쓰는 열쇠

export function accountKeyPrefix(scope: string): string // 그 계정의 열쇠가 모두 시작하는 글(이 기기에서 계정 데이터를 찾을 때 씀)
{ // 함수 시작
    return `${APP_PREFIX}u:${scope}:`; // 계정 칸의 앞부분
} // 함수 종료

export function scopeKey(key: string, scope: string): string // 계정 칸의 열쇠 이름 만들기(앱 데이터와 임시 저장 열쇠만 바꿈)
{ // 함수 시작
    if (key.startsWith(DRAFT_PREFIX)) // 작성 중 임시 저장
    { // 조건 시작
        return `${accountKeyPrefix(scope)}draft:${key.slice(DRAFT_PREFIX.length)}`; // 계정 칸 안의 임시 저장 자리로
    } // 조건 종료
    return !key.startsWith(APP_PREFIX) || sharedKeys.has(key) || key.startsWith(`${APP_PREFIX}u:`) || key.startsWith(`${APP_PREFIX}practice-`) ? key : `${accountKeyPrefix(scope)}${key.slice(APP_PREFIX.length)}`; // 공용 열쇠·이미 칸이 붙은 열쇠는 그대로
} // 함수 종료

export function clearAccountData(storage: Storage, scope: string): number // 이 기기에서 그 계정의 칸에 있는 것을 모두 지우기(지운 항목 수를 돌려줌. 서버 저장본과 손님 데이터는 건드리지 않음)
{ // 함수 시작
    const prefix = accountKeyPrefix(scope); // 그 계정의 열쇠 앞부분
    const keys: string[] = []; // 지울 열쇠
    for (let index = 0; index < storage.length; index += 1) // 저장 항목 순회(지우면서 돌면 차례가 밀리므로 먼저 모음)
    { // 순회 시작
        const key = storage.key(index); // 항목 이름
        if (key !== null && key.startsWith(prefix)) // 그 계정의 것
        { // 조건 시작
            keys.push(key); // 모으기
        } // 조건 종료
    } // 순회 종료
    keys.forEach((key) => storage.removeItem(key)); // 지우기
    return keys.length; // 지운 수
} // 함수 종료

export function createScopedStorage(storage: Storage, scope: string | null): Storage // 계정 칸을 쓰는 저장소 만들기(손님이면 원래 저장소 그대로)
{ // 함수 시작
    if (scope === null) // 손님
    { // 조건 시작
        return storage; // 지금까지 쓰던 칸
    } // 조건 종료
    return { // 열쇠 이름만 바꿔 원래 저장소에 맡기는 저장소
        get length() { return storage.length; }, // 항목 수
        clear: () => storage.clear(), // 전체 삭제
        key: (index: number) => storage.key(index), // 위치의 열쇠
        getItem: (key: string) => storage.getItem(scopeKey(key, scope)), // 읽기
        setItem: (key: string, value: string) => storage.setItem(scopeKey(key, scope), value), // 쓰기
        removeItem: (key: string) => storage.removeItem(scopeKey(key, scope)), // 지우기
    }; // 저장소 반환
} // 함수 종료

export function getAppStorage(): Storage // 지금 로그인한 계정의 저장소(브라우저에서만 부름)
{ // 함수 시작
    return createScopedStorage(window.localStorage, readActiveSession(window.localStorage, getAccountServiceConfig().mode === "supabase")?.accountId ?? null); // 세션의 계정 칸
} // 함수 종료
