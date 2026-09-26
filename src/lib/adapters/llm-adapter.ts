import type { Character, Conversation, Message } from "@/features/core/types"; // 도메인 타입

export interface LLMInput // 대화 입력
{ // 구조 시작
    character: Character; // 캐릭터
    conversation: Conversation; // 대화방
    messages: Message[]; // 최근 메시지
} // 구조 종료

export interface SummaryInput // 요약 입력
{ // 구조 시작
    conversation: Conversation; // 대화방
    messages: Message[]; // 요약 메시지
} // 구조 종료

export interface StructuredLLMInput // 구조화 입력
{ // 구조 시작
    system: string; // 시스템 규칙
    context: string; // 현재 문맥
    userInput: string; // 사용자 입력
    responseSchema: string; // 응답 스키마 설명
} // 구조 종료

export interface LLMAdapter // 대화 어댑터
{ // 구조 시작
    streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string>; // 응답 스트림
    streamStructuredReply(input: StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string>; // 구조화 응답 스트림
    summarizeConversation(input: SummaryInput, signal?: AbortSignal): Promise<string>; // 대화 요약
} // 구조 종료
