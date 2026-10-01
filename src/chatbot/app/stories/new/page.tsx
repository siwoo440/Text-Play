import type { Metadata } from "next"; // 메타데이터 타입
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // 스토리 편집기

export const metadata: Metadata = { title: "새 스토리 만들기 | Mate Verse" }; // 페이지 제목

interface NewStoryPageProps // 페이지 속성
{ // 구조 시작
    searchParams: Promise<{ image?: string }>; // 이미지 스튜디오에서 넘어온 이미지
} // 구조 종료

export default async function NewStoryPage({ searchParams }: NewStoryPageProps) // 스토리 제작 페이지
{ // 함수 시작
    const { image } = await searchParams; // 넘어온 이미지 식별자
    return <StoryEditor key={image ?? "new"} initialImageId={image} />; // 제작 화면 반환
} // 함수 종료
