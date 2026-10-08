import { screen, waitFor } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // 연습용 AI
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/chat/rian", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

vi.setConfig({ testTimeout: 20_000 }); // 화면이 큰 테스트라 넉넉히 기다림

describe("입력창의 글 지키기", () => // 입력창 묶음
{ // 묶음 시작
    it("토큰이 모자라 보내지 못하면 쓴 글이 입력칸에 그대로 남는다", async () => // 토큰 부족 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태
        state.wallet.balance = 0; // 잔액 없음
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />, state); // 채팅 화면 렌더
        const box = screen.getByRole("textbox", { name: "메시지" }); // 입력창
        await user.type(box, "길게 쓴 글이 사라지면 곤란해요{Enter}"); // 보내기
        expect(await screen.findByText("토큰이 부족합니다.")).toBeInTheDocument(); // 부족 안내
        await waitFor(() => expect(box).toHaveValue("길게 쓴 글이 사라지면 곤란해요")); // 쓴 글 유지
        expect(screen.queryByText("길게 쓴 글이 사라지면 곤란해요", { selector: "li p" })).toBeNull(); // 메시지로 추가되지 않음
    }); // 테스트 종료

    it("보내기가 받아들여지면 전처럼 입력칸을 비운다", async () => // 정상 전송 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        const box = screen.getByRole("textbox", { name: "메시지" }); // 입력창
        await user.type(box, "오늘도 왔어{Enter}"); // 보내기
        expect(await screen.findByText("오늘도 왔어", { selector: "li p" })).toBeInTheDocument(); // 메시지로 추가됨
        await waitFor(() => expect(box).toBeEnabled()); // 응답 완료
        expect(box).toHaveValue(""); // 입력칸 비움
    }); // 테스트 종료
}); // 묶음 종료
