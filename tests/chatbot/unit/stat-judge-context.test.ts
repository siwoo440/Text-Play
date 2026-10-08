import { describe, expect, it } from "vitest"; // 테스트 도구
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import type { StatJudgeInput } from "@chatbot/features/chat/stat-model"; // 스탯 판단 입력
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { LLMAdapter } from "@chatbot/lib/adapters/llm-adapter"; // 대화 어댑터
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터

describe("스탯 판단에 넘기는 문맥", () => // 문맥 묶음
{ // 묶음 시작
    it("제어기는 스탯 판단을 맡길 때 채팅 등급과 작품 등급, 이름을 함께 넘긴다", async () => // 문맥 전달 검증
    { // 검증 시작
        const judged: StatJudgeInput[] = []; // 받은 판단 입력
        const llm: LLMAdapter = { async *streamReply() { yield "기록해 둘게."; }, summarizeConversation: async () => "요약", judgeStats: async (input) => { judged.push(input); return []; } }; // 판단 입력을 기록하는 어댑터
        const state = createInitialState(); // 초기 상태
        const conversation = state.conversations.find((item) => item.id === "conversation-rian"); // 리안 대화
        if (conversation === undefined) // 대화 없음
        { // 조건 시작
            throw new Error("리안 대화를 찾지 못했습니다."); // 준비 오류
        } // 조건 종료
        conversation.settings = { ...conversation.settings, tier: "open" }; // 오픈챗으로 대화
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm, images: new MockImageAdapter() }); // 제어기
        expect((await controller.sendMessage("오늘 일정 기억나?")).ok).toBe(true); // 전송
        expect(judged).toHaveLength(1); // 판단 한 번
        expect(judged[0].context).toEqual({ tier: "open", contentRating: "all", userName: state.personas[0].name, speakerName: "리안" }); // 등급과 이름(대화 프로필을 고르지 않았으면 기본 프로필의 이름)
        expect(judged[0].userMessage).toBe("오늘 일정 기억나?"); // 이번 말
        expect(judged[0].reply).toBe("기록해 둘게."); // 이번 답
    }); // 검증 종료
}); // 묶음 종료
