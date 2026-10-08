import { describe, expect, it } from "vitest"; // 테스트 도구
import { canUseThinking, getMessageCost, getTierCost, getTierMaxCost, normalizeTierOption, THINKING_DEPTH_ENABLED } from "@chatbot/features/chat/chat-tiers"; // 모델 등급
import { buildAutoMemories, getConversationMemories, selectPromptMemories } from "@chatbot/features/chat/memory-model"; // 요약 메모리
import { buildStatJudgeInput, computeStats, createAffectionStat, createStat, currentStatValues, judgeStatsMock, validateStats } from "@chatbot/features/chat/stat-model"; // 스탯
import { composeStatus, formatStatusText, formatStoryTime, getStatusRows } from "@chatbot/features/chat/status-model"; // 상태창
import { createSuggestedReplies, getStyleSample } from "@chatbot/features/chat/suggestion-model"; // 추천 답변·문체
import { normalizeWorkExtras, validateWorkExtras } from "@chatbot/features/character/work-extras"; // 작품 추가 필드
import { createDefaultConversationSettings, createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본값
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { setActiveLocale } from "@chatbot/lib/i18n"; // 화면 언어

describe("채팅 모델 등급과 비용", () => // 등급 묶음
{ // 묶음 시작
    it("기본 길이 비용, 길이 추가 비용, 최대 비용을 계산하고, 생각 깊이는 답변에 반영될 때까지 비용에 넣지 않는다", () => // 비용 검증
    { // 검증 시작
        expect(THINKING_DEPTH_ENABLED).toBe(false); // 생각 깊이는 아직 답변에 반영되지 않음(3단계에서 켬)
        expect(getTierCost("basic", { length: 1, thinking: "off" })).toBe(1); // 베이직 기본
        expect(getTierCost("plus", { length: 3, thinking: "off" })).toBe(3 + 4); // 플러스 3배(500토큰 구간 4개)
        expect(getTierCost("premium", { length: 5, thinking: "deeper" })).toBe(8 + 16); // 예전에 저장한 생각 깊이가 있어도 길이만큼만
        expect(getTierMaxCost("premium")).toBe(24); // 최대 비용(5배)
        expect(getTierCost("basic", { length: 1, thinking: "deep" })).toBe(1); // 기본 길이
        expect(canUseThinking(1)).toBe(false); // 기본 길이 생각 불가
        expect(canUseThinking(5)).toBe(false); // 긴 답변도 아직 불가
        expect(normalizeTierOption({ length: 5, thinking: "deeper" })).toEqual({ length: 5, thinking: "off" }); // 정리
    }); // 검증 종료

    it("메시지 비용은 고른 등급 설정에, 유저 노트를 500자 넘게 적었을 때만 확장 비용을 더한다", () => // 메시지 비용 검증
    { // 검증 시작
        const settings = createDefaultConversationSettings(); // 기본 설정
        expect(getMessageCost(settings)).toBe(1); // 기본 1토큰(기존 대화 비용 유지)
        expect(getMessageCost({ ...settings, tier: "plus", userNoteExtended: true })).toBe(3); // 확장을 켜도 노트가 비어 있으면 그대로
        expect(getMessageCost({ ...settings, tier: "plus", userNoteExtended: true, userNote: "가".repeat(500) })).toBe(3); // 500자까지는 기본 범위
        expect(getMessageCost({ ...settings, tier: "plus", userNoteExtended: true, userNote: "가".repeat(501) })).toBe(4); // 500자를 넘으면 플러스 3 + 확장 1
    }); // 검증 종료
}); // 묶음 종료

describe("상태창", () => // 상태창 묶음
{ // 묶음 시작
    const base = { template: createDefaultStatusTemplate(true), people: ["리안"], previous: null, turn: 1, userMessage: "오늘 책 정리했어", aiChanges: [], emotion: "설렘", tags: ["판타지"], startedAt: "2026-10-02T11:00:00.000Z", seed: "conversation-rian" }; // 기본 입력

    it("같은 입력이면 같은 상태창을 만들고 켠 항목만 채운다", () => // 결정성 검증
    { // 검증 시작
        const first = composeStatus(base); // 첫 계산
        expect(composeStatus(base)).toEqual(first); // 같은 결과
        expect(first.turn).toBe(1); // 턴
        expect(first.location).not.toBeNull(); // 장소
        expect(first.time).toBe("금요일 20:06"); // 서울 금요일 20:00 + 6분
        expect(first.stats).toEqual([{ statId: "affection", name: "호감도", icon: "❤️", target: "리안", value: 0, delta: 0, min: 0, max: 100 }]); // 초기값 0에서 시작
        expect(first.thoughts).toHaveLength(1); // 속마음
        const minimal = composeStatus({ ...base, template: { ...createDefaultStatusTemplate(true), location: false, tip: false, thought: false, customLabels: ["단서"] } }); // 일부 항목
        expect(minimal.location).toBeNull(); // 장소 끔
        expect(minimal.tip).toBeNull(); // 팁 끔
        expect(minimal.thoughts).toEqual([]); // 속마음 끔
        expect(minimal.custom.map((item) => item.label)).toEqual(["단서"]); // 직접 항목
    }); // 검증 종료

    it("직전 턴 값에 낱말 규칙과 AI 판단을 더하고 인물별로 묶어 복사 문구를 만든다", () => // 변화 검증
    { // 검증 시작
        const first = composeStatus({ ...base, userMessage: "고마워", aiChanges: [{ statId: "affection", target: "리안", delta: 3 }] }); // 1턴: 고마워 +2, AI +3
        expect(first.stats[0]).toMatchObject({ value: 5, delta: 5 }); // 0에서 5로 변함
        const second = composeStatus({ ...base, turn: 2, previous: first, userMessage: "선물이야", aiChanges: [{ statId: "affection", target: "리안", delta: 99 }] }); // 2턴: 선물 +5, AI는 한도 5
        expect(second.stats[0]).toMatchObject({ value: 15, delta: 10 }); // AI 변화는 한 턴 최대 5
        const story = composeStatus({ ...base, people: ["하린", "유나"] }); // 스토리
        expect(story.stats.map((item) => [item.target, item.value])).toEqual([["하린", 0], ["유나", 0]]); // 인물마다 따로
        expect(getStatusRows(story).map((row) => row.name)).toEqual(["하린", "유나"]); // 인물 줄
        expect(formatStatusText(second)).toContain("[리안 ❤️호감도 15/100(+10)]"); // 복사 문구
        expect(formatStoryTime("2026-10-02T11:00:00.000Z", 240)).toBe("토요일 20:00"); // 자정 넘김
    }); // 검증 종료

    it("제작자 스탯은 규칙만·AI만·공통 대상과 최솟값·최댓값을 지킨다", () => // 스탯 계산 검증
    { // 검증 시작
        const stamina = { ...createStat(0), id: "stamina", name: "체력", icon: "💪", initial: 10, min: 0, max: 10, mode: "rule" as const, perTurn: -3, rules: [{ keyword: "쉬자", delta: 5 }], scope: "shared" as const }; // 규칙만, 공통
        const trust = { ...createStat(1), id: "trust", name: "신뢰도", initial: 50, mode: "ai" as const, rules: [{ keyword: "쉬자", delta: 50 }], aiMaxChange: 2 }; // AI만
        const turn1 = computeStats({ stats: [stamina, trust], people: ["리안"], previous: null, userMessage: "걷자", aiChanges: [{ statId: "stamina", target: null, delta: 9 }, { statId: "trust", target: "리안", delta: -7 }] }); // 1턴
        expect(turn1).toEqual([expect.objectContaining({ statId: "stamina", target: null, value: 7, delta: -3 }), expect.objectContaining({ statId: "trust", target: "리안", value: 48, delta: -2 })]); // 규칙만은 AI 무시·AI만은 낱말 무시·한도
        const previous = { turn: 1, location: null, time: null, tip: null, stats: turn1, thoughts: [], custom: [] }; // 직전 상태창
        const turn2 = computeStats({ stats: [stamina], people: ["리안"], previous, userMessage: "잠깐 쉬자 쉬자", aiChanges: [] }); // 2턴
        expect(turn2[0]).toMatchObject({ value: 9, delta: 2 }); // 계산: 7 - 3 + 5
        const turn3 = computeStats({ stats: [stamina], people: ["리안"], previous: { ...previous, stats: turn2 }, userMessage: "쉬자", aiChanges: [] }); // 3턴
        expect(turn3[0]).toMatchObject({ value: 10, delta: 1 }); // 최댓값 10에서 멈춤
        expect(currentStatValues({ ...createDefaultStatusTemplate(true), stats: [stamina] }, ["리안"], null)).toEqual([expect.objectContaining({ value: 10, delta: 0 })]); // 첫 응답 전 초기값
    }); // 검증 종료

    it("Mock AI 판단은 스탯 이름 성격과 대화 분위기로 같은 결과를 낸다", () => // AI 판단 검증
    { // 검증 시작
        const template = { ...createDefaultStatusTemplate(true), stats: [createAffectionStat(), { ...createStat(0), id: "guard", name: "경계심", aiMaxChange: 4 }, { ...createStat(1), id: "rule-only", name: "체력", mode: "rule" as const }] }; // 호감·경계·규칙만
        const kind = buildStatJudgeInput(template, ["리안"], null, "고마워 정말 좋아", "", "기쁨"); // 다정한 말
        expect(kind.stats.map((item) => item.statId)).toEqual(["affection", "guard"]); // 규칙만 스탯은 AI 판단에서 제외
        const warm = judgeStatsMock(kind); // 판단
        expect(warm.find((item) => item.statId === "affection")!.delta).toBeGreaterThan(0); // 호감도 오름
        expect(warm.find((item) => item.statId === "guard")!.delta).toBeLessThan(0); // 경계심 내림
        expect(judgeStatsMock(kind)).toEqual(warm); // 같은 결과
        const cold = judgeStatsMock(buildStatJudgeInput(template, ["리안"], null, "짜증나 꺼져", "", "당황")); // 거친 말
        expect(cold.find((item) => item.statId === "affection")!.delta).toBe(-5); // 한도까지 내림
    }); // 검증 종료

    it("스탯 이름·범위·초기값·낱말 규칙·AI 한도를 검증한다", () => // 스탯 검증
    { // 검증 시작
        const stat = createAffectionStat(); // 기본 호감도
        expect(validateStats([stat])).toBeNull(); // 정상
        expect(validateStats([{ ...stat, name: "" }])).toContain("이름"); // 이름 없음
        expect(validateStats([stat, { ...stat, id: "other" }])).toContain("겹칩니다"); // 이름 중복
        expect(validateStats([{ ...stat, min: 10, max: 10 }])).toContain("최솟값은 최댓값보다"); // 범위
        expect(validateStats([{ ...stat, initial: 101 }])).toContain("초기값"); // 초기값 범위
        expect(validateStats([{ ...stat, initial: Number.NaN }])).toContain("정수"); // 빈 숫자
        expect(validateStats([{ ...stat, rules: [{ keyword: "", delta: 1 }] }])).toContain("낱말 규칙"); // 빈 낱말
        expect(validateStats([{ ...stat, aiMaxChange: 0 }])).toContain("AI 한 턴 최대 변화"); // AI 한도
        expect(validateStats(Array.from({ length: 7 }, (_, index) => ({ ...stat, id: `s${index}`, name: `스탯${index}` })))).toContain("6개"); // 개수
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

    it("영어 화면에서 만든 단기 기억도 장기 기억으로 묶을 때 머리말을 뺀다", () => // 영어 머리말 검증
    { // 검증 시작
        setActiveLocale("en"); // 영어 화면
        const fifth = buildAutoMemories({ ...input, turn: 5, summary: "They began looking for the missing sentence." }); // 5턴
        expect(fifth[0].content).toBe("Up to turn 5: They began looking for the missing sentence."); // 영어 머리말이 붙은 단기 기억
        const tenth = buildAutoMemories({ ...input, turn: 10, userMessageId: "u10", summary: "A hidden shelf opened.", existing: fifth }); // 10턴
        const fifteenth = buildAutoMemories({ ...input, turn: 15, userMessageId: "u15", summary: "The record was restored.", existing: [...fifth, ...tenth] }); // 15턴
        const long = fifteenth.find((memory) => memory.category === "long"); // 장기 기억
        expect(long?.content).toContain("They began looking for the missing sentence. / A hidden shelf opened. / The record was restored."); // 머리말 없이 묶임
        expect(long?.content).not.toMatch(/Up to turn \d+: /); // 머리말이 남지 않음
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
        const ok = { playGuide: "가이드", statusTemplate: createDefaultStatusTemplate(true), updates: [{ id: "u", version: "V2", date: "2026-10-01", note: "새 장면" }], events: [], lorebook: [{ id: "l", title: "달빛 도서관", keywords: ["도서관"], content: "자정에만 열린다." }], examples: [{ id: "e", user: "안녕", reply: "어서 와." }] }; // 정상
        expect(validateWorkExtras(ok)).toEqual({}); // 통과
        expect(validateWorkExtras({ ...ok, lorebook: [{ ...ok.lorebook[0], keywords: [] }] }).lorebook).toBe("설정 1의 키워드를 1~5개(각 20자 이하) 적어 주세요."); // 설정집 오류
        expect(validateWorkExtras({ ...ok, examples: [{ ...ok.examples[0], reply: " " }] }).examples).toBe("예시 1의 답을 1~500자로 적어 주세요."); // 예시 대화 오류
        expect(validateWorkExtras({ ...ok, lorebook: [...ok.lorebook, { id: "blank", title: " ", keywords: [" "], content: "" }], examples: [...ok.examples, { id: "blank", user: "", reply: " " }] })).toEqual({}); // 아무것도 적지 않은 항목은 오류로 보지 않음
        const normalized = normalizeWorkExtras({ ...ok, lorebook: [{ id: "l", title: " 달빛 도서관 ", keywords: [" 도서관 ", "도서관", ""], content: " 자정에만 열린다. " }, { id: "blank", title: "", keywords: [], content: "" }], examples: [{ id: "e", user: " 안녕 ", reply: " 어서 와. " }, { id: "blank", user: "", reply: "" }] }); // 정리
        expect(normalized.lorebook).toEqual(ok.lorebook); // 공백·중복 키워드·빈 항목 정리
        expect(normalized.examples).toEqual(ok.examples); // 공백·빈 쌍 정리
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
