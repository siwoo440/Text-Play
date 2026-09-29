"use client"; // 클라이언트 컴포넌트

import { useMemo, useReducer, useState, type ReactElement } from "react"; // 리액트 상태 도구
import { createDesktopLLMSelection } from "@/desktop/desktop-llm"; // 데스크톱 AI 생성기
import { reduceDesktopRoute } from "@/desktop/desktop-navigation"; // 화면 전이 함수
import { createTauriOllamaClient } from "@/desktop/tauri-ollama-client"; // 올라마 통신기 생성기
import { DesktopPlatformProvider } from "@/desktop/DesktopPlatformProvider"; // 데스크톱 플랫폼 공급자
import { TextPlayPreferencesProvider, useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 게임 설정 공급자
import { TextPlayWindowResolutionSync } from "@/features/text-play/preferences/TextPlayWindowResolutionSync"; // 창 해상도 동기화기
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 게임 세션 공급자
import { createBrowserTextPlaySaveRepository } from "@/features/text-play/storage/browser-save-repository"; // 브라우저 저장소 생성기
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 게임 홈 화면
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 게임 플레이 화면
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약

interface DesktopAppProps // 데스크톱 앱 속성
{ // 구조 시작
    createRepository?: () => TextPlaySaveRepository; // 저장소 생성기
    createLocalAIClient?: () => OllamaClient; // 로컬 통신기 생성기
} // 구조 종료

interface DesktopContentProps // 데스크톱 내용 속성
{ // 구조 시작
    repository: TextPlaySaveRepository; // 게임 저장소
    localAIClient: OllamaClient; // 로컬 인공지능 통신기
    route: ReturnType<typeof reduceDesktopRoute>; // 현재 화면 경로
} // 구조 종료

function DesktopContent({ repository, localAIClient, route }: DesktopContentProps): ReactElement // 데스크톱 내용
{ // 함수 시작
    const { preferences } = useTextPlayPreferences(); // 현재 설정 조회
    const llmSelection = useMemo(() => createDesktopLLMSelection(preferences, localAIClient), [localAIClient, preferences]); // 설정 기반 AI 생성
    if (route.screen === "home") // 홈 화면 확인
    { // 조건 시작
        return <TextPlayHome repository={repository} />; // 홈 화면 반환
    } // 조건 종료
    return <TextPlayProvider repository={repository} llm={llmSelection.adapter} llmLabel={llmSelection.label} resumeSlot={route.resumeSlot}><TextPlayScreen /></TextPlayProvider>; // 플레이 화면 반환
} // 함수 종료

export function DesktopApp({ createRepository = createBrowserTextPlaySaveRepository, createLocalAIClient = createTauriOllamaClient }: DesktopAppProps): ReactElement // 데스크톱 앱
{ // 함수 시작
    const [repository] = useState<TextPlaySaveRepository>(() => createRepository()); // 단일 저장소 생성
    const [localAIClient] = useState<OllamaClient>(() => createLocalAIClient()); // 단일 로컬 통신기 생성
    const [route, navigate] = useReducer(reduceDesktopRoute, { screen: "home" }); // 화면 상태 생성
    return ( // 앱 반환
        <DesktopPlatformProvider onNavigate={navigate} localAIClient={localAIClient}> {/* 데스크톱 플랫폼 */}
            <TextPlayPreferencesProvider> {/* 게임 설정 공급 */}
                <TextPlayWindowResolutionSync /> {/* 저장 해상도 적용 */}
                <DesktopContent repository={repository} localAIClient={localAIClient} route={route} /> {/* 현재 화면 출력 */}
            </TextPlayPreferencesProvider> {/* 게임 설정 종료 */}
        </DesktopPlatformProvider> // 데스크톱 플랫폼 종료
    ); // 반환 종료
} // 함수 종료
