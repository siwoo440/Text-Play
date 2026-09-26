import type { AppState, Message } from "@/features/core/types"; // 앱 타입
import type { ImageGenerationAdapter } from "@/lib/adapters/image-generation-adapter"; // 이미지 계약
import type { LLMAdapter } from "@/lib/adapters/llm-adapter"; // 대화 계약
import { evaluateStory } from "@/lib/story/story-engine"; // 스토리 판정
import { trySpend } from "@/lib/story/token-policy"; // 토큰 정책

export type SendResult = { ok: true } | { ok: false; reason: "empty" | "busy" | "insufficient-token" | "missing-conversation" | "service-error" }; // 전송 결과
export type SceneResult = { ok: true; path: string } | { ok: false; reason: "busy" | "insufficient-token" | "missing-conversation" }; // 장면 결과

interface ChatControllerOptions // 제어기 설정
{ // 구조 시작
    state: AppState; // 초기 상태
    conversationId: string; // 대화 식별자
    llm: LLMAdapter; // 대화 어댑터
    images: ImageGenerationAdapter; // 이미지 어댑터
} // 구조 종료

export class ChatController // 채팅 제어기
{ // 클래스 시작
    private state: AppState; // 현재 상태
    private busy = false; // 응답 상태
    private sequence = 0; // 메시지 순서

    public constructor(private readonly options: ChatControllerOptions) // 생성자
    { // 생성자 시작
        this.state = structuredClone(options.state); // 상태 복사
    } // 생성자 종료

    public snapshot(): AppState // 상태 스냅샷
    { // 함수 시작
        return structuredClone(this.state); // 복사 상태 반환
    } // 함수 종료

    public getMessages(): Message[] // 메시지 조회
    { // 함수 시작
        return this.state.messages.filter((message) => message.conversationId === this.options.conversationId).map((message) => ({ ...message })); // 대화 메시지 반환
    } // 함수 종료

    public isBusy(): boolean // 응답 상태 조회
    { // 함수 시작
        return this.busy; // 응답 상태 반환
    } // 함수 종료

    private nextId(role: "user" | "assistant"): string // 메시지 식별자 생성
    { // 함수 시작
        this.sequence += 1; // 순서 증가
        return `${this.options.conversationId}-${role}-${this.sequence}`; // 식별자 반환
    } // 함수 종료

    public async sendMessage(text: string): Promise<SendResult> // 메시지 전송
    { // 함수 시작
        const content = text.trim(); // 입력 정리
        if (content.length === 0) // 빈 입력 판정
        { // 조건 시작
            return { ok: false, reason: "empty" }; // 빈 입력 반환
        } // 조건 종료
        if (this.busy) // 응답 중 판정
        { // 조건 시작
            return { ok: false, reason: "busy" }; // 중복 거절
        } // 조건 종료
        const conversation = this.state.conversations.find((item) => item.id === this.options.conversationId); // 대화 조회
        if (conversation === undefined) // 대화 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 대화 오류
        } // 조건 종료
        const confirmedState = structuredClone(this.state); // 확정 상태 보존
        const spending = trySpend(this.state.wallet, "chat"); // 토큰 차감 시도
        if (!spending.ok) // 잔액 부족 판정
        { // 조건 시작
            return { ok: false, reason: "insufficient-token" }; // 부족 반환
        } // 조건 종료
        this.busy = true; // 응답 잠금
        try // 응답 처리
        { // 시도 시작
            const now = new Date().toISOString(); // 현재 시각
            const userMessage: Message = { id: this.nextId("user"), conversationId: conversation.id, role: "user", content, emotion: null, sceneEvent: null, createdAt: now }; // 사용자 메시지
            this.state = { ...this.state, wallet: spending.wallet, messages: [...this.state.messages, userMessage] }; // 사용자 상태 반영
            let reply = ""; // 응답 누적
            const character = this.state.characters.find((item) => item.id === conversation.characterId); // 캐릭터 조회
            if (character === undefined) // 캐릭터 부재 판정
            { // 조건 시작
                return { ok: false, reason: "missing-conversation" }; // 연결 오류
            } // 조건 종료
            for await (const chunk of this.options.llm.streamReply({ character, conversation, messages: this.getMessages() })) // 응답 스트림
            { // 순회 시작
                reply += chunk; // 응답 누적
            } // 순회 종료
            const userMessageCount = this.getMessages().filter((message) => message.role === "user").length; // 사용자 메시지 수
            const story = evaluateStory({ conversation, userMessage: content, userMessageCount }); // 스토리 판정
            let currentScene = conversation.currentScene; // 현재 장면
            let sceneEvent: string | null = null; // 장면 사건
            if (story.importantEvent) // 중요 사건 판정
            { // 조건 시작
                const imageSpending = trySpend(this.state.wallet, "auto-image"); // 이미지 토큰 차감
                if (imageSpending.ok) // 이미지 생성 가능
                { // 가능 시작
                    const scene = await this.options.images.generateScene({ sceneId: story.sceneId }); // Mock 장면 생성
                    this.state = { ...this.state, wallet: imageSpending.wallet }; // 이미지 토큰 반영
                    currentScene = scene.path; // 장면 경로 반영
                    sceneEvent = story.sceneId; // 사건 기록
                } // 가능 종료
            } // 조건 종료
            const assistantMessage: Message = { id: this.nextId("assistant"), conversationId: conversation.id, role: "assistant", content: reply, emotion: story.emotion, sceneEvent, createdAt: new Date().toISOString() }; // 캐릭터 메시지
            const updatedConversation = { ...conversation, relationshipLevel: story.relationshipLevel, relationshipStage: story.relationshipStage, emotion: story.emotion, currentScene, lastMessage: reply, updatedAt: assistantMessage.createdAt }; // 대화 갱신
            this.state = { ...this.state, messages: [...this.state.messages, assistantMessage], conversations: this.state.conversations.map((item) => item.id === conversation.id ? updatedConversation : item) }; // 응답 상태 반영
            return { ok: true }; // 성공 반환
        } // 시도 종료
        catch // 서비스 오류 처리
        { // 오류 시작
            this.state = confirmedState; // 확정 상태 복구
            return { ok: false, reason: "service-error" }; // 서비스 오류 반환
        } // 오류 종료
        finally // 잠금 해제
        { // 종료 시작
            this.busy = false; // 응답 잠금 해제
        } // 종료 끝
    } // 함수 종료

    public async generateManualScene(): Promise<SceneResult> // 수동 장면 생성
    { // 함수 시작
        if (this.busy) // 응답 중 판정
        { // 조건 시작
            return { ok: false, reason: "busy" }; // 중복 거절
        } // 조건 종료
        const conversation = this.state.conversations.find((item) => item.id === this.options.conversationId); // 대화 조회
        if (conversation === undefined) // 대화 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 대화 오류
        } // 조건 종료
        const spending = trySpend(this.state.wallet, "manual-image"); // 이미지 차감
        if (!spending.ok) // 잔액 부족
        { // 조건 시작
            return { ok: false, reason: "insufficient-token" }; // 부족 반환
        } // 조건 종료
        const scene = await this.options.images.generateScene({ sceneId: "fallback" }); // 장면 생성
        const updatedConversation = { ...conversation, currentScene: scene.path, updatedAt: new Date().toISOString() }; // 대화 갱신
        this.state = { ...this.state, wallet: spending.wallet, conversations: this.state.conversations.map((item) => item.id === conversation.id ? updatedConversation : item) }; // 상태 반영
        return { ok: true, path: scene.path }; // 성공 반환
    } // 함수 종료
} // 클래스 종료
