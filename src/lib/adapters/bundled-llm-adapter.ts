import type { BundledRuntimeClient } from "@/lib/adapters/bundled-runtime-client"; // 내장 AI 통신 계약
import { createCharacterMessages, createSummaryMessages } from "@/lib/adapters/chat-messages"; // 대화 메시지 생성기
import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // 대화 계약
import { createStructuredMessages } from "@/lib/adapters/structured-messages"; // 구조화 메시지 생성기

const STRUCTURED_MAX_TOKENS = 640; // 구조화 응답 최대 길이
const REPLY_MAX_TOKENS = 512; // 캐릭터 대화 최대 길이
const SUMMARY_MAX_TOKENS = 256; // 요약 최대 길이

export class BundledLLMAdapter implements LLMAdapter // 내장 AI 대화 어댑터
{ // 클래스 시작
    public constructor(private readonly client: BundledRuntimeClient) // 생성자
    { // 생성자 시작
    } // 생성자 종료

    public streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 캐릭터 대화 스트림
    { // 함수 시작
        return this.client.streamChat({ messages: createCharacterMessages(input), responseSchema: null, maxTokens: REPLY_MAX_TOKENS }, signal); // 형식 강제 없는 스트림 반환
    } // 함수 종료

    public streamStructuredReply(input: StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string> // 구조화 응답 스트림
    { // 함수 시작
        return this.client.streamChat({ messages: createStructuredMessages(input), responseSchema: input.jsonSchema ?? null, maxTokens: STRUCTURED_MAX_TOKENS }, signal); // JSON 스키마 강제 스트림 반환
    } // 함수 종료

    public async summarizeConversation(input: SummaryInput, signal?: AbortSignal): Promise<string> // 대화 요약
    { // 함수 시작
        let summary = ""; // 요약 누적값
        for await (const chunk of this.client.streamChat({ messages: createSummaryMessages(input), responseSchema: null, maxTokens: SUMMARY_MAX_TOKENS }, signal)) // 요약 조각 순회
        { // 반복 시작
            summary += chunk; // 조각 누적
        } // 반복 종료
        return summary.trim().slice(0, 160); // 길이 제한 요약 반환
    } // 함수 종료
} // 클래스 종료
