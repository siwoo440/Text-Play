import type { Metadata } from "next"; // 메타데이터 타입
import { PrivacySettings } from "@chatbot/features/settings/PrivacySettings"; // 개인정보 및 보안 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "개인정보 및 보안 | Mate Verse", // 페이지 제목
    description: "데이터 저장 위치를 확인하고 내보내기·백업·복구·초기화를 하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function PrivacySettingsPage() // 개인정보 및 보안 페이지
{ // 함수 시작
    return <PrivacySettings />; // 화면 반환
} // 함수 종료
