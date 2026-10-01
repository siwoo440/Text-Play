import type { LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약

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

function hash(value: string): number // 문자열 해시
{ // 함수 시작
    return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0); // 해시 반환
} // 함수 종료

function createAbortError(): DOMException // 중단 오류 생성
{ // 함수 시작
    return new DOMException("응답이 중단되었습니다.", "AbortError"); // 중단 오류 반환
} // 함수 종료

async function waitForChunk(delayMs: number, signal?: AbortSignal): Promise<void> // 응답 조각 대기
{ // 함수 시작
    if (signal?.aborted) // 사전 중단 판정
    { // 조건 시작
        throw createAbortError(); // 중단 오류 발생
    } // 조건 종료
    await new Promise<void>((resolve, reject) => // 중단 가능 대기
    { // 약속 시작
        const finish = () => // 정상 완료 처리
        { // 처리 시작
            signal?.removeEventListener("abort", cancel); // 중단 감지 해제
            resolve(); // 대기 완료
        }; // 처리 종료
        const timeout = setTimeout(finish, delayMs); // 완료 예약
        const cancel = () => // 중단 처리
        { // 처리 시작
            clearTimeout(timeout); // 완료 예약 해제
            reject(createAbortError()); // 중단 오류 반환
        }; // 처리 종료
        signal?.addEventListener("abort", cancel, { once: true }); // 중단 감지 등록
    }); // 약속 종료
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

    public async *streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        const lastMessage = input.messages.at(-1)?.content.trim().toLowerCase() ?? ""; // 최근 입력
        const key = `${input.character.id}|${input.version.emotion}|${input.version.relationshipStage}|${lastMessage}|${this.seed}`; // 결정 키
        const response = responses[hash(key) % responses.length]; // 응답 선택
        const words = response.split(" "); // 단어 분리
        for (const [index, word] of words.entries()) // 단어 순회
        { // 순회 시작
            if (this.delayMs > 0) // 지연 판정
            { // 조건 시작
                await waitForChunk(this.delayMs, signal); // 중단 가능 조각 지연
            } // 조건 종료
            if (signal?.aborted) // 중단 판정
            { // 조건 시작
                throw createAbortError(); // 중단 오류 발생
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
