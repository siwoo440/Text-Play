import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import type { LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 어댑터 타입
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
})); // 대체 종료

class CapturingLLMAdapter implements LLMAdapter // 입력 기록 어댑터
{ // 클래스 시작
    public inputs: LLMInput[] = []; // 받은 입력

    public async *streamReply(input: LLMInput): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        this.inputs.push(input); // 입력 기록
        yield "기록한 응답"; // 응답
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 요약
    { // 함수 시작
        void _input; // 사용 표시
        return Promise.resolve("요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

function BalanceProbe() // 잔액 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="잔액 확인">{state.wallet.balance}</output>; // 잔액
} // 함수 종료

function prepared(note: string): AppState // 플러스챗 3배·생각 「더 깊게」·유저 노트 확장을 저장해 둔 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    const conversation = state.conversations.find((item) => item.id === "conversation-rian"); // 리안 대화
    if (conversation === undefined) // 대화 없음
    { // 조건 시작
        throw new Error("리안 대화를 찾지 못했습니다."); // 준비 오류
    } // 조건 종료
    conversation.settings = { ...conversation.settings, tier: "plus", tierOptions: { ...conversation.settings.tierOptions, plus: { length: 3, thinking: "deeper" } }, userNoteExtended: true, userNote: note }; // 예전에 저장한 설정
    return state; // 준비 상태
} // 함수 종료

function renderChat(llm: LLMAdapter, note = ""): void // 채팅 렌더
{ // 함수 시작
    renderWithApp(<><ChatScreen characterId="rian" llm={llm} images={new MockImageAdapter()} /><BalanceProbe /></>, prepared(note)); // 리안 대화
} // 함수 종료

async function send(user: ReturnType<typeof userEvent.setup>, text: string): Promise<void> // Enter로 보내고 끝까지 기다리기
{ // 함수 시작
    await user.type(screen.getByLabelText("메시지"), `${text}{Enter}`); // 입력 후 Enter
    await waitFor(() => expect(screen.getByLabelText("메시지")).toBeEnabled()); // 응답 완료
} // 함수 종료

const balance = () => Number(screen.getByLabelText("잔액 확인").textContent); // 잔액 읽기

describe("토큰만 나가던 설정", () => // 비용 설정 묶음
{ // 묶음 시작
    it("생각 깊이는 답변에 반영될 때까지 화면에 없고, 예전에 저장해 둔 값도 요청과 비용에 들어가지 않는다", async () => // 생각 깊이 숨김 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const llm = new CapturingLLMAdapter(); // 기록 어댑터
        renderChat(llm); // 렌더
        const menu = screen.getByRole("region", { name: "채팅방 설정 메뉴" }); // 설정 메뉴
        const item = within(menu).getByRole("button", { name: /^답변 길이 조절/ }); // 길이 조절 메뉴
        expect(item).toHaveAccessibleName(/3x/); // 고른 길이 표시
        expect(item).not.toHaveAccessibleName(/생각/); // 생각 표시 없음
        await user.click(item); // 열기
        const dialog = screen.getByRole("dialog", { name: "답변 길이 조절" }); // 대화상자
        const row = within(dialog).getByRole("button", { name: /^플러스챗/ }); // 플러스챗 줄
        expect(row).toHaveTextContent("최대 11 토큰"); // 3 + 5배 구간 8개(생각 깊이 몫 없음)
        await user.click(row); // 펼치기
        expect(within(dialog).getAllByRole("slider")).toHaveLength(1); // 길이 조절만
        expect(within(dialog).queryByText("생각 깊이")).toBeNull(); // 생각 깊이 없음
        await user.click(within(dialog).getByRole("button", { name: "저장" })); // 닫기
        const before = balance(); // 보내기 전 잔액
        await send(user, "오늘 일정 기억나?"); // 전송
        expect(llm.inputs.at(-1)?.options?.thinking).toBe("off"); // 생각 깊이를 보내지 않음
        expect(llm.inputs.at(-1)?.options?.length).toBe(3); // 길이는 그대로
        await waitFor(() => expect(balance()).toBe(before - 7)); // 플러스 3 + 3배 구간 4개(생각·빈 노트 확장 몫 없음)
    }); // 검증 종료

    it("유저 노트 확장은 노트를 500자 넘게 적었을 때만 1토큰이 더 든다", async () => // 유저 노트 확장 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(new CapturingLLMAdapter(), "가".repeat(501)); // 501자 노트
        const menu = screen.getByRole("region", { name: "채팅방 설정 메뉴" }); // 설정 메뉴
        await user.click(within(menu).getByRole("button", { name: /^유저 노트/ })); // 유저 노트 열기
        const dialog = screen.getByRole("dialog", { name: "유저노트" }); // 대화상자
        expect(within(dialog).getByText("500자를 넘게 적었을 때만 메시지당 1토큰이 더 들어요")).toBeVisible(); // 실제 차감 기준 안내
        await user.click(within(dialog).getByRole("button", { name: "유저노트 닫기" })); // 닫기
        const before = balance(); // 보내기 전 잔액
        await send(user, "오늘 일정 기억나?"); // 전송
        await waitFor(() => expect(balance()).toBe(before - 8)); // 플러스 3배 7 + 확장 1
    }); // 검증 종료
}); // 묶음 종료
