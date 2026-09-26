import type { Conversation, Message } from "@/features/core/types"; // 대화 타입

export interface ConversationExport // 대화 내보내기 구조
{ // 구조 시작
    schemaVersion: 1; // 내보내기 버전
    conversation: Conversation; // 대상 대화
    messages: Message[]; // 연결 메시지
} // 구조 종료

export function createConversationExport(conversation: Conversation, messages: Message[]): ConversationExport // 대화 내보내기 함수
{ // 함수 시작
    return { schemaVersion: 1, conversation: structuredClone(conversation), messages: structuredClone(messages.filter((message) => message.conversationId === conversation.id)) }; // 내보내기 반환
} // 함수 종료
