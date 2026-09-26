import { describe, expect, it } from "vitest"; // 테스트 도구
import { evaluateStory } from "@/lib/story/story-engine"; // 스토리 판정
import { mockConversations } from "@/mocks/fixtures"; // Mock 대화

describe("스토리 엔진", () => // 스토리 묶음
{ // 묶음 시작
    it("메시지와 관계 수치로 감정과 관계 단계를 결정한다", () => // 관계 검증
    { // 검증 시작
        const update = evaluateStory({ conversation: { ...mockConversations[0], relationshipLevel: 48 }, userMessage: "오늘도 고마워", userMessageCount: 2 }); // 판정 실행
        expect(update.relationshipLevel).toBe(51); // 관계 증가
        expect(update.relationshipStage).toBe("가까운 사이"); // 단계 변화
        expect(update.emotion).toBe("기쁨"); // 감정 변화
    }); // 검증 종료

    it("세 번째 사용자 메시지를 중요 사건으로 판정한다", () => // 사건 검증
    { // 검증 시작
        const update = evaluateStory({ conversation: mockConversations[0], userMessage: "계속 이야기해 줘", userMessageCount: 3 }); // 판정 실행
        expect(update.importantEvent).toBe(true); // 사건 확인
        expect(update.sceneId).toBe("dawn"); // 장면 확인
    }); // 검증 종료
}); // 묶음 종료
