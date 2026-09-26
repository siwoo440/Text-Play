import { describe, expect, it } from "vitest"; // 테스트 도구
import { createConversationExport } from "@/features/conversation/conversation-export"; // 대화 내보내기
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 생성

describe("대화 내보내기", () => // 내보내기 묶음
{ // 묶음 시작
    it("선택 대화와 연결 메시지만 내보낸다", () => // 단일 내보내기 검증
    { // 테스트 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 대상 대화 선택
        const exported = createConversationExport(conversation, state.messages); // 내보내기 생성
        expect(exported.conversation.id).toBe(conversation.id); // 대화 식별자 확인
        expect(exported.messages.every((message) => message.conversationId === conversation.id)).toBe(true); // 연결 메시지 확인
        expect(exported.messages.length).toBeGreaterThan(0); // 메시지 존재 확인
    }); // 테스트 종료
}); // 묶음 종료
