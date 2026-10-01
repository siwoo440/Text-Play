import { fireEvent, screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

describe("앱 셸 패널", () => // 패널 묶음
{ // 묶음 시작
    it("승인된 Mate Verse 이미지 로고를 표시한다", () => // 로고 검증
    { // 검증 시작
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const logo = screen.getByRole("img", { name: "Mate Verse" }); // 로고 조회
        expect(logo).toHaveAttribute("src", expect.stringContaining("mate-verse-logo-v3.png")); // 이미지 경로 확인
    }); // 검증 종료

    it("왼쪽 책 아이콘과 오른쪽 메뉴 아이콘을 표시한다", () => // 아이콘 검증
    { // 검증 시작
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const leftButton = screen.getByRole("button", { name: "대화방 패널 열기와 닫기" }); // 왼쪽 버튼
        const rightButton = screen.getByRole("button", { name: "사용자 패널 열기와 닫기" }); // 오른쪽 버튼
        expect(leftButton.querySelector('svg[data-icon="book"]')).toBeInTheDocument(); // 책 아이콘 확인
        expect(rightButton.querySelector('svg[data-icon="menu"]')).toBeInTheDocument(); // 메뉴 아이콘 확인
    }); // 검증 종료

    it("데스크톱 패널 바깥 배경을 선택하면 열린 패널을 닫는다", async () => // 배경 닫기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 }); // 데스크톱 너비
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        fireEvent(window, new Event("resize")); // 크기 변경
        const leftButton = screen.getByRole("button", { name: "대화방 패널 열기와 닫기" }); // 왼쪽 버튼
        const backdrop = screen.getByRole("button", { name: "열린 패널 닫기" }); // 패널 배경
        expect(leftButton).toHaveAttribute("aria-expanded", "true"); // 패널 열림 확인
        await user.click(backdrop); // 배경 선택
        expect(leftButton).toHaveAttribute("aria-expanded", "false"); // 패널 닫힘 확인
        expect(screen.queryByRole("button", { name: "열린 패널 닫기" })).not.toBeInTheDocument(); // 배경 제거 확인
    }); // 검증 종료

    it("헤더 메뉴와 탐색 링크를 버튼형 항목으로 순서대로 표시한다", () => // 메뉴 디자인 검증
    { // 검증 시작
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const navigation = screen.getByRole("navigation", { name: "주요 메뉴" }); // 주요 메뉴 조회
        const links = within(navigation).getAllByRole("link"); // 헤더 링크 목록
        expect(links.map((link) => link.textContent)).toEqual(["메뉴", "탐색", "내 작품", "Text-Play 다운로드"]); // 메뉴 순서 확인
        expect(within(navigation).getByRole("link", { name: "메뉴" })).toHaveAttribute("href", "/"); // 메인 경로 확인
        expect(within(navigation).getByRole("link", { name: "탐색" })).toHaveAttribute("href", "/explore"); // 탐색 경로 확인
        for (const link of links) // 링크 순회
        { // 순회 시작
            expect(link).toHaveClass("app-navigation-link"); // 버튼형 확인
        } // 순회 종료
    }); // 검증 종료

    it("내부 화면 이동을 선택하면 열린 양쪽 패널을 즉시 닫는다", async () => // 이동 닫기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const leftButton = screen.getByRole("button", { name: "대화방 패널 열기와 닫기" }); // 왼쪽 버튼
        const rightButton = screen.getByRole("button", { name: "사용자 패널 열기와 닫기" }); // 오른쪽 버튼
        await user.click(rightButton); // 오른쪽 패널 열기
        expect(leftButton).toHaveAttribute("aria-expanded", "true"); // 왼쪽 열림 확인
        expect(rightButton).toHaveAttribute("aria-expanded", "true"); // 오른쪽 열림 확인
        const libraryLink = screen.getByRole("link", { name: "내 작품" }); // 작품 링크 조회
        libraryLink.addEventListener("click", (event) => event.preventDefault(), { once: true }); // 문서 이동 차단
        await user.click(libraryLink); // 내부 이동 선택
        expect(leftButton).toHaveAttribute("aria-expanded", "false"); // 왼쪽 닫힘 확인
        expect(rightButton).toHaveAttribute("aria-expanded", "false"); // 오른쪽 닫힘 확인
    }); // 검증 종료

    it("공통 메뉴에서 Text-Play 다운로드 화면으로 이동한다", () => // 다운로드 이동 검증
    { // 검증 시작
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const navigation = screen.getByRole("navigation", { name: "주요 메뉴" }); // 주요 메뉴 조회
        const textPlayLinks = within(navigation).getAllByRole("link", { name: /Text-Play|Windows/ }); // Text-Play 관련 링크
        expect(textPlayLinks).toHaveLength(1); // 단일 메뉴 확인
        expect(textPlayLinks[0]).toHaveAccessibleName("Text-Play 다운로드"); // 메뉴 이름 확인
        expect(textPlayLinks[0]).toHaveAttribute("href", "/text-play"); // 통합 경로 확인
        const mobileNavigation = screen.getByRole("navigation", { name: "모바일 메뉴" }); // 모바일 메뉴 조회
        expect(within(mobileNavigation).getByRole("link", { name: "Text-Play" })).toHaveAttribute("href", "/text-play"); // 모바일 경로 확인
    }); // 검증 종료

    it("좌측 대화 목록을 대비가 있는 개별 카드로 표시한다", () => // 대화 카드 검증
    { // 검증 시작
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const panel = screen.getByRole("complementary", { name: "진행 중인 대화방" }); // 대화 패널
        const list = panel.querySelector(".conversation-list"); // 대화 목록
        const cards = panel.querySelectorAll(".conversation-card"); // 대화 카드
        expect(list).toBeInTheDocument(); // 목록 디자인 확인
        expect(cards.length).toBeGreaterThan(1); // 카드 수 확인
        expect(cards[0]).toHaveAttribute("data-tone", "primary"); // 첫 카드 대비 확인
        expect(cards[1]).toHaveAttribute("data-tone", "secondary"); // 둘째 카드 대비 확인
        expect(cards[0]?.querySelector("a")).toHaveClass("conversation-card-link"); // 카드 링크 확인
        expect(cards[0]?.querySelector("a")).toHaveAttribute("href", "/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1"); // 버전 주소 확인
    }); // 검증 종료

    it("우측 패널 정보를 프로필 토큰 계정 설정 지원 영역으로 구분한다", async () => // 패널 구조 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "사용자 패널 열기와 닫기" })); // 사용자 패널 열기
        const panel = screen.getByRole("complementary", { name: "사용자 정보와 설정" }); // 사용자 패널
        expect(within(panel).getByRole("region", { name: "프로필 요약" })).toBeInTheDocument(); // 프로필 영역 확인
        expect(within(panel).getByRole("region", { name: "토큰 정보" })).toBeInTheDocument(); // 토큰 영역 확인
        expect(within(panel).getByRole("heading", { name: "계정" })).toBeInTheDocument(); // 계정 영역 확인
        expect(within(panel).getByRole("heading", { name: "설정" })).toBeInTheDocument(); // 설정 영역 확인
        expect(within(panel).getByRole("heading", { name: "지원" })).toBeInTheDocument(); // 지원 영역 확인
    }); // 검증 종료

    it("우측 패널 로그아웃을 위험 동작 버튼으로 표시한다", async () => // 로그아웃 디자인 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "사용자 패널 열기와 닫기" })); // 사용자 패널 열기
        const logoutButton = screen.getByRole("button", { name: "로그아웃" }); // 로그아웃 버튼
        expect(logoutButton).toHaveClass("user-panel-logout"); // 위험 버튼 확인
    }); // 검증 종료

    it("우측 패널 표제와 빈 초상화를 강조한다", async () => // 패널 강조 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "사용자 패널 열기와 닫기" })); // 사용자 패널 열기
        const panel = screen.getByRole("complementary", { name: "사용자 정보와 설정" }); // 사용자 패널
        const avatar = panel.querySelector(".profile-avatar"); // 초상화 조회
        expect(avatar).toBeInTheDocument(); // 초상화 확인
        expect(avatar).toBeEmptyDOMElement(); // 문자 제거 확인
        expect(within(panel).getByRole("heading", { name: "계정" })).toHaveClass("user-panel-group-title"); // 계정 강조 확인
        expect(within(panel).getByRole("heading", { name: "설정" })).toHaveClass("user-panel-group-title"); // 설정 강조 확인
        expect(within(panel).getByRole("heading", { name: "지원" })).toHaveClass("user-panel-group-title"); // 지원 강조 확인
        expect(within(panel).getByText("보유 토큰")).toHaveClass("user-panel-wallet-label"); // 토큰 표제 확인
        expect(within(panel).getByText("오늘 이미지")).toHaveClass("user-panel-wallet-label"); // 이미지 표제 확인
    }); // 검증 종료

    it("데스크톱에서 양쪽 패널을 독립적으로 전환한다", async () => // 독립 전환 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const leftButton = screen.getByRole("button", { name: "대화방 패널 열기와 닫기" }); // 왼쪽 버튼
        const rightButton = screen.getByRole("button", { name: "사용자 패널 열기와 닫기" }); // 오른쪽 버튼
        expect(leftButton).toHaveAttribute("aria-expanded", "true"); // 왼쪽 기본값
        expect(rightButton).toHaveAttribute("aria-expanded", "false"); // 오른쪽 기본값
        await user.click(rightButton); // 오른쪽 열기
        expect(rightButton).toHaveAttribute("aria-expanded", "true"); // 오른쪽 상태
        expect(leftButton).toHaveAttribute("aria-expanded", "true"); // 왼쪽 유지
    }); // 검증 종료

    it("모바일에서 서랍을 상호 배타적으로 열고 Escape로 닫는다", async () => // 모바일 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 }); // 모바일 너비
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        fireEvent(window, new Event("resize")); // 크기 변경
        const leftButton = screen.getByRole("button", { name: "대화방 패널 열기와 닫기" }); // 왼쪽 버튼
        const rightButton = screen.getByRole("button", { name: "사용자 패널 열기와 닫기" }); // 오른쪽 버튼
        await user.click(rightButton); // 오른쪽 열기
        expect(rightButton).toHaveAttribute("aria-expanded", "true"); // 오른쪽 상태
        expect(leftButton).toHaveAttribute("aria-expanded", "false"); // 왼쪽 닫힘
        await user.keyboard("{Escape}"); // 탈출 입력
        expect(rightButton).toHaveAttribute("aria-expanded", "false"); // 오른쪽 닫힘
        expect(rightButton).toHaveFocus(); // 포커스 복귀
    }); // 검증 종료

    it("모바일 메뉴에서 현재 화면과 랭킹 앵커를 구분한다", () => // 모바일 메뉴 검증
    { // 검증 시작
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 화면 렌더
        const homeLink = screen.getByRole("link", { name: "홈" }); // 홈 링크 조회
        const rankingLink = screen.getByRole("link", { name: "랭킹" }); // 랭킹 링크 조회
        expect(homeLink).toHaveAttribute("aria-current", "page"); // 홈 현재 화면 확인
        expect(rankingLink).toHaveAttribute("href", "/#ranking"); // 랭킹 앵커 확인
        fireEvent.click(rankingLink); // 랭킹 링크 선택
        expect(homeLink).not.toHaveAttribute("aria-current"); // 홈 선택 해제 확인
        expect(rankingLink).toHaveAttribute("aria-current", "page"); // 랭킹 선택 확인
    }); // 검증 종료
}); // 묶음 종료
