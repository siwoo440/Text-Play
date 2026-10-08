// 응답 방식 요약: 실제 AI가 어느 등급에 연결돼 있는지 읽어, 설정·고객 지원 화면에 보여 줄 글(응답 방식, 외부 전송)을 만든다.
import { chatTiers, type ChatTier } from "@chatbot/features/chat/chat-tiers"; // 채팅 등급
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역
import type { ModelStatus } from "@chatbot/lib/adapters/model-status"; // 실제 AI 상태

export interface ProviderSummary // 실제 AI 연결 요약
{ // 구조 시작
    real: ChatTier[]; // 실제 AI로 답하는 등급(비싼 순서)
    external: ChatTier[]; // 그 가운데 AI 회사로 보내는 등급
    local: ChatTier[]; // 그 가운데 직접 연결한 모델로 보내는 등급
} // 구조 종료

export function summarizeProviders(status: ModelStatus | null): ProviderSummary // 실제 AI 연결 요약(읽기 전이거나 꺼져 있으면 모두 빈 목록)
{ // 함수 시작
    const real = status === null || !status.enabled ? [] : chatTiers.filter((tier) => status.tiers[tier.id] === true); // 실제 AI 등급
    return { real, external: real.filter((tier) => tier.provider !== "local"), local: real.filter((tier) => tier.provider === "local") }; // 요약 반환
} // 함수 종료

function names(tiers: ChatTier[]): string // 등급 이름을 쉼표로 이은 글
{ // 함수 시작
    return tiers.map((tier) => t(tier.label)).join(", "); // 이름 목록
} // 함수 종료

export function describeResponseMode(status: ModelStatus | null): string // 응답 방식 안내(연습용인지, 어느 등급이 실제 AI인지)
{ // 함수 시작
    const { real } = summarizeProviders(status); // 실제 AI 등급
    if (real.length === 0) // 실제 AI 없음
    { // 조건 시작
        return t("로컬 Mock(외부 API 없음)"); // 연습용
    } // 조건 종료
    return real.length === chatTiers.length ? t("실제 AI({0})", [names(real)]) : t("실제 AI({0}) · 나머지 등급은 연습용 응답", [names(real)]); // 실제 AI 등급 안내
} // 함수 종료

export function describeExternalTransfer(status: ModelStatus | null): string // 외부 전송 안내(대화 내용이 어디로 나가는지)
{ // 함수 시작
    const { external, local } = summarizeProviders(status); // 보내는 곳별 등급
    if (external.length === 0 && local.length === 0) // 실제 AI 없음
    { // 조건 시작
        return t("없음 · 로컬 Mock 모드"); // 전송 없음
    } // 조건 종료
    if (external.length === 0) // 직접 연결한 모델만
    { // 조건 시작
        return t("AI 회사로는 없음 · {0}으로 대화하면 대화 내용과 캐릭터 설정이 직접 연결한 모델(기본은 이 컴퓨터)로 전송돼요.", [names(local)]); // 내 모델로만 전송
    } // 조건 종료
    const company = t("있음 · {0}으로 대화하면 대화 내용과 캐릭터 설정이 AI 회사로 전송돼요.", [names(external)]); // AI 회사 전송
    return local.length === 0 ? company : `${company} ${t("{0}은 직접 연결한 모델(기본은 이 컴퓨터)로 전송돼요.", [names(local)])}`; // 내 모델 안내 덧붙임
} // 함수 종료
