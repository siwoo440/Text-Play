import { screen } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/", // 현재 경로
    useSearchParams: () => new URLSearchParams(""), // 검색 매개변수
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동
})); // 대체 종료

function ThemeProbe() // 저장된 테마 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="테마 설정">{state.settings.theme}</output>; // 테마
} // 함수 종료

describe("헤더 다크 모드 스위치", () => // 묶음
{ // 묶음 시작
    afterEach(() => // 정리
    { // 정리 시작
        delete document.documentElement.dataset.theme; // 루트 표시 지우기
        localStorage.clear(); // 저장 지우기
    }); // 정리 종료

    it("19+ 스위치 왼쪽에 있고, 누르면 사이트 전체에 다크 모드를 적용·저장한다", async () => // 적용 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        renderWithApp(<AppShell><main>본문</main><ThemeProbe /></AppShell>); // 렌더
        const toggle = screen.getByRole("switch", { name: "다크 모드" }); // 다크 모드
        const adult = screen.getByRole("switch", { name: "19+ 콘텐츠 보기" }); // 19+ 스위치 조회
        expect(toggle.compareDocumentPosition(adult) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 19+보다 앞(왼쪽)
        expect(toggle).toHaveAttribute("aria-checked", "false"); // 처음엔 밝게
        expect(document.documentElement.dataset.theme).toBe("light"); // 루트 밝음
        await user.click(toggle); // 켜기
        expect(toggle).toHaveAttribute("aria-checked", "true"); // 켜짐
        expect(document.documentElement.dataset.theme).toBe("dark"); // 루트 어두움
        expect(localStorage.getItem("mateverse:theme")).toBe("dark"); // 다음 방문 첫 화면용 저장
        expect(screen.getByLabelText("테마 설정")).toHaveTextContent("dark"); // 앱 설정 저장
    }); // 검증 종료

    it("저장된 다크 모드로 시작하면 처음부터 어둡게 표시한다", () => // 복원 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.settings.theme = "dark"; // 다크 저장
        renderWithApp(<AppShell><main>본문</main></AppShell>, state); // 렌더
        expect(screen.getByRole("switch", { name: "다크 모드" })).toHaveAttribute("aria-checked", "true"); // 켜짐
        expect(document.documentElement.dataset.theme).toBe("dark"); // 루트 어두움
    }); // 검증 종료
}); // 묶음 종료
