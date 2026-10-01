import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면

interface StoryChatPageProps // 스토리 대화 페이지 속성
{ // 구조 시작
    params: Promise<{ id: string }>; // 스토리 식별자
    searchParams: Promise<{ conversation?: string; version?: string }>; // 검색 매개변수
} // 구조 종료

export default async function StoryChatPage({ params, searchParams }: StoryChatPageProps) // 스토리 대화 페이지
{ // 함수 시작
    const { id } = await params; // 스토리 식별자
    const query = await searchParams; // 검색 매개변수 조회
    return <ChatScreen key={`${query.conversation ?? "new"}:${query.version ?? "current"}`} storyId={id} initialConversationId={query.conversation} initialVersionId={query.version} />; // 스토리 대화 화면 반환
} // 함수 종료
