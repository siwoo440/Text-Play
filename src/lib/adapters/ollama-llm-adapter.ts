import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // 대화 계약
import type { OllamaChatMessage, OllamaChatRequest, OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 계약

function createCharacterSystem(input: LLMInput): string // 캐릭터 규칙 생성기
{ // 함수 시작
    return [ // 규칙 목록 반환
        `캐릭터: ${input.character.name}`, // 캐릭터 이름
        `성격: ${input.character.personality}`, // 캐릭터 성격
        `세계관: ${input.character.worldSetting}`, // 세계관
        `대화 규칙: ${input.character.prompt}`, // 제작자 규칙
        `현재 감정: ${input.conversation.emotion}`, // 현재 감정
        `관계 단계: ${input.conversation.relationshipStage}`, // 관계 단계
    ].join("\n"); // 규칙 결합
} // 함수 종료

function mapMessages(input: LLMInput): OllamaChatMessage[] // 일반 메시지 변환기
{ // 함수 시작
    return [{ role: "system", content: createCharacterSystem(input) }, ...input.messages.map((message) => ({ role: message.role, content: message.content }))]; // 메시지 목록 반환
} // 함수 종료

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
        return this.stream({ messages: mapMessages(input) }, signal); // 일반 스트림 반환
    } // 함수 종료

    public streamStructuredReply(input: StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string> // 구조화 응답 스트림
    { // 함수 시작
        const messages: OllamaChatMessage[] = [ // 구조화 메시지 목록
            { role: "system", content: `${input.system}\n\n응답 형식:\n${input.responseSchema}` }, // 시스템 규칙
            { role: "user", content: `${input.context}\n\n사용자 행동:\n${input.userInput}` }, // 사용자 입력
        ]; // 메시지 목록 종료
        return this.stream({ messages, format: "json" }, signal); // JSON 스트림 반환
    } // 함수 종료

    public async summarizeConversation(input: SummaryInput, signal?: AbortSignal): Promise<string> // 대화 요약
    { // 함수 시작
        const messages: OllamaChatMessage[] = [ // 요약 메시지 목록
            { role: "system", content: "대화의 핵심 사건과 관계 변화를 한국어 160자 이내로 요약하세요." }, // 요약 규칙
            { role: "user", content: input.messages.map((message) => `${message.role}: ${message.content}`).join("\n") }, // 요약 대상
        ]; // 메시지 목록 종료
        let summary = ""; // 요약 누적값
        for await (const chunk of this.stream({ messages }, signal)) // 요약 조각 순회
        { // 반복 시작
            summary += chunk; // 요약 조각 누적
        } // 반복 종료
        return summary.trim().slice(0, 160); // 길이 제한 요약 반환
    } // 함수 종료
} // 클래스 종료
