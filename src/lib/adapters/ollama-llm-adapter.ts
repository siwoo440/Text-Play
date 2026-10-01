import { createCharacterMessages, createSummaryMessages } from "@/lib/adapters/chat-messages"; // 대화 메시지 생성기
import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // 대화 계약
import type { OllamaChatRequest, OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 계약
import { createStructuredMessages } from "@/lib/adapters/structured-messages"; // 구조화 메시지 생성기

export class OllamaLLMAdapter implements LLMAdapter // 올라마 대화 어댑터
{ // 클래스 시작
    public constructor(private readonly model: string, private readonly client: OllamaClient) // 생성자
    { // 생성자 시작
    } // 생성자 종료

    private stream(request: Omit<OllamaChatRequest, "model">, signal?: AbortSignal): AsyncIterable<string> // 공통 스트림 생성기
    { // 함수 시작
        return this.client.streamChat({ ...request, model: this.model }, signal); // 모델 포함 스트림 반환
    } // 함수 종료

    public streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 일반 응답 스트림
    { // 함수 시작
        return this.stream({ messages: createCharacterMessages(input) }, signal); // 일반 스트림 반환
    } // 함수 종료

    public streamStructuredReply(input: StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string> // 구조화 응답 스트림
    { // 함수 시작
        return this.stream({ messages: createStructuredMessages(input), format: "json" }, signal); // JSON 스트림 반환
    } // 함수 종료

    public async summarizeConversation(input: SummaryInput, signal?: AbortSignal): Promise<string> // 대화 요약
    { // 함수 시작
        let summary = ""; // 요약 누적값
        for await (const chunk of this.stream({ messages: createSummaryMessages(input) }, signal)) // 요약 조각 순회
        { // 반복 시작
            summary += chunk; // 요약 조각 누적
        } // 반복 종료
        return summary.trim().slice(0, 160); // 길이 제한 요약 반환
    } // 함수 종료
} // 클래스 종료
