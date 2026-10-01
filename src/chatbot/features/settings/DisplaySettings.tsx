"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { AppSettings, LayoutId, PlatformMode, ResolutionMode } from "@chatbot/features/core/types"; // 설정 타입
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일

const layoutIds: LayoutId[] = ["M1", "M2", "M3", "T1", "T2", "T3", "D1", "D2", "D3"]; // 레이아웃 목록

export function DisplaySettings() // 화면 레이아웃 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [status, setStatus] = useState(""); // 저장 상태
    const update = (settings: Partial<AppSettings>) => // 설정 변경 함수
    { // 함수 시작
        dispatch({ type: "update-settings", settings }); // 설정 저장
        setStatus("저장했습니다."); // 성공 상태 반영
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 화면 설정 */}
            <SettingsPageHeader kicker="PREFERENCES · DISPLAY" title="화면 레이아웃" description="기기 모드와 채팅 화면의 장면·이야기·조작 영역 배치를 정합니다. 바꾸면 바로 저장됩니다." /> {/* 페이지 머리말 */}
            <section className={styles.section} aria-labelledby="display-form-title"> {/* 화면 설정 영역 */}
                <h2 id="display-form-title">화면 설정</h2> {/* 영역 제목 */}
                <label>플랫폼 모드<select value={state.settings.platformMode} onChange={(event) => update({ platformMode: event.target.value as PlatformMode })}><option value="auto">자동</option><option value="mobile">모바일</option><option value="tablet">태블릿</option><option value="desktop">데스크톱</option></select></label> {/* 플랫폼 선택 */}
                <label>해상도 모드<select value={state.settings.resolutionMode} onChange={(event) => update({ resolutionMode: event.target.value as ResolutionMode })}><option value="auto">자동</option><option value="compact">간결</option><option value="comfortable">편안함</option><option value="wide">넓게</option></select></label> {/* 해상도 선택 */}
                <label>레이아웃<select value={state.settings.layoutId ?? ""} onChange={(event) => update({ layoutId: event.target.value === "" ? null : event.target.value as LayoutId })}><option value="">자동</option>{layoutIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></label> {/* 레이아웃 선택 */}
                <p>현재 레이아웃: {state.settings.layoutId ?? "자동(화면 크기에 맞춰 추천)"}</p> {/* 현재 상태 */}
                {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 저장 안내 */}
            </section> {/* 화면 설정 영역 종료 */}
        </> // 화면 설정 종료
    ); // 반환 종료
} // 함수 종료
