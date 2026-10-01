import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/", // 현재 경로
    useSearchParams: () => new URLSearchParams(""), // 검색 매개변수
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동
})); // 대체 종료

describe("헤더 알림함", () => // 알림함 묶음
{ // 묶음 시작
    it("안 읽은 개수를 보여 주고, 열어 본 뒤 닫으면 읽음으로 바뀐다", async () => // 읽음 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        const state = createInitialState(); // 초기 상태(환영 알림 1개)
        state.notifications = [{ id: "notice-image-1", kind: "image", title: "이미지가 완성됐어요", body: "새벽 도서관 창가", href: "/images", read: false, createdAt: "2026-10-01T00:00:00.000Z" }, ...state.notifications]; // 이미지 알림 추가
        renderWithApp(<AppShell><main>본문</main></AppShell>, state); // 렌더
        const bell = screen.getByRole("button", { name: "알림함, 안 읽은 알림 2개" }); // 종 버튼
        await user.click(bell); // 열기
        const dialog = screen.getByRole("dialog", { name: "알림함" }); // 알림 목록
        expect(within(dialog).getByRole("link", { name: /이미지가 완성됐어요/ })).toHaveAttribute("href", "/images"); // 이동 링크
        expect(within(dialog).getByText("Mate Verse에 오신 걸 환영해요")).toBeInTheDocument(); // 환영 알림
        await user.keyboard("{Escape}"); // 닫기
        expect(screen.queryByRole("dialog", { name: "알림함" })).toBeNull(); // 닫힘
        expect(screen.getByRole("button", { name: "알림함" })).toHaveFocus(); // 초점 복귀·읽음 처리
    }); // 검증 종료

    it("모두 읽음과 비우기를 지원하고 빈 알림함을 안내한다", async () => // 비우기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 렌더
        await user.click(screen.getByRole("button", { name: "알림함, 안 읽은 알림 1개" })); // 열기
        const dialog = screen.getByRole("dialog", { name: "알림함" }); // 알림 목록
        await user.click(within(dialog).getByRole("button", { name: "모두 읽음" })); // 모두 읽음
        expect(screen.getByRole("button", { name: "알림함" })).toBeInTheDocument(); // 배지 사라짐
        await user.click(within(dialog).getByRole("button", { name: "비우기" })); // 비우기
        expect(within(dialog).getByText(/새 알림이 없어요/)).toBeInTheDocument(); // 빈 안내
    }); // 검증 종료
}); // 묶음 종료
