import { describe, expect, it } from "vitest"; // 테스트 도구
import { createConversationFromPreset } from "@chatbot/features/character/character-detail-model"; // 캐릭터 대화 시작
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { createAffectionStat } from "@chatbot/features/chat/stat-model"; // 기본 호감도
import { getConversationVersion, getVersionMessages } from "@chatbot/features/conversation/conversation-versioning"; // 버전 조회
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, StatusTemplate } from "@chatbot/features/core/types"; // 상태 타입
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 시작
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화

function makeController(state: AppState = createInitialState(), conversationId = "conversation-rian"): ChatController // 제어기 만들기(리안 대화: 관계 34, 아는 사이)
{ // 함수 시작
    return new ChatController({ state, conversationId, llm: new MockLLMAdapter({ delayMs: 0, seed: 7 }), images: new MockImageAdapter() }); // 제어기 반환
} // 함수 종료

function relationOf(controller: ChatController, conversationId = "conversation-rian") // 대화의 관계 수치·단계와 마지막 상태창의 호감도
{ // 함수 시작
    const state = controller.snapshot(); // 상태
    const version = getConversationVersion(state, conversationId)!; // 현재 버전
    const status = getVersionMessages(state, conversationId, version.id).filter((message) => message.status !== undefined && message.status !== null).at(-1)?.status; // 마지막 상태창
    return { level: version.relationshipLevel, stage: version.relationshipStage, stat: status?.stats.find((item) => item.statId === "affection")?.value ?? null, versionId: version.id }; // 관계 요약
} // 함수 종료

function withTemplate(state: AppState, characterId: string, patch: Partial<StatusTemplate>): AppState // 캐릭터 상태창 형식 바꾸기
{ // 함수 시작
    return { ...state, characters: state.characters.map((character) => character.id === characterId ? { ...character, statusTemplate: { ...character.statusTemplate, ...patch } } : character) }; // 바꾼 상태
} // 함수 종료

describe("관계 수치와 관계 스탯", () => // 관계 흐름 묶음
{ // 묶음 시작
    it("관계 스탯이 있으면 대화의 관계 수치와 단계가 그 스탯 값을 따르고, 기존 관계 수치에서 이어 간다", async () => // 따라가기 검증
    { // 검증 시작
        const controller = makeController(); // 리안(관계 34)
        await controller.sendMessage("선물 가져왔어, 고마워"); // 선물 +5, 고마워 +2, AI 최대 +5
        const first = relationOf(controller); // 1턴 뒤
        expect(first.stat).toBeGreaterThanOrEqual(41); // 34에서 시작해 규칙 7 이상
        expect(first.stat).toBeLessThanOrEqual(46); // AI는 최대 +5
        expect(first.level).toBe(first.stat); // 관계 수치 = 스탯 값
        expect(first.stage).toBe("아는 사이"); // 15~49 구간의 단계
        await controller.sendMessage("짜증나, 꺼져"); // 거친 말
        const second = relationOf(controller); // 2턴 뒤
        expect(second.level).toBeLessThan(first.level); // 내려감(예전 방식은 오르기만 했음)
        expect(second.level).toBe(second.stat); // 여전히 같은 값
    }); // 검증 종료

    it("관계 스탯 값이 단계 기준(15·50·80)을 넘으면 관계 단계가 바뀐다", async () => // 단계 검증
    { // 검증 시작
        const state = withTemplate(createInitialState(), "rian", { stats: [{ ...createAffectionStat(), mode: "rule", perTurn: 20, rules: [] }] }); // 매 턴 +20
        const controller = makeController(state); // 리안(관계 34)
        await controller.sendMessage("오늘도 왔어"); // 수치 34 → 54
        expect(relationOf(controller)).toMatchObject({ level: 54, stage: "가까운 사이" }); // 50 이상
        await controller.sendMessage("또 왔어"); // 수치 54 → 74
        await controller.sendMessage("계속 올게"); // 수치 74 → 94
        expect(relationOf(controller)).toMatchObject({ level: 94, stage: "특별한 사이" }); // 80 이상
    }); // 검증 종료

    it("범위가 0~100이 아닌 관계 스탯은 비율로 환산한다", async () => // 환산 검증
    { // 검증 시작
        const state = withTemplate(createInitialState(), "rian", { stats: [{ ...createAffectionStat(), min: -50, max: 50, initial: 0, mode: "rule", perTurn: 10, rules: [] }] }); // -50~50, 매 턴 +10
        const controller = makeController(state); // 리안(관계 34 → 스탯 -16)
        await controller.sendMessage("안녕"); // 수치 -16 → -6
        expect(relationOf(controller)).toMatchObject({ stat: -6, level: 44 }); // 계산: (-6 + 50) / 100
    }); // 검증 종료

    it("다시 생성해도 관계 값이 두 번 더해지지 않는다", async () => // 다시 생성 검증
    { // 검증 시작
        const controller = makeController(); // 리안
        await controller.sendMessage("선물이야"); // 1턴
        const before = relationOf(controller); // 전송 뒤
        await controller.regenerateLastReply(); // 다시 생성
        expect(relationOf(controller)).toMatchObject({ level: before.level, stat: before.stat }); // 같은 값
    }); // 검증 종료

    it("메시지를 고쳐 분기하면 그 시점의 관계에서 다시 계산하고 원본 버전은 그대로 둔다", async () => // 분기 검증
    { // 검증 시작
        const controller = makeController(); // 리안
        await controller.sendMessage("선물 가져왔어, 고마워"); // 1턴(오름)
        await controller.sendMessage("책 읽자"); // 2턴
        const original = relationOf(controller); // 원본 버전
        const target = controller.getMessages().find((message) => message.role === "user" && message.content === "선물 가져왔어, 고마워")!; // 고칠 메시지
        const result = await controller.editUserMessage(target.id, "짜증나, 꺼져"); // 거친 말로 수정
        expect(result.ok).toBe(true); // 분기 성공
        const fork = relationOf(controller); // 새 버전
        expect(fork.versionId).not.toBe(original.versionId); // 다른 버전
        expect(fork.level).toBeLessThan(34); // 시작 관계(34)에서 내려감
        expect(fork.level).toBeGreaterThanOrEqual(29); // AI는 최대 -5
        expect(fork.level).toBe(fork.stat); // 같은 값
        const state = controller.snapshot(); // 전체 상태
        expect(state.conversationVersions.find((version) => version.id === original.versionId)?.relationshipLevel).toBe(original.level); // 원본 유지
    }); // 검증 종료

    it("관계 스탯을 지정하지 않은 작품은 예전처럼 매 턴 +1(다정한 말 +3)로 오른다", async () => // 예전 방식 검증
    { // 검증 시작
        const controller = makeController(withTemplate(createInitialState(), "rian", { relationStatId: null })); // 지정 없음
        await controller.sendMessage("짜증나"); // 거친 말에도 +1
        expect(relationOf(controller).level).toBe(35); // 계산: 34 + 1
        await controller.sendMessage("고마워"); // 다정한 말 +3
        expect(relationOf(controller).level).toBe(38); // 계산: 35 + 3
        expect(relationOf(controller).stat).not.toBe(38); // 호감도 스탯은 따로 계산
    }); // 검증 종료

    it("시작 설정에 관계가 정해진 대화는 그 값에서, 자동 시작 설정은 관계 스탯 초기값에서 시작한다", () => // 시작값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const preset = createConversationFromPreset(state, "rian", "returning-reader", "2026-10-03T00:00:00.000Z"); // 리안 '다시 온 독자'(아는 사이)
        expect(preset.version.relationshipStage).toBe("아는 사이"); // 시작 설정 우선
        expect(preset.version.relationshipLevel).toBe(preset.conversation.startSettings.relationshipLevel); // 시작 설정 값
        const plain = state.characters.find((character) => character.id.startsWith("rank-"))!; // 시작 설정이 따로 없는 캐릭터
        const warm = withTemplate(state, plain.id, { stats: [{ ...createAffectionStat(), initial: 60 }] }); // 호감도 초기값 60
        const started = createConversationFromPreset(warm, plain.id, "default", "2026-10-03T00:00:00.000Z"); // 자동 시작 설정
        expect(started.version).toMatchObject({ relationshipLevel: 60, relationshipStage: "가까운 사이" }); // 스탯 초기값
        expect(started.conversation.startSettings).toMatchObject({ relationshipLevel: 60, relationshipStage: "가까운 사이" }); // 시작 설정에도 기록(분기 계산 기준)
    }); // 검증 종료

    it("스토리 대화는 대표 인물(첫 등장인물)의 관계 스탯이 대화의 관계 수치가 된다", async () => // 스토리 검증
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        const state = { ...base, stories: base.stories.map((story) => story.id === "story-moonlit-archive" ? { ...story, statusTemplate: { ...story.statusTemplate, stats: [{ ...createAffectionStat(), initial: 20, mode: "rule" as const, perTurn: 5, rules: [] }] } } : story) }; // 초기값 20, 매 턴 +5
        const started = createStoryConversation(state, "story-moonlit-archive", "2026-10-03T00:00:00.000Z"); // 스토리 시작
        expect(started.version).toMatchObject({ relationshipLevel: 20, relationshipStage: "아는 사이" }); // 스탯 초기값에서 시작
        const controller = makeController(started.state, started.conversation.id); // 스토리 제어기
        await controller.sendMessage("기록관을 둘러보자"); // 1턴
        const lead = started.conversation.storyCast[0].displayName; // 대표 인물
        const status = controller.getMessages().at(-1)?.status; // 상태창
        expect(status?.stats.filter((item) => item.statId === "affection").map((item) => item.value)).toEqual(started.conversation.storyCast.map(() => 25)); // 인물마다 20 → 25
        expect(status?.stats[0].target).toBe(lead); // 첫 줄이 대표 인물
        expect(relationOf(controller, started.conversation.id)).toMatchObject({ level: 25, stage: "아는 사이" }); // 대표 인물 값이 대화의 관계
    }); // 검증 종료
}); // 묶음 종료
