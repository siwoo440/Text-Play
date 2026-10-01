"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect, useRef, useState, type ReactNode } from "react"; // 리액트 도구
import { AppHeader } from "@chatbot/components/app-shell/AppHeader"; // 앱 헤더
import { ConversationPanel } from "@chatbot/components/app-shell/ConversationPanel"; // 대화 패널
import { MobileBottomNavigation } from "@chatbot/components/app-shell/MobileBottomNavigation"; // 모바일 메뉴
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 사용자 패널
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import styles from "@chatbot/components/app-shell/AppShell.module.css"; // 앱 셸 스타일

export function AppShell({ children }: { children: ReactNode }) // 앱 셸
{ // 함수 시작
    const { state, dispatch, storageError, storageNotice, dismissStorageNotice } = useAppStore(); // 앱 상태
    const [mobile, setMobile] = useState(false); // 모바일 상태
    const leftButtonRef = useRef<HTMLButtonElement>(null); // 왼쪽 버튼 참조
    const rightButtonRef = useRef<HTMLButtonElement>(null); // 오른쪽 버튼 참조
    const lastButton = useRef<"left" | "right">("left"); // 최근 버튼
    useEffect(() => // 화면 크기 효과
    { // 효과 시작
        const update = () => setMobile(window.innerWidth <= 760); // 크기 갱신
        update(); // 최초 갱신
        window.addEventListener("resize", update); // 변경 구독
        return () => window.removeEventListener("resize", update); // 구독 해제
    }, []); // 최초 실행
    useEffect(() => // 키보드 효과
    { // 효과 시작
        const close = (event: KeyboardEvent) => // 키보드 처리
        { // 처리 시작
            if (event.key === "Escape" && !event.defaultPrevented && (state.settings.leftPanelOpen || state.settings.rightPanelOpen)) // 탈출 판정(메뉴·검색이 처리한 키 제외)
            { // 조건 시작
                dispatch({ type: "close-panels" }); // 패널 닫기
                const target = lastButton.current === "left" ? leftButtonRef.current : rightButtonRef.current; // 복귀 대상
                queueMicrotask(() => target?.focus()); // 포커스 복귀
            } // 조건 종료
        }; // 처리 종료
        document.addEventListener("keydown", close); // 키보드 구독
        return () => document.removeEventListener("keydown", close); // 구독 해제
    }, [dispatch, state.settings.leftPanelOpen, state.settings.rightPanelOpen]); // 패널 상태 의존
    const toggleLeft = () => // 왼쪽 전환
    { // 함수 시작
        lastButton.current = "left"; // 최근 버튼 기록
        dispatch({ type: "toggle-left-panel", exclusive: mobile }); // 상태 전환
    }; // 함수 종료
    const toggleRight = () => // 오른쪽 전환
    { // 함수 시작
        lastButton.current = "right"; // 최근 버튼 기록
        dispatch({ type: "toggle-right-panel", exclusive: mobile }); // 상태 전환
    }; // 함수 종료
    const closePanels = () => // 패널 닫기
    { // 함수 시작
        dispatch({ type: "close-panels" }); // 전체 닫기
        const target = lastButton.current === "left" ? leftButtonRef.current : rightButtonRef.current; // 복귀 대상
        queueMicrotask(() => target?.focus()); // 포커스 복귀
    }; // 함수 종료
    const closePanelsForNavigation = () => // 이동 패널 닫기
    { // 함수 시작
        dispatch({ type: "close-panels" }); // 이동 전 전체 닫기
    }; // 함수 종료
    return ( // 셸 반환
        <div className={styles.shell} data-left-open={state.settings.leftPanelOpen} data-right-open={state.settings.rightPanelOpen} data-mobile={mobile}> {/* 셸 영역 */}
            <AppHeader leftOpen={state.settings.leftPanelOpen} rightOpen={state.settings.rightPanelOpen} onToggleLeft={toggleLeft} onToggleRight={toggleRight} onNavigate={closePanelsForNavigation} leftButtonRef={leftButtonRef} rightButtonRef={rightButtonRef} /> {/* 앱 헤더 */}
            {storageError === null && storageNotice === null ? null : ( // 저장소 메시지 판정
                <div className={styles.storageMessages}> {/* 저장소 메시지 묶음 */}
                    {storageError === null ? null : <p className={styles.storageError} role="alert">{storageError}</p>} {/* 저장 오류 */}
                    {storageNotice === null ? null : ( // 저장소 안내 판정
                        <div className={styles.storageNotice} data-tone={storageNotice.tone} role="status"> {/* 저장소 안내 */}
                            <p>{storageNotice.message}</p> {/* 안내 문구 */}
                            {storageNotice.tone === "warning" ? <Link href={"/settings/privacy#data" as Route} onClick={closePanelsForNavigation}>데이터 관리 열기</Link> : null} {/* 데이터 관리 링크 */}
                            <button type="button" onClick={dismissStorageNotice}>닫기</button> {/* 안내 닫기 */}
                        </div> // 저장소 안내 종료
                    )} {/* 안내 판정 종료 */}
                </div> // 메시지 묶음 종료
            )} {/* 메시지 판정 종료 */}
            <div className={styles.grid}> {/* 패널 그리드 */}
                <ConversationPanel open={state.settings.leftPanelOpen} onNavigate={closePanelsForNavigation} /> {/* 대화 패널 */}
                <div className={styles.content}>{children}</div> {/* 중앙 콘텐츠 */}
                <UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} open={state.settings.rightPanelOpen} onNavigate={closePanelsForNavigation} /> {/* 사용자 패널 */}
            </div> {/* 그리드 종료 */}
            {(state.settings.leftPanelOpen || state.settings.rightPanelOpen) ? <button type="button" className={styles.scrim} aria-label="열린 패널 닫기" onClick={closePanels} /> : null} {/* 패널 배경 */}
            <MobileBottomNavigation onNavigate={closePanelsForNavigation} /> {/* 모바일 하단 메뉴 */}
        </div> // 셸 종료
    ); // 반환 종료
} // 함수 종료
