import { render, screen, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 사용자 패널
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { InviteLanding } from "@chatbot/features/rewards/InviteLanding"; // 초대 링크 화면
import { InviteSection } from "@chatbot/features/rewards/InviteSection"; // 친구 초대 칸
import { RewardsScreen } from "@chatbot/features/rewards/RewardsScreen"; // 출석과 미션 화면
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
    usePathname: () => "/rewards", // 현재 경로
})); // 대체 종료

function Probe() // 잔액과 초대 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <><output aria-label="잔액">{state.wallet.balance}</output><output aria-label="내 코드">{state.referral.code ?? "없음"}</output><output aria-label="받은 코드">{state.referral.redeemedCode ?? "없음"}</output></>; // 표시 반환
} // 함수 종료

function withCode(code = "ABCD2345"): AppState // 내 초대 코드가 있는 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.referral = { ...state.referral, code, createdAt: "2026-10-03T00:00:00.000Z" }; // 내 코드
    return state; // 상태 반환
} // 함수 종료

describe("친구 초대 칸", () => // 초대 칸 묶음
{ // 묶음 시작
    it("내 초대 링크를 만들면 코드와 링크가 보이고 링크를 복사할 수 있다", async () => // 링크 만들기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined); // 클립보드 감시
        renderWithApp(<><InviteSection /><Probe /></>); // 렌더
        expect(screen.getByRole("heading", { level: 2, name: "친구 초대" })).toBeVisible(); // 제목
        expect(screen.getByText(/로그인이 연결된 뒤부터 지급/)).toBeVisible(); // 초대한 사람 보상은 준비 중
        await user.click(screen.getByRole("button", { name: "내 초대 링크 만들기" })); // 만들기
        const code = screen.getByLabelText("내 코드").textContent ?? ""; // 만든 코드
        expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/); // 여덟 글자
        expect(screen.getByText(`${code.slice(0, 4)}-${code.slice(4)}`)).toBeVisible(); // 나눠서 표시
        const link = `${window.location.origin}/invite/${code}`; // 초대 링크
        expect(screen.getByLabelText("내 초대 링크")).toHaveValue(link); // 링크 표시
        expect(screen.queryByRole("button", { name: "내 초대 링크 만들기" })).toBeNull(); // 다시 만들 수 없음
        await user.click(screen.getByRole("button", { name: "링크 복사" })); // 복사
        expect(writeText).toHaveBeenCalledWith(link); // 링크 복사
        expect(screen.getByText("초대 링크를 복사했습니다.")).toBeVisible(); // 안내
        await user.click(screen.getByRole("button", { name: "코드 복사" })); // 코드 복사
        expect(writeText).toHaveBeenLastCalledWith(code); // 코드 복사
        const status = screen.getByLabelText("초대 현황"); // 초대 현황
        expect(status).toHaveTextContent("초대한 친구0명"); // 친구 수
        expect(status).toHaveTextContent("이번 달 받은 보상0/10명"); // 이번 달 보상
    }); // 검증 종료

    it("친구의 초대 코드를 넣으면 환영 보너스를 받고, 잘못된 코드와 내 코드는 이유를 알려 준다", async () => // 코드 입력
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><InviteSection /><Probe /></>, withCode()); // 내 코드가 있는 상태
        const input = screen.getByLabelText("친구의 초대 코드"); // 입력창
        const submit = screen.getByRole("button", { name: "보너스 30토큰 받기" }); // 받기
        expect(submit).toBeDisabled(); // 빈 입력
        await user.type(input, "12345"); // 짧은 코드
        await user.click(submit); // 받기
        expect(screen.getByRole("alert")).toHaveTextContent("초대 코드는 영문과 숫자 여덟 글자예요."); // 형식 오류
        await user.clear(input); // 지우기
        await user.type(input, "abcd-2345"); // 내 코드
        await user.click(submit); // 받기
        expect(screen.getByRole("alert")).toHaveTextContent("내 초대 코드는 넣을 수 없어요."); // 내 코드
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1240"); // 아직 그대로
        await user.clear(input); // 지우기
        await user.type(input, "wxyz-6789"); // 친구 코드
        await user.click(submit); // 받기
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1270"); // 30토큰
        expect(screen.getByLabelText("받은 코드")).toHaveTextContent("WXYZ6789"); // 받은 코드
        expect(screen.getByText("초대 보너스 30토큰을 받았습니다.")).toBeVisible(); // 안내
        expect(screen.queryByLabelText("친구의 초대 코드")).toBeNull(); // 한 번만
        expect(screen.getByRole("progressbar", { name: "초대해 준 친구의 보상 조건" })).toHaveAttribute("aria-valuenow", "0"); // 조건 0/5
    }); // 검증 종료

    it("초대한 친구가 있으면 목록과 이번 달 보상을 보여 준다", () => // 친구 목록
    { // 검증 시작
        const state = withCode(); // 내 코드가 있는 상태
        const month = new Date().toISOString(); // 이번 달
        state.referral.friends = [{ id: "f2", nickname: "달빛", qualifiedAt: month, rewardedAt: null }, { id: "f1", nickname: "새벽", qualifiedAt: month, rewardedAt: month }]; // 친구 2명(한 명은 한도 초과)
        renderWithApp(<InviteSection />, state); // 렌더
        const list = screen.getByRole("list", { name: "초대한 친구 목록" }); // 친구 목록
        expect(within(list).getAllByRole("listitem")).toHaveLength(2); // 2명
        expect(within(list).getByText("새벽")).toBeVisible(); // 이름
        expect(within(list).getByText("+30")).toBeVisible(); // 받은 보상
        expect(screen.getByLabelText("초대 현황")).toHaveTextContent("초대한 친구2명"); // 친구 수
        expect(screen.getByLabelText("초대 현황")).toHaveTextContent("이번 달 받은 보상1/10명"); // 보상 1명
    }); // 검증 종료

    it("출석과 미션 화면 안에 친구 초대 칸이 있고 오른쪽 패널에서 바로 갈 수 있다", () => // 위치
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const { container, unmount } = renderWithApp(<RewardsScreen />); // 보상 화면
        expect(container.querySelector("#invite")).toContainElement(screen.getByRole("heading", { level: 2, name: "친구 초대" })); // #invite 칸
        unmount(); // 정리
        render(<UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} rewards={state.rewards} open onNavigate={() => undefined} />); // 패널
        expect(screen.getByRole("link", { name: /친구 초대/ })).toHaveAttribute("href", "/rewards#invite"); // 친구 초대 링크
    }); // 검증 종료
}); // 묶음 종료

describe("초대 링크로 들어온 화면", () => // 도착 화면 묶음
{ // 묶음 시작
    it("받기를 누르면 환영 보너스를 받고 다음에 할 일을 안내한다", async () => // 받기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><InviteLanding code="wxyz6789" /><Probe /></>); // 소문자 주소
        expect(screen.getByRole("heading", { level: 1, name: "친구가 Mate Verse에 초대했어요" })).toBeVisible(); // 제목
        expect(screen.getByText(/초대 코드 WXYZ-6789/)).toBeVisible(); // 코드 표시
        await user.click(screen.getByRole("button", { name: "초대 받고 30토큰 받기" })); // 받기
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1270"); // 30토큰
        expect(screen.getByRole("heading", { level: 1, name: "초대 보너스를 받았어요" })).toBeVisible(); // 받은 뒤
        expect(screen.getByText(/지금 1,270토큰이 있어요/)).toBeVisible(); // 잔액 안내
        expect(screen.getByRole("link", { name: "대화 시작하기" })).toHaveAttribute("href", "/"); // 다음 할 일
        expect(screen.getByRole("link", { name: "출석과 미션 보기" })).toHaveAttribute("href", "/rewards"); // 보상 페이지
    }); // 검증 종료

    it("잘못된 링크, 내 링크, 이미 받은 경우를 구분해 안내한다", () => // 예외 안내
    { // 검증 시작
        const invalid = renderWithApp(<InviteLanding code="12" />); // 잘못된 코드
        expect(screen.getByRole("heading", { level: 1, name: "초대 링크를 확인해 주세요" })).toBeVisible(); // 잘못된 링크
        expect(screen.getByRole("link", { name: "초대 코드 직접 넣기" })).toHaveAttribute("href", "/rewards#invite"); // 직접 입력
        invalid.unmount(); // 정리
        const own = renderWithApp(<InviteLanding code="ABCD2345" />, withCode()); // 내 링크
        expect(screen.getByRole("heading", { level: 1, name: "내 초대 링크예요" })).toBeVisible(); // 내 링크 안내
        expect(screen.queryByRole("button", { name: /토큰 받기/ })).toBeNull(); // 받기 없음
        own.unmount(); // 정리
        const used = createInitialState(); // 이미 받은 상태
        used.referral = { ...used.referral, redeemedCode: "QRST2345", redeemedAt: "2026-10-01T00:00:00.000Z" }; // 다른 코드로 받음
        renderWithApp(<InviteLanding code="WXYZ6789" />, used); // 다른 초대 링크
        expect(screen.getByRole("heading", { level: 1, name: "이미 초대 보너스를 받았어요" })).toBeVisible(); // 한 번만
        expect(screen.queryByRole("button", { name: /토큰 받기/ })).toBeNull(); // 받기 없음
    }); // 검증 종료
}); // 묶음 종료
