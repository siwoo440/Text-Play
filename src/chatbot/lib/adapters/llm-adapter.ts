import type { Character, Conversation, ConversationVersion, Message } from "@chatbot/features/core/types"; // 도메인 타입
import type { StoryPromptContext } from "@chatbot/lib/story/mock-story-writer"; // 스토리 문맥

export interface LLMInput // 대화 입력
{ // 구조 시작
    character: Character; // 캐릭터(스토리 모드는 첫 등장인물)
    conversation: Conversation; // 대화방
    version: ConversationVersion; // 대화 버전
    messages: Message[]; // 최근 메시지
    story?: StoryPromptContext; // 스토리 모드 문맥([이름] 대사 형식으로 답함)
} // 구조 종료

export interface SummaryInput // 요약 입력
{ // 구조 시작
    conversation: Conversation; // 대화방
    version: ConversationVersion; // 대화 버전
    messages: Message[]; // 요약 메시지
} // 구조 종료

export interface LLMAdapter // 대화 어댑터
{ // 구조 시작
    streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string>; // 중단 가능 응답 스트림
    summarizeConversation(input: SummaryInput): Promise<string>; // 대화 요약
} // 구조 종료
