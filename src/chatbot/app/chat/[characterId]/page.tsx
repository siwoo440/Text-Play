import type { Metadata } from "next"; // 메타데이터 타입
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면

export const metadata: Metadata = { title: "대화 | Mate Verse" }; // 페이지 제목(작품 이름은 화면에서 다시 맞춤)

interface ChatPageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ characterId: string }>; // 동적 경로
    searchParams: Promise<{ conversation?: string; version?: string; message?: string }>; // 검색 매개변수(message는 바로 갈 답변)
} // 구조 종료

export default async function ChatPage({ params, searchParams }: ChatPageProps) // 채팅 페이지
{ // 함수 시작
    const { characterId } = await params; // 캐릭터 식별자
    const query = await searchParams; // 검색 매개변수 조회
    return <ChatScreen key={`${query.conversation ?? "new"}:${query.version ?? "current"}`} characterId={characterId} initialConversationId={query.conversation} initialVersionId={query.version} initialMessageId={query.message} />; // 채팅 화면 반환
} // 함수 종료
