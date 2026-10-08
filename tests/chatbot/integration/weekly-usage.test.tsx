import { act, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { RewardsScreen } from "@chatbot/features/rewards/RewardsScreen"; // 출석과 미션 화면
import { getWeekKey } from "@chatbot/features/rewards/weekly-model"; // 주간 미션
import { USAGE_STORAGE_KEY } from "@chatbot/features/safety/useUsageReminder"; // 이용 시간 저장 키
import { ProfileSettings } from "@chatbot/features/settings/ProfileSettings"; // 프로필 관리
import { getDateKey } from "@chatbot/lib/time/date-key"; // 날짜 키
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/rewards", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

vi.setConfig({ testTimeout: 20_000 }); // 화면이 큰 테스트라 넉넉히 기다림

function Balance() // 잔액 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="잔액">{state.wallet.balance}</output>; // 잔액 출력
} // 함수 종료

describe("주간 미션 화면", () => // 주간 미션 묶음
{ // 묶음 시작
    it("목표를 채운 주간 미션은 받기 버튼이 나오고, 받으면 토큰이 늘며 받음으로 바뀐다", async () => // 받기 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const base = createInitialState(); // 초기 상태
        const state: AppState = { ...base, rewards: { ...base.rewards, weekly: { weekKey: getWeekKey(new Date()), progress: { "weekly-conversations": 3, "weekly-messages": 12 }, claimed: [] } } }; // 새 대화 3번을 채운 상태
        renderWithApp(<><RewardsScreen /><Balance /></>, state); // 화면 렌더
        const list = screen.getByRole("list", { name: "주간 미션 목록" }); // 주간 미션 목록
        expect(within(list).getAllByRole("listitem")).toHaveLength(3); // 세 가지
        expect(within(list).getByRole("progressbar", { name: "메시지 30번 보내기 진행" })).toHaveAttribute("aria-valuenow", "12"); // 진행
        expect(within(list).getByRole("link", { name: "메시지 30번 보내기, 대화하러 가기" })).toHaveAttribute("href", "/"); // 하러 가는 링크
        expect(within(list).queryByRole("link", { name: /5일 출석하기/ })).not.toBeInTheDocument(); // 출석은 이 화면에서 하므로 링크 없음
        await user.click(within(list).getByRole("button", { name: "새 대화 3번 시작하기 보상 10토큰 받기" })); // 받기
        expect(screen.getByLabelText("잔액")).toHaveTextContent(String(base.wallet.balance + 10)); // 10토큰
        expect(screen.getByText("‘새 대화 3번 시작하기’ 보상 10토큰을 받았습니다.")).toBeInTheDocument(); // 안내
        expect(within(list).queryByRole("button", { name: /새 대화 3번 시작하기 보상/ })).not.toBeInTheDocument(); // 다시 받을 수 없음
        expect(within(list).getAllByRole("listitem")[2]).toHaveTextContent("받음"); // 받음 표시
    }); // 테스트 종료

    it("출석 도장을 찍으면 주간 출석 미션도 한 칸 오른다", async () => // 출석 연동 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<RewardsScreen />); // 화면 렌더
        const list = screen.getByRole("list", { name: "주간 미션 목록" }); // 주간 미션 목록
        expect(within(list).getByRole("progressbar", { name: "5일 출석하기 진행" })).toHaveAttribute("aria-valuenow", "0"); // 처음 0
        await user.click(screen.getByRole("button", { name: "출석하기 · +5토큰" })); // 출석
        expect(within(list).getByRole("progressbar", { name: "5일 출석하기 진행" })).toHaveAttribute("aria-valuenow", "1"); // 한 칸
    }); // 테스트 종료
}); // 묶음 종료

describe("오늘 이용 시간", () => // 이용 시간 묶음
{ // 묶음 시작
    it("다른 탭에서 쓴 시간에 이어서 세어 오늘 60분이 되면 쉬어 가기 알림을 보여 준다", () => // 하루 누적 검증
    { // 테스트 시작
        const start = new Date("2026-10-04T03:00:00.000Z"); // 한국 시간 낮 12시
        vi.useFakeTimers({ now: start }); // 시각 고정
        try // 시계 복원 보장
        { // 시도 시작
            window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ dateKey: getDateKey(start), activeMs: 58 * 60_000, lastTickAt: null, nextReminderAtMs: 60 * 60_000 })); // 다른 탭에서 이미 58분
            renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
            act(() => { vi.advanceTimersByTime(60_000); }); // 1분(합계 59분)
            expect(screen.queryByText(/동안 이용했어요/)).not.toBeInTheDocument(); // 아직
            act(() => { vi.advanceTimersByTime(60_000); }); // 1분 더(합계 60분)
            expect(screen.getByText("오늘 1시간 동안 이용했어요. 잠깐 쉬어 가도 대화는 그대로 남아 있어요.")).toBeInTheDocument(); // 오늘 합계로 알림
            expect(JSON.parse(window.localStorage.getItem(USAGE_STORAGE_KEY) ?? "{}")).toMatchObject({ dateKey: getDateKey(start), activeMs: 60 * 60_000, lastTickAt: null }); // 모든 탭이 보는 곳에 저장
        } // 시도 종료
        finally // 정리
        { // 정리 시작
            vi.useRealTimers(); // 실제 시계 복원
        } // 정리 종료
    }); // 테스트 종료

    it("어제 기록은 이어받지 않고, 프로필 관리에서 오늘 이용 시간을 보여 준다", () => // 날짜·표시 검증
    { // 테스트 시작
        window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ dateKey: "2000-01-01", activeMs: 90 * 60_000, lastTickAt: null, nextReminderAtMs: 120 * 60_000 })); // 오래전 기록
        const first = renderWithApp(<ProfileSettings />); // 프로필 렌더
        expect(within(screen.getByRole("list", { name: "활동 요약" })).getByText("오늘 이용 시간").closest("li")).toHaveTextContent("0분"); // 어제 기록은 0
        first.unmount(); // 화면 닫기
        window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ dateKey: getDateKey(new Date()), activeMs: 75 * 60_000, lastTickAt: null, nextReminderAtMs: 120 * 60_000 })); // 오늘 75분
        renderWithApp(<ProfileSettings />); // 다시 렌더
        expect(within(screen.getByRole("list", { name: "활동 요약" })).getByText("오늘 이용 시간").closest("li")).toHaveTextContent("1시간 15분"); // 오늘 합계
    }); // 테스트 종료
}); // 묶음 종료
