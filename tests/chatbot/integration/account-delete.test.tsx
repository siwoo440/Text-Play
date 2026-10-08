import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AccountManagement } from "@chatbot/features/settings/AccountManagement"; // 계정 관리
import { setSyncStatus } from "@chatbot/features/account/sync-status"; // 맞추기 상태
import { PrivacySettings } from "@chatbot/features/settings/PrivacySettings"; // 개인정보 및 보안
import { readAccountSession, writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import type { AuthAdapter } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { createPracticeAuthAdapter } from "@chatbot/lib/account/practice-auth-adapter"; // 연습용 로그인
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/settings/privacy", // 현재 경로 대역
    useSearchParams: () => new URLSearchParams(), // 주소 값 대역
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 대역
})); // 대체 종료

const stateKey = "mateverse:v1:u:practice-soha:state"; // 계정 칸의 앱 데이터 열쇠
const draftKey = "mateverse:v1:u:practice-soha:draft:character:new"; // 계정 칸의 임시 저장 열쇠
const serverKey = "mateverse:v1:practice-server:practice-soha"; // 연습용 서버의 저장본 열쇠
const session: AccountSession = { accountId: "practice-soha", name: "소하", email: null, provider: "practice", signedInAt: "2026-10-07T00:00:00.000Z" }; // 연습용 계정 세션

function seed(): void // 계정·손님·서버 데이터를 넣어 두고 로그인
{ // 함수 시작
    localStorage.setItem(stateKey, "account-state"); // 계정 데이터
    localStorage.setItem(draftKey, "account-draft"); // 계정의 임시 저장
    localStorage.setItem(serverKey, "remote"); // 서버 저장본
    localStorage.setItem("mateverse:v1:state", "guest-state"); // 손님 데이터
    writeAccountSession(localStorage, session); // 로그인
} // 함수 종료

describe("계정 관리", () => // 계정 관리 묶음
{ // 묶음 시작
    beforeEach(() => // 준비
    { // 준비 시작
        localStorage.clear(); // 저장소 비움
        setSyncStatus(null); // 맞추기 상태 비움
    }); // 준비 종료

    it("손님에게는 계정 관리를 보여 주지 않고, 로그인하면 개인정보 화면에 계정 이름과 두 가지 지우기가 보인다", async () => // 표시 검증
    { // 검증 시작
        const guest = renderWithApp(<PrivacySettings />); // 손님 화면
        expect(screen.queryByRole("heading", { name: "계정 관리" })).toBeNull(); // 계정 관리 없음
        guest.unmount(); // 정리
        seed(); // 로그인
        renderWithApp(<PrivacySettings />); // 로그인한 화면
        const section = (await screen.findByRole("heading", { name: "계정 관리" })).closest("section") as HTMLElement; // 계정 관리 칸
        expect(within(section).getByText("소하")).toBeVisible(); // 계정 이름
        expect(within(section).getByText("연습용 로그인")).toBeVisible(); // 로그인 방법
        expect(within(section).getByRole("button", { name: "이 기기에서 계정 데이터 지우기" })).toBeEnabled(); // 기기 데이터 지우기
        expect(within(section).getByRole("button", { name: "계정 지우기(탈퇴)" })).toBeEnabled(); // 탈퇴
    }); // 검증 종료

    it("이 기기의 계정 데이터를 지우면 계정 칸만 비우고 로그아웃하며, 서버 저장본과 손님 데이터는 남긴다", async () => // 기기 데이터 지우기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        const adapter = createPracticeAuthAdapter(localStorage); // 연습용 로그인
        await adapter.signIn({ name: "소하" }); // 쓴 계정 목록에 넣어 둠
        seed(); // 로그인
        setSyncStatus({ phase: "saved", syncedAt: "2026-10-07T00:00:00.000Z", mode: "practice" }); // 서버에 저장된 상태
        renderWithApp(<AccountManagement adapter={adapter} navigate={navigate} />); // 계정 관리
        await user.click(await screen.findByRole("button", { name: "이 기기에서 계정 데이터 지우기" })); // 지우기
        const dialog = screen.getByRole("dialog", { name: "이 기기에서 계정 데이터를 지울까요?" }); // 확인 창
        expect(dialog).toHaveTextContent("다시 로그인하면 서버에 저장된 데이터를 받아 와요."); // 서버 것은 남는다는 안내
        expect(within(dialog).queryByRole("alert")).toBeNull(); // 저장됐으면 경고 없음
        await user.click(within(dialog).getByRole("button", { name: "취소" })); // 취소
        expect(screen.queryByRole("dialog")).toBeNull(); // 창 닫힘
        expect([localStorage.getItem(stateKey), readAccountSession(localStorage)?.name]).toEqual(["account-state", "소하"]); // 아무것도 지우지 않음
        await user.click(screen.getByRole("button", { name: "이 기기에서 계정 데이터 지우기" })); // 다시 열기
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "지우고 로그아웃" })); // 지우기
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 손님 화면으로 새로 엶
        expect([localStorage.getItem(stateKey), localStorage.getItem(draftKey), readAccountSession(localStorage)]).toEqual([null, null, null]); // 계정 칸을 비우고 로그아웃
        expect([localStorage.getItem(serverKey), localStorage.getItem("mateverse:v1:state")]).toEqual(["remote", "guest-state"]); // 서버 저장본과 손님 데이터는 그대로
        expect(adapter.listAccounts().map((account) => account.name)).toEqual(["소하"]); // 계정은 그대로 있어 다시 로그인할 수 있음
    }); // 검증 종료

    it("서버에 아직 올리지 못한 변경이 있을 수 있으면 지우기 전에 알린다", async () => // 올리지 못한 변경 경고 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        seed(); // 로그인
        setSyncStatus({ phase: "offline", syncedAt: null, mode: "live" }); // 서버에 닿지 못한 상태
        renderWithApp(<AccountManagement adapter={createPracticeAuthAdapter(localStorage)} navigate={vi.fn()} />); // 계정 관리
        await user.click(await screen.findByRole("button", { name: "이 기기에서 계정 데이터 지우기" })); // 지우기
        expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("서버에 아직 올리지 못한 변경이 있을 수 있어요. 지우면 그 변경은 사라져요."); // 경고
    }); // 검증 종료

    it("계정 지우기는 되돌릴 수 없다는 것을 확인해야 누를 수 있고, 지우면 계정 칸을 비우고 손님으로 돌아간다", async () => // 탈퇴 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        const adapter = createPracticeAuthAdapter(localStorage); // 연습용 로그인
        await adapter.signIn({ name: "소하" }); // 쓴 계정 목록에 넣어 둠
        seed(); // 로그인(식별자는 아래에서 실제 것으로 바꿈)
        const real = adapter.listAccounts()[0].accountId; // 연습용 로그인이 만든 식별자
        writeAccountSession(localStorage, { ...session, accountId: real }); // 실제 식별자로 로그인
        localStorage.setItem(`mateverse:v1:u:${real}:state`, "account-state"); // 그 계정의 데이터
        localStorage.setItem(`mateverse:v1:practice-server:${real}`, "remote"); // 그 계정의 서버 저장본
        renderWithApp(<AccountManagement adapter={adapter} navigate={navigate} />); // 계정 관리
        await user.click(await screen.findByRole("button", { name: "계정 지우기(탈퇴)" })); // 탈퇴
        const dialog = screen.getByRole("dialog", { name: "계정을 지울까요?" }); // 확인 창
        expect(dialog).toHaveTextContent("되돌릴 수 없어요"); // 되돌릴 수 없다는 안내
        const confirm = within(dialog).getByRole("button", { name: "계정 지우기" }); // 지우기 버튼
        expect(confirm).toBeDisabled(); // 확인하기 전에는 누를 수 없음
        await user.click(within(dialog).getByRole("checkbox", { name: "되돌릴 수 없다는 것을 확인했어요" })); // 확인
        await user.click(confirm); // 지우기
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/")); // 손님 화면으로 새로 엶
        expect([localStorage.getItem(`mateverse:v1:u:${real}:state`), localStorage.getItem(`mateverse:v1:practice-server:${real}`), readAccountSession(localStorage)]).toEqual([null, null, null]); // 계정 데이터·서버 저장본·세션이 모두 사라짐
        expect(adapter.listAccounts()).toEqual([]); // 계정도 사라짐
        expect(localStorage.getItem("mateverse:v1:state")).toBe("guest-state"); // 손님 데이터는 그대로
    }); // 검증 종료

    it("서비스가 계정을 지우지 못하면 이유를 알리고 아무것도 지우지 않는다", async () => // 탈퇴 실패 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const navigate = vi.fn(); // 화면 이동 기록
        const deleteAccount = vi.fn<AuthAdapter["deleteAccount"]>(async () => ({ ok: false, reason: "unavailable" })); // 지우지 못하는 서비스
        seed(); // 로그인
        renderWithApp(<AccountManagement adapter={{ ...createPracticeAuthAdapter(localStorage), deleteAccount }} navigate={navigate} />); // 계정 관리
        await user.click(await screen.findByRole("button", { name: "계정 지우기(탈퇴)" })); // 탈퇴
        const dialog = screen.getByRole("dialog"); // 확인 창
        await user.click(within(dialog).getByRole("checkbox")); // 확인
        await user.click(within(dialog).getByRole("button", { name: "계정 지우기" })); // 지우기
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("계정을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요."); // 실패 안내
        expect(deleteAccount).toHaveBeenCalledWith(session); // 지금 계정으로 요청
        expect([localStorage.getItem(stateKey), readAccountSession(localStorage)?.name]).toEqual(["account-state", "소하"]); // 그대로
        expect(navigate).not.toHaveBeenCalled(); // 이동하지 않음
    }); // 검증 종료
}); // 묶음 종료
