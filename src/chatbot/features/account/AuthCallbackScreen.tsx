"use client"; // 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useEffect, useState } from "react"; // 리액트 도구
import { completeSocialAndEnter, getAuthAdapter, type Navigate } from "@chatbot/features/account/account-actions"; // 계정 동작
import styles from "@chatbot/features/account/LoginScreen.module.css"; // 로그인 화면 스타일
import type { AuthAdapter } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function AuthCallbackScreen({ adapter, navigate, search }: { adapter?: AuthAdapter; navigate?: Navigate; search?: string }) // 간편 로그인에서 돌아오는 화면(주소의 값으로 로그인을 마치고 메인으로 보냄)
{ // 함수 시작
    const [failed, setFailed] = useState(false); // 로그인하지 못함
    useEffect(() => // 돌아오면 바로 마무리
    { // 효과 시작
        let active = true; // 화면이 살아 있는지
        void completeSocialAndEnter(adapter ?? getAuthAdapter(), new URLSearchParams(search ?? window.location.search), navigate).then((result) => // 로그인 마무리
        { // 처리 시작
            if (active && !result.ok) // 실패
            { // 조건 시작
                setFailed(true); // 안내 표시
            } // 조건 종료
        }); // 처리 종료
        return () => { active = false; }; // 화면을 떠나면 반영하지 않음
    }, [adapter, navigate, search]); // 처음 한 번
    return ( // 화면 반환
        <main className={styles.page}> {/* 본문 */}
            <section className={styles.card} aria-labelledby="auth-callback-title"> {/* 카드 */}
                <span className={styles.eyebrow}>ACCOUNT</span> {/* 표제 */}
                <h1 id="auth-callback-title">{failed ? t("로그인하지 못했어요") : t("로그인하는 중이에요")}</h1> {/* 제목 */}
                {failed ? <><p className={styles.lead} role="alert">{t("로그인을 끝내지 못했어요. 다시 시도해 주세요.")}</p><div className={styles.actions}><Link href="/login" className={styles.primary}>{t("로그인 화면으로")}</Link></div></> : <p className={styles.lead} role="status">{t("잠시만 기다려 주세요.")}</p>} {/* 실패 안내 또는 대기 */}
            </section> {/* 카드 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
