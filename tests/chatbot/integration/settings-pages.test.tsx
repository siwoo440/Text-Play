import { render, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 오른쪽 사용자 패널
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, CharacterMemory } from "@chatbot/features/core/types"; // 상태 타입
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

function StateProbe() // 배치·팔로우·메모리·신고 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="상태 요약">{JSON.stringify({ layout: state.settings.layoutId, follows: state.followedCreatorIds, memories: state.memories.map((memory) => memory.id), reports: state.localReports.map((report) => report.id) })}</output>; // 상태 출력
} // 함수 종료

const probe = () => JSON.parse(screen.getByLabelText("상태 요약").textContent ?? "{}") as { layout: string | null; follows: string[]; memories: string[]; reports: string[] }; // 상태 요약 읽기
const memory = (id: string, conversationId: string, content: string, updatedAt: string, category: CharacterMemory["category"] = "long"): CharacterMemory => ({ id, characterId: "rian", conversationId, category, content, sourceMessageIds: [], editedByUser: false, createdAt: updatedAt, updatedAt }); // 메모리 만들기

function resize(width: number, height: number): void // 화면 크기 바꾸기
{ // 함수 시작
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width }); // 너비
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height }); // 높이
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
    afterEach(() => // 테스트 정리
    { // 정리 시작
        resize(1024, 768); // 기본 화면 크기로
        vi.unstubAllGlobals(); // 전역 대역 해제
    }); // 정리 종료

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

    it("채팅 화면 배치를 자동과 세 가지 가운데 고르면 바로 저장하고, 지금 화면에 맞는 것을 추천한다", async () => // 배치 선택 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        resize(1440, 900); // 일반 모니터
        renderWithApp(<><DisplaySettings /><StateProbe /></>); // 화면 설정 렌더링
        const group = screen.getByRole("group", { name: "채팅방 설정 위치" }); // 배치 선택
        expect(within(group).getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual(["auto", "drawer", "narrow", "wide"]); // 자동과 세 가지
        expect(within(group).getByRole("radio", { name: /^자동/ })).toBeChecked(); // 처음에는 자동
        expect(within(group).getByRole("radio", { name: /옆 열 좁게 지금 화면에 추천/ })).not.toBeChecked(); // 일반 모니터 추천
        expect(within(group).getAllByText("지금 화면에 추천")).toHaveLength(1); // 추천은 하나
        expect(screen.getByText(/^지금 적용:/)).toHaveTextContent("지금 적용: 옆 열 좁게 (자동)"); // 자동으로 적용되는 배치
        expect(screen.queryByLabelText("해상도 모드")).toBeNull(); // 쓰이지 않던 선택은 없앰
        await user.click(within(group).getByRole("radio", { name: /옆 열 넓게/ })); // 넓게 고르기
        expect(probe().layout).toBe("D2"); // 대표 레이아웃 저장
        expect(screen.getByText("저장했습니다.")).toBeInTheDocument(); // 저장 안내
        expect(screen.getByText(/^지금 적용:/)).toHaveTextContent("지금 적용: 옆 열 넓게"); // 고른 배치
        await user.click(within(group).getByRole("radio", { name: /서랍형/ })); // 서랍형
        expect(probe().layout).toBe("M1"); // 서랍형 저장
        await user.click(within(group).getByRole("radio", { name: /^자동/ })); // 다시 자동
        expect(probe().layout).toBeNull(); // 자동 저장
    }); // 테스트 종료

    it("예전에 고른 레이아웃은 세 가지 가운데 속한 배치로 보여 주고, 좁은 화면에는 서랍형을 추천한다", () => // 예전 값과 추천 검증
    { // 테스트 시작
        resize(390, 844); // 휴대폰
        const state = createInitialState(); // 초기 상태
        state.settings.layoutId = "T1"; // 예전 태블릿 가로(280px 열)
        renderWithApp(<DisplaySettings />, state); // 화면 설정 렌더링
        const group = screen.getByRole("group", { name: "채팅방 설정 위치" }); // 배치 선택
        expect(within(group).getByRole("radio", { name: /옆 열 넓게/ })).toBeChecked(); // 넓게로 표시
        expect(within(group).getByRole("radio", { name: /서랍형 지금 화면에 추천/ })).toBeInTheDocument(); // 휴대폰 추천
    }); // 테스트 종료

    it("프로필에서 내 활동 수를 보고 팔로우한 제작자를 해제한다", async () => // 활동·팔로우 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const base = createInitialState(); // 초기 상태
        const state: AppState = { ...base, characters: base.characters.map((character, index) => index === 0 ? { ...character, creatorId: base.profile.id } : character), likedCharacterIds: ["sera", "noah"], bookmarkedCharacterIds: ["sera"], followedCreatorIds: ["creator-evening", "creator-rain"] }; // 활동이 있는 상태
        renderWithApp(<><ProfileSettings /><StateProbe /></>, state); // 프로필 화면 렌더링
        expect(within(screen.getByRole("list", { name: "활동 요약" })).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["만든 캐릭터1", "만든 스토리0", "대화방3", "좋아요2", "보관1", "팔로우2", "오늘 이용 시간0분이 브라우저의 모든 탭 합계 · 자정에 다시 셈"]); // 활동 수와 오늘 이용 시간
        const list = screen.getByRole("list", { name: "팔로우한 제작자 목록" }); // 제작자 목록
        expect(within(list).getAllByRole("listitem").map((item) => item.querySelector("strong")?.textContent)).toEqual(["푸른우산", "저녁다섯시"]); // 최근 팔로우가 앞
        expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("작품 1개"); // 작품 수
        await user.click(within(list).getByRole("button", { name: "푸른우산 팔로우 해제" })); // 해제
        expect(probe().follows).toEqual(["creator-evening"]); // 한 명 남음
        expect(screen.getByRole("status", { name: "팔로우 안내" })).toHaveTextContent("푸른우산 팔로우를 해제했습니다."); // 안내
        await user.click(screen.getByRole("button", { name: "저녁다섯시 팔로우 해제" })); // 마지막 해제
        expect(screen.getByText(/아직 팔로우한 제작자가 없어요/)).toBeInTheDocument(); // 빈 안내
    }); // 테스트 종료

    it("허용 시간을 하루 막대로 보여 주고 잘못된 범위에서는 그리지 않는다", async () => // 하루 막대 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<NotificationSettings />); // 알림 화면 렌더링
        const start = (screen.getByLabelText("시작 시각") as HTMLInputElement).value; // 저장된 시작 시각
        const end = (screen.getByLabelText("종료 시각") as HTMLInputElement).value; // 저장된 종료 시각
        expect(screen.getByRole("img", { name: new RegExp(`^하루 중 허용 시간 ${start}부터 ${end}까지, `) })).toBeInTheDocument(); // 막대 이름
        await user.clear(screen.getByLabelText("종료 시각")); // 종료 시각 제거
        expect(screen.getByRole("img", { name: /허용 시간을 그릴 수 없습니다/ })).toBeInTheDocument(); // 그릴 수 없음
        await user.type(screen.getByLabelText("종료 시각"), "23:30"); // 새 종료 시각
        expect(screen.getByRole("img", { name: new RegExp(`^하루 중 허용 시간 ${start}부터 23:30까지, `) })).toBeInTheDocument(); // 바뀐 막대
        expect(screen.getByText(new RegExp(`^하루 중 ${start}부터 23:30까지 .* 동안 받을 수 있어요\\.$`))).toBeInTheDocument(); // 문구
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
        const table = screen.getByRole("table", { name: "항목별 비용" }); // 비용 표 조회
        expect(within(table).getAllByRole("row")).toHaveLength(10); // 머리 + 채팅 등급 일곱 줄 + 이미지 두 줄(실제로 차감되는 값만)
        expect(within(within(table).getByRole("row", { name: /마스터챗/ })).getByText("12 토큰")).toBeInTheDocument(); // 등급별 기본 비용(실제 차감과 같은 값)
        expect(within(within(table).getByRole("row", { name: /베이직챗/ })).getByText("1 토큰")).toBeInTheDocument(); // 가장 싼 등급
        expect(within(within(table).getByRole("row", { name: /이미지 스튜디오/ })).getByText("20 토큰")).toBeInTheDocument(); // 이미지 비용
        expect(within(table).queryByText("고급 대화")).toBeNull(); // 쓰이지 않는 항목은 없음
        expect(within(table).queryByText(/준비 중/)).toBeNull(); // 준비 중인 항목은 표에 없음
        expect(screen.getByText("답변 길이를 늘리면 등급마다 정해진 만큼 더 들고, 유저 노트를 500자 넘게 적으면 메시지당 1토큰이 더 들어요. 지금 대화의 비용은 입력창 옆 등급 버튼에서 볼 수 있어요.")).toBeInTheDocument(); // 추가 비용 안내
        expect(screen.getByRole("button", { name: "충전 준비 중" })).toBeDisabled(); // 충전 비활성 확인
    }); // 테스트 종료

    it("개인정보 화면에서 저장 위치와 데이터 관리를 함께 보여 준다", () => // 개인정보 화면 검증
    { // 테스트 시작
        renderWithApp(<PrivacySettings />); // 개인정보 화면 렌더링
        expect(screen.getByText("이 브라우저의 로컬 저장공간(localStorage)")).toBeInTheDocument(); // 저장 위치 확인
        expect(screen.getByRole("heading", { name: "데이터 관리" })).toBeInTheDocument(); // 데이터 관리 확인
        expect(screen.getByRole("button", { name: "JSON 내보내기" })).toBeInTheDocument(); // 내보내기 확인
    }); // 테스트 종료

    it("개인정보 화면에서 요약 메모리를 대화방별로 보고 지우며, 내가 한 신고를 취소한다", async () => // 메모리·신고 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const base = createInitialState(); // 초기 상태
        const state: AppState = { ...base, memories: [memory("m1", "conversation-rian", "커피를 싫어한다", "2026-10-01T09:00:00.000Z"), memory("m2", "conversation-sera", "비 오는 날을 좋아한다", "2026-10-02T09:00:00.000Z", "relation")], localReports: [{ id: "report-1", characterId: "rian", reason: "spam", createdAt: "2026-10-01T10:00:00.000Z" }] }; // 메모리와 신고가 있는 상태
        renderWithApp(<><PrivacySettings /><StateProbe /></>, state); // 개인정보 화면 렌더링
        expect(screen.getByText(/모두 2개가 있어요/)).toBeInTheDocument(); // 전체 개수
        expect(screen.getByText("비 오는 교실, 세라 · 1개")).toBeInTheDocument(); // 대화방 묶음
        const rian = screen.getByRole("list", { name: "새벽 도서관의 리안 메모리" }); // 리안 대화 메모리
        expect(within(rian).getByRole("listitem")).toHaveTextContent("장기 기억커피를 싫어한다"); // 분류와 내용
        expect(screen.getAllByRole("link", { name: "이 대화 열기" })[1]).toHaveAttribute("href", "/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1"); // 대화 주소
        await user.click(within(rian).getByRole("button", { name: "장기 기억 삭제: 커피를 싫어한다" })); // 삭제
        expect(probe().memories).toEqual(["m2"]); // 하나 남음
        expect(screen.queryByRole("list", { name: "새벽 도서관의 리안 메모리" })).toBeNull(); // 빈 묶음은 사라짐
        const reports = screen.getByRole("list", { name: "신고 기록" }); // 신고 기록
        expect(within(reports).getByRole("listitem")).toHaveTextContent("새벽 도서관의 리안스팸 또는 반복 콘텐츠 · 2026. 10. 1."); // 캐릭터·사유·날짜
        await user.click(within(reports).getByRole("button", { name: "새벽 도서관의 리안 신고 취소" })); // 취소
        expect(probe().reports).toEqual([]); // 신고 없음
        expect(screen.getByText("신고한 캐릭터가 없어요.")).toBeInTheDocument(); // 빈 안내
    }); // 테스트 종료

    it("메모리와 신고가 없으면 빈 안내를 보여 준다", () => // 빈 상태 검증
    { // 테스트 시작
        renderWithApp(<PrivacySettings />); // 개인정보 화면 렌더링
        expect(screen.getByText(/아직 기억해 둔 내용이 없어요/)).toBeInTheDocument(); // 메모리 없음
        expect(screen.getByText("신고한 캐릭터가 없어요.")).toBeInTheDocument(); // 신고 없음
    }); // 테스트 종료

    it("고객 지원 화면에서 질문을 주제와 검색어로 찾고 앱 정보를 보여 준다", async () => // 고객 지원 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<SupportScreen />); // 고객 지원 렌더링
        const count = screen.getByRole("status", { name: "찾은 질문" }); // 찾은 질문 수
        expect(count).toHaveTextContent("질문 11개"); // 전체
        expect(screen.getByText("데이터 버전").nextElementSibling).toHaveTextContent("18"); // 데이터 버전 확인
        const topics = screen.getByRole("group", { name: "질문 주제" }); // 주제
        expect(within(topics).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true"); // 처음에는 전체
        await user.click(within(topics).getByRole("button", { name: "토큰" })); // 토큰 주제
        expect(count).toHaveTextContent("질문 2개"); // 토큰 질문
        expect(screen.getByText("토큰은 어떻게 받나요?")).toBeInTheDocument(); // 토큰 질문 보임
        expect(screen.queryByText("Text-Play는 무엇인가요?")).toBeNull(); // 다른 주제 숨김
        await user.type(screen.getByRole("searchbox", { name: "질문 검색" }), "시험 대화"); // 다른 주제의 낱말
        expect(count).toHaveTextContent("질문 0개"); // 주제 안에는 없음
        expect(screen.getByText(/찾는 질문이 없어요/)).toBeInTheDocument(); // 빈 안내
        await user.click(within(topics).getByRole("button", { name: "전체" })); // 전체로
        expect(count).toHaveTextContent("질문 1개"); // 한 개
        expect(screen.getByText("만들던 작품을 저장하기 전에 시험해 볼 수 있나요?")).toBeInTheDocument(); // 찾은 질문
    }); // 테스트 종료

    it("진단 정보를 복사하고, 복사할 수 없으면 직접 복사하라고 알려 준다", async () => // 진단 정보 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const writeText = vi.fn().mockResolvedValue(undefined); // 클립보드 대역
        vi.stubGlobal("navigator", { ...navigator, userAgent: "TestBrowser/1.0", clipboard: { writeText } }); // 클립보드 주입
        const view = renderWithApp(<SupportScreen />); // 고객 지원 렌더링
        const text = (screen.getByRole("textbox", { name: "진단 정보" }) as HTMLTextAreaElement).value; // 진단 정보 글
        expect(text).toContain("데이터 버전: 18"); // 데이터 버전
        expect(text).toContain("브라우저: TestBrowser/1.0"); // 브라우저
        expect(text).not.toContain(createInitialState().profile.nickname); // 이름 없음
        await user.click(screen.getByRole("button", { name: "진단 정보 복사" })); // 복사
        expect(writeText).toHaveBeenCalledWith(text); // 같은 글 복사
        expect(await screen.findByRole("status", { name: "복사 안내" })).toHaveTextContent("진단 정보를 복사했습니다."); // 성공 안내
        view.unmount(); // 화면 닫기
        vi.stubGlobal("navigator", { ...navigator, userAgent: "TestBrowser/1.0", clipboard: undefined }); // 클립보드 없음
        renderWithApp(<SupportScreen />); // 다시 렌더링
        await user.click(screen.getByRole("button", { name: "진단 정보 복사" })); // 복사 시도
        expect(await screen.findByRole("status", { name: "복사 안내" })).toHaveTextContent("복사하지 못했습니다. 아래 글을 직접 선택해 복사해 주세요."); // 실패 안내
    }); // 테스트 종료
}); // 묶음 종료
