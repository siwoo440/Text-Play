import type { Metadata } from "next"; // 메타데이터 타입
import { DisplaySettings } from "@chatbot/features/settings/DisplaySettings"; // 화면 레이아웃 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "화면 레이아웃 | Mate Verse", // 페이지 제목
    description: "기기 모드와 채팅 화면 배치를 정하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function DisplaySettingsPage() // 화면 레이아웃 페이지
{ // 함수 시작
    return <DisplaySettings />; // 화면 반환
} // 함수 종료
