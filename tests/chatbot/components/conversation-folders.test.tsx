import { screen, waitFor, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import type { StateRepository } from "@chatbot/features/core/AppProvider"; // 저장소 계약
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 생성
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

const navigation = vi.hoisted(() => ({ pathname: "/", search: "", push: vi.fn() })); // 경로 대역 상태

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => navigation.pathname, // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(navigation.search), // 검색 매개변수 제공
    useRouter: () => ({ push: navigation.push, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

function createRepository(state: AppState): StateRepository & { save: ReturnType<typeof vi.fn> } // 저장소 대역
{ // 함수 시작
    return { load: () => state, save: vi.fn(), createBackup: vi.fn() } as StateRepository & { save: ReturnType<typeof vi.fn> }; // 저장소 반환
} // 함수 종료

function renderShell(state: AppState = createInitialState(), repository: StateRepository = createRepository(state)) // 셸 렌더
{ // 함수 시작
    renderWithApp(<AppShell><main>본문</main></AppShell>, state, repository); // 화면 렌더
    return screen.getByRole("complementary", { name: "진행 중인 대화방" }); // 대화 패널
} // 함수 종료

function cardTitles(root: HTMLElement): string[] // 카드 제목 목록
{ // 함수 시작
    return Array.from(root.querySelectorAll(".conversation-card-title")).map((title) => title.textContent ?? ""); // 제목 반환
} // 함수 종료

function folderSection(panel: HTMLElement, name: string): HTMLElement // 폴더 묶음 조회
{ // 함수 시작
    const section = within(panel).getByRole("button", { name: new RegExp(`^${name},`) }).closest("section"); // 폴더 제목의 묶음
    if (section === null) // 묶음 부재
    { // 조건 시작
        throw new Error(`${name} 폴더가 없습니다.`); // 조회 오류
    } // 조건 종료
    return section; // 묶음 반환
} // 함수 종료

function withSecondRianConversation(state: AppState): AppState // 같은 캐릭터 대화 하나 더
{ // 함수 시작
    const conversation = state.conversations.find((item) => item.id === "conversation-rian")!; // 리안 대화
    const version = state.conversationVersions.find((item) => item.id === conversation.currentVersionId)!; // 리안 버전
    const copy = { ...conversation, id: "conversation-rian-2", title: "리안과 두 번째 밤", currentVersionId: "conversation-rian-2-version-1" }; // 대화 복사
    const versionCopy = { ...version, id: "conversation-rian-2-version-1", conversationId: copy.id }; // 버전 복사
    const messages = state.messages.filter((item) => item.versionId === version.id).map((item) => ({ ...item, id: `${item.id}-copy`, conversationId: copy.id, versionId: versionCopy.id })); // 메시지 복사
    return { ...state, conversations: [...state.conversations, copy], conversationVersions: [...state.conversationVersions, versionCopy], messages: [...state.messages, ...messages] }; // 상태 반환
} // 함수 종료

describe("왼쪽 대화방 탭·폴더·상태 줄", () => // 기능 묶음
{ // 묶음 시작
    beforeEach(() => // 준비
    { // 준비 시작
        vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-22T06:33:00.000Z") }); // 기준 시각
        navigation.pathname = "/"; // 기본 경로
        navigation.search = ""; // 기본 검색
    }); // 준비 종료

    afterEach(() => // 정리
    { // 정리 시작
        vi.useRealTimers(); // 시각 복원
    }); // 정리 종료

    it("전체·캐릭터·스토리 탭으로 대화 종류를 거르고 고른 탭을 저장한다", async () => // 탭 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const started = createStoryConversation(createInitialState(), "story-moonlit-archive", "2026-09-22T06:30:00.000Z"); // 스토리 대화 추가
        const repository = createRepository(started.state); // 저장소
        const panel = renderShell(started.state, repository); // 렌더
        const tabs = within(panel).getByRole("group", { name: "대화 종류" }); // 탭 묶음
        expect(within(tabs).getByRole("button", { name: /^전체/ })).toHaveAttribute("aria-pressed", "true"); // 기본 전체
        expect(within(tabs).getByRole("button", { name: /^스토리/ })).toHaveTextContent("스토리1"); // 스토리 개수
        await user.click(within(tabs).getByRole("button", { name: /^스토리/ })); // 스토리 탭
        expect(cardTitles(panel)).toEqual(["비 그친 밤의 기록관"]); // 스토리만
        await user.click(within(tabs).getByRole("button", { name: /^캐릭터/ })); // 캐릭터 탭
        expect(cardTitles(panel)).toEqual(["새벽 도서관의 리안", "비 오는 교실, 세라", "달빛 기록관의 노아"]); // 캐릭터만
        await waitFor(() => expect(repository.save.mock.calls.at(-1)?.[0].settings.conversationFilter).toBe("character")); // 설정 저장
    }); // 검증 종료

    it("폴더를 만들어 대화를 옮기고, 접고, 이름을 바꾸고, 지우면 대화는 목록으로 돌아온다", async () => // 폴더 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const panel = renderShell(); // 렌더
        await user.click(within(panel).getByRole("button", { name: "＋ 폴더" })); // 폴더 만들기
        await user.type(within(panel).getByRole("textbox", { name: "폴더 이름" }), "자주 하는 대화"); // 이름 입력
        await user.click(within(panel).getByRole("button", { name: "만들기" })); // 만들기
        expect(within(folderSection(panel, "자주 하는 대화")).getByText(/빈 폴더예요/)).toBeInTheDocument(); // 빈 폴더 안내
        await user.click(within(panel).getByRole("button", { name: "달빛 기록관의 노아 더보기" })); // 메뉴
        await user.click(within(panel).getByRole("menuitem", { name: "폴더로 이동" })); // 폴더 고르기
        expect(within(panel).getByRole("menu", { name: "달빛 기록관의 노아 옮길 폴더" })).toBeInTheDocument(); // 폴더 목록 메뉴
        await user.click(within(panel).getByRole("menuitem", { name: "자주 하는 대화" })); // 폴더 선택
        const folder = folderSection(panel, "자주 하는 대화"); // 폴더 묶음
        expect(cardTitles(folder)).toEqual(["달빛 기록관의 노아"]); // 폴더 안 대화
        expect(within(panel).getByRole("status")).toHaveTextContent("‘달빛 기록관의 노아’ 대화를 ‘자주 하는 대화’ 폴더로 옮겼습니다."); // 안내
        const toggle = within(panel).getByRole("button", { name: /^자주 하는 대화,/ }); // 접기 버튼
        await user.click(toggle); // 접기
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 접힘
        expect(cardTitles(panel)).not.toContain("달빛 기록관의 노아"); // 카드 숨김
        await user.click(toggle); // 펴기
        await user.click(within(panel).getByRole("button", { name: "자주 하는 대화 폴더 이름 변경" })); // 이름 변경
        const input = within(panel).getByRole("textbox", { name: "폴더 이름" }); // 입력
        await user.clear(input); // 비우기
        await user.type(input, "기록관{Enter}"); // 새 이름
        expect(within(panel).getByRole("button", { name: /^기록관,/ })).toBeInTheDocument(); // 이름 반영
        await user.click(within(panel).getByRole("button", { name: "기록관 폴더 삭제" })); // 폴더 삭제
        expect(within(panel).queryByRole("button", { name: /^기록관,/ })).toBeNull(); // 폴더 사라짐
        expect(cardTitles(panel)).toContain("달빛 기록관의 노아"); // 대화 유지
        expect(within(panel).getByRole("status")).toHaveTextContent("안의 대화는 목록으로 돌아갔어요."); // 안내
    }); // 검증 종료

    it("더보기의 ‘새 폴더에 넣기’는 폴더를 만들면서 그 대화를 바로 넣는다", async () => // 새 폴더 이동 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const panel = renderShell(); // 렌더
        await user.click(within(panel).getByRole("button", { name: "비 오는 교실, 세라 더보기" })); // 메뉴
        await user.click(within(panel).getByRole("menuitem", { name: "폴더로 이동" })); // 폴더 고르기
        await user.click(within(panel).getByRole("menuitem", { name: "＋ 새 폴더에 넣기" })); // 새 폴더
        await user.type(within(panel).getByRole("textbox", { name: "폴더 이름" }), "학교{Enter}"); // 이름
        expect(cardTitles(folderSection(panel, "학교"))).toEqual(["비 오는 교실, 세라"]); // 바로 들어감
    }); // 검증 종료

    it("자동 정리는 같은 작품 대화 두 개 이상을 작품 이름 폴더로 묶고, 없으면 안내만 한다", async () => // 자동 정리 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const panel = renderShell(withSecondRianConversation(createInitialState())); // 리안 대화 두 개
        await user.click(within(panel).getByRole("button", { name: "자동 정리" })); // 자동 정리
        expect(within(panel).getByRole("status")).toHaveTextContent("대화 2개를 작품별 폴더로 정리했습니다."); // 안내
        const folder = folderSection(panel, "새벽 도서관의 리안"); // 캐릭터 이름 폴더
        expect(cardTitles(folder).sort()).toEqual(["리안과 두 번째 밤", "새벽 도서관의 리안"]); // 두 대화
        await user.click(within(panel).getByRole("button", { name: "자동 정리" })); // 다시 정리
        expect(within(panel).getByRole("status")).toHaveTextContent("지금은 정리할 대화가 없습니다."); // 정리할 것 없음
    }); // 검증 종료

    it("카드에 현재 버전의 마지막 상태창 장소·시간을 한 줄로 보여 주고 잠긴 대화는 가린다", () => // 상태 줄 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.messages = state.messages.map((message) => message.conversationId === "conversation-rian" && message.role === "assistant" ? { ...message, status: { turn: 1, location: "새벽 도서관 창가", time: "월요일 20:06", tip: null, affection: [], thoughts: [], custom: [] } } : message); // 리안 상태창
        const panel = renderShell(state); // 렌더
        const card = cardTitles(panel).indexOf("새벽 도서관의 리안"); // 리안 위치
        const status = panel.querySelectorAll(".conversation-card")[card]?.querySelector(".conversation-card-status"); // 상태 줄
        expect(status).toHaveTextContent("새벽 도서관 창가 · 월요일 20:06"); // 장소·시간
        expect(panel.querySelectorAll(".conversation-card-status")).toHaveLength(1); // 상태창 없는 대화는 표시 안 함
    }); // 검증 종료
}); // 묶음 종료
