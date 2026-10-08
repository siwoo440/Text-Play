"use client"; // 클라이언트 컴포넌트

import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

function SunIcon() // 해 아이콘(밝은 모드)
{ // 함수 시작
    return <svg data-icon="sun" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>; // 해 반환
} // 함수 종료

function MoonIcon() // 달 아이콘(다크 모드)
{ // 함수 시작
    return <svg data-icon="moon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>; // 달 반환
} // 함수 종료

export function ThemeToggle() // 헤더 다크 모드 스위치(사이트 전체)
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const dark = state.settings.theme === "dark"; // 다크 모드 여부
    return ( // 스위치 반환
        <button type="button" role="switch" className="app-theme-toggle" data-state={dark ? "on" : "off"} aria-checked={dark} aria-label={t("다크 모드")} title={dark ? t("밝은 화면으로 바꾸기") : t("어두운 화면으로 바꾸기")} onClick={() => dispatch({ type: "update-settings", settings: { theme: dark ? "light" : "dark" } })}> {/* 다크 모드 스위치 */}
            {dark ? <MoonIcon /> : <SunIcon />} {/* 지금 테마 아이콘 */}
        </button> // 스위치 종료
    ); // 반환 종료
} // 함수 종료
