import { StoryDetail } from "@chatbot/features/story/StoryDetail"; // 스토리 상세

interface StoryPageProps // 스토리 상세 페이지 속성
{ // 구조 시작
    params: Promise<{ id: string }>; // 스토리 식별자
} // 구조 종료

export default async function StoryPage({ params }: StoryPageProps) // 스토리 상세 페이지
{ // 함수 시작
    const { id } = await params; // 스토리 식별자
    return <StoryDetail storyId={id} />; // 상세 반환
} // 함수 종료
