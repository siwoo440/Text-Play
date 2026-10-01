import type { Metadata } from "next"; // 문서 정보 타입
import { CloseAppPanelsOnEnter } from "@/features/text-play/platform/CloseAppPanelsOnEnter"; // 진입 시 패널 닫기
import { NextTextPlayPlatformProvider } from "@/features/text-play/platform/NextTextPlayPlatformProvider"; // 웹 플랫폼 공급자
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // Text-Play 홈

export const metadata: Metadata = { title: "Text-Play" }; // 홈 탭 제목

export default function TextPlayPage() // Text-Play 경로
{ // 함수 시작
    return <NextTextPlayPlatformProvider><CloseAppPanelsOnEnter /><TextPlayHome /></NextTextPlayPlatformProvider>; // 웹 홈 반환
} // 함수 종료
