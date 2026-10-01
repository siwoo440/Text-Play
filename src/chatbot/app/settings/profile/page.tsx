import type { Metadata } from "next"; // 메타데이터 타입
import { ProfileSettings } from "@chatbot/features/settings/ProfileSettings"; // 프로필 관리 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "프로필 관리 | Mate Verse", // 페이지 제목
    description: "닉네임과 프로필 글자, 멤버십 정보를 관리하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function ProfileSettingsPage() // 프로필 관리 페이지
{ // 함수 시작
    return <ProfileSettings />; // 화면 반환
} // 함수 종료
