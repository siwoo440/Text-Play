import { ChatScreen } from "@/features/chat/ChatScreen"; // 채팅 화면

interface ChatPageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ characterId: string }>; // 동적 경로
} // 구조 종료

export default async function ChatPage({ params }: ChatPageProps) // 채팅 페이지
{ // 함수 시작
    const { characterId } = await params; // 캐릭터 식별자
    return <ChatScreen characterId={characterId} />; // 채팅 화면 반환
} // 함수 종료
