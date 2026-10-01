import type { Metadata } from "next"; // 메타데이터 타입
import { NotificationSettings } from "@chatbot/features/settings/NotificationSettings"; // 알림과 선제 메시지 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "알림과 선제 메시지 | Mate Verse", // 페이지 제목
    description: "선제 메시지 허용과 알림 시간, 하루 횟수를 정하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function NotificationSettingsPage() // 알림과 선제 메시지 페이지
{ // 함수 시작
    return <NotificationSettings />; // 화면 반환
} // 함수 종료
