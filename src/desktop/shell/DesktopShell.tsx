"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"; // 리액트 도구
import chatbotShellStyles from "@chatbot/components/app-shell/AppShell.module.css"; // ChatBot 패널 안쪽 스타일
import { ConversationPanel } from "@chatbot/components/app-shell/ConversationPanel"; // ChatBot 대화방 목록
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // ChatBot 사용자 패널
import { AdultContentSwitch } from "@chatbot/features/adult/AdultContentSwitch"; // ChatBot 19+ 스위치
import { useAppStore } from "@chatbot/features/core/AppProvider"; // ChatBot 앱 저장소
import { DESKTOP_UI_TEXT } from "@/desktop/desktop-ui-text"; // 언어별 틀 글자
import Image from "@/desktop/next-compat/image"; // 데스크톱 이미지
import Link from "@/desktop/next-compat/link"; // 데스크톱 링크
import { desktopAreas, getAdjacentDesktopAreas, type DesktopArea, type DesktopAreaId } from "@/desktop/router/desktop-areas"; // 메뉴 영역
import { useDesktopRouterActions } from "@/desktop/router/DesktopRouter"; // 데스크톱 이동 동작
import styles from "@/desktop/shell/DesktopShell.module.css"; // 데스크톱 틀 스타일
import { TextPlayRoomPanel } from "@/desktop/shell/TextPlayRoomPanel"; // Text-Play 대화방
import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 언어
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // Text-Play 저장소 계약

interface DesktopShellProps // 데스크톱 틀 속성
{ // 구조 시작
    pathname: string; // 현재 화면 경로
    area: DesktopAreaId | null; // 현재 화면 소속 메뉴 영역
    title: string; // 현재 화면 제목
    repository: TextPlaySaveRepository; // Text-Play 저장소
    children: ReactNode; // 화면 내용
} // 구조 종료

function Icon({ children }: { children: ReactNode }): ReactElement // 선 아이콘 틀
{ // 함수 시작
    return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">{children}</svg>; // 아이콘 반환
} // 함수 종료

const areaIcons: Record<DesktopAreaId, ReactNode> = // 메뉴 영역 아이콘
{ // 객체 시작
    home: <Icon><path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4v-8.5Z" /></Icon>, // 메인 아이콘
    explore: <Icon><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Icon>, // 탐색 아이콘
    library: <Icon><path d="M5 4.5h4v15H5zM10.5 4.5h4v15h-4zM16 5.2l3.6-.9 3 14.6-3.6.8z" /></Icon>, // 보관함 아이콘
    "text-play": <Icon><path d="M5 5h14v10H8l-3 3V5Z" /><path d="m10.5 8 3.5 2-3.5 2V8Z" /></Icon>, // Text-Play 아이콘
    settings: <Icon><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></Icon>, // 설정 아이콘
    "ai-models": <Icon><rect x="6.5" y="6.5" width="11" height="11" rx="2" /><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3M10 10h4v4h-4z" /></Icon>, // AI 모델(칩) 아이콘
    support: <Icon><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.6M12 16.8v.2" /></Icon>, // 지원 아이콘
}; // 객체 종료

function NavigationList({ group, label, pathname, area }: { group: DesktopArea["group"]; label: string; pathname: string; area: DesktopAreaId | null }): ReactElement // 메뉴 목록
{ // 함수 시작
    const areaLabels = DESKTOP_UI_TEXT[useAppLanguage()].areas; // 언어별 메뉴 이름
    return ( // 목록 반환
        <nav className={styles.navigation} aria-label={label}> {/* 메뉴 영역 */}
            {desktopAreas.filter((item) => item.group === group).map((item) => // 묶음 메뉴 순회
            { // 순회 시작
                const current = pathname === item.href ? "page" : item.id === area ? "true" : undefined; // 첫 화면은 현재 페이지, 세부 화면은 소속 표시
                return <Link key={item.id} href={item.href} className={styles.navigationLink} data-accent={item.accent} aria-current={current}>{areaIcons[item.id]}<span>{areaLabels[item.id]}</span></Link>; // 메뉴 링크
            })} {/* 순회 종료 */}
        </nav> // 메뉴 영역 종료
    ); // 반환 종료
} // 함수 종료

function AreaStepButton({ direction, target }: { direction: "previous" | "next"; target: DesktopArea | null }): ReactElement // 이전·다음 메뉴 화살표
{ // 함수 시작
    const router = useDesktopRouterActions(); // 이동 동작
    const text = DESKTOP_UI_TEXT[useAppLanguage()]; // 언어별 틀 글자
    const name = direction === "previous" ? text.shell.previousMenu : text.shell.nextMenu; // 버튼 이름
    const label = target === null ? name : `${name}: ${text.areas[target.id]}`; // 이동 대상 포함 이름
    return ( // 버튼 반환
        <button type="button" aria-label={label} title={label} disabled={target === null} onClick={() => target !== null && router.push(target.href)}> {/* 화살표 버튼 */}
            <Icon>{direction === "previous" ? <path d="m14.5 6-6 6 6 6" /> : <path d="m9.5 6 6 6-6 6" />}</Icon> {/* 방향 아이콘 */}
        </button> // 버튼 종료
    ); // 반환 종료
} // 함수 종료

export function DesktopShell({ pathname, area, title, repository, children }: DesktopShellProps): ReactElement // 데스크톱 틀
{ // 함수 시작
    const { state, storageError, storageNotice, dismissStorageNotice } = useAppStore(); // ChatBot 앱 상태
    const text = DESKTOP_UI_TEXT[useAppLanguage()].shell; // 언어별 틀 글자
    const adjacent = getAdjacentDesktopAreas(area); // 이전·다음 메뉴 영역
    const [userPanelOpen, setUserPanelOpen] = useState(false); // 사용자 패널 열림 상태
    const toggleRef = useRef<HTMLButtonElement>(null); // 사용자 패널 버튼 참조
    const panelRef = useRef<HTMLDivElement>(null); // 사용자 패널 참조
    const closeUserPanel = (restoreFocus: boolean) => // 사용자 패널 닫기
    { // 함수 시작
        setUserPanelOpen(false); // 닫힘 반영
        if (restoreFocus) // 초점 복귀 확인
        { // 조건 시작
            queueMicrotask(() => toggleRef.current?.focus()); // 버튼으로 초점 복귀
        } // 조건 종료
    }; // 함수 종료
    useEffect(() => // 사용자 패널 닫기 구독
    { // 효과 시작
        if (!userPanelOpen) // 열림 확인
        { // 조건 시작
            return undefined; // 구독 생략
        } // 조건 종료
        const closeOnKey = (event: KeyboardEvent) => // 키보드 닫기
        { // 함수 시작
            if (event.key === "Escape") // Esc 확인
            { // 조건 시작
                setUserPanelOpen(false); // 패널 닫기
                queueMicrotask(() => toggleRef.current?.focus()); // 초점 복귀
            } // 조건 종료
        }; // 함수 종료
        const closeOnOutside = (event: PointerEvent) => // 바깥 선택 닫기
        { // 함수 시작
            const target = event.target as Node; // 선택 요소
            if (!panelRef.current?.contains(target) && !toggleRef.current?.contains(target)) // 바깥 선택 확인
            { // 조건 시작
                setUserPanelOpen(false); // 패널 닫기
            } // 조건 종료
        }; // 함수 종료
        document.addEventListener("keydown", closeOnKey); // 키보드 구독
        document.addEventListener("pointerdown", closeOnOutside); // 선택 구독
        return () => // 구독 해제
        { // 해제 시작
            document.removeEventListener("keydown", closeOnKey); // 키보드 해제
            document.removeEventListener("pointerdown", closeOnOutside); // 선택 해제
        }; // 해제 종료
    }, [userPanelOpen]); // 열림 상태 의존
    return ( // 틀 반환
        <div className={styles.desktop}> {/* 데스크톱 틀 */}
            <aside className={styles.sidebar} aria-label={text.sidebar}> {/* 사이드바 */}
                <Link href="/" className={styles.brand} aria-label={text.brand}> {/* 브랜드 링크 */}
                    <Image src="/images/brand/mate-verse-logo-v3.png" alt="Mate Verse" width={2172} height={724} priority /> {/* 브랜드 로고 */}
                    <span className={styles.productBadge}>Text-Play</span> {/* 제품 표시 */}
                </Link> {/* 브랜드 링크 종료 */}
                <NavigationList group="primary" label={text.primaryMenu} pathname={pathname} area={area} /> {/* 주요 메뉴 */}
                <div className={styles.rooms}> {/* 대화방 영역 */}
                    <div className={`${chatbotShellStyles.grid} ${styles.conversations}`}> {/* ChatBot 대화방(목록 안쪽은 ChatBot 스타일 그대로) */}
                        <ConversationPanel open onNavigate={() => setUserPanelOpen(false)} /> {/* ChatBot 기록과 같은 대화방 목록 */}
                        <Link href="/settings/privacy#data" className={styles.importLink}>{text.importChatBot}</Link> {/* ChatBot 백업 JSON 가져오기 */}
                    </div> {/* ChatBot 대화방 종료 */}
                    <TextPlayRoomPanel repository={repository} refreshKey={`${pathname}`} /> {/* Text-Play 대화방 */}
                </div> {/* 대화방 영역 종료 */}
                <NavigationList group="program" label={text.programMenu} pathname={pathname} area={area} /> {/* 프로그램 메뉴 */}
            </aside> {/* 사이드바 종료 */}
            <div className={styles.main}> {/* 본문 영역 */}
                <header className={styles.topbar}> {/* 상단 바 */}
                    <div className={styles.history}> {/* 이전·다음 메뉴 이동 */}
                        <AreaStepButton direction="previous" target={adjacent.previous} /> {/* 이전 메뉴 */}
                        <AreaStepButton direction="next" target={adjacent.next} /> {/* 다음 메뉴 */}
                    </div> {/* 메뉴 이동 종료 */}
                    <p className={styles.title}>{title}</p> {/* 현재 화면 제목 */}
                    <div className={styles.topbarActions}> {/* 상단 동작 */}
                        <AdultContentSwitch /> {/* 19+ 스위치 */}
                        <Link href="/settings/tokens" className={styles.tokenChip} aria-label={text.tokens(state.wallet.balance.toLocaleString())}><span aria-hidden="true">◆</span>{state.wallet.balance.toLocaleString()}</Link> {/* 토큰 잔액 */}
                        <button ref={toggleRef} type="button" className={styles.profileButton} aria-label={text.userPanel} aria-expanded={userPanelOpen} aria-controls="user-panel" onClick={() => (userPanelOpen ? closeUserPanel(false) : setUserPanelOpen(true))}> {/* 사용자 패널 버튼 */}
                            <span className={styles.avatar} aria-hidden="true">{state.profile.nickname.slice(0, 1)}</span> {/* 프로필 글자 */}
                            <span className={styles.nickname}>{state.profile.nickname}</span> {/* 사용자 이름 */}
                        </button> {/* 버튼 종료 */}
                    </div> {/* 상단 동작 종료 */}
                </header> {/* 상단 바 종료 */}
                {storageError === null && storageNotice === null ? null : ( // 저장소 메시지 판정
                    <div className={styles.storageMessages}> {/* 저장소 메시지 묶음 */}
                        {storageError === null ? null : <p className={styles.storageError} role="alert">{storageError}</p>} {/* 저장 오류 */}
                        {storageNotice === null ? null : ( // 저장소 안내 판정
                            <div className={styles.storageNotice} data-tone={storageNotice.tone} role="status"> {/* 저장소 안내 */}
                                <p>{storageNotice.message}</p> {/* 안내 문구 */}
                                {storageNotice.tone === "warning" ? <Link href="/settings/privacy#data">{text.openDataSettings}</Link> : null} {/* 데이터 관리 링크 */}
                                <button type="button" onClick={dismissStorageNotice}>{text.close}</button> {/* 안내 닫기 */}
                            </div> // 저장소 안내 종료
                        )} {/* 안내 판정 종료 */}
                    </div> // 메시지 묶음 종료
                )} {/* 메시지 판정 종료 */}
                <div className={styles.content}>{children}</div> {/* 화면 내용 */}
            </div> {/* 본문 영역 종료 */}
            {userPanelOpen ? <div ref={panelRef} className={`${chatbotShellStyles.grid} ${styles.userPopover}`}><UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} open onNavigate={() => closeUserPanel(false)} /></div> : null} {/* 사용자 패널 */}
        </div> // 틀 종료
    ); // 반환 종료
} // 함수 종료
