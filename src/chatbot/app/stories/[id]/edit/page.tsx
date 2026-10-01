import type { Metadata } from "next"; // 메타데이터 타입
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // 스토리 편집기

export const metadata: Metadata = { title: "스토리 수정 | Mate Verse" }; // 페이지 제목

interface EditStoryPageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ id: string }>; // 동적 경로
} // 구조 종료

export default async function EditStoryPage({ params }: EditStoryPageProps) // 스토리 수정 페이지
{ // 함수 시작
    const { id } = await params; // 스토리 식별자
    return <StoryEditor key={id} storyId={id} />; // 수정 화면 반환
} // 함수 종료
