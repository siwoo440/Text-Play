import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { describeExternalTransfer, describeResponseMode, summarizeProviders } from "@chatbot/features/settings/provider-summary"; // 응답 방식 요약
import { buildDiagnostics } from "@chatbot/features/settings/settings-insights"; // 진단 정보
import type { ModelStatus } from "@chatbot/lib/adapters/model-status"; // 실제 AI 상태

const none: ModelStatus = { enabled: false, tiers: {}, models: {} }; // 실제 AI 꺼짐
const companies: ModelStatus = { enabled: true, tiers: { plus: true, basic: true, open: false, master: false }, models: {} }; // AI 회사 두 등급만
const localOnly: ModelStatus = { enabled: true, tiers: { open: true }, models: { open: "qwen3-14b-16k" } }; // 내 컴퓨터 모델만
const mixed: ModelStatus = { enabled: true, tiers: { basic: true, open: true }, models: {} }; // 회사와 내 컴퓨터 함께
const everything: ModelStatus = { enabled: true, tiers: { master: true, premium: true, plus: true, balance: true, smart: true, basic: true, open: true }, models: {} }; // 모든 등급

describe("응답 방식과 외부 전송 안내", () => // 요약 묶음
{ // 묶음 시작
    it("실제 AI가 꺼져 있거나 아직 모르면 연습용이라고 알린다", () => // 연습용 검증
    { // 검증 시작
        expect(summarizeProviders(null).real).toEqual([]); // 읽기 전
        expect(describeResponseMode(null)).toBe("로컬 Mock(외부 API 없음)"); // 읽기 전
        expect(describeResponseMode(none)).toBe("로컬 Mock(외부 API 없음)"); // 꺼짐
        expect(describeExternalTransfer(none)).toBe("없음 · 로컬 Mock 모드"); // 전송 없음
        expect(describeResponseMode({ enabled: false, tiers: { basic: true }, models: {} })).toBe("로컬 Mock(외부 API 없음)"); // 스위치가 꺼져 있으면 등급 값은 보지 않음
    }); // 검증 종료

    it("실제 AI로 답하는 등급이 있으면 그 등급 이름을 비싼 순서로 보여 준다", () => // 실제 AI 검증
    { // 검증 시작
        expect(summarizeProviders(companies).external.map((tier) => tier.id)).toEqual(["plus", "basic"]); // AI 회사 등급
        expect(describeResponseMode(companies)).toBe("실제 AI(플러스챗, 베이직챗) · 나머지 등급은 연습용 응답"); // 일부 등급
        expect(describeResponseMode(everything)).toBe("실제 AI(마스터챗, 프리미엄챗, 플러스챗, 밸런스챗, 스마트챗, 베이직챗, 오픈챗)"); // 모든 등급
    }); // 검증 종료

    it("대화 내용이 어디로 나가는지 AI 회사와 직접 연결한 모델을 나눠 알린다", () => // 외부 전송 검증
    { // 검증 시작
        expect(describeExternalTransfer(companies)).toBe("있음 · 플러스챗, 베이직챗으로 대화하면 대화 내용과 캐릭터 설정이 AI 회사로 전송돼요."); // AI 회사
        expect(describeExternalTransfer(localOnly)).toBe("AI 회사로는 없음 · 오픈챗으로 대화하면 대화 내용과 캐릭터 설정이 직접 연결한 모델(기본은 이 컴퓨터)로 전송돼요."); // 내 컴퓨터 모델
        expect(describeExternalTransfer(mixed)).toBe("있음 · 베이직챗으로 대화하면 대화 내용과 캐릭터 설정이 AI 회사로 전송돼요. 오픈챗은 직접 연결한 모델(기본은 이 컴퓨터)로 전송돼요."); // 둘 다
    }); // 검증 종료

    it("진단 정보의 응답 방식에도 실제 AI 연결 상태가 들어간다", () => // 진단 정보 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const text = buildDiagnostics({ appVersion: "1.0.0", state, storageBytes: 2048, viewport: null, userAgent: null, responseMode: describeResponseMode(localOnly) }); // 진단 정보
        expect(text).toContain("응답 방식: 실제 AI(오픈챗) · 나머지 등급은 연습용 응답\n"); // 실제 상태
        expect(text).not.toContain("qwen3"); // 모델 이름 같은 내 설정은 넣지 않음
    }); // 검증 종료
}); // 묶음 종료
