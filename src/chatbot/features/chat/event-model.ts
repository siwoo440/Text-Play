// 스탯 조건 이벤트 규칙: 제작자가 정한 조건(스탯 이상·이하, 턴)이 처음 맞는 턴에 한 번 일어나고, 그 턴의 상태창에 기록한다.
import { AFFECTION_STAT_ID } from "@chatbot/features/chat/stat-model"; // 기본 호감도 스탯
import type { StatDefinition, StatusSnapshot, StatusTemplate, StatValue, StoryEvent, StoryEventCondition, TriggeredEvent } from "@chatbot/features/core/types"; // 도메인 타입
import { scenePaths } from "@chatbot/lib/assets/scene-paths"; // 장면 그림 경로
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export const EVENT_LIMIT = 8; // 작품당 이벤트 최대 수
export const EVENT_NAME_LIMIT = 20; // 이벤트 이름 최대 글자 수
export const EVENT_NARRATION_LIMIT = 200; // 내레이션 최대 글자 수
export const EVENT_TITLE_LIMIT = 12; // 칭호 최대 글자 수
export const EVENT_TURN_LIMIT = 999; // 턴 조건 최댓값
export const EVENT_NAME_TOKEN = "{이름}"; // 내레이션에서 인물 이름으로 바뀌는 자리

export const eventConditions: Array<{ id: StoryEventCondition; label: string }> = // 조건 종류
[ // 목록 시작
    { id: "stat-min", label: "스탯이 이 값 이상이 되면" }, // 이상
    { id: "stat-max", label: "스탯이 이 값 이하가 되면" }, // 이하
    { id: "turn", label: "이 턴이 되면" }, // 턴
]; // 목록 종료

export const eventSceneOptions: Array<{ path: string; label: string }> = // 고를 수 있는 특별 장면 그림
[ // 목록 시작
    { path: scenePaths.dawn, label: "새벽 편지" }, // 새벽
    { path: scenePaths.rain, label: "비 오는 교실" }, // 비
    { path: scenePaths.library, label: "달빛 기록관" }, // 기록관
    { path: scenePaths.fallback, label: "노을 지는 방" }, // 노을
]; // 목록 종료

export interface StatHistoryLine // 그래프 한 줄(스탯·인물 하나의 턴별 값)
{ // 구조 시작
    key: string; // 스탯·인물 키
    statId: string; // 스탯 식별자
    name: string; // 스탯 이름
    icon: string; // 아이콘
    target: string | null; // 인물(공통이면 없음)
    min: number; // 최솟값
    max: number; // 최댓값
    points: Array<{ turn: number; value: number }>; // 턴별 값
} // 구조 종료

function firedKey(eventId: string, target: string | null): string // 일어난 이벤트 키(이벤트·인물)
{ // 함수 시작
    return `${eventId}|${target ?? ""}`; // 키 반환
} // 함수 종료

export function getFiredKeys(snapshots: readonly StatusSnapshot[]): Set<string> // 지금까지 일어난 이벤트
{ // 함수 시작
    return new Set(snapshots.flatMap((snapshot) => (snapshot.events ?? []).map((item) => firedKey(item.eventId, item.target)))); // 키 모음
} // 함수 종료

export function evaluateEvents(input: { events: readonly StoryEvent[]; stats: readonly StatDefinition[]; values: readonly StatValue[]; turn: number; fired: ReadonlySet<string>; lead: string }): TriggeredEvent[] // 이번 턴에 일어나는 이벤트
{ // 함수 시작
    const triggered: TriggeredEvent[] = []; // 일어난 이벤트
    const fire = (event: StoryEvent, target: string | null) => // 한 번만 일어나게 기록
    { // 함수 시작
        if (!input.fired.has(firedKey(event.id, target))) // 아직 안 일어남
        { // 조건 시작
            triggered.push({ eventId: event.id, name: event.name, target, narration: event.narration.split(EVENT_NAME_TOKEN).join(target ?? input.lead), scene: event.scene, title: event.title, ending: event.ending, notify: event.notify }); // 이벤트 기록
        } // 조건 종료
    }; // 함수 종료
    for (const event of input.events) // 이벤트 순회(정한 순서)
    { // 순회 시작
        if (event.condition === "turn") // 턴 조건
        { // 조건 시작
            if (input.turn >= event.value) // 그 턴 이후
            { // 조건 시작
                fire(event, null); // 인물 없이 한 번
            } // 조건 종료
            continue; // 다음 이벤트
        } // 조건 종료
        if (!input.stats.some((stat) => stat.id === event.statId)) // 없는 스탯
        { // 조건 시작
            continue; // 건너뜀
        } // 조건 종료
        for (const entry of input.values.filter((item) => item.statId === event.statId)) // 인물별 값
        { // 값 시작
            if (event.condition === "stat-min" ? entry.value >= event.value : entry.value <= event.value) // 조건 판정
            { // 조건 시작
                fire(event, entry.target); // 그 인물 이름으로 한 번
            } // 조건 종료
        } // 값 종료
    } // 순회 종료
    return triggered; // 일어난 이벤트 반환
} // 함수 종료

export function collectTitles(snapshots: readonly StatusSnapshot[]): Array<{ title: string; target: string | null }> // 지금까지 얻은 칭호(얻은 순서)
{ // 함수 시작
    return snapshots.flatMap((snapshot) => (snapshot.events ?? []).filter((item) => item.title.length > 0).map((item) => ({ title: item.title, target: item.target }))); // 칭호 모음
} // 함수 종료

export function findEnding(snapshots: readonly StatusSnapshot[]): TriggeredEvent | null // 도달한 엔딩(처음 것)
{ // 함수 시작
    return snapshots.flatMap((snapshot) => snapshot.events ?? []).find((item) => item.ending) ?? null; // 엔딩 반환
} // 함수 종료

export function getStatHistory(snapshots: readonly StatusSnapshot[]): StatHistoryLine[] // 턴별 스탯 값(그래프용)
{ // 함수 시작
    const lines = new Map<string, StatHistoryLine>(); // 스탯·인물별 줄
    for (const snapshot of snapshots) // 턴 순회
    { // 순회 시작
        for (const entry of snapshot.stats) // 스탯 값 순회
        { // 값 시작
            const key = `${entry.statId}|${entry.target ?? ""}`; // 줄 키
            const line = lines.get(key) ?? { key, statId: entry.statId, name: entry.name, icon: entry.icon, target: entry.target, min: entry.min, max: entry.max, points: [] }; // 줄 조회
            lines.set(key, { ...line, name: entry.name, icon: entry.icon, min: Math.min(line.min, entry.min), max: Math.max(line.max, entry.max), points: [...line.points, { turn: snapshot.turn, value: entry.value }] }); // 값 추가
        } // 값 종료
    } // 순회 종료
    return [...lines.values()]; // 줄 목록 반환
} // 함수 종료

export function createEvent(index: number, stats: readonly StatDefinition[]): StoryEvent // 새 이벤트 기본값
{ // 함수 시작
    const stat = stats[0]; // 첫 스탯
    const id = `event-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 6)}`; // 식별자
    return stat === undefined // 스탯 유무 판정
        ? { id, name: "", condition: "turn", statId: null, value: 5, narration: "", scene: null, title: "", ending: false, notify: true } // 스탯이 없으면 턴 조건
        : { id, name: "", condition: "stat-min", statId: stat.id, value: Math.round((stat.min + stat.max) / 2), narration: "", scene: null, title: "", ending: false, notify: true }; // 첫 스탯의 중간 값 이상
} // 함수 종료

export function createDefaultEvents(template: StatusTemplate): StoryEvent[] // 기본 작품의 예시 이벤트(호감도 스탯이 있을 때)
{ // 함수 시작
    if (!template.enabled || !template.stats.some((stat) => stat.id === AFFECTION_STAT_ID)) // 상태창 끔·호감도 없음
    { // 조건 시작
        return []; // 예시 없음
    } // 조건 종료
    return [ // 예시 이벤트
        { id: "event-closer", name: "한 걸음 가까이", condition: "stat-min", statId: AFFECTION_STAT_ID, value: 20, narration: `${EVENT_NAME_TOKEN}의 말투가 눈에 띄게 부드러워졌다.`, scene: null, title: t("말벗"), ending: false, notify: true }, // 호감도 20
        { id: "event-open-heart", name: "마음을 연 순간", condition: "stat-min", statId: AFFECTION_STAT_ID, value: 50, narration: `${EVENT_NAME_TOKEN}이(가) 처음으로 속마음을 털어놓는다.`, scene: scenePaths.fallback, title: "", ending: false, notify: true }, // 호감도 50(특별 장면)
        { id: "event-special", name: "특별한 사이", condition: "stat-min", statId: AFFECTION_STAT_ID, value: 80, narration: `이제 ${EVENT_NAME_TOKEN}에게 당신은 없어서는 안 될 사람이 되었다.`, scene: null, title: t("특별한 사이"), ending: true, notify: true }, // 호감도 80(엔딩)
        { id: "event-deep-night", name: "깊어 가는 밤", condition: "turn", statId: null, value: 10, narration: "창밖의 불빛이 하나둘 꺼지고, 이야기는 더 깊어진다.", scene: null, title: "", ending: false, notify: false }, // 10턴
    ]; // 예시 종료
} // 함수 종료

export function normalizeEvents(events: readonly StoryEvent[]): StoryEvent[] // 이벤트 정리(앞뒤 공백, 턴 조건의 스탯 비우기)
{ // 함수 시작
    return events.map((event) => ({ ...event, name: event.name.trim(), narration: event.narration.trim(), title: event.title.trim(), statId: event.condition === "turn" ? null : event.statId })); // 정리 반환
} // 함수 종료

export function pruneEvents(events: readonly StoryEvent[], stats: readonly StatDefinition[]): StoryEvent[] // 지운 스탯을 쓰던 이벤트 제거
{ // 함수 시작
    return events.filter((event) => event.condition === "turn" || stats.some((stat) => stat.id === event.statId)); // 남길 이벤트
} // 함수 종료

export function validateEvents(events: readonly StoryEvent[], stats: readonly StatDefinition[]): string | null // 이벤트 검증(첫 오류 문구)
{ // 함수 시작
    if (events.length > EVENT_LIMIT) // 개수 판정
    { // 조건 시작
        return t("이벤트는 {0}개까지 만들 수 있습니다.", [EVENT_LIMIT]); // 개수 오류
    } // 조건 종료
    if (new Set(events.map((event) => event.id)).size !== events.length) // 식별자 중복 판정
    { // 조건 시작
        return t("이벤트 식별자가 겹칩니다."); // 중복 오류
    } // 조건 종료
    for (const [index, event] of events.entries()) // 이벤트 순회
    { // 순회 시작
        const label = t("이벤트 {0}", [index + 1]); // 오류 앞머리
        const name = event.name.trim(); // 이름
        if (name.length === 0) // 이름 없음
        { // 조건 시작
            return t("{0}: 이름을 입력해 주세요.", [label]); // 이름 오류
        } // 조건 종료
        if (name.length > EVENT_NAME_LIMIT) // 이름 길이
        { // 조건 시작
            return t("{0}: 이름은 {1}자 이하여야 합니다.", [label, EVENT_NAME_LIMIT]); // 길이 오류
        } // 조건 종료
        if (event.condition === "turn") // 턴 조건
        { // 조건 시작
            if (!Number.isInteger(event.value) || event.value < 1 || event.value > EVENT_TURN_LIMIT) // 턴 범위
            { // 조건 시작
                return t("{0}: 턴은 1~{1} 사이 정수여야 합니다.", [label, EVENT_TURN_LIMIT]); // 턴 오류
            } // 조건 종료
        } // 조건 종료
        else // 스탯 조건
        { // 분기 시작
            const stat = stats.find((item) => item.id === event.statId); // 조건 스탯
            if (stat === undefined) // 없는 스탯
            { // 조건 시작
                return t("{0}: 조건으로 쓸 스탯을 골라 주세요.", [label]); // 스탯 오류
            } // 조건 종료
            if (!Number.isInteger(event.value) || event.value < stat.min || event.value > stat.max) // 값 범위
            { // 조건 시작
                return t("{0}: 기준 값은 스탯 범위({1}~{2}) 안의 정수여야 합니다.", [label, stat.min, stat.max]); // 값 오류
            } // 조건 종료
        } // 분기 종료
        if (event.narration.trim().length > EVENT_NARRATION_LIMIT) // 내레이션 길이
        { // 조건 시작
            return t("{0}: 내레이션은 {1}자 이하여야 합니다.", [label, EVENT_NARRATION_LIMIT]); // 길이 오류
        } // 조건 종료
        if (event.title.trim().length > EVENT_TITLE_LIMIT) // 칭호 길이
        { // 조건 시작
            return t("{0}: 칭호는 {1}자 이하여야 합니다.", [label, EVENT_TITLE_LIMIT]); // 길이 오류
        } // 조건 종료
        if (event.narration.trim().length === 0 && event.scene === null && event.title.trim().length === 0 && !event.ending) // 결과 없음
        { // 조건 시작
            return t("{0}: 내레이션·특별 장면·칭호·엔딩 가운데 하나는 정해 주세요.", [label]); // 결과 오류
        } // 조건 종료
    } // 순회 종료
    return null; // 오류 없음
} // 함수 종료
