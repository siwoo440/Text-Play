import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer, type AppAction } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, Message } from "@chatbot/features/core/types"; // 상태 타입
import { trackRewardProgress } from "@chatbot/features/rewards/reward-tracker"; // 미션 진행 추적

const now = "2026-10-03T12:00:00+09:00"; // 기준 시각(한국 시간 10월 3일)
const run = (state: AppState, action: AppAction, at = now) => trackRewardProgress(state, appReducer(state, action), action, at); // 동작 뒤 추적까지

function userMessage(id: string): Message // 리안 대화의 사용자 메시지
{ // 함수 시작
    return { id, conversationId: "conversation-rian", versionId: "conversation-rian-version-1", sourceMessageId: null, role: "user", content: "안녕", emotion: null, sceneEvent: null, createdAt: "2026-10-03T03:00:00.000Z" }; // 메시지 반환
} // 함수 종료

function chatWith(global: AppState, messages: Message[], spent: number): AppState // 채팅 화면이 가진 상태
{ // 함수 시작
    const chat = structuredClone(global); // 전역 복사
    chat.messages = [...chat.messages, ...messages]; // 새 메시지
    chat.wallet = { ...chat.wallet, balance: chat.wallet.balance - spent, totalUsed: chat.wallet.totalUsed + spent }; // 쓴 토큰
    return chat; // 채팅 상태 반환
} // 함수 종료

describe("미션 진행 추적", () => // 추적 묶음
{ // 묶음 시작
    it("채팅에서 새로 보낸 내 메시지만큼 메시지 미션이 오르고, 목표에 닿으면 알림을 한 번 보낸다", () => // 메시지 미션
    { // 검증 시작
        let state = createInitialState(); // 초기 상태
        state = run(state, { type: "merge-chat-state", conversationId: "conversation-rian", state: chatWith(state, [userMessage("u1"), userMessage("u2")], 2), allowCreate: false }); // 2번 보냄
        expect(state.rewards.missions).toMatchObject({ dateKey: "2026-10-03", progress: { "send-messages": 2 } }); // 진행 2/5 확인
        expect(state.notifications.some((item) => item.kind === "reward")).toBe(false); // 아직 알림 없음
        state = run(state, { type: "merge-chat-state", conversationId: "conversation-rian", state: chatWith(state, [], 1), allowCreate: false }); // 다시 생성(새 메시지 없음)
        expect(state.rewards.missions.progress["send-messages"]).toBe(2); // 그대로
        state = run(state, { type: "merge-chat-state", conversationId: "conversation-rian", state: chatWith(state, [userMessage("u3"), userMessage("u4"), userMessage("u5")], 3), allowCreate: false }); // 3번 더
        expect(state.rewards.missions.progress["send-messages"]).toBe(5); // 진행 5/5 확인
        expect(state.notifications[0]).toMatchObject({ id: "reward-mission-2026-10-03-send-messages", kind: "reward", title: "오늘의 미션 완료", href: "/rewards", read: false }); // 완료 알림
        state = run(state, { type: "merge-chat-state", conversationId: "conversation-rian", state: chatWith(state, [userMessage("u6")], 1), allowCreate: false }); // 더 보냄
        expect(state.notifications.filter((item) => item.kind === "reward")).toHaveLength(1); // 알림은 한 번
    }); // 검증 종료

    it("채팅에서 처음 저장한 대화는 새 대화 미션으로 센다", () => // 새 대화 미션
    { // 검증 시작
        const chat = createInitialState(); // 채팅 상태(리안 대화 포함)
        const global = appReducer(createInitialState(), { type: "delete-conversation", conversationId: "conversation-rian" }); // 전역에는 없는 대화
        const created = run(global, { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: true }); // 첫 저장
        expect(created.rewards.missions.progress["start-conversation"]).toBe(1); // 진행 1/1 확인
        const again = run(created, { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: false }); // 같은 대화 다시 저장
        expect(again.rewards.missions.progress["start-conversation"]).toBe(1); // 그대로
    }); // 검증 종료

    it("좋아요나 보관을 새로 하면 세고, 취소했다 다시 눌러도 하루 한 번이다", () => // 좋아요·보관 미션
    { // 검증 시작
        let state = run(createInitialState(), { type: "toggle-character-like", characterId: "rian" }); // 좋아요
        expect(state.rewards.missions.progress["favorite-work"]).toBe(1); // 진행 1/1 확인
        state = run(state, { type: "toggle-character-like", characterId: "rian" }); // 취소
        state = run(state, { type: "toggle-character-like", characterId: "rian" }); // 다시
        state = run(state, { type: "toggle-bookmark", characterId: "rian" }); // 보관
        expect(state.rewards.missions.progress["favorite-work"]).toBe(1); // 여전히 1
        expect(state.notifications.filter((item) => item.kind === "reward")).toHaveLength(1); // 알림 한 번
        const removed = run(createInitialState(), { type: "toggle-bookmark", characterId: "없는-캐릭터" }); // 없는 캐릭터
        expect(removed.rewards.missions.progress["favorite-work"]).toBeUndefined(); // 세지 않음
    }); // 검증 종료

    it("데이터 복원이나 다른 동작은 미션으로 세지 않는다", () => // 제외 동작
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        const restored = structuredClone(base); // 복원할 상태
        restored.messages = [...restored.messages, userMessage("u1")]; // 메시지가 늘어난 백업
        restored.likedCharacterIds = ["rian"]; // 좋아요가 있는 백업
        expect(run(base, { type: "replace-state", state: restored }).rewards).toEqual(base.rewards); // 복원은 제외
        expect(run(base, { type: "update-settings", settings: { leftPanelOpen: false } }).rewards).toBe(base.rewards); // 설정 변경 제외
    }); // 검증 종료

    it("날짜가 바뀌면 새 날의 진행으로 다시 센다", () => // 날짜 변경
    { // 검증 시작
        let state = run(createInitialState(), { type: "toggle-character-like", characterId: "rian" }); // 3일 좋아요
        state = run(state, { type: "toggle-character-like", characterId: "sera" }, "2026-10-04T09:00:00+09:00"); // 4일 좋아요
        expect(state.rewards.missions).toMatchObject({ dateKey: "2026-10-04", progress: { "favorite-work": 1 }, claimed: [] }); // 새 날 기록
        expect(state.notifications.filter((item) => item.kind === "reward").map((item) => item.id)).toEqual(["reward-mission-2026-10-04-favorite-work", "reward-mission-2026-10-03-favorite-work"]); // 날짜별 알림
    }); // 검증 종료
}); // 묶음 종료

describe("채팅 병합과 지갑", () => // 지갑 묶음
{ // 묶음 시작
    it("채팅이 쓴 만큼만 차감하고, 그 사이 다른 곳에서 받은 토큰은 남긴다", () => // 지갑 병합
    { // 검증 시작
        const start = createInitialState(); // 채팅을 열 때 상태
        const chat = chatWith(start, [userMessage("u1")], 4); // 채팅에서 4토큰 사용
        const rewarded = appReducer(start, { type: "check-attendance", now }); // 그 사이 출석 5토큰
        const merged = appReducer(rewarded, { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: false }); // 채팅 병합
        expect(merged.wallet.balance).toBe(start.wallet.balance + 5 - 4); // 받은 것 유지, 쓴 것 차감
        expect(merged.wallet.totalUsed).toBe(start.wallet.totalUsed + 4); // 누적 사용
        expect(merged.tokenRecords.map((record) => record.source)).toEqual(["chat", "attendance"]); // 받은 기록은 남고 쓴 기록이 더해짐
        const idle = appReducer(rewarded, { type: "merge-chat-state", conversationId: "conversation-rian", state: chatWith(start, [], 0), allowCreate: false }); // 쓴 토큰 없는 병합
        expect(idle.wallet).toEqual(rewarded.wallet); // 지갑 그대로
    }); // 검증 종료
}); // 묶음 종료
