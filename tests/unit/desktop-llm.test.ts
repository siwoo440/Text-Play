import { describe, expect, it } from "vitest"; // 테스트 도구
import { createDesktopLLMSelection } from "@/desktop/desktop-llm"; // 데스크톱 AI 생성기
import { OllamaLLMAdapter } from "@/lib/adapters/ollama-llm-adapter"; // 올라마 어댑터
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // 임시 어댑터

describe("데스크톱 AI 선택", () => // AI 선택 묶음
{ // 묶음 시작
    it("임시 인공지능 설정에서 네트워크 없는 공급자를 반환한다", () => // 임시 공급자 검증
    { // 테스트 시작
        const selection = createDesktopLLMSelection({ schemaVersion: 2, themeId: "dark-fantasy", resolutionId: "fit", aiProviderId: "mock", localModelId: null }); // 데스크톱 공급자 생성
        expect(selection.mode).toBe("mock"); // Mock 모드 확인
        expect(selection.label).toBe("임시 인공지능"); // 표시 문구 확인
        expect(selection.adapter).toBeInstanceOf(MockLLMAdapter); // 임시 어댑터 확인
    }); // 테스트 종료

    it("올라마 설정에서 선택한 로컬 모델 공급자를 반환한다", () => // 올라마 공급자 검증
    { // 테스트 시작
        const selection = createDesktopLLMSelection({ schemaVersion: 2, themeId: "dark-fantasy", resolutionId: "fit", aiProviderId: "ollama", localModelId: "qwen3:8b" }); // 데스크톱 공급자 생성
        expect(selection.mode).toBe("ollama"); // 올라마 모드 확인
        expect(selection.label).toBe("로컬 · qwen3:8b"); // 표시 문구 확인
        expect(selection.adapter).toBeInstanceOf(OllamaLLMAdapter); // 올라마 어댑터 확인
    }); // 테스트 종료
}); // 묶음 종료
