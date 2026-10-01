import type { Metadata } from "next"; // 메타데이터 타입
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // 스토리 편집기

export const metadata: Metadata = { title: "새 스토리 만들기 | Mate Verse" }; // 페이지 제목

export default function NewStoryPage() // 스토리 제작 페이지
{ // 함수 시작
    return <StoryEditor />; // 제작 화면 반환
} // 함수 종료
