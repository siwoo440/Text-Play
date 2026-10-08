import { findExampleReply } from "@chatbot/features/chat/lore-model"; // 예시 대화 찾기
import { judgeStatsMock, type StatChange, type StatJudgeInput } from "@chatbot/features/chat/stat-model"; // Mock 스탯 판단
import type { WritingStyle } from "@chatbot/features/core/types"; // 문체 타입
import type { ChatReplyOptions, LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { translateTo } from "@chatbot/lib/i18n"; // 답변 언어로 바꾸기
import { composeStoryReply } from "@chatbot/lib/story/mock-story-writer"; // Mock 스토리 응답

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

const styleDecorations: Record<WritingStyle, { prefix?: string; suffix?: string }> = // 문체별 장식(기본은 그대로)
{ // 장식 시작
    default: {}, // 기본
    romance: { prefix: "*시선이 잠시 네게 머문다.*" }, // 로맨스
    hardboiled: { prefix: "*짧게 숨을 고른다.*" }, // 하드보일드
    comic: { suffix: "…아, 방금 그건 못 들은 걸로 해 줘!" }, // 코믹
    literary: { prefix: "*창밖의 빛이 천천히 기울었다.*" }, // 문학적
}; // 장식 종료
const extraLines = ["잠깐 말을 고르듯 창밖을 본다.", "그러고는 조금 더 가까이 다가와 목소리를 낮춘다.", "작게 웃으며 네 대답을 기다린다."]; // 긴 답변 추가 문장
const extraNarrations = ["[내레이션] 잠시 정적이 흐른다.", "[내레이션] 멀리서 작은 소리가 들려온다.", "[내레이션] 모두의 시선이 한곳에 모인다."]; // 스토리 추가 내레이션
const extraCount: Record<number, number> = { 1: 0, 1.5: 1, 3: 2, 5: 3 }; // 길이 배수별 추가 문장 수

export function decorateReply(base: string, options: ChatReplyOptions | undefined, key: number, story: boolean, lastMessage = ""): string // 대화방 설정에 맞춰 Mock 응답 다듬기
{ // 함수 시작
    if (options === undefined) // 설정 없음 판정
    { // 조건 시작
        return base; // 그대로
    } // 조건 종료
    const count = extraCount[options.length] ?? 0; // 추가 문장 수
    const say = (text: string) => translateTo(options.language ?? "ko", text); // 답변 언어로 바꾸기
    const heard = lastMessage.toLowerCase(); // 방금 들은 말
    const mentioned = options.lore.find((entry) => entry.keywords.some((keyword) => heard.includes(keyword.toLowerCase()))); // 방금 한 말에 키워드가 나온 설정(이어지는 턴에는 되풀이하지 않음)
    const loreLine = mentioned === undefined ? undefined : say("‘{0}’ 이야기가 떠오른다.").replace("{0}", mentioned.title); // 그 설정을 답에 드러냄
    if (story) // 스토리 응답 판정
    { // 조건 시작
        return [base, ...extraNarrations.slice(0, count).map(say), ...(loreLine === undefined ? [] : [`[내레이션] ${loreLine}`])].join("\n"); // 내레이션 줄 추가
    } // 조건 종료
    const decoration = styleDecorations[options.writingStyle]; // 문체 장식
    const persona = options.persona !== null && options.persona.name.trim().length > 0 && key % 3 === 0 ? `${options.persona.name}, ` : ""; // 가끔 이름 부르기
    const parts = [decoration.prefix === undefined ? undefined : say(decoration.prefix), `${persona}${base}`, ...extraLines.slice(0, count).map(say), loreLine === undefined ? undefined : `*${loreLine}*`, decoration.suffix === undefined ? undefined : say(decoration.suffix), !options.preventImpersonation && key % 2 === 0 ? say("*당신은 잠시 망설이다 고개를 끄덕인다.*") : undefined].filter((part): part is string => part !== undefined); // 문장 묶음(답변 언어로)
    return parts.join(" "); // 응답 반환
} // 함수 종료

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
        const example = findExampleReply(input.options?.examples ?? [], lastMessage); // 예시 대화와 같은 말이면 예시 답
        const language = input.options?.language ?? "ko"; // 답변 언어
        const base = example ?? (input.story === undefined ? translateTo(language, responses[hash(key) % responses.length]) : composeStoryReply({ story: input.story, messages: input.messages, seed: this.seed, language })); // 응답 선택(스토리는 여러 인물 형식, 답변 언어로)
        const response = decorateReply(base, input.options, hash(`${key}|style`), input.story !== undefined, lastMessage); // 대화방 설정 반영
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

    public async judgeStats(input: StatJudgeInput): Promise<StatChange[]> // 스탯 변화 판단(Mock: 대화 분위기와 스탯 이름으로 결정)
    { // 함수 시작
        return Promise.resolve(judgeStatsMock(input)); // 판단 반환
    } // 함수 종료
} // 클래스 종료
