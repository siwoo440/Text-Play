import { act, screen } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
})); // 대체 종료

function PanelProbe() // 설정 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="패널 상태">{String(state.settings.chatPanelOpen)}</output>; // 펼침 저장 값
} // 함수 종료

function resizeWindow(width: number, height: number): void // 창 크기를 바꾸고 알리기
{ // 함수 시작
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width }); // 너비
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height }); // 높이
    act(() => // 화면 갱신까지 기다림
    { // 묶음 시작
        window.dispatchEvent(new Event("resize")); // 크기 변화 알림
    }); // 묶음 종료
} // 함수 종료

describe("채팅 화면 배치와 채팅방 설정 패널", () => // 묶음
{ // 묶음 시작
    it("자동 배치는 창 크기를 바꾸면 다시 열지 않아도 그 크기에 맞는 배치로 바뀐다", () => // 자동 배치 즉시 반영
    { // 검증 시작
        const original = { width: window.innerWidth, height: window.innerHeight }; // 원래 크기
        try // 크기를 되돌리기 위한 묶음
        { // 시도 시작
            resizeWindow(1700, 900); // 넓은 모니터
            const { container } = renderWithApp(<ChatScreen characterId="rian" />); // 자동 배치(기본값)로 렌더
            const main = container.querySelector("main"); // 채팅 본문
            expect(main).toHaveAttribute("data-layout", "D2"); // 넓은 화면 배치
            resizeWindow(1300, 900); // 보통 모니터 너비로 줄임
            expect(main).toHaveAttribute("data-layout", "D1"); // 바로 좁은 열 배치로
            resizeWindow(1000, 700); // 태블릿 너비로 줄임
            expect(main).toHaveAttribute("data-layout", "T1"); // 바로 태블릿 배치로
        } // 시도 종료
        finally // 뒷정리
        { // 정리 시작
            resizeWindow(original.width, original.height); // 크기 되돌림
        } // 정리 종료
    }); // 검증 종료

    it("화면 레이아웃 설정(오른쪽 패널 메뉴)에서 고른 배치를 채팅 화면에 적용한다", () => // 배치 적용
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.settings.layoutId = "D3"; // 시네마틱
        const { container } = renderWithApp(<ChatScreen characterId="rian" />, state); // 렌더
        expect(container.querySelector("main")).toHaveAttribute("data-layout", "D3"); // 배치 반영
        expect(screen.queryByRole("combobox", { name: "채팅 레이아웃" })).toBeNull(); // 채팅방 설정에는 배치 선택이 없음(오른쪽 패널과 중복)
    }); // 검증 종료

    it.each([["캐릭터", { characterId: "rian" }], ["스토리", { storyId: "story-moonlit-archive" }]])("%s 대화 화면에는 왼쪽 장면 영역이 없고 대화 영역과 채팅방 설정만 둔다", (_mode, props) => // 장면 영역 제거 검증
    { // 검증 시작
        const { container } = renderWithApp(<ChatScreen {...props} />); // 렌더
        const main = container.querySelector("main"); // 채팅 본문
        expect(screen.queryByRole("img", { name: /현재 장면/ })).toBeNull(); // 장면 그림 없음
        expect(screen.queryByText(/이야기 장면$/)).toBeNull(); // 장면 설명 없음
        expect(Array.from(main?.children ?? []).map((item) => item.tagName)).toEqual(["SECTION", "ASIDE"]); // 대화 영역과 채팅방 설정만
        expect(main?.firstElementChild).toContainElement(screen.getByRole("textbox", { name: "메시지" })); // 첫 영역이 대화
    }); // 검증 종료

    it("넓은 화면에서는 채팅방 설정 열을 접고 펴며 펼침 상태를 저장한다", async () => // 접기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const state = createInitialState(); // 초기 상태
        state.settings.layoutId = "D1"; // 데스크톱 배치
        const { container } = renderWithApp(<><ChatScreen characterId="rian" /><PanelProbe /></>, state); // 렌더
        const toggle = screen.getByRole("button", { name: "채팅방 설정 열기와 닫기" }); // 열기 버튼
        expect(toggle).toHaveAttribute("aria-expanded", "true"); // 기본 펼침
        expect(screen.getByRole("complementary", { name: "채팅방 설정" })).toBeVisible(); // 패널 보임
        await user.click(screen.getByRole("button", { name: "채팅방 설정 닫기" })); // 닫기
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 접힘
        expect(container.querySelector("#chat-settings-panel")).not.toBeVisible(); // 패널 숨김
        expect(container.querySelector("main")).toHaveAttribute("data-panel", "closed"); // 배치 표시
        expect(screen.getByLabelText("패널 상태")).toHaveTextContent("false"); // 저장
        await user.click(toggle); // 다시 펴기
        expect(screen.getByRole("complementary", { name: "채팅방 설정" })).toBeVisible(); // 다시 보임
    }); // 검증 종료

    it("모바일 배치에서는 서랍으로 열고 Esc로 닫으면 열기 버튼으로 초점이 돌아온다", async () => // 서랍 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const state = createInitialState(); // 초기 상태
        state.settings.layoutId = "M1"; // 모바일 배치
        const { container } = renderWithApp(<ChatScreen characterId="rian" />, state); // 렌더
        const toggle = screen.getByRole("button", { name: "채팅방 설정 열기와 닫기" }); // 열기 버튼
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 처음엔 닫힘
        expect(container.querySelector("#chat-settings-panel")).toHaveAttribute("aria-hidden", "true"); // 서랍 숨김
        await user.click(toggle); // 열기
        expect(screen.getByRole("button", { name: "채팅방 설정 닫기" })).toHaveFocus(); // 닫기 버튼 초점
        expect(container.querySelector("main")).toHaveAttribute("data-overlay", "true"); // 서랍 모드
        await user.keyboard("{Escape}"); // 닫기
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 닫힘
        expect(toggle).toHaveFocus(); // 초점 복귀
    }); // 검증 종료

    it("채팅방 설정에는 오른쪽 패널과 겹치는 나의 토큰·화면 배치와 헤더로 옮긴 다크 모드가 없다", () => // 중복 제거 검증
    { // 검증 시작
        renderWithApp(<ChatScreen characterId="rian" />); // 렌더
        const panel = screen.getByRole("complementary", { name: "채팅방 설정" }); // 패널
        expect(panel).not.toHaveTextContent("나의 토큰"); // 토큰 없음
        expect(panel).not.toHaveTextContent("화면 배치"); // 배치 없음
        expect(panel).not.toHaveTextContent("다크 모드"); // 다크 모드 없음
    }); // 검증 종료
}); // 묶음 종료
