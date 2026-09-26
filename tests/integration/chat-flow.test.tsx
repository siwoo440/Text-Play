import { describe, expect, it } from "vitest"; // 테스트 도구
import { makeController } from "@/test/chat-fixtures"; // 채팅 제어 생성
import { ChatController } from "@/features/chat/chat-controller"; // 채팅 제어기
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { MockImageAdapter } from "@/lib/adapters/mock-image-adapter"; // Mock 이미지

class ServiceFailureAdapter implements LLMAdapter // 서비스 실패 어댑터
{ // 클래스 시작
    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 일반 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        throw new Error("service unavailable"); // 서비스 오류 발생
    } // 함수 종료

    public async *streamStructuredReply(_input: StructuredLLMInput): AsyncIterable<string> // 구조화 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        throw new Error("service unavailable"); // 서비스 오류 발생
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 미사용 입력 표시
        throw new Error("service unavailable"); // 서비스 오류 발생
    } // 함수 종료
} // 클래스 종료

describe("채팅 흐름", () => // 채팅 묶음
{ // 묶음 시작
    it("응답 대기 중 두 번째 전송을 거절한다", async () => // 중복 전송 검증
    { // 검증 시작
        const controller = makeController({ balance: 100, replyDelayMs: 20 }); // 제어기 생성
        const first = controller.sendMessage("첫 메시지"); // 첫 전송
        const second = await controller.sendMessage("중복 메시지"); // 중복 전송
        await first; // 첫 응답 대기
        expect(second).toEqual({ ok: false, reason: "busy" }); // 거절 결과
        expect(controller.getMessages().filter((message) => message.role === "user")).toHaveLength(2); // 기존 한 건과 새 한 건
    }); // 검증 종료

    it("토큰 부족 시 어떤 대화 상태도 바꾸지 않는다", async () => // 원자성 검증
    { // 검증 시작
        const controller = makeController({ balance: 0, replyDelayMs: 0 }); // 빈 지갑 제어기
        const before = controller.snapshot(); // 변경 전 상태
        const result = await controller.sendMessage("안녕"); // 전송 시도
        expect(result).toEqual({ ok: false, reason: "insufficient-token" }); // 부족 결과
        expect(controller.snapshot()).toEqual(before); // 전체 상태 불변
    }); // 검증 종료

    it("LLM 서비스 실패 시 토큰과 메시지를 이전 상태로 복구한다", async () => // 서비스 실패 원자성 검증
    { // 테스트 시작
        const state = createInitialState(); // 초기 상태 생성
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: new ServiceFailureAdapter(), images: new MockImageAdapter() }); // 실패 제어기 생성
        const before = controller.snapshot(); // 변경 전 상태
        const result = await controller.sendMessage("연결 확인"); // 실패 전송 실행
        expect(result).toEqual({ ok: false, reason: "service-error" }); // 실패 결과 확인
        expect(controller.snapshot()).toEqual(before); // 전체 상태 복구 확인
    }); // 테스트 종료
}); // 묶음 종료
