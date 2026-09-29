"use client"; // 클라이언트 컴포넌트

import { createElement, useMemo, type ReactElement, type ReactNode } from "react"; // 리액트 도구
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window"; // Tauri 창 도구
import type { DesktopRouteAction } from "@/desktop/desktop-navigation"; // 화면 전이 동작
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { resolveWindowSize } from "@/features/text-play/platform/text-play-window"; // 창 크기 계산기
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 로컬 인공지능 계약

interface DesktopPlatformProviderProps // 데스크톱 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 화면
    onNavigate(action: DesktopRouteAction): void; // 화면 전이 처리
    localAIClient: OllamaClient; // 로컬 인공지능 통신기
} // 구조 종료

export function DesktopPlatformProvider({ children, onNavigate, localAIClient }: DesktopPlatformProviderProps): ReactElement // 데스크톱 플랫폼 공급자
{ // 함수 시작
    const platform = useMemo<TextPlayPlatform>(() => // 플랫폼 생성
    { // 함수 시작
        return ( // 플랫폼 반환
        { // 객체 시작
            applyWindowResolution: async (resolutionId) => // 창 해상도 적용
            { // 함수 시작
                const currentWindow = getCurrentWindow(); // 현재 창 조회
                const resolved = resolveWindowSize(resolutionId, window.screen.availWidth, window.screen.availHeight); // 적용 크기 계산
                if (resolved === "maximize") // 화면 맞춤 확인
                { // 조건 시작
                    await currentWindow.maximize(); // 창 최대화
                    return; // 적용 종료
                } // 조건 종료
                await currentWindow.unmaximize(); // 최대화 해제
                await currentWindow.setSize(new LogicalSize(resolved.width, resolved.height)); // 창 크기 변경
                await currentWindow.center(); // 창 중앙 이동
            }, // 해상도 함수 종료
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
            localAI: localAIClient, // 로컬 인공지능 연결
        } // 객체 종료
        ); // 플랫폼 반환 종료
    }, [localAIClient, onNavigate]); // 플랫폼 의존
    return <TextPlayPlatformProvider value={platform}>{children}</TextPlayPlatformProvider>; // 공용 플랫폼 공급
} // 함수 종료
