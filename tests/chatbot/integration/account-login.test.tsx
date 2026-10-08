import { render, screen, waitFor } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 전체 틀
import { LoginScreen } from "@chatbot/features/account/LoginScreen"; // 로그인 화면
import { AppProvider, useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { PrivacySettings } from "@chatbot/features/settings/PrivacySettings"; // 개인정보 및 보안
import { readAccountSession, writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import { createPracticeAuthAdapter } from "@chatbot/lib/account/practice-auth-adapter"; // 연습용 로그인
import { createScopedStorage } from "@chatbot/lib/account/scoped-storage"; // 계정별 저장 칸
import { LocalStorageGateway } from "@chatbot/lib/repositories/local-storage-gateway"; // 로컬 저장소
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/", // 현재 경로 대역
    useSearchParams: () => new URLSearchParams(), // 주소 값 대역
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 대역
})); // 대체 종료

const session: AccountSession = { accountId: "practice-soha", name: "소하", email: null, provider: "practice", signedInAt: "2026-10-06T00:00:00.000Z" }; // 연습용 계정 세션

function Probe() // 잔액 표시와 설정 바꾸기
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    return <><output aria-label="잔액 확인">{state.wallet.balance}</output><button type="button" onClick={() => dispatch({ type: "update-settings", settings: { showSceneImages: !state.settings.showSceneImages } })}>설정 바꾸기</button></>; // 잔액과 버튼
} // 함수 종료

describe("연습용 로그인과 계정별 데이터", () => // 계정 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("이름으로 로그인하면 세션을 저장하고 메인으로 새로 열며, 로그아웃하면 세션을 지운다", async () => // 로그인 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        render(<LoginScreen adapter={createPracticeAuthAdapter(localStorage)} navigate={navigate} />); // 로그인 화면
        expect(screen.getByRole("note")).toHaveTextContent("연습용 로그인"); // 연습용 안내
        await user.click(screen.getByRole("button", { name: "로그인" })); // 이름 없이 로그인
        expect(screen.getByRole("alert")).toHaveTextContent("계정 이름을 1~20자로 적어 주세요."); // 이름 오류
        expect(navigate).not.toHaveBeenCalled(); // 이동하지 않음
        await user.type(screen.getByLabelText("계정 이름"), "소하{Enter}"); // 이름 입력 후 Enter
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 메인으로 새로 엶
        expect(readAccountSession(localStorage)).toMatchObject({ name: "소하", provider: "practice" }); // 세션 저장
        expect(await screen.findByText("지금 소하 계정으로 로그인해 있어요.")).toBeVisible(); // 로그인 상태 표시
        await user.click(screen.getByRole("button", { name: "로그아웃" })); // 로그아웃
        await waitFor(() => expect(readAccountSession(localStorage)).toBeNull()); // 세션 지움
        expect(navigate).toHaveBeenCalledTimes(2); // 손님 화면으로 새로 엶
        await user.click(await screen.findByRole("button", { name: "소하" })); // 쓴 계정 목록에서 다시 들어가기
        await waitFor(() => expect(readAccountSession(localStorage)?.name).toBe("소하")); // 같은 계정으로 로그인
    }); // 검증 종료

    it("로그인한 계정의 데이터는 손님 데이터와 다른 칸에서 읽고 쓴다", async () => // 저장 칸 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const guest = createInitialState(); // 손님 데이터
        guest.wallet.balance = 913; // 식별 잔액
        new LocalStorageGateway(localStorage).save(guest); // 손님 칸에 저장
        const mine = createInitialState(); // 계정 데이터
        mine.wallet.balance = 500; // 식별 잔액
        new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).save(mine); // 계정 칸에 저장
        writeAccountSession(localStorage, session); // 로그인해 둠
        render(<AppProvider><Probe /></AppProvider>); // 공급자 렌더
        await waitFor(() => expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("500")); // 계정 데이터를 읽음
        await user.click(screen.getByRole("button", { name: "설정 바꾸기" })); // 상태 변경
        await waitFor(() => expect(JSON.parse(localStorage.getItem(`mateverse:v1:u:${session.accountId}:state`) ?? "{}").settings.showSceneImages).toBe(!mine.settings.showSceneImages)); // 계정 칸에 저장
        const guestSaved = JSON.parse(localStorage.getItem("mateverse:v1:state") ?? "{}") as { wallet: { balance: number }; settings: { showSceneImages: boolean } }; // 손님 칸
        expect([guestSaved.wallet.balance, guestSaved.settings.showSceneImages]).toEqual([913, guest.settings.showSceneImages]); // 손님 데이터는 그대로
    }); // 검증 종료

    it("사용자 패널은 손님에게 로그인 링크를, 로그인한 사람에게 계정 이름과 로그아웃 버튼을 보여 준다", async () => // 사용자 패널 검증
    { // 검증 시작
        const initial = createInitialState(); // 초기 상태
        const opened = { ...initial, settings: { ...initial.settings, rightPanelOpen: true } }; // 사용자 패널을 연 상태
        const { unmount } = renderWithApp(<AppShell><main>본문</main></AppShell>, opened); // 손님 화면
        expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login"); // 로그인 링크
        expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull(); // 로그아웃 없음
        unmount(); // 화면 정리
        writeAccountSession(localStorage, session); // 로그인
        renderWithApp(<><AppShell><main>본문</main></AppShell><PrivacySettings /></>, opened); // 로그인한 화면
        expect(await screen.findByRole("button", { name: "로그아웃" })).toHaveClass("user-panel-logout"); // 로그아웃 버튼
        expect(screen.getByLabelText("로그인 상태")).toHaveTextContent("소하"); // 계정 이름
        expect(screen.queryByRole("link", { name: "로그인" })).toBeNull(); // 로그인 링크 없음
        expect(screen.getByText("소하 · 연습용 계정(이 브라우저 안에서만 나뉘어요)")).toBeInTheDocument(); // 개인정보 화면의 계정 안내
    }); // 검증 종료

    it("개인정보 화면은 손님에게 로그인하지 않았다고 알린다", () => // 손님 안내 검증
    { // 검증 시작
        renderWithApp(<PrivacySettings />); // 손님 화면
        expect(screen.getByText("로그인하지 않음 · 이 브라우저에만 저장돼요")).toBeInTheDocument(); // 손님 안내
    }); // 검증 종료
}); // 묶음 종료
