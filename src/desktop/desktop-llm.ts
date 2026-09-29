import type { LLMSelection } from "@/lib/adapters/create-llm-adapter"; // AI 선택 계약
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // Mock AI 어댑터

export function createDesktopLLMSelection(): LLMSelection // 데스크톱 AI 생성기
{ // 함수 시작
    return { adapter: new MockLLMAdapter(), mode: "mock", label: "Mock AI" }; // 강제 Mock 선택 반환
} // 함수 종료
