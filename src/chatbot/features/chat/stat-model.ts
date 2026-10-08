import type { ChatTierId, ContentRating, StatDefinition, StatMode, StatRule, StatScope, StatusSnapshot, StatusTemplate, StatValue } from "@chatbot/features/core/types"; // 도메인 타입
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

export const STAT_LIMIT = 6; // 작품당 스탯 최대 수
export const STAT_RULE_LIMIT = 5; // 스탯당 낱말 규칙 최대 수
export const STAT_NAME_LIMIT = 10; // 스탯 이름 최대 글자 수
export const STAT_ICON_LIMIT = 8; // 아이콘 최대 길이(이모지 조합 포함)
export const STAT_KEYWORD_LIMIT = 20; // 낱말 규칙 최대 글자 수
export const STAT_VALUE_BOUND = 99999; // 값 절댓값 한도
export const STAT_CHANGE_BOUND = 100; // 한 번 변화 절댓값 한도
export const AFFECTION_STAT_ID = "affection"; // 기본 호감도 스탯 식별자

export const statModes: Array<{ id: StatMode; label: string; description: string }> = // 정하는 방법
[ // 목록 시작
    { id: "rule", label: "규칙대로", description: "매 턴 변화와 낱말 규칙으로만 바뀌어요" }, // 규칙
    { id: "ai", label: "AI가 판단", description: "대화 흐름을 보고 AI가 올리거나 내려요" }, // AI 판단
    { id: "both", label: "규칙 + AI", description: "규칙 변화에 AI 판단을 더해요" }, // 둘 다
]; // 목록 종료

export const statScopes: Array<{ id: StatScope; label: string }> = [{ id: "each", label: "인물마다 따로" }, { id: "shared", label: "하나만(공통)" }]; // 적용 대상

export interface StatChange // 스탯 변화(AI 판단 결과)
{ // 구조 시작
    statId: string; // 스탯 식별자
    target: string | null; // 인물(공통이면 null)
    delta: number; // 변화
} // 구조 종료

export interface StatBaseline // 직전 상태창에 값이 없을 때의 시작 값(관계 스탯은 대화의 관계 수치에서 이어받음)
{ // 구조 시작
    statId: string; // 스탯 식별자
    target: string | null; // 인물(공통이면 null)
    value: number; // 시작 값
} // 구조 종료

export interface StatJudgeInput // AI 판단 입력
{ // 구조 시작
    stats: Array<{ statId: string; name: string; target: string | null; value: number; min: number; max: number; maxChange: number }>; // AI가 정할 스탯과 현재 값
    userMessage: string; // 이번 사용자 메시지
    reply: string; // 이번 응답
    emotion: string; // 이번 감정
    context?: StatJudgeContext; // 실제 AI에 맡길 때 쓰는 문맥(없으면 연습용 규칙만)
} // 구조 종료

export interface StatJudgeContext // 스탯 판단 문맥
{ // 구조 시작
    tier: ChatTierId; // 채팅 등급
    contentRating: ContentRating; // 작품 이용 등급
    userName: string; // 사용자 이름
    speakerName: string; // 답한 쪽 이름(캐릭터의 짧은 이름, 스토리는 「이야기」)
} // 구조 종료

function hash(text: string): number // 결정 해시
{ // 함수 시작
    return [...text].reduce((total, character) => (total * 31 + (character.codePointAt(0) ?? 0)) >>> 0, 11); // 해시 반환
} // 함수 종료

function clamp(value: number, min: number, max: number): number // 범위 제한
{ // 함수 시작
    return Math.max(min, Math.min(max, Math.round(value))); // 반올림 후 제한
} // 함수 종료

export function createStat(index: number): StatDefinition // 새 스탯 기본값
{ // 함수 시작
    return { id: `stat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}-${index}`, name: "", icon: "", initial: 0, min: 0, max: 100, mode: "both", perTurn: 0, rules: [], aiMaxChange: 5, scope: "each" }; // 0~100, 규칙 + AI
} // 함수 종료

export function createAffectionStat(): StatDefinition // 기본 호감도 스탯(초기값 0)
{ // 함수 시작
    return { id: AFFECTION_STAT_ID, name: "호감도", icon: "❤️", initial: 0, min: 0, max: 100, mode: "both", perTurn: 0, rules: [{ keyword: "고마워", delta: 2 }, { keyword: "선물", delta: 5 }], aiMaxChange: 5, scope: "each" }; // 호감도 반환
} // 함수 종료

export function getStatTargets(stat: StatDefinition, people: readonly string[]): Array<string | null> // 스탯이 적용될 대상
{ // 함수 시작
    return stat.scope === "shared" || people.length === 0 ? [null] : [...people]; // 공통은 하나, 아니면 인물마다
} // 함수 종료

export function computeRuleDelta(stat: StatDefinition, userMessage: string): number // 규칙 변화(매 턴 + 낱말)
{ // 함수 시작
    if (stat.mode === "ai") // AI만 판단
    { // 조건 시작
        return 0; // 규칙 없음
    } // 조건 종료
    const text = userMessage.toLowerCase(); // 비교 문장
    return stat.perTurn + stat.rules.filter((rule) => rule.keyword.trim().length > 0 && text.includes(rule.keyword.trim().toLowerCase())).reduce((total, rule) => total + rule.delta, 0); // 합계 반환
} // 함수 종료

function previousValue(stat: StatDefinition, target: string | null, previous: StatusSnapshot | null, baselines: readonly StatBaseline[]): number // 직전 값(없으면 기준선, 그것도 없으면 초기값)
{ // 함수 시작
    const found = previous?.stats.find((item) => item.statId === stat.id && item.target === target); // 직전 턴 값
    const baseline = baselines.find((item) => item.statId === stat.id && item.target === target); // 이어받을 시작 값
    return clamp(found?.value ?? baseline?.value ?? stat.initial, stat.min, stat.max); // 범위 안 값
} // 함수 종료

export function currentStatValues(template: StatusTemplate | undefined, people: readonly string[], previous: StatusSnapshot | null, baselines: readonly StatBaseline[] = []): StatValue[] // 지금 스탯 값(첫 응답 전에는 기준선·초기값)
{ // 함수 시작
    if (template === undefined || !template.enabled) // 상태창 끔
    { // 조건 시작
        return []; // 없음
    } // 조건 종료
    return template.stats.flatMap((stat) => getStatTargets(stat, people).map((target) => ({ statId: stat.id, name: stat.name, icon: stat.icon, target, value: previousValue(stat, target, previous, baselines), delta: 0, min: stat.min, max: stat.max }))); // 값 목록
} // 함수 종료

export function computeStats(input: { stats: StatDefinition[]; people: readonly string[]; previous: StatusSnapshot | null; userMessage: string; aiChanges: readonly StatChange[]; baselines?: readonly StatBaseline[] }): StatValue[] // 이번 턴 스탯 계산(규칙 + AI 판단, 범위 제한)
{ // 함수 시작
    return input.stats.flatMap((stat) => getStatTargets(stat, input.people).map((target) => // 스탯·대상 순회
    { // 계산 시작
        const before = previousValue(stat, target, input.previous, input.baselines ?? []); // 직전 값
        const ai = stat.mode === "rule" ? 0 : clamp(input.aiChanges.find((change) => change.statId === stat.id && change.target === target)?.delta ?? 0, -stat.aiMaxChange, stat.aiMaxChange); // AI 변화(한도 안)
        const value = clamp(before + computeRuleDelta(stat, input.userMessage) + ai, stat.min, stat.max); // 이번 값
        return { statId: stat.id, name: stat.name, icon: stat.icon, target, value, delta: value - before, min: stat.min, max: stat.max }; // 값 반환
    })); // 계산 종료
} // 함수 종료

export function buildStatJudgeInput(template: StatusTemplate | undefined, people: readonly string[], previous: StatusSnapshot | null, userMessage: string, reply: string, emotion: string, baselines: readonly StatBaseline[] = []): StatJudgeInput // AI 판단 입력(AI가 정하는 스탯만)
{ // 함수 시작
    const stats = template === undefined || !template.enabled ? [] : template.stats.filter((stat) => stat.mode !== "rule").flatMap((stat) => getStatTargets(stat, people).map((target) => ({ statId: stat.id, name: stat.name, target, value: previousValue(stat, target, previous, baselines), min: stat.min, max: stat.max, maxChange: stat.aiMaxChange }))); // 판단 대상
    return { stats, userMessage, reply, emotion }; // 입력 반환
} // 함수 종료

const warmNames = /호감|신뢰|애정|친밀|우정|관심|사랑|행복|기분|유대|믿음/; // 좋은 대화에 오르는 스탯
const coldNames = /경계|의심|분노|긴장|스트레스|질투|공포|두려|불신|피로/; // 좋은 대화에 내리는 스탯
const positiveWords = /고마|좋아|사랑|함께|같이|웃|기뻐|칭찬|선물|도와|믿어|안아|괜찮|최고|예뻐|멋져|보고 싶|미안/g; // 긍정 표현
const negativeWords = /싫어|화나|짜증|미워|거짓|무시|꺼져|바보|실망|귀찮|때리|협박|닥쳐|시끄러/g; // 부정 표현

export function judgeStatsMock(input: StatJudgeInput): StatChange[] // Mock AI 판단(같은 입력이면 같은 결과)
{ // 함수 시작
    const positive = input.userMessage.match(positiveWords)?.length ?? 0; // 긍정 수
    const negative = input.userMessage.match(negativeWords)?.length ?? 0; // 부정 수
    const mood = /설렘|기쁨|기대|관심|호기심|즐거/.test(input.emotion) ? 1 : /긴장|불안|경계|당황|슬픔/.test(input.emotion) ? -1 : 0; // 감정 보정
    const sentiment = positive * 2 - negative * 3 + mood; // 대화 분위기
    return input.stats.map((stat) => // 스탯 순회
    { // 판단 시작
        const drift = [-1, 0, 0, 1][hash(`${input.userMessage}|${stat.statId}|${stat.target ?? ""}`) % 4]; // 작은 흔들림
        const raw = warmNames.test(stat.name) ? sentiment : coldNames.test(stat.name) ? -sentiment : drift; // 이름 성격별 변화
        return { statId: stat.statId, target: stat.target, delta: clamp(raw, -stat.maxChange, stat.maxChange) }; // 한도 안 변화
    }); // 판단 종료
} // 함수 종료

export function formatStatValue(stat: Pick<StatValue, "value" | "min" | "max">): string // 값 표시(0~100처럼 좁은 범위는 최댓값 함께)
{ // 함수 시작
    return stat.max - stat.min <= 100 ? `${stat.value}/${stat.max}` : stat.value.toLocaleString(localeTag()); // 표시 문자열
} // 함수 종료

export function formatStatDelta(delta: number): string // 변화 표시
{ // 함수 시작
    return `${delta > 0 ? "+" : ""}${delta}`; // 표시 예: +2·-1·0
} // 함수 종료

export function normalizeStats(stats: readonly StatDefinition[]): StatDefinition[] // 스탯 정리(앞뒤 공백, 빈 낱말 규칙 제거)
{ // 함수 시작
    return stats.map((stat) => ({ ...stat, name: stat.name.trim(), icon: stat.icon.trim(), rules: stat.rules.map((rule) => ({ keyword: rule.keyword.trim(), delta: rule.delta })).filter((rule) => rule.keyword.length > 0) })); // 정리 반환
} // 함수 종료

function isWholeNumber(value: number, bound: number): boolean // 정수·범위 판정
{ // 함수 시작
    return Number.isInteger(value) && Math.abs(value) <= bound; // 정수와 한도
} // 함수 종료

export function validateStats(stats: readonly StatDefinition[]): string | null // 스탯 검증(첫 오류 문구)
{ // 함수 시작
    if (stats.length > STAT_LIMIT) // 개수 판정
    { // 조건 시작
        return t("스탯은 {0}개까지 만들 수 있습니다.", [STAT_LIMIT]); // 개수 오류
    } // 조건 종료
    const names = new Set<string>(); // 이름 중복 확인
    for (const stat of stats) // 스탯 순회
    { // 순회 시작
        const name = stat.name.trim(); // 이름
        const label = name.length === 0 ? t("이름 없는 스탯") : `‘${name}’`; // 오류 표시 이름
        if (name.length === 0 || name.length > STAT_NAME_LIMIT) // 이름 길이
        { // 조건 시작
            return t("스탯 이름은 1~{0}자로 적어 주세요.", [STAT_NAME_LIMIT]); // 이름 오류
        } // 조건 종료
        if (names.has(name)) // 이름 중복
        { // 조건 시작
            return t("스탯 이름 {0}이(가) 겹칩니다.", [label]); // 중복 오류
        } // 조건 종료
        names.add(name); // 기록
        if (stat.icon.trim().length > STAT_ICON_LIMIT) // 아이콘 길이
        { // 조건 시작
            return t("{0} 아이콘은 이모지 한두 개로 적어 주세요.", [label]); // 아이콘 오류
        } // 조건 종료
        if (![stat.initial, stat.min, stat.max].every((value) => isWholeNumber(value, STAT_VALUE_BOUND))) // 숫자 판정
        { // 조건 시작
            return t("{0}의 초기값·최솟값·최댓값은 -{1}~{2} 사이 정수로 적어 주세요.", [label, STAT_VALUE_BOUND, STAT_VALUE_BOUND]); // 숫자 오류
        } // 조건 종료
        if (stat.min >= stat.max) // 범위 판정
        { // 조건 시작
            return t("{0}의 최솟값은 최댓값보다 작아야 합니다.", [label]); // 범위 오류
        } // 조건 종료
        if (stat.initial < stat.min || stat.initial > stat.max) // 초기값 판정
        { // 조건 시작
            return t("{0}의 초기값은 {1}~{2} 사이여야 합니다.", [label, stat.min, stat.max]); // 초기값 오류
        } // 조건 종료
        if (!isWholeNumber(stat.perTurn, STAT_CHANGE_BOUND)) // 매 턴 변화 판정
        { // 조건 시작
            return t("{0}의 매 턴 변화는 -{1}~{2} 사이 정수로 적어 주세요.", [label, STAT_CHANGE_BOUND, STAT_CHANGE_BOUND]); // 변화 오류
        } // 조건 종료
        if (stat.rules.length > STAT_RULE_LIMIT) // 규칙 수 판정
        { // 조건 시작
            return t("{0}의 낱말 규칙은 {1}개까지 만들 수 있습니다.", [label, STAT_RULE_LIMIT]); // 규칙 수 오류
        } // 조건 종료
        if (stat.rules.some((rule: StatRule) => rule.keyword.trim().length === 0 || rule.keyword.trim().length > STAT_KEYWORD_LIMIT || !isWholeNumber(rule.delta, STAT_CHANGE_BOUND) || rule.delta === 0)) // 규칙 내용 판정
        { // 조건 시작
            return t("{0}의 낱말 규칙은 낱말(1~{1}자)과 0이 아닌 변화(-{2}~{3})가 필요합니다.", [label, STAT_KEYWORD_LIMIT, STAT_CHANGE_BOUND, STAT_CHANGE_BOUND]); // 규칙 오류
        } // 조건 종료
        if (!Number.isInteger(stat.aiMaxChange) || stat.aiMaxChange < 1 || stat.aiMaxChange > STAT_CHANGE_BOUND) // AI 한도 판정
        { // 조건 시작
            return t("{0}의 AI 한 턴 최대 변화는 1~{1} 사이 정수로 적어 주세요.", [label, STAT_CHANGE_BOUND]); // AI 한도 오류
        } // 조건 종료
    } // 순회 종료
    return null; // 오류 없음
} // 함수 종료

export function upgradeStatusTemplate(value: Record<string, unknown>): Omit<StatusTemplate, "relationStatId"> // 버전 12 상태창 형식 → 버전 13 스탯 형식(호감도 켬이면 기본 호감도, 관계 스탯 지정은 버전 14에서)
{ // 함수 시작
    const { affection, ...rest } = value; // 호감도 분리
    return { ...(rest as Omit<StatusTemplate, "stats" | "relationStatId">), stats: affection === true ? [createAffectionStat()] : [] }; // 변환 반환
} // 함수 종료

export function upgradeStatusSnapshot(value: Record<string, unknown>): StatusSnapshot // 버전 12 상태창 값 → 스탯 값(호감도 0~100)
{ // 함수 시작
    if (Array.isArray(value.stats)) // 이미 새 형식
    { // 조건 시작
        return value as unknown as StatusSnapshot; // 그대로
    } // 조건 종료
    const { affection, ...rest } = value; // 호감도 분리
    const items = Array.isArray(affection) ? affection as Array<{ name: string; value: number; delta: number }> : []; // 이전 호감도
    return { ...(rest as Omit<StatusSnapshot, "stats">), stats: items.map((item) => ({ statId: AFFECTION_STAT_ID, name: "호감도", icon: "❤️", target: item.name, value: item.value, delta: item.delta, min: 0, max: 100 })) }; // 변환 반환
} // 함수 종료

export function toVersionTwelveTemplate(template: StatusTemplate): Record<string, unknown> // 스탯 형식 → 버전 12 형식(이전 단계 변환용)
{ // 함수 시작
    const { stats, relationStatId, ...rest } = template; // 스탯·관계 지정 분리
    void relationStatId; // 버전 12에는 관계 스탯 지정이 없음
    return { ...rest, affection: stats.length > 0 }; // 호감도 켬 여부
} // 함수 종료
