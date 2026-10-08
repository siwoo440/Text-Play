import { describe, expect, it } from "vitest"; // 테스트 도구
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { createAffectionStat } from "@chatbot/features/chat/stat-model"; // 기본 호감도
import { getConversationVersion } from "@chatbot/features/conversation/conversation-versioning"; // 버전 조회
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, StoryEvent } from "@chatbot/features/core/types"; // 상태 타입
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 시작
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화

const sceneEvent: StoryEvent = { id: "e-scene", name: "달빛 기록관", condition: "turn", statId: null, value: 3, narration: "달빛이 서가 사이로 쏟아진다.", scene: "/images/scenes/moon-library.webp", title: "", ending: false, notify: true }; // 3턴에 특별 장면(리안 대화는 이미 1턴이 지나 있어 두 번째로 보내는 메시지가 3턴)

function makeController(state: AppState = createInitialState(), conversationId = "conversation-rian"): ChatController // 제어기 만들기(리안 대화: 호감도 34에서 시작)
{ // 함수 시작
    return new ChatController({ state, conversationId, llm: new MockLLMAdapter({ delayMs: 0, seed: 7 }), images: new MockImageAdapter() }); // 제어기 반환
} // 함수 종료

function withRianEvents(events: StoryEvent[], perTurn = 0): AppState // 리안의 이벤트와 호감도 규칙 바꾸기
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    return { ...state, characters: state.characters.map((character) => character.id === "rian" ? { ...character, events, statusTemplate: { ...character.statusTemplate, stats: [{ ...createAffectionStat(), mode: "rule" as const, perTurn, rules: [] }] } } : character) }; // 바꾼 상태
} // 함수 종료

const lastReply = (controller: ChatController) => controller.getMessages().filter((message) => message.role === "assistant").at(-1)!; // 마지막 응답
const eventIds = (controller: ChatController) => (lastReply(controller).status?.events ?? []).map((item) => item.eventId); // 마지막 응답의 이벤트

describe("대화 중 이벤트", () => // 흐름 묶음
{ // 묶음 시작
    it("기본 작품은 조건이 처음 맞는 턴에 예시 이벤트가 한 번 일어나 그 응답의 상태창에 남는다", async () => // 기본 이벤트
    { // 검증 시작
        const controller = makeController(); // 리안(호감도 34, 예시 이벤트: 20 이상이면 한 걸음 가까이)
        await controller.sendMessage("안녕"); // 1턴
        expect(lastReply(controller).status?.events).toEqual([expect.objectContaining({ eventId: "event-closer", name: "한 걸음 가까이", target: "리안", narration: "리안의 말투가 눈에 띄게 부드러워졌다.", title: "말벗", ending: false })]); // 한 걸음 가까이
        expect(lastReply(controller).sceneEvent).toBe("event-closer"); // 이 턴의 이벤트 기록
        await controller.sendMessage("오늘은 뭐 읽어?"); // 2턴
        expect(lastReply(controller).status?.events).toBeUndefined(); // 다시 일어나지 않음
    }); // 검증 종료

    it("3턴이 지나도 자동 장면 그림을 만들지 않고 대화 비용만 쓴다", async () => // 자동 장면 제거
    { // 검증 시작
        const state = withRianEvents([]); // 이벤트 없는 리안
        const controller = makeController(state); // 제어기
        const scene = getConversationVersion(state, "conversation-rian")!.currentScene; // 시작 장면
        for (const text of ["하나", "둘", "셋", "넷"]) // 4턴
        { // 반복 시작
            await controller.sendMessage(text); // 보내기
        } // 반복 종료
        const after = controller.snapshot(); // 결과 상태
        expect(after.wallet.balance).toBe(state.wallet.balance - 4); // 메시지 4번 비용만
        expect(controller.getMessages().some((message) => typeof message.sceneImage === "string")).toBe(false); // 붙은 그림 없음
        expect(getConversationVersion(after, "conversation-rian")!.currentScene).toBe(scene); // 장면 그대로
    }); // 검증 종료

    it("특별 장면 그림이 있는 이벤트는 토큰 없이 그 응답 아래에 그림을 붙이고 현재 장면으로 삼는다", async () => // 특별 장면
    { // 검증 시작
        const state = withRianEvents([sceneEvent]); // 2턴에 특별 장면
        const controller = makeController(state); // 제어기
        await controller.sendMessage("하나"); // 1턴
        expect(lastReply(controller).sceneImage ?? null).toBeNull(); // 아직 그림 없음
        await controller.sendMessage("둘"); // 2턴
        expect(eventIds(controller)).toEqual(["e-scene"]); // 이벤트
        expect(lastReply(controller).sceneImage).toBe("/images/scenes/moon-library.webp"); // 응답 아래 그림
        const after = controller.snapshot(); // 결과 상태
        expect(getConversationVersion(after, "conversation-rian")!.currentScene).toBe("/images/scenes/moon-library.webp"); // 현재 장면
        expect(after.wallet.balance).toBe(state.wallet.balance - 2); // 그림 값은 받지 않음
    }); // 검증 종료

    it("다시 생성하면 그 턴의 이벤트를 다시 판정하고, 다음 턴에는 반복하지 않는다", async () => // 다시 생성
    { // 검증 시작
        const controller = makeController(withRianEvents([sceneEvent])); // 2턴에 특별 장면
        await controller.sendMessage("하나"); // 1턴
        await controller.sendMessage("둘"); // 2턴(이벤트)
        await controller.regenerateLastReply(); // 2턴 다시 생성
        expect(eventIds(controller)).toEqual(["e-scene"]); // 같은 턴에 다시 기록
        expect(lastReply(controller).sceneImage).toBe("/images/scenes/moon-library.webp"); // 그림 유지
        await controller.sendMessage("셋"); // 3턴
        expect(eventIds(controller)).toEqual([]); // 반복 없음
    }); // 검증 종료

    it("메시지를 고쳐 분기하면 그 시점까지 일어난 이벤트만 빼고 다시 판정한다", async () => // 수정 분기
    { // 검증 시작
        const controller = makeController(withRianEvents([sceneEvent])); // 2턴에 특별 장면
        await controller.sendMessage("하나"); // 1턴
        await controller.sendMessage("둘"); // 2턴(이벤트)
        await controller.sendMessage("셋"); // 3턴
        const third = controller.getMessages().find((message) => message.role === "user" && message.content === "셋")!; // 3턴 메시지
        expect((await controller.editUserMessage(third.id, "셋 다시")).ok).toBe(true); // 3턴을 고쳐 분기
        expect(eventIds(controller)).toEqual([]); // 2턴에 이미 일어났으므로 없음
        const second = controller.getMessages().find((message) => message.role === "user" && message.content === "둘")!; // 2턴 메시지(분기 안의 복사본)
        expect((await controller.editUserMessage(second.id, "둘 다시")).ok).toBe(true); // 2턴을 고쳐 분기
        expect(eventIds(controller)).toEqual(["e-scene"]); // 새 분기의 2턴에서 다시 일어남
        expect(lastReply(controller).sceneImage).toBe("/images/scenes/moon-library.webp"); // 분기 응답에도 그림
    }); // 검증 종료

    it("스토리에서는 인물마다 조건을 넘는 턴에 그 인물 이름으로 한 번씩 일어난다", async () => // 스토리 인물별
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        const close: StoryEvent = { id: "e-close", name: "가까워짐", condition: "stat-min", statId: "affection", value: 30, narration: "{이름}이(가) 먼저 말을 건다.", scene: null, title: "길동무", ending: false, notify: true }; // 호감도 30 이상
        const state = { ...base, stories: base.stories.map((story) => story.id === "story-moonlit-archive" ? { ...story, events: [close], statusTemplate: { ...story.statusTemplate, stats: [{ ...createAffectionStat(), initial: 20, mode: "rule" as const, perTurn: 5, rules: [] }] } } : story) }; // 초기값 20, 매 턴 +5
        const started = createStoryConversation(state, "story-moonlit-archive", "2026-10-03T00:00:00.000Z"); // 스토리 시작
        const controller = makeController(started.state, started.conversation.id); // 스토리 제어기
        await controller.sendMessage("기록관을 둘러보자"); // 1턴(25)
        expect(eventIds(controller)).toEqual([]); // 아직
        await controller.sendMessage("계속 가자"); // 2턴(30)
        const names = started.conversation.storyCast.map((member) => member.displayName); // 등장인물
        expect((lastReply(controller).status?.events ?? []).map((item) => item.target)).toEqual(names); // 인물마다 한 번
        expect(lastReply(controller).status?.events?.[0].narration).toBe(`${names[0]}이(가) 먼저 말을 건다.`); // 이름을 넣은 내레이션
        await controller.sendMessage("더 깊이 들어가자"); // 3턴(35)
        expect(eventIds(controller)).toEqual([]); // 반복 없음
    }); // 검증 종료

    it("상태창을 끈 작품에서는 이벤트가 일어나지 않는다", async () => // 상태창 끔
    { // 검증 시작
        const state = withRianEvents([{ ...sceneEvent, value: 1 }]); // 1턴 이벤트
        const disabled = { ...state, characters: state.characters.map((character) => character.id === "rian" ? { ...character, statusTemplate: { ...character.statusTemplate, enabled: false } } : character) }; // 상태창 끔
        const controller = makeController(disabled); // 제어기
        await controller.sendMessage("하나"); // 1턴
        expect(lastReply(controller).status ?? null).toBeNull(); // 상태창 없음
        expect(lastReply(controller).sceneImage ?? null).toBeNull(); // 그림 없음
    }); // 검증 종료
}); // 묶음 종료
