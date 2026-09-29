"use client"; // 클라이언트 컴포넌트

import { useReducer, useState, type ReactElement } from "react"; // 리액트 상태 도구
import { createDesktopLLMSelection } from "@/desktop/desktop-llm"; // 데스크톱 AI 생성기
import { reduceDesktopRoute } from "@/desktop/desktop-navigation"; // 화면 전이 함수
import { DesktopPlatformProvider } from "@/desktop/DesktopPlatformProvider"; // 데스크톱 플랫폼 공급자
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 게임 세션 공급자
import { createBrowserTextPlaySaveRepository } from "@/features/text-play/storage/browser-save-repository"; // 브라우저 저장소 생성기
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 게임 홈 화면
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 게임 플레이 화면

interface DesktopAppProps // 데스크톱 앱 속성
{ // 구조 시작
    createRepository?: () => TextPlaySaveRepository; // 저장소 생성기
} // 구조 종료

export function DesktopApp({ createRepository = createBrowserTextPlaySaveRepository }: DesktopAppProps): ReactElement // 데스크톱 앱
{ // 함수 시작
    const [repository] = useState<TextPlaySaveRepository>(() => createRepository()); // 단일 저장소 생성
    const [llmSelection] = useState(createDesktopLLMSelection); // 강제 Mock AI 생성
    const [route, navigate] = useReducer(reduceDesktopRoute, { screen: "home" }); // 화면 상태 생성
    return ( // 앱 반환
        <DesktopPlatformProvider onNavigate={navigate}> {/* 데스크톱 플랫폼 */}
            {route.screen === "home" // 홈 화면 확인
                ? <TextPlayHome repository={repository} /> // 홈 화면 출력
                : <TextPlayProvider repository={repository} llm={llmSelection.adapter} llmLabel={llmSelection.label} resumeSlot={route.resumeSlot}><TextPlayScreen /></TextPlayProvider>} {/* 플레이 화면 출력 */}
        </DesktopPlatformProvider> // 데스크톱 플랫폼 종료
    ); // 반환 종료
} // 함수 종료
