import { describe, expect, it } from "vitest"; // 테스트 도구
import { canUseThinking, getMessageCost, getTierCost, getTierMaxCost, normalizeTierOption } from "@chatbot/features/chat/chat-tiers"; // 모델 등급
import { buildAutoMemories, getConversationMemories, selectPromptMemories } from "@chatbot/features/chat/memory-model"; // 요약 메모리
import { composeStatus, formatStatusText, formatStoryTime } from "@chatbot/features/chat/status-model"; // 상태창
import { createSuggestedReplies, getStyleSample } from "@chatbot/features/chat/suggestion-model"; // 추천 답변·문체
import { validateWorkExtras } from "@chatbot/features/character/work-extras"; // 작품 추가 필드
import { createDefaultConversationSettings, createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본값
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태

describe("채팅 모델 등급과 비용", () => // 등급 묶음
{ // 묶음 시작
    it("기본 길이 비용, 길이·생각 깊이 추가 비용, 최대 비용을 계산한다", () => // 비용 검증
    { // 검증 시작
        expect(getTierCost("basic", { length: 1, thinking: "off" })).toBe(1); // 베이직 기본
        expect(getTierCost("plus", { length: 3, thinking: "off" })).toBe(3 + 4); // 플러스 3배(500토큰 구간 4개)
        expect(getTierCost("premium", { length: 5, thinking: "deeper" })).toBe(8 + 16 + 16); // 프리미엄 최대
        expect(getTierMaxCost("premium")).toBe(40); // 최대 비용
        expect(getTierCost("basic", { length: 1, thinking: "deep" })).toBe(1); // 기본 길이에서는 생각 깊이 무시
        expect(canUseThinking(1)).toBe(false); // 기본 길이 생각 불가
        expect(normalizeTierOption({ length: 1, thinking: "deeper" })).toEqual({ length: 1, thinking: "off" }); // 정리
    }); // 검증 종료

    it("메시지 비용은 고른 등급 설정에 유저 노트 확장 비용을 더한다", () => // 메시지 비용 검증
    { // 검증 시작
        const settings = createDefaultConversationSettings(); // 기본 설정
        expect(getMessageCost(settings)).toBe(1); // 기본 1토큰(기존 대화 비용 유지)
        expect(getMessageCost({ ...settings, tier: "plus", userNoteExtended: true })).toBe(4); // 플러스 3 + 확장 1
    }); // 검증 종료
}); // 묶음 종료

describe("상태창", () => // 상태창 묶음
{ // 묶음 시작
    const base = { template: createDefaultStatusTemplate(true), people: [{ name: "리안", offset: 0 }], previous: null, turn: 1, relationshipLevel: 30, emotion: "설렘", tags: ["판타지"], startedAt: "2026-10-02T11:00:00.000Z", seed: "conversation-rian" }; // 기본 입력

    it("같은 입력이면 같은 상태창을 만들고 켠 항목만 채운다", () => // 결정성 검증
    { // 검증 시작
        const first = composeStatus(base); // 첫 계산
        expect(composeStatus(base)).toEqual(first); // 같은 결과
        expect(first.turn).toBe(1); // 턴
        expect(first.location).not.toBeNull(); // 장소
        expect(first.time).toBe("금요일 20:06"); // 서울 금요일 20:00 + 6분
        expect(first.affection).toEqual([{ name: "리안", value: 30, delta: 0 }]); // 첫 턴 변화 0
        expect(first.thoughts).toHaveLength(1); // 속마음
        const minimal = composeStatus({ ...base, template: { ...createDefaultStatusTemplate(true), location: false, tip: false, thought: false, customLabels: ["단서"] } }); // 일부 항목
        expect(minimal.location).toBeNull(); // 장소 끔
        expect(minimal.tip).toBeNull(); // 팁 끔
        expect(minimal.thoughts).toEqual([]); // 속마음 끔
        expect(minimal.custom.map((item) => item.label)).toEqual(["단서"]); // 직접 항목
    }); // 검증 종료

    it("직전 턴 대비 호감도 변화와 스토리 인물별 호감도를 계산하고 복사 문구를 만든다", () => // 변화 검증
    { // 검증 시작
        const first = composeStatus(base); // 1턴
        const second = composeStatus({ ...base, turn: 2, previous: first, relationshipLevel: 33 }); // 2턴
        expect(second.affection[0]).toEqual({ name: "리안", value: 33, delta: 3 }); // +3
        const story = composeStatus({ ...base, people: [{ name: "하린", offset: 0 }, { name: "유나", offset: -5 }] }); // 스토리
        expect(story.affection.map((item) => item.value)).toEqual([30, 25]); // 인물별
        expect(formatStatusText(second)).toContain("[리안 ❤️33/100(+3)]"); // 복사 문구
        expect(formatStoryTime("2026-10-02T11:00:00.000Z", 240)).toBe("토요일 20:00"); // 자정 넘김
    }); // 검증 종료
}); // 묶음 종료

describe("요약 메모리", () => // 메모리 묶음
{ // 묶음 시작
    const input = { conversationId: "c1", characterId: "rian", userMessageId: "u5", summary: "기록관에서 사라진 문장을 찾기 시작했다.", people: [{ name: "리안", level: 40, stage: "아는 사이", emotion: "설렘" }], existing: [], now: "2026-10-01T00:00:00.000Z" }; // 기본 입력

    it("5턴마다 단기 기억과 관계도를 만들고 15턴마다 장기 기억을 더하며 같은 턴은 다시 만들지 않는다", () => // 자동 기억 검증
    { // 검증 시작
        expect(buildAutoMemories({ ...input, turn: 4 })).toEqual([]); // 간격 아님
        const fifth = buildAutoMemories({ ...input, turn: 5 }); // 5턴
        expect(fifth.map((memory) => memory.category)).toEqual(["short", "relation"]); // 단기·관계도
        expect(buildAutoMemories({ ...input, turn: 5, existing: fifth })).toEqual([]); // 중복 방지
        const fifteenth = buildAutoMemories({ ...input, turn: 15, userMessageId: "u15", existing: fifth }); // 15턴
        expect(fifteenth.map((memory) => memory.category)).toEqual(["short", "relation", "long"]); // 장기 추가
        expect(fifteenth.find((memory) => memory.category === "relation")!.createdAt).toBe(fifth[1].createdAt); // 관계도 같은 항목 갱신
    }); // 검증 종료

    it("사용자가 고친 관계도는 덮어쓰지 않고, 응답에 넘길 기억은 목표·장기·관계도·단기 순이다", () => // 우선순위 검증
    { // 검증 시작
        const fifth = buildAutoMemories({ ...input, turn: 5 }); // 5턴
        const edited = fifth.map((memory) => memory.category === "relation" ? { ...memory, editedByUser: true, content: "리안은 나를 믿는다" } : memory); // 사용자 수정
        const tenth = buildAutoMemories({ ...input, turn: 10, userMessageId: "u10", existing: edited }); // 10턴
        expect(tenth.map((memory) => memory.category)).toEqual(["short"]); // 관계도 유지
        const goal = { ...fifth[0], id: "goal", category: "goal" as const, content: "비밀 찾기", createdAt: "2026-09-01T00:00:00.000Z" }; // 목표
        const prompt = selectPromptMemories([...edited, goal], "c1"); // 응답용 기억
        expect(prompt[0]).toBe("[목표] 비밀 찾기"); // 목표 먼저
        expect(getConversationMemories([...edited, goal], "c1", "short", "oldest")).toHaveLength(1); // 분류별 조회
    }); // 검증 종료
}); // 묶음 종료

describe("추천 답변·문체·작품 추가 필드", () => // 기타 묶음
{ // 묶음 시작
    it("추천 답변은 행동·질문·감정 3개를 같은 입력이면 같게 만든다", () => // 추천 검증
    { // 검증 시작
        const replies = createSuggestedReplies({ names: ["리안"], emotion: "설렘", turn: 3, seed: "c1" }); // 추천
        expect(replies).toHaveLength(3); // 3개
        expect(replies[0]).toMatch(/^\*.+\*$/); // 행동 지문
        expect(replies[1]).toContain("리안"); // 상대 이름
        expect(createSuggestedReplies({ names: ["리안"], emotion: "설렘", turn: 3, seed: "c1" })).toEqual(replies); // 결정성
        expect(getStyleSample("comic", "소하")[1]).toMatch(/^소하 \| /); // 문체 미리보기
    }); // 검증 종료

    it("플레이 가이드 길이, 직접 항목 길이, 업데이트 기록 형식을 검증한다", () => // 추가 필드 검증
    { // 검증 시작
        const ok = { playGuide: "가이드", statusTemplate: createDefaultStatusTemplate(true), updates: [{ id: "u", version: "V2", date: "2026-10-01", note: "새 장면" }] }; // 정상
        expect(validateWorkExtras(ok)).toEqual({}); // 통과
        expect(validateWorkExtras({ ...ok, playGuide: "가".repeat(2001) }).playGuide).toBeDefined(); // 가이드 길이
        expect(validateWorkExtras({ ...ok, statusTemplate: { ...ok.statusTemplate, customLabels: ["가".repeat(11)] } }).statusTemplate).toBeDefined(); // 항목 길이
        expect(validateWorkExtras({ ...ok, updates: [{ ...ok.updates[0], note: " " }] }).updates).toBeDefined(); // 빈 내용
    }); // 검증 종료

    it("기본 캐릭터·스토리는 플레이 가이드와 상태창을 켠 채로 시작한다", () => // 기준값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(state.characters.every((character) => character.statusTemplate.enabled && character.playGuide.startsWith("[플레이 가이드]"))).toBe(true); // 캐릭터
        expect(state.stories.every((story) => story.statusTemplate.enabled)).toBe(true); // 스토리
        expect(state.personas[0].name).toBe(state.profile.nickname); // 기본 대화 프로필
    }); // 검증 종료
}); // 묶음 종료
