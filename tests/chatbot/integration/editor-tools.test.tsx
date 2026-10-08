import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // 캐릭터 편집기
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // 스토리 편집기
import { writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

const draftKey = "mateverse:draft:character:new"; // 새 캐릭터 자동 저장 키

function Probe() // 저장된 상태 요약(시험 대화가 실제 상태를 건드리지 않는지 확인)
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="상태 요약">{state.wallet.balance}|{state.conversations.length}|{state.tokenRecords.length}|{state.characters.some((character) => character.id === "test-chat-character")}|{state.characters.filter((character) => character.creatorId === state.profile.id).map((character) => character.name).join(",")}</output>; // 잔액·대화 수·기록 수·임시 캐릭터·내 캐릭터
} // 함수 종료

function ownedRian(): AppState // 내가 만든 리안이 있는 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.characters[0] = { ...state.characters[0], creatorId: state.profile.id }; // 소유 캐릭터
    return state; // 상태 반환
} // 함수 종료

describe("단계별 편집", () => // 단계 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 자동 저장분 비움

    it("새 캐릭터는 한 단계씩 보여 주고 다음 단계·단계 버튼·전체 펼쳐 보기로 오간다", async () => // 단계 이동
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<CharacterEditor />); // 새 캐릭터
        const nav = screen.getByRole("navigation", { name: "편집 단계" }); // 편집 단계
        expect(within(nav).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["1기본 정보", "2성격과 세계관", "3진행 설정", "4공개 설정"]); // 네 단계
        expect(within(nav).getByRole("button", { name: /기본 정보/ })).toHaveAttribute("aria-current", "step"); // 첫 단계
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toBeVisible(); // 기본 정보 입력
        expect(screen.queryByRole("textbox", { name: "성격" })).toBeNull(); // 다른 단계는 숨김
        await user.click(screen.getByRole("button", { name: "다음 단계 ›" })); // 다음
        expect(screen.getByRole("textbox", { name: "성격" })).toBeVisible(); // 성격과 세계관
        expect(screen.queryByRole("textbox", { name: "캐릭터 이름" })).toBeNull(); // 앞 단계 숨김
        await user.click(within(nav).getByRole("button", { name: /공개 설정/ })); // 단계 버튼
        expect(screen.getByRole("combobox", { name: "이용 등급" })).toBeVisible(); // 공개 설정
        expect(screen.getByText("마지막 단계예요. 아래에서 저장해 주세요.")).toBeVisible(); // 마지막 안내
        await user.click(screen.getByRole("button", { name: "‹ 이전 단계" })); // 이전
        expect(screen.getByRole("list", { name: "스탯 목록" })).toBeVisible(); // 진행 설정
        await user.click(screen.getByRole("button", { name: "전체 펼쳐 보기" })); // 전체 보기
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toBeVisible(); // 모든 단계가 보임
        expect(screen.getByRole("combobox", { name: "이용 등급" })).toBeVisible(); // 모든 단계가 보임
        expect(screen.getByRole("button", { name: "단계별로 보기" })).toHaveAttribute("aria-pressed", "true"); // 전환 버튼
        expect(screen.queryByRole("button", { name: "다음 단계 ›" })).toBeNull(); // 전체 보기에서는 이동 버튼 없음
    }); // 검증 종료

    it("저장할 때 빠진 입력이 있으면 그 단계로 옮기고 단계 버튼에 표시한다", async () => // 오류 단계
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<CharacterEditor />); // 새 캐릭터
        const nav = screen.getByRole("navigation", { name: "편집 단계" }); // 편집 단계
        await user.type(screen.getByRole("textbox", { name: "캐릭터 이름" }), "새벽 사서"); // 이름
        await user.type(screen.getByRole("textbox", { name: "한 줄 소개" }), "새벽에만 문을 여는 도서관의 사서"); // 소개
        await user.click(within(nav).getByRole("button", { name: /공개 설정/ })); // 마지막 단계로
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("입력 내용을 확인해 주세요."); // 안내
        expect(within(nav).getByRole("button", { name: /성격과 세계관/ })).toHaveAttribute("aria-current", "step"); // 빠진 입력이 있는 단계로
        expect(within(nav).getByRole("button", { name: /성격과 세계관, 확인할 입력 있음/ })).toBeVisible(); // 단계 표시
        expect(within(nav).queryByRole("button", { name: /기본 정보, 확인할 입력 있음/ })).toBeNull(); // 채운 단계는 표시 없음
        expect(screen.getAllByRole("alert").length).toBeGreaterThan(0); // 그 단계의 오류 문구
    }); // 검증 종료

    it("기존 작품을 고칠 때는 전체 펼쳐 보기로 시작한다", () => // 수정은 전체 보기
    { // 검증 시작
        renderWithApp(<CharacterEditor characterId="rian" />, ownedRian()); // 내 리안
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toBeVisible(); // 기본 정보
        expect(screen.getByRole("textbox", { name: "성격" })).toBeVisible(); // 성격과 세계관
        expect(screen.getByRole("combobox", { name: "이용 등급" })).toBeVisible(); // 공개 설정
        expect(screen.getByRole("button", { name: "단계별로 보기" })).toBeVisible(); // 전환 가능
    }); // 검증 종료
}); // 묶음 종료

describe("작성 중 자동 저장", () => // 자동 저장 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 자동 저장분 비움

    it("입력이 멈추면 자동 저장하고, 다시 열면 이어서 쓸지 묻고, 저장을 마치면 지운다", async () => // 자동 저장 흐름
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const first = renderWithApp(<CharacterEditor />); // 새 캐릭터
        await user.type(screen.getByRole("textbox", { name: "캐릭터 이름" }), "새벽 사서"); // 이름
        expect(await screen.findByText(/작성 중인 내용을 자동 저장했어요/, undefined, { timeout: 3000 })).toBeVisible(); // 자동 저장 표시
        expect(JSON.parse(localStorage.getItem(draftKey) ?? "{}").draft.name).toBe("새벽 사서"); // 보관 확인
        first.unmount(); // 창 닫기
        renderWithApp(<><CharacterEditor /><Probe /></>); // 다시 열기
        const notice = screen.getByRole("group", { name: "자동 저장 안내" }); // 안내
        expect(notice).toHaveTextContent("지난번에 쓰다가 자동 저장한 내용이 있어요"); // 문구
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toHaveValue(""); // 아직 빈 초안
        await user.click(within(notice).getByRole("button", { name: "이어서 쓰기" })); // 이어 쓰기
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toHaveValue("새벽 사서"); // 불러옴
        expect(screen.queryByRole("group", { name: "자동 저장 안내" })).toBeNull(); // 안내 사라짐
        await user.click(screen.getByRole("button", { name: "전체 펼쳐 보기" })); // 나머지 입력
        await user.type(screen.getByRole("textbox", { name: "한 줄 소개" }), "새벽에만 문을 여는 도서관의 사서"); // 소개
        await user.type(screen.getByRole("textbox", { name: "성격" }), "차분하고 다정하다"); // 성격
        await user.type(screen.getByRole("textbox", { name: "첫 인사" }), "어서 와, 오늘도 왔구나."); // 첫 인사
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("공개 저장했습니다."); // 저장 완료
        expect(localStorage.getItem(draftKey)).toBeNull(); // 자동 저장분 지움
        expect(screen.getByLabelText("상태 요약")).toHaveTextContent("새벽 사서"); // 내 캐릭터로 저장
    }, 20_000); // 검증 종료(글자를 많이 쳐서 느린 컴퓨터에서는 기본 5초를 넘기므로 넉넉히 기다림. 넘기면 치던 글자가 다음 테스트로 새어 들어감)

    it("자동 저장한 내용을 쓰지 않으려면 지울 수 있다", async () => // 지우기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: "2026-10-03T12:00:00.000Z", draft: { name: "버릴 초안" } })); // 예전 보관분
        renderWithApp(<CharacterEditor />); // 새 캐릭터
        await user.click(within(screen.getByRole("group", { name: "자동 저장 안내" })).getByRole("button", { name: "지우기" })); // 지우기
        expect(localStorage.getItem(draftKey)).toBeNull(); // 삭제
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toHaveValue(""); // 빈 초안 유지
    }); // 검증 종료

    it("로그인한 계정의 자동 저장은 그 계정의 칸에만 두어, 손님이 쓰던 것과 섞이지 않는다", async () => // 계정별 자동 저장
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const account: AccountSession = { accountId: "practice-soha", name: "소하", email: null, provider: "practice", signedInAt: "2026-10-07T00:00:00.000Z" }; // 연습용 계정
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: "2026-10-03T12:00:00.000Z", draft: { name: "손님 초안" } })); // 손님이 쓰다 만 초안
        writeAccountSession(localStorage, account); // 로그인
        const first = renderWithApp(<CharacterEditor />); // 계정으로 새 캐릭터
        expect(screen.queryByRole("group", { name: "자동 저장 안내" })).toBeNull(); // 손님 초안을 계정에게 권하지 않음
        await user.type(screen.getByRole("textbox", { name: "캐릭터 이름" }), "계정 초안"); // 이름
        expect(await screen.findByText(/작성 중인 내용을 자동 저장했어요/, undefined, { timeout: 3000 })).toBeVisible(); // 자동 저장 표시
        expect(JSON.parse(localStorage.getItem(`mateverse:v1:u:${account.accountId}:draft:character:new`) ?? "{}").draft.name).toBe("계정 초안"); // 계정 칸에 보관
        expect(JSON.parse(localStorage.getItem(draftKey) ?? "{}").draft.name).toBe("손님 초안"); // 손님 초안은 그대로
        first.unmount(); // 창 닫기
        writeAccountSession(localStorage, null); // 로그아웃
        renderWithApp(<CharacterEditor />); // 손님으로 새 캐릭터
        await user.click(within(screen.getByRole("group", { name: "자동 저장 안내" })).getByRole("button", { name: "이어서 쓰기" })); // 이어 쓰기
        expect(screen.getByRole("textbox", { name: "캐릭터 이름" })).toHaveValue("손님 초안"); // 손님에게는 손님 초안만 보임
    }, 20_000); // 검증 종료(자동 저장을 기다리는 시간이 있어 넉넉히 기다림)
}); // 묶음 종료

describe("시험 대화", () => // 시험 대화 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 자동 저장분 비움

    it("저장하지 않고 지금 내용으로 대화해 보고, 토큰과 기록은 그대로다", async () => // 캐릭터 시험 대화
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><CharacterEditor characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} /><Probe /></>, ownedRian()); // 내 리안
        const before = screen.getByLabelText("상태 요약").textContent; // 시험 전 상태
        await user.click(screen.getByRole("button", { name: "시험 대화" })); // 열기
        const dialog = screen.getByRole("dialog", { name: "새벽 도서관의 리안 시험 대화" }); // 대화상자
        expect(dialog).toHaveTextContent("기록이 남지 않고 토큰을 쓰지 않아요."); // 안내
        expect(within(dialog).getByText("0/10턴")).toBeVisible(); // 턴 표시
        expect(within(dialog).getAllByRole("listitem").length).toBeGreaterThan(0); // 첫 인사
        await user.type(within(dialog).getByRole("textbox", { name: "시험 메시지" }), "안녕{Enter}"); // 보내기
        await waitFor(() => expect(within(dialog).getByText("1/10턴")).toBeVisible()); // 1턴
        expect(within(dialog).getByRole("region", { name: "상태창" })).toBeVisible(); // 상태창
        expect(within(dialog).getByRole("region", { name: "상태창" })).toHaveTextContent("호감도"); // 스탯이 어떻게 움직이는지 확인(시험 대화는 스탯 초기값에서 시작)
        await user.click(within(dialog).getByRole("button", { name: "처음부터 다시" })); // 다시
        expect(within(dialog).getByText("0/10턴")).toBeVisible(); // 초기화
        await user.click(within(dialog).getByRole("button", { name: "닫기" })); // 닫기
        expect(screen.queryByRole("dialog")).toBeNull(); // 닫힘
        expect(screen.getByLabelText("상태 요약").textContent).toBe(before); // 잔액·대화·기록·임시 캐릭터 모두 그대로
    }); // 검증 종료

    it("필수 입력이 비어 있으면 시험 대화 대신 확인할 단계를 알려 준다", async () => // 필수 입력
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<CharacterEditor />); // 빈 새 캐릭터
        await user.click(screen.getByRole("button", { name: "시험 대화" })); // 열기 시도
        expect(screen.queryByRole("dialog")).toBeNull(); // 열리지 않음
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("시험 대화를 하려면 입력 내용을 먼저 확인해 주세요."); // 안내
    }); // 검증 종료

    it("스토리도 시험 대화로 시작 장면과 응답을 확인한다", async () => // 스토리 시험 대화
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const state = createInitialState(); // 초기 상태
        state.stories[0] = { ...state.stories[0], creatorId: state.profile.id }; // 내 스토리
        renderWithApp(<><StoryEditor storyId={state.stories[0].id} llm={new MockLLMAdapter({ delayMs: 0, seed: 1 })} /><Probe /></>, state); // 스토리 편집기
        const before = screen.getByLabelText("상태 요약").textContent; // 시험 전 상태
        await user.click(screen.getByRole("button", { name: "시험 대화" })); // 열기
        const dialog = screen.getByRole("dialog", { name: `${state.stories[0].title} 시험 대화` }); // 대화상자
        await user.type(within(dialog).getByRole("textbox", { name: "시험 메시지" }), "기록관을 둘러보자{Enter}"); // 보내기
        await waitFor(() => expect(within(dialog).getByText("1/10턴")).toBeVisible()); // 1턴
        expect(screen.getByLabelText("상태 요약").textContent).toBe(before); // 실제 상태는 그대로
    }); // 검증 종료
}); // 묶음 종료
