import { render, screen, waitFor } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { StrictMode } from "react"; // 개발 모드처럼 효과를 두 번 돌리는 틀
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { LoginScreen } from "@chatbot/features/account/LoginScreen"; // 로그인 화면
import { PasswordResetScreen } from "@chatbot/features/account/PasswordResetScreen"; // 비밀번호 다시 정하기 화면
import { readAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AuthAdapter, AuthResult } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { createPracticeAuthAdapter } from "@chatbot/lib/account/practice-auth-adapter"; // 연습용 로그인

const session: AccountSession = { accountId: "0a1b2c3d-1111-2222-3333-444455556666", name: "soha", email: "soha@example.com", provider: "email", signedInAt: "2026-10-07T00:00:00.000Z" }; // 실제 서비스 계정 세션
const ok: AuthResult = { ok: true, session }; // 로그인 성공
const goodLink = "#access_token=recovery-token&refresh_token=refresh-1&expires_in=3600&token_type=bearer&type=recovery"; // 메일의 링크가 주소 뒤에 붙여 주는 값

function liveAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter // 실제 서비스 로그인 대역
{ // 함수 시작
    return { mode: "live", listAccounts: () => [], socialProviders: async () => [], startSocialSignIn: vi.fn(async () => undefined), completeSocialSignIn: vi.fn(async () => ok), signIn: vi.fn(async () => ok), signUp: vi.fn(async () => ok), signOut: vi.fn(async () => undefined), deleteAccount: vi.fn(async () => ({ ok: true as const })), requestPasswordReset: vi.fn(async () => ({ ok: true as const })), canCompletePasswordReset: (params) => params.get("type") === "recovery" && params.get("access_token") !== null, completePasswordReset: vi.fn(async () => ok), canCompleteEmailConfirm: () => false, completeEmailConfirm: vi.fn(async () => ok), ...overrides }; // 대역 반환
} // 함수 종료

describe("비밀번호 다시 정하기", () => // 재설정 묶음
{ // 묶음 시작
    beforeEach(() => // 준비
    { // 준비 시작
        localStorage.clear(); // 저장소 비움
        window.history.replaceState(null, "", "/"); // 주소 되돌림
    }); // 준비 종료

    it("로그인 화면에서 비밀번호를 잊었다고 하면 이메일로 재설정 메일을 요청하고, 보낸 뒤에는 같은 안내를 보여 준다", async () => // 메일 요청 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const requestPasswordReset = vi.fn<AuthAdapter["requestPasswordReset"]>(async (email) => email === "limited@example.com" ? { ok: false, reason: "too-many" } : email === "offline@example.com" ? { ok: false, reason: "unavailable" } : { ok: true }); // 한 주소는 너무 잦다고, 한 주소는 서비스에 닿지 못했다고 거절
        render(<LoginScreen adapter={liveAdapter({ requestPasswordReset })} navigate={vi.fn()} />); // 로그인 화면
        await user.type(screen.getByLabelText("이메일"), "limited@example.com"); // 로그인 칸에 적어 둔 이메일
        await user.click(screen.getByRole("button", { name: "비밀번호를 잊으셨나요?" })); // 재설정으로
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("비밀번호 다시 정하기"); // 제목이 양식에 맞게 바뀜
        expect(screen.queryByLabelText("비밀번호")).toBeNull(); // 비밀번호 칸은 없음
        expect(screen.getByLabelText("이메일")).toHaveValue("limited@example.com"); // 적어 둔 이메일이 그대로
        await user.click(screen.getByRole("button", { name: "재설정 메일 보내기" })); // 보내기
        expect(await screen.findByRole("alert")).toHaveTextContent("요청이 너무 잦아요. 잠시 뒤 다시 시도해 주세요."); // 거절 안내
        await user.clear(screen.getByLabelText("이메일")); // 지우고
        await user.type(screen.getByLabelText("이메일"), "offline@example.com"); // 서비스에 닿지 못하는 경우
        await user.click(screen.getByRole("button", { name: "재설정 메일 보내기" })); // 보내기
        expect(await screen.findByRole("alert")).toHaveTextContent("지금은 메일을 보낼 수 없어요. 잠시 뒤 다시 시도해 주세요."); // 로그인이 아니라 메일에 맞는 안내
        await user.clear(screen.getByLabelText("이메일")); // 지우고
        await user.type(screen.getByLabelText("이메일"), "soha@example.com"); // 다른 이메일
        await user.click(screen.getByRole("button", { name: "재설정 메일 보내기" })); // 보내기
        expect(await screen.findByRole("status")).toHaveTextContent("입력한 주소로 가입한 계정이 있으면 비밀번호를 다시 정하는 메일을 보냈어요. 메일의 링크를 눌러 주세요."); // 가입 여부를 알려 주지 않는 안내
        expect(requestPasswordReset).toHaveBeenLastCalledWith("soha@example.com", `${window.location.origin}/auth/reset`); // 돌아올 주소와 함께 요청
        await user.click(screen.getByRole("button", { name: "로그인으로 돌아가기" })); // 돌아가기
        expect(screen.getByLabelText("비밀번호")).toBeVisible(); // 로그인 양식
        await user.click(screen.getByRole("tab", { name: "회원가입" })); // 회원가입으로
        expect(screen.queryByRole("button", { name: "비밀번호를 잊으셨나요?" })).toBeNull(); // 가입 양식에는 없음
    }); // 검증 종료

    it("연습용 로그인 화면에는 비밀번호 찾기가 없고, 재설정 주소를 열면 비밀번호가 없다고 알린다", async () => // 연습용 검증
    { // 검증 시작
        const adapter = createPracticeAuthAdapter(localStorage); // 연습용 로그인
        const login = render(<LoginScreen adapter={adapter} navigate={vi.fn()} />); // 로그인 화면
        expect(screen.queryByRole("button", { name: "비밀번호를 잊으셨나요?" })).toBeNull(); // 비밀번호 찾기 없음
        login.unmount(); // 정리
        render(<PasswordResetScreen adapter={adapter} navigate={vi.fn()} hash={goodLink} />); // 재설정 화면
        expect(await screen.findByText("연습용 로그인에는 비밀번호가 없어요. 이름만으로 로그인할 수 있어요.")).toBeVisible(); // 안내
        expect(screen.getByRole("link", { name: "로그인 화면으로" })).toHaveAttribute("href", "/login"); // 로그인 화면으로
        expect(screen.queryByLabelText("새 비밀번호")).toBeNull(); // 입력 칸 없음
    }); // 검증 종료

    it("메일의 링크로 들어오면 새 비밀번호를 두 번 받아 정하고, 그 계정으로 로그인해 메인으로 보낸다", async () => // 새 비밀번호 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        const completePasswordReset = vi.fn<AuthAdapter["completePasswordReset"]>(async (_params, password) => password === "old-password-1" ? { ok: false, reason: "same-password" } : ok); // 예전 비밀번호만 거절
        window.history.replaceState(null, "", `/auth/reset${goodLink}`); // 메일의 링크로 들어온 주소
        render(<StrictMode><PasswordResetScreen adapter={liveAdapter({ completePasswordReset })} navigate={navigate} /></StrictMode>); // 재설정 화면(개발 모드처럼 효과를 두 번 돌려도 주소의 값을 잃지 않아야 함)
        const first = await screen.findByLabelText("새 비밀번호"); // 새 비밀번호 칸
        expect([window.location.pathname, window.location.hash]).toEqual(["/auth/reset", ""]); // 출입증을 주소에서 지움
        expect([first.getAttribute("type"), first.getAttribute("autocomplete")]).toEqual(["password", "new-password"]); // 가려서 입력하고 새 비밀번호로 알림
        await user.type(first, "new-password-1"); // 새 비밀번호
        await user.type(screen.getByLabelText("새 비밀번호 확인"), "new-password-2"); // 다르게 적은 확인
        await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" })); // 바꾸기
        expect(screen.getByRole("alert")).toHaveTextContent("두 비밀번호가 서로 달라요."); // 다르다는 안내
        expect(completePasswordReset).not.toHaveBeenCalled(); // 서비스에 보내지 않음
        for (const field of [first, screen.getByLabelText("새 비밀번호 확인")]) // 두 칸
        { // 순회 시작
            await user.clear(field); // 지우고
            await user.type(field, "old-password-1"); // 예전 비밀번호
        } // 순회 종료
        await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" })); // 바꾸기
        expect(await screen.findByRole("alert")).toHaveTextContent("예전과 다른 비밀번호를 정해 주세요."); // 서비스가 알려 준 이유
        expect(navigate).not.toHaveBeenCalled(); // 이동하지 않음
        for (const field of [first, screen.getByLabelText("새 비밀번호 확인")]) // 두 칸
        { // 순회 시작
            await user.clear(field); // 지우고
            await user.type(field, "new-password-1"); // 새 비밀번호
        } // 순회 종료
        await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" })); // 바꾸기
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 메인으로 새로 엶
        expect(completePasswordReset.mock.calls.at(-1)?.[0].get("access_token")).toBe("recovery-token"); // 링크가 준 출입증으로 요청
        expect(completePasswordReset.mock.calls.at(-1)?.[1]).toBe("new-password-1"); // 새 비밀번호
        expect(readAccountSession(localStorage)).toEqual(session); // 세션 저장
    }); // 검증 종료

    it("만료됐거나 값이 없는 링크로 들어오면 입력 칸 대신 메일을 다시 받으라고 알린다", async () => // 깨진 링크 검증
    { // 검증 시작
        const first = render(<PasswordResetScreen adapter={liveAdapter()} navigate={vi.fn()} hash="#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired" />); // 만료된 링크
        expect(await screen.findByRole("alert")).toHaveTextContent("링크가 만료됐거나 이미 사용됐어요. 로그인 화면에서 메일을 다시 받아 주세요."); // 안내
        expect(screen.queryByLabelText("새 비밀번호")).toBeNull(); // 입력 칸 없음
        first.unmount(); // 정리
        render(<PasswordResetScreen adapter={liveAdapter()} navigate={vi.fn()} hash="" />); // 값 없이 주소만 연 경우
        expect(await screen.findByRole("alert")).toHaveTextContent("링크가 만료됐거나 이미 사용됐어요."); // 같은 안내
        expect(screen.getByRole("link", { name: "로그인 화면으로" })).toHaveAttribute("href", "/login"); // 로그인 화면으로
    }); // 검증 종료
}); // 묶음 종료
