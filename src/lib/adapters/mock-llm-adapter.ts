import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // 대화 계약

interface MockLLMOptions // Mock 설정
{ // 구조 시작
    delayMs?: number; // 조각 지연
    seed?: number; // 결정 시드
} // 구조 종료

const responses = [ // 응답 목록
    "네 이야기를 더 듣고 싶어. 천천히 이어서 말해 줘.", // 공감 응답
    "그 마음을 기억해 둘게. 지금 이 장면도 함께 남겨 보자.", // 기록 응답
    "네가 와서 분위기가 달라졌어. 다음 선택은 네가 정해 줘.", // 관계 응답
]; // 목록 종료

const structuredNarrations = [ // 구조화 서술 목록
    "달빛이 문양을 따라 번지며 숨겨진 글자를 드러낸다.", // 첫 서술
    "낡은 기록 사이에서 리라의 목소리가 또렷하게 들린다.", // 둘째 서술
]; // 목록 종료

const englishNarrations = [ // 영어 구조화 서술 목록
    "Moonlight spreads along the pattern, revealing hidden letters.", // 첫 서술
    "Among the old records, Lyra's voice rings out clearly.", // 둘째 서술
]; // 목록 종료

function hash(value: string): number // 문자열 해시
{ // 함수 시작
    return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0); // 해시 반환
} // 함수 종료

export class MockLLMAdapter implements LLMAdapter // Mock 대화 어댑터
{ // 클래스 시작
    private readonly delayMs: number; // 조각 지연
    private readonly seed: number; // 결정 시드

    public constructor(options: MockLLMOptions = {}) // 생성자
    { // 생성자 시작
        this.delayMs = options.delayMs ?? 12; // 지연 설정
        this.seed = options.seed ?? 1; // 시드 설정
    } // 생성자 종료

    public async *streamReply(input: LLMInput): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        const lastMessage = input.messages.at(-1)?.content.trim().toLowerCase() ?? ""; // 최근 입력
        const key = `${input.character.id}|${input.conversation.emotion}|${input.conversation.relationshipStage}|${lastMessage}|${this.seed}`; // 결정 키
        const response = responses[hash(key) % responses.length]; // 응답 선택
        const words = response.split(" "); // 단어 분리
        for (const [index, word] of words.entries()) // 단어 순회
        { // 순회 시작
            if (this.delayMs > 0) // 지연 판정
            { // 조건 시작
                await new Promise((resolve) => setTimeout(resolve, this.delayMs)); // 조각 지연
            } // 조건 종료
            yield index === words.length - 1 ? word : `${word} `; // 단어 반환
        } // 순회 종료
    } // 함수 종료

    public async *streamStructuredReply(input: StructuredLLMInput): AsyncIterable<string> // 구조화 응답 스트림
    { // 함수 시작
        const key = `${input.system}|${input.context}|${input.userInput}|${input.responseSchema}|${this.seed}`; // 결정 키
        const english = input.language === "en"; // 영어 답변 여부
        const narrations = english ? englishNarrations : structuredNarrations; // 언어별 서술 목록
        const response = JSON.stringify({ narration: narrations[hash(key) % narrations.length], dialogue: { speaker: "lyra", content: english ? "I will remember that choice." : "그 선택을 기억할게." }, proposedActions: [{ type: "change-relation", characterId: "lyra", amount: 1 }] }); // 구조화 응답 생성
        const words = response.split(" "); // 단어 분리
        for (const [index, word] of words.entries()) // 단어 순회
        { // 순회 시작
            if (this.delayMs > 0) // 지연 판정
            { // 조건 시작
                await new Promise((resolve) => setTimeout(resolve, this.delayMs)); // 조각 지연
            } // 조건 종료
            yield index === words.length - 1 ? word : `${word} `; // 단어 반환
        } // 순회 종료
    } // 함수 종료

    public async summarizeConversation(input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        const recent = input.messages.slice(-3).map((message) => message.content).join(" "); // 최근 내용
        return `${input.conversation.title}: ${recent}`.slice(0, 160); // 요약 반환
    } // 함수 종료
} // 클래스 종료
