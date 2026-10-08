import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.setConfig({ testTimeout: 20_000 }); // 글자를 입력하는 화면 테스트라 컴퓨터가 바쁠 때도 끝나도록 제한 시간을 늘림

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
})); // 대체 종료

function Probe() // 책갈피한 메시지 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="책갈피 요약">{state.messages.filter((message) => message.bookmarked === true).map((message) => message.id).join("|")}</output>; // 책갈피 메시지
} // 함수 종료

function renderChat(state: AppState = createInitialState(), initialMessageId?: string) // 리안 대화 렌더(답변·내 말·답변이 있는 대화)
{ // 함수 시작
    renderWithApp(<><ChatScreen characterId="rian" initialMessageId={initialMessageId} llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><Probe /></>, state); // 렌더
} // 함수 종료

const messageItems = () => within(screen.getByRole("list", { name: "대화 메시지" })).getAllByRole("listitem"); // 메시지 항목

describe("대화 다시 보기", () => // 다시 보기 묶음
{ // 묶음 시작
    afterEach(() => vi.unstubAllGlobals()); // 전역 대역 해제

    it("답변에 책갈피를 넣으면 저장되고, 다시 보기에서 모아 보고 그 답변으로 이동한다", async () => // 책갈피
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 리안 대화
        const [first, mine, last] = messageItems(); // 답변·내 말·답변
        expect(within(mine).queryByRole("button", { name: "책갈피" })).toBeNull(); // 내 말에는 없음
        const mark = within(last).getByRole("button", { name: "책갈피" }); // 마지막 답변의 책갈피
        expect(mark).toHaveAttribute("aria-pressed", "false"); // 처음에는 꺼짐
        await user.click(mark); // 넣기
        expect(within(messageItems()[2]).getByRole("button", { name: "책갈피" })).toHaveAttribute("aria-pressed", "true"); // 켜짐
        expect(messageItems()[2]).toHaveAttribute("data-bookmarked", "true"); // 책갈피 띠
        expect(screen.getByLabelText("책갈피 요약")).toHaveTextContent("message-rian-3"); // 저장됨
        expect(screen.getByText(/책갈피에 넣었습니다/)).toBeInTheDocument(); // 안내
        await user.click(screen.getByRole("button", { name: "다시 보기" })); // 다시 보기 열기
        const bar = screen.getByRole("region", { name: "대화 다시 보기" }); // 다시 보기 막대
        await user.click(within(bar).getByRole("button", { name: "책갈피 1" })); // 책갈피 목록
        await user.click(within(within(bar).getByRole("list", { name: "책갈피한 답변" })).getByRole("button", { name: "오늘도 네 자리를 남겨뒀어." })); // 그 답변으로
        expect(messageItems()[2]).toHaveAttribute("data-focus", "true"); // 이동한 답변 강조
        expect(first).not.toHaveAttribute("data-focus"); // 다른 메시지는 그대로
        await user.click(within(messageItems()[2]).getByRole("button", { name: "책갈피" })); // 빼기
        expect(screen.getByLabelText("책갈피 요약")).toHaveTextContent(""); // 저장에서도 빠짐
        expect(within(bar).getByRole("button", { name: "책갈피 0" })).toBeInTheDocument(); // 개수 0
        expect(within(bar).getByText(/아직 책갈피한 답변이 없어요/)).toBeInTheDocument(); // 빈 안내
    }); // 검증 종료

    it("대화 안에서 말을 찾아 표시하고 이전·다음으로 옮기며, 닫으면 표시를 지운다", async () => // 검색
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 리안 대화(‘자리’가 든 답변이 둘)
        await user.click(screen.getByRole("button", { name: "다시 보기" })); // 열기
        const bar = screen.getByRole("region", { name: "대화 다시 보기" }); // 다시 보기 막대
        const count = within(bar).getByRole("status", { name: "찾은 말" }); // 찾은 수
        expect(within(bar).getByRole("button", { name: "다음 찾은 말" })).toBeDisabled(); // 검색 전에는 이동 불가
        await user.type(within(bar).getByRole("searchbox", { name: "대화 검색" }), "자리"); // 검색
        expect(count).toHaveTextContent("2/2"); // 가장 최근 것부터
        expect(messageItems().map((item) => item.getAttribute("data-found"))).toEqual(["true", null, "true"]); // 찾은 메시지 표시
        expect(messageItems()[2]).toHaveAttribute("data-focus", "true"); // 최근 답변으로 이동
        await user.click(within(bar).getByRole("button", { name: "이전 찾은 말" })); // 이전
        expect(count).toHaveTextContent("1/2"); // 첫 번째
        expect(messageItems()[0]).toHaveAttribute("data-focus", "true"); // 첫 답변으로 이동
        await user.type(within(bar).getByRole("searchbox", { name: "대화 검색" }), "{Enter}"); // Enter로 다음
        expect(count).toHaveTextContent("2/2"); // 다시 두 번째
        await user.clear(within(bar).getByRole("searchbox", { name: "대화 검색" })); // 검색어 지움
        await user.type(within(bar).getByRole("searchbox", { name: "대화 검색" }), "없는말"); // 없는 말
        expect(count).toHaveTextContent("찾은 말 없음"); // 없음
        expect(messageItems().every((item) => item.getAttribute("data-found") === null)).toBe(true); // 표시 없음
        await user.click(within(bar).getByRole("button", { name: "대화 다시 보기 닫기" })); // 닫기
        expect(screen.queryByRole("region", { name: "대화 다시 보기" })).toBeNull(); // 닫힘
        expect(screen.getByRole("button", { name: "다시 보기" })).toHaveAttribute("aria-expanded", "false"); // 버튼 상태
    }); // 검증 종료

    it("새로 받은 답변도 검색과 책갈피에 바로 잡힌다", async () => // 새 답변
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 리안 대화
        await user.click(screen.getByRole("button", { name: "다시 보기" })); // 열기
        const bar = screen.getByRole("region", { name: "대화 다시 보기" }); // 다시 보기 막대
        await user.type(within(bar).getByRole("searchbox", { name: "대화 검색" }), "별자리"); // 아직 없는 말
        expect(within(bar).getByRole("status", { name: "찾은 말" })).toHaveTextContent("찾은 말 없음"); // 없음
        await user.type(screen.getByLabelText("메시지"), "별자리 이야기 해 줘{Enter}"); // 보내기
        await waitFor(() => expect(screen.getByLabelText("메시지")).toBeEnabled(), { timeout: 5000 }); // 응답 완료
        expect(within(bar).getByRole("status", { name: "찾은 말" })).toHaveTextContent("1/1"); // 새 메시지가 잡힘
    }); // 검증 종료

    it("명장면 카드는 답변 글을 고쳐 미리 보고 글을 복사한다", async () => // 명장면 카드
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const writeText = vi.fn().mockResolvedValue(undefined); // 클립보드 대역
        vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } }); // 클립보드 주입
        renderChat(); // 리안 대화
        await user.click(within(messageItems()[2]).getByRole("button", { name: "명장면 카드" })); // 카드 열기
        const dialog = screen.getByRole("dialog", { name: "명장면 카드" }); // 대화상자
        const preview = within(dialog).getByRole("figure", { name: "카드 미리보기" }); // 미리보기
        expect(preview).toHaveTextContent("리안"); // 인물
        expect(preview).toHaveTextContent("오늘도 네 자리를 남겨뒀어."); // 대사
        expect(preview).toHaveTextContent("새벽 도서관의 리안"); // 작품
        const text = within(dialog).getByRole("textbox", { name: "카드에 넣을 글" }); // 글
        expect(text).toHaveValue("오늘도 네 자리를 남겨뒀어."); // 답변 글
        await user.clear(text); // 지움
        expect(within(dialog).getByRole("button", { name: "이미지로 저장" })).toBeDisabled(); // 빈 글은 저장 불가
        await user.type(text, "네 자리를 남겨뒀어."); // 고친 글
        expect(preview).toHaveTextContent("네 자리를 남겨뒀어."); // 미리보기 반영
        expect(within(dialog).getByText(/^11\/220자/)).toBeInTheDocument(); // 글자 수
        await user.click(within(dialog).getByRole("button", { name: "글 복사" })); // 복사
        expect(writeText).toHaveBeenCalledWith("“네 자리를 남겨뒀어.”\n— 리안, 새벽 도서관의 리안"); // 복사한 글
        expect(await within(dialog).findByRole("status", { name: "카드 안내" })).toHaveTextContent("카드 글을 복사했습니다."); // 안내
        await user.click(within(dialog).getByRole("button", { name: "명장면 카드 닫기" })); // 닫기
        expect(screen.queryByRole("dialog", { name: "명장면 카드" })).toBeNull(); // 닫힘
    }); // 검증 종료

    it("책갈피 주소로 들어오면 그 답변을 강조한다", () => // 바로 가기
    { // 검증 시작
        renderChat(createInitialState(), "message-rian-1"); // 첫 답변으로 가는 주소로 연 리안 대화
        expect(messageItems()[0]).toHaveAttribute("data-focus", "true"); // 첫 답변 강조
        expect(messageItems()[0]).toHaveAttribute("id", "message-message-rian-1"); // 표식
    }); // 검증 종료
}); // 묶음 종료

describe("보관함의 책갈피", () => // 보관함 묶음
{ // 묶음 시작
    it("책갈피 탭에서 모든 대화방의 책갈피를 보고 그 답변으로 가거나 뺀다", async () => // 책갈피 탭
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const state = appReducer(createInitialState(), { type: "toggle-message-bookmark", messageId: "message-rian-3" }); // 책갈피 한 건
        renderWithApp(<><LibraryScreen /><Probe /></>, state); // 보관함
        const tab = screen.getByRole("tab", { name: "책갈피" }); // 책갈피 탭
        expect(tab).toHaveTextContent("책갈피1"); // 개수
        await user.click(tab); // 탭 열기
        const list = screen.getByRole("list", { name: "책갈피한 답변" }); // 목록
        const link = within(list).getByRole("link"); // 답변 링크
        expect(link).toHaveAttribute("href", "/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1&message=message-rian-3"); // 그 답변으로 가는 주소
        expect(link).toHaveTextContent("새벽 도서관의 리안"); // 대화방 이름
        expect(link).toHaveTextContent("오늘도 네 자리를 남겨뒀어."); // 답변 글
        await user.click(within(list).getByRole("button", { name: /책갈피 빼기/ })); // 빼기
        expect(screen.getByLabelText("책갈피 요약")).toHaveTextContent(""); // 저장에서 빠짐
        expect(screen.getByText("아직 책갈피한 답변이 없습니다.")).toBeInTheDocument(); // 빈 화면
        expect(screen.getByRole("tab", { name: "책갈피" })).toHaveTextContent("책갈피0"); // 개수 0
    }); // 검증 종료
}); // 묶음 종료
