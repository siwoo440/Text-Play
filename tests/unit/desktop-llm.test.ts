import { describe, expect, it } from "vitest"; // 테스트 도구
import { createDesktopLLMSelection } from "@/desktop/desktop-llm"; // 데스크톱 AI 생성기

describe("데스크톱 AI 선택", () => // AI 선택 묶음
{ // 묶음 시작
    it("서버 환경 값과 관계없이 Mock 공급자를 반환한다", () => // 강제 Mock 검증
    { // 테스트 시작
        const previousMode = process.env.NEXT_PUBLIC_LLM_MODE; // 기존 환경 값
        process.env.NEXT_PUBLIC_LLM_MODE = "server"; // 서버 환경 설정
        const selection = createDesktopLLMSelection(); // 데스크톱 공급자 생성
        expect(selection.mode).toBe("mock"); // Mock 모드 확인
        expect(selection.label).toBe("Mock AI"); // 표시 문구 확인
        if (previousMode === undefined) // 기존 값 부재 확인
        { // 부재 처리 시작
            delete process.env.NEXT_PUBLIC_LLM_MODE; // 환경 값 제거
        } // 부재 처리 종료
        else // 기존 값 존재 처리
        { // 존재 처리 시작
            process.env.NEXT_PUBLIC_LLM_MODE = previousMode; // 기존 환경 복원
        } // 존재 처리 종료
    }); // 테스트 종료
}); // 묶음 종료
