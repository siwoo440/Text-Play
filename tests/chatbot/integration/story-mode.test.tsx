import { screen, waitFor, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import StoryChatPage from "@chatbot/app/stories/[id]/chat/page"; // 스토리 대화 페이지
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

const routerReplace = vi.hoisted(() => vi.fn()); // 주소 교체 기록

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: routerReplace, push: () => undefined }), // 이동 함수 제공
})); // 대체 종료

function StoryProbe() // 스토리 대화 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const story = state.conversations.filter((conversation) => conversation.mode === "story"); // 스토리 대화
    return <output aria-label="스토리 대화 상태">{story.length}:{story.map((conversation) => conversation.storyId).join(",")}</output>; // 상태 표시
} // 함수 종료

function renderStory(storyId = "story-moonlit-archive", state = createInitialState()) // 스토리 화면 렌더
{ // 함수 시작
    return renderWithApp(<><ChatScreen storyId={storyId} llm={new MockLLMAdapter({ delayMs: 0, seed: 1 })} images={new MockImageAdapter()} /><StoryProbe /></>, state); // 화면 렌더
} // 함수 종료

function lastAssistant(): HTMLElement // 마지막 응답 항목
{ // 함수 시작
    const items = screen.getAllByRole("listitem").filter((item) => item.getAttribute("data-role") === "assistant"); // 응답 항목
    const last = items.at(-1); // 마지막 항목
    if (last === undefined) // 부재 판정
    { // 조건 시작
        throw new Error("응답이 필요합니다."); // 준비 오류
    } // 조건 종료
    return last; // 항목 반환
} // 함수 종료

describe("스토리 모드 대화", () => // 스토리 대화 묶음
{ // 묶음 시작
    it("스토리 주소마다 화면 인스턴스 키를 바꾼다", async () => // 페이지 키 검증
    { // 검증 시작
        const page = await StoryChatPage({ params: Promise.resolve({ id: "story-moonlit-archive" }), searchParams: Promise.resolve({ conversation: "a", version: "b" }) }); // 페이지 요소
        expect(page.key).toBe("a:b"); // 키 확인
    }); // 검증 종료

    it("시작 장면을 내레이션과 인물별 대사로 나눠 이름·얼굴과 함께 보여 준다", () => // 시작 장면 검증
    { // 검증 시작
        renderStory(); // 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: /비 그친 밤의 기록관/ })).toBeInTheDocument(); // 스토리 제목 확인
        const opening = lastAssistant(); // 시작 장면
        expect(within(opening).getByText(/펼쳐진 책의 마지막 페이지가 하얗게 비어 있다/)).toHaveAttribute("data-narration"); // 내레이션 확인
        const rian = within(opening).getByText("왔구나. 마침 손이 하나 더 필요했어.").closest("[data-speaker]"); // 리안 대사
        expect(rian).toHaveAttribute("data-speaker", "rian"); // 화자 확인
        expect(within(rian as HTMLElement).getByText("리안")).toBeInTheDocument(); // 이름 확인
        expect((rian as HTMLElement).querySelector("img")).toBeInTheDocument(); // 얼굴 확인
        expect(screen.getByLabelText("스토리 대화 상태")).toHaveTextContent(/^0:$/); // 첫 메시지 전에는 저장하지 않음 확인
    }); // 검증 종료

    it("등장인물과 내 역할을 옆 패널에 보여 준다", () => // 등장인물 패널 검증
    { // 검증 시작
        renderStory(); // 화면 렌더
        const castPanel = screen.getByRole("region", { name: "등장인물" }); // 등장인물 패널
        expect(within(castPanel).getAllByRole("listitem").map((item) => item.querySelector("strong")?.textContent)).toEqual(["리안", "세라", "노아"]); // 인물 확인
        expect(castPanel).toHaveTextContent("오늘 처음 기록관 문을 연 전학생"); // 내 역할 확인
    }); // 검증 종료

    it("말 걸 상대를 고르면 @이름을 붙여 보내고 그 인물이 먼저 답한다", async () => // 지목 대화 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderStory(); // 화면 렌더
        await user.selectOptions(screen.getByRole("combobox", { name: "말 걸 상대" }), "세라"); // 상대 선택
        await user.type(screen.getByRole("textbox", { name: "메시지" }), "이 페이지 누가 지웠을까?"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 전송
        await waitFor(() => expect(screen.getByRole("list", { name: "대화 메시지" })).toHaveAttribute("aria-busy", "false")); // 응답 완료 대기
        const userItems = screen.getAllByRole("listitem").filter((item) => item.getAttribute("data-role") === "user"); // 사용자 메시지
        expect(within(userItems.at(-1) as HTMLElement).getByText("@세라")).toBeInTheDocument(); // 지목 표시 확인
        await waitFor(() => expect(lastAssistant().querySelector("[data-speaker]")).toHaveAttribute("data-speaker", "sera")); // 세라 먼저 답함 확인
        expect(screen.getByLabelText("스토리 대화 상태")).toHaveTextContent("1:story-moonlit-archive"); // 첫 메시지 뒤 저장 확인
    }); // 검증 종료

    it("이야기 진행 버튼은 입력 없이 다음 장면을 만든다", async () => // 이야기 진행 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderStory("story-star-signal"); // 한 명 스토리 렌더
        await user.click(screen.getByRole("button", { name: "이야기 진행" })); // 이야기 진행
        await waitFor(() => expect(screen.getAllByRole("listitem").filter((item) => item.getAttribute("data-role") === "assistant")).toHaveLength(2)); // 새 장면 확인
        expect(screen.getByText("다음 장면으로")).toBeInTheDocument(); // 진행 표시 확인
        expect(lastAssistant().querySelector("[data-narration]")).toBeInTheDocument(); // 내레이션 확인
        expect(lastAssistant().querySelector("[data-speaker]")).toHaveAttribute("data-speaker", "kyle"); // 단독 화자 확인
    }); // 검증 종료

    it("19+ 스토리는 19+를 켜기 전까지 잠금 화면을 보여 준다", () => // 잠금 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.stories = state.stories.map((story) => story.id === "story-closing-cafe" ? { ...story, contentRating: "mature" } : story); // 19세 스토리 지정
        renderStory("story-closing-cafe", state); // 화면 렌더
        expect(screen.getByRole("heading", { name: "19세 이상 이용 가능한 스토리입니다" })).toBeInTheDocument(); // 잠금 제목 확인
        expect(screen.getByLabelText("스토리 대화 상태")).toHaveTextContent("0:"); // 대화 미생성 확인
    }); // 검증 종료

    it("없는 스토리 주소는 안내 화면을 보여 준다", () => // 부재 검증
    { // 검증 시작
        renderStory("없는-스토리"); // 화면 렌더
        expect(screen.getByRole("heading", { name: "스토리를 찾을 수 없습니다" })).toBeInTheDocument(); // 안내 확인
    }); // 검증 종료
}); // 묶음 종료
