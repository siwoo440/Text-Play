import type { Metadata } from "next"; // 메타데이터 타입
import { StoryHome } from "@chatbot/features/story/StoryHome"; // 스토리 모드 홈

export const metadata: Metadata = // 페이지 정보
{ // 정보 시작
    title: "스토리 모드 | Mate Verse", // 페이지 제목
    description: "여러 인물 또는 한 명과 함께 하나의 상황극을 이어 가는 스토리 모드", // 페이지 설명
}; // 정보 종료

export default function StoriesPage() // 스토리 모드 페이지
{ // 함수 시작
    return <StoryHome />; // 스토리 홈 반환
} // 함수 종료
