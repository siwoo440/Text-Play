import { render, screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppHeader } from "@chatbot/components/app-shell/AppHeader"; // 앱 헤더
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 사용자 패널
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { DiscoveryHome } from "@chatbot/features/discovery/DiscoveryHome"; // 메인 화면
import { RewardsScreen } from "@chatbot/features/rewards/RewardsScreen"; // 출석과 미션 화면
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { getDateKey } from "@chatbot/lib/time/date-key"; // 날짜 키
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
    usePathname: () => "/rewards", // 현재 경로
})); // 대체 종료

function Probe() // 상태 표시와 출석 버튼(채팅 중 다른 곳에서 받는 상황 재현)
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    return ( // 표시 반환
        <> {/* 표시 묶음 */}
            <output aria-label="잔액">{state.wallet.balance}</output> {/* 잔액 */}
            <output aria-label="누적 사용">{state.wallet.totalUsed}</output> {/* 누적 사용 */}
            <output aria-label="메시지 미션">{state.rewards.missions.progress["send-messages"] ?? 0}</output> {/* 메시지 미션 진행 */}
            <output aria-label="보상 알림">{state.notifications.filter((item) => item.kind === "reward").length}</output> {/* 보상 알림 수 */}
            <button type="button" onClick={() => dispatch({ type: "check-attendance", now: new Date().toISOString() })}>바깥 출석</button> {/* 다른 곳에서 출석 */}
        </> // 표시 묶음 종료
    ); // 반환 종료
} // 함수 종료

function withMissions(progress: Record<string, number>): AppState // 오늘 미션 진행을 넣은 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.rewards.missions = { dateKey: getDateKey(new Date()), progress, claimed: [], bonusClaimed: false }; // 오늘 진행
    return state; // 상태 반환
} // 함수 종료

describe("출석과 미션 화면", () => // 화면 묶음
{ // 묶음 시작
    it("출석하기를 누르면 도장이 찍히고 토큰과 받은 기록이 늘며 하루에 한 번만 받는다", async () => // 출석
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><RewardsScreen /><Probe /></>); // 렌더
        const board = screen.getByRole("list", { name: "출석 도장판" }); // 도장판
        expect(within(board).getAllByRole("listitem")).toHaveLength(7); // 일곱 칸
        expect(within(board).getByRole("listitem", { name: "1일차, 5토큰, 오늘 찍을 칸" })).toBeVisible(); // 오늘 칸
        expect(within(board).getByRole("listitem", { name: "7일차, 20토큰, 아직" })).toBeVisible(); // 7일차 보상
        await user.click(screen.getByRole("button", { name: "출석하기 · +5토큰" })); // 출석
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1245"); // 5토큰 받음
        expect(within(board).getByRole("listitem", { name: "1일차, 5토큰, 출석 완료" })).toBeVisible(); // 도장
        expect(screen.getByRole("button", { name: "오늘 출석 완료" })).toBeDisabled(); // 다시 받을 수 없음
        expect(screen.getByText("출석 1일차 도장을 찍고 5토큰을 받았습니다.")).toBeVisible(); // 안내
        const records = screen.getByRole("list", { name: "받은 토큰 기록" }); // 받은 기록
        expect(within(records).getByText("출석 1일차")).toBeVisible(); // 기록 이름
        expect(within(records).getByText("+5")).toBeVisible(); // 받은 토큰
    }); // 검증 종료

    it("목표를 채운 미션만 받기 버튼이 나오고 나머지는 하러 가는 링크를 보여 준다", async () => // 미션 받기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><RewardsScreen /><Probe /></>, withMissions({ "send-messages": 5, "start-conversation": 0 })); // 메시지 미션만 완료
        const list = screen.getByRole("list", { name: "오늘의 미션 목록" }); // 미션 목록
        expect(within(list).getByRole("progressbar", { name: "메시지 5번 보내기 진행" })).toHaveAttribute("aria-valuenow", "5"); // 진행 5/5
        expect(within(list).getByRole("link", { name: "새 대화 시작하기, 둘러보기" })).toHaveAttribute("href", "/explore"); // 미완료는 링크
        expect(within(list).queryByRole("button", { name: /모두 완료 보너스/ })).toBeNull(); // 보너스는 아직
        await user.click(within(list).getByRole("button", { name: "메시지 5번 보내기 보상 3토큰 받기" })); // 받기
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1243"); // 3토큰
        expect(within(list).queryByRole("button", { name: "메시지 5번 보내기 보상 3토큰 받기" })).toBeNull(); // 받은 뒤 버튼 없음
        expect(within(list).getByText("받음")).toBeVisible(); // 받음 표시
        expect(screen.getByRole("button", { name: "미션 보상 모두 받기" })).toBeDisabled(); // 더 받을 것 없음
    }); // 검증 종료

    it("세 미션을 모두 채우면 모두 받기로 미션 보상과 보너스를 한 번에 받는다", async () => // 모두 받기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><RewardsScreen /><Probe /></>, withMissions({ "send-messages": 5, "start-conversation": 1, "favorite-work": 1 })); // 모두 완료
        await user.click(screen.getByRole("button", { name: "미션 보상 모두 받기" })); // 모두 받기
        expect(screen.getByLabelText("잔액")).toHaveTextContent(String(1240 + 3 + 3 + 2 + 5)); // 13토큰
        expect(screen.getByText("미션 보상 13토큰을 한 번에 받았습니다.")).toBeVisible(); // 안내
        expect(within(screen.getByRole("list", { name: "오늘의 미션 목록" })).getAllByText("받음")).toHaveLength(4); // 미션 3 + 보너스
        expect(within(screen.getByRole("list", { name: "받은 토큰 기록" })).getAllByRole("listitem")).toHaveLength(4); // 기록 4줄
    }); // 검증 종료
}); // 묶음 종료

describe("출석과 미션으로 가는 길", () => // 진입 묶음
{ // 묶음 시작
    it("오른쪽 패널은 토큰 아래에 오늘 상태 카드를 보여 주고 메뉴에는 같은 링크를 다시 넣지 않는다", () => // 패널 카드
    { // 검증 시작
        const state = withMissions({ "favorite-work": 1 }); // 좋아요 미션 완료
        render(<UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} rewards={state.rewards} open onNavigate={() => undefined} />); // 패널 렌더
        const card = screen.getByRole("link", { name: /출석·미션/ }); // 카드
        expect(card).toHaveAttribute("href", "/rewards"); // 보상 페이지
        expect(card).toHaveTextContent("오늘 출석 전"); // 출석 상태
        expect(card).toHaveTextContent("도장 0/7 · 미션 1/3 · 받을 보상 2개"); // 출석 1 + 미션 1
        expect(within(screen.getByRole("navigation", { name: "사용자 메뉴" })).queryByRole("link", { name: /출석과 미션/ })).toBeNull(); // 메뉴에는 없음
    }); // 검증 종료

    it("받을 보상이 있으면 헤더 메뉴 버튼에 점을 보여 준다", () => // 헤더 점
    { // 검증 시작
        const props = { leftOpen: false, rightOpen: false, onToggleLeft: () => undefined, onToggleRight: () => undefined, onNavigate: () => undefined, leftButtonRef: { current: null }, rightButtonRef: { current: null } }; // 헤더 속성
        const ready = renderWithApp(<AppHeader {...props} rewardCount={2} />); // 보상 2개
        expect(screen.getByRole("button", { name: "사용자 패널 열기와 닫기" })).toHaveAttribute("title", "받을 수 있는 출석·미션 보상 2개"); // 설명
        expect(ready.container.querySelector(".app-header-dot")).not.toBeNull(); // 점 표시
        ready.unmount(); // 정리
        const done = renderWithApp(<AppHeader {...props} rewardCount={0} />); // 보상 없음
        expect(screen.getByRole("button", { name: "사용자 패널 열기와 닫기" })).not.toHaveAttribute("title"); // 설명 없음
        expect(done.container.querySelector(".app-header-dot")).toBeNull(); // 점 없음
    }); // 검증 종료

    it("메인 화면 카드가 지금 받을 수 있는 토큰을 알려 주고 보상 페이지로 이어진다", () => // 메인 카드
    { // 검증 시작
        renderWithApp(<DiscoveryHome />); // 메인 화면
        const card = screen.getByRole("link", { name: /오늘의 출석 도장을 찍어 보세요/ }); // 카드
        expect(card).toHaveAttribute("href", "/rewards"); // 보상 페이지
        expect(card).toHaveTextContent("출석 0/7 · 미션 0/3 · 지금 5토큰을 받을 수 있어요"); // 받을 토큰
    }); // 검증 종료
}); // 묶음 종료

describe("대화하면서 채우는 미션", () => // 채팅 연동 묶음
{ // 묶음 시작
    it("메시지를 보낼 때마다 미션이 오르고 5번째에 알림이 오며, 채팅 중 다른 곳에서 받은 토큰도 사라지지 않는다", async () => // 채팅 연동
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><Probe /></>); // 리안 대화
        const send = async (text: string) => // 보내고 끝까지 기다리기
        { // 함수 시작
            await user.type(screen.getByLabelText("메시지"), `${text}{Enter}`); // 입력 후 Enter
            await waitFor(() => expect(screen.getByLabelText("메시지")).toBeEnabled()); // 응답 완료
        }; // 함수 종료
        const balance = () => Number(screen.getByLabelText("잔액").textContent); // 전역 잔액
        const used = () => Number(screen.getByLabelText("누적 사용").textContent); // 누적 사용
        await send("안녕"); // 1번
        await waitFor(() => expect(screen.getByLabelText("메시지 미션")).toHaveTextContent("1")); // 진행 1/5 확인
        const before = balance(); // 출석 전 잔액
        await user.click(screen.getByRole("button", { name: "바깥 출석" })); // 채팅 중 출석(+5)
        expect(balance()).toBe(before + 5); // 받은 토큰 반영
        for (const text of ["오늘 뭐 해?", "책 추천해 줘", "좋아", "또 올게"]) // 4번 더
        { // 반복 시작
            await send(text); // 보내기
        } // 반복 종료
        await waitFor(() => expect(screen.getByLabelText("메시지 미션")).toHaveTextContent("5")); // 진행 5/5 확인
        expect(screen.getByLabelText("보상 알림")).toHaveTextContent("1"); // 완료 알림 한 번
        expect(used()).toBeGreaterThanOrEqual(5); // 메시지 5번 이상의 토큰 사용
        expect(balance()).toBe(1240 + 5 - used()); // 받은 5토큰은 남고 쓴 만큼만 줄어듦
        expect(screen.getByText(`${balance()} 토큰`)).toBeVisible(); // 채팅 제목 옆 잔액도 같은 값
    }); // 검증 종료
}); // 묶음 종료
