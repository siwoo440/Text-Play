import { render, screen, waitFor } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AuthCallbackScreen } from "@chatbot/features/account/AuthCallbackScreen"; // 간편 로그인에서 돌아오는 화면
import { AuthLinkForward, resolveAuthLinkTarget } from "@chatbot/features/account/AuthLinkForward"; // 메일의 링크가 다른 화면으로 돌아왔을 때 보내 주기
import { LoginScreen } from "@chatbot/features/account/LoginScreen"; // 로그인 화면
import { readAccountSession, readActiveSession, writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AuthAdapter, AuthResult } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약

const session: AccountSession = { accountId: "0a1b2c3d-1111-2222-3333-444455556666", name: "소하", email: "soha@example.com", provider: "email", signedInAt: "2026-10-06T00:00:00.000Z" }; // 실제 서비스 계정 세션
const ok: AuthResult = { ok: true, session }; // 로그인 성공

function liveAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter // 실제 서비스 로그인 대역
{ // 함수 시작
    return { mode: "live", listAccounts: () => [], socialProviders: async () => ["google"], startSocialSignIn: vi.fn(async () => undefined), completeSocialSignIn: vi.fn(async () => ok), signIn: vi.fn(async () => ok), signUp: vi.fn(async () => ok), signOut: vi.fn(async () => undefined), deleteAccount: vi.fn(async () => ({ ok: true as const })), requestPasswordReset: vi.fn(async () => ({ ok: true as const })), canCompletePasswordReset: () => false, completePasswordReset: vi.fn(async () => ok), canCompleteEmailConfirm: () => false, completeEmailConfirm: vi.fn(async () => ok), ...overrides }; // 대역 반환
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
        expect(signUp).toHaveBeenCalledWith({ email: "new@example.com", password: "right-password-1", redirectTo: `${window.location.origin}/auth/callback` }); // 가입 요청(확인 메일의 링크가 돌아올 주소와 함께)
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

    it("가입 확인 메일의 링크로 돌아오면 바로 로그인해 메인으로 보내고, 주소에 붙어 온 출입증은 지운다", async () => // 가입 확인 링크로 돌아온 화면 검증
    { // 검증 시작
        const navigate = vi.fn(); // 화면 이동 기록
        const completeSocialSignIn = vi.fn<AuthAdapter["completeSocialSignIn"]>(async () => ({ ok: false, reason: "unavailable" })); // 간편 로그인 마무리(불리면 안 됨)
        const completeEmailConfirm = vi.fn<AuthAdapter["completeEmailConfirm"]>(async (params) => params.get("access_token") === "confirm-token" ? ok : { ok: false, reason: "link-expired" }); // 링크가 준 출입증이 맞을 때만 성공
        const canCompleteEmailConfirm = (params: URLSearchParams) => params.get("type") === "signup" || params.get("error") !== null; // 가입 확인 링크인지
        window.history.replaceState(null, "", "/auth/callback#access_token=confirm-token&refresh_token=refresh-1&type=signup"); // 메일의 링크로 돌아온 주소
        const { unmount } = render(<AuthCallbackScreen adapter={liveAdapter({ completeSocialSignIn, completeEmailConfirm, canCompleteEmailConfirm })} navigate={navigate} />); // 돌아온 화면
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 메인으로 새로 엶
        expect(completeEmailConfirm.mock.calls[0][0].get("refresh_token")).toBe("refresh-1"); // 주소 뒤의 값을 넘김
        expect(completeSocialSignIn).not.toHaveBeenCalled(); // 간편 로그인으로 처리하지 않음
        expect(readAccountSession(localStorage)).toEqual(session); // 세션 저장
        expect(window.location.hash).toBe(""); // 출입증이 주소 칸과 방문 기록에 남지 않게 지움
        unmount(); // 정리
        writeAccountSession(localStorage, null); // 로그아웃
        render(<AuthCallbackScreen adapter={liveAdapter({ completeSocialSignIn, completeEmailConfirm, canCompleteEmailConfirm })} navigate={navigate} hash="#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired" />); // 만료된 링크로 돌아온 화면
        expect(await screen.findByRole("alert")).toHaveTextContent("링크가 만료됐거나 이미 사용됐어요. 가입 확인을 이미 마쳤다면 그대로 로그인해 주세요. 아니라면 로그인 화면에서 같은 이메일로 다시 가입하거나, 비밀번호 재설정 메일을 다시 받아 주세요."); // 무엇을 하면 되는지 안내
        expect(screen.getByRole("link", { name: "로그인 화면으로" })).toHaveAttribute("href", "/login"); // 로그인 화면으로
        expect(navigate).toHaveBeenCalledTimes(1); // 실패하면 이동하지 않음
    }); // 검증 종료

    it("메일의 링크가 다른 화면으로 돌아오면 가입 확인은 돌아오는 화면으로, 비밀번호 재설정은 재설정 화면으로 보낸다", () => // 다른 화면으로 돌아온 링크 검증
    { // 검증 시작
        expect(resolveAuthLinkTarget("/", "#access_token=a&refresh_token=b&type=signup")).toBe("/auth/callback"); // 가입 확인
        expect(resolveAuthLinkTarget("/", "#access_token=a&refresh_token=b&type=recovery")).toBe("/auth/reset"); // 비밀번호 재설정
        expect(resolveAuthLinkTarget("/stories", "#error=access_denied&error_code=otp_expired")).toBe("/auth/callback"); // 만료된 링크는 안내가 있는 화면으로
        expect(resolveAuthLinkTarget("/", "")).toBeNull(); // 붙어 온 값이 없음
        expect(resolveAuthLinkTarget("/", "#story-list-title")).toBeNull(); // 화면 안의 위치로 가는 주소는 건드리지 않음
        expect(resolveAuthLinkTarget("/", "#access_token=a&refresh_token=b&type=magiclink")).toBeNull(); // 앱이 쓰지 않는 종류
        expect(resolveAuthLinkTarget("/auth/callback", "#access_token=a&refresh_token=b&type=signup")).toBeNull(); // 이미 받는 화면이면 그대로
        expect(resolveAuthLinkTarget("/auth/reset", "#access_token=a&refresh_token=b&type=recovery")).toBeNull(); // 이미 받는 화면이면 그대로
        const visited: string[] = []; // 이동한 주소
        window.history.replaceState(null, "", "/#access_token=a&refresh_token=b&type=recovery"); // 재설정 링크가 메인 화면으로 돌아온 경우
        const { unmount } = render(<AuthLinkForward live navigate={(href) => visited.push(href)} />); // 실제 로그인 방식일 때
        expect(visited).toEqual(["/auth/reset#access_token=a&refresh_token=b&type=recovery"]); // 붙어 온 값과 함께 재설정 화면으로
        unmount(); // 정리
        render(<AuthLinkForward live={false} navigate={(href) => visited.push(href)} />); // 연습용일 때
        expect(visited).toHaveLength(1); // 아무 데도 보내지 않음
        window.history.replaceState(null, "", "/"); // 주소 되돌림
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
