import type { LLMSelection } from "@/lib/adapters/create-llm-adapter"; // AI 선택 계약
import { createTauriOllamaClient } from "@/desktop/tauri-ollama-client"; // Tauri 올라마 통신기
import type { TextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 게임 설정 계약
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // Mock AI 어댑터
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약
import { OllamaLLMAdapter } from "@/lib/adapters/ollama-llm-adapter"; // 올라마 대화 어댑터

export function createDesktopLLMSelection(preferences: TextPlayPreferences, client: OllamaClient = createTauriOllamaClient()): LLMSelection // 데스크톱 AI 생성기
{ // 함수 시작
    if (preferences.aiProviderId === "ollama" && preferences.localModelId !== null) // 올라마 선택 확인
    { // 조건 시작
        return { adapter: new OllamaLLMAdapter(preferences.localModelId, client), mode: "ollama", label: `로컬 · ${preferences.localModelId}` }; // 올라마 선택 반환
    } // 조건 종료
    return { adapter: new MockLLMAdapter(), mode: "mock", label: "임시 인공지능" }; // 임시 선택 반환
} // 함수 종료
