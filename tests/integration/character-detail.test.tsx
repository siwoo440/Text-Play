import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { ensureConversationForCharacter } from "@/features/character/CharacterDetail"; // 대화 준비 함수

describe("캐릭터 상세 대화 시작", () => // 상세 묶음
{ // 묶음 시작
    it("기존 대화방을 재사용한다", () => // 재사용 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const result = ensureConversationForCharacter(state, "rian", "2026-09-23T00:00:00.000Z"); // 대화 준비
        expect(result.conversation.id).toBe("conversation-rian"); // 기존 식별자
        expect(result.state.conversations).toHaveLength(state.conversations.length); // 개수 유지
        expect(result.href).toBe("/chat/rian"); // 이동 경로
    }); // 검증 종료

    it("대화방이 없으면 하나만 생성한다", () => // 생성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const result = ensureConversationForCharacter(state, "harin", "2026-09-23T00:00:00.000Z"); // 첫 생성
        const repeated = ensureConversationForCharacter(result.state, "harin", "2026-09-23T00:01:00.000Z"); // 재호출
        expect(repeated.state.conversations.filter((conversation) => conversation.characterId === "harin")).toHaveLength(1); // 단일 생성
        expect(repeated.href).toBe("/chat/harin"); // 이동 경로
    }); // 검증 종료
}); // 묶음 종료
