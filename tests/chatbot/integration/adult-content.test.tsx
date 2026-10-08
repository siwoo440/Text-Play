import { fireEvent, render, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { UserPanel } from "@chatbot/components/app-shell/UserPanel"; // 오른쪽 사용자 패널
import { createMockAdultVerification } from "@chatbot/features/adult/adult-access"; // 모의 인증 생성
import { AdultContentSwitch } from "@chatbot/features/adult/AdultContentSwitch"; // 19+ 스위치
import { CharacterDetail } from "@chatbot/features/character/CharacterDetail"; // 캐릭터 상세
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // 캐릭터 편집기
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { DiscoveryHome } from "@chatbot/features/discovery/DiscoveryHome"; // 메인 화면
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함
import { ProfileSettings } from "@chatbot/features/settings/ProfileSettings"; // 프로필 관리
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), // 이동 함수 제공
    usePathname: () => "/", // 현재 경로 제공
})); // 대체 종료

function verifiedState(enabled: boolean): AppState // 인증 상태 생성
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    return { ...state, profile: { ...state.profile, adultVerification: createMockAdultVerification(new Date()) }, settings: { ...state.settings, matureContentEnabled: enabled } }; // 인증 상태 반환
} // 함수 종료

function AdultProbe() // 인증 상태 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="19+ 상태">{state.profile.adultVerification === null ? "인증 전" : "인증"}:{state.settings.matureContentEnabled ? "켜짐" : "꺼짐"}</output>; // 상태 출력
} // 함수 종료

async function verifyInDialog(user: ReturnType<typeof userEvent.setup>, birthDate: string) // 인증 창 입력
{ // 함수 시작
    const dialog = screen.getByRole("dialog", { name: "성인 인증" }); // 인증 창 조회
    fireEvent.change(within(dialog).getByLabelText("생년월일"), { target: { value: birthDate } }); // 생년월일 입력
    const consent = within(dialog).getByRole("checkbox", { name: /19세 이상이며/ }); // 동의 체크 조회
    if (!(consent as HTMLInputElement).checked) // 미동의 판정
    { // 조건 시작
        await user.click(consent); // 동의 체크
    } // 조건 종료
    await user.click(within(dialog).getByRole("button", { name: "인증하기" })); // 인증 제출
} // 함수 종료

describe("헤더 19+ 스위치", () => // 스위치 묶음
{ // 묶음 시작
    it("인증 전에는 인증 창을 열고 미성년을 거절하며 성인 인증 뒤 19세 캐릭터를 보여 준다", async () => // 전체 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        renderWithApp(<><AdultContentSwitch /><AdultProbe /><DiscoveryHome /></>); // 스위치와 메인 렌더
        expect(screen.getByText(/94명의 메이트/)).toBeInTheDocument(); // 숨김 상태 수 확인
        await user.type(screen.getByRole("searchbox", { name: "제목과 작가 검색" }), "태오"); // 19세 캐릭터를 제목으로 검색
        expect(screen.getByText("조건에 맞는 캐릭터가 없습니다.")).toBeInTheDocument(); // 검색 숨김 확인
        const toggle = screen.getByRole("switch", { name: "19+ 콘텐츠 보기" }); // 스위치 조회
        expect(toggle).toHaveAttribute("aria-checked", "false"); // 꺼짐 확인
        await user.click(toggle); // 스위치 켜기 요청
        await verifyInDialog(user, "2010-05-05"); // 미성년 생년월일 입력
        expect(screen.getByRole("alert")).toHaveTextContent("19세 미만은 성인 인증을 받을 수 없습니다."); // 거절 확인
        expect(screen.getByLabelText("19+ 상태")).toHaveTextContent("인증 전:꺼짐"); // 상태 유지 확인
        await verifyInDialog(user, "1995-03-10"); // 성인 생년월일 입력
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // 창 닫힘 확인
        expect(toggle).toHaveAttribute("aria-checked", "true"); // 켜짐 확인
        expect(screen.getByLabelText("19+ 상태")).toHaveTextContent("인증:켜짐"); // 저장 상태 확인
        const card = screen.getByRole("link", { name: /비 내리는 미래 도시의 태오/ }); // 19세 캐릭터 카드
        expect(within(card).getByText("19+")).toBeInTheDocument(); // 19세 표시 확인
        await user.click(toggle); // 스위치 끄기
        expect(toggle).toHaveAttribute("aria-checked", "false"); // 꺼짐 확인
        expect(screen.queryByRole("link", { name: /비 내리는 미래 도시의 태오/ })).not.toBeInTheDocument(); // 다시 숨김 확인
    }); // 검증 종료
}); // 묶음 종료

describe("19세 잠금 화면", () => // 잠금 묶음
{ // 묶음 시작
    it("주소로 들어온 19세 캐릭터 상세를 잠그고 인증된 사용자는 19+를 켜서 연다", async () => // 상세 잠금 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const first = renderWithApp(<CharacterDetail characterId="rank-017" />); // 인증 전 상세 렌더
        expect(screen.getByRole("heading", { level: 1, name: "19세 이상 이용 가능한 캐릭터입니다" })).toBeInTheDocument(); // 잠금 제목 확인
        expect(screen.getByRole("button", { name: "성인 인증하고 보기" })).toBeInTheDocument(); // 인증 버튼 확인
        first.unmount(); // 첫 화면 정리
        renderWithApp(<CharacterDetail characterId="rank-017" />, verifiedState(false)); // 인증 후 꺼진 상세 렌더
        await user.click(screen.getByRole("button", { name: "19+ 켜고 보기" })); // 19+ 켜기
        expect(screen.getByRole("heading", { level: 1, name: "비 내리는 미래 도시의 태오" })).toBeInTheDocument(); // 상세 표시 확인
        expect(screen.getByText("19세 이용가")).toBeInTheDocument(); // 등급 배지 확인
        expect(screen.getByText("폭력 묘사")).toBeInTheDocument(); // 주의 항목 확인
    }); // 검증 종료

    it("19세 캐릭터 대화 주소도 대화를 만들지 않고 잠근다", () => // 대화 잠금 검증
    { // 검증 시작
        renderWithApp(<><ChatScreen characterId="rank-020" /><ConversationCount /></>); // 대화 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: "19세 이상 이용 가능한 캐릭터입니다" })).toBeInTheDocument(); // 잠금 확인
        expect(screen.getByText(/이 캐릭터의 대화를 볼 수 있습니다/)).toBeInTheDocument(); // 대화 문구 확인
        expect(screen.getByLabelText("대화 수")).toHaveTextContent("3"); // 대화 미생성 확인
    }); // 검증 종료

    it("보관함의 19세 캐릭터는 흐리게 잠그고 소개를 가린다", async () => // 보관함 잠금 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const state = { ...createInitialState(), bookmarkedCharacterIds: ["rank-017"] }; // 보관 상태
        renderWithApp(<LibraryScreen />, state); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "보관 캐릭터" })); // 보관 탭 선택
        const card = screen.getByRole("link", { name: "비 내리는 미래 도시의 태오 상세 보기" }).closest("article"); // 보관 카드 조회
        expect(card).toHaveAttribute("data-locked", "true"); // 잠금 표시 확인
        expect(within(card as HTMLElement).getByText("19+ 잠금")).toBeInTheDocument(); // 잠금 배지 확인
        expect(within(card as HTMLElement).getByText(/19\+를 켜면 내용을 볼 수 있습니다/)).toBeInTheDocument(); // 소개 가림 확인
    }); // 검증 종료
}); // 묶음 종료

function ConversationCount() // 대화 수 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="대화 수">{state.conversations.length}</output>; // 대화 수 출력
} // 함수 종료

describe("프로필의 성인 인증", () => // 프로필 묶음
{ // 묶음 시작
    it("오른쪽 패널에 FREE 옆 성인 인증 ON/OFF 배지를 보여 준다", () => // 배지 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const first = render(<UserPanel profile={state.profile} wallet={state.wallet} settings={state.settings} open onNavigate={() => undefined} />); // 인증 전 패널
        const off = screen.getByRole("link", { name: /성인 인증 OFF/ }); // 꺼짐 배지
        expect(off).toHaveAttribute("href", "/settings/profile#adult"); // 관리 경로 확인
        expect(off).toHaveAttribute("data-state", "off"); // 꺼짐 상태 확인
        expect(off.previousElementSibling).toHaveTextContent("FREE 멤버십"); // 멤버십 옆 위치 확인
        first.unmount(); // 첫 패널 정리
        const verified = verifiedState(false); // 인증 상태
        render(<UserPanel profile={verified.profile} wallet={verified.wallet} settings={verified.settings} open onNavigate={() => undefined} />); // 인증 후 패널
        expect(screen.getByRole("link", { name: /성인 인증 ON/ })).toHaveAttribute("data-state", "on"); // 켜짐 배지 확인
    }); // 검증 종료

    it("프로필 관리에서 성인 인증을 하고 해제할 수 있다", async () => // 프로필 인증 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        renderWithApp(<><ProfileSettings /><AdultProbe /></>); // 프로필 렌더
        const card = screen.getByRole("region", { name: "성인 인증" }); // 인증 카드 조회
        expect(within(card).getByText("OFF · 인증 전")).toBeInTheDocument(); // 인증 전 확인
        await user.click(within(card).getByRole("button", { name: "성인 인증하기" })); // 인증 창 열기
        await verifyInDialog(user, "1990-01-01"); // 성인 인증
        expect(within(card).getByText("ON · 인증 완료")).toBeInTheDocument(); // 인증 완료 확인
        expect(within(card).getByText("모의 인증(Mock)")).toBeInTheDocument(); // 인증 방식 확인
        expect(screen.getByLabelText("19+ 상태")).toHaveTextContent("인증:꺼짐"); // 스위치 유지 확인
        expect(screen.getByText("성인 인증 ON")).toBeInTheDocument(); // 미리보기 배지 확인
        await user.click(within(card).getByRole("button", { name: "성인 인증 해제" })); // 인증 해제
        expect(within(card).getByRole("status")).toHaveTextContent("성인 인증을 해제하고 19+ 콘텐츠를 숨겼습니다."); // 해제 안내 확인
        expect(screen.getByLabelText("19+ 상태")).toHaveTextContent("인증 전:꺼짐"); // 해제 상태 확인
    }); // 검증 종료

    it("캐릭터 제작의 19세 이용가는 성인 인증 후에만 고를 수 있다", () => // 제작 등급 검증
    { // 검증 시작
        const first = renderWithApp(<CharacterEditor />); // 인증 전 편집기
        fireEvent.click(screen.getByRole("button", { name: "전체 펼쳐 보기" })); // 모든 단계를 한 화면에서 확인(기본은 단계별 보기)
        expect(screen.getByRole("option", { name: "19세 이용가" })).toBeDisabled(); // 비활성 확인
        expect(screen.getByText("19세 이용가는 성인 인증 후 선택할 수 있습니다.")).toBeInTheDocument(); // 안내 확인
        first.unmount(); // 첫 편집기 정리
        renderWithApp(<CharacterEditor />, verifiedState(false)); // 인증 후 편집기
        fireEvent.click(screen.getByRole("button", { name: "전체 펼쳐 보기" })); // 모든 단계를 한 화면에서 확인(기본은 단계별 보기)
        expect(screen.getByRole("option", { name: "19세 이용가" })).toBeEnabled(); // 활성 확인
        fireEvent.change(screen.getByLabelText("이용 등급"), { target: { value: "mature" } }); // 19세 등급 선택
        expect(screen.getByTestId("character-preview")).toHaveTextContent("19세 이용가"); // 미리보기 등급 확인
    }); // 검증 종료
}); // 묶음 종료
