// 실제 AI 상태: 어느 채팅 등급이 실제 AI로 답할 수 있는지 서버 통로에 한 번 물어 기억한다. 물어볼 수 없으면(서버 없음·오류) 모두 연습용으로 본다.
import type { ChatTierId } from "@chatbot/features/core/types"; // 등급 식별자

export interface ModelStatus // 실제 AI 상태
{ // 구조 시작
    enabled: boolean; // 실제 AI 스위치
    tiers: Partial<Record<ChatTierId, boolean>>; // 등급별 사용 가능 여부
    models: Partial<Record<ChatTierId, string>>; // 내 컴퓨터 모델의 이름(화면 표시용)
} // 구조 종료

export const offlineModelStatus: ModelStatus = { enabled: false, tiers: {}, models: {} }; // 모두 연습용

let cached: Promise<ModelStatus> | null = null; // 한 번 물은 결과

function normalize(value: unknown): ModelStatus // 서버 답을 상태로(모양이 다르면 모두 연습용)
{ // 함수 시작
    if (typeof value !== "object" || value === null) // 객체 아님
    { // 조건 시작
        return offlineModelStatus; // 연습용
    } // 조건 종료
    const record = value as { enabled?: unknown; tiers?: unknown; models?: unknown }; // 서버 답
    const tiers = typeof record.tiers === "object" && record.tiers !== null ? Object.fromEntries(Object.entries(record.tiers).map(([tier, ready]) => [tier, ready === true])) : {}; // 등급별 여부
    const models = typeof record.models === "object" && record.models !== null ? Object.fromEntries(Object.entries(record.models).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)) : {}; // 모델 이름(글자만)
    return { enabled: record.enabled === true, tiers, models }; // 상태 반환
} // 함수 종료

export function loadModelStatus(fetcher: typeof fetch = (...args) => fetch(...args)): Promise<ModelStatus> // 상태 읽기(같은 화면에서는 한 번만 물음)
{ // 함수 시작
    cached ??= Promise.resolve().then(() => fetcher("/api/chat", { cache: "no-store" })).then((response) => response.ok ? response.json() as Promise<unknown> : null).then(normalize).catch(() => offlineModelStatus); // 실패하면 연습용
    return cached; // 결과 반환
} // 함수 종료

export function resetModelStatus(): void // 기억 지우기(테스트용)
{ // 함수 시작
    cached = null; // 다시 묻게 함
} // 함수 종료
