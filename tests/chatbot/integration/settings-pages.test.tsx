import { render, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 오른쪽 사용자 패널
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { DisplaySettings } from "@chatbot/features/settings/DisplaySettings"; // 화면 레이아웃
import { NotificationSettings } from "@chatbot/features/settings/NotificationSettings"; // 알림과 선제 메시지
import { PrivacySettings } from "@chatbot/features/settings/PrivacySettings"; // 개인정보 및 보안
import { ProfileSettings } from "@chatbot/features/settings/ProfileSettings"; // 프로필 관리
import { settingsNavigation } from "@chatbot/features/settings/settings-navigation"; // 공통 메뉴 정의
import { SettingsShell } from "@chatbot/features/settings/SettingsShell"; // 설정 공통 틀
import { TokenSettings } from "@chatbot/features/settings/TokenSettings"; // 토큰 이용 내역
import { SupportScreen } from "@chatbot/features/support/SupportScreen"; // 고객 지원
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

const pathname = vi.hoisted(() => ({ value: "/settings/profile" })); // 현재 경로 대역

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => pathname.value, // 현재 경로 제공
})); // 대체 종료

function SettingsProbe() // 설정 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <span aria-label="설정 결과">{state.profile.nickname}:{state.settings.platformMode}</span>; // 상태 출력
} // 함수 종료

describe("설정 공통 메뉴", () => // 메뉴 묶음
{ // 묶음 시작
    it("오른쪽 패널과 같은 묶음·순서로 메뉴를 보여 주고 현재 페이지를 표시한다", () => // 메뉴 구성 검증
    { // 검증 시작
        pathname.value = "/settings/tokens"; // 토큰 페이지 경로
        renderWithApp(<SettingsShell><p>본문</p></SettingsShell>); // 공통 틀 렌더
        const navigation = screen.getByRole("navigation", { name: "설정 메뉴" }); // 설정 메뉴 조회
        expect(within(navigation).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["계정", "설정", "지원"]); // 묶음 순서 확인
        const links = within(navigation).getAllByRole("link"); // 메뉴 링크
        expect(links.map((link) => link.getAttribute("href"))).toEqual(settingsNavigation.flatMap((group) => group.items.map((item) => item.href))); // 링크 순서 확인
        expect(within(navigation).getByRole("link", { name: /토큰 이용 내역/ })).toHaveAttribute("aria-current", "page"); // 현재 페이지 확인
        expect(within(navigation).getByRole("link", { name: /프로필 관리/ })).not.toHaveAttribute("aria-current"); // 다른 페이지 확인
    }); // 검증 종료

    it("오른쪽 사용자 패널의 메뉴가 각 설정 페이지로 이동한다", () => // 패널 연결 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        render(<UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} open onNavigate={() => undefined} />); // 패널 렌더
        const menu = screen.getByRole("navigation", { name: "사용자 메뉴" }); // 사용자 메뉴 조회
        expect(within(menu).getByRole("link", { name: /프로필 관리/ })).toHaveAttribute("href", "/settings/profile"); // 프로필 경로
        expect(within(menu).getByRole("link", { name: /내 캐릭터와 작품/ })).toHaveAttribute("href", "/library"); // 작품 경로
        expect(within(menu).getByRole("link", { name: /토큰 이용 내역/ })).toHaveAttribute("href", "/settings/tokens"); // 토큰 경로
        expect(within(menu).getByRole("link", { name: /화면 레이아웃/ })).toHaveAttribute("href", "/settings/display"); // 화면 경로
        expect(within(menu).getByRole("link", { name: /알림과 선제 메시지/ })).toHaveAttribute("href", "/settings/notifications"); // 알림 경로
        expect(within(menu).getByRole("link", { name: /개인정보 및 보안/ })).toHaveAttribute("href", "/settings/privacy"); // 보안 경로
        expect(within(menu).getByRole("link", { name: /고객 지원/ })).toHaveAttribute("href", "/support"); // 지원 경로
    }); // 검증 종료
}); // 묶음 종료

describe("설정 페이지", () => // 페이지 묶음
{ // 묶음 시작
    it("프로필을 미리보기와 함께 저장한다", async () => // 프로필 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<><ProfileSettings /><SettingsProbe /></>); // 프로필 화면 렌더링
        const nickname = screen.getByLabelText("닉네임"); // 닉네임 입력 조회
        await user.clear(nickname); // 기존 이름 제거
        await user.type(nickname, "새 사용자"); // 새 이름 입력
        expect(within(screen.getByRole("region", { name: "프로필 미리보기" })).getByRole("heading", { name: "새 사용자" })).toBeInTheDocument(); // 미리보기 확인
        await user.click(screen.getByRole("button", { name: "프로필 저장" })); // 프로필 저장
        expect(screen.getByRole("status")).toHaveTextContent("저장했습니다."); // 성공 안내 확인
        expect(screen.getByLabelText("설정 결과")).toHaveTextContent("새 사용자:auto"); // 상태 반영 확인
    }); // 테스트 종료

    it("화면 설정을 바꾸면 바로 저장한다", async () => // 화면 설정 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<><DisplaySettings /><SettingsProbe /></>); // 화면 설정 렌더링
        await user.selectOptions(screen.getByLabelText("플랫폼 모드"), "tablet"); // 플랫폼 변경
        expect(screen.getByRole("status")).toHaveTextContent("저장했습니다."); // 성공 안내 확인
        expect(screen.getByLabelText("설정 결과")).toHaveTextContent(":tablet"); // 상태 반영 확인
    }); // 테스트 종료

    it("잘못된 알림 시간은 저장하지 않는다", async () => // 알림 오류 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<NotificationSettings />); // 알림 화면 렌더링
        await user.clear(screen.getByLabelText("시작 시각")); // 시작 시각 제거
        await user.type(screen.getByLabelText("시작 시각"), "22:00"); // 늦은 시작 입력
        await user.clear(screen.getByLabelText("종료 시각")); // 종료 시각 제거
        await user.type(screen.getByLabelText("종료 시각"), "09:00"); // 이른 종료 입력
        await user.click(screen.getByRole("button", { name: "알림 저장" })); // 알림 저장
        expect(screen.getByText("종료 시각은 시작 시각보다 늦어야 합니다.")).toBeInTheDocument(); // 오류 안내 확인
    }); // 테스트 종료

    it("토큰 잔액·비용표와 준비 중인 충전을 보여 준다", () => // 토큰 화면 검증
    { // 테스트 시작
        renderWithApp(<TokenSettings />); // 토큰 화면 렌더링
        expect(within(screen.getByRole("region", { name: "토큰 요약" })).getByText("1,240")).toBeInTheDocument(); // 잔액 확인
        const table = screen.getByRole("table"); // 비용 표 조회
        expect(within(table).getAllByRole("row")).toHaveLength(6); // 머리와 비용 다섯 줄 확인
        expect(within(table).getByText("1 토큰")).toBeInTheDocument(); // 일반 대화 비용 확인
        expect(screen.getByRole("button", { name: "충전 준비 중" })).toBeDisabled(); // 충전 비활성 확인
    }); // 테스트 종료

    it("개인정보 화면에서 저장 위치와 데이터 관리를 함께 보여 준다", () => // 개인정보 화면 검증
    { // 테스트 시작
        renderWithApp(<PrivacySettings />); // 개인정보 화면 렌더링
        expect(screen.getByText("이 브라우저의 로컬 저장공간(localStorage)")).toBeInTheDocument(); // 저장 위치 확인
        expect(screen.getByRole("heading", { name: "데이터 관리" })).toBeInTheDocument(); // 데이터 관리 확인
        expect(screen.getByRole("button", { name: "JSON 내보내기" })).toBeInTheDocument(); // 내보내기 확인
    }); // 테스트 종료

    it("고객 지원 화면에서 질문과 앱 정보를 보여 준다", () => // 고객 지원 검증
    { // 테스트 시작
        renderWithApp(<SupportScreen />); // 고객 지원 렌더링
        expect(screen.getAllByRole("group").length).toBeGreaterThanOrEqual(6); // 질문 개수 확인
        expect(screen.getByText("데이터 버전").nextElementSibling).toHaveTextContent("9"); // 데이터 버전 확인
    }); // 테스트 종료
}); // 묶음 종료
