"use client"; // 클라이언트 컴포넌트

import { createElement, useMemo, type ReactElement, type ReactNode } from "react"; // 리액트 도구
import type { DesktopRouteAction } from "@/desktop/desktop-navigation"; // 화면 전이 동작
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약

interface DesktopPlatformProviderProps // 데스크톱 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 화면
    onNavigate(action: DesktopRouteAction): void; // 화면 전이 처리
} // 구조 종료

export function DesktopPlatformProvider({ children, onNavigate }: DesktopPlatformProviderProps): ReactElement // 데스크톱 플랫폼 공급자
{ // 함수 시작
    const platform = useMemo<TextPlayPlatform>(() => // 플랫폼 생성
    { // 함수 시작
        return ( // 플랫폼 반환
        { // 객체 시작
            navigate: (route) => // 화면 이동
            { // 함수 시작
                if (route === "new") // 새 게임 확인
                { // 조건 시작
                    onNavigate({ type: "start-new" }); // 새 게임 전이
                    return; // 처리 종료
                } // 조건 종료
                if (route === "resume") // 이어하기 확인
                { // 조건 시작
                    onNavigate({ type: "resume" }); // 이어하기 전이
                    return; // 처리 종료
                } // 조건 종료
                onNavigate({ type: "show-home" }); // 홈 전이
            }, // 이동 함수 종료
            renderSceneImage: (source) => createElement("img", { src: source.startsWith("/") ? `.${source}` : source, alt: "", className: "desktop-scene-image" }), // 상대 이미지 출력
        } // 객체 종료
        ); // 플랫폼 반환 종료
    }, [onNavigate]); // 이동 처리 의존
    return <TextPlayPlatformProvider value={platform}>{children}</TextPlayPlatformProvider>; // 공용 플랫폼 공급
} // 함수 종료
