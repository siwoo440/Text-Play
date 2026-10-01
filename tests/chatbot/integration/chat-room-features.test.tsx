import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 어댑터 타입
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
})); // 대체 종료

class CapturingLLMAdapter implements LLMAdapter // 입력 기록 어댑터
{ // 클래스 시작
    public inputs: LLMInput[] = []; // 받은 입력

    public async *streamReply(input: LLMInput): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        this.inputs.push(input); // 입력 기록
        yield "기록한 응답"; // 응답
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 요약
    { // 함수 시작
        void _input; // 사용 표시
        return Promise.resolve("둘은 도서관에서 오래 이야기를 나눴다."); // 요약 반환
    } // 함수 종료
} // 클래스 종료

function StateProbe() // 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const conversation = state.conversations.find((item) => item.id === "conversation-rian"); // 리안 대화
    const memories = state.memories.filter((memory) => memory.conversationId === "conversation-rian"); // 리안 기억
    return <output aria-label="상태 확인">{state.wallet.balance}|{conversation?.settings.tier}|{memories.map((memory) => memory.category).sort().join(",")}|{state.notifications.filter((item) => item.kind === "memory").length}</output>; // 잔액·등급·기억·알림
} // 함수 종료

function renderChat(llm: LLMAdapter = new MockLLMAdapter({ delayMs: 0 })) // 채팅 렌더
{ // 함수 시작
    renderWithApp(<><ChatScreen characterId="rian" llm={llm} images={new MockImageAdapter()} /><StateProbe /></>); // 리안 대화
} // 함수 종료

async function send(user: ReturnType<typeof userEvent.setup>, text: string) // Enter로 보내고 끝까지 기다리기
{ // 함수 시작
    await user.type(screen.getByLabelText("메시지"), `${text}{Enter}`); // 입력 후 Enter
    await waitFor(() => expect(screen.getByLabelText("메시지")).toBeEnabled()); // 응답 완료
} // 함수 종료

describe("채팅방 설정과 고정 상태창", () => // 기능 묶음
{ // 묶음 시작
    it("INFO 상태창은 응답마다 고정 자리에서 갱신되고 이전 턴 상태창을 넘겨 볼 수 있다", async () => // 상태창 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 렌더
        const panel = screen.getByRole("region", { name: "상태창" }); // 상태창
        expect(within(panel).getByText(/첫 응답부터 매 턴 상태창/)).toBeVisible(); // 첫 안내
        await send(user, "오늘은 어떤 책이 좋아?"); // 첫 턴
        await waitFor(() => expect(within(panel).getByText(/턴 · 1\/1/)).toBeVisible()); // 첫 상태창
        expect(within(panel).getByText(/📍/)).toBeVisible(); // 장소 표시
        await send(user, "그 책을 같이 읽자"); // 둘째 턴
        await waitFor(() => expect(within(panel).getByText(/턴 · 2\/2/)).toBeVisible()); // 최신 상태창
        expect(within(panel).getByRole("button", { name: "다음 턴 상태창" })).toBeDisabled(); // 최신에서는 다음 없음
        await user.click(within(panel).getByRole("button", { name: "이전 턴 상태창" })); // 이전 턴 보기
        expect(within(panel).getByText(/턴 · 1\/2/)).toBeVisible(); // 이전 턴 표시
        await user.click(within(panel).getByRole("button", { name: "최신" })); // 최신으로
        expect(within(panel).getByText(/턴 · 2\/2/)).toBeVisible(); // 최신 복귀
        await user.click(within(panel).getByRole("button", { name: /INFO/ })); // 접기
        expect(within(panel).queryByText(/📍/)).toBeNull(); // 내용 숨김
    }); // 검증 종료

    it("채팅 모델 등급을 바꾸면 메시지당 비용이 바뀌고 전송할 때 그만큼 차감된다", async () => // 등급 비용 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 렌더
        const before = Number(screen.getByLabelText("상태 확인").textContent?.split("|")[0]); // 처음 잔액
        await user.click(screen.getByRole("button", { name: "채팅 모델 베이직챗, 메시지당 1 토큰" })); // 등급 메뉴
        await user.click(screen.getByRole("menuitemradio", { name: /프리미엄챗/ })); // 프리미엄 선택
        expect(screen.getByRole("button", { name: "채팅 모델 프리미엄챗, 메시지당 8 토큰" })).toBeVisible(); // 비용 표시
        await send(user, "프리미엄으로 이야기해 줘"); // 전송
        await waitFor(() => expect(screen.getByLabelText("상태 확인")).toHaveTextContent(`${before - 8}|premium|`)); // 8 토큰 차감·설정 저장
    }); // 검증 종료

    it("빈 입력창의 /는 명령어 메뉴를 열고, 추천답변과 지문 버튼이 입력을 채운다", async () => // 입력 보조 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 렌더
        const input = screen.getByLabelText("메시지"); // 입력창
        await user.click(input); // 초점
        await user.keyboard("/"); // 명령어 열기
        const menu = screen.getByRole("menu", { name: "명령어" }); // 명령어 메뉴
        expect(within(menu).getAllByRole("menuitem")[0]).toHaveFocus(); // 첫 항목 초점
        expect(within(menu).getByRole("menuitem", { name: /\/요약/ })).toBeVisible(); // 요약 명령
        expect(input).toHaveValue(""); // 글자 대신 메뉴
        await user.keyboard("{Escape}"); // 닫기
        expect(screen.queryByRole("menu", { name: "명령어" })).toBeNull(); // 닫힘
        await user.click(screen.getByRole("button", { name: "추천답변" })); // 추천 열기
        const suggestions = within(screen.getByRole("group", { name: "추천 답변" })).getAllByRole("button"); // 추천 목록
        expect(suggestions).toHaveLength(3); // 행동·질문·감정
        const picked = suggestions[1].textContent ?? ""; // 고른 추천
        await user.click(suggestions[1]); // 추천 고르기
        expect(input).toHaveValue(picked); // 입력 채움
        await user.clear(input); // 비우기
        await user.click(screen.getByRole("button", { name: "지문 넣기" })); // 지문 넣기
        expect(input).toHaveValue("**"); // 별표 지문
    }); // 검증 종료

    it("유저 노트·문체·대화 프로필은 대화방 설정에 저장되고 다음 요청에 함께 전달된다", async () => // 설정 전달 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const llm = new CapturingLLMAdapter(); // 기록 어댑터
        renderChat(llm); // 렌더
        const menu = screen.getByRole("region", { name: "채팅방 설정 메뉴" }); // 설정 메뉴
        await user.click(within(menu).getByRole("button", { name: /^유저 노트/ })); // 유저 노트 열기
        const noteDialog = screen.getByRole("dialog", { name: "유저노트" }); // 대화상자
        await user.type(within(noteDialog).getByRole("textbox"), "리안은 내 이름을 성 없이 부른다"); // 노트 입력
        await user.click(within(noteDialog).getByRole("button", { name: "등록" })); // 저장
        await user.click(within(menu).getByRole("button", { name: /^문체 변경/ })); // 문체 열기
        const styleDialog = screen.getByRole("dialog", { name: "문체 변경" }); // 대화상자
        await user.click(within(styleDialog).getByRole("radio", { name: /로맨스/ })); // 로맨스
        expect(within(styleDialog).getByLabelText("문체 미리보기")).toHaveTextContent("로맨스"); // 미리보기 갱신
        await user.click(within(styleDialog).getByRole("button", { name: "확인" })); // 확인
        expect(within(menu).getByRole("button", { name: /^문체 변경,\s*로맨스/ })).toBeVisible(); // 메뉴 값 갱신
        await user.click(within(menu).getByRole("switch", { name: "유저 사칭 방지" })); // 사칭 방지 끄기
        await send(user, "오늘 일정 기억나?"); // 전송
        const options = llm.inputs.at(-1)?.options; // 전달된 설정
        expect(options?.userNote).toBe("리안은 내 이름을 성 없이 부른다"); // 노트 전달
        expect(options?.writingStyle).toBe("romance"); // 문체 전달
        expect(options?.preventImpersonation).toBe(false); // 사칭 방지 전달
        expect(options?.persona?.name).toBeTruthy(); // 기본 대화 프로필 전달
    }); // 검증 종료

    it("5턴마다 요약 메모리가 자동으로 쌓이고 알림이 오며, 목표는 직접 추가할 수 있다", async () => // 요약 메모리 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(new CapturingLLMAdapter()); // 렌더(기존 1턴)
        for (const text of ["하나", "둘", "셋", "넷"]) // 2~5턴
        { // 순회 시작
            await send(user, text); // 전송
        } // 순회 종료
        await waitFor(() => expect(screen.getByLabelText("상태 확인")).toHaveTextContent(/\|relation,short\|1$/)); // 단기 기억·관계도와 알림
        const menu = screen.getByRole("region", { name: "채팅방 설정 메뉴" }); // 설정 메뉴
        await user.click(within(menu).getByRole("button", { name: /^요약 메모리,\s*2개/ })); // 메모리 열기
        const dialog = screen.getByRole("dialog", { name: "요약 메모리" }); // 대화상자
        await user.click(within(dialog).getByRole("tab", { name: "단기 기억" })); // 단기 기억
        expect(within(dialog).getByText(/도서관에서 오래 이야기를/)).toBeVisible(); // 요약 내용
        await user.click(within(dialog).getByRole("tab", { name: "목표" })); // 목표 탭
        await user.click(within(dialog).getByRole("button", { name: "추가" })); // 추가 열기
        await user.type(within(dialog).getByRole("textbox", { name: /목표 추가/ }), "리안과 함께 금서를 찾는다"); // 목표 입력
        await user.click(within(dialog).getByRole("button", { name: "등록" })); // 등록
        expect(within(dialog).getByText("리안과 함께 금서를 찾는다")).toBeVisible(); // 목록 반영
        expect(within(dialog).getByText("총 1개")).toBeVisible(); // 개수
        await waitFor(() => expect(screen.getByLabelText("상태 확인")).toHaveTextContent(/goal,relation,short/)); // 저장
    }); // 검증 종료

    it("채팅 다크 모드와 글꼴 크기는 채팅 화면에 바로 반영된다", async () => // 화면 설정 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 렌더
        const main = screen.getByRole("main"); // 채팅 본문
        expect(main).toHaveAttribute("data-chat-theme", "light"); // 기본 밝게
        await user.click(screen.getByRole("switch", { name: "채팅 다크 모드" })); // 다크 모드
        expect(main).toHaveAttribute("data-chat-theme", "dark"); // 어둡게
        await user.click(screen.getByRole("button", { name: /^글꼴/ })); // 글꼴 열기
        const dialog = screen.getByRole("dialog", { name: "글꼴" }); // 대화상자
        await user.click(within(dialog).getByRole("radio", { name: /크게/ })); // 큰 글자
        await user.click(within(dialog).getByRole("button", { name: /확인|저장/ })); // 저장
        expect(main.style.getPropertyValue("--chat-font-size")).not.toBe("1rem"); // 크기 반영
    }); // 검증 종료

    it("Ctrl+/로 단축키 안내를 열고 Esc로 닫으면 초점이 돌아온다", async () => // 단축키 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 렌더
        const input = screen.getByLabelText("메시지"); // 입력창
        await user.click(input); // 초점
        await user.keyboard("{Control>}/{/Control}"); // 단축키 안내
        const dialog = await screen.findByRole("dialog", { name: "키보드 단축키" }); // 안내
        expect(within(dialog).getByText("Enter")).toBeVisible(); // 전송 키 안내
        await user.keyboard("{Escape}"); // 닫기
        expect(screen.queryByRole("dialog", { name: "키보드 단축키" })).toBeNull(); // 닫힘
    }); // 검증 종료

    it("새 대화에서 설정을 바꾸면 먼저 저장해 설정을 잃지 않는다", async () => // 새 대화 설정 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const state = createInitialState(); // 초기 상태
        state.conversations = state.conversations.filter((item) => item.characterId !== "rian"); // 리안 대화 없음
        state.conversationVersions = state.conversationVersions.filter((item) => item.conversationId !== "conversation-rian"); // 버전 제거
        state.messages = state.messages.filter((item) => item.conversationId !== "conversation-rian"); // 메시지 제거
        renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><NewConversationProbe /></>, state); // 새 대화
        expect(screen.getByLabelText("리안 대화 수")).toHaveTextContent("0|"); // 아직 저장 전
        await user.click(screen.getByRole("button", { name: /채팅 모델 베이직챗/ })); // 등급 메뉴
        await user.click(screen.getByRole("menuitemradio", { name: /플러스챗/ })); // 플러스
        await waitFor(() => expect(screen.getByLabelText("리안 대화 수")).toHaveTextContent("1|plus")); // 저장과 설정 반영
    }); // 검증 종료
}); // 묶음 종료

function NewConversationProbe() // 새 대화 저장 확인
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const conversations = state.conversations.filter((item) => item.characterId === "rian"); // 리안 대화
    return <output aria-label="리안 대화 수">{conversations.length}|{conversations[0]?.settings.tier ?? ""}</output>; // 개수·등급
} // 함수 종료
