import type { Character, ChatTierId, ConversationSettings, Persona, StatusTemplate, TierOption, UserProfile } from "@chatbot/features/core/types"; // 도메인 타입

export type WorkExtras = Pick<Character, "playGuide" | "statusTemplate" | "updates">; // 작품 공통 추가 필드

export const DEFAULT_PERSONA_ID = "persona-default"; // 기본 대화 프로필 식별자

export function createDefaultStatusTemplate(enabled = true): StatusTemplate // 기본 상태창 형식
{ // 함수 시작
    return { enabled, location: true, time: true, tip: true, affection: true, thought: true, customLabels: [] }; // 기본 항목 반환
} // 함수 종료

export function createDefaultTierOptions(): Record<ChatTierId, TierOption> // 등급별 기본 답변 설정
{ // 함수 시작
    return { basic: { length: 1, thinking: "off" }, plus: { length: 1, thinking: "off" }, premium: { length: 1, thinking: "off" } }; // 기본 길이·생각 끄기
} // 함수 종료

export function createDefaultConversationSettings(): ConversationSettings // 대화방 기본 설정
{ // 함수 시작
    return { tier: "basic", tierOptions: createDefaultTierOptions(), personaId: null, userNote: "", userNoteExtended: false, writingStyle: "default", preventImpersonation: true }; // 기본 설정 반환
} // 함수 종료

export function createDefaultPersona(profile: Pick<UserProfile, "nickname">, now: string): Persona // 기본 대화 프로필
{ // 함수 시작
    return { id: DEFAULT_PERSONA_ID, name: profile.nickname, description: "", createdAt: now, updatedAt: now }; // 사용자 이름 프로필
} // 함수 종료

export function createDefaultPlayGuide(name: string, summary: string): string // 기본 플레이 가이드 문구
{ // 함수 시작
    return `[플레이 가이드]\n${summary}\n\n상태창 활용\n매 턴 갱신되는 상태창의 장소·시간·속마음과 [팁]을 참고하면 다음 행동을 정하기 쉬워요.\n\n여유로운 플레이\n${name}와(과) 천천히 관계를 쌓아 가며 이야기를 즐겨 주세요.`; // 가이드 반환
} // 함수 종료

export function withWorkDefaults<T extends { summary: string; name?: string; title?: string }>(work: T): T & WorkExtras // 작품 기본 필드 채우기(플레이 가이드·상태창·업데이트 기록)
{ // 함수 시작
    return { ...work, playGuide: createDefaultPlayGuide(work.name ?? work.title ?? "상대", work.summary), statusTemplate: createDefaultStatusTemplate(true), updates: [] }; // 기본 필드 반환
} // 함수 종료
