import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { DiscoveryHome } from "@chatbot/features/discovery/DiscoveryHome"; // 캐릭터 모드 홈
import { StoryDetail } from "@chatbot/features/story/StoryDetail"; // 스토리 상세
import { StoryHome } from "@chatbot/features/story/StoryHome"; // 스토리 모드 홈
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 생성
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn() })); // 경로 대역

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => navigation.pathname, // 현재 경로
    useRouter: () => ({ push: navigation.push, replace: () => undefined }), // 이동 함수
})); // 대체 종료

function StoryProbe() // 스토리 대화 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="스토리 대화 수">{state.conversations.filter((conversation) => conversation.mode === "story").length}</output>; // 개수 표시
} // 함수 종료

describe("스토리 모드 화면", () => // 화면 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 준비
    { // 준비 시작
        navigation.push.mockClear(); // 이동 기록 초기화
    }); // 준비 종료

    it("홈 화면에서 캐릭터 모드와 스토리 모드를 바꿔 갈 수 있다", () => // 모드 전환 검증
    { // 검증 시작
        navigation.pathname = "/"; // 홈 경로
        renderWithApp(<DiscoveryHome />); // 홈 렌더
        const modes = screen.getByRole("navigation", { name: "대화 모드" }); // 모드 전환
        expect(within(modes).getByRole("link", { name: /캐릭터 모드/ })).toHaveAttribute("aria-current", "page"); // 현재 모드 확인
        expect(within(modes).getByRole("link", { name: /스토리 모드/ })).toHaveAttribute("href", "/stories"); // 스토리 주소 확인
    }); // 검증 종료

    it("스토리 모드 화면은 공개 스토리를 등장인물과 함께 보여 주고 19+는 숨긴다", () => // 목록 검증
    { // 검증 시작
        navigation.pathname = "/stories"; // 스토리 경로
        const state = createInitialState(); // 초기 상태
        state.stories = state.stories.map((story) => story.id === "story-star-signal" ? { ...story, contentRating: "mature" } : story); // 19세 스토리 지정
        renderWithApp(<StoryHome />, state); // 스토리 홈 렌더
        expect(within(screen.getByRole("navigation", { name: "대화 모드" })).getByRole("link", { name: /스토리 모드/ })).toHaveAttribute("aria-current", "page"); // 현재 모드 확인
        const cards = screen.getAllByRole("article"); // 스토리 카드
        expect(cards.map((card) => within(card).getByRole("heading").textContent)).toEqual(["비 그친 밤의 기록관", "마감 10분 전, 비 오는 카페"]); // 19+ 숨김 확인
        expect(cards[0]).toHaveTextContent("리안 · 세라 · 노아"); // 등장인물 확인
        expect(cards[0]).toHaveTextContent("등장인물 3명"); // 인물 수 확인
        expect(within(cards[0]).getByRole("link", { name: /비 그친 밤의 기록관/ })).toHaveAttribute("href", "/stories/story-moonlit-archive"); // 상세 주소 확인
        expect(screen.getByRole("link", { name: "＋ 새 스토리 만들기" })).toHaveAttribute("href", "/stories/new"); // 만들기 주소 확인
    }); // 검증 종료

    it("스토리 상세에서 줄거리·시작 장면·내 역할·등장인물을 보여 주고 시작하면 대화로 이동한다", async () => // 상세 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<><StoryDetail storyId="story-moonlit-archive" /><StoryProbe /></>); // 상세 렌더
        expect(screen.getByRole("heading", { level: 1, name: "비 그친 밤의 기록관" })).toBeInTheDocument(); // 제목 확인
        expect(screen.getByRole("region", { name: "줄거리" })).toHaveTextContent("사라졌다"); // 줄거리 확인
        expect(screen.getByRole("region", { name: "시작 장면" })).toHaveTextContent("마지막 페이지가 하얗게 비어 있다"); // 시작 장면 확인
        expect(screen.getByRole("region", { name: "내 역할" })).toHaveTextContent("오늘 처음 기록관 문을 연 전학생"); // 내 역할 확인
        const cast = screen.getByRole("region", { name: "등장인물" }); // 등장인물 영역
        expect(within(cast).getAllByRole("listitem")).toHaveLength(3); // 인물 수 확인
        expect(within(cast).getByRole("link", { name: /리안/ })).toHaveAttribute("href", "/characters/rian"); // 캐릭터 연결 확인
        expect(screen.queryByRole("button", { name: "이어하기" })).not.toBeInTheDocument(); // 이어하기 없음 확인
        await user.click(screen.getByRole("button", { name: "스토리 시작" })); // 시작
        expect(navigation.push).toHaveBeenCalledWith(expect.stringMatching(/^\/stories\/story-moonlit-archive\/chat\?conversation=/)); // 대화 이동 확인
        expect(screen.getByLabelText("스토리 대화 수")).toHaveTextContent("1"); // 대화 저장 확인
    }); // 검증 종료

    it("진행 중인 스토리가 있으면 이어하기로 그 대화를 연다", async () => // 이어하기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const started = createStoryConversation(createInitialState(), "story-closing-cafe", "2026-10-01T09:00:00.000Z"); // 진행 중인 스토리
        renderWithApp(<StoryDetail storyId="story-closing-cafe" />, started.state); // 상세 렌더
        await user.click(screen.getByRole("button", { name: "이어하기" })); // 이어하기
        expect(navigation.push).toHaveBeenCalledWith(started.href); // 기존 대화 이동 확인
    }); // 검증 종료

    it("없는 스토리와 19+ 스토리는 안내·잠금 화면을 보여 준다", () => // 부재·잠금 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.stories = state.stories.map((story) => story.id === "story-closing-cafe" ? { ...story, contentRating: "mature" } : story); // 19세 스토리 지정
        const { unmount } = renderWithApp(<StoryDetail storyId="없는-스토리" />, state); // 부재 렌더
        expect(screen.getByRole("heading", { name: "스토리를 찾을 수 없습니다" })).toBeInTheDocument(); // 부재 안내 확인
        unmount(); // 정리
        renderWithApp(<StoryDetail storyId="story-closing-cafe" />, state); // 잠금 렌더
        expect(screen.getByRole("heading", { name: "19세 이상 이용 가능한 스토리입니다" })).toBeInTheDocument(); // 잠금 확인
    }); // 검증 종료
}); // 묶음 종료
