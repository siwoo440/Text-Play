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

function createRepository(state: AppState, overrides: Partial<StateRepository> = {}): StateRepository & { save: ReturnType<typeof vi.fn>; createBackup: ReturnType<typeof vi.fn> } // 저장소 대역 생성
{ // 함수 시작
    return { load: () => state, save: vi.fn(), createBackup: vi.fn(), ...overrides } as StateRepository & { save: ReturnType<typeof vi.fn>; createBackup: ReturnType<typeof vi.fn> }; // 저장소 반환
} // 함수 종료

function renderShell(state: AppState = createInitialState(), repository: StateRepository = createRepository(state)) // 셸 렌더
{ // 함수 시작
    renderWithApp(<AppShell><main>본문</main></AppShell>, state, repository); // 화면 렌더
    return screen.getByRole("complementary", { name: "진행 중인 대화방" }); // 대화 패널 반환
} // 함수 종료

function cardTitles(panel: HTMLElement): string[] // 카드 제목 목록
{ // 함수 시작
    return Array.from(panel.querySelectorAll(".conversation-card-title")).map((title) => title.textContent ?? ""); // 제목 반환
} // 함수 종료

function getCard(panel: HTMLElement, title: string): HTMLElement // 카드 조회
{ // 함수 시작
    const card = Array.from(panel.querySelectorAll<HTMLElement>(".conversation-card")).find((item) => item.querySelector(".conversation-card-title")?.textContent === title); // 제목 일치 카드
    if (card === undefined) // 카드 부재 판정
    { // 조건 시작
        throw new Error(`${title} 카드가 없습니다.`); // 조회 오류
    } // 조건 종료
    return card; // 카드 반환
} // 함수 종료

describe("왼쪽 대화방 창", () => // 대화방 창 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 준비
    { // 준비 시작
        vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-22T06:33:00.000Z") }); // 기준 시각 고정
        navigation.pathname = "/"; // 기본 경로
        navigation.search = ""; // 기본 검색 매개변수
        navigation.push.mockClear(); // 이동 기록 초기화
    }); // 준비 종료

    afterEach(() => // 테스트 정리
    { // 정리 시작
        vi.useRealTimers(); // 실제 시각 복원
    }); // 정리 종료

    it("보관한 대화는 빼고 보관함 링크에 보관 개수를 표시한다", () => // 보관 제외 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.conversations = state.conversations.map((conversation) => conversation.id === "conversation-noah" ? { ...conversation, archivedAt: "2026-09-22T00:00:00.000Z" } : conversation); // 노아 보관
        const panel = renderShell(state); // 화면 렌더
        expect(cardTitles(panel)).toEqual(["새벽 도서관의 리안", "비 오는 교실, 세라"]); // 보관 제외 확인
        expect(within(panel).getByRole("link", { name: /보관함/ })).toHaveTextContent("보관한 대화 1"); // 보관 개수 확인
        expect(within(panel).getByRole("heading", { name: "대화방" })).toBeInTheDocument(); // 제목 확인
        expect(within(panel).getByText("2", { selector: ".conversation-panel-count" })).toBeInTheDocument(); // 진행 대화 수 확인
    }); // 검증 종료

    it("카드에 캐릭터 얼굴·관계·감정과 오른쪽 시간·진행한 턴 수를 표시한다", () => // 카드 정보 검증
    { // 검증 시작
        const panel = renderShell(); // 화면 렌더
        const rian = getCard(panel, "새벽 도서관의 리안"); // 리안 카드
        const sera = getCard(panel, "비 오는 교실, 세라"); // 세라 카드
        expect(within(rian).getByText("13분 전")).toBeInTheDocument(); // 상대 시간 확인
        expect(within(rian).getByText("1턴")).toBeInTheDocument(); // 턴 수 확인
        expect(within(sera).getByText("0턴")).toBeInTheDocument(); // 빈 턴 확인
        expect(within(rian).getByText("아는 사이 · 기대")).toBeInTheDocument(); // 관계·감정 확인
        expect(within(rian).getByRole("meter", { name: "관계 수치" })).toHaveAttribute("aria-valuenow", "34"); // 관계 수치 확인
        expect(rian.querySelector(".conversation-card-avatar img")).toBeInTheDocument(); // 얼굴 확인
        expect(within(panel).getByRole("heading", { name: "오늘" })).toBeInTheDocument(); // 날짜 묶음 확인
    }); // 검증 종료

    it("지금 보고 있는 대화방을 현재 위치로 강조한다", () => // 현재 대화 검증
    { // 검증 시작
        navigation.pathname = "/chat/sera"; // 채팅 경로
        navigation.search = "conversation=conversation-sera&version=conversation-sera-version-1"; // 세라 대화
        const panel = renderShell(); // 화면 렌더
        expect(getCard(panel, "비 오는 교실, 세라").querySelector(".conversation-card-link")).toHaveAttribute("aria-current", "page"); // 현재 표시 확인
        expect(getCard(panel, "새벽 도서관의 리안").querySelector(".conversation-card-link")).not.toHaveAttribute("aria-current"); // 다른 카드 확인
    }); // 검증 종료

    it("검색어와 초성으로 대화방을 거르고 결과가 없으면 안내한다", async () => // 검색 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const panel = renderShell(); // 화면 렌더
        const search = within(panel).getByRole("searchbox", { name: "대화방 검색" }); // 검색 입력
        await user.type(search, "ㄹㅇ"); // 초성 입력
        expect(cardTitles(panel)).toEqual(["새벽 도서관의 리안"]); // 초성 결과 확인
        await user.clear(search); // 검색 비우기
        await user.type(search, "우산"); // 최근 메시지 검색
        expect(cardTitles(panel)).toEqual(["비 오는 교실, 세라"]); // 메시지 결과 확인
        await user.clear(search); // 검색 비우기
        await user.type(search, "없는말"); // 없는 검색어
        expect(cardTitles(panel)).toEqual([]); // 빈 결과 확인
        expect(within(panel).getByText("‘없는말’에 맞는 대화방이 없습니다.")).toBeInTheDocument(); // 빈 결과 안내
        await user.keyboard("{Escape}"); // 검색 지우기
        expect(search).toHaveValue(""); // 검색 비움 확인
        expect(screen.getByRole("button", { name: "대화방 패널 열기와 닫기" })).toHaveAttribute("aria-expanded", "true"); // 패널 유지 확인
    }); // 검증 종료

    it("정렬을 바꾸면 순서가 바뀌고 설정에 저장된다", async () => // 정렬 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        const repository = createRepository(state); // 저장소 대역
        const panel = renderShell(state, repository); // 화면 렌더
        expect(cardTitles(panel)).toEqual(["새벽 도서관의 리안", "비 오는 교실, 세라", "달빛 기록관의 노아"]); // 최근순 확인
        await user.selectOptions(within(panel).getByRole("combobox", { name: "대화방 정렬" }), "이름순"); // 이름순 선택
        expect(cardTitles(panel)).toEqual(["달빛 기록관의 노아", "비 오는 교실, 세라", "새벽 도서관의 리안"]); // 이름순 확인
        expect(within(panel).getByRole("heading", { name: "전체 대화" })).toBeInTheDocument(); // 단일 묶음 확인
        await waitFor(() => expect(repository.save.mock.calls.at(-1)?.[0].settings.conversationSort).toBe("title")); // 설정 저장 확인
    }); // 검증 종료

    it("더보기 메뉴로 대화를 고정하면 고정됨 묶음 맨 위에 두고 다시 해제한다", async () => // 고정 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const panel = renderShell(); // 화면 렌더
        await user.click(within(panel).getByRole("button", { name: "달빛 기록관의 노아 더보기" })); // 메뉴 열기
        await user.click(within(panel).getByRole("menuitem", { name: "고정" })); // 고정 선택
        expect(within(panel).getByRole("heading", { name: "고정됨" })).toBeInTheDocument(); // 고정 묶음 확인
        expect(cardTitles(panel)[0]).toBe("달빛 기록관의 노아"); // 맨 위 확인
        await user.click(within(panel).getByRole("button", { name: "달빛 기록관의 노아 더보기" })); // 메뉴 다시 열기
        await user.click(within(panel).getByRole("menuitem", { name: "고정 해제" })); // 해제 선택
        expect(within(panel).queryByRole("heading", { name: "고정됨" })).not.toBeInTheDocument(); // 고정 묶음 제거 확인
    }); // 검증 종료

    it("고정이 5개면 더 고정하지 않고 안내한다", async () => // 고정 한도 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        const extra = Array.from({ length: 5 }, (_, index) => ({ ...state.conversations[2], id: `extra-${index}`, title: `추가 대화 ${index}`, currentVersionId: `extra-${index}-version` })); // 추가 대화
        state.conversations = [...state.conversations, ...extra]; // 대화 추가
        state.conversationVersions = [...state.conversationVersions, ...extra.map((conversation) => ({ ...state.conversationVersions[2], id: conversation.currentVersionId, conversationId: conversation.id }))]; // 버전 추가
        state.messages = [...state.messages, ...extra.map((conversation) => ({ ...state.messages.at(-1)!, id: `${conversation.id}-message`, conversationId: conversation.id, versionId: conversation.currentVersionId }))]; // 메시지 추가
        state.pinnedConversationIds = extra.map((conversation) => conversation.id); // 다섯 개 고정
        const panel = renderShell(state); // 화면 렌더
        await user.click(within(panel).getByRole("button", { name: "새벽 도서관의 리안 더보기" })); // 메뉴 열기
        await user.click(within(panel).getByRole("menuitem", { name: "고정" })); // 고정 시도
        expect(within(panel).getByRole("status")).toHaveTextContent("대화방은 5개까지 고정할 수 있습니다."); // 한도 안내 확인
        expect(within(getCard(panel, "새벽 도서관의 리안")).queryByLabelText("고정한 대화")).not.toBeInTheDocument(); // 고정 안 됨 확인
    }); // 검증 종료

    it("더보기 메뉴로 이름을 바꾸고 Escape로 메뉴만 닫는다", async () => // 이름 변경 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const panel = renderShell(); // 화면 렌더
        const more = within(panel).getByRole("button", { name: "비 오는 교실, 세라 더보기" }); // 더보기 버튼
        await user.click(more); // 메뉴 열기
        expect(within(panel).getByRole("menuitem", { name: "고정" })).toHaveFocus(); // 첫 항목 초점 확인
        await user.keyboard("{Escape}"); // 메뉴 닫기
        expect(within(panel).queryByRole("menu")).not.toBeInTheDocument(); // 메뉴 닫힘 확인
        expect(more).toHaveFocus(); // 초점 복귀 확인
        expect(screen.getByRole("button", { name: "대화방 패널 열기와 닫기" })).toHaveAttribute("aria-expanded", "true"); // 패널 유지 확인
        await user.click(more); // 메뉴 다시 열기
        await user.click(within(panel).getByRole("menuitem", { name: "이름 변경" })); // 이름 변경 선택
        const input = within(panel).getByRole("textbox", { name: "대화방 이름" }); // 이름 입력
        expect(input).toHaveFocus(); // 입력 초점 확인
        await user.clear(input); // 기존 이름 지우기
        await user.type(input, "우산 속 대화{Enter}"); // 새 이름 저장
        expect(cardTitles(panel)).toContain("우산 속 대화"); // 이름 변경 확인
    }); // 검증 종료

    it("보관하면 목록에서 빠지고 되돌리기로 복구한다", async () => // 보관 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const panel = renderShell(); // 화면 렌더
        await user.click(within(panel).getByRole("button", { name: "비 오는 교실, 세라 더보기" })); // 메뉴 열기
        await user.click(within(panel).getByRole("menuitem", { name: "보관" })); // 보관 선택
        expect(cardTitles(panel)).not.toContain("비 오는 교실, 세라"); // 목록 제외 확인
        expect(within(panel).getByRole("status")).toHaveTextContent("‘비 오는 교실, 세라’ 대화를 보관했습니다."); // 보관 안내 확인
        expect(within(panel).getByRole("link", { name: /보관함/ })).toHaveTextContent("보관한 대화 1"); // 보관 개수 확인
        expect(within(panel).getByRole("button", { name: "되돌리기" })).toHaveFocus(); // 사라진 카드 대신 초점 확인
        await user.click(within(panel).getByRole("button", { name: "되돌리기" })); // 되돌리기
        expect(cardTitles(panel)).toContain("비 오는 교실, 세라"); // 복구 확인
    }); // 검증 종료

    it("삭제는 확인한 뒤 백업을 만들고 지운다", async () => // 삭제 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        const repository = createRepository(state); // 저장소 대역
        const panel = renderShell(state, repository); // 화면 렌더
        await user.click(within(panel).getByRole("button", { name: "새벽 도서관의 리안 더보기" })); // 메뉴 열기
        await user.click(within(panel).getByRole("menuitem", { name: "삭제" })); // 삭제 선택
        const confirm = within(panel).getByRole("group", { name: "대화 삭제 확인" }); // 확인 영역
        expect(confirm).toHaveTextContent("메시지 3개"); // 메시지 수 안내 확인
        expect(within(confirm).getByRole("button", { name: "취소" })).toHaveFocus(); // 안전 초점 확인
        await user.click(within(confirm).getByRole("button", { name: "대화 삭제 확인" })); // 삭제 확인
        expect(repository.createBackup).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: 12 }), "conversation-delete"); // 백업 확인
        expect(cardTitles(panel)).not.toContain("새벽 도서관의 리안"); // 삭제 확인
        expect(within(panel).getByRole("status")).toHaveTextContent("‘새벽 도서관의 리안’ 대화를 삭제했습니다."); // 삭제 안내 확인
        expect(within(panel).getByRole("button", { name: "안내 닫기" })).toHaveFocus(); // 사라진 카드 대신 초점 확인
        expect(navigation.push).not.toHaveBeenCalled(); // 다른 화면 유지 확인
    }); // 검증 종료

    it("백업에 실패하면 대화를 지우지 않는다", async () => // 백업 실패 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        const repository = createRepository(state, { createBackup: vi.fn(() => { throw new Error("백업 실패"); }) }); // 실패 저장소
        const panel = renderShell(state, repository); // 화면 렌더
        await user.click(within(panel).getByRole("button", { name: "새벽 도서관의 리안 더보기" })); // 메뉴 열기
        await user.click(within(panel).getByRole("menuitem", { name: "삭제" })); // 삭제 선택
        await user.click(within(panel).getByRole("button", { name: "대화 삭제 확인" })); // 삭제 확인
        expect(cardTitles(panel)).toContain("새벽 도서관의 리안"); // 대화 유지 확인
        expect(screen.getByRole("alert")).toHaveTextContent("백업하지 못했습니다. 삭제를 중단했습니다."); // 실패 안내 확인
    }); // 검증 종료

    it("지금 보고 있는 대화를 삭제하면 캐릭터 상세로 이동한다", async () => // 현재 대화 삭제 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        navigation.pathname = "/chat/sera"; // 채팅 경로
        navigation.search = "conversation=conversation-sera&version=conversation-sera-version-1"; // 세라 대화
        const panel = renderShell(); // 화면 렌더
        await user.click(within(panel).getByRole("button", { name: "비 오는 교실, 세라 더보기" })); // 메뉴 열기
        await user.click(within(panel).getByRole("menuitem", { name: "삭제" })); // 삭제 선택
        await user.click(within(panel).getByRole("button", { name: "대화 삭제 확인" })); // 삭제 확인
        expect(navigation.push).toHaveBeenCalledWith("/characters/sera"); // 상세 이동 확인
    }); // 검증 종료

    it("19+ 잠금 대화는 메시지를 가리고 메시지 내용으로 검색되지 않는다", async () => // 잠금 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        state.characters = state.characters.map((character) => character.id === "sera" ? { ...character, contentRating: "mature" } : character); // 세라 19세 지정
        const panel = renderShell(state); // 화면 렌더
        const sera = getCard(panel, "비 오는 교실, 세라"); // 세라 카드
        expect(sera).toHaveAttribute("data-locked", "true"); // 잠금 표시 확인
        expect(sera).toHaveTextContent("19+ 잠금"); // 잠금 안내 확인
        expect(sera).not.toHaveTextContent("우산 하나로 충분할까?"); // 메시지 숨김 확인
        await user.type(within(panel).getByRole("searchbox", { name: "대화방 검색" }), "우산"); // 메시지 검색
        expect(cardTitles(panel)).toEqual([]); // 검색 제외 확인
    }); // 검증 종료

    it("스토리 대화는 스토리 표시·등장인물 수·마지막 대사와 스토리 주소로 보여 준다", async () => // 스토리 카드 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const started = createStoryConversation(createInitialState(), "story-moonlit-archive", "2026-09-22T06:30:00.000Z"); // 스토리 대화
        const panel = renderShell(started.state); // 화면 렌더
        const card = getCard(panel, "비 그친 밤의 기록관"); // 스토리 카드
        expect(card).toHaveAttribute("data-mode", "story"); // 종류 표시 확인
        expect(within(card).getByText("스토리", { selector: ".conversation-card-mode" })).toBeInTheDocument(); // 스토리 표시 확인
        expect(card).toHaveTextContent("등장인물 3명"); // 인물 수 확인
        expect(card).toHaveTextContent("노아: …달이 지기 전에 찾아야 해."); // 마지막 대사 확인
        expect(card.querySelector(".conversation-card-link")).toHaveAttribute("href", started.href); // 스토리 주소 확인
        expect(card.querySelector("[role='meter']")).not.toBeInTheDocument(); // 관계 막대 없음 확인
        await user.click(within(card).getByRole("button", { name: "비 그친 밤의 기록관 더보기" })); // 메뉴 열기
        expect(within(panel).getByRole("menuitem", { name: "스토리 보기" })).toHaveAttribute("href", "/stories/story-moonlit-archive"); // 스토리 보기 확인
        await user.keyboard("{Escape}"); // 메뉴 닫기
        await user.type(within(panel).getByRole("searchbox", { name: "대화방 검색" }), "노아"); // 등장인물로 검색
        expect(cardTitles(panel)).toEqual(expect.arrayContaining(["비 그친 밤의 기록관", "달빛 기록관의 노아"])); // 스토리 검색 확인
    }); // 검증 종료

    it("진행 중인 대화가 없으면 첫 대화를 안내한다", () => // 빈 목록 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.conversations = state.conversations.map((conversation) => ({ ...conversation, archivedAt: "2026-09-22T00:00:00.000Z" })); // 전체 보관
        const panel = renderShell(state); // 화면 렌더
        expect(within(panel).getByText("진행 중인 대화가 없습니다.")).toBeInTheDocument(); // 빈 안내 확인
        expect(within(panel).getByRole("link", { name: "캐릭터 탐색하기" })).toHaveAttribute("href", "/explore"); // 탐색 링크 확인
        expect(within(panel).queryByRole("searchbox", { name: "대화방 검색" })).not.toBeInTheDocument(); // 검색 숨김 확인
    }); // 검증 종료
}); // 묶음 종료
