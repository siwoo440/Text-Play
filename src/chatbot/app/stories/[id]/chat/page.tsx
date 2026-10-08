import type { Metadata } from "next"; // 메타데이터 타입
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면

export const metadata: Metadata = { title: "스토리 대화 | Mate Verse" }; // 페이지 제목(작품 이름은 화면에서 다시 맞춤)

interface StoryChatPageProps // 스토리 대화 페이지 속성
{ // 구조 시작
    params: Promise<{ id: string }>; // 스토리 식별자
    searchParams: Promise<{ conversation?: string; version?: string; message?: string }>; // 검색 매개변수(message는 바로 갈 답변)
} // 구조 종료

export default async function StoryChatPage({ params, searchParams }: StoryChatPageProps) // 스토리 대화 페이지
{ // 함수 시작
    const { id } = await params; // 스토리 식별자
    const query = await searchParams; // 검색 매개변수 조회
    return <ChatScreen key={`${query.conversation ?? "new"}:${query.version ?? "current"}`} storyId={id} initialConversationId={query.conversation} initialVersionId={query.version} initialMessageId={query.message} />; // 스토리 대화 화면 반환
} // 함수 종료
