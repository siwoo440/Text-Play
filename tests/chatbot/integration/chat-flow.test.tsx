import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import type { ChatProgress } from "@chatbot/features/chat/chat-controller"; // 진행 상태 타입
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { CHAT_MESSAGE_MAX_LENGTH, CHAT_VERSION_LIMIT, createVersionFork } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 함수
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 생성
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지 만들기
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import type { LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 어댑터 타입
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { makeController } from "@chatbot/test/chat-fixtures"; // 채팅 제어 생성
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

const routerReplace = vi.hoisted(() => vi.fn()); // 주소 교체 기록

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: routerReplace }), // 주소 교체 제공
})); // 대체 종료

function VersionStateProbe() // 버전 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    const conversation = state.conversations.find((item) => item.id === "conversation-rian"); // 리안 대화 조회
    const versions = state.conversationVersions.filter((version) => version.conversationId === "conversation-rian"); // 리안 버전 조회
    return <output aria-label="리안 버전 상태">{versions.length}:{conversation?.currentVersionId}:{state.wallet.balance}</output>; // 버전 상태 반환
} // 함수 종료

class ControlledLLMAdapter implements LLMAdapter // 제어형 대화 어댑터
{ // 클래스 시작
    private readonly waiting: Promise<void>; // 대기 약속
    private continueReply: () => void = () => undefined; // 재개 함수

    public constructor() // 생성자
    { // 생성자 시작
        this.waiting = new Promise((resolve) => // 대기 약속 생성
        { // 약속 시작
            this.continueReply = resolve; // 재개 함수 저장
        }); // 약속 종료
    } // 생성자 종료

    public continue(): void // 응답 재개
    { // 함수 시작
        this.continueReply(); // 대기 해제
    } // 함수 종료

    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        void _input; // 입력 사용 표시
        yield "첫 조각"; // 첫 응답 조각
        await this.waiting; // 다음 조각 대기
        yield " 두 번째 조각"; // 둘째 응답 조각
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

class CapturingLLMAdapter implements LLMAdapter // 입력 기록 대화 어댑터
{ // 클래스 시작
    public lastInput: LLMInput | null = null; // 최근 입력 기록

    public async *streamReply(input: LLMInput): AsyncIterable<string> // 응답 스트림
    { // 함수 시작
        this.lastInput = input; // 입력 저장
        yield "분기 시점 응답"; // 테스트 응답
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

class FailingLLMAdapter implements LLMAdapter // 실패 대화 어댑터
{ // 클래스 시작
    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 실패 응답 스트림
    { // 함수 시작
        void _input; // 입력 사용 표시
        await Promise.resolve(); // 비동기 경계
        throw new Error("테스트 응답 실패"); // 응답 실패 발생
        yield ""; // 생성기 형식 유지
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

class AbortAwareLLMAdapter implements LLMAdapter // 중단 가능 대화 어댑터
{ // 클래스 시작
    public readonly firstChunkReached: Promise<void>; // 첫 조각 도착 약속
    private markFirstChunk: () => void = () => undefined; // 첫 조각 알림

    public constructor() // 생성자
    { // 생성자 시작
        this.firstChunkReached = new Promise((resolve) => // 도착 약속 생성
        { // 약속 시작
            this.markFirstChunk = resolve; // 도착 알림 저장
        }); // 약속 종료
    } // 생성자 종료

    public async *streamReply(_input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 중단 가능 스트림
    { // 함수 시작
        void _input; // 입력 사용 표시
        yield "중단 전 조각"; // 첫 응답 조각
        this.markFirstChunk(); // 첫 조각 알림
        await new Promise<void>((_resolve, reject) => // 중단 신호 대기
        { // 약속 시작
            signal?.addEventListener("abort", () => // 중단 감지
            { // 감지 시작
                reject(new DOMException("응답 중단", "AbortError")); // 중단 오류 반환
            }, { once: true }); // 일회 감지
        }); // 약속 종료
        yield " 중단 후 조각"; // 후속 응답 조각
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

class IgnoringAbortLLMAdapter implements LLMAdapter // 중단 무시 대화 어댑터
{ // 클래스 시작
    public readonly firstChunkReached: Promise<void>; // 첫 조각 도착 약속
    private readonly waiting: Promise<void>; // 후속 조각 대기 약속
    private markFirstChunk: () => void = () => undefined; // 첫 조각 알림
    private continueReply: () => void = () => undefined; // 응답 재개 함수

    public constructor() // 생성자
    { // 생성자 시작
        this.firstChunkReached = new Promise((resolve) => // 도착 약속 생성
        { // 약속 시작
            this.markFirstChunk = resolve; // 도착 알림 저장
        }); // 약속 종료
        this.waiting = new Promise((resolve) => // 대기 약속 생성
        { // 약속 시작
            this.continueReply = resolve; // 재개 함수 저장
        }); // 약속 종료
    } // 생성자 종료

    public continue(): void // 응답 재개
    { // 함수 시작
        this.continueReply(); // 대기 해제
    } // 함수 종료

    public async *streamReply(_input: LLMInput, _signal?: AbortSignal): AsyncIterable<string> // 중단 무시 스트림
    { // 함수 시작
        void _input; // 입력 사용 표시
        void _signal; // 중단 신호 무시 표시
        yield "무시 전 조각"; // 첫 응답 조각
        this.markFirstChunk(); // 첫 조각 알림
        await this.waiting; // 후속 조각 대기
        yield " 무시 후 조각"; // 후속 응답 조각
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

class RetryLLMAdapter implements LLMAdapter // 재시도 대화 어댑터
{ // 클래스 시작
    private attempt = 0; // 요청 횟수

    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 재시도 스트림
    { // 함수 시작
        void _input; // 입력 사용 표시
        this.attempt += 1; // 요청 횟수 증가
        if (this.attempt === 1) // 첫 요청 판정
        { // 조건 시작
            throw new Error("첫 요청 실패"); // 첫 요청 실패
        } // 조건 종료
        yield "재시도 성공"; // 재시도 응답
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

class RegenerateLLMAdapter implements LLMAdapter // 다시 생성 대화 어댑터
{ // 클래스 시작
    private attempt = 0; // 요청 횟수

    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 다시 생성 스트림
    { // 함수 시작
        void _input; // 입력 사용 표시
        this.attempt += 1; // 요청 횟수 증가
        yield this.attempt === 1 ? "첫 번째 응답" : "교체된 응답"; // 순서별 응답
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 입력 사용 표시
        return Promise.resolve("테스트 요약"); // 요약 반환
    } // 함수 종료
} // 클래스 종료

describe("채팅 흐름", () => // 채팅 묶음
{ // 묶음 시작
    it("초기 대화 버전을 복원하고 버전 전환 주소를 갱신한다", async () => // 주소 복원 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const baseState = createInitialState(); // 초기 상태 생성
        const baseConversation = baseState.conversations[0]; // 기준 대화 조회
        const baseVersion = baseState.conversationVersions.find((version) => version.id === baseConversation.currentVersionId)!; // 기준 버전 조회
        const baseMessage = baseState.messages.find((message) => message.conversationId === baseConversation.id && message.role === "user")!; // 수정 메시지 조회
        const fork = createVersionFork(baseState, { conversationId: baseConversation.id, baseVersionId: baseConversation.currentVersionId, targetMessageId: baseMessage.id, content: "주소 복원용 수정", assistantMessage: { id: "message-route-reply", role: "assistant", content: "주소 복원 응답", emotion: baseVersion.emotion, sceneEvent: null, createdAt: "2026-09-29T13:00:00.000Z" }, versionState: { relationshipLevel: baseVersion.relationshipLevel, relationshipStage: baseVersion.relationshipStage, emotion: baseVersion.emotion, currentScene: baseVersion.currentScene, lastMessage: "주소 복원 응답" }, now: "2026-09-29T13:00:00.000Z" }); // 수정 버전 생성
        renderWithApp(<ChatScreen characterId="rian" initialConversationId={baseConversation.id} initialVersionId={fork.version.id} />, fork.state); // 수정 버전 렌더
        expect(await screen.findByLabelText("대화 버전 2/2")).toBeInTheDocument(); // 초기 버전 확인
        await user.click(screen.getByRole("button", { name: "이전 대화 버전" })); // 원본 버전 이동
        expect(routerReplace).toHaveBeenLastCalledWith(`/chat/rian?conversation=${baseConversation.id}&version=${baseConversation.currentVersionId}`, { scroll: false }); // 주소 변경 확인
    }); // 검증 종료
    it("응답 대기 중 두 번째 전송을 거절한다", async () => // 중복 전송 검증
    { // 검증 시작
        const controller = makeController({ balance: 100, replyDelayMs: 20 }); // 제어기 생성
        const first = controller.sendMessage("첫 메시지"); // 첫 전송
        const second = await controller.sendMessage("중복 메시지"); // 중복 전송
        await first; // 첫 응답 대기
        expect(second).toEqual({ ok: false, reason: "busy" }); // 거절 결과
        expect(controller.getMessages().filter((message) => message.role === "user")).toHaveLength(2); // 기존 한 건과 새 한 건
    }); // 검증 종료

    it("토큰 부족 시 어떤 대화 상태도 바꾸지 않는다", async () => // 원자성 검증
    { // 검증 시작
        const controller = makeController({ balance: 0, replyDelayMs: 0 }); // 빈 지갑 제어기
        const before = controller.snapshot(); // 변경 전 상태
        const result = await controller.sendMessage("안녕"); // 전송 시도
        expect(result).toEqual({ ok: false, reason: "insufficient-token" }); // 부족 결과
        expect(controller.snapshot()).toEqual(before); // 전체 상태 불변
    }); // 검증 종료

    it("응답 조각마다 하나의 임시 메시지를 갱신한다", async () => // 진행 상태 검증
    { // 검증 시작
        const controller = makeController({ balance: 100, replyDelayMs: 0 }); // 제어기 생성
        const beforeCount = controller.getMessages().filter((message) => message.role === "assistant").length; // 기존 응답 수
        const progress: ChatProgress[] = []; // 진행 상태 목록
        const result = await controller.sendMessage("스트리밍 확인", (update) => progress.push(update)); // 진행 콜백 전송
        const assistantProgress = progress.filter((update) => update.phase === "assistant"); // 응답 진행 목록
        const messageIds = new Set(assistantProgress.map((update) => update.messageId)); // 응답 식별자 목록
        const contents = assistantProgress.map((update) => update.state.messages.find((message) => message.id === update.messageId)?.content); // 진행 내용 목록
        const finalMessages = controller.getMessages().filter((message) => message.role === "assistant"); // 최종 응답 목록
        expect(result).toEqual({ ok: true }); // 전송 성공 확인
        expect(contents[0]).toBe(""); // 빈 임시 응답 확인
        expect(contents.length).toBeGreaterThan(2); // 여러 조각 확인
        expect(messageIds.size).toBe(1); // 단일 메시지 확인
        expect(finalMessages).toHaveLength(beforeCount + 1); // 응답 한 건 추가 확인
        expect(contents.at(-1)).toBe(finalMessages.at(-1)?.content); // 최종 내용 일치 확인
    }); // 검증 종료

    it("응답이 끝나기 전에 부분 문구를 화면에 표시한다", async () => // 화면 스트리밍 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const llm = new ControlledLLMAdapter(); // 제어형 대화 생성
        renderWithApp(<ChatScreen characterId="rian" llm={llm} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        await user.type(screen.getByLabelText("메시지"), "부분 응답 확인"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 메시지 전송
        expect(await screen.findByText("첫 조각")).toBeInTheDocument(); // 첫 조각 표시 확인
        expect(screen.getByRole("list", { name: "대화 메시지" })).toHaveAttribute("aria-busy", "true"); // 응답 중 상태 확인
        llm.continue(); // 응답 재개
        expect(await screen.findByText("첫 조각 두 번째 조각")).toBeInTheDocument(); // 최종 응답 확인
        await waitFor(() => expect(screen.getByRole("list", { name: "대화 메시지" })).toHaveAttribute("aria-busy", "false")); // 완료 상태 확인
    }); // 검증 종료

    it("응답 실패 후 입력 잠금과 스트리밍 상태를 해제한다", async () => // 실패 복구 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<ChatScreen characterId="rian" llm={new FailingLLMAdapter()} images={new MockImageAdapter()} />); // 실패 화면 렌더
        await user.type(screen.getByLabelText("메시지"), "실패 응답 확인"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 메시지 전송
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("응답을 받지 못했습니다. 다시 시도해 주세요.")); // 실패 안내 확인
        expect(screen.getByLabelText("메시지")).toBeEnabled(); // 입력 잠금 해제 확인
        expect(screen.getByRole("list", { name: "대화 메시지" })).toHaveAttribute("aria-busy", "false"); // 스트리밍 해제 확인
    }); // 검증 종료

    it("응답 중단 시 후속 조각을 차단하고 부분 응답을 유지한다", async () => // 응답 중단 검증
    { // 검증 시작
        const adapter = new AbortAwareLLMAdapter(); // 중단 가능 어댑터
        const state = createInitialState(); // 초기 상태 생성
        const initialBalance = state.wallet.balance; // 초기 잔액 저장
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: adapter, images: new MockImageAdapter() }); // 제어기 생성
        const request = controller.sendMessage("중단 대상 메시지"); // 응답 요청
        await adapter.firstChunkReached; // 첫 조각 대기
        const cancelled = controller.cancelReply(); // 응답 중단 시도
        const result = await request; // 중단 결과 대기
        const lastMessage = controller.getMessages().at(-1); // 마지막 메시지 조회
        expect(cancelled).toBe(true); // 중단 요청 확인
        expect(result).toEqual({ ok: false, reason: "cancelled" }); // 중단 결과 확인
        expect(lastMessage?.content).toBe("중단 전 조각"); // 부분 응답 유지 확인
        expect(controller.isBusy()).toBe(false); // 응답 잠금 해제 확인
        expect(controller.snapshot().wallet.balance).toBe(initialBalance - 1); // 대화 비용 유지 확인
    }); // 검증 종료

    it("어댑터가 중단 신호를 무시해도 즉시 잠금을 풀고 후속 조각을 차단한다", async () => // 제어기 중단 보장 검증
    { // 검증 시작
        const adapter = new IgnoringAbortLLMAdapter(); // 중단 무시 어댑터
        const state = createInitialState(); // 초기 상태 생성
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: adapter, images: new MockImageAdapter() }); // 제어기 생성
        const request = controller.sendMessage("중단 무시 대상"); // 응답 요청
        await adapter.firstChunkReached; // 첫 조각 대기
        controller.cancelReply(); // 응답 중단
        const earlyResult = await Promise.race([request, new Promise<"waiting">((resolve) => setTimeout(() => resolve("waiting"), 20))]); // 즉시 완료 경쟁
        adapter.continue(); // 남은 어댑터 정리
        await request; // 요청 정리 대기
        expect(earlyResult).toEqual({ ok: false, reason: "cancelled" }); // 즉시 중단 결과 확인
        expect(controller.getMessages().at(-1)?.content).toBe("무시 전 조각"); // 후속 조각 차단 확인
        expect(controller.isBusy()).toBe(false); // 응답 잠금 해제 확인
    }); // 검증 종료

    it("실패한 응답을 사용자 메시지 중복 없이 다시 시도한다", async () => // 재시도 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<ChatScreen characterId="rian" llm={new RetryLLMAdapter()} images={new MockImageAdapter()} />); // 재시도 화면 렌더
        await user.type(screen.getByLabelText("메시지"), "재시도 대상 메시지"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 첫 요청 전송
        expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument(); // 재시도 버튼 확인
        await user.click(screen.getByRole("button", { name: "다시 시도" })); // 재시도 실행
        expect(await screen.findByText("재시도 성공")).toBeInTheDocument(); // 재시도 응답 확인
        expect(screen.getAllByText("재시도 대상 메시지")).toHaveLength(1); // 사용자 메시지 단일 확인
        expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument(); // 재시도 버튼 해제 확인
    }); // 검증 종료

    it("실패와 재시도 비용을 각각 차감하고 스토리는 성공 시 한 번 반영한다", async () => // 재시도 비용 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        state.characters[0].statusTemplate.stats[0] = { ...state.characters[0].statusTemplate.stats[0], mode: "rule", perTurn: 1, rules: [] }; // 관계 스탯(호감도)을 매 턴 +1 규칙으로
        const initialBalance = state.wallet.balance; // 초기 잔액 저장
        const conversation = state.conversations.find((item) => item.id === "conversation-rian"); // 초기 대화 조회
        const initialRelationship = state.conversationVersions.find((item) => item.id === conversation?.currentVersionId)?.relationshipLevel ?? 0; // 초기 관계 저장
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: new RetryLLMAdapter(), images: new MockImageAdapter() }); // 재시도 제어기 생성
        await expect(controller.sendMessage("비용 재시도 대상")).rejects.toThrow("첫 요청 실패"); // 첫 요청 실패 확인
        expect(controller.snapshot().wallet.balance).toBe(initialBalance - 1); // 실패 비용 확인
        expect(controller.snapshot().conversationVersions.find((item) => item.id === conversation?.currentVersionId)?.relationshipLevel).toBe(initialRelationship); // 실패 관계 유지 확인
        await expect(controller.regenerateLastReply()).resolves.toEqual({ ok: true }); // 재시도 성공 확인
        expect(controller.snapshot().wallet.balance).toBe(initialBalance - 2); // 재시도 비용 확인
        expect(controller.snapshot().conversationVersions.find((item) => item.id === conversation?.currentVersionId)?.relationshipLevel).toBe(initialRelationship + 1); // 관계 단일 반영 확인
    }); // 검증 종료

    it("완료된 마지막 응답을 새 메시지 추가 없이 다시 생성한다", async () => // 다시 생성 검증
    { // 검증 시작
        const adapter = new RegenerateLLMAdapter(); // 다시 생성 어댑터
        const state = createInitialState(); // 초기 상태 생성
        const initialBalance = state.wallet.balance; // 초기 잔액 저장
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: adapter, images: new MockImageAdapter() }); // 제어기 생성
        await controller.sendMessage("다시 생성 대상 메시지"); // 첫 응답 생성
        const afterFirst = controller.getMessages(); // 첫 응답 상태
        const result = await controller.regenerateLastReply(); // 마지막 응답 다시 생성
        const afterRepeat = controller.getMessages(); // 다시 생성 상태
        expect(result).toEqual({ ok: true }); // 다시 생성 성공 확인
        expect(afterRepeat.filter((message) => message.role === "user")).toHaveLength(afterFirst.filter((message) => message.role === "user").length); // 사용자 메시지 수 유지 확인
        expect(afterRepeat.filter((message) => message.role === "assistant")).toHaveLength(afterFirst.filter((message) => message.role === "assistant").length); // 응답 메시지 수 유지 확인
        expect(afterRepeat.at(-1)?.content).toBe("교체된 응답"); // 응답 교체 확인
        expect(controller.snapshot().wallet.balance).toBe(initialBalance - 2); // 두 요청 비용 확인
    }); // 검증 종료

    it("완료된 응답의 다시 생성 버튼으로 화면 메시지를 교체한다", async () => // 다시 생성 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<ChatScreen characterId="rian" llm={new RegenerateLLMAdapter()} images={new MockImageAdapter()} />); // 다시 생성 화면 렌더
        await user.type(screen.getByLabelText("메시지"), "화면 다시 생성 대상"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 첫 요청 전송
        expect(await screen.findByText("첫 번째 응답")).toBeInTheDocument(); // 첫 응답 확인
        await user.click(screen.getByRole("button", { name: "다시 생성" })); // 다시 생성 실행
        expect(await screen.findByText("교체된 응답")).toBeInTheDocument(); // 교체 응답 확인
        expect(screen.queryByText("첫 번째 응답")).not.toBeInTheDocument(); // 이전 응답 제거 확인
        expect(screen.getAllByText("화면 다시 생성 대상")).toHaveLength(1); // 사용자 메시지 단일 확인
    }); // 검증 종료

    it("사용자 메시지가 없는 대화에는 다시 생성 버튼을 표시하지 않는다", () => // 무효 버튼 방지 검증
    { // 검증 시작
        renderWithApp(<ChatScreen characterId="sera" llm={new RegenerateLLMAdapter()} images={new MockImageAdapter()} />); // 응답 전용 대화 렌더
        expect(screen.queryByRole("button", { name: "다시 생성" })).not.toBeInTheDocument(); // 다시 생성 버튼 부재 확인
    }); // 검증 종료

    it("화면에서 응답을 중단하고 입력을 다시 활성화한다", async () => // 중단 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const adapter = new AbortAwareLLMAdapter(); // 중단 가능 어댑터
        renderWithApp(<ChatScreen characterId="rian" llm={adapter} images={new MockImageAdapter()} />); // 중단 화면 렌더
        await user.type(screen.getByLabelText("메시지"), "화면 중단 대상"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 메시지 전송
        await adapter.firstChunkReached; // 첫 조각 대기
        await user.click(screen.getByRole("button", { name: "응답 중단" })); // 응답 중단
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("응답을 중단했습니다."), { timeout: 5_000 }); // 중단 안내 확인
        expect(screen.getByText("중단 전 조각")).toBeInTheDocument(); // 부분 응답 유지 확인
        expect(screen.getByLabelText("메시지")).toBeEnabled(); // 입력 활성화 확인
        expect(screen.getByRole("list", { name: "대화 메시지" })).toHaveAttribute("aria-busy", "false"); // 응답 상태 해제 확인
    }, 10_000); // 검증 종료

    it("수정 응답 성공 뒤에만 새 버전과 토큰 차감을 확정한다", async () => // 수정 원자성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const before = structuredClone(state); // 변경 전 상태 저장
        const target = state.messages.find((message) => message.conversationId === "conversation-rian" && message.role === "user")!; // 수정 대상 조회
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: new MockLLMAdapter({ delayMs: 0, seed: 7 }), images: new MockImageAdapter() }); // 수정 제어기 생성
        const result = await controller.editUserMessage(target.id, "수정한 기록 이야기"); // 메시지 수정
        const after = controller.snapshot(); // 변경 후 상태 조회
        expect(result).toEqual({ ok: true, versionId: expect.any(String) }); // 성공 결과 확인
        expect(after.wallet.balance).toBe(before.wallet.balance - 1); // 성공 비용 확인
        expect(after.conversationVersions).toHaveLength(before.conversationVersions.length + 1); // 버전 추가 확인
        expect(after.messages.filter((message) => message.versionId === target.versionId)).toEqual(before.messages.filter((message) => message.versionId === target.versionId)); // 원본 메시지 유지 확인
        expect(after.messages.some((message) => message.sourceMessageId === target.id && message.content === "수정한 기록 이야기")).toBe(true); // 수정 메시지 확인
    }); // 검증 종료

    it("과거 메시지 수정은 시작 상태부터 분기 시점 관계와 장면을 복원한다", async () => // 분기 시점 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        state.characters[0].statusTemplate.stats[0] = { ...state.characters[0].statusTemplate.stats[0], mode: "rule", perTurn: 1, rules: [] }; // 관계 스탯(호감도)을 매 턴 +1 규칙으로
        const conversation = state.conversations[0]; // 기준 대화 조회
        const version = state.conversationVersions.find((item) => item.id === conversation.currentVersionId)!; // 기준 버전 조회
        version.relationshipLevel = 90; // 이후 관계 상태 적용
        version.relationshipStage = "특별한 사이"; // 이후 관계 단계 적용
        version.currentScene = "/images/scenes/later-scene.svg"; // 이후 장면 적용
        const adapter = new CapturingLLMAdapter(); // 입력 기록 어댑터 생성
        const controller = new ChatController({ state, conversationId: conversation.id, llm: adapter, images: new MockImageAdapter() }); // 제어기 생성
        const target = controller.getMessages().find((message) => message.role === "user")!; // 과거 사용자 메시지 조회
        const result = await controller.editUserMessage(target.id, "분기 시점에서 다시 시작", undefined); // 과거 메시지 수정
        expect(result.ok).toBe(true); // 수정 성공 확인
        const nextConversation = controller.snapshot().conversations.find((item) => item.id === conversation.id)!; // 수정 대화 조회
        const nextVersion = controller.snapshot().conversationVersions.find((item) => item.id === nextConversation.currentVersionId)!; // 수정 버전 조회
        expect(adapter.lastInput?.version.relationshipLevel).toBe(conversation.startSettings.relationshipLevel); // 응답 관계 입력 확인
        expect(adapter.lastInput?.version.currentScene).toBe(conversation.startSettings.scene); // 응답 장면 입력 확인
        expect(nextVersion.relationshipLevel).toBe(conversation.startSettings.relationshipLevel + 1); // 분기 관계 확인
        expect(nextVersion.currentScene).toBe(conversation.startSettings.scene); // 분기 장면 확인
    }); // 검증 종료

    it("빈 값과 같은 문장과 길이 초과와 토큰 부족은 상태를 바꾸지 않는다", async () => // 수정 검증 오류 확인
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const target = state.messages.find((message) => message.conversationId === "conversation-rian" && message.role === "user")!; // 수정 대상 조회
        const controller = new ChatController({ state, conversationId: "conversation-rian", llm: new MockLLMAdapter({ delayMs: 0 }), images: new MockImageAdapter() }); // 수정 제어기 생성
        const before = controller.snapshot(); // 변경 전 상태 저장
        await expect(controller.editUserMessage(target.id, "   ")).resolves.toEqual({ ok: false, reason: "empty" }); // 빈 값 거부 확인
        await expect(controller.editUserMessage(target.id, target.content)).resolves.toEqual({ ok: false, reason: "unchanged" }); // 동일 값 거부 확인
        await expect(controller.editUserMessage(target.id, "가".repeat(CHAT_MESSAGE_MAX_LENGTH + 1))).resolves.toEqual({ ok: false, reason: "too-long" }); // 길이 초과 거부 확인
        expect(controller.snapshot()).toEqual(before); // 검증 실패 상태 불변
        const emptyWallet = createInitialState(); // 빈 지갑 상태 생성
        emptyWallet.wallet.balance = 0; // 잔액 제거
        const poorController = new ChatController({ state: emptyWallet, conversationId: "conversation-rian", llm: new MockLLMAdapter({ delayMs: 0 }), images: new MockImageAdapter() }); // 빈 지갑 제어기 생성
        await expect(poorController.editUserMessage(target.id, "토큰 없는 수정")).resolves.toEqual({ ok: false, reason: "insufficient-token" }); // 토큰 부족 확인
        expect(poorController.snapshot()).toEqual(emptyWallet); // 토큰 부족 상태 불변
    }); // 검증 종료

    it("수정 AI 예외와 사용자 중단은 원본 상태와 토큰을 유지한다", async () => // 수정 실패 원자성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const target = state.messages.find((message) => message.conversationId === "conversation-rian" && message.role === "user")!; // 수정 대상 조회
        const failing = new ChatController({ state, conversationId: "conversation-rian", llm: new FailingLLMAdapter(), images: new MockImageAdapter() }); // 실패 제어기 생성
        await expect(failing.editUserMessage(target.id, "실패할 수정")).rejects.toThrow("테스트 응답 실패"); // AI 실패 확인
        expect(failing.snapshot()).toEqual(state); // AI 실패 상태 불변
        const adapter = new AbortAwareLLMAdapter(); // 중단 어댑터 생성
        const cancelling = new ChatController({ state, conversationId: "conversation-rian", llm: adapter, images: new MockImageAdapter() }); // 중단 제어기 생성
        const request = cancelling.editUserMessage(target.id, "중단할 수정"); // 수정 요청 시작
        await adapter.firstChunkReached; // 첫 조각 대기
        expect(cancelling.cancelReply()).toBe(true); // 중단 실행 확인
        await expect(request).resolves.toEqual({ ok: false, reason: "cancelled" }); // 중단 결과 확인
        expect(cancelling.snapshot()).toEqual(state); // 중단 상태 불변
    }); // 검증 종료

    it("작성 길이 초과와 수정 버전 한도와 응답 중 수정을 거부한다", async () => // 공통 제한 검증
    { // 검증 시작
        const baseState = createInitialState(); // 기준 상태 생성
        const baseConversation = baseState.conversations[0]; // 기준 대화 조회
        const baseVersion = baseState.conversationVersions.find((version) => version.id === baseConversation.currentVersionId)!; // 기준 버전 조회
        const baseTarget = baseState.messages.find((message) => message.versionId === baseVersion.id && message.role === "user")!; // 기준 메시지 조회
        const lengthController = new ChatController({ state: baseState, conversationId: baseConversation.id, llm: new MockLLMAdapter({ delayMs: 0 }), images: new MockImageAdapter() }); // 길이 제어기 생성
        await expect(lengthController.sendMessage("가".repeat(CHAT_MESSAGE_MAX_LENGTH + 1))).resolves.toEqual({ ok: false, reason: "too-long" }); // 작성 길이 거부 확인
        expect(lengthController.snapshot()).toEqual(baseState); // 작성 상태 불변
        let limitedState = baseState; // 제한 상태 생성
        for (let index = 1; index < CHAT_VERSION_LIMIT; index += 1) // 허용 분기 반복
        { // 반복 시작
            limitedState = createVersionFork(limitedState, { conversationId: baseConversation.id, baseVersionId: baseVersion.id, targetMessageId: baseTarget.id, content: `제한 수정 ${index}`, assistantMessage: { id: `limit-assistant-${index}`, role: "assistant", content: `제한 응답 ${index}`, emotion: "관심", sceneEvent: null, createdAt: `2026-09-29T13:${String(index).padStart(2, "0")}:00.000Z` }, versionState: { ...baseVersion, lastMessage: `제한 응답 ${index}` }, now: `2026-09-29T13:${String(index).padStart(2, "0")}:00.000Z` }).state; // 분기 상태 반영
        } // 반복 종료
        const currentVersionId = limitedState.conversations[0].currentVersionId; // 현재 버전 식별자 조회
        const currentTarget = limitedState.messages.find((message) => message.versionId === currentVersionId && message.sourceMessageId === baseTarget.id)!; // 현재 수정 메시지 조회
        const limitedController = new ChatController({ state: limitedState, conversationId: baseConversation.id, llm: new MockLLMAdapter({ delayMs: 0 }), images: new MockImageAdapter() }); // 제한 제어기 생성
        await expect(limitedController.editUserMessage(currentTarget.id, "한도 초과 수정")).resolves.toEqual({ ok: false, reason: "version-limit" }); // 버전 제한 확인
        expect(limitedController.snapshot()).toEqual(limitedState); // 제한 상태 불변
        const waitingAdapter = new ControlledLLMAdapter(); // 대기 어댑터 생성
        const busyController = new ChatController({ state: baseState, conversationId: baseConversation.id, llm: waitingAdapter, images: new MockImageAdapter() }); // 응답 중 제어기 생성
        const sending = busyController.sendMessage("응답 대기"); // 일반 응답 시작
        await waitFor(() => expect(busyController.isBusy()).toBe(true)); // 응답 잠금 대기
        await expect(busyController.editUserMessage(baseTarget.id, "응답 중 수정")).resolves.toEqual({ ok: false, reason: "busy" }); // 응답 중 수정 거부 확인
        waitingAdapter.continue(); // 일반 응답 재개
        await sending; // 일반 응답 완료
    }); // 검증 종료

    it("인라인 수정 뒤 작은 전환기로 원본과 수정 버전을 왕복한다", async () => // 버전 전환 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0, seed: 7 })} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        const originalText = screen.getByText("오늘 기록할 이야기가 많아."); // 원본 메시지 조회
        const originalItem = originalText.closest("li"); // 원본 항목 조회
        if (originalItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("원본 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(originalItem).getByRole("button", { name: "수정" })); // 인라인 수정 시작
        const editor = within(originalItem).getByLabelText("메시지 수정"); // 수정 입력 조회
        await user.clear(editor); // 기존 내용 제거
        await user.type(editor, "버전으로 남길 수정 메시지"); // 수정 내용 입력
        await user.click(within(originalItem).getByRole("button", { name: "수정 전송" })); // 수정 전송
        expect(await screen.findByLabelText("대화 버전 2/2")).toBeInTheDocument(); // 새 버전 표시 확인
        expect(screen.getByText("버전으로 남길 수정 메시지")).toBeVisible(); // 수정 메시지 확인
        await user.click(screen.getByRole("button", { name: "이전 대화 버전" })); // 원본 버전 이동
        expect(await screen.findByLabelText("대화 버전 1/2")).toBeInTheDocument(); // 원본 위치 확인
        expect(screen.getByText("오늘 기록할 이야기가 많아.")).toBeVisible(); // 원본 메시지 확인
        expect(screen.queryByRole("button", { name: "현재 버전 삭제" })).toBeNull(); // 원본 삭제 버튼 부재 확인
        await user.click(screen.getByRole("button", { name: "다음 대화 버전" })); // 수정 버전 이동
        expect(await screen.findByRole("button", { name: "현재 버전 삭제" })).toBeVisible(); // 수정 버전 삭제 버튼 확인
    }); // 검증 종료

    it("메시지 삭제는 확인과 백업 성공 뒤에만 현재 버전에 반영한다", async () => // 안전 삭제 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true); // 삭제 확인 대체
        localStorage.clear(); // 백업 저장소 초기화
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        const targetText = screen.getByText("오늘 기록할 이야기가 많아."); // 삭제 대상 조회
        const targetItem = targetText.closest("li"); // 삭제 항목 조회
        if (targetItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("삭제 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(targetItem).getByRole("button", { name: "삭제" })); // 메시지 삭제 실행
        expect(confirm).toHaveBeenCalled(); // 삭제 확인 호출
        expect(localStorage.getItem("mateverse:v1:backup-history")).toContain("message-delete"); // 선행 백업 확인(백업 이력)
        expect(screen.queryByText("오늘 기록할 이야기가 많아.")).toBeNull(); // 현재 버전 삭제 확인
        confirm.mockRestore(); // 확인 함수 복원
    }); // 검증 종료

    it("백업 실패 시 메시지 삭제를 차단하고 원본을 유지한다", async () => // 백업 실패 삭제 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true); // 삭제 확인 대체
        const repository = { load: () => state, save: () => undefined, createBackup: () => { throw new Error("백업 실패"); } }; // 실패 백업 저장소
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />, state, repository); // 채팅 화면 렌더
        const targetText = screen.getByText("오늘 기록할 이야기가 많아."); // 삭제 대상 조회
        const targetItem = targetText.closest("li"); // 삭제 항목 조회
        if (targetItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("삭제 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(targetItem).getByRole("button", { name: "삭제" })); // 삭제 시도
        expect(screen.getByText("오늘 기록할 이야기가 많아.")).toBeVisible(); // 원본 유지 확인
        expect(screen.getByRole("status")).toHaveTextContent("백업하지 못해 메시지 삭제를 중단했습니다."); // 중단 안내 확인
        confirm.mockRestore(); // 확인 함수 복원
    }); // 검증 종료

    it("버전의 마지막 메시지 삭제를 안내와 함께 차단한다", async () => // 마지막 메시지 삭제 화면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations.find((item) => item.id === "conversation-rian")!; // 리안 대화 조회
        const onlyMessage = state.messages.find((message) => message.versionId === conversation.currentVersionId)!; // 단일 메시지 조회
        state.messages = state.messages.filter((message) => message.versionId !== conversation.currentVersionId || message.id === onlyMessage.id); // 단일 메시지 상태 적용
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true); // 삭제 확인 대체
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />, state); // 단일 메시지 화면 렌더
        const targetItem = screen.getByText(onlyMessage.content).closest("li"); // 삭제 항목 조회
        if (targetItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("마지막 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(targetItem).getByRole("button", { name: "삭제" })); // 마지막 메시지 삭제 시도
        expect(screen.getByText(onlyMessage.content)).toBeVisible(); // 마지막 메시지 유지 확인
        expect(screen.getByRole("status")).toHaveTextContent("대화 버전의 마지막 메시지는 삭제할 수 없습니다."); // 차단 안내 확인
        confirm.mockRestore(); // 확인 함수 복원
    }); // 검증 종료

    it("저장 실패 시 수정 버전과 토큰을 메모리에도 반영하지 않는다", async () => // 저장 실패 원자성 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const repository = // 실패 저장소 생성
        { // 저장소 시작
            load: () => state, // 초기 상태 반환
            save: () => // 저장 실패 함수
            { // 함수 시작
                throw new Error("저장 실패"); // 저장 오류 발생
            }, // 함수 종료
        }; // 저장소 종료
        renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><VersionStateProbe /></>, state, repository); // 채팅 화면 렌더
        const targetItem = screen.getByText("오늘 기록할 이야기가 많아.").closest("li"); // 수정 항목 조회
        if (targetItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("수정 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(targetItem).getByRole("button", { name: "수정" })); // 수정 시작
        await user.clear(within(targetItem).getByLabelText("메시지 수정")); // 기존 내용 제거
        await user.type(within(targetItem).getByLabelText("메시지 수정"), "저장 실패 수정"); // 수정 내용 입력
        await user.click(within(targetItem).getByRole("button", { name: "수정 전송" })); // 수정 전송
        expect(await screen.findByRole("alert")).toHaveTextContent("저장하지 못해 원본 대화를 유지했습니다."); // 실패 안내 확인
        expect(screen.getByLabelText("리안 버전 상태")).toHaveTextContent("1:conversation-rian-version-1:1240"); // 원본 상태 확인
        expect(screen.queryByLabelText(/대화 버전/)).toBeNull(); // 수정 버전 부재 확인
    }); // 검증 종료

    it("수정 분기의 기준 메시지 삭제 뒤 해당 분기를 제거하고 원본으로 복귀한다", async () => // 분기 기준 삭제 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true); // 삭제 확인 대체
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        const originalItem = screen.getByText("오늘 기록할 이야기가 많아.").closest("li"); // 원본 항목 조회
        if (originalItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("원본 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(originalItem).getByRole("button", { name: "수정" })); // 수정 시작
        await user.clear(within(originalItem).getByLabelText("메시지 수정")); // 기존 내용 제거
        await user.type(within(originalItem).getByLabelText("메시지 수정"), "삭제할 분기 기준 메시지"); // 수정 내용 입력
        await user.click(within(originalItem).getByRole("button", { name: "수정 전송" })); // 수정 전송
        const modifiedItem = (await screen.findByText("삭제할 분기 기준 메시지")).closest("li"); // 수정 항목 조회
        if (modifiedItem === null) // 수정 항목 부재 판정
        { // 조건 시작
            throw new Error("수정 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(modifiedItem).getByRole("button", { name: "삭제" })); // 분기 기준 삭제
        expect(await screen.findByText("오늘 기록할 이야기가 많아.")).toBeVisible(); // 원본 메시지 복귀 확인
        expect(screen.queryByLabelText(/대화 버전/)).toBeNull(); // 삭제 분기 전환기 제거 확인
        expect(routerReplace).toHaveBeenLastCalledWith("/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1", { scroll: false }); // 원본 주소 확인
        confirm.mockRestore(); // 확인 함수 복원
    }); // 검증 종료

    it("클립보드 복사 성공과 실패를 데이터 변경 없이 알린다", async () => // 복사 안내 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const writeText = vi.fn().mockResolvedValue(undefined); // 성공 복사 함수 생성
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } }); // 클립보드 대체
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        const targetText = screen.getByText("오늘 기록할 이야기가 많아."); // 복사 대상 조회
        const targetItem = targetText.closest("li"); // 복사 항목 조회
        if (targetItem === null) // 항목 부재 판정
        { // 조건 시작
            throw new Error("복사 메시지 항목 부재"); // 테스트 데이터 오류
        } // 조건 종료
        await user.click(within(targetItem).getByRole("button", { name: "복사" })); // 성공 복사 실행
        expect(await within(targetItem).findByRole("status")).toHaveTextContent("메시지를 복사했습니다."); // 성공 안내 확인
        writeText.mockRejectedValueOnce(new Error("권한 거부")); // 실패 복사 설정
        await user.click(within(targetItem).getByRole("button", { name: "복사" })); // 실패 복사 실행
        expect(await within(targetItem).findByRole("alert")).toHaveTextContent("메시지를 복사하지 못했습니다."); // 실패 안내 확인
        expect(screen.getByText("오늘 기록할 이야기가 많아.")).toBeVisible(); // 메시지 유지 확인
    }); // 검증 종료

    it("내 이미지를 고르면 토큰 없이 마지막 응답 아래 장면 그림으로 붙고 작품 등급보다 높은 이미지는 보이지 않는다", async () => // 내 이미지 장면 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태
        const plain = createGeneratedImage({ prompt: "새벽 도서관 창가", style: "anime", aspect: "landscape", referenceCharacterId: "rian", contentRating: "all" }, "kr", "2026-10-01T00:00:00.000Z", "image-plain"); // 일반 이미지
        const teen = createGeneratedImage({ prompt: "비 오는 교실의 긴장", style: "cinematic", aspect: "landscape", referenceCharacterId: null, contentRating: "teen" }, "kr", "2026-10-01T00:01:00.000Z", "image-teen"); // 15세 이미지
        state.images = [teen, plain]; // 갤러리 준비
        renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><VersionStateProbe /></>, state); // 리안(전체 이용가) 대화
        const panel = screen.getByRole("region", { name: "내 이미지로 장면 바꾸기" }); // 내 이미지 패널
        expect(within(panel).queryByRole("button", { name: "비 오는 교실의 긴장 장면으로" })).toBeNull(); // 15세 이미지 제외
        await user.click(within(panel).getByRole("button", { name: "새벽 도서관 창가 장면으로" })); // 장면 바꾸기
        expect(screen.getByRole("img", { name: "이 장면의 상황 이미지" })).toHaveAttribute("src", plain.src); // 마지막 응답 아래 장면 그림
        expect(within(panel).getByRole("button", { name: "새벽 도서관 창가 장면으로" })).toHaveAttribute("data-current", "true"); // 지금 장면 표시
        expect(screen.getByLabelText("리안 버전 상태")).toHaveTextContent(`:${state.wallet.balance}`); // 토큰 차감 없음
        expect(screen.getByText("내 이미지로 장면을 바꿨습니다.")).toBeVisible(); // 안내 확인
    }); // 검증 종료

    it("채팅 화면에 AI가 만든 허구의 대화라는 안내를 항상 보여 준다", () => // AI 고지 검증
    { // 검증 시작
        renderWithApp(<ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        expect(screen.getByRole("note", { name: "AI 이용 안내" })).toHaveTextContent("AI가 만든 허구의 대화"); // 안내 문구 확인
        expect(screen.getByText("AI", { selector: "[data-ai-badge]" })).toBeInTheDocument(); // AI 표시 확인
    }); // 검증 종료

    it("채팅 중 왼쪽 창에서 바꾼 이름·고정·정렬은 메시지를 보내도 유지된다", async () => // 외부 변경 유지 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><ExternalPanelEditor /></>); // 채팅 화면 렌더
        await user.click(screen.getByRole("button", { name: "왼쪽 창에서 바꾸기" })); // 외부 변경 실행
        await user.type(screen.getByLabelText("메시지"), "이름 유지 확인"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 메시지 전송
        await waitFor(() => expect(screen.getByLabelText("리안 대화방 상태")).toHaveTextContent("외부에서 바꾼 이름|conversation-rian|turns|2")); // 변경 유지와 턴 반영 확인
    }); // 검증 종료
}); // 묶음 종료

function ExternalPanelEditor() // 왼쪽 창 변경 대역
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const conversation = state.conversations.find((item) => item.id === "conversation-rian"); // 리안 대화 조회
    const turns = state.messages.filter((message) => message.conversationId === "conversation-rian" && message.versionId === conversation?.currentVersionId && message.role === "user").length; // 턴 수 계산
    const change = () => // 외부 변경 함수
    { // 함수 시작
        dispatch({ type: "rename-conversation", conversationId: "conversation-rian", title: "외부에서 바꾼 이름" }); // 이름 변경
        dispatch({ type: "toggle-conversation-pin", conversationId: "conversation-rian" }); // 고정
        dispatch({ type: "update-settings", settings: { conversationSort: "turns" } }); // 정렬 변경
    }; // 함수 종료
    return <><button type="button" onClick={change}>왼쪽 창에서 바꾸기</button><output aria-label="리안 대화방 상태">{conversation?.title}|{state.pinnedConversationIds.join(",")}|{state.settings.conversationSort}|{turns}</output></>; // 변경 도구 반환
} // 함수 종료
