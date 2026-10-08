"use client"; // 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useEffect, useRef, useState, type FormEvent } from "react"; // 리액트 도구
import { completeResetAndEnter, getAuthAdapter, type Navigate } from "@chatbot/features/account/account-actions"; // 계정 동작
import { failureMessages } from "@chatbot/features/account/LoginScreen"; // 실패 이유별 안내
import styles from "@chatbot/features/account/LoginScreen.module.css"; // 로그인 화면 스타일
import type { AuthAdapter } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function PasswordResetScreen({ adapter, navigate, hash }: { adapter?: AuthAdapter; navigate?: Navigate; hash?: string }) // 비밀번호 다시 정하기 화면(메일의 링크로 들어와 새 비밀번호를 정함)
{ // 함수 시작
    const [auth] = useState<AuthAdapter | null>(() => adapter ?? (typeof window === "undefined" ? null : getAuthAdapter())); // 로그인 구현(서버에서 그릴 때는 없음)
    const [params, setParams] = useState<URLSearchParams | null>(null); // 메일의 링크가 주소 뒤에 붙여 준 값(읽기 전에는 없음)
    const [password, setPassword] = useState(""); // 새 비밀번호
    const [confirm, setConfirm] = useState(""); // 새 비밀번호 확인
    const [error, setError] = useState(""); // 오류 안내
    const [busy, setBusy] = useState(false); // 처리 중
    const read = useRef(false); // 주소 뒤의 값을 이미 읽었는지
    useEffect(() => // 주소 뒤의 값을 한 번만 읽고 주소에서 지움
    { // 효과 시작
        if (read.current) // 이미 읽음(개발 모드는 이 효과를 두 번 돌리는데, 지운 뒤에 다시 읽으면 값이 사라짐)
        { // 조건 시작
            return; // 다시 읽지 않음
        } // 조건 종료
        read.current = true; // 읽었다고 표시
        const raw = hash ?? window.location.hash; // 주소 뒤에 붙어 온 값
        queueMicrotask(() => setParams(new URLSearchParams(raw.replace(/^#/, "")))); // 값 기억
        if (window.location.hash.length > 0) // 주소에 값이 남아 있음
        { // 조건 시작
            window.history.replaceState(null, "", window.location.pathname); // 출입증이 주소 칸과 방문 기록에 남지 않게 지움
        } // 조건 종료
    }, [hash]); // 처음 한 번
    const submit = (event: FormEvent<HTMLFormElement>) => // 양식 제출
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        if (auth === null || params === null || busy) // 준비 전·처리 중
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        if (password !== confirm) // 두 칸이 다름
        { // 조건 시작
            setError(t("두 비밀번호가 서로 달라요.")); // 다르다는 안내
            return; // 서비스에 보내지 않음
        } // 조건 종료
        setBusy(true); // 처리 시작
        void completeResetAndEnter(auth, params, password, navigate).then((result) => // 새 비밀번호 정하기
        { // 처리 시작
            setBusy(false); // 처리 끝
            setError(result.ok ? "" : result.reason === "unavailable" ? t("지금은 비밀번호를 바꿀 수 없어요. 잠시 뒤 다시 시도해 주세요.") : t(failureMessages[result.reason])); // 실패 이유 안내(서비스 오류는 이 화면에 맞는 말로)
        }); // 처리 종료
    }; // 함수 종료
    const backToLogin = <div className={styles.actions}><Link href="/login" className={styles.primary}>{t("로그인 화면으로")}</Link></div>; // 로그인 화면으로 가는 링크
    return ( // 화면 반환
        <main className={styles.page}> {/* 본문 */}
            <section className={styles.card} aria-labelledby="reset-title"> {/* 카드 */}
                <span className={styles.eyebrow}>ACCOUNT</span> {/* 표제 */}
                <h1 id="reset-title">{t("비밀번호 다시 정하기")}</h1> {/* 제목 */}
                {auth === null || params === null ? ( // 준비 전
                    <p className={styles.lead} role="status">{t("잠시만 기다려 주세요.")}</p> // 대기
                ) : auth.mode !== "live" ? ( // 연습용 로그인
                    <><p className={styles.lead}>{t("연습용 로그인에는 비밀번호가 없어요. 이름만으로 로그인할 수 있어요.")}</p>{backToLogin}</> // 연습용 안내
                ) : !auth.canCompletePasswordReset(params) ? ( // 쓸 수 없는 링크
                    <><p className={styles.lead} role="alert">{t(failureMessages["link-expired"])}</p>{backToLogin}</> // 링크 안내
                ) : ( // 새 비밀번호 양식
                    <form className={styles.form} onSubmit={submit} noValidate> {/* 새 비밀번호 양식 */}
                        <p className={styles.lead}>{t("새 비밀번호를 8자 이상으로 정해 주세요. 정하고 나면 바로 로그인돼요.")}</p> {/* 안내 */}
                        <label className={styles.field}><span>{t("새 비밀번호")}</span><input type="password" value={password} autoComplete="new-password" onChange={(event) => { setPassword(event.target.value); setError(""); }} /></label> {/* 새 비밀번호 */}
                        <label className={styles.field}><span>{t("새 비밀번호 확인")}</span><input type="password" value={confirm} autoComplete="new-password" onChange={(event) => { setConfirm(event.target.value); setError(""); }} /></label> {/* 새 비밀번호 확인 */}
                        {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 안내 */}
                        <button type="submit" className={styles.primary} disabled={busy}>{t("비밀번호 바꾸기")}</button> {/* 제출 */}
                    </form> // 양식 종료
                )} {/* 판정 종료 */}
            </section> {/* 카드 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
