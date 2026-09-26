import { ChatController } from "@/features/chat/chat-controller"; // 채팅 제어기
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { MockImageAdapter } from "@/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // Mock 대화

export function makeController({ balance, replyDelayMs }: { balance: number; replyDelayMs: number }): ChatController // 테스트 제어기 생성
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.wallet.balance = balance; // 잔액 교체
    return new ChatController({ state, conversationId: "conversation-rian", llm: new MockLLMAdapter({ delayMs: replyDelayMs, seed: 7 }), images: new MockImageAdapter() }); // 제어기 반환
} // 함수 종료
