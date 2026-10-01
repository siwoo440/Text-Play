import { screen, waitFor } from "@testing-library/react"; // 화면 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { AppShell } from "@/components/app-shell/AppShell"; // 앱 셸
import { CloseAppPanelsOnEnter } from "@/features/text-play/platform/CloseAppPanelsOnEnter"; // 진입 시 패널 닫기
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더

describe("Text-Play 웹 진입", () => // 웹 진입 검증 묶음
{ // 묶음 시작
    it("Text-Play 화면에 들어오면 화면을 가리는 앱 패널과 배경을 닫는다", async () => // 패널 닫기 검증
    { // 테스트 시작
        renderWithApp(<AppShell><CloseAppPanelsOnEnter /><main>게임</main></AppShell>); // 화면 렌더
        await waitFor(() => expect(screen.queryByRole("button", { name: "열린 패널 닫기" })).not.toBeInTheDocument()); // 배경 제거 확인
        expect(screen.getByRole("button", { name: "대화방 패널 열기와 닫기" })).toHaveAttribute("aria-expanded", "false"); // 대화 패널 닫힘 확인
    }); // 테스트 종료
}); // 묶음 종료
