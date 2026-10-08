"use client"; // 클라이언트 컴포넌트

import { useState, type ReactElement } from "react"; // 리액트 상태 도구
import { AppProvider } from "@chatbot/features/core/AppProvider"; // ChatBot 앱 상태 공급자
import type { ModelStoreClient } from "@/desktop/ai-models/model-store-client"; // 보관함 통신 계약
import { createTauriModelStoreClient } from "@/desktop/ai-models/tauri-model-store-client"; // 보관함 통신기 생성기
import { DesktopLanguageBridge } from "@/desktop/DesktopLanguageBridge"; // 언어 연결 다리
import { DesktopPlatformProvider } from "@/desktop/DesktopPlatformProvider"; // 데스크톱 플랫폼 공급자
import { DesktopPlayRoute, DesktopRoutes } from "@/desktop/DesktopRoutes"; // 데스크톱 경로 화면
import { DesktopRouterProvider } from "@/desktop/router/DesktopRouter"; // 데스크톱 경로 공급자
import { createTauriOllamaClient } from "@/desktop/tauri-ollama-client"; // 올라마 통신기 생성기
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 게임 설정 공급자
import { TextPlayWindowResolutionSync } from "@/features/text-play/preferences/TextPlayWindowResolutionSync"; // 창 해상도 동기화기
import { createBrowserTextPlaySaveRepository } from "@/features/text-play/storage/browser-save-repository"; // 브라우저 저장소 생성기
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약

interface DesktopAppProps // 데스크톱 앱 속성
{ // 구조 시작
    createRepository?: () => TextPlaySaveRepository; // 저장소 생성기
    createLocalAIClient?: () => OllamaClient; // 로컬 통신기 생성기
    createModelStoreClient?: () => ModelStoreClient; // 보관함 통신기 생성기
} // 구조 종료

export function DesktopApp({ createRepository = createBrowserTextPlaySaveRepository, createLocalAIClient = createTauriOllamaClient, createModelStoreClient = createTauriModelStoreClient }: DesktopAppProps): ReactElement // 데스크톱 앱
{ // 함수 시작
    const [repository] = useState<TextPlaySaveRepository>(() => createRepository()); // 단일 저장소 생성
    const [localAIClient] = useState<OllamaClient>(() => createLocalAIClient()); // 단일 로컬 통신기 생성
    const [modelStoreClient] = useState<ModelStoreClient>(() => createModelStoreClient()); // 단일 보관함 통신기 생성
    return ( // 앱 반환
        <DesktopRouterProvider> {/* 데스크톱 경로 */}
            <DesktopPlatformProvider localAIClient={localAIClient}> {/* Text-Play 플랫폼 */}
                <TextPlayPreferencesProvider> {/* 게임 설정 공급 */}
                    <TextPlayWindowResolutionSync /> {/* 저장 해상도 적용 */}
                    <DesktopPlayRoute repository={repository} localAIClient={localAIClient} /> {/* Text-Play 플레이 화면(ChatBot 앱 상태 밖: 언어가 바뀌어도 게임 유지) */}
                    <AppProvider> {/* ChatBot 앱 상태(화면 언어가 바뀌면 이 아래를 새로 그림) */}
                        <DesktopLanguageBridge /> {/* Text-Play 설정 언어와 ChatBot 화면 언어 맞추기 */}
                        <DesktopRoutes repository={repository} modelStoreClient={modelStoreClient} /> {/* 그 밖의 화면 출력 */}
                    </AppProvider> {/* 앱 상태 종료 */}
                </TextPlayPreferencesProvider> {/* 게임 설정 종료 */}
            </DesktopPlatformProvider> {/* 플랫폼 종료 */}
        </DesktopRouterProvider> // 경로 종료
    ); // 반환 종료
} // 함수 종료
