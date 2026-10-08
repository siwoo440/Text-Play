import { CHAT_MESSAGE_MAX_LENGTH, CHAT_VERSION_LIMIT, createVersionFork, getConversationVersion, getMessageVersionGroup, getVersionMessages, type VersionStateInput } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 함수
import type { AppState, Character, Conversation, ConversationVersion, Message, StatusSnapshot, StatusTemplate, TokenWallet, TriggeredEvent } from "@chatbot/features/core/types"; // 앱 타입
import type { ImageGenerationAdapter } from "@chatbot/lib/adapters/image-generation-adapter"; // 이미지 계약
import type { LLMAdapter, LLMInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { evaluateStory, resolveRelationshipStage } from "@chatbot/lib/story/story-engine"; // 스토리 판정·관계 단계
import { trySpend, trySpendAmount } from "@chatbot/lib/story/token-policy"; // 토큰 정책
import { buildChatContext, type ChatContext } from "@chatbot/features/chat/chat-context"; // 대화 맥락
import { matchLore, toExamplePrompt, toLorePrompt } from "@chatbot/features/chat/lore-model"; // 설정집·예시 대화
import { getActiveLocale } from "@chatbot/lib/i18n"; // 화면 언어
import { evaluateEvents, getFiredKeys } from "@chatbot/features/chat/event-model"; // 스탯 조건 이벤트
import { getMessageCost, normalizeTierOption } from "@chatbot/features/chat/chat-tiers"; // 메시지 비용·등급 설정 정리
import { fromRelationLevel, getRelationStat, readRelationLevel, toRelationLevel, type RelationBinding } from "@chatbot/features/chat/relation-model"; // 관계 스탯
import { buildStatJudgeInput, currentStatValues, type StatBaseline, type StatChange } from "@chatbot/features/chat/stat-model"; // 스탯 계산
import { composeStatus, getStatusPeople } from "@chatbot/features/chat/status-model"; // 상태창 계산
import { deriveDisplayName } from "@chatbot/features/story/story-model"; // 짧은 이름
import { getTierOption } from "@chatbot/features/chat/chat-tiers"; // 등급별 설정 읽기

export type SendResult = { ok: true } | { ok: false; reason: "empty" | "too-long" | "busy" | "cancelled" | "insufficient-token" | "missing-conversation" | "missing-message" }; // 전송 결과
export type EditMessageResult = { ok: true; versionId: string } | { ok: false; reason: "empty" | "unchanged" | "too-long" | "busy" | "cancelled" | "insufficient-token" | "missing-message" | "version-limit" | "storage-failed" }; // 수정 결과
export type SceneResult = { ok: true; path: string } | { ok: false; reason: "busy" | "insufficient-token" | "missing-conversation" }; // 장면 결과
export type ChatProgressPhase = "user" | "assistant" | "complete"; // 진행 단계

export interface ChatProgress // 채팅 진행 상태
{ // 구조 시작
    state: AppState; // 진행 앱 상태
    phase: ChatProgressPhase; // 진행 단계
    messageId: string; // 대상 메시지 식별자
} // 구조 종료

export type ChatProgressHandler = (progress: ChatProgress) => void; // 진행 상태 처리기

type AttemptStatus = "pending" | "failed" | "cancelled" | "complete"; // 요청 상태

interface ChatAttempt // 채팅 요청 정보
{ // 구조 시작
    userMessageId: string; // 사용자 메시지 식별자
    assistantMessageId: string; // 응답 메시지 식별자
    status: AttemptStatus; // 요청 상태
} // 구조 종료

function replayForkState(conversation: Conversation, baseVersion: ConversationVersion, messages: Message[], relation: RelationBinding | null = null): VersionStateInput // 분기 시점 상태 복원(관계 스탯이 있으면 그 시점 상태창 값)
{ // 함수 시작
    let replayVersion: ConversationVersion = { ...baseVersion, relationshipLevel: conversation.startSettings.relationshipLevel, relationshipStage: conversation.startSettings.relationshipStage, emotion: conversation.startSettings.emotion, currentScene: conversation.startSettings.scene, lastMessage: conversation.startSettings.greeting }; // 시작 상태 생성
    let userMessageCount = 0; // 사용자 메시지 수
    messages.forEach((message) => // 이전 메시지 순회
    { // 순회 시작
        if (message.role === "user") // 사용자 메시지 판정
        { // 사용자 시작
            userMessageCount += 1; // 사용자 메시지 증가
            const story = evaluateStory({ conversation, version: replayVersion, userMessage: message.content, userMessageCount }); // 이전 이야기 재계산
            replayVersion = { ...replayVersion, relationshipLevel: story.relationshipLevel, relationshipStage: story.relationshipStage, emotion: story.emotion, lastMessage: message.content }; // 관계 상태 반영
            return; // 다음 메시지 이동
        } // 사용자 종료
        const relationLevel = relation === null ? null : readRelationLevel(message.status, relation.stat, relation.lead); // 그 응답의 관계 스탯 값
        replayVersion = { ...replayVersion, ...(relationLevel === null ? {} : { relationshipLevel: relationLevel, relationshipStage: resolveRelationshipStage(relationLevel) }), emotion: message.emotion ?? replayVersion.emotion, currentScene: message.scenePath ?? replayVersion.currentScene, lastMessage: message.content }; // 응답 상태 반영
    }); // 순회 종료
    return { relationshipLevel: replayVersion.relationshipLevel, relationshipStage: replayVersion.relationshipStage, emotion: replayVersion.emotion, currentScene: replayVersion.currentScene, lastMessage: replayVersion.lastMessage }; // 분기 상태 반환
} // 함수 종료

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
    private activeAbortController: AbortController | null = null; // 활성 중단 제어기
    private lastAttempt: ChatAttempt | null = null; // 최근 요청 정보
    private context: ChatContext; // 대화방 설정·프로필·메모리 맥락

    public constructor(private readonly options: ChatControllerOptions) // 생성자
    { // 생성자 시작
        this.state = structuredClone(options.state); // 상태 복사
        this.context = buildChatContext(options.state, options.conversationId); // 시작 맥락
    } // 생성자 종료

    public syncWallet(wallet: TokenWallet): void // 요청 직전 전역 지갑 반영(출석·미션으로 받은 토큰)
    { // 함수 시작
        if (!this.busy) // 응답 중이 아닐 때만
        { // 조건 시작
            this.state = { ...this.state, wallet: structuredClone(wallet) }; // 지갑 교체
        } // 조건 종료
    } // 함수 종료

    public setContext(context: ChatContext): void // 요청 직전 최신 맥락 반영(오른쪽 패널 설정)
    { // 함수 시작
        this.context = structuredClone(context); // 맥락 교체
    } // 함수 종료

    private spendChat() // 대화 비용 차감 후보(등급·길이·생각·유저 노트 확장)
    { // 함수 시작
        return trySpendAmount(this.state.wallet, getMessageCost(this.context.settings), "chat"); // 차감 결과
    } // 함수 종료

    private statusTemplateFor(conversation: Conversation, character: Character): StatusTemplate | undefined // 작품 상태창 형식(스토리는 스토리 기준)
    { // 함수 시작
        const story = conversation.mode === "story" ? this.state.stories.find((item) => item.id === conversation.storyId) : undefined; // 연결 스토리
        return story?.statusTemplate ?? character.statusTemplate; // 형식 반환
    } // 함수 종료

    private previousStatus(messages: Message[]): StatusSnapshot | null // 직전 상태창
    { // 함수 시작
        return [...messages].reverse().find((message) => message.role === "assistant" && message.status !== undefined && message.status !== null)?.status ?? null; // 마지막 상태창
    } // 함수 종료

    private relationBinding(conversation: Conversation, character: Character): RelationBinding | null // 대화의 관계 스탯 연결(없으면 예전 관계 수치 방식)
    { // 함수 시작
        const stat = getRelationStat(this.statusTemplateFor(conversation, character)); // 관계 스탯
        const lead = getStatusPeople(conversation, deriveDisplayName(character.name))[0]; // 대표 인물
        return stat === null || lead === undefined ? null : { stat, lead }; // 연결 반환
    } // 함수 종료

    private relationBaselines(conversation: Conversation, character: Character, messages: Message[], levelBeforeTurn: number): StatBaseline[] // 직전 상태창에 관계 스탯 값이 없을 때 이어받을 시작 값
    { // 함수 시작
        const relation = this.relationBinding(conversation, character); // 관계 연결
        if (relation === null || readRelationLevel(this.previousStatus(messages), relation.stat, relation.lead) !== null) // 관계 스탯 없음·직전 값 있음
        { // 조건 시작
            return []; // 기준선 불필요
        } // 조건 종료
        return [{ statId: relation.stat.id, target: relation.lead, value: fromRelationLevel(relation.stat, levelBeforeTurn) }]; // 이번 턴 전 관계 수치에서 시작
    } // 함수 종료

    private async judgeTurnStats(conversation: Conversation, character: Character, messages: Message[], userMessage: string, reply: string, emotion: string, signal: AbortSignal, baselines: StatBaseline[]): Promise<StatChange[]> // AI가 정하는 스탯 변화(실패해도 응답은 유지)
    { // 함수 시작
        const input = buildStatJudgeInput(this.statusTemplateFor(conversation, character), getStatusPeople(conversation, deriveDisplayName(character.name)), this.previousStatus(messages), userMessage, reply, emotion, baselines); // 판단 입력
        if (input.stats.length === 0 || this.options.llm.judgeStats === undefined) // 판단할 스탯 없음
        { // 조건 시작
            return []; // 변화 없음
        } // 조건 종료
        try // 판단 시도
        { // 시도 시작
            const story = conversation.mode === "story" ? this.state.stories.find((item) => item.id === conversation.storyId) : undefined; // 연결 스토리
            const context = { tier: this.context.settings.tier, contentRating: story?.contentRating ?? character.contentRating, userName: this.context.persona?.name ?? "사용자", speakerName: conversation.mode === "story" ? "이야기" : deriveDisplayName(character.name) }; // 실제 AI에 맡길 때 쓰는 문맥
            return await this.options.llm.judgeStats({ ...input, context }, signal); // AI 판단
        } // 시도 종료
        catch // 판단 실패
        { // 실패 시작
            return []; // 규칙만 적용
        } // 실패 종료
    } // 함수 종료

    private composeTurnStatus(conversation: Conversation, character: Character, messages: Message[], userMessage: string, aiChanges: StatChange[], emotion: string, baselines: StatBaseline[]): StatusSnapshot | null // 이번 턴 상태창
    { // 함수 시작
        const story = conversation.mode === "story" ? this.state.stories.find((item) => item.id === conversation.storyId) : undefined; // 연결 스토리
        const template = this.statusTemplateFor(conversation, character); // 상태창 형식
        if (template === undefined || !template.enabled) // 상태창 끔 판정
        { // 조건 시작
            return null; // 상태창 없음
        } // 조건 종료
        const people = getStatusPeople(conversation, deriveDisplayName(character.name)); // 인물
        const turn = messages.filter((message) => message.role === "user").length; // 턴 번호
        return composeStatus({ template, people, previous: this.previousStatus(messages), turn, userMessage, aiChanges, baselines, emotion, tags: story?.tags ?? character.tags, startedAt: conversation.createdAt, seed: conversation.id }); // 상태창 반환
    } // 함수 종료

    private withTurnEvents(conversation: Conversation, character: Character, messages: Message[], status: StatusSnapshot | null): { status: StatusSnapshot | null; events: TriggeredEvent[] } // 이번 턴에 일어난 이벤트를 상태창에 기록(조건이 처음 맞는 턴에 한 번)
    { // 함수 시작
        if (status === null) // 상태창 없음
        { // 조건 시작
            return { status, events: [] }; // 이벤트 없음
        } // 조건 종료
        const story = conversation.mode === "story" ? this.state.stories.find((item) => item.id === conversation.storyId) : undefined; // 연결 스토리
        const people = getStatusPeople(conversation, deriveDisplayName(character.name)); // 인물
        const fired = getFiredKeys(messages.flatMap((message) => message.role === "assistant" && message.status !== undefined && message.status !== null ? [message.status] : [])); // 이 버전에서 이미 일어난 이벤트
        const events = evaluateEvents({ events: (story ?? character).events, stats: this.statusTemplateFor(conversation, character)?.stats ?? [], values: status.stats, turn: status.turn, fired, lead: people[0] ?? deriveDisplayName(character.name) }); // 이벤트 판정
        return { status: events.length === 0 ? status : { ...status, events }, events }; // 기록한 상태창
    } // 함수 종료

    private attachSceneToLatestReply(versionId: string, path: string): void // 현재 버전 마지막 응답에 상황 이미지 붙이기
    { // 함수 시작
        const latest = getVersionMessages(this.state, this.options.conversationId, versionId).filter((message) => message.role === "assistant").at(-1); // 마지막 응답
        if (latest !== undefined) // 응답 존재 판정
        { // 조건 시작
            this.state = { ...this.state, messages: this.state.messages.map((message) => message.id === latest.id ? { ...message, sceneImage: path } : message) }; // 이미지 반영
        } // 조건 종료
    } // 함수 종료

    public snapshot(): AppState // 상태 스냅샷
    { // 함수 시작
        return structuredClone(this.state); // 복사 상태 반환
    } // 함수 종료

    public getMessages(): Message[] // 메시지 조회
    { // 함수 시작
        const version = getConversationVersion(this.state, this.options.conversationId); // 현재 버전 조회
        return version === null ? [] : getVersionMessages(this.state, this.options.conversationId, version.id); // 버전 메시지 반환
    } // 함수 종료

    public isBusy(): boolean // 응답 상태 조회
    { // 함수 시작
        return this.busy; // 응답 상태 반환
    } // 함수 종료

    private nextId(role: "user" | "assistant"): string // 메시지 식별자 생성(화면을 새로 열면 순서가 1부터 다시 시작하므로, 이미 저장된 메시지와 겹치는 번호는 건너뜀)
    { // 함수 시작
        const used = new Set(this.state.messages.map((message) => message.id)); // 이미 쓰고 있는 식별자
        let id = ""; // 새 식별자
        do // 겹치지 않을 때까지 다음 번호로
        { // 반복 시작
            this.sequence += 1; // 순서 증가
            id = `${this.options.conversationId}-${role}-${this.sequence}`; // 후보 식별자
        } // 반복 종료
        while (used.has(id)); // 겹침 확인
        return id; // 식별자 반환
    } // 함수 종료

    private createLLMInput(character: Character, conversation: Conversation, version: ConversationVersion, messages: Message[]): LLMInput // 응답 입력 생성
    { // 함수 시작
        const settings = this.context.settings; // 대화방 설정
        const tierOption = normalizeTierOption(getTierOption(settings.tierOptions, settings.tier)); // 등급별 길이·생각(쓸 수 없는 생각 깊이는 끔)
        const stats = currentStatValues(this.statusTemplateFor(conversation, character), getStatusPeople(conversation, deriveDisplayName(character.name)), this.previousStatus(messages), this.relationBaselines(conversation, character, messages, version.relationshipLevel)).map((item) => ({ name: item.name, target: item.target, value: item.value, min: item.min, max: item.max })); // 지금 스탯 값
        const options = { tier: settings.tier, length: tierOption.length, thinking: tierOption.thinking, writingStyle: settings.writingStyle, preventImpersonation: settings.preventImpersonation, persona: this.context.persona, userNote: settings.userNote, memories: this.context.memories, playGuide: this.context.playGuide, stats, lore: toLorePrompt(matchLore(this.context.lorebook, messages)), examples: toExamplePrompt(this.context.examples), language: getActiveLocale() }; // 응답 조건(설정집은 최근 대화에 키워드가 나온 것만, 답변 언어는 화면 언어)
        if (conversation.mode !== "story") // 캐릭터 모드 판정
        { // 조건 시작
            return { character, conversation, version, messages, options, contentRating: character.contentRating }; // 캐릭터 입력 반환
        } // 조건 종료
        const story = this.state.stories.find((item) => item.id === conversation.storyId); // 연결 스토리
        return { character, conversation, version, messages, options, contentRating: story?.contentRating ?? character.contentRating, story: { title: story?.title ?? conversation.title, synopsis: story?.synopsis ?? "", userRole: story?.userRole ?? "", cast: conversation.storyCast, castNotes: conversation.storyCast.map((member) => { const linked = this.state.characters.find((item) => item.id === member.characterId); return { displayName: member.displayName, personality: linked?.personality ?? "", sample: (member.firstLine.length > 0 ? member.firstLine : linked?.greeting ?? "").slice(0, 160) }; }) } }; // 스토리 입력 반환(등장인물은 시작 시점 묶음, 성격과 말투 예는 연결된 캐릭터에서)
    } // 함수 종료

    private reportProgress(handler: ChatProgressHandler | undefined, phase: ChatProgressPhase, messageId: string): void // 진행 상태 전달
    { // 함수 시작
        handler?.({ state: this.snapshot(), phase, messageId }); // 복사 상태 전달
    } // 함수 종료

    public cancelReply(): boolean // 응답 중단
    { // 함수 시작
        if (!this.busy || this.activeAbortController === null) // 중단 불가 판정
        { // 조건 시작
            return false; // 중단 실패 반환
        } // 조건 종료
        this.activeAbortController.abort(); // 활성 응답 중단
        return true; // 중단 성공 반환
    } // 함수 종료

    private async nextChunk(iterator: AsyncIterator<string>, signal: AbortSignal): Promise<IteratorResult<string>> // 다음 조각 대기
    { // 함수 시작
        if (signal.aborted) // 사전 중단 판정
        { // 조건 시작
            throw new DOMException("응답이 중단되었습니다.", "AbortError"); // 중단 오류 발생
        } // 조건 종료
        return await new Promise<IteratorResult<string>>((resolve, reject) => // 조각과 중단 경쟁
        { // 약속 시작
            const cancel = () => // 중단 처리
            { // 처리 시작
                reject(new DOMException("응답이 중단되었습니다.", "AbortError")); // 중단 오류 반환
            }; // 처리 종료
            signal.addEventListener("abort", cancel, { once: true }); // 중단 감지 등록
            void iterator.next().then((result) => // 다음 조각 처리
            { // 성공 시작
                signal.removeEventListener("abort", cancel); // 중단 감지 해제
                resolve(result); // 조각 반환
            }, (error: unknown) => // 스트림 오류 처리
            { // 실패 시작
                signal.removeEventListener("abort", cancel); // 중단 감지 해제
                reject(error); // 오류 반환
            }); // 조각 요청 종료
        }); // 약속 종료
    } // 함수 종료

    private closeIterator(iterator: AsyncIterator<string>): void // 반복기 정리
    { // 함수 시작
        try // 정리 시도
        { // 시도 시작
            const closing = iterator.return?.(); // 종료 요청
            if (closing !== undefined) // 종료 약속 판정
            { // 조건 시작
                void Promise.resolve(closing).catch(() => undefined); // 종료 오류 무시
            } // 조건 종료
        } // 시도 종료
        catch // 동기 종료 오류 처리
        { // 실패 시작
            return; // 정리 종료
        } // 실패 종료
    } // 함수 종료

    private async generateReply(conversation: Conversation, version: ConversationVersion, character: Character, userMessage: Message, assistantMessageId: string, onProgress: ChatProgressHandler | undefined, applyStory: boolean): Promise<SendResult> // 응답 생성
    { // 함수 시작
        const now = new Date().toISOString(); // 생성 시각
        const previousAssistant = this.state.messages.find((message) => message.id === assistantMessageId); // 기존 응답 조회
        const promptMessages = this.getMessages().filter((message) => message.id !== assistantMessageId); // 응답 입력 메시지
        const pendingAssistantMessage: Message = { id: assistantMessageId, conversationId: conversation.id, versionId: version.id, sourceMessageId: null, role: "assistant", content: "", emotion: previousAssistant?.emotion ?? null, sceneEvent: previousAssistant?.sceneEvent ?? null, scenePath: previousAssistant?.scenePath ?? version.currentScene, createdAt: now }; // 임시 응답 메시지
        const hasAssistant = this.state.messages.some((message) => message.id === assistantMessageId); // 기존 응답 존재 여부
        const messages = hasAssistant ? this.state.messages.map((message) => message.id === assistantMessageId ? pendingAssistantMessage : message) : [...this.state.messages, pendingAssistantMessage]; // 임시 응답 목록
        this.state = { ...this.state, messages }; // 임시 응답 반영
        this.lastAttempt = { userMessageId: userMessage.id, assistantMessageId, status: "pending" }; // 최근 요청 기록
        this.reportProgress(onProgress, "assistant", assistantMessageId); // 빈 응답 진행 전달
        const abortController = new AbortController(); // 요청 중단 제어기
        this.activeAbortController = abortController; // 활성 제어기 저장
        let reply = ""; // 응답 누적
        const iterator = this.options.llm.streamReply(this.createLLMInput(character, conversation, version, promptMessages), abortController.signal)[Symbol.asyncIterator](); // 응답 반복기
        try // 스트림 처리 시도
        { // 시도 시작
            while (true) // 응답 조각 순회
            { // 순회 시작
                const result = await this.nextChunk(iterator, abortController.signal); // 다음 조각 대기
                if (result.done) // 스트림 완료 판정
                { // 조건 시작
                    break; // 순회 종료
                } // 조건 종료
                if (abortController.signal.aborted) // 조각 반영 전 중단 판정
                { // 조건 시작
                    throw new DOMException("응답이 중단되었습니다.", "AbortError"); // 중단 오류 발생
                } // 조건 종료
                const chunk = result.value; // 응답 조각 조회
                reply += chunk; // 응답 누적
                this.state = { ...this.state, messages: this.state.messages.map((message) => message.id === assistantMessageId ? { ...message, content: reply } : message) }; // 부분 응답 반영
                this.reportProgress(onProgress, "assistant", assistantMessageId); // 부분 응답 전달
            } // 순회 종료
        } // 시도 종료
        catch (error) // 스트림 오류 처리
        { // 실패 시작
            if (abortController.signal.aborted) // 사용자 중단 판정
            { // 조건 시작
                this.closeIterator(iterator); // 스트림 반복기 정리
                this.lastAttempt = { userMessageId: userMessage.id, assistantMessageId, status: "cancelled" }; // 중단 상태 기록
                return { ok: false, reason: "cancelled" }; // 중단 결과 반환
            } // 조건 종료
            this.closeIterator(iterator); // 오류 반복기 정리
            this.lastAttempt = { userMessageId: userMessage.id, assistantMessageId, status: "failed" }; // 실패 상태 기록
            throw error; // 원래 오류 전달
        } // 실패 종료
        if (abortController.signal.aborted) // 후처리 전 중단 판정
        { // 조건 시작
            this.lastAttempt = { userMessageId: userMessage.id, assistantMessageId, status: "cancelled" }; // 중단 상태 기록
            return { ok: false, reason: "cancelled" }; // 중단 결과 반환
        } // 조건 종료
        let relationshipLevel = version.relationshipLevel; // 관계 수치
        let relationshipStage = version.relationshipStage; // 관계 단계
        let emotion = previousAssistant?.emotion ?? version.emotion; // 응답 감정
        let currentScene = version.currentScene; // 현재 장면
        let sceneEvent = previousAssistant?.sceneEvent ?? null; // 장면 사건
        let sceneImage = previousAssistant?.sceneImage ?? null; // 응답에 붙은 상황 이미지
        if (applyStory) // 스토리 갱신 판정
        { // 조건 시작
            const userMessageCount = this.getMessages().filter((message) => message.role === "user").length; // 사용자 메시지 수
            const story = evaluateStory({ conversation, version, userMessage: userMessage.content, userMessageCount }); // 스토리 판정
            relationshipLevel = story.relationshipLevel; // 관계 수치 반영
            relationshipStage = story.relationshipStage; // 관계 단계 반영
            emotion = story.emotion; // 감정 반영
        } // 조건 종료
        const createdAt = new Date().toISOString(); // 완료 시각
        const relation = this.relationBinding(conversation, character); // 관계 스탯 연결
        const replacedEntry = relation === null ? undefined : previousAssistant?.status?.stats.find((item) => item.statId === relation.stat.id && item.target === relation.lead); // 다시 생성하는 응답의 관계 스탯 값
        const levelBeforeTurn = applyStory || relation === null ? version.relationshipLevel : replacedEntry !== undefined ? toRelationLevel(relation.stat, replacedEntry.value - replacedEntry.delta) : replayForkState(conversation, version, promptMessages.slice(0, -1), relation).relationshipLevel; // 이번 턴 전 관계 수치(다시 생성은 그 응답이 더하기 전 값)
        const baselines = this.relationBaselines(conversation, character, promptMessages, levelBeforeTurn); // 관계 스탯 시작 값
        const aiChanges = await this.judgeTurnStats(conversation, character, promptMessages, userMessage.content, reply, emotion, abortController.signal, baselines); // AI 스탯 판단
        if (abortController.signal.aborted) // 판단 중 중단
        { // 조건 시작
            this.lastAttempt = { userMessageId: userMessage.id, assistantMessageId, status: "cancelled" }; // 중단 상태 기록
            return { ok: false, reason: "cancelled" }; // 중단 결과 반환
        } // 조건 종료
        const turn = this.withTurnEvents(conversation, character, promptMessages, this.composeTurnStatus(conversation, character, promptMessages, userMessage.content, aiChanges, emotion, baselines)); // 이번 턴 상태창과 이벤트
        const status = turn.status; // 이벤트를 기록한 상태창
        const eventScene = turn.events.find((item) => item.scene !== null)?.scene ?? null; // 이벤트의 특별 장면 그림(토큰 없음)
        if (eventScene !== null) // 특별 장면 판정
        { // 조건 시작
            currentScene = eventScene; // 장면 반영
            sceneImage = eventScene; // 응답 아래 그림
        } // 조건 종료
        else if (previousAssistant?.status?.events?.some((item) => item.scene !== null && item.scene === sceneImage) === true) // 다시 생성으로 이벤트가 사라짐
        { // 조건 시작
            sceneImage = null; // 그 이벤트의 그림도 뗌
        } // 조건 종료
        sceneEvent = turn.events[0]?.eventId ?? null; // 이 턴의 첫 이벤트
        const relationLevel = relation === null ? null : readRelationLevel(status, relation.stat, relation.lead); // 대표 인물의 관계 스탯 값
        if (relationLevel !== null) // 관계 스탯 판정
        { // 조건 시작
            relationshipLevel = relationLevel; // 대화의 관계 수치는 관계 스탯 값을 따름
            relationshipStage = resolveRelationshipStage(relationLevel); // 관계 단계도 같은 값으로
        } // 조건 종료
        const assistantMessage: Message = { id: assistantMessageId, conversationId: conversation.id, versionId: version.id, sourceMessageId: null, role: "assistant", content: reply, emotion, sceneEvent, scenePath: currentScene, status, sceneImage, createdAt }; // 캐릭터 메시지
        const updatedVersion = { ...version, relationshipLevel, relationshipStage, emotion, currentScene, lastMessage: reply, updatedAt: createdAt }; // 버전 갱신
        this.state = { ...this.state, messages: this.state.messages.map((message) => message.id === assistantMessageId ? assistantMessage : message), conversationVersions: this.state.conversationVersions.map((item) => item.id === version.id ? updatedVersion : item) }; // 응답 상태 반영
        this.lastAttempt = { userMessageId: userMessage.id, assistantMessageId, status: "complete" }; // 완료 상태 기록
        this.reportProgress(onProgress, "complete", assistantMessageId); // 완료 상태 전달
        return { ok: true }; // 성공 반환
    } // 함수 종료

    public replaceState(state: AppState): void // 외부 상태 교체
    { // 함수 시작
        if (this.busy) // 응답 중 판정
        { // 조건 시작
            return; // 교체 중단
        } // 조건 종료
        this.state = structuredClone(state); // 상태 복사 반영
    } // 함수 종료

    public async editUserMessage(messageId: string, text: string, onProgress?: ChatProgressHandler): Promise<EditMessageResult> // 사용자 메시지 수정
    { // 함수 시작
        const content = text.trim(); // 수정 내용 정리
        if (content.length === 0) // 빈 입력 판정
        { // 조건 시작
            return { ok: false, reason: "empty" }; // 빈 입력 반환
        } // 조건 종료
        if (content.length > CHAT_MESSAGE_MAX_LENGTH) // 길이 초과 판정
        { // 조건 시작
            return { ok: false, reason: "too-long" }; // 길이 오류 반환
        } // 조건 종료
        if (this.busy) // 응답 중 판정
        { // 조건 시작
            return { ok: false, reason: "busy" }; // 중복 거절
        } // 조건 종료
        const conversation = this.state.conversations.find((item) => item.id === this.options.conversationId); // 대화 조회
        const version = conversation === undefined ? null : getConversationVersion(this.state, conversation.id); // 현재 버전 조회
        const target = version === null ? undefined : getVersionMessages(this.state, this.options.conversationId, version.id).find((message) => message.id === messageId && message.role === "user"); // 수정 대상 조회
        if (conversation === undefined || version === null || target === undefined) // 대상 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-message" }; // 메시지 오류 반환
        } // 조건 종료
        if (content === target.content.trim()) // 동일 내용 판정
        { // 조건 시작
            return { ok: false, reason: "unchanged" }; // 동일 입력 반환
        } // 조건 종료
        const group = getMessageVersionGroup(this.state, version.id, target.id); // 수정 그룹 조회
        if (group.versionIds.length >= CHAT_VERSION_LIMIT) // 버전 제한 판정
        { // 조건 시작
            return { ok: false, reason: "version-limit" }; // 제한 오류 반환
        } // 조건 종료
        const character = this.state.characters.find((item) => item.id === conversation.characterId); // 캐릭터 조회
        if (character === undefined) // 캐릭터 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-message" }; // 연결 오류 반환
        } // 조건 종료
        const spending = this.spendChat(); // 토큰 차감 후보 생성
        if (!spending.ok) // 잔액 부족 판정
        { // 조건 시작
            return { ok: false, reason: "insufficient-token" }; // 부족 반환
        } // 조건 종료
        const originalState = this.snapshot(); // 원본 상태 보존
        const baseMessages = getVersionMessages(originalState, conversation.id, version.id); // 기준 메시지 조회
        const targetIndex = baseMessages.findIndex((message) => message.id === target.id); // 수정 위치 조회
        const relation = this.relationBinding(conversation, character); // 관계 스탯 연결
        const forkBaseState = replayForkState(conversation, version, baseMessages.slice(0, targetIndex), relation); // 분기 시점 상태 복원
        const forkBaseVersion = { ...version, ...forkBaseState }; // 분기 기준 버전 생성
        const editedMessage = { ...target, content }; // 수정 입력 메시지 생성
        const promptMessages = [...baseMessages.slice(0, targetIndex), editedMessage]; // 수정 문맥 생성
        const assistantMessageId = this.nextId("assistant"); // 응답 식별자 생성
        const now = new Date().toISOString(); // 요청 시각 생성
        const abortController = new AbortController(); // 중단 제어기 생성
        const iterator = this.options.llm.streamReply(this.createLLMInput(character, conversation, forkBaseVersion, promptMessages), abortController.signal)[Symbol.asyncIterator](); // 수정 응답 반복기 생성
        this.activeAbortController = abortController; // 활성 제어기 저장
        this.busy = true; // 응답 잠금
        let reply = ""; // 응답 누적
        try // 수정 응답 시도
        { // 시도 시작
            while (true) // 응답 조각 순회
            { // 순회 시작
                const result = await this.nextChunk(iterator, abortController.signal); // 다음 조각 대기
                if (result.done) // 완료 판정
                { // 조건 시작
                    break; // 순회 종료
                } // 조건 종료
                if (abortController.signal.aborted) // 반영 전 중단 판정
                { // 조건 시작
                    throw new DOMException("응답이 중단되었습니다.", "AbortError"); // 중단 오류 발생
                } // 조건 종료
                reply += result.value; // 응답 조각 누적
                const progressFork = createVersionFork(originalState, { conversationId: conversation.id, baseVersionId: version.id, targetMessageId: target.id, content, assistantMessage: { id: assistantMessageId, role: "assistant", content: reply, emotion: forkBaseState.emotion, sceneEvent: null, scenePath: forkBaseState.currentScene, createdAt: now }, versionState: { ...forkBaseState, lastMessage: reply }, now }); // 임시 분기 생성
                onProgress?.({ state: progressFork.state, phase: "assistant", messageId: assistantMessageId }); // 임시 진행 전달
            } // 순회 종료
            if (abortController.signal.aborted) // 완료 후 중단 판정
            { // 조건 시작
                return { ok: false, reason: "cancelled" }; // 중단 결과 반환
            } // 조건 종료
            const userMessageCount = promptMessages.filter((message) => message.role === "user").length; // 사용자 메시지 수 계산
            const story = evaluateStory({ conversation, version: forkBaseVersion, userMessage: content, userMessageCount }); // 수정 스토리 판정
            const forkBaselines = this.relationBaselines(conversation, character, promptMessages, forkBaseState.relationshipLevel); // 분기 시점 관계에서 시작
            const forkChanges = await this.judgeTurnStats(conversation, character, promptMessages, content, reply, story.emotion, abortController.signal, forkBaselines); // AI 스탯 판단
            if (abortController.signal.aborted) // 판단 중 중단
            { // 조건 시작
                return { ok: false, reason: "cancelled" }; // 중단 결과 반환
            } // 조건 종료
            const forkTurn = this.withTurnEvents(conversation, character, promptMessages, this.composeTurnStatus(conversation, character, promptMessages, content, forkChanges, story.emotion, forkBaselines)); // 수정 턴 상태창과 이벤트
            const forkStatus = forkTurn.status; // 이벤트를 기록한 상태창
            const forkScene = forkTurn.events.find((item) => item.scene !== null)?.scene ?? null; // 이벤트의 특별 장면 그림
            const forkRelationLevel = relation === null ? null : readRelationLevel(forkStatus, relation.stat, relation.lead); // 분기 응답의 관계 스탯 값
            const forkLevel = forkRelationLevel ?? story.relationshipLevel; // 관계 스탯이 있으면 그 값
            const forkStage = forkRelationLevel === null ? story.relationshipStage : resolveRelationshipStage(forkRelationLevel); // 관계 단계
            const fork = createVersionFork(originalState, { conversationId: conversation.id, baseVersionId: version.id, targetMessageId: target.id, content, assistantMessage: { id: assistantMessageId, role: "assistant", content: reply, emotion: story.emotion, sceneEvent: forkTurn.events[0]?.eventId ?? null, scenePath: forkScene ?? forkBaseState.currentScene, status: forkStatus, sceneImage: forkScene, createdAt: now }, versionState: { relationshipLevel: forkLevel, relationshipStage: forkStage, emotion: story.emotion, currentScene: forkScene ?? forkBaseState.currentScene, lastMessage: reply }, now }); // 최종 분기 생성
            this.state = { ...fork.state, wallet: spending.wallet }; // 원자적 수정 확정
            this.reportProgress(onProgress, "complete", assistantMessageId); // 완료 상태 전달
            return { ok: true, versionId: fork.version.id }; // 성공 결과 반환
        } // 시도 종료
        catch (error) // 수정 오류 처리
        { // 오류 시작
            this.closeIterator(iterator); // 반복기 정리
            if (abortController.signal.aborted) // 사용자 중단 판정
            { // 조건 시작
                return { ok: false, reason: "cancelled" }; // 중단 결과 반환
            } // 조건 종료
            throw error; // 원래 오류 전달
        } // 오류 종료
        finally // 수정 정리
        { // 정리 시작
            this.activeAbortController = null; // 활성 제어기 해제
            this.busy = false; // 응답 잠금 해제
        } // 정리 종료
    } // 함수 종료

    public async sendMessage(text: string, onProgress?: ChatProgressHandler): Promise<SendResult> // 메시지 전송
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
        if (content.length > CHAT_MESSAGE_MAX_LENGTH) // 길이 초과 판정
        { // 조건 시작
            return { ok: false, reason: "too-long" }; // 길이 오류 반환
        } // 조건 종료
        const version = getConversationVersion(this.state, conversation.id); // 현재 버전 조회
        if (version === null) // 버전 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 버전 오류
        } // 조건 종료
        const character = this.state.characters.find((item) => item.id === conversation.characterId); // 캐릭터 조회
        if (character === undefined) // 캐릭터 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 연결 오류 반환
        } // 조건 종료
        const spending = this.spendChat(); // 토큰 차감 시도
        if (!spending.ok) // 잔액 부족 판정
        { // 조건 시작
            return { ok: false, reason: "insufficient-token" }; // 부족 반환
        } // 조건 종료
        this.busy = true; // 응답 잠금
        try // 응답 처리
        { // 시도 시작
            const now = new Date().toISOString(); // 현재 시각
            const userMessage: Message = { id: this.nextId("user"), conversationId: conversation.id, versionId: version.id, sourceMessageId: null, role: "user", content, emotion: null, sceneEvent: null, createdAt: now }; // 사용자 메시지
            this.state = { ...this.state, wallet: spending.wallet, messages: [...this.state.messages, userMessage] }; // 사용자 상태 반영
            this.reportProgress(onProgress, "user", userMessage.id); // 사용자 진행 전달
            const assistantMessageId = this.nextId("assistant"); // 응답 메시지 식별자
            return await this.generateReply(conversation, version, character, userMessage, assistantMessageId, onProgress, true); // 응답 생성 반환
        } // 시도 종료
        finally // 잠금 해제
        { // 종료 시작
            this.activeAbortController = null; // 활성 제어기 해제
            this.busy = false; // 응답 잠금 해제
        } // 종료 끝
    } // 함수 종료

    public async regenerateLastReply(onProgress?: ChatProgressHandler): Promise<SendResult> // 마지막 응답 다시 생성
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
        const version = getConversationVersion(this.state, conversation.id); // 현재 버전 조회
        if (version === null) // 버전 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 버전 오류
        } // 조건 종료
        const character = this.state.characters.find((item) => item.id === conversation.characterId); // 캐릭터 조회
        if (character === undefined) // 캐릭터 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 연결 오류
        } // 조건 종료
        const conversationMessages = this.getMessages(); // 현재 대화 메시지
        const userIndex = conversationMessages.findLastIndex((message) => message.role === "user"); // 마지막 사용자 위치
        const userMessage = userIndex >= 0 ? conversationMessages[userIndex] : undefined; // 마지막 사용자 메시지
        if (userMessage === undefined) // 사용자 메시지 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-message" }; // 메시지 오류
        } // 조건 종료
        const previousAssistant = conversationMessages.slice(userIndex + 1).find((message) => message.role === "assistant"); // 기존 응답 조회
        const spending = this.spendChat(); // 토큰 차감 시도
        if (!spending.ok) // 잔액 부족 판정
        { // 조건 시작
            return { ok: false, reason: "insufficient-token" }; // 부족 반환
        } // 조건 종료
        const assistantMessageId = previousAssistant?.id ?? this.nextId("assistant"); // 응답 식별자 결정
        const applyStory = this.lastAttempt?.userMessageId === userMessage.id && this.lastAttempt.status !== "complete"; // 스토리 반영 여부
        this.state = { ...this.state, wallet: spending.wallet }; // 대화 비용 반영
        this.busy = true; // 응답 잠금
        try // 다시 생성 시도
        { // 시도 시작
            return await this.generateReply(conversation, version, character, userMessage, assistantMessageId, onProgress, applyStory); // 다시 생성 반환
        } // 시도 종료
        finally // 잠금 해제
        { // 종료 시작
            this.activeAbortController = null; // 활성 제어기 해제
            this.busy = false; // 응답 잠금 해제
        } // 종료 끝
    } // 함수 종료

    public applySceneImage(path: string): SceneResult // 내 이미지로 장면 바꾸기(토큰 없음)
    { // 함수 시작
        if (this.busy) // 응답 중 판정
        { // 조건 시작
            return { ok: false, reason: "busy" }; // 응답 중 거절
        } // 조건 종료
        const conversation = this.state.conversations.find((item) => item.id === this.options.conversationId); // 대화 조회
        const version = conversation === undefined ? null : getConversationVersion(this.state, conversation.id); // 현재 버전 조회
        if (version === null) // 대화·버전 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 대화 오류
        } // 조건 종료
        const updatedVersion = { ...version, currentScene: path, updatedAt: new Date().toISOString() }; // 장면 갱신
        this.state = { ...this.state, conversationVersions: this.state.conversationVersions.map((item) => item.id === version.id ? updatedVersion : item) }; // 상태 반영
        this.attachSceneToLatestReply(version.id, path); // 마지막 응답 아래 이미지
        return { ok: true, path }; // 성공 반환
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
        const version = getConversationVersion(this.state, conversation.id); // 현재 버전 조회
        if (version === null) // 버전 부재 판정
        { // 조건 시작
            return { ok: false, reason: "missing-conversation" }; // 버전 오류
        } // 조건 종료
        const spending = trySpend(this.state.wallet, "manual-image"); // 이미지 차감
        if (!spending.ok) // 잔액 부족
        { // 조건 시작
            return { ok: false, reason: "insufficient-token" }; // 부족 반환
        } // 조건 종료
        const scene = await this.options.images.generateScene({ sceneId: "fallback" }); // 장면 생성
        const updatedVersion = { ...version, currentScene: scene.path, updatedAt: new Date().toISOString() }; // 버전 갱신
        this.state = { ...this.state, wallet: spending.wallet, conversationVersions: this.state.conversationVersions.map((item) => item.id === version.id ? updatedVersion : item) }; // 상태 반영
        this.attachSceneToLatestReply(version.id, scene.path); // 마지막 응답 아래 이미지
        return { ok: true, path: scene.path }; // 성공 반환
    } // 함수 종료
} // 클래스 종료
