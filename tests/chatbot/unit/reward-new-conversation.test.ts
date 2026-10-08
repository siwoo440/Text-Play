import { describe, expect, it } from "vitest"; // 테스트 도구
import type { AppAction } from "@chatbot/features/core/app-reducer"; // 앱 동작
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, Message } from "@chatbot/features/core/types"; // 상태 타입
import { trackRewardProgress } from "@chatbot/features/rewards/reward-tracker"; // 미션 진행 추적

const now = "2026-10-05T03:00:00.000Z"; // 기준 시각(한국 시간 10월 5일 월요일 낮)
const conversationId = "conversation-started-from-detail"; // 상세 화면의 시작 버튼으로 만든 대화

function withSavedConversation(): AppState // 대화를 먼저 저장해 둔 상태(내 말은 아직 없음)
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    const source = state.conversations[0]; // 본뜰 대화
    const version = state.conversationVersions.find((item) => item.id === source.currentVersionId); // 본뜰 버전
    if (version === undefined) // 버전 없음
    { // 조건 시작
        throw new Error("기본 대화의 버전을 찾지 못했습니다."); // 준비 오류
    } // 조건 종료
    const versionId = `${conversationId}-version-1`; // 새 버전 식별자
    const greeting: Message = { id: `${conversationId}-message-1`, conversationId, versionId, sourceMessageId: null, role: "assistant", content: "기다리고 있었어.", emotion: null, sceneEvent: null, createdAt: now }; // 캐릭터의 첫 인사
    return { ...state, conversations: [...state.conversations, { ...source, id: conversationId, currentVersionId: versionId }], conversationVersions: [...state.conversationVersions, { ...version, id: versionId, conversationId }], messages: [...state.messages, greeting] }; // 저장해 둔 상태
} // 함수 종료

function send(state: AppState, order: number): { next: AppState; action: AppAction } // 그 대화에 내 말과 답을 하나씩 더한 상태와 저장 동작
{ // 함수 시작
    const versionId = `${conversationId}-version-1`; // 버전
    const mine: Message = { id: `${conversationId}-user-${order}`, conversationId, versionId, sourceMessageId: null, role: "user", content: `말 ${order}`, emotion: null, sceneEvent: null, createdAt: now }; // 내 말
    const reply: Message = { ...mine, id: `${conversationId}-assistant-${order}`, role: "assistant", content: `답 ${order}` }; // 답
    const next = { ...state, messages: [...state.messages, mine, reply] }; // 다음 상태
    return { next, action: { type: "merge-chat-state", conversationId, state: next, allowCreate: false } }; // 채팅 저장 동작
} // 함수 종료

describe("새 대화 시작하기 미션", () => // 미션 묶음
{ // 묶음 시작
    it("상세 화면에서 먼저 저장해 둔 대화도 내가 처음 말을 보내면 새 대화 시작으로 센다", () => // 시작 버튼 검증
    { // 검증 시작
        const saved = withSavedConversation(); // 먼저 저장된 대화
        const first = send(saved, 1); // 첫 말
        const afterFirst = trackRewardProgress(saved, first.next, first.action, now); // 미션 반영
        expect(afterFirst.rewards.missions.progress).toMatchObject({ "send-messages": 1, "start-conversation": 1 }); // 메시지와 새 대화가 함께 오름
        expect(afterFirst.rewards.weekly?.progress).toMatchObject({ "weekly-messages": 1, "weekly-conversations": 1 }); // 주간 미션도 오름
        const second = send(afterFirst, 2); // 같은 대화의 둘째 말
        const afterSecond = trackRewardProgress(afterFirst, second.next, second.action, now); // 미션 반영
        expect(afterSecond.rewards.missions.progress["send-messages"]).toBe(2); // 메시지만 오름
        expect(afterSecond.rewards.weekly?.progress["weekly-conversations"]).toBe(1); // 새 대화는 다시 오르지 않음
    }); // 검증 종료

    it("이미 내가 말한 적 있는 대화에 이어 보내면 새 대화로 세지 않는다", () => // 이어 하기 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태(리안 대화에는 내 말이 이미 있음)
        const rian = "conversation-rian"; // 리안 대화
        const mine: Message = { id: `${rian}-user-9`, conversationId: rian, versionId: `${rian}-version-1`, sourceMessageId: null, role: "user", content: "이어서 왔어", emotion: null, sceneEvent: null, createdAt: now }; // 이어 보낸 말
        const next = { ...state, messages: [...state.messages, mine] }; // 다음 상태
        const after = trackRewardProgress(state, next, { type: "merge-chat-state", conversationId: rian, state: next, allowCreate: false }, now); // 미션 반영
        expect(after.rewards.missions.progress["send-messages"]).toBe(1); // 메시지는 오름
        expect(after.rewards.missions.progress["start-conversation"] ?? 0).toBe(0); // 새 대화는 아님
    }); // 검증 종료
}); // 묶음 종료
