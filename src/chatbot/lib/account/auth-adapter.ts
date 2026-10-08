// 로그인 계약: 화면은 이 계약만 보고 로그인·로그아웃을 한다. 지금은 연습용 구현만 있고, 실제 서비스(Supabase)를 연결하면 같은 계약의 다른 구현을 끼운다.
import type { AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션

export type AuthFailure = "invalid-name" | "invalid-email" | "weak-password" | "wrong-credentials" | "email-taken" | "confirm-email" | "too-many" | "link-expired" | "same-password" | "unavailable"; // 로그인·비밀번호 다시 정하기 실패 이유
export type AuthResult = { ok: true; session: AccountSession } | { ok: false; reason: AuthFailure }; // 로그인 결과
export type PasswordResetRequestResult = { ok: true } | { ok: false; reason: AuthFailure }; // 재설정 메일 요청 결과
export type AccountDeleteResult = { ok: true } | { ok: false; reason: "unavailable" }; // 계정 지우기 결과
export type SocialProvider = "google" | "kakao"; // 간편 로그인 서비스

export interface SignInInput // 로그인 입력
{ // 구조 시작
    name?: string; // 계정 이름(연습용)
    email?: string; // 이메일(실제 서비스)
    password?: string; // 비밀번호(실제 서비스)
    redirectTo?: string; // 가입 확인 메일의 링크가 돌아올 주소(실제 서비스의 회원가입에서만 씀)
} // 구조 종료

export interface PracticeAccount // 연습용 계정
{ // 구조 시작
    accountId: string; // 계정 식별자
    name: string; // 계정 이름
    usedAt: string; // 마지막으로 쓴 시각
} // 구조 종료

export interface AuthAdapter // 로그인 계약
{ // 구조 시작
    readonly mode: "practice" | "live"; // 연습용인지 실제 서비스인지
    socialProviders(): Promise<SocialProvider[]>; // 쓸 수 있는 간편 로그인(서비스에서 켜 둔 것. 연습용은 없음)
    startSocialSignIn(provider: SocialProvider, redirectTo: string): Promise<void>; // 간편 로그인 시작(서비스 화면으로 보냄)
    completeSocialSignIn(params: URLSearchParams): Promise<AuthResult>; // 간편 로그인 마무리(돌아온 주소의 값으로 로그인)
    signIn(input: SignInInput): Promise<AuthResult>; // 로그인
    signUp(input: SignInInput): Promise<AuthResult>; // 회원가입
    canCompleteEmailConfirm(params: URLSearchParams): boolean; // 주소 뒤에 붙어 온 값이 가입 확인 메일의 링크가 준 것인지
    completeEmailConfirm(params: URLSearchParams): Promise<AuthResult>; // 가입 확인 메일의 링크가 준 출입증으로 바로 로그인
    requestPasswordReset(email: string, redirectTo: string): Promise<PasswordResetRequestResult>; // 비밀번호를 다시 정하는 메일 보내기(메일의 링크는 redirectTo로 돌아옴. 연습용은 비밀번호가 없어 쓰지 않음)
    canCompletePasswordReset(params: URLSearchParams): boolean; // 메일의 링크가 주소 뒤에 붙여 준 값으로 비밀번호를 다시 정할 수 있는지
    completePasswordReset(params: URLSearchParams, password: string): Promise<AuthResult>; // 새 비밀번호를 정하고 그 계정으로 로그인
    signOut(session: AccountSession): Promise<void>; // 로그아웃(서비스 쪽 정리)
    deleteAccount(session: AccountSession): Promise<AccountDeleteResult>; // 계정 지우기(탈퇴. 서비스의 계정과 서버 저장본을 함께 지움)
    listAccounts(): PracticeAccount[]; // 이 브라우저에서 쓴 연습용 계정(실제 서비스는 빈 목록)
} // 구조 종료
