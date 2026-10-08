import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // 캐릭터 편집기
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, StoryEvent } from "@chatbot/features/core/types"; // 상태 타입
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
})); // 대체 종료

function Probe() // 잔액·이벤트 알림·리안 이벤트 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const rian = state.characters.find((character) => character.id === "rian"); // 리안
    return ( // 표시 반환
        <> {/* 표시 묶음 */}
            <output aria-label="잔액">{state.wallet.balance}</output> {/* 잔액 */}
            <output aria-label="이벤트 알림">{state.notifications.filter((item) => item.kind === "event").map((item) => item.title).join("|")}</output> {/* 이벤트 알림 */}
            <output aria-label="리안 이벤트">{JSON.stringify(rian?.events.map((event) => ({ name: event.name, condition: event.condition, statId: event.statId, value: event.value, narration: event.narration, scene: event.scene, title: event.title, ending: event.ending, notify: event.notify })))}</output> {/* 저장된 이벤트 */}
        </> // 표시 묶음 종료
    ); // 반환 종료
} // 함수 종료

function renderChat(state: AppState = createInitialState()) // 리안 대화 렌더(호감도 34에서 시작, 이미 1턴 진행)
{ // 함수 시작
    renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><Probe /></>, state); // 렌더
} // 함수 종료

async function send(user: ReturnType<typeof userEvent.setup>, text: string) // Enter로 보내고 끝까지 기다리기
{ // 함수 시작
    await user.type(screen.getByLabelText("메시지"), `${text}{Enter}`); // 입력 후 Enter
    await waitFor(() => expect(screen.getByLabelText("메시지")).toBeEnabled()); // 응답 완료
} // 함수 종료

function withRianEvents(events: StoryEvent[]): AppState // 리안의 이벤트 바꾸기
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.characters[0] = { ...state.characters[0], events }; // 이벤트 교체
    return state; // 상태 반환
} // 함수 종료

describe("대화 화면의 이벤트", () => // 대화 묶음
{ // 묶음 시작
    it("조건이 맞는 턴의 응답 아래에 이벤트 카드가 나오고 INFO 칭호와 알림함에 남으며 대화 비용만 쓴다", async () => // 이벤트 카드
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 기본 리안(예시 이벤트: 호감도 20 이상이면 한 걸음 가까이)
        await send(user, "안녕"); // 보내기
        const card = screen.getByRole("note", { name: "이벤트: 한 걸음 가까이" }); // 이벤트 카드
        expect(card).toHaveTextContent("한 걸음 가까이 · 리안"); // 이름과 인물
        expect(card).toHaveTextContent("리안의 말투가 눈에 띄게 부드러워졌다."); // 내레이션
        expect(card).toHaveTextContent("칭호 ‘말벗’"); // 칭호
        expect(within(screen.getByRole("region", { name: "상태창" })).getByLabelText("칭호")).toHaveTextContent("리안 · 말벗"); // INFO 칭호
        await waitFor(() => expect(screen.getByLabelText("이벤트 알림")).toHaveTextContent("이벤트: 한 걸음 가까이")); // 알림함
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1239"); // 메시지 1번 비용만
        await send(user, "오늘은 뭐 읽어?"); // 다음 턴
        expect(screen.getAllByRole("note", { name: /^이벤트:/ })).toHaveLength(1); // 다시 일어나지 않음
        expect(screen.getByLabelText("이벤트 알림")).toHaveTextContent(/^이벤트: 한 걸음 가까이$/); // 알림도 한 번
    }); // 검증 종료

    it("엔딩 이벤트는 엔딩으로 표시하고 특별 장면 그림을 응답 아래에 붙이며 대화는 계속할 수 있다", async () => // 엔딩
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(withRianEvents([{ id: "e-end", name: "새벽의 약속", condition: "turn", statId: null, value: 2, narration: "{이름}이(가) 조용히 약속을 건넨다.", scene: "/images/scenes/moon-library.webp", title: "약속한 사람", ending: true, notify: true }])); // 2턴 엔딩
        await send(user, "약속할게"); // 2턴
        const card = screen.getByRole("note", { name: "이벤트: 새벽의 약속" }); // 이벤트 카드
        expect(card).toHaveTextContent("리안이(가) 조용히 약속을 건넨다."); // 대표 인물 이름
        expect(card).toHaveTextContent("엔딩"); // 엔딩 배지
        expect(screen.getByRole("img", { name: "이 장면의 상황 이미지" }).getAttribute("src")).toContain("moon-library.webp"); // 특별 장면 그림
        expect(within(screen.getByRole("region", { name: "상태창" })).getByText(/엔딩 도달: 새벽의 약속/)).toBeVisible(); // INFO 엔딩
        await waitFor(() => expect(screen.getByLabelText("이벤트 알림")).toHaveTextContent("엔딩: 새벽의 약속")); // 알림함
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1239"); // 그림 값은 받지 않음
        await send(user, "계속 이야기하자"); // 엔딩 뒤에도 대화
        expect(screen.getByLabelText("잔액")).toHaveTextContent("1238"); // 계속 진행
    }); // 검증 종료

    it("INFO의 그래프 버튼으로 턴별 스탯 변화를 그래프와 표로 본다", async () => // 그래프
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 기본 리안
        const panel = screen.getByRole("region", { name: "상태창" }); // 상태창
        expect(within(panel).queryByRole("button", { name: "그래프" })).toBeNull(); // 첫 응답 전에는 없음
        await send(user, "선물 가져왔어"); // 2턴
        await send(user, "고마워"); // 3턴
        const toggle = within(panel).getByRole("button", { name: "그래프" }); // 그래프 버튼
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 접힘
        await user.click(toggle); // 펼치기
        const trend = within(panel).getByRole("group", { name: "턴별 스탯 변화" }); // 그래프 영역
        expect(within(trend).getByRole("img", { name: /^리안 호감도 변화: 2턴 \d+, 3턴 \d+$/ })).toBeInTheDocument(); // 턴별 값을 읽어 주는 그래프
        await user.click(within(trend).getByText("표로 보기")); // 표 펼치기
        const table = within(trend).getByRole("table"); // 표
        expect(within(table).getByRole("columnheader", { name: "리안 호감도" })).toBeInTheDocument(); // 스탯 열
        expect(within(table).getAllByRole("row")).toHaveLength(3); // 머리 + 두 턴
        await user.click(within(panel).getByRole("button", { name: "이전 턴 상태창" })); // 2턴 보기
        expect(within(trend).getByRole("img", { name: /^리안 호감도 변화: 2턴 \d+$/ })).toBeInTheDocument(); // 보고 있는 턴까지만
        await user.click(toggle); // 접기
        expect(within(panel).queryByRole("group", { name: "턴별 스탯 변화" })).toBeNull(); // 닫힘
    }); // 검증 종료
}); // 묶음 종료

describe("이벤트 편집", () => // 편집 묶음
{ // 묶음 시작
    function renderEditor() // 내가 만든 리안으로 편집기 열기
    { // 함수 시작
        const state = createInitialState(); // 초기 상태
        state.characters[0] = { ...state.characters[0], creatorId: state.profile.id, events: [] }; // 소유 캐릭터(이벤트 없음)
        renderWithApp(<><CharacterEditor characterId="rian" /><Probe /></>, state); // 렌더
    } // 함수 종료

    it("이벤트를 추가해 조건과 결과를 정하고 저장한다", async () => // 저장
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderEditor(); // 렌더
        await user.click(screen.getByRole("button", { name: "＋ 이벤트 추가 (0/8)" })); // 추가
        const card = within(screen.getByRole("list", { name: "이벤트 목록" })).getAllByRole("listitem")[0]; // 새 이벤트
        expect(within(card).getByLabelText("조건")).toHaveValue("stat-min"); // 첫 스탯의 이상 조건
        expect(within(card).getByLabelText("조건 스탯")).toHaveValue("affection"); // 호감도
        expect(within(card).getByLabelText("기준 값")).toHaveValue("50"); // 범위의 가운데
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 이름 없이 저장
        expect(screen.getByText("이벤트 1: 이름을 입력해 주세요.")).toBeVisible(); // 오류 안내
        await user.type(within(card).getByLabelText("이벤트 이름"), "마음을 연 순간"); // 이름
        await user.type(within(card).getByLabelText("내레이션"), "{{이름}이(가) 웃는다."); // 내레이션
        await user.selectOptions(within(card).getByLabelText("특별 장면 그림"), "달빛 기록관"); // 특별 장면
        await user.type(within(card).getByLabelText("칭호"), "단짝"); // 칭호
        await user.click(within(card).getByRole("checkbox", { name: "엔딩으로 표시" })); // 엔딩
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(JSON.parse(screen.getByLabelText("리안 이벤트").textContent ?? "[]")).toEqual([{ name: "마음을 연 순간", condition: "stat-min", statId: "affection", value: 50, narration: "{이름}이(가) 웃는다.", scene: "/images/scenes/moon-library.webp", title: "단짝", ending: true, notify: true }]); // 저장된 이벤트
    }); // 검증 종료

    it("턴 조건으로 바꾸면 스탯 선택이 사라지고, 스탯을 지우면 그 스탯을 쓰던 이벤트도 함께 지워진다", async () => // 조건 전환·정리
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderEditor(); // 렌더
        await user.click(screen.getByRole("button", { name: "＋ 이벤트 추가 (0/8)" })); // 스탯 이벤트
        await user.click(screen.getByRole("button", { name: "＋ 이벤트 추가 (1/8)" })); // 둘째 이벤트
        const cards = within(screen.getByRole("list", { name: "이벤트 목록" })).getAllByRole("listitem"); // 이벤트 둘
        await user.selectOptions(within(cards[1]).getByLabelText("조건"), "turn"); // 턴 조건으로
        expect(within(cards[1]).queryByLabelText("조건 스탯")).toBeNull(); // 스탯 선택 없음
        expect(within(cards[1]).getByLabelText("턴")).toHaveValue("5"); // 5턴부터
        await user.click(within(screen.getByRole("list", { name: "스탯 목록" })).getByRole("button", { name: "호감도 스탯 삭제" })); // 호감도 삭제
        expect(within(screen.getByRole("list", { name: "이벤트 목록" })).getAllByRole("listitem")).toHaveLength(1); // 턴 이벤트만 남음
        expect(screen.getByRole("button", { name: "＋ 이벤트 추가 (1/8)" })).toBeEnabled(); // 개수 갱신
    }); // 검증 종료
}); // 묶음 종료
