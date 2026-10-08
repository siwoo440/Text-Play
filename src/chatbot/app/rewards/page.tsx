import type { Metadata } from "next"; // 메타데이터 타입
import { RewardsScreen } from "@chatbot/features/rewards/RewardsScreen"; // 출석과 미션 화면
import { SettingsShell } from "@chatbot/features/settings/SettingsShell"; // 설정 공통 틀

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "출석과 미션 | Mate Verse", // 페이지 제목
    description: "매일 출석하고 오늘의 미션을 채워 토큰을 받는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function RewardsPage() // 출석과 미션 페이지
{ // 함수 시작
    return <SettingsShell><RewardsScreen /></SettingsShell>; // 공통 틀과 화면 반환
} // 함수 종료
