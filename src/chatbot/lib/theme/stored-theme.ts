import type { ColorTheme } from "@chatbot/features/core/types"; // 색 테마 타입

export const THEME_STORAGE_KEY = "mateverse:theme"; // 첫 화면 깜빡임 방지와 비상 화면용 테마 저장 키

export interface ErrorScreenPalette // 비상 오류 화면 색(공통 스타일을 못 쓰는 화면용)
{ // 구조 시작
    scheme: ColorTheme; // 입력 요소 색
    canvas: string; // 바탕
    glow: string; // 바탕 빛
    surface: string; // 카드
    line: string; // 카드 테두리
    shadow: string; // 카드 그림자
    ink: string; // 제목 글자
    muted: string; // 설명 글자
    actionLine: string; // 보조 버튼 테두리
    actionSurface: string; // 보조 버튼 배경
    actionInk: string; // 보조 버튼 글자
    primary: string; // 주 버튼 배경
    primaryInk: string; // 주 버튼 글자
} // 구조 종료

export function readStoredTheme(): ColorTheme // 저장된 테마 읽기(없거나 읽지 못하면 밝게)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light"; // 다크만 다크
    } // 시도 종료
    catch // 읽기 실패(서버·사생활 모드)
    { // 실패 시작
        return "light"; // 밝게
    } // 실패 종료
} // 함수 종료

export function getErrorScreenPalette(theme: ColorTheme): ErrorScreenPalette // 비상 오류 화면 색 고르기
{ // 함수 시작
    if (theme === "dark") // 다크 판정
    { // 조건 시작
        return { scheme: "dark", canvas: "#110f17", glow: "rgb(109 91 176 / 28%)", surface: "#1b1825", line: "#2f2a3d", shadow: "0 24px 60px rgb(0 0 0 / 45%)", ink: "#ece9f5", muted: "#b4adc8", actionLine: "#453a66", actionSurface: "#1b1825", actionInk: "#d9c8ff", primary: "#6d28d9", primaryInk: "#ffffff" }; // 어두운 색
    } // 조건 종료
    return { scheme: "light", canvas: "#fbf9ff", glow: "rgb(196 181 253 / 40%)", surface: "#ffffff", line: "#e9e3f3", shadow: "0 24px 60px rgb(76 29 149 / 12%)", ink: "#1f1a2e", muted: "#5f5873", actionLine: "#ddd6fe", actionSurface: "#ffffff", actionInk: "#4c1d95", primary: "#6d28d9", primaryInk: "#ffffff" }; // 밝은 색
} // 함수 종료
