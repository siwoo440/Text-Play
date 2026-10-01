import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면

interface ChatPageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ characterId: string }>; // 동적 경로
    searchParams: Promise<{ conversation?: string; version?: string }>; // 검색 매개변수
} // 구조 종료

export default async function ChatPage({ params, searchParams }: ChatPageProps) // 채팅 페이지
{ // 함수 시작
    const { characterId } = await params; // 캐릭터 식별자
    const query = await searchParams; // 검색 매개변수 조회
    return <ChatScreen key={`${query.conversation ?? "new"}:${query.version ?? "current"}`} characterId={characterId} initialConversationId={query.conversation} initialVersionId={query.version} />; // 채팅 화면 반환
} // 함수 종료
