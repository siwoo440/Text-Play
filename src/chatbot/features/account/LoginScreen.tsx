"use client"; // 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useEffect, useState, type FormEvent } from "react"; // 리액트 도구
import { getAuthAdapter, signInAndEnter, signOutAndLeave, type Navigate } from "@chatbot/features/account/account-actions"; // 계정 동작
import { useAccountSession } from "@chatbot/features/account/use-account-session"; // 계정 세션
import styles from "@chatbot/features/account/LoginScreen.module.css"; // 로그인 화면 스타일
import type { AuthAdapter, AuthFailure, SocialProvider } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { PRACTICE_NAME_LIMIT } from "@chatbot/lib/account/practice-auth-adapter"; // 계정 이름 한도
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export const failureMessages: Record<AuthFailure, string> = // 실패 이유별 안내
{ // 안내 시작
    "invalid-name": "계정 이름을 1~20자로 적어 주세요.", // 이름 오류
    "invalid-email": "이메일 주소를 확인해 주세요.", // 이메일 오류
    "weak-password": "비밀번호를 8자 이상으로 정해 주세요.", // 약한 비밀번호
    "wrong-credentials": "이메일이나 비밀번호가 맞지 않아요.", // 틀린 정보
    "email-taken": "이미 가입한 이메일이에요. 로그인해 주세요.", // 가입된 이메일
    "confirm-email": "받은 메일의 확인 버튼을 누른 뒤 로그인해 주세요.", // 메일 확인 필요
    "too-many": "요청이 너무 잦아요. 잠시 뒤 다시 시도해 주세요.", // 요청이 너무 잦음
    "link-expired": "링크가 만료됐거나 이미 사용됐어요. 로그인 화면에서 메일을 다시 받아 주세요.", // 쓸 수 없는 재설정 링크
    "same-password": "예전과 다른 비밀번호를 정해 주세요.", // 예전과 같은 비밀번호
    unavailable: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.", // 서비스 오류
}; // 안내 종료

const socialLabels: Record<SocialProvider, string> = { google: "Google로 계속하기", kakao: "카카오로 계속하기" }; // 간편 로그인 버튼 이름

export function LoginScreen({ adapter, navigate }: { adapter?: AuthAdapter; navigate?: Navigate }) // 로그인 화면(연습용: 이름만, 실제 서비스: 이메일·간편 로그인)
{ // 함수 시작
    const session = useAccountSession(); // 지금 로그인한 계정
    const [auth] = useState<AuthAdapter | null>(() => adapter ?? (typeof window === "undefined" ? null : getAuthAdapter())); // 로그인 구현(서버에서 그릴 때는 없음)
    const [name, setName] = useState(""); // 계정 이름(연습용)
    const [email, setEmail] = useState(""); // 이메일(실제 서비스)
    const [password, setPassword] = useState(""); // 비밀번호(실제 서비스)
    const [joining, setJoining] = useState(false); // 회원가입 양식인지
    const [resetting, setResetting] = useState(false); // 비밀번호를 다시 정하는 메일을 받는 양식인지
    const [notice, setNotice] = useState(""); // 메일을 보냈다는 안내
    const [providers, setProviders] = useState<SocialProvider[]>([]); // 쓸 수 있는 간편 로그인
    const [error, setError] = useState(""); // 오류 안내
    const [busy, setBusy] = useState(false); // 처리 중
    const live = auth?.mode === "live"; // 실제 서비스 여부
    const accounts = auth?.listAccounts() ?? []; // 이 브라우저에서 쓴 연습용 계정
    useEffect(() => // 서비스에서 켜 둔 간편 로그인 읽기
    { // 효과 시작
        let active = true; // 화면이 살아 있는지
        void auth?.socialProviders().then((list) => // 목록 읽기
        { // 처리 시작
            if (active) // 화면이 살아 있을 때만
            { // 조건 시작
                setProviders(list); // 목록 반영
            } // 조건 종료
        }); // 처리 종료
        return () => { active = false; }; // 화면을 떠나면 반영하지 않음
    }, [auth]); // 처음 한 번
    const enter = async (input: { name?: string; email?: string; password?: string }, mode: "sign-in" | "sign-up" = "sign-in") => // 로그인(또는 가입)
    { // 함수 시작
        if (auth === null || busy) // 준비 전·처리 중
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        setBusy(true); // 처리 시작
        const result = await signInAndEnter(auth, input, navigate, mode); // 로그인
        setBusy(false); // 처리 끝
        setError(result.ok ? "" : t(failureMessages[result.reason])); // 실패 이유 안내
    }; // 함수 종료
    const requestReset = async (event: FormEvent<HTMLFormElement>) => // 비밀번호를 다시 정하는 메일 요청
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        if (auth === null || busy) // 준비 전·처리 중
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        setBusy(true); // 처리 시작
        const result = await auth.requestPasswordReset(email, `${window.location.origin}/auth/reset`); // 메일 요청(링크는 재설정 화면으로 돌아옴)
        setBusy(false); // 처리 끝
        setNotice(result.ok ? t("입력한 주소로 가입한 계정이 있으면 비밀번호를 다시 정하는 메일을 보냈어요. 메일의 링크를 눌러 주세요.") : ""); // 보냈다는 안내(가입 여부는 알려 주지 않음)
        setError(result.ok ? "" : result.reason === "unavailable" ? t("지금은 메일을 보낼 수 없어요. 잠시 뒤 다시 시도해 주세요.") : t(failureMessages[result.reason])); // 실패 이유 안내(서비스 오류는 이 양식에 맞는 말로)
    }; // 함수 종료
    const showReset = (next: boolean) => // 재설정 양식과 로그인 양식 사이를 오가기
    { // 함수 시작
        setResetting(next); // 양식 바꾸기
        setError(""); // 오류 지움
        setNotice(""); // 안내 지움
    }; // 함수 종료
    const submit = (event: FormEvent<HTMLFormElement>) => // 양식 제출
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        void (live ? enter({ email, password }, joining ? "sign-up" : "sign-in") : enter({ name })); // 방식에 맞게 로그인
    }; // 함수 종료
    const social = (provider: SocialProvider) => // 간편 로그인 시작
    { // 함수 시작
        void auth?.startSocialSignIn(provider, `${window.location.origin}/auth/callback`).catch(() => setError(t(failureMessages.unavailable))); // 서비스 화면으로 보냄
    }; // 함수 종료
    return ( // 화면 반환
        <main className={styles.page}> {/* 로그인 본문 */}
            <section className={styles.card} aria-labelledby="login-title"> {/* 로그인 카드 */}
                <span className={styles.eyebrow}>ACCOUNT</span> {/* 표제 */}
                <h1 id="login-title">{session === null && live && resetting ? t("비밀번호 다시 정하기") : t("로그인")}</h1> {/* 제목(재설정 메일을 받는 양식에서는 그 이름으로) */}
                {session !== null ? ( // 로그인해 있음
                    <> {/* 로그인 상태 */}
                        <p className={styles.lead}>{t("지금 {0} 계정으로 로그인해 있어요.", [session.name])}</p> {/* 지금 계정 */}
                        <div className={styles.actions}> {/* 동작 */}
                            <Link href="/" className={styles.primary}>{t("메인으로 이동")}</Link> {/* 메인 */}
                            <button type="button" className={styles.secondary} disabled={auth === null} onClick={() => { if (auth !== null) { void signOutAndLeave(auth, navigate); } }}>{t("로그아웃")}</button> {/* 로그아웃 */}
                        </div> {/* 동작 종료 */}
                    </> // 로그인 상태 종료
                ) : live && resetting ? ( // 비밀번호를 다시 정하는 메일 받기
                    <> {/* 재설정 메일 */}
                        <p className={styles.lead}>{t("가입한 이메일을 적으면 비밀번호를 다시 정하는 링크를 메일로 보내 드려요.")}</p> {/* 안내 */}
                        <form className={styles.form} onSubmit={(event) => void requestReset(event)} noValidate> {/* 재설정 메일 양식 */}
                            <label className={styles.field}><span>{t("이메일")}</span><input type="email" value={email} autoComplete="email" spellCheck={false} onChange={(event) => { setEmail(event.target.value); setError(""); setNotice(""); }} /></label> {/* 이메일 */}
                            {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 안내 */}
                            {notice.length === 0 ? null : <p className={styles.notice} role="status">{notice}</p>} {/* 보냈다는 안내 */}
                            <button type="submit" className={styles.primary} disabled={busy}>{t("재설정 메일 보내기")}</button> {/* 제출 */}
                        </form> {/* 양식 종료 */}
                        <button type="button" className={styles.textButton} onClick={() => showReset(false)}>{t("로그인으로 돌아가기")}</button> {/* 로그인 양식으로 */}
                    </> // 재설정 메일 종료
                ) : live ? ( // 실제 서비스 로그인
                    <> {/* 이메일·간편 로그인 */}
                        <div className={styles.tabs} role="tablist" aria-label={t("로그인 방식")}> {/* 로그인·회원가입 전환 */}
                            <button type="button" role="tab" aria-selected={!joining} onClick={() => { setJoining(false); setError(""); }}>{t("로그인")}</button> {/* 로그인 */}
                            <button type="button" role="tab" aria-selected={joining} onClick={() => { setJoining(true); setError(""); }}>{t("회원가입")}</button> {/* 회원가입 */}
                        </div> {/* 전환 종료 */}
                        <form className={styles.form} onSubmit={submit} noValidate> {/* 이메일 양식 */}
                            <label className={styles.field}><span>{t("이메일")}</span><input type="email" value={email} autoComplete="email" spellCheck={false} onChange={(event) => { setEmail(event.target.value); setError(""); }} /></label> {/* 이메일 */}
                            <label className={styles.field}><span>{t("비밀번호")}</span><input type="password" value={password} autoComplete={joining ? "new-password" : "current-password"} onChange={(event) => { setPassword(event.target.value); setError(""); }} /></label> {/* 비밀번호 */}
                            {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 안내 */}
                            <button type="submit" className={styles.primary} disabled={busy}>{joining ? t("가입하기") : t("이메일로 로그인")}</button> {/* 제출 */}
                        </form> {/* 양식 종료 */}
                        {joining ? null : <button type="button" className={styles.textButton} onClick={() => showReset(true)}>{t("비밀번호를 잊으셨나요?")}</button>} {/* 비밀번호 다시 정하기로(로그인 양식에서만) */}
                        {providers.length === 0 ? null : <div className={styles.social} aria-label={t("간편 로그인")}>{providers.map((provider) => <button key={provider} type="button" className={styles.secondary} disabled={busy} onClick={() => social(provider)}>{t(socialLabels[provider])}</button>)}</div>} {/* 간편 로그인 */}
                        <p className={styles.hint}>{t("로그인하면 캐릭터와 대화, 토큰이 계정에 저장돼 다른 기기에서도 이어 쓸 수 있어요. 로그인하지 않아도 지금처럼 쓸 수 있어요.")}</p> {/* 안내 */}
                    </> // 이메일·간편 로그인 종료
                ) : ( // 연습용 로그인
                    <> {/* 로그인 양식 */}
                        <p className={styles.note} role="note"><strong>{t("연습용 로그인")}</strong><span>{t("실제 로그인 서비스를 연결하기 전이에요. 이름만 정하면 이 브라우저 안에서 계정을 나눠 써 볼 수 있어요. 비밀번호가 없으니 중요한 내용은 넣지 마세요.")}</span></p> {/* 연습용 안내 */}
                        <form className={styles.form} onSubmit={submit} noValidate> {/* 로그인 양식 */}
                            <label className={styles.field}><span>{t("계정 이름")}</span><input value={name} maxLength={PRACTICE_NAME_LIMIT} autoComplete="off" spellCheck={false} placeholder={t("예: 소하")} aria-invalid={error.length > 0} onChange={(event) => { setName(event.target.value); setError(""); }} /></label> {/* 계정 이름 */}
                            {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 안내 */}
                            <button type="submit" className={styles.primary} disabled={busy}>{t("로그인")}</button> {/* 로그인 버튼 */}
                        </form> {/* 양식 종료 */}
                        {accounts.length === 0 ? null : ( // 쓴 계정 판정
                            <div className={styles.accounts}> {/* 쓴 계정 */}
                                <h2>{t("이 브라우저에서 쓴 계정")}</h2> {/* 목록 제목 */}
                                <ul aria-label={t("이 브라우저에서 쓴 계정")}>{accounts.map((account) => <li key={account.accountId}><button type="button" disabled={busy} onClick={() => void enter({ name: account.name })}>{account.name}</button></li>)}</ul> {/* 계정 목록 */}
                            </div> // 쓴 계정 종료
                        )} {/* 쓴 계정 판정 종료 */}
                        <p className={styles.hint}>{t("로그인하지 않아도 지금처럼 쓸 수 있어요. 로그인하면 계정마다 캐릭터와 대화, 토큰이 따로 저장돼요.")}</p> {/* 손님 안내 */}
                    </> // 로그인 양식 종료
                )} {/* 판정 종료 */}
            </section> {/* 카드 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
