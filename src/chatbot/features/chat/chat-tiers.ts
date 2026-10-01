import type { ChatTierId, ConversationSettings, LengthMultiplier, ThinkingDepth, TierOption } from "@chatbot/features/core/types"; // 도메인 타입

export interface ChatTier // 채팅 모델 등급
{ // 구조 시작
    id: ChatTierId; // 등급 식별자
    label: string; // 표시 이름
    description: string; // 설명
    baseCost: number; // 기본 길이 1회 비용(토큰)
    extraPerBlock: number; // 기본 길이를 넘는 500토큰 구간당 추가 비용
} // 구조 종료

export const BASE_REPLY_TOKENS = 1000; // 기본 답변 최대 길이
export const USER_NOTE_LIMIT = 500; // 유저 노트 기본 글자 수
export const USER_NOTE_EXTENDED_LIMIT = 2000; // 유저 노트 확장 글자 수
export const USER_NOTE_EXTENDED_COST = 1; // 확장 유저 노트 메시지당 추가 비용

export const chatTiers: ChatTier[] = // 등급 목록(Mock 단계 기본값)
[ // 목록 시작
    { id: "premium", label: "프리미엄챗", description: "가장 깊고 섬세한 묘사", baseCost: 8, extraPerBlock: 2 }, // 프리미엄
    { id: "plus", label: "플러스챗", description: "풍부한 묘사와 긴 기억", baseCost: 3, extraPerBlock: 1 }, // 플러스
    { id: "basic", label: "베이직챗", description: "가볍고 빠른 대화", baseCost: 1, extraPerBlock: 1 }, // 베이직
]; // 목록 종료

export const lengthOptions: Array<{ value: LengthMultiplier; label: string }> = [{ value: 1, label: "기본" }, { value: 1.5, label: "1.5x" }, { value: 3, label: "3x" }, { value: 5, label: "5x" }]; // 길이 선택지
export const thinkingOptions: Array<{ value: ThinkingDepth; label: string }> = [{ value: "off", label: "끄기" }, { value: "basic", label: "기본" }, { value: "deep", label: "깊게" }, { value: "deeper", label: "더 깊게" }]; // 생각 깊이 선택지
const thinkingFactor: Record<ThinkingDepth, number> = { off: 0, basic: 0.5, deep: 1, deeper: 2 }; // 생각 깊이 비용 배수

export function getChatTier(id: ChatTierId): ChatTier // 등급 조회
{ // 함수 시작
    return chatTiers.find((tier) => tier.id === id) ?? chatTiers[chatTiers.length - 1]; // 없으면 베이직
} // 함수 종료

export function canUseThinking(length: LengthMultiplier): boolean // 생각 깊이 설정 가능 여부
{ // 함수 시작
    return length >= 1.5; // 1.5배 이상에서만
} // 함수 종료

export function normalizeTierOption(option: TierOption): TierOption // 길이에 맞게 생각 깊이 정리
{ // 함수 시작
    return canUseThinking(option.length) ? option : { length: option.length, thinking: "off" }; // 기본 길이는 생각 끄기
} // 함수 종료

export function getReplyTokenLimit(length: LengthMultiplier): number // 답변 최대 길이(토큰)
{ // 함수 시작
    return Math.round(BASE_REPLY_TOKENS * length); // 길이 반환
} // 함수 종료

export function getTierCost(id: ChatTierId, option: TierOption): number // 등급·길이·생각 깊이 비용
{ // 함수 시작
    const tier = getChatTier(id); // 등급
    const normalized = normalizeTierOption(option); // 정리 설정
    const blocks = Math.ceil((getReplyTokenLimit(normalized.length) - BASE_REPLY_TOKENS) / 500); // 추가 구간 수
    return tier.baseCost + blocks * tier.extraPerBlock + Math.ceil(tier.baseCost * thinkingFactor[normalized.thinking]); // 비용 합계
} // 함수 종료

export function getTierMaxCost(id: ChatTierId): number // 등급 최대 비용(5배·더 깊게)
{ // 함수 시작
    return getTierCost(id, { length: 5, thinking: "deeper" }); // 최대 비용 반환
} // 함수 종료

export function getMessageCost(settings: ConversationSettings): number // 메시지 1회 비용
{ // 함수 시작
    return getTierCost(settings.tier, settings.tierOptions[settings.tier]) + (settings.userNoteExtended ? USER_NOTE_EXTENDED_COST : 0); // 등급 비용 + 유저 노트 확장
} // 함수 종료
