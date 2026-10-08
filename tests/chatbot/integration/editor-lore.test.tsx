import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // 캐릭터 편집기
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, ExampleDialogue, LoreEntry } from "@chatbot/features/core/types"; // 상태 타입
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // 스토리 편집기
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.setConfig({ testTimeout: 20_000 }); // 글자를 많이 입력하는 화면 테스트라 컴퓨터가 바쁠 때도 끝나도록 제한 시간을 늘림

const forbidden: LoreEntry = { id: "lore-forbidden", title: "금서 구역", keywords: ["금서"], content: "사서만 들어갈 수 있다." }; // 금서 설정
const example: ExampleDialogue = { id: "example-1", user: "오늘 뭐 해?", reply: "책을 정리하고 있었어." }; // 예시 대화

function Probe() // 저장된 리안과 첫 스토리의 설정집·예시 대화 요약
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const rian = state.characters.find((character) => character.id === "rian"); // 리안
    const pick = (work: { lorebook: LoreEntry[]; examples: ExampleDialogue[] } | undefined) => ({ lore: (work?.lorebook ?? []).map((entry) => [entry.title, entry.keywords, entry.content]), examples: (work?.examples ?? []).map((item) => [item.user, item.reply]) }); // 요약 모양
    return <output aria-label="작품 요약">{JSON.stringify({ rian: pick(rian), story: pick(state.stories[0]), wallet: state.wallet.balance, conversations: state.conversations.length })}</output>; // 요약 출력
} // 함수 종료

const summary = () => JSON.parse(screen.getByLabelText("작품 요약").textContent ?? "{}") as { rian: { lore: unknown[]; examples: unknown[] }; story: { lore: unknown[]; examples: unknown[] }; wallet: number; conversations: number }; // 요약 읽기

function ownedRian(patch: Partial<Pick<AppState["characters"][number], "lorebook" | "examples">> = {}): AppState // 내가 만든 리안이 있는 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.characters[0] = { ...state.characters[0], creatorId: state.profile.id, ...patch }; // 소유 캐릭터
    return state; // 상태 반환
} // 함수 종료

describe("키워드 설정집과 예시 대화 편집", () => // 편집 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 자동 저장분 비움

    it("설정과 예시 대화를 추가해 저장하면 작품에 남고, 아무것도 적지 않은 항목은 버린다", async () => // 저장 흐름
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><CharacterEditor characterId="rian" /><Probe /></>, ownedRian()); // 내 리안
        const loreGroup = screen.getByRole("group", { name: "키워드 설정집" }); // 설정집 묶음
        expect(within(loreGroup).queryByRole("list", { name: "설정집 목록" })).toBeNull(); // 처음에는 없음
        await user.click(within(loreGroup).getByRole("button", { name: "＋ 설정 추가 (0/20)" })); // 설정 추가
        const first = within(loreGroup).getByRole("group", { name: "설정 1" }); // 새 설정(펼쳐서 시작)
        await user.type(within(first).getByRole("textbox", { name: "설정 이름" }), "금서 구역"); // 이름
        const card = within(loreGroup).getByRole("group", { name: "금서 구역" }); // 이름이 제목이 됨
        await user.type(within(card).getByRole("textbox", { name: "키워드" }), "금서, 봉인"); // 키워드
        expect(within(card).getByRole("textbox", { name: "키워드" })).toHaveValue("금서, 봉인"); // 쉼표와 띄어쓰기 그대로 입력됨
        await user.type(within(card).getByRole("textbox", { name: "설정 내용" }), "사서만 들어갈 수 있다."); // 내용
        expect(within(card).getByText("내용 13/500자")).toBeVisible(); // 글자 수
        await user.click(within(loreGroup).getByRole("button", { name: "＋ 설정 추가 (1/20)" })); // 빈 설정 하나 더
        const exampleGroup = screen.getByRole("group", { name: "예시 대화" }); // 예시 묶음
        await user.click(within(exampleGroup).getByRole("button", { name: "＋ 예시 추가 (0/5)" })); // 예시 추가
        const pair = within(exampleGroup).getByRole("group", { name: "예시 1" }); // 예시 카드
        await user.type(within(pair).getByRole("textbox", { name: "사용자 말" }), "오늘 뭐 해?"); // 사용자 말
        await user.type(within(pair).getByRole("textbox", { name: "캐릭터 답" }), "책을 정리하고 있었어."); // 답
        await user.click(within(exampleGroup).getByRole("button", { name: "＋ 예시 추가 (1/5)" })); // 빈 예시 하나 더
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("공개 저장했습니다."); // 저장 완료
        expect(summary().rian).toEqual({ lore: [["금서 구역", ["금서", "봉인"], "사서만 들어갈 수 있다."]], examples: [["오늘 뭐 해?", "책을 정리하고 있었어."]] }); // 정리해서 저장(빈 항목 제외)
        expect(within(loreGroup).getByRole("button", { name: "＋ 설정 추가 (1/20)" })).toBeVisible(); // 빈 설정이 사라짐
        expect(within(exampleGroup).getByRole("button", { name: "＋ 예시 추가 (1/5)" })).toBeVisible(); // 빈 예시가 사라짐
    }); // 검증 종료

    it("키워드나 내용이 빠진 설정은 저장하지 않고 그 단계에서 알려 준다", async () => // 오류 안내
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<CharacterEditor />); // 새 캐릭터(단계별 보기)
        const nav = screen.getByRole("navigation", { name: "편집 단계" }); // 편집 단계
        await user.type(screen.getByRole("textbox", { name: "캐릭터 이름" }), "새벽 사서"); // 이름
        await user.type(screen.getByRole("textbox", { name: "한 줄 소개" }), "새벽에만 문을 여는 도서관의 사서"); // 소개
        await user.click(screen.getByRole("button", { name: "다음 단계 ›" })); // 성격과 세계관
        await user.type(screen.getByRole("textbox", { name: "성격" }), "차분하고 다정하다"); // 성격
        await user.type(screen.getByRole("textbox", { name: "첫 인사" }), "어서 와, 오늘도 왔구나."); // 첫 인사
        await user.click(screen.getByRole("button", { name: "＋ 설정 추가 (0/20)" })); // 설정 추가
        await user.type(screen.getByRole("textbox", { name: "설정 이름" }), "금서 구역"); // 이름만 적음
        await user.click(screen.getByRole("button", { name: "＋ 예시 추가 (0/5)" })); // 예시 추가
        await user.type(screen.getByRole("textbox", { name: "사용자 말" }), "오늘 뭐 해?"); // 사용자 말만 적음
        await user.click(within(nav).getByRole("button", { name: /공개 설정/ })); // 마지막 단계로
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("입력 내용을 확인해 주세요."); // 안내
        expect(within(nav).getByRole("button", { name: /성격과 세계관, 확인할 입력 있음/ })).toHaveAttribute("aria-current", "step"); // 설정집이 있는 단계로
        expect(screen.getByText("설정 1의 키워드를 1~5개(각 20자 이하) 적어 주세요.")).toBeVisible(); // 설정집 오류
        expect(screen.getByText("예시 1의 답을 1~500자로 적어 주세요.")).toBeVisible(); // 예시 오류
    }); // 검증 종료

    it("다 채운 설정은 접어서 보여 주고, 펼쳐서 고치거나 지울 수 있다", async () => // 접기·펼치기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><CharacterEditor characterId="rian" /><Probe /></>, ownedRian({ lorebook: [forbidden], examples: [example] })); // 설정집이 있는 리안
        const card = screen.getByRole("group", { name: "금서 구역" }); // 설정 카드
        expect(within(card).getByText("키워드: 금서")).toBeVisible(); // 접힌 요약
        expect(within(card).queryByRole("textbox", { name: "설정 내용" })).toBeNull(); // 입력은 숨김
        await user.click(within(card).getByRole("button", { name: "금서 구역 펼치기" })); // 펼치기
        expect(within(card).getByRole("button", { name: "금서 구역 접기" })).toHaveAttribute("aria-expanded", "true"); // 펼침 표시
        const content = within(card).getByRole("textbox", { name: "설정 내용" }); // 내용
        expect(content).toHaveValue("사서만 들어갈 수 있다."); // 저장된 내용
        await user.type(content, " 밤에는 문이 잠긴다."); // 고치기
        expect(screen.getByRole("textbox", { name: "캐릭터 답" })).toHaveValue("책을 정리하고 있었어."); // 예시 대화는 늘 펼쳐 있음
        await user.click(screen.getByRole("button", { name: "예시 1 삭제" })); // 예시 삭제
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(summary().rian).toEqual({ lore: [["금서 구역", ["금서"], "사서만 들어갈 수 있다. 밤에는 문이 잠긴다."]], examples: [] }); // 고친 내용
        await user.click(within(card).getByRole("button", { name: "금서 구역 설정 삭제" })); // 설정 삭제
        expect(screen.getByRole("button", { name: "＋ 설정 추가 (0/20)" })).toBeVisible(); // 목록이 비었음
    }); // 검증 종료

    it("설정은 20개, 예시 대화는 5쌍까지만 추가할 수 있다", () => // 한도
    { // 검증 시작
        const lorebook = Array.from({ length: 20 }, (_item, index) => ({ ...forbidden, id: `lore-${index}`, title: `설정${index}` })); // 스무 설정
        const examples = Array.from({ length: 5 }, (_item, index) => ({ ...example, id: `example-${index}` })); // 다섯 예시
        renderWithApp(<CharacterEditor characterId="rian" />, ownedRian({ lorebook, examples })); // 가득 찬 리안
        expect(screen.getByRole("button", { name: "＋ 설정 추가 (20/20)" })).toBeDisabled(); // 설정 한도
        expect(screen.getByRole("button", { name: "＋ 예시 추가 (5/5)" })).toBeDisabled(); // 예시 한도
        expect(within(screen.getByRole("list", { name: "설정집 목록" })).getAllByRole("listitem")).toHaveLength(20); // 스무 장
    }); // 검증 종료

    it("스토리 편집기에서도 설정집과 예시 대화를 저장한다", async () => // 스토리
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const state = createInitialState(); // 초기 상태
        state.stories[0] = { ...state.stories[0], creatorId: state.profile.id }; // 내 스토리
        renderWithApp(<><StoryEditor storyId={state.stories[0].id} /><Probe /></>, state); // 스토리 편집기
        await user.click(screen.getByRole("button", { name: "＋ 설정 추가 (0/20)" })); // 설정 추가
        const card = screen.getByRole("group", { name: "설정 1" }); // 새 설정
        await user.type(within(card).getByRole("textbox", { name: "설정 이름" }), "금서 구역"); // 이름
        await user.type(screen.getByRole("textbox", { name: "키워드" }), "금서"); // 키워드
        await user.type(screen.getByRole("textbox", { name: "설정 내용" }), "사서만 들어갈 수 있다."); // 내용
        await user.click(screen.getByRole("button", { name: "＋ 예시 추가 (0/5)" })); // 예시 추가
        await user.type(screen.getByRole("textbox", { name: "사용자 말" }), "문을 열어 볼까?"); // 사용자 말
        await user.type(screen.getByRole("textbox", { name: "이야기 답" }), "[[내레이션] 문이 천천히 열린다."); // 이야기 답(대괄호는 입력 도구에서 두 번 적어야 글자로 들어감)
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("공개 저장했습니다."); // 저장 완료
        expect(summary().story).toEqual({ lore: [["금서 구역", ["금서"], "사서만 들어갈 수 있다."]], examples: [["문을 열어 볼까?", "[내레이션] 문이 천천히 열린다."]] }); // 스토리에 저장
    }); // 검증 종료
}); // 묶음 종료

describe("시험 대화에서 설정집 확인", () => // 시험 대화 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 자동 저장분 비움

    it("키워드를 말하면 참고한 설정을 알려 주고 답에 드러내며, 예시와 같은 말에는 예시 답으로 답한다", async () => // 시험 대화
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<><CharacterEditor characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} /><Probe /></>, ownedRian({ lorebook: [forbidden], examples: [example] })); // 설정집이 있는 리안
        const before = summary(); // 시험 전 상태
        await user.click(screen.getByRole("button", { name: "시험 대화" })); // 열기
        const dialog = screen.getByRole("dialog", { name: "새벽 도서관의 리안 시험 대화" }); // 대화상자
        expect(within(dialog).queryByText(/설정집을 쓰지 않았어요|참고한 설정/)).toBeNull(); // 보내기 전에는 안내 없음
        const input = within(dialog).getByRole("textbox", { name: "시험 메시지" }); // 입력
        await user.type(input, "안녕{Enter}"); // 키워드 없는 말
        await waitFor(() => expect(within(dialog).getByText("1/10턴")).toBeVisible(), { timeout: 5000 }); // 1턴(컴퓨터가 바쁠 때를 대비해 넉넉히 기다림)
        expect(within(dialog).getByText("이번 답변에는 설정집을 쓰지 않았어요. 최근 대화에 키워드가 나오지 않았어요.")).toBeVisible(); // 쓰지 않음
        await user.type(input, "금서가 궁금해{Enter}"); // 키워드
        await waitFor(() => expect(within(dialog).getByText("2/10턴")).toBeVisible(), { timeout: 5000 }); // 2턴(컴퓨터가 바쁠 때를 대비해 넉넉히 기다림)
        expect(within(dialog).getByText(/이번 답변에 참고한 설정:/)).toHaveTextContent("이번 답변에 참고한 설정: 금서 구역"); // 참고한 설정
        expect(within(dialog).getByText(/‘금서 구역’ 이야기가 떠오른다\./)).toBeVisible(); // 답에 드러남
        await user.type(input, "오늘 뭐 해?{Enter}"); // 예시와 같은 말
        await waitFor(() => expect(within(dialog).getByText("3/10턴")).toBeVisible(), { timeout: 5000 }); // 3턴(컴퓨터가 바쁠 때를 대비해 넉넉히 기다림)
        expect(within(dialog).getByText("책을 정리하고 있었어.")).toBeVisible(); // 예시 답
        await user.click(within(dialog).getByRole("button", { name: "닫기" })); // 닫기
        expect(summary()).toEqual(before); // 실제 상태는 그대로
    }); // 검증 종료

    it("설정집이 없는 작품은 시험 대화에 설정 안내를 보이지 않는다", async () => // 설정집 없음
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<CharacterEditor characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} />, ownedRian()); // 기본 리안
        await user.click(screen.getByRole("button", { name: "시험 대화" })); // 열기
        const dialog = screen.getByRole("dialog", { name: "새벽 도서관의 리안 시험 대화" }); // 대화상자
        await user.type(within(dialog).getByRole("textbox", { name: "시험 메시지" }), "금서가 궁금해{Enter}"); // 보내기
        await waitFor(() => expect(within(dialog).getByText("1/10턴")).toBeVisible(), { timeout: 5000 }); // 1턴(컴퓨터가 바쁠 때를 대비해 넉넉히 기다림)
        expect(within(dialog).queryByText(/설정집을 쓰지 않았어요|참고한 설정/)).toBeNull(); // 안내 없음
    }); // 검증 종료
}); // 묶음 종료
