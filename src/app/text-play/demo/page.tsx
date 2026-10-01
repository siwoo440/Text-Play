import type { Metadata } from "next"; // 문서 정보 타입
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { CloseAppPanelsOnEnter } from "@/features/text-play/platform/CloseAppPanelsOnEnter"; // 진입 시 패널 닫기
import { NextTextPlayPlatformProvider } from "@/features/text-play/platform/NextTextPlayPlatformProvider"; // 웹 플랫폼 공급자
import { NextTextPlaySessionProvider } from "@/features/text-play/platform/NextTextPlaySessionProvider"; // 웹 세션 공급자
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 게임 설정 공급자
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면

export const metadata: Metadata = { title: `${DEMO_TEXT_PLAY_PACKAGE.title} · Text-Play` }; // 플레이 탭 제목

interface TextPlayDemoPageProps // 샘플 경로 속성
{ // 함수 시작
    searchParams: Promise<{ mode?: string }>; // 주소 검색 값
} // 속성 종료

export default async function TextPlayDemoPage({ searchParams }: TextPlayDemoPageProps) // 샘플 플레이 경로
{ // 함수 시작
    const parameters = await searchParams; // 검색 값 해석
    const resumeSlot = parameters.mode === "resume" ? "auto" : null; // 복원 슬롯 선택
    return <NextTextPlayPlatformProvider><CloseAppPanelsOnEnter /><TextPlayPreferencesProvider><NextTextPlaySessionProvider resumeSlot={resumeSlot}><TextPlayScreen /></NextTextPlaySessionProvider></TextPlayPreferencesProvider></NextTextPlayPlatformProvider>; // 웹 플레이 화면 반환
} // 함수 종료
