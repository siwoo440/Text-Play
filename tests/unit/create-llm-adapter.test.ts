import { describe, expect, it } from "vitest"; // 테스트 도구
import { createLLMAdapter } from "@/lib/adapters/create-llm-adapter"; // LLM 생성기
import { HttpLLMAdapter } from "@/lib/adapters/http-llm-adapter"; // HTTP 어댑터
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // Mock 어댑터

describe("공통 LLM 어댑터 생성기", () => // 생성기 검증 묶음
{ // 묶음 시작
    it("server 모드에서 서비스 어댑터를 선택한다", () => // 서버 모드 검증
    { // 테스트 시작
        const selection = createLLMAdapter("server"); // 서버 어댑터 생성
        expect(selection.mode).toBe("server"); // 모드 확인
        expect(selection.label).toBe("서비스 AI"); // 표시 문구 확인
        expect(selection.adapter).toBeInstanceOf(HttpLLMAdapter); // 어댑터 확인
    }); // 테스트 종료

    it("미설정 값에서는 안전한 Mock 어댑터를 선택한다", () => // 기본 모드 검증
    { // 테스트 시작
        const selection = createLLMAdapter(undefined); // 기본 어댑터 생성
        expect(selection.mode).toBe("mock"); // 모드 확인
        expect(selection.label).toBe("Mock AI"); // 표시 문구 확인
        expect(selection.adapter).toBeInstanceOf(MockLLMAdapter); // 어댑터 확인
    }); // 테스트 종료
}); // 묶음 종료
