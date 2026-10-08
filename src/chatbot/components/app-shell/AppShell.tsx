"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect, useRef, useState, type ReactNode } from "react"; // 리액트 도구
import { AppHeader } from "@chatbot/components/app-shell/AppHeader"; // 앱 헤더
import { ConversationPanel } from "@chatbot/components/app-shell/ConversationPanel"; // 대화 패널
import { MobileBottomNavigation } from "@chatbot/components/app-shell/MobileBottomNavigation"; // 모바일 메뉴
import { THEME_STORAGE_KEY } from "@chatbot/lib/theme/stored-theme"; // 테마 저장 키
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 사용자 패널
import { getAuthAdapter, signOutAndLeave } from "@chatbot/features/account/account-actions"; // 로그아웃
import { AccountSync } from "@chatbot/features/account/AccountSync"; // 계정 데이터 맞추기
import { AuthLinkForward } from "@chatbot/features/account/AuthLinkForward"; // 메일의 링크가 다른 화면으로 돌아왔을 때 보내 주기
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import { getClaimableCount } from "@chatbot/features/rewards/reward-model"; // 받을 보상 수
import { formatUsageDuration } from "@chatbot/features/safety/usage-time"; // 이용 시간 표시
import { useUsageReminder } from "@chatbot/features/safety/useUsageReminder"; // 이용 시간 알림
import styles from "@chatbot/components/app-shell/AppShell.module.css"; // 앱 셸 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function AppShell({ children }: { children: ReactNode }) // 앱 셸
{ // 함수 시작
    const { state, dispatch, storageError, storageNotice, dismissStorageNotice } = useAppStore(); // 앱 상태
    const [mobile, setMobile] = useState(false); // 모바일 상태
    const leftButtonRef = useRef<HTMLButtonElement>(null); // 왼쪽 버튼 참조
    const rightButtonRef = useRef<HTMLButtonElement>(null); // 오른쪽 버튼 참조
    const lastButton = useRef<"left" | "right">("left"); // 최근 버튼
    const usageReminder = useUsageReminder(); // 이용 시간 알림
    const [matureHidden, setMatureHidden] = useState(false); // 19+ 보기를 껐다는 안내 표시
    const theme = state.settings.theme; // 사이트 테마
    useEffect(() => // 테마 적용(문서 루트)·다음 방문 첫 화면용 저장
    { // 효과 시작
        document.documentElement.dataset.theme = theme; // 루트 표시
        try // 저장 시도
        { // 시도 시작
            window.localStorage.setItem(THEME_STORAGE_KEY, theme); // 테마 저장
        } // 시도 종료
        catch // 저장 실패(사생활 모드 등)
        { // 실패 시작
            // 화면 적용만 유지
        } // 실패 종료
    }, [theme]); // 테마 의존
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
    const hideMature = () => // 19+ 보기 끄기(사용자 패널의 버튼)
    { // 함수 시작
        if (!window.confirm(t("19+ 보기를 끌까요? 캐릭터와 대화, 토큰은 그대로 남아요."))) // 확인 취소
        { // 조건 시작
            return; // 그대로 둠
        } // 조건 종료
        dispatch({ type: "end-local-session" }); // 19+ 보기 끄기와 패널 닫기
        setMatureHidden(true); // 안내 표시
    }; // 함수 종료
    return ( // 셸 반환
        <div className={styles.shell} data-left-open={state.settings.leftPanelOpen} data-right-open={state.settings.rightPanelOpen} data-mobile={mobile}> {/* 셸 영역 */}
            <AppHeader leftOpen={state.settings.leftPanelOpen} rightOpen={state.settings.rightPanelOpen} onToggleLeft={toggleLeft} onToggleRight={toggleRight} onNavigate={closePanelsForNavigation} leftButtonRef={leftButtonRef} rightButtonRef={rightButtonRef} rewardCount={getClaimableCount(state.rewards, new Date())} /> {/* 앱 헤더 */}
            {storageError === null && storageNotice === null && !usageReminder.due && !matureHidden ? null : ( // 상단 메시지 판정
                <div className={styles.storageMessages}> {/* 상단 메시지 묶음 */}
                    {usageReminder.due ? ( // 이용 시간 알림 판정
                        <div className={styles.storageNotice} data-tone="rest" role="status"> {/* 이용 시간 알림 */}
                            <p>{t("오늘 {0} 동안 이용했어요. 잠깐 쉬어 가도 대화는 그대로 남아 있어요.", [formatUsageDuration(usageReminder.activeMs)])}</p> {/* 알림 문구 */}
                            <button type="button" onClick={usageReminder.acknowledge}>{t("계속 이용하기")}</button> {/* 알림 확인 */}
                        </div> // 이용 시간 알림 종료
                    ) : null} {/* 이용 시간 알림 판정 종료 */}
                    {!matureHidden ? null : ( // 19+ 보기 끔 안내 판정
                        <div className={styles.storageNotice} data-tone="info" role="status"> {/* 19+ 보기 끔 안내 */}
                            <p>{t("19+ 보기를 껐습니다. 캐릭터와 대화는 이 브라우저에 그대로 남아 있어요.")}</p> {/* 안내 문구 */}
                            <button type="button" onClick={() => setMatureHidden(false)}>{t("닫기")}</button> {/* 안내 닫기 */}
                        </div> // 19+ 보기 끔 안내 종료
                    )} {/* 19+ 보기 끔 안내 판정 종료 */}
                    {storageError === null ? null : <p className={styles.storageError} role="alert">{storageError}</p>} {/* 저장 오류 */}
                    {storageNotice === null ? null : ( // 저장소 안내 판정
                        <div className={styles.storageNotice} data-tone={storageNotice.tone} role="status"> {/* 저장소 안내 */}
                            <p>{t(storageNotice.message)}</p> {/* 안내 문구 */}
                            {storageNotice.tone === "warning" ? <Link href={"/settings/privacy#data" as Route} onClick={closePanelsForNavigation}>{t("데이터 관리 열기")}</Link> : null} {/* 데이터 관리 링크 */}
                            <button type="button" onClick={dismissStorageNotice}>{t("닫기")}</button> {/* 안내 닫기 */}
                        </div> // 저장소 안내 종료
                    )} {/* 안내 판정 종료 */}
                </div> // 메시지 묶음 종료
            )} {/* 메시지 판정 종료 */}
            <div className={styles.grid}> {/* 패널 그리드 */}
                <ConversationPanel open={state.settings.leftPanelOpen} onNavigate={closePanelsForNavigation} /> {/* 대화 패널 */}
                <div className={styles.content}>{children}</div> {/* 중앙 콘텐츠 */}
                <UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} rewards={state.rewards} open={state.settings.rightPanelOpen} onNavigate={closePanelsForNavigation} onLogout={() => void signOutAndLeave(getAuthAdapter())} onHideMature={hideMature} /> {/* 사용자 패널 */}
            </div> {/* 그리드 종료 */}
            <AccountSync /> {/* 로그인했을 때 계정 데이터를 서버와 맞춤(손님이면 아무것도 하지 않음) */}
            <AuthLinkForward /> {/* 가입 확인·비밀번호 재설정 메일의 링크가 다른 화면으로 돌아오면 맞는 화면으로 보냄 */}
            {(state.settings.leftPanelOpen || state.settings.rightPanelOpen) ? <button type="button" className={styles.scrim} aria-label={t("열린 패널 닫기")} onClick={closePanels} /> : null} {/* 패널 배경 */}
            <MobileBottomNavigation onNavigate={closePanelsForNavigation} /> {/* 모바일 하단 메뉴 */}
        </div> // 셸 종료
    ); // 반환 종료
} // 함수 종료
