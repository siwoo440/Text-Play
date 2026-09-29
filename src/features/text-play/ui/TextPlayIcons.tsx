import type { ReactElement } from "react"; // 리액트 요소 타입

export type TextPlayIconName = "home" | "heart" | "sanity" | "gold" | "save" | "load" | "ai" | "settings" | "send" | "stop" | "status"; // 아이콘 이름

interface TextPlayIconProps // 아이콘 속성
{ // 구조 시작
    name: TextPlayIconName; // 아이콘 이름
    size?: number; // 아이콘 크기
} // 구조 종료

function IconGlyph({ name }: { name: TextPlayIconName }): ReactElement // 아이콘 도형
{ // 함수 시작
    switch (name) // 아이콘 분기
    { // 분기 시작
        case "home": // 홈 아이콘
            return <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5z" />; // 홈 도형
        case "heart": // 체력 아이콘
            return <path d="M12 21S4 16.2 4 9.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8 3.8C20 16.2 12 21 12 21Z" />; // 심장 도형
        case "sanity": // 정신력 아이콘
            return <path d="M12 2.5 14.2 8l5.8.4-4.5 3.7 1.5 5.6-5-3.2-5 3.2 1.5-5.6L4 8.4 9.8 8z" />; // 별 도형
        case "gold": // 골드 아이콘
            return <><circle cx="12" cy="12" r="9" /><path d="M14.8 8.5c-.7-.7-1.7-1-2.8-1-1.8 0-3 .9-3 2.2 0 3.4 6.2 1.5 6.2 4.7 0 1.3-1.2 2.3-3.2 2.3-1.3 0-2.5-.4-3.3-1.2M12 5.5v13" /></>; // 동전 도형
        case "save": // 저장 아이콘
            return <><path d="M4 3h13l3 3v15H4z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>; // 저장 도형
        case "load": // 불러오기 아이콘
            return <><path d="M4 3h13l3 3v15H4z" /><path d="M12 7v9m0 0-4-4m4 4 4-4" /></>; // 불러오기 도형
        case "ai": // AI 아이콘
            return <><rect x="4" y="6" width="16" height="13" rx="4" /><path d="M9 11h.01M15 11h.01M9 15h6M12 3v3" /></>; // AI 도형
        case "settings": // 설정 아이콘
            return <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>; // 설정 도형
        case "send": // 전송 아이콘
            return <path d="m3 4 18 8-18 8 3-8zm3 8h15" />; // 전송 도형
        case "stop": // 중지 아이콘
            return <rect x="6" y="6" width="12" height="12" rx="2" />; // 중지 도형
        case "status": // 상태 아이콘
            return <><path d="M4 20V10m5 10V4m6 16v-7m5 7V7" /><path d="M2 20h20" /></>; // 상태 도형
    } // 분기 종료
} // 함수 종료

export function TextPlayIcon({ name, size = 20 }: TextPlayIconProps): ReactElement // 공용 아이콘
{ // 함수 시작
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><IconGlyph name={name} /></svg>; // 벡터 아이콘 반환
} // 함수 종료

export function TextPlayFrameDecoration(): ReactElement // 프레임 장식
{ // 함수 시작
    return <svg viewBox="0 0 120 48" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M1 47V14L14 1h28M119 47V14L106 1H78" /><path d="M8 47V18L18 8h18M112 47V18L102 8H84" /><circle cx="60" cy="6" r="3" /><path d="M48 6h9m6 0h9" /></svg>; // 벡터 장식 반환
} // 함수 종료
