"use client"; // 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useEffect, useRef, useState } from "react"; // 리액트 도구
import { completeEmailConfirmAndEnter, completeSocialAndEnter, getAuthAdapter, type Navigate } from "@chatbot/features/account/account-actions"; // 계정 동작
import styles from "@chatbot/features/account/LoginScreen.module.css"; // 로그인 화면 스타일
import type { AuthAdapter } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function AuthCallbackScreen({ adapter, navigate, search, hash }: { adapter?: AuthAdapter; navigate?: Navigate; search?: string; hash?: string }) // 로그인 서비스에서 돌아오는 화면(간편 로그인은 주소의 코드로, 가입 확인 메일의 링크는 주소 뒤에 붙어 온 출입증으로 로그인을 마치고 메인으로 보냄)
{ // 함수 시작
    const [failed, setFailed] = useState<"social" | "email" | null>(null); // 로그인하지 못한 경우(어느 길로 돌아왔는지)
    const started = useRef(false); // 이미 마무리를 시작했는지
    useEffect(() => // 돌아오면 바로 마무리
    { // 효과 시작
        if (started.current) // 이미 시작함(개발 모드는 이 효과를 두 번 돌리는데, 코드와 링크는 한 번만 쓸 수 있고 주소의 값도 지운 뒤라 다시 읽을 수 없음)
        { // 조건 시작
            return; // 다시 하지 않음
        } // 조건 종료
        started.current = true; // 시작했다고 표시
        const query = new URLSearchParams(search ?? window.location.search); // 주소의 값(간편 로그인)
        const fragment = new URLSearchParams((hash ?? window.location.hash).replace(/^#/, "")); // 주소 뒤에 붙어 온 값(메일의 링크)
        const fromEmail = !query.has("code") && !query.has("error") && (fragment.has("access_token") || fragment.has("error")); // 메일의 링크로 돌아왔는지(간편 로그인의 값이 있으면 그쪽이 먼저)
        if (window.location.hash.length > 0) // 주소에 값이 남아 있음
        { // 조건 시작
            window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); // 출입증이 주소 칸과 방문 기록에 남지 않게 지움
        } // 조건 종료
        const auth = adapter ?? getAuthAdapter(); // 로그인 구현
        void (fromEmail ? completeEmailConfirmAndEnter(auth, fragment, navigate) : completeSocialAndEnter(auth, query, navigate)).then((result) => // 로그인 마무리
        { // 처리 시작
            if (!result.ok) // 실패
            { // 조건 시작
                setFailed(fromEmail ? "email" : "social"); // 안내 표시
            } // 조건 종료
        }); // 처리 종료
    }, [adapter, navigate, search, hash]); // 처음 한 번
    return ( // 화면 반환
        <main className={styles.page}> {/* 본문 */}
            <section className={styles.card} aria-labelledby="auth-callback-title"> {/* 카드 */}
                <span className={styles.eyebrow}>ACCOUNT</span> {/* 표제 */}
                <h1 id="auth-callback-title">{failed !== null ? t("로그인하지 못했어요") : t("로그인하는 중이에요")}</h1> {/* 제목 */}
                {failed !== null ? <><p className={styles.lead} role="alert">{failed === "email" ? t("링크가 만료됐거나 이미 사용됐어요. 가입 확인을 이미 마쳤다면 그대로 로그인해 주세요. 아니라면 로그인 화면에서 같은 이메일로 다시 가입하거나, 비밀번호 재설정 메일을 다시 받아 주세요.") : t("로그인을 끝내지 못했어요. 다시 시도해 주세요.")}</p><div className={styles.actions}><Link href="/login" className={styles.primary}>{t("로그인 화면으로")}</Link></div></> : <p className={styles.lead} role="status">{t("잠시만 기다려 주세요.")}</p>} {/* 실패 안내 또는 대기 */}
            </section> {/* 카드 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
