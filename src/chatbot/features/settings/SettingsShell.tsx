"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { usePathname } from "@/desktop/next-compat/navigation"; // 현재 경로 도구
import { useEffect, useRef, type ReactNode } from "react"; // 리액트 도구
import { findSettingsGroup, settingsNavigation } from "@chatbot/features/settings/settings-navigation"; // 공통 메뉴 정의
import styles from "@chatbot/features/settings/SettingsShell.module.css"; // 설정 틀 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function SettingsShell({ children }: { children: ReactNode }) // 설정 공통 틀
{ // 함수 시작
    const pathname = usePathname() || "/settings/profile"; // 현재 경로 조회
    const navRef = useRef<HTMLElement>(null); // 메뉴 참조
    useEffect(() => // 현재 메뉴 노출 효과
    { // 효과 시작
        const nav = navRef.current; // 메뉴 요소
        const active = nav?.querySelector<HTMLElement>("[aria-current=\"page\"]"); // 현재 메뉴 링크
        if (nav === null || active === null || active === undefined || nav.scrollWidth <= nav.clientWidth) // 가로 스크롤 필요 판정
        { // 조건 시작
            return; // 이동 생략
        } // 조건 종료
        nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2; // 현재 메뉴 가운데 정렬
    }, [pathname]); // 경로 변경 의존
    return ( // 틀 반환
        <div className={styles.shell} data-tone={findSettingsGroup(pathname)} data-surface="light"> {/* 설정 틀 */}
            <nav ref={navRef} className={styles.nav} aria-label={t("설정 메뉴")}> {/* 설정 메뉴 */}
                <p className={styles.navTitle}>MY SPACE</p> {/* 메뉴 표제 */}
                {settingsNavigation.map((group) => ( // 묶음 순회
                    <section key={group.id} className={styles.navGroup} data-tone={group.id} aria-labelledby={`settings-nav-${group.id}`}> {/* 메뉴 묶음 */}
                        <h2 id={`settings-nav-${group.id}`}>{t(group.label)}</h2> {/* 묶음 이름 */}
                        <ul> {/* 항목 목록 */}
                            {group.items.map((item) => ( // 항목 순회
                                <li key={item.href}> {/* 메뉴 항목 */}
                                    <Link href={item.href as Route} aria-current={pathname.startsWith(item.href) ? "page" : undefined}> {/* 메뉴 링크 */}
                                        <strong>{t(item.label)}</strong> {/* 메뉴 이름 */}
                                        <small>{t(item.description)}</small> {/* 메뉴 설명 */}
                                    </Link> {/* 메뉴 링크 종료 */}
                                </li> // 메뉴 항목 종료
                            ))} {/* 항목 순회 종료 */}
                        </ul> {/* 항목 목록 종료 */}
                    </section> // 메뉴 묶음 종료
                ))} {/* 묶음 순회 종료 */}
            </nav> {/* 설정 메뉴 종료 */}
            <main className={styles.main}>{children}</main> {/* 설정 본문 */}
        </div> // 설정 틀 종료
    ); // 반환 종료
} // 함수 종료

interface SettingsPageHeaderProps // 페이지 머리말 속성
{ // 구조 시작
    kicker: string; // 영문 표제
    title: string; // 페이지 제목
    description: string; // 페이지 설명
} // 구조 종료

export function SettingsPageHeader({ kicker, title, description }: SettingsPageHeaderProps) // 설정 페이지 머리말
{ // 함수 시작
    return ( // 머리말 반환
        <header className={styles.pageHeader}> {/* 페이지 머리말 */}
            <p className={styles.kicker}>{kicker}</p> {/* 영문 표제 */}
            <h1>{title}</h1> {/* 페이지 제목 */}
            <p className={styles.lead}>{description}</p> {/* 페이지 설명 */}
        </header> // 머리말 종료
    ); // 반환 종료
} // 함수 종료
