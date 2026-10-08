import { describe, expect, it } from "vitest"; // 테스트 도구
import { buildChatContext } from "@chatbot/features/chat/chat-context"; // 대화 맥락
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, ExampleDialogue, LoreEntry } from "@chatbot/features/core/types"; // 상태 타입
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 시작
import type { LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화

const forbidden: LoreEntry = { id: "lore-forbidden", title: "금서 구역", keywords: ["금서"], content: "사서만 들어갈 수 있다." }; // 금서 설정
const key: LoreEntry = { id: "lore-key", title: "은빛 열쇠", keywords: ["열쇠", "Key"], content: "금서 구역의 문을 여는 열쇠다." }; // 열쇠 설정
const example: ExampleDialogue = { id: "example-1", user: "오늘 뭐 해?", reply: "책을 정리하고 있었어." }; // 예시 대화

class RecordingLLM implements LLMAdapter // 넘어온 입력을 기록하는 어댑터
{ // 클래스 시작
    public readonly inputs: LLMInput[] = []; // 받은 입력
    private readonly inner = new MockLLMAdapter({ delayMs: 0, seed: 7 }); // 실제 응답은 Mock

    public streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        this.inputs.push(structuredClone(input)); // 입력 기록
        return this.inner.streamReply(input, signal); // Mock 응답
    } // 함수 종료

    public summarizeConversation(input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        return this.inner.summarizeConversation(input); // Mock 요약
    } // 함수 종료
} // 클래스 종료

function withRianLore(lorebook: LoreEntry[], examples: ExampleDialogue[] = []): AppState // 리안에게 설정집과 예시 대화 넣기
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    return { ...state, characters: state.characters.map((character) => character.id === "rian" ? { ...character, lorebook, examples } : character) }; // 바꾼 상태
} // 함수 종료

function makeController(state: AppState, llm: LLMAdapter, conversationId = "conversation-rian"): ChatController // 제어기 만들기
{ // 함수 시작
    return new ChatController({ state, conversationId, llm, images: new MockImageAdapter() }); // 제어기 반환
} // 함수 종료

const lastReply = (controller: ChatController) => controller.getMessages().filter((message) => message.role === "assistant").at(-1)!.content; // 마지막 응답
const loreTitles = (llm: RecordingLLM) => llm.inputs.at(-1)!.options!.lore.map((entry) => entry.title); // 마지막 입력에 넘어간 설정

describe("대화 중 설정집과 예시 대화", () => // 흐름 묶음
{ // 묶음 시작
    it("대화 맥락은 작품의 설정집과 예시 대화를 담고, 없는 작품은 빈 목록이다", () => // 맥락 검증
    { // 검증 시작
        const context = buildChatContext(withRianLore([forbidden], [example]), "conversation-rian"); // 리안 대화 맥락
        expect(context.lorebook).toEqual([forbidden]); // 설정집
        expect(context.examples).toEqual([example]); // 예시 대화
        const plain = buildChatContext(createInitialState(), "conversation-rian"); // 기본 리안
        expect(plain.lorebook).toEqual([]); // 빈 설정집
        expect(plain.examples).toEqual([]); // 빈 예시
    }); // 검증 종료

    it("키워드가 나온 설정만 AI에게 넘기고 예시 대화는 매번 넘긴다", async () => // 넘김 검증
    { // 검증 시작
        const llm = new RecordingLLM(); // 기록 어댑터
        const controller = makeController(withRianLore([forbidden, key], [example]), llm); // 제어기
        await controller.sendMessage("안녕"); // 키워드 없음
        expect(llm.inputs.at(-1)!.options!.lore).toEqual([]); // 넘긴 설정 없음
        expect(llm.inputs.at(-1)!.options!.examples).toEqual([{ user: "오늘 뭐 해?", reply: "책을 정리하고 있었어." }]); // 예시는 넘김
        expect(lastReply(controller)).not.toContain("이야기가 떠오른다"); // 답에도 드러나지 않음
        await controller.sendMessage("KEY는 어디 있어?"); // 열쇠 키워드(대소문자 무시)
        expect(llm.inputs.at(-1)!.options!.lore).toEqual([{ title: "은빛 열쇠", keywords: ["열쇠", "Key"], content: "금서 구역의 문을 여는 열쇠다." }]); // 열쇠 설정만
        expect(lastReply(controller)).toContain("‘은빛 열쇠’ 이야기가 떠오른다."); // Mock 답에 드러남
        expect(llm.inputs.at(-1)!.options!.examples).toHaveLength(1); // 예시는 계속 넘김
    }); // 검증 종료

    it("최근 대화에서 벗어난 설정은 다시 넘기지 않고, 답에 같은 문장을 되풀이하지 않는다", async () => // 범위 검증
    { // 검증 시작
        const llm = new RecordingLLM(); // 기록 어댑터
        const controller = makeController(withRianLore([forbidden, key]), llm); // 제어기
        await controller.sendMessage("금서가 궁금해"); // 금서 언급
        expect(loreTitles(llm)).toEqual(["금서 구역"]); // 금서 설정
        expect(lastReply(controller)).toContain("‘금서 구역’ 이야기가 떠오른다."); // 답에 드러남
        await controller.sendMessage("그렇구나"); // 다른 말(최근 대화 안에 아직 금서가 있음)
        expect(loreTitles(llm)).toEqual(["금서 구역"]); // 계속 넘김
        expect(lastReply(controller)).not.toContain("이야기가 떠오른다"); // 방금 한 말에 키워드가 없어 되풀이하지 않음
        await controller.sendMessage("오늘 날씨 좋다"); // 또 다른 말
        await controller.sendMessage("산책 갈까"); // 금서가 최근 대화에서 벗어남
        expect(loreTitles(llm)).toEqual([]); // 넘기지 않음
    }); // 검증 종료

    it("예시 대화와 같은 말을 하면 Mock은 예시 답으로 답한다", async () => // 예시 검증
    { // 검증 시작
        const controller = makeController(withRianLore([], [example]), new MockLLMAdapter({ delayMs: 0, seed: 7 })); // 제어기
        await controller.sendMessage("오늘 뭐 해?"); // 예시와 같은 말
        expect(lastReply(controller)).toBe("책을 정리하고 있었어."); // 예시 답
    }); // 검증 종료

    it("스토리 모드는 스토리의 설정집을 쓰고 내레이션 줄로 드러낸다", async () => // 스토리 검증
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        const story = base.stories[0]; // 첫 스토리
        const started = createStoryConversation({ ...base, stories: base.stories.map((item) => item.id === story.id ? { ...item, lorebook: [forbidden] } : item), characters: base.characters.map((character) => ({ ...character, lorebook: [key] })) }, story.id, "2026-10-03T12:00:00.000Z"); // 스토리 대화(등장 캐릭터에는 다른 설정)
        const llm = new RecordingLLM(); // 기록 어댑터
        const controller = makeController(started.state, llm, started.conversation.id); // 제어기
        await controller.sendMessage("금서와 열쇠를 찾자"); // 두 키워드
        expect(loreTitles(llm)).toEqual(["금서 구역"]); // 스토리의 설정집만
        expect(lastReply(controller).split("\n").at(-1)).toBe("[내레이션] ‘금서 구역’ 이야기가 떠오른다."); // 내레이션 줄
    }); // 검증 종료
}); // 묶음 종료
