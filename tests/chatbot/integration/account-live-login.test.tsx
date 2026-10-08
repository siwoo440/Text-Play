import { render, screen, waitFor } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AuthCallbackScreen } from "@chatbot/features/account/AuthCallbackScreen"; // 간편 로그인에서 돌아오는 화면
import { LoginScreen } from "@chatbot/features/account/LoginScreen"; // 로그인 화면
import { readAccountSession, readActiveSession, writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AuthAdapter, AuthResult } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약

const session: AccountSession = { accountId: "0a1b2c3d-1111-2222-3333-444455556666", name: "소하", email: "soha@example.com", provider: "email", signedInAt: "2026-10-06T00:00:00.000Z" }; // 실제 서비스 계정 세션
const ok: AuthResult = { ok: true, session }; // 로그인 성공

function liveAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter // 실제 서비스 로그인 대역
{ // 함수 시작
    return { mode: "live", listAccounts: () => [], socialProviders: async () => ["google"], startSocialSignIn: vi.fn(async () => undefined), completeSocialSignIn: vi.fn(async () => ok), signIn: vi.fn(async () => ok), signUp: vi.fn(async () => ok), signOut: vi.fn(async () => undefined), deleteAccount: vi.fn(async () => ({ ok: true as const })), requestPasswordReset: vi.fn(async () => ({ ok: true as const })), canCompletePasswordReset: () => false, completePasswordReset: vi.fn(async () => ok), ...overrides }; // 대역 반환
} // 함수 종료

describe("실제 서비스 로그인 화면", () => // 로그인 화면 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("이메일과 비밀번호로 로그인하고, 틀리면 이유를 알려 준다", async () => // 이메일 로그인 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        const signIn = vi.fn<AuthAdapter["signIn"]>(async (input) => input.password === "right-password-1" ? ok : { ok: false, reason: "wrong-credentials" }); // 비밀번호가 맞을 때만 성공
        render(<LoginScreen adapter={liveAdapter({ signIn })} navigate={navigate} />); // 로그인 화면
        expect(screen.queryByRole("note")).toBeNull(); // 연습용 안내 없음
        expect(screen.queryByLabelText("계정 이름")).toBeNull(); // 이름 입력 없음
        await user.type(screen.getByLabelText("이메일"), "soha@example.com"); // 이메일
        await user.type(screen.getByLabelText("비밀번호"), "wrong-password-1"); // 틀린 비밀번호
        await user.click(screen.getByRole("button", { name: "이메일로 로그인" })); // 로그인
        expect(await screen.findByRole("alert")).toHaveTextContent("이메일이나 비밀번호가 맞지 않아요."); // 이유 안내
        expect(navigate).not.toHaveBeenCalled(); // 이동하지 않음
        await user.clear(screen.getByLabelText("비밀번호")); // 지우고
        await user.type(screen.getByLabelText("비밀번호"), "right-password-1"); // 맞는 비밀번호
        await user.click(screen.getByRole("button", { name: "이메일로 로그인" })); // 로그인
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 메인으로 새로 엶
        expect(signIn).toHaveBeenLastCalledWith({ email: "soha@example.com", password: "right-password-1" }); // 보낸 값
        expect(readAccountSession(localStorage)).toEqual(session); // 세션 저장
        expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "password"); // 비밀번호는 가려서 입력
    }); // 검증 종료

    it("회원가입으로 바꾸면 가입을 요청하고, 메일 확인이 필요하면 그렇게 알린다", async () => // 회원가입 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        const signUp = vi.fn<AuthAdapter["signUp"]>(async () => ({ ok: false, reason: "confirm-email" })); // 메일 확인 필요
        const signIn = vi.fn<AuthAdapter["signIn"]>(async () => ok); // 로그인(불리면 안 됨)
        render(<LoginScreen adapter={liveAdapter({ signIn, signUp })} navigate={navigate} />); // 로그인 화면
        await user.click(screen.getByRole("tab", { name: "회원가입" })); // 회원가입으로
        await user.type(screen.getByLabelText("이메일"), "new@example.com"); // 이메일
        await user.type(screen.getByLabelText("비밀번호"), "right-password-1"); // 비밀번호
        await user.click(screen.getByRole("button", { name: "가입하기" })); // 가입
        expect(await screen.findByRole("alert")).toHaveTextContent("받은 메일의 확인 버튼을 누른 뒤 로그인해 주세요."); // 메일 확인 안내
        expect(signUp).toHaveBeenCalledWith({ email: "new@example.com", password: "right-password-1" }); // 가입 요청
        expect(signIn).not.toHaveBeenCalled(); // 로그인 요청은 하지 않음
        expect(navigate).not.toHaveBeenCalled(); // 이동하지 않음
    }); // 검증 종료

    it("서비스에서 켜 둔 간편 로그인만 버튼으로 보여 주고, 누르면 돌아올 주소와 함께 시작한다", async () => // 간편 로그인 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const startSocialSignIn = vi.fn<AuthAdapter["startSocialSignIn"]>(async () => undefined); // 시작 기록
        render(<LoginScreen adapter={liveAdapter({ startSocialSignIn })} navigate={vi.fn()} />); // 로그인 화면
        await user.click(await screen.findByRole("button", { name: "Google로 계속하기" })); // Google 로그인
        expect(startSocialSignIn).toHaveBeenCalledWith("google", `${window.location.origin}/auth/callback`); // 돌아올 주소
        expect(screen.queryByRole("button", { name: "카카오로 계속하기" })).toBeNull(); // 켜지 않은 서비스는 없음
    }); // 검증 종료

    it("간편 로그인에서 돌아오면 로그인을 마치고 메인으로 보내며, 실패하면 다시 시도하게 한다", async () => // 돌아오는 화면 검증
    { // 검증 시작
        const navigate = vi.fn(); // 화면 이동 기록
        const completeSocialSignIn = vi.fn<AuthAdapter["completeSocialSignIn"]>(async (params) => params.get("code") === "good-code" ? { ok: true, session: { ...session, provider: "google" } } : { ok: false, reason: "unavailable" }); // 코드가 맞을 때만 성공
        const { unmount } = render(<AuthCallbackScreen adapter={liveAdapter({ completeSocialSignIn })} navigate={navigate} search="?code=good-code" />); // 돌아온 화면
        expect(screen.getByRole("status")).toHaveTextContent("잠시만 기다려 주세요."); // 기다리는 중
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 메인으로 새로 엶
        expect(readAccountSession(localStorage)?.provider).toBe("google"); // 세션 저장
        unmount(); // 정리
        writeAccountSession(localStorage, null); // 로그아웃
        render(<AuthCallbackScreen adapter={liveAdapter({ completeSocialSignIn })} navigate={navigate} search="?error=access_denied" />); // 거절돼 돌아온 화면
        expect(await screen.findByRole("alert")).toHaveTextContent("로그인을 끝내지 못했어요. 다시 시도해 주세요."); // 실패 안내
        expect(screen.getByRole("link", { name: "로그인 화면으로" })).toHaveAttribute("href", "/login"); // 다시 시도
        expect(navigate).toHaveBeenCalledTimes(1); // 실패하면 이동하지 않음
    }); // 검증 종료

    it("연습용에서 실제 서비스로(또는 반대로) 바꾸면 예전 방식의 계정은 로그인하지 않은 것으로 본다", () => // 방식 전환 검증
    { // 검증 시작
        writeAccountSession(localStorage, { ...session, accountId: "practice-soha", email: null, provider: "practice" }); // 연습용 계정으로 로그인해 둠
        expect(readActiveSession(localStorage, false)?.accountId).toBe("practice-soha"); // 연습용일 때는 그대로
        expect(readActiveSession(localStorage, true)).toBeNull(); // 실제 서비스를 켜면 쓰지 않음
        writeAccountSession(localStorage, session); // 실제 서비스 계정
        expect(readActiveSession(localStorage, true)?.accountId).toBe(session.accountId); // 실제 서비스일 때는 그대로
        expect(readActiveSession(localStorage, false)).toBeNull(); // 연습용으로 돌리면 쓰지 않음
    }); // 검증 종료
}); // 묶음 종료
