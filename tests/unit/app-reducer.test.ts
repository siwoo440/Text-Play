import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@/features/core/app-reducer"; // 상태 리듀서
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태

describe("앱 상태 리듀서", () => // 리듀서 묶음
{ // 묶음 시작
    it("패널과 설정을 불변 방식으로 변경한다", () => // 설정 변경 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const toggled = appReducer(state, { type: "toggle-right-panel" }); // 패널 전환
        const updated = appReducer(toggled, { type: "update-settings", settings: { platformMode: "tablet" } }); // 설정 변경
        expect(updated.settings.rightPanelOpen).toBe(true); // 패널 결과
        expect(updated.settings.platformMode).toBe("tablet"); // 설정 결과
        expect(state.settings.rightPanelOpen).toBe(false); // 원본 유지
    }); // 검증 종료

    it("메시지를 추가하고 대화방을 선택한다", () => // 대화 상태 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const message = { id: "message-new", conversationId: "conversation-sera", role: "user" as const, content: "안녕", emotion: null, sceneEvent: null, createdAt: "2026-09-23T00:00:00.000Z" }; // 새 메시지
        const withMessage = appReducer(state, { type: "add-message", message }); // 메시지 추가
        const selected = appReducer(withMessage, { type: "select-conversation", conversationId: "conversation-sera" }); // 대화 선택
        expect(selected.messages.at(-1)).toEqual(message); // 메시지 확인
        expect(selected.selectedConversationId).toBe("conversation-sera"); // 선택 확인
    }); // 검증 종료

    it("토큰 부족 시 전체 상태를 그대로 반환한다", () => // 원자성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.wallet.balance = 0; // 빈 지갑
        const next = appReducer(state, { type: "spend-token", action: "manual-image" }); // 차감 시도
        expect(next).toBe(state); // 상태 동일성
    }); // 검증 종료

    it("캐릭터 삭제 시 연결 데이터와 보관 상태를 함께 제거한다", () => // 연쇄 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        state.bookmarkedCharacterIds = ["rian"]; // 보관 상태 적용
        const next = appReducer(state, { type: "delete-character", characterId: "rian" }); // 캐릭터 삭제
        expect(next.characters.some((character) => character.id === "rian")).toBe(false); // 캐릭터 제거 확인
        expect(next.conversations.some((conversation) => conversation.characterId === "rian")).toBe(false); // 대화 제거 확인
        expect(next.messages.some((message) => message.conversationId === "conversation-rian")).toBe(false); // 메시지 제거 확인
        expect(next.bookmarkedCharacterIds).toEqual([]); // 보관 제거 확인
        expect(next.selectedConversationId).toBeNull(); // 선택 해제 확인
    }); // 검증 종료

    it("보관 토글은 중복 없이 추가하고 제거한다", () => // 보관 토글 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const added = appReducer(state, { type: "toggle-bookmark", characterId: "rian" }); // 보관 추가
        const removed = appReducer(added, { type: "toggle-bookmark", characterId: "rian" }); // 보관 제거
        expect(added.bookmarkedCharacterIds).toEqual(["rian"]); // 추가 결과 확인
        expect(removed.bookmarkedCharacterIds).toEqual([]); // 제거 결과 확인
    }); // 검증 종료

    it("존재하지 않는 캐릭터는 보관하지 않는다", () => // 잘못된 보관 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const next = appReducer(state, { type: "toggle-bookmark", characterId: "missing" }); // 잘못된 보관 시도
        expect(next).toBe(state); // 기존 상태 확인
    }); // 검증 종료

    it("프로필의 이름과 이미지를 변경한다", () => // 프로필 변경 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const next = appReducer(state, { type: "update-profile", profile: { nickname: "새 사용자", avatar: "🌙" } }); // 프로필 변경
        expect(next.profile.nickname).toBe("새 사용자"); // 이름 확인
        expect(next.profile.avatar).toBe("🌙"); // 이미지 확인
        expect(next.profile.membership).toBe(state.profile.membership); // 멤버십 유지
    }); // 검증 종료

    it("대화 이름을 다듬고 보관한 뒤 복구한다", () => // 대화 관리 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const target = state.conversations[0]; // 대상 대화 선택
        const renamed = appReducer(state, { type: "rename-conversation", conversationId: target.id, title: "  새 대화 이름  " }); // 이름 변경
        const archived = appReducer(renamed, { type: "archive-conversation", conversationId: target.id, archivedAt: "2026-09-24T00:00:00.000Z" }); // 대화 보관
        const restored = appReducer(archived, { type: "restore-conversation", conversationId: target.id }); // 대화 복구
        expect(renamed.conversations[0]?.title).toBe("새 대화 이름"); // 정리된 이름 확인
        expect(archived.conversations[0]?.archivedAt).toBe("2026-09-24T00:00:00.000Z"); // 보관 시각 확인
        expect(restored.conversations[0]?.archivedAt).toBeNull(); // 복구 상태 확인
    }); // 검증 종료

    it("빈 이름과 너무 긴 이름은 대화 이름을 바꾸지 않는다", () => // 이름 제한 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const target = state.conversations[0]; // 대상 대화 선택
        const empty = appReducer(state, { type: "rename-conversation", conversationId: target.id, title: "   " }); // 빈 이름 변경
        const long = appReducer(state, { type: "rename-conversation", conversationId: target.id, title: "가".repeat(61) }); // 긴 이름 변경
        expect(empty).toBe(state); // 빈 이름 거부 확인
        expect(long).toBe(state); // 긴 이름 거부 확인
    }); // 검증 종료

    it("대화 삭제 시 메시지와 선택 상태를 함께 정리한다", () => // 대화 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const target = state.conversations[0]; // 삭제 대상 선택
        state.selectedConversationId = target.id; // 현재 대화 설정
        const next = appReducer(state, { type: "delete-conversation", conversationId: target.id }); // 삭제 실행
        expect(next.conversations.some((conversation) => conversation.id === target.id)).toBe(false); // 대화 제거 확인
        expect(next.messages.some((message) => message.conversationId === target.id)).toBe(false); // 메시지 제거 확인
        expect(next.selectedConversationId).toBeNull(); // 선택 해제 확인
    }); // 검증 종료
}); // 묶음 종료
