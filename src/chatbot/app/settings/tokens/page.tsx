import type { Metadata } from "next"; // 메타데이터 타입
import { TokenSettings } from "@chatbot/features/settings/TokenSettings"; // 토큰 이용 내역 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "토큰 이용 내역 | Mate Verse", // 페이지 제목
    description: "토큰 잔액과 사용량, 항목별 비용을 확인하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function TokenSettingsPage() // 토큰 이용 내역 페이지
{ // 함수 시작
    return <TokenSettings />; // 화면 반환
} // 함수 종료
