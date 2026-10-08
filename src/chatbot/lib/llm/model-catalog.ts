// 모델 목록(서버 전용): 채팅 등급마다 어느 회사(또는 내 컴퓨터)의 어떤 모델로 답할지 정하고, 열쇠가 있는지 확인한다. 열쇠는 서버 환경 변수에서만 읽는다.
import { chatTiers, type ChatProvider } from "@chatbot/features/chat/chat-tiers"; // 채팅 등급
import type { ChatTierId } from "@chatbot/features/core/types"; // 등급 식별자

export type ChatEnv = Record<string, string | undefined>; // 환경 변수 모음

export interface ResolvedModel // 등급에 연결된 실제 모델
{ // 구조 시작
    provider: ChatProvider; // AI 회사
    model: string; // 모델 이름(회사에 보내는 값)
    apiKey: string; // 열쇠
    baseUrl: string; // 요청 주소
    reasoningEffort?: string; // 생각 세기(내 컴퓨터 모델에만 보냄, 없으면 보내지 않음)
} // 구조 종료

const defaultModels: Record<ChatTierId, string> = // 등급별 기본 모델 이름(CHAT_MODEL_등급 환경 변수로 바꿀 수 있음)
{ // 목록 시작
    basic: "gemini-2.5-flash", // 베이직챗
    smart: "gemini-2.5-pro", // 스마트챗
    balance: "gpt-5", // 밸런스챗
    plus: "claude-sonnet-5-5", // 플러스챗
    premium: "claude-opus-5-5", // 프리미엄챗
    master: "claude-fable-5-1", // 마스터챗
    open: "", // 오픈챗(기본값 없음: 설치한 모델 이름을 CHAT_MODEL_OPEN에 적어야 연결됨)
}; // 목록 종료

const providerSettings: Record<ChatProvider, { keyName: string; baseUrlName: string; baseUrl: string; keyRequired: boolean }> = // 회사별 열쇠 이름과 주소
{ // 목록 시작
    gemini: { keyName: "GEMINI_API_KEY", baseUrlName: "GEMINI_BASE_URL", baseUrl: "https://generativelanguage.googleapis.com/v1beta", keyRequired: true }, // Google(Gemini를 만든 회사)
    openai: { keyName: "OPENAI_API_KEY", baseUrlName: "OPENAI_BASE_URL", baseUrl: "https://api.openai.com/v1", keyRequired: true }, // OpenAI(같은 형식을 쓰는 다른 회사는 주소만 바꿈)
    anthropic: { keyName: "ANTHROPIC_API_KEY", baseUrlName: "ANTHROPIC_BASE_URL", baseUrl: "https://api.anthropic.com/v1", keyRequired: true }, // Anthropic(Claude를 만든 회사)
    local: { keyName: "LOCAL_API_KEY", baseUrlName: "LOCAL_BASE_URL", baseUrl: "http://127.0.0.1:11434/v1", keyRequired: false }, // 내 컴퓨터(Ollama 기본 주소, 열쇠 없이 씀. 빌린 서버로 옮기면 주소와 열쇠만 바꿈)
}; // 목록 종료

function readEnv(env: ChatEnv, name: string): string // 환경 변수 읽기(앞뒤 빈칸 제거)
{ // 함수 시작
    return (env[name] ?? "").trim(); // 값 반환
} // 함수 종료

export function isRealChatEnabled(env: ChatEnv = process.env): boolean // 실제 AI 사용 여부(명시적으로 켠 경우만)
{ // 함수 시작
    return readEnv(env, "ENABLE_REAL_PROVIDERS") === "true"; // 스위치 확인
} // 함수 종료

export function resolveModel(tier: ChatTierId, env: ChatEnv = process.env): ResolvedModel | null // 등급의 실제 모델(스위치가 꺼졌거나 열쇠가 없으면 없음)
{ // 함수 시작
    const definition = chatTiers.find((item) => item.id === tier); // 등급 정의
    if (definition === undefined || !isRealChatEnabled(env)) // 없는 등급·스위치 꺼짐
    { // 조건 시작
        return null; // 연습용으로
    } // 조건 종료
    const settings = providerSettings[definition.provider]; // 회사 설정
    const apiKey = readEnv(env, settings.keyName); // 열쇠
    const model = readEnv(env, `CHAT_MODEL_${tier.toUpperCase()}`) || defaultModels[tier]; // 모델 이름(환경 변수 우선)
    if ((settings.keyRequired && apiKey.length === 0) || model.length === 0) // 열쇠 없음·모델 이름 없음
    { // 조건 시작
        return null; // 연습용으로
    } // 조건 종료
    const baseUrl = (readEnv(env, settings.baseUrlName) || settings.baseUrl).replace(/\/+$/, ""); // 요청 주소(끝의 / 제거)
    if (definition.provider !== "local") // AI 회사
    { // 조건 시작
        return { provider: definition.provider, model, apiKey, baseUrl }; // 모델 반환
    } // 조건 종료
    const effort = readEnv(env, "LOCAL_REASONING_EFFORT") || "none"; // 생각 세기(기본은 끔: 생각하는 모델이 답을 늦추지 않게)
    return { provider: definition.provider, model, apiKey, baseUrl, reasoningEffort: effort === "skip" ? undefined : effort }; // 내 컴퓨터 모델 반환(skip이면 생각 세기를 보내지 않음)
} // 함수 종료

export function getLocalModelNames(env: ChatEnv = process.env): Partial<Record<ChatTierId, string>> // 내 컴퓨터 모델의 이름(화면 표시용. 열쇠가 아니라 내보내도 됨)
{ // 함수 시작
    return Object.fromEntries(chatTiers.flatMap((tier) => // 등급 순회
    { // 순회 시작
        const model = tier.provider === "local" ? resolveModel(tier.id, env) : null; // 내 컴퓨터 등급만
        return model === null ? [] : [[tier.id, model.model]]; // 연결된 것만
    })); // 이름 반환
} // 함수 종료

export function getTierAvailability(env: ChatEnv = process.env): Record<ChatTierId, boolean> // 등급별 실제 AI 사용 가능 여부(열쇠 값은 내보내지 않음)
{ // 함수 시작
    return Object.fromEntries(chatTiers.map((tier) => [tier.id, resolveModel(tier.id, env) !== null])) as Record<ChatTierId, boolean>; // 가능 여부 반환
} // 함수 종료
