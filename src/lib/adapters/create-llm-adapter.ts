import { HttpLLMAdapter } from "@/lib/adapters/http-llm-adapter"; // HTTP 어댑터
import type { LLMAdapter } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // Mock 어댑터

export type LLMMode = "mock" | "server" | "ollama" | "bundled"; // LLM 실행 모드

export interface LLMSelection // LLM 선택 결과
{ // 구조 시작
    adapter: LLMAdapter; // 선택 어댑터
    mode: LLMMode; // 선택 모드
    label: string; // 표시 문구
} // 구조 종료

export function createLLMAdapter(mode: string | undefined = process.env.NEXT_PUBLIC_LLM_MODE): LLMSelection // 공통 LLM 생성기
{ // 함수 시작
    if (mode === "server") // 서버 모드 확인
    { // 조건 시작
        return { adapter: new HttpLLMAdapter(), mode: "server", label: "서비스 AI" }; // 서버 선택 반환
    } // 조건 종료
    return { adapter: new MockLLMAdapter(), mode: "mock", label: "Mock AI" }; // Mock 선택 반환
} // 함수 종료
