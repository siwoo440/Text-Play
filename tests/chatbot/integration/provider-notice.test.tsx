import { screen } from "@testing-library/react"; // 화면 검증 도구
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { NotificationSettings } from "@chatbot/features/settings/NotificationSettings"; // 알림 설정
import { PrivacySettings } from "@chatbot/features/settings/PrivacySettings"; // 개인정보 및 보안
import { SupportScreen } from "@chatbot/features/support/SupportScreen"; // 고객 지원
import { resetModelStatus } from "@chatbot/lib/adapters/model-status"; // 실제 AI 상태 기억 지우기
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

function answer(body: unknown): void // 서버 통로가 돌려줄 실제 AI 상태 정하기
{ // 함수 시작
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }))); // 가짜 서버 답
} // 함수 종료

describe("실제 AI 연결 상태 안내", () => // 안내 묶음
{ // 묶음 시작
    beforeEach(() => resetModelStatus()); // 앞 테스트의 기억 지우기

    afterEach(() => // 정리
    { // 정리 시작
        vi.unstubAllGlobals(); // 가짜 서버 치우기
        resetModelStatus(); // 기억 지우기
    }); // 정리 종료

    it("실제 AI가 꺼져 있으면 개인정보 화면과 고객 지원이 연습용이라고 알린다", async () => // 연습용 검증
    { // 검증 시작
        answer({ enabled: false, tiers: {}, models: {} }); // 실제 AI 꺼짐
        renderWithApp(<><PrivacySettings /><SupportScreen /></>); // 두 화면
        expect(await screen.findByText("없음 · 로컬 Mock 모드")).toBeInTheDocument(); // 외부 전송 없음
        expect(screen.getByText("로컬 Mock(외부 API 없음)")).toBeInTheDocument(); // 응답 방식
    }); // 검증 종료

    it("실제 AI가 켜져 있으면 어느 등급이 어디로 보내는지 알린다", async () => // 실제 AI 검증
    { // 검증 시작
        answer({ enabled: true, tiers: { basic: true, open: true, plus: false }, models: { open: "qwen3-14b-16k" } }); // 베이직챗과 오픈챗
        renderWithApp(<><PrivacySettings /><SupportScreen /></>); // 두 화면
        expect(await screen.findByText("있음 · 베이직챗으로 대화하면 대화 내용과 캐릭터 설정이 AI 회사로 전송돼요. 오픈챗은 직접 연결한 모델(기본은 이 컴퓨터)로 전송돼요.")).toBeInTheDocument(); // 외부 전송
        expect(screen.getByText("실제 AI(베이직챗, 오픈챗) · 나머지 등급은 연습용 응답")).toBeInTheDocument(); // 응답 방식
        expect(screen.queryByText("없음 · 로컬 Mock 모드")).toBeNull(); // 예전 문구 없음
    }); // 검증 종료

    it("알림 설정은 아직 발송되지 않고 설정만 저장한다고 알린다", () => // 알림 안내 검증
    { // 검증 시작
        answer({ enabled: true, tiers: { basic: true }, models: {} }); // 실제 AI가 켜져 있어도
        renderWithApp(<NotificationSettings />); // 알림 설정
        expect(screen.getByText("준비 중인 기능이에요. 지금은 설정만 저장하고 메시지와 알림을 실제로 보내지 않아요. 발송 서버가 연결된 뒤 제공됩니다.")).toBeInTheDocument(); // 준비 중 안내
    }); // 검증 종료
}); // 묶음 종료
