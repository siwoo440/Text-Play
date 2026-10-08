import { describe, expect, it } from "vitest"; // 테스트 도구
import { collectTitles, createDefaultEvents, createEvent, evaluateEvents, EVENT_LIMIT, findEnding, getFiredKeys, getStatHistory, normalizeEvents, pruneEvents, validateEvents } from "@chatbot/features/chat/event-model"; // 이벤트 규칙
import { createAffectionStat } from "@chatbot/features/chat/stat-model"; // 기본 호감도
import { createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본 상태창
import type { StatDefinition, StatusSnapshot, StatValue, StoryEvent } from "@chatbot/features/core/types"; // 타입

const affection = createAffectionStat(); // 호감도(인물마다, 0~100)
const stamina: StatDefinition = { ...createAffectionStat(), id: "stamina", name: "체력", icon: "💪", initial: 100, scope: "shared" }; // 체력(공통)
const value = (statId: string, target: string | null, amount: number): StatValue => ({ statId, name: statId === "affection" ? "호감도" : "체력", icon: "", target, value: amount, delta: 0, min: 0, max: 100 }); // 스탯 값
const event = (patch: Partial<StoryEvent>): StoryEvent => ({ id: "e1", name: "가까워짐", condition: "stat-min", statId: "affection", value: 50, narration: "{이름}의 표정이 풀렸다.", scene: null, title: "", ending: false, notify: false, ...patch }); // 이벤트
const snapshot = (turn: number, stats: StatValue[], events: StatusSnapshot["events"] = undefined): StatusSnapshot => ({ turn, location: null, time: null, tip: null, stats, thoughts: [], custom: [], ...(events === undefined ? {} : { events }) }); // 상태창
const run = (events: StoryEvent[], values: StatValue[], turn: number, fired: ReadonlySet<string> = new Set()) => evaluateEvents({ events, stats: [affection, stamina], values, turn, fired, lead: "리안" }); // 판정

describe("이벤트 판정", () => // 판정 묶음
{ // 묶음 시작
    it("스탯이 기준 이상이 된 턴에 한 번 일어나고 이름 자리를 인물 이름으로 바꾼다", () => // 이상 조건
    { // 검증 시작
        expect(run([event({})], [value("affection", "리안", 49)], 3)).toEqual([]); // 아직
        const fired = run([event({ title: "말벗", notify: true })], [value("affection", "리안", 50)], 4); // 도달
        expect(fired).toEqual([{ eventId: "e1", name: "가까워짐", target: "리안", narration: "리안의 표정이 풀렸다.", scene: null, title: "말벗", ending: false, notify: true }]); // 일어남
        expect(run([event({})], [value("affection", "리안", 80)], 5, new Set(["e1|리안"]))).toEqual([]); // 한 번만
    }); // 검증 종료

    it("스탯이 기준 이하가 되면 일어난다", () => // 이하 조건
    { // 검증 시작
        const low = event({ id: "tired", name: "지침", condition: "stat-max", statId: "stamina", value: 30, narration: "숨이 가빠진다." }); // 체력 30 이하
        expect(run([low], [value("stamina", null, 31)], 2)).toEqual([]); // 아직
        expect(run([low], [value("stamina", null, 30)], 3)[0]).toMatchObject({ eventId: "tired", target: null, narration: "숨이 가빠진다." }); // 공통 스탯은 인물 없음
    }); // 검증 종료

    it("턴 조건은 그 턴부터 한 번 일어나고 이름 자리에는 대표 인물을 넣는다", () => // 턴 조건
    { // 검증 시작
        const night = event({ id: "night", name: "깊은 밤", condition: "turn", statId: null, value: 3, narration: "{이름}와 맞는 밤이 깊어 간다." }); // 3턴
        expect(run([night], [], 2)).toEqual([]); // 아직
        expect(run([night], [], 3)[0]).toMatchObject({ target: null, narration: "리안와 맞는 밤이 깊어 간다." }); // 3턴
        expect(run([night], [], 7)).toHaveLength(1); // 이미 지난 대화에 이벤트를 넣어도 다음 턴에 일어남
        expect(run([night], [], 7, new Set(["night|"]))).toEqual([]); // 한 번만
    }); // 검증 종료

    it("스토리에서는 인물마다 따로 판정해 조건을 넘은 인물 이름으로 한 번씩 일어난다", () => // 인물별
    { // 검증 시작
        const first = run([event({})], [value("affection", "리안", 55), value("affection", "세라", 20)], 4); // 리안만 도달
        expect(first.map((item) => item.target)).toEqual(["리안"]); // 리안
        const second = run([event({})], [value("affection", "리안", 60), value("affection", "세라", 52)], 6, new Set(["e1|리안"])); // 세라 도달
        expect(second).toEqual([expect.objectContaining({ target: "세라", narration: "세라의 표정이 풀렸다." })]); // 세라만
    }); // 검증 종료

    it("없는 스탯을 가리키는 이벤트는 건너뛰고, 여러 이벤트가 같은 턴에 함께 일어날 수 있다", () => // 여러 이벤트
    { // 검증 시작
        const ghost = event({ id: "ghost", statId: "없는-스탯" }); // 없는 스탯
        const ending = event({ id: "end", name: "특별한 사이", value: 80, ending: true, title: "특별한 사이", scene: "/images/scenes/fallback-scene.webp" }); // 엔딩
        const fired = run([ghost, event({}), ending], [value("affection", "리안", 85)], 9); // 한 번에 80 넘음
        expect(fired.map((item) => item.eventId)).toEqual(["e1", "end"]); // 정한 순서대로
    }); // 검증 종료
}); // 묶음 종료

describe("이벤트 기록 읽기", () => // 기록 묶음
{ // 묶음 시작
    const triggered = { eventId: "e1", name: "가까워짐", target: "리안", narration: "", scene: null, title: "말벗", ending: false, notify: false }; // 1턴 이벤트
    const ending = { eventId: "end", name: "특별한 사이", target: "리안", narration: "", scene: null, title: "특별한 사이", ending: true, notify: false }; // 3턴 엔딩
    const history = [snapshot(1, [value("affection", "리안", 40)], [triggered]), snapshot(2, [value("affection", "리안", 62)]), snapshot(3, [value("affection", "리안", 81)], [ending])]; // 세 턴

    it("이미 일어난 이벤트와 얻은 칭호, 엔딩을 상태창 기록에서 찾는다", () => // 기록 조회
    { // 검증 시작
        expect([...getFiredKeys(history)]).toEqual(["e1|리안", "end|리안"]); // 일어난 이벤트
        expect(collectTitles(history.slice(0, 2))).toEqual([{ title: "말벗", target: "리안" }]); // 2턴까지의 칭호
        expect(collectTitles(history)).toEqual([{ title: "말벗", target: "리안" }, { title: "특별한 사이", target: "리안" }]); // 전체 칭호
        expect(findEnding(history.slice(0, 2))).toBeNull(); // 아직 엔딩 없음
        expect(findEnding(history)).toMatchObject({ eventId: "end", name: "특별한 사이" }); // 엔딩
    }); // 검증 종료

    it("턴별 스탯 값을 스탯·인물마다 모아 그래프용 줄로 만든다", () => // 그래프 자료
    { // 검증 시작
        const lines = getStatHistory([snapshot(1, [value("affection", "리안", 40), value("stamina", null, 90)]), snapshot(2, [value("affection", "리안", 62), value("stamina", null, 70)])]); // 두 턴
        expect(lines).toEqual([{ key: "affection|리안", statId: "affection", name: "호감도", icon: "", target: "리안", min: 0, max: 100, points: [{ turn: 1, value: 40 }, { turn: 2, value: 62 }] }, { key: "stamina|", statId: "stamina", name: "체력", icon: "", target: null, min: 0, max: 100, points: [{ turn: 1, value: 90 }, { turn: 2, value: 70 }] }]); // 스탯별 줄
    }); // 검증 종료
}); // 묶음 종료

describe("이벤트 편집 규칙", () => // 편집 묶음
{ // 묶음 시작
    it("이름·조건·결과가 올바른지 검사한다", () => // 검증
    { // 검증 시작
        const stats = [affection]; // 스탯
        expect(validateEvents([event({})], stats)).toBeNull(); // 올바름
        expect(validateEvents([event({ name: " " })], stats)).toBe("이벤트 1: 이름을 입력해 주세요."); // 이름 없음
        expect(validateEvents([event({ statId: "없는-스탯" })], stats)).toBe("이벤트 1: 조건으로 쓸 스탯을 골라 주세요."); // 없는 스탯
        expect(validateEvents([event({ value: 101 })], stats)).toBe("이벤트 1: 기준 값은 스탯 범위(0~100) 안의 정수여야 합니다."); // 범위 밖
        expect(validateEvents([event({ condition: "turn", statId: null, value: 0 })], stats)).toBe("이벤트 1: 턴은 1~999 사이 정수여야 합니다."); // 턴 범위
        expect(validateEvents([event({ narration: "" })], stats)).toBe("이벤트 1: 내레이션·특별 장면·칭호·엔딩 가운데 하나는 정해 주세요."); // 결과 없음
        expect(validateEvents([event({ narration: "가".repeat(201) })], stats)).toBe("이벤트 1: 내레이션은 200자 이하여야 합니다."); // 내레이션 길이
        expect(validateEvents([event({ title: "가".repeat(13) })], stats)).toBe("이벤트 1: 칭호는 12자 이하여야 합니다."); // 칭호 길이
        expect(validateEvents(Array.from({ length: EVENT_LIMIT + 1 }, (_item, index) => event({ id: `e${index}` })), stats)).toBe(`이벤트는 ${EVENT_LIMIT}개까지 만들 수 있습니다.`); // 개수
        expect(validateEvents([event({}), event({})], stats)).toBe("이벤트 식별자가 겹칩니다."); // 중복
    }); // 검증 종료

    it("공백을 다듬고, 지운 스탯을 쓰던 이벤트는 함께 지운다", () => // 정리
    { // 검증 시작
        expect(normalizeEvents([event({ name: " 가까워짐 ", narration: " 문장 ", title: " 말벗 ", condition: "turn", statId: "affection", value: 5 })])[0]).toMatchObject({ name: "가까워짐", narration: "문장", title: "말벗", statId: null }); // 턴 조건은 스탯 없음
        expect(pruneEvents([event({}), event({ id: "t", condition: "turn", statId: null, value: 5 }), event({ id: "s", statId: "stamina" })], [affection]).map((item) => item.id)).toEqual(["e1", "t"]); // 체력 이벤트 제거
    }); // 검증 종료

    it("새 이벤트는 첫 스탯의 이상 조건으로 시작하고, 스탯이 없으면 턴 조건으로 시작한다", () => // 새 이벤트
    { // 검증 시작
        expect(createEvent(0, [affection])).toMatchObject({ condition: "stat-min", statId: "affection", value: 50, name: "", notify: true }); // 스탯 조건
        expect(createEvent(1, [])).toMatchObject({ condition: "turn", statId: null, value: 5 }); // 턴 조건
        expect(createEvent(0, [affection]).id).not.toBe(createEvent(0, [affection]).id); // 식별자는 매번 다름
    }); // 검증 종료

    it("기본 작품의 예시 이벤트는 호감도 스탯이 있을 때만 만들고 모두 검증을 통과한다", () => // 예시 이벤트
    { // 검증 시작
        const template = createDefaultStatusTemplate(); // 기본 상태창(호감도)
        const events = createDefaultEvents(template); // 예시 이벤트
        expect(events.map((item) => [item.id, item.condition, item.value])).toEqual([["event-closer", "stat-min", 20], ["event-open-heart", "stat-min", 50], ["event-special", "stat-min", 80], ["event-deep-night", "turn", 10]]); // 네 가지
        expect(events.find((item) => item.id === "event-special")).toMatchObject({ ending: true, title: "특별한 사이" }); // 엔딩
        expect(validateEvents(events, template.stats)).toBeNull(); // 검증 통과
        expect(createDefaultEvents({ ...template, stats: [] })).toEqual([]); // 호감도 없으면 없음
        expect(createDefaultEvents({ ...template, enabled: false })).toEqual([]); // 상태창을 끄면 없음
    }); // 검증 종료
}); // 묶음 종료
