import type { Metadata } from "next"; // 메타데이터 타입
import { SettingsShell } from "@chatbot/features/settings/SettingsShell"; // 설정 공통 틀
import { SupportScreen } from "@chatbot/features/support/SupportScreen"; // 고객 지원 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "고객 지원 | Mate Verse", // 페이지 제목
    description: "자주 묻는 질문과 문의에 필요한 앱 정보를 확인하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function SupportPage() // 고객 지원 페이지
{ // 함수 시작
    return <SettingsShell><SupportScreen /></SettingsShell>; // 공통 틀과 화면 반환
} // 함수 종료
