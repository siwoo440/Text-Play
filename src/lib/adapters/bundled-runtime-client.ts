import type { ChatMessage } from "@/lib/adapters/chat-messages"; // 대화 메시지 계약

export interface BundledChatRequest // 내장 AI 대화 요청
{ // 구조 시작
    messages: ChatMessage[]; // 대화 메시지
    responseSchema: Record<string, unknown> | null; // 응답 형식 강제 JSON 스키마
    maxTokens: number; // 최대 생성 길이
} // 구조 종료

export interface BundledRuntimeClient // 내장 AI 실행 엔진 통신 계약
{ // 구조 시작
    streamChat(request: BundledChatRequest, signal?: AbortSignal): AsyncIterable<string>; // 대화 스트림
} // 구조 종료
