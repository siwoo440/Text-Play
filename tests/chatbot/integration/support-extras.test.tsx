import { render, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { PageTitle } from "@chatbot/components/feedback/PageTitle"; // 탭 제목
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, TokenRecord } from "@chatbot/features/core/types"; // 상태 타입
import { ProfileSettings } from "@chatbot/features/settings/ProfileSettings"; // 프로필 관리
import { TokenSettings } from "@chatbot/features/settings/TokenSettings"; // 토큰 이용 내역
import { SupportScreen } from "@chatbot/features/support/SupportScreen"; // 고객 지원
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/support", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

vi.setConfig({ testTimeout: 20_000 }); // 화면이 큰 테스트라 넉넉히 기다림

const now = Date.now(); // 지금
const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString(); // 몇 시간 전
const records: TokenRecord[] = // 최근 순 기록(오늘 2건, 열흘 전 1건)
[ // 목록 시작
    { id: "spend-chat-1", direction: "spend", source: "chat", label: "대화", work: "새벽 도서관의 리안", amount: 3, balance: 1222, createdAt: hoursAgo(0) }, // 오늘 대화
    { id: "attendance-1", direction: "earn", source: "attendance", label: "출석 1일차", amount: 5, balance: 1225, createdAt: hoursAgo(0) }, // 오늘 출석
    { id: "spend-studio-1", direction: "spend", source: "studio-image", label: "이미지 만들기", work: "새벽 도서관 창가", amount: 20, balance: 1220, createdAt: hoursAgo(240) }, // 열흘 전 이미지
]; // 목록 종료

function MatureProbe() // 19+ 보기 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="19+ 보기">{String(state.settings.matureContentEnabled)}</output>; // 상태 출력
} // 함수 종료

afterEach(() => // 테스트 정리
{ // 정리 시작
    vi.unstubAllGlobals(); // 전역 대역 복원
    vi.restoreAllMocks(); // 대역 복원
}); // 정리 종료

describe("고객 지원의 업데이트 소식과 문의 초안", () => // 고객 지원 묶음
{ // 묶음 시작
    it("최근 소식 두 묶음을 보여 주고 더 보기로 지난 소식을 편다", async () => // 소식 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<SupportScreen />); // 고객 지원 렌더링
        const list = screen.getByRole("list", { name: "업데이트 소식 목록" }); // 소식 목록
        expect(within(list).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["영어 화면과 더 쉬운 찾기", "대화 다시 보기와 제작 도구"]); // 최근 두 묶음
        expect(within(list).getByText("2026년 10월 4일")).toBeInTheDocument(); // 날짜
        await user.click(screen.getByRole("button", { name: "지난 소식 더 보기 (2)" })); // 더 보기
        expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(4); // 모두 표시
        expect(screen.queryByRole("button", { name: /지난 소식 더 보기/ })).not.toBeInTheDocument(); // 버튼 사라짐
    }); // 테스트 종료

    it("문의 글은 빈 칸을 알려 주고, 다 적으면 진단 정보와 함께 복사한다", async () => // 문의 초안 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const writeText = vi.fn().mockResolvedValue(undefined); // 클립보드 대역
        vi.stubGlobal("navigator", { ...navigator, userAgent: "TestBrowser/1.0", clipboard: { writeText } }); // 클립보드 주입
        renderWithApp(<SupportScreen />); // 고객 지원 렌더링
        await user.click(screen.getByRole("button", { name: "문의 글 복사" })); // 빈 채로 복사
        expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual(["제목을 적어 주세요.", "내용을 적어 주세요."]); // 빈 칸 안내
        expect(writeText).not.toHaveBeenCalled(); // 복사하지 않음
        await user.selectOptions(screen.getByRole("combobox", { name: "문의 종류" }), "기능 제안"); // 종류
        await user.type(screen.getByRole("textbox", { name: "제목" }), "보관함 검색"); // 제목
        await user.type(screen.getByRole("textbox", { name: "내용" }), "보관함에서도 찾고 싶어요."); // 내용
        await user.click(screen.getByRole("button", { name: "문의 글 복사" })); // 복사
        const copied = writeText.mock.calls[0][0] as string; // 복사된 글
        expect(copied).toContain("[문의 종류] 기능 제안\n[제목] 보관함 검색\n[내용]\n보관함에서도 찾고 싶어요.\n\n[진단 정보]\n"); // 문의 글과 진단 정보
        expect(copied).toContain("브라우저: TestBrowser/1.0"); // 진단 정보 내용
        expect(await screen.findByRole("status", { name: "문의 안내" })).toHaveTextContent("문의 글을 복사했습니다."); // 성공 안내
        expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // 오류 사라짐
        await user.click(screen.getByRole("checkbox", { name: "진단 정보 함께 넣기" })); // 진단 정보 빼기
        await user.click(screen.getByRole("button", { name: "문의 글 복사" })); // 다시 복사
        expect(writeText.mock.calls[1][0]).toBe("[문의 종류] 기능 제안\n[제목] 보관함 검색\n[내용]\n보관함에서도 찾고 싶어요."); // 진단 정보 없음
    }); // 테스트 종료
}); // 묶음 종료

describe("멤버십 비교표와 토큰 기간", () => // 설정 묶음
{ // 묶음 시작
    it("프로필 관리에 멤버십 비교표를 보여 주고 지금 멤버십을 표시한다", () => // 비교표 검증
    { // 테스트 시작
        renderWithApp(<ProfileSettings />); // 프로필 렌더링
        const table = screen.getByRole("table", { name: "멤버십 비교" }); // 비교표
        expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["구분", "FREE이용 중", "PLUS", "CREATOR"]); // 열 머리와 이용 중 표시
        expect(within(table).getByRole("row", { name: /가격/ })).toHaveTextContent("가격무료정해지지 않음정해지지 않음"); // 가격 줄
        expect(screen.getByRole("button", { name: "멤버십 변경 준비 중" })).toBeDisabled(); // 결제 전이라 잠김
    }); // 테스트 종료

    it("이용 기록을 기간으로 좁히고 그 기간의 합계를 알려 준다", async () => // 기간 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state: AppState = { ...createInitialState(), tokenRecords: records }; // 기록이 있는 상태
        renderWithApp(<TokenSettings />, state); // 토큰 화면 렌더링
        const filter = screen.getByRole("group", { name: "기록 종류" }); // 종류 필터
        expect(within(filter).getByRole("button", { name: "전체 3" })).toBeInTheDocument(); // 전체 기간
        expect(screen.queryByRole("status", { name: "기간 합계" })).not.toBeInTheDocument(); // 전체 기간에는 합계 줄 없음
        await user.selectOptions(screen.getByRole("combobox", { name: "기간" }), "최근 7일"); // 7일
        expect(within(filter).getByRole("button", { name: "전체 2" })).toBeInTheDocument(); // 오늘 2건
        expect(screen.getByRole("status", { name: "기간 합계" })).toHaveTextContent("이 기간에 받음 +5 · 사용 −3 · 기록 2건"); // 합계
        expect(screen.queryByText("이미지 만들기", { selector: "strong" })).not.toBeInTheDocument(); // 열흘 전 기록 숨김
        await user.selectOptions(screen.getByRole("combobox", { name: "기간" }), "직접 고르기"); // 직접 고르기
        const oldDay = new Date(now - 240 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // 열흘 전 날짜(연-월-일)
        await user.type(screen.getByLabelText("시작 날짜"), oldDay); // 시작
        await user.type(screen.getByLabelText("끝 날짜"), oldDay); // 끝
        expect(within(filter).getByRole("button", { name: "전체 1" })).toBeInTheDocument(); // 그날 1건
        expect(screen.getByText("이미지 만들기", { selector: "strong" })).toBeInTheDocument(); // 그날 기록
        await user.click(within(filter).getByRole("button", { name: "받음 0" })); // 받음만
        expect(screen.getByText("이 기간에는 기록이 없어요. 기간을 넓히거나 종류를 바꿔 보세요.")).toBeInTheDocument(); // 빈 안내
    }); // 테스트 종료
}); // 묶음 종료

describe("19+ 보기 끄기와 탭 제목", () => // 틀 묶음
{ // 묶음 시작
    it("19+ 보기 끄기를 확인하면 19+ 보기를 끄고 안내를 보여 주며, 취소하면 그대로 둔다", async () => // 19+ 보기 끄기 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const initial = createInitialState(); // 초기 상태
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); // 확인 창(취소)
        renderWithApp(<AppShell><MatureProbe /></AppShell>, { ...initial, settings: { ...initial.settings, matureContentEnabled: true, rightPanelOpen: true } }); // 19+ 보기를 켠 화면
        await user.click(screen.getByRole("button", { name: "19+ 보기 끄기" })); // 끄기
        expect(confirm).toHaveBeenCalledWith("19+ 보기를 끌까요? 캐릭터와 대화, 토큰은 그대로 남아요."); // 무엇이 바뀌는지 안내
        expect(screen.getByLabelText("19+ 보기")).toHaveTextContent("true"); // 취소하면 그대로
        confirm.mockReturnValue(true); // 확인
        await user.click(screen.getByRole("button", { name: "19+ 보기 끄기" })); // 다시 끄기
        expect(screen.getByLabelText("19+ 보기")).toHaveTextContent("false"); // 19+ 보기 꺼짐
        expect(screen.getByText("19+ 보기를 껐습니다. 캐릭터와 대화는 이 브라우저에 그대로 남아 있어요.")).toBeInTheDocument(); // 안내
        expect(document.getElementById("user-panel")).toHaveAttribute("aria-hidden", "true"); // 패널 닫힘
        expect(screen.queryByRole("button", { name: "19+ 보기 끄기" })).toBeNull(); // 꺼진 뒤에는 버튼 없음
        await user.click(within(screen.getByText("19+ 보기를 껐습니다. 캐릭터와 대화는 이 브라우저에 그대로 남아 있어요.").closest("div") as HTMLElement).getByRole("button", { name: "닫기" })); // 안내 닫기
        expect(screen.queryByText(/19\+ 보기를 껐습니다/)).not.toBeInTheDocument(); // 안내 사라짐
    }); // 테스트 종료

    it("작품 화면은 탭 제목에 작품 이름을 넣고, 화면을 떠나면 원래 제목으로 돌린다", () => // 탭 제목 검증
    { // 테스트 시작
        document.title = "캐릭터 | Mate Verse"; // 서버가 보낸 제목
        const view = render(<PageTitle title="새벽 도서관의 리안" />); // 제목 요소
        expect(document.title).toBe("새벽 도서관의 리안 | Mate Verse"); // 작품 이름
        view.rerender(<PageTitle title="퇴근길 카페의 하린" />); // 다른 작품
        expect(document.title).toBe("퇴근길 카페의 하린 | Mate Verse"); // 바뀐 이름
        view.unmount(); // 화면 떠남
        expect(document.title).toBe("캐릭터 | Mate Verse"); // 원래 제목
    }); // 테스트 종료
}); // 묶음 종료
