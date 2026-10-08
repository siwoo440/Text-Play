"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { usePathname } from "@/desktop/next-compat/navigation"; // 현재 경로
import styles from "@chatbot/features/story/Story.module.css"; // 스토리 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function ModeSwitch() // 캐릭터 모드·스토리 모드 전환
{ // 함수 시작
    const pathname = usePathname() ?? "/"; // 현재 경로
    const storyActive = pathname.startsWith("/stories"); // 스토리 모드 여부
    return ( // 전환 반환
        <div className={styles.modeBar}> {/* 페이지 너비를 따르는 바깥 틀 */}
            <nav className={styles.modeSwitch} aria-label={t("대화 모드")}> {/* 모드 전환 */}
                <Link href="/" data-mode="character" aria-current={storyActive ? undefined : "page"}><strong>{t("캐릭터 모드")}</strong><span>{t("캐릭터 한 명과 1:1 대화")}</span></Link> {/* 캐릭터 모드 */}
                <Link href={"/stories" as Route} data-mode="story" aria-current={storyActive ? "page" : undefined}><strong>{t("스토리 모드")}</strong><span>{t("여러 인물과 함께하는 상황극")}</span></Link> {/* 스토리 모드 */}
            </nav> {/* 전환 종료 */}
        </div> // 바깥 틀 종료
    ); // 반환 종료
} // 함수 종료
