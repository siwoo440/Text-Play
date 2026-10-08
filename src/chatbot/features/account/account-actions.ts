// 계정 동작: 로그인·로그아웃·비밀번호 다시 정하기·계정 데이터 지우기·탈퇴를 하고 화면을 새로 연다. 계정마다 저장 칸이 달라, 세션을 바꾼 뒤에는 앱 데이터를 그 계정의 칸에서 처음부터 다시 읽어야 한다.
import { getAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정
import { readAccountSession, writeAccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AccountDeleteResult, AuthAdapter, AuthResult, SignInInput } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { createPracticeAuthAdapter } from "@chatbot/lib/account/practice-auth-adapter"; // 연습용 로그인
import { clearAccountData } from "@chatbot/lib/account/scoped-storage"; // 이 기기의 계정 데이터 지우기
import { createSupabaseAuthAdapter } from "@chatbot/lib/account/supabase-account"; // 실제 로그인(Supabase)

export type Navigate = (href: string) => void; // 화면 이동(테스트에서 바꿔 끼움)

const reloadTo: Navigate = (href) => window.location.assign(href); // 새로 열기(앱 데이터를 계정 칸에서 다시 읽게 함)

export function getAuthAdapter(): AuthAdapter // 지금 쓰는 로그인 구현(계정 서비스를 켜고 주소와 공개 키를 넣었으면 Supabase, 아니면 연습용)
{ // 함수 시작
    const config = getAccountServiceConfig(); // 계정 서비스 설정
    return config.mode === "supabase" ? createSupabaseAuthAdapter(config, { storage: window.localStorage, session: window.sessionStorage }) : createPracticeAuthAdapter(window.localStorage); // 로그인 구현
} // 함수 종료

export async function completeSocialAndEnter(adapter: AuthAdapter, params: URLSearchParams, navigate: Navigate = reloadTo): Promise<AuthResult> // 간편 로그인에서 돌아온 뒤 로그인을 마치고 메인으로 들어가기
{ // 함수 시작
    const result = await adapter.completeSocialSignIn(params); // 로그인 마무리
    if (result.ok) // 성공
    { // 조건 시작
        writeAccountSession(window.localStorage, result.session); // 세션 저장
        navigate("/"); // 그 계정의 데이터로 새로 열기
    } // 조건 종료
    return result; // 결과 반환
} // 함수 종료

export async function signInAndEnter(adapter: AuthAdapter, input: SignInInput, navigate: Navigate = reloadTo, mode: "sign-in" | "sign-up" = "sign-in"): Promise<AuthResult> // 로그인(또는 가입)하고 메인으로 들어가기
{ // 함수 시작
    const result = mode === "sign-up" ? await adapter.signUp(input) : await adapter.signIn(input); // 로그인 시도
    if (result.ok) // 성공
    { // 조건 시작
        writeAccountSession(window.localStorage, result.session); // 세션 저장
        navigate("/"); // 그 계정의 데이터로 새로 열기
    } // 조건 종료
    return result; // 결과 반환(실패하면 화면이 이유를 보여 줌)
} // 함수 종료

export async function completeResetAndEnter(adapter: AuthAdapter, params: URLSearchParams, password: string, navigate: Navigate = reloadTo): Promise<AuthResult> // 새 비밀번호를 정하고 그 계정으로 메인에 들어가기
{ // 함수 시작
    const result = await adapter.completePasswordReset(params, password); // 새 비밀번호 정하기
    if (result.ok) // 성공
    { // 조건 시작
        writeAccountSession(window.localStorage, result.session); // 세션 저장
        navigate("/"); // 그 계정의 데이터로 새로 열기
    } // 조건 종료
    return result; // 결과 반환(실패하면 화면이 이유를 보여 줌)
} // 함수 종료

export async function signOutAndLeave(adapter: AuthAdapter, navigate: Navigate = reloadTo): Promise<void> // 로그아웃하고 손님 화면으로 돌아가기
{ // 함수 시작
    const session = readAccountSession(window.localStorage); // 지금 세션
    if (session !== null) // 로그인해 있음
    { // 조건 시작
        await adapter.signOut(session).catch(() => undefined); // 서비스 쪽 정리(실패해도 이 기기에서는 로그아웃)
    } // 조건 종료
    writeAccountSession(window.localStorage, null); // 세션 지움
    navigate("/"); // 손님 데이터로 새로 열기
} // 함수 종료

export async function clearDeviceDataAndLeave(adapter: AuthAdapter, navigate: Navigate = reloadTo): Promise<void> // 이 기기에 있는 계정 데이터를 지우고 로그아웃하기(서버 저장본은 그대로라 다시 로그인하면 받아 옴)
{ // 함수 시작
    const session = readAccountSession(window.localStorage); // 지금 세션
    if (session === null) // 로그인하지 않음
    { // 조건 시작
        return; // 지울 것이 없음
    } // 조건 종료
    await adapter.signOut(session).catch(() => undefined); // 서비스 쪽 정리(실패해도 이 기기에서는 지움)
    clearAccountData(window.localStorage, session.accountId); // 이 기기의 계정 칸 비우기
    writeAccountSession(window.localStorage, null); // 세션 지움
    navigate("/"); // 손님 데이터로 새로 열기
} // 함수 종료

export async function deleteAccountAndLeave(adapter: AuthAdapter, navigate: Navigate = reloadTo): Promise<AccountDeleteResult> // 계정을 지우고(탈퇴) 손님 화면으로 돌아가기
{ // 함수 시작
    const session = readAccountSession(window.localStorage); // 지금 세션
    if (session === null) // 로그인하지 않음
    { // 조건 시작
        return { ok: false, reason: "unavailable" }; // 지울 계정이 없음
    } // 조건 종료
    const result = await adapter.deleteAccount(session).catch((): AccountDeleteResult => ({ ok: false, reason: "unavailable" })); // 서비스의 계정과 서버 저장본 지우기
    if (result.ok) // 지움
    { // 조건 시작
        clearAccountData(window.localStorage, session.accountId); // 이 기기의 계정 칸도 비우기
        writeAccountSession(window.localStorage, null); // 세션 지움
        navigate("/"); // 손님 데이터로 새로 열기
    } // 조건 종료
    return result; // 결과 반환(실패하면 아무것도 지우지 않고 화면이 이유를 보여 줌)
} // 함수 종료
