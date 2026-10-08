import type { RelationshipStage, StatDefinition, StatusSnapshot, StatusTemplate } from "@chatbot/features/core/types"; // 도메인 타입
import { resolveRelationshipStage } from "@chatbot/lib/story/story-engine"; // 관계 단계 기준(15·50·80)

const autoStartPresetIds = ["default", "story-opening"]; // 작품이 관계를 따로 정하지 않은 자동 시작 설정

export interface RelationBinding // 대화의 관계 스탯 연결
{ // 구조 시작
    stat: StatDefinition; // 관계 스탯
    lead: string; // 대표 인물(캐릭터 대화는 그 캐릭터, 스토리는 첫 등장인물)
} // 구조 종료

export interface StartRelation // 시작 관계
{ // 구조 시작
    relationshipLevel: number; // 관계 수치(0~100)
    relationshipStage: RelationshipStage; // 관계 단계
} // 구조 종료

export function normalizeRelationStatId(template: Pick<StatusTemplate, "stats" | "relationStatId">): string | null // 관계 스탯 지정 정리(없는 스탯·공통 스탯이면 지정 해제)
{ // 함수 시작
    return template.stats.some((stat) => stat.id === template.relationStatId && stat.scope === "each") ? template.relationStatId : null; // 인물마다 따로인 스탯만
} // 함수 종료

export function getRelationStat(template: StatusTemplate | undefined): StatDefinition | null // 작품의 관계 스탯(상태창을 껐거나 지정이 없으면 없음)
{ // 함수 시작
    if (template === undefined || !template.enabled) // 상태창 없음·끔
    { // 조건 시작
        return null; // 관계 스탯 없음
    } // 조건 종료
    return template.stats.find((stat) => stat.id === template.relationStatId && stat.scope === "each") ?? null; // 지정한 스탯
} // 함수 종료

export function toRelationLevel(stat: Pick<StatDefinition, "min" | "max">, value: number): number // 스탯 값 → 관계 수치(0~100)
{ // 함수 시작
    return Math.max(0, Math.min(100, Math.round(((value - stat.min) / (stat.max - stat.min)) * 100))); // 범위 비율
} // 함수 종료

export function fromRelationLevel(stat: Pick<StatDefinition, "min" | "max">, level: number): number // 관계 수치(0~100) → 스탯 값
{ // 함수 시작
    return Math.max(stat.min, Math.min(stat.max, Math.round(stat.min + (level / 100) * (stat.max - stat.min)))); // 범위 안 값
} // 함수 종료

export function readRelationLevel(status: Pick<StatusSnapshot, "stats"> | null | undefined, stat: StatDefinition, lead: string): number | null // 상태창에서 대표 인물의 관계 수치 읽기
{ // 함수 시작
    const entry = status?.stats.find((item) => item.statId === stat.id && item.target === lead); // 대표 인물 값
    return entry === undefined ? null : toRelationLevel(stat, entry.value); // 환산 반환
} // 함수 종료

export function resolveStartRelation(template: StatusTemplate | undefined, start: { presetId: string } & StartRelation): StartRelation // 대화 시작 관계(정해 둔 시작 설정 우선, 자동 설정이면 관계 스탯 초기값)
{ // 함수 시작
    const stat = getRelationStat(template); // 관계 스탯
    if (stat === null || !autoStartPresetIds.includes(start.presetId)) // 관계 스탯 없음·정해 둔 시작 설정
    { // 조건 시작
        return { relationshipLevel: start.relationshipLevel, relationshipStage: start.relationshipStage }; // 시작 설정 그대로
    } // 조건 종료
    const relationshipLevel = toRelationLevel(stat, stat.initial); // 스탯 초기값 환산
    return { relationshipLevel, relationshipStage: resolveRelationshipStage(relationshipLevel) }; // 초기값으로 시작
} // 함수 종료
