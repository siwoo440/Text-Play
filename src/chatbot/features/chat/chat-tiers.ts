import type { ChatTierId, ConversationSettings, LengthMultiplier, ThinkingDepth, TierOption } from "@chatbot/features/core/types"; // 도메인 타입

export type ChatProvider = "gemini" | "openai" | "anthropic" | "local"; // 모델이 있는 곳(Google·OpenAI·Anthropic·내 컴퓨터)

export interface ChatTier // 채팅 모델 등급
{ // 구조 시작
    id: ChatTierId; // 등급 식별자
    label: string; // 표시 이름(별명)
    model: string; // 연결하는 모델 이름(화면 표시용, 실제로 보내는 값은 서버의 model-catalog.ts)
    provider: ChatProvider; // 모델이 있는 곳
    mature: boolean; // 19세 작품에 답할 수 있는지(외부 AI 회사는 약관으로 금지, 직접 돌리는 공개 모델만 가능)
    description: string; // 설명
    baseCost: number; // 기본 길이 1회 비용(토큰)
    extraPerBlock: number; // 기본 길이를 넘는 500토큰 구간당 추가 비용
} // 구조 종료

export const BASE_REPLY_TOKENS = 1000; // 기본 답변 최대 길이
export const USER_NOTE_LIMIT = 500; // 유저 노트 기본 글자 수
export const USER_NOTE_EXTENDED_LIMIT = 2000; // 유저 노트 확장 글자 수
export const USER_NOTE_EXTENDED_COST = 1; // 확장 유저 노트 메시지당 추가 비용(노트가 기본 글자 수를 넘을 때만)
export const THINKING_DEPTH_ENABLED: boolean = false; // 생각 깊이 사용 여부(아직 답변에 반영되지 않아 화면·비용·요청에서 뺌. 실제로 반영하게 되면 켬)

export const chatTiers: ChatTier[] = // 등급 목록(비싼 순서, 토큰 비용은 개발 기본값이라 실제 요금을 보고 다시 정함)
[ // 목록 시작
    { id: "master", label: "마스터챗", model: "Claude Fable", provider: "anthropic", description: "최상위 모델의 가장 섬세한 이야기", mature: false, baseCost: 12, extraPerBlock: 3 }, // 마스터
    { id: "premium", label: "프리미엄챗", model: "Claude Opus", provider: "anthropic", description: "가장 깊고 섬세한 묘사", mature: false, baseCost: 8, extraPerBlock: 2 }, // 프리미엄
    { id: "plus", label: "플러스챗", model: "Claude Sonnet", provider: "anthropic", description: "풍부한 묘사와 긴 기억", mature: false, baseCost: 3, extraPerBlock: 1 }, // 플러스
    { id: "balance", label: "밸런스챗", model: "GPT", provider: "openai", description: "고르게 잘하는 대화", mature: false, baseCost: 2, extraPerBlock: 1 }, // 밸런스
    { id: "smart", label: "스마트챗", model: "Gemini Pro", provider: "gemini", description: "차분하고 꼼꼼한 대화", mature: false, baseCost: 2, extraPerBlock: 1 }, // 스마트
    { id: "basic", label: "베이직챗", model: "Gemini Flash", provider: "gemini", description: "가볍고 빠른 대화", mature: false, baseCost: 1, extraPerBlock: 1 }, // 베이직
    { id: "open", label: "오픈챗", model: "공개 모델", provider: "local", description: "내 컴퓨터 모델 · 19세 작품 가능", mature: true, baseCost: 1, extraPerBlock: 1 }, // 오픈(직접 돌리는 공개 모델)
]; // 목록 종료

const defaultTierOption: TierOption = { length: 1, thinking: "off" }; // 기본 길이·생각 끄기

export function getTierOption(tierOptions: ConversationSettings["tierOptions"], id: ChatTierId): TierOption // 등급별 설정 읽기(저장된 값이 없으면 기본값)
{ // 함수 시작
    return tierOptions[id] ?? defaultTierOption; // 설정 반환
} // 함수 종료

export function fillTierOptions(tierOptions: ConversationSettings["tierOptions"]): Record<ChatTierId, TierOption> // 모든 등급의 설정 채우기(편집 화면용)
{ // 함수 시작
    return Object.fromEntries(chatTiers.map((tier) => [tier.id, { ...getTierOption(tierOptions, tier.id) }])) as Record<ChatTierId, TierOption>; // 채운 설정 반환
} // 함수 종료

export const lengthOptions: Array<{ value: LengthMultiplier; label: string }> = [{ value: 1, label: "기본" }, { value: 1.5, label: "1.5x" }, { value: 3, label: "3x" }, { value: 5, label: "5x" }]; // 길이 선택지
export const thinkingOptions: Array<{ value: ThinkingDepth; label: string }> = [{ value: "off", label: "끄기" }, { value: "basic", label: "기본" }, { value: "deep", label: "깊게" }, { value: "deeper", label: "더 깊게" }]; // 생각 깊이 선택지
const thinkingFactor: Record<ThinkingDepth, number> = { off: 0, basic: 0.5, deep: 1, deeper: 2 }; // 생각 깊이 비용 배수

export function getChatTier(id: ChatTierId): ChatTier // 등급 조회
{ // 함수 시작
    return chatTiers.find((tier) => tier.id === id) ?? chatTiers.find((tier) => tier.id === "basic") ?? chatTiers[0]; // 없으면 베이직
} // 함수 종료

export function canUseThinking(length: LengthMultiplier): boolean // 생각 깊이 설정 가능 여부
{ // 함수 시작
    return THINKING_DEPTH_ENABLED && length >= 1.5; // 기능이 켜져 있고 1.5배 이상일 때만
} // 함수 종료

export function normalizeTierOption(option: TierOption): TierOption // 길이에 맞게 생각 깊이 정리
{ // 함수 시작
    return canUseThinking(option.length) ? option : { length: option.length, thinking: "off" }; // 쓸 수 없으면 생각 끄기(예전에 저장한 값도 여기서 꺼짐)
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

export function getTierMaxCost(id: ChatTierId): number // 등급 최대 비용(5배·더 깊게. 생각 깊이가 꺼져 있으면 5배만)
{ // 함수 시작
    return getTierCost(id, { length: 5, thinking: "deeper" }); // 최대 비용 반환
} // 함수 종료

export function getMessageCost(settings: ConversationSettings): number // 메시지 1회 비용
{ // 함수 시작
    const noteExtra = settings.userNoteExtended && settings.userNote.length > USER_NOTE_LIMIT ? USER_NOTE_EXTENDED_COST : 0; // 유저 노트 확장 비용(확장을 켜고 기본 글자 수를 넘게 적었을 때만)
    return getTierCost(settings.tier, getTierOption(settings.tierOptions, settings.tier)) + noteExtra; // 등급 비용 + 유저 노트 확장
} // 함수 종료
