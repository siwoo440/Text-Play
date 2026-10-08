// 실제 AI 어댑터: 실제 AI를 쓸 수 있는 등급이면 서버 통로로 답과 대화 요약을 받고, 아니면(열쇠 없음·외부 AI 등급의 19세 작품·서버 없음) 연습용 AI를 쓴다. 스탯 판단도 같은 방식으로 맡긴다.
import type { ChatReplyOptions, LLMAdapter, LLMInput, SummaryInput } from "@chatbot/lib/adapters/llm-adapter"; // 어댑터 계약
import { loadModelStatus, type ModelStatus } from "@chatbot/lib/adapters/model-status"; // 실제 AI 상태
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // 연습용 AI
import { getChatTier } from "@chatbot/features/chat/chat-tiers"; // 채팅 등급
import { deriveDisplayName } from "@chatbot/features/story/story-model"; // 짧은 이름
import type { StatChange, StatJudgeInput } from "@chatbot/features/chat/stat-model"; // 스탯 판단 형식
import type { ChatTierId, ContentRating } from "@chatbot/features/core/types"; // 도메인 타입
import type { ChatRequest } from "@chatbot/lib/llm/prompt-builder"; // 서버 통로 요청

export type ChatServiceCode = "bad-key" | "rate-limited" | "provider-busy" | "provider-error" | "model-offline" | "model-missing" | "local-only" | "bad-request" | "too-large" | "unknown"; // 실패 이유

export class ChatServiceError extends Error // 실제 AI 실패(이유 코드 포함)
{ // 클래스 시작
    public constructor(public readonly code: ChatServiceCode, detail = "") // 이유와 설명
    { // 생성자 시작
        super(detail.length === 0 ? code : `${code}: ${detail}`); // 설명 전달
        this.name = "ChatServiceError"; // 오류 이름
    } // 생성자 종료
} // 클래스 종료

const fallbackCodes = new Set(["disabled", "no-key", "mature-not-supported"]); // 연습용으로 넘기는 이유
export const REQUEST_HISTORY_MESSAGES = 80; // 서버 통로로 보내는 최근 메시지 수(서버는 이 가운데 최근 40개까지만 지시문에 씀)
export const STAT_JUDGE_TIMEOUT_MS = 15_000; // 스탯 판단을 기다리는 시간(판단이 끝나야 답변이 마무리되므로 오래 기다리지 않음)
export const REQUEST_HISTORY_CHARS = 100_000; // 서버 통로로 보내는 대화 전체 글자 수(요청 크기 한도 400,000자를 넘지 않게)

function recentMessages(messages: ChatRequest["messages"]): ChatRequest["messages"] // 최근 대화만 남기기(대화 전체를 보내면 긴 대화에서 요청이 너무 커지고 서버가 최근 말을 버림)
{ // 함수 시작
    const recent = messages.slice(-REQUEST_HISTORY_MESSAGES); // 최근 개수만
    let total = recent.reduce((sum, message) => sum + message.content.length, 0); // 글자 수 합계
    while (recent.length > 1 && total > REQUEST_HISTORY_CHARS) // 글자 수가 넘으면 오래된 것부터 뺌(가장 최근 말은 남김)
    { // 반복 시작
        total -= recent[0].content.length; // 뺄 글자 수
        recent.shift(); // 가장 오래된 말 제거
    } // 반복 종료
    return recent; // 최근 대화 반환
} // 함수 종료
const knownCodes = new Set<ChatServiceCode>(["bad-key", "rate-limited", "provider-busy", "provider-error", "model-offline", "model-missing", "local-only", "bad-request", "too-large"]); // 화면에 알리는 이유

export function isMatureInput(input: Pick<LLMInput, "character" | "contentRating">): boolean // 19세 작품 여부(외부 AI 등급은 약관 때문에 연습용으로 답하고, 직접 돌리는 공개 모델 등급만 실제로 답함)
{ // 함수 시작
    return input.character.contentRating === "mature" || input.contentRating === "mature"; // 캐릭터·작품 등급
} // 함수 종료

export function toChatRequest(input: LLMInput, options: ChatReplyOptions): ChatRequest // 서버 통로에 보낼 요청 만들기(지시문은 서버가 조립)
{ // 함수 시작
    const { character, story } = input; // 캐릭터와 스토리
    return { // 요청
        tier: options.tier, // 등급
        character: { name: character.name, displayName: deriveDisplayName(character.name), summary: character.summary, description: character.description, personality: character.personality, greeting: character.greeting, worldSetting: character.worldSetting, prompt: character.prompt, tags: character.tags, contentRating: isMatureInput(input) ? "mature" : character.contentRating }, // 캐릭터
        story: story === undefined ? null : { title: story.title, synopsis: story.synopsis, userRole: story.userRole, cast: story.cast.map((member) => ({ displayName: member.displayName, role: member.role, personality: story.castNotes?.find((note) => note.displayName === member.displayName)?.personality ?? "", sample: story.castNotes?.find((note) => note.displayName === member.displayName)?.sample ?? "" })) }, // 스토리(등장인물의 성격과 말투 예 포함)
        messages: recentMessages(input.messages.flatMap((message) => message.role === "user" || message.role === "assistant" ? [{ role: message.role, content: message.content }] : [])), // 대화(안내 메시지 제외, 최근 것만)
        options, // 응답 조건
    }; // 요청 반환
} // 함수 종료

export class RemoteLLMAdapter implements LLMAdapter // 실제 AI 어댑터
{ // 클래스 시작
    public constructor(private readonly fallback: LLMAdapter = new MockLLMAdapter(), private readonly fetcher: typeof fetch = (...args) => fetch(...args), private readonly status: () => Promise<ModelStatus> = () => loadModelStatus()) // 연습용 AI·요청 함수·상태 읽기
    { // 생성자 시작
    } // 생성자 종료

    public async *streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 답변 흐름
    { // 함수 시작
        const options = input.options; // 응답 조건
        const status = await this.status(); // 실제 AI 상태
        if (options === undefined || status.tiers[options.tier] !== true || (isMatureInput(input) && !getChatTier(options.tier).mature)) // 연습용으로 답할 경우(19세 작품은 공개 모델 등급만 실제 AI)
        { // 조건 시작
            yield* this.fallback.streamReply(input, signal); // 연습용 AI
            return; // 종료
        } // 조건 종료
        const response = await this.fetcher("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(toChatRequest(input, options)), signal }); // 서버 통로 요청
        if (!response.ok || response.body === null) // 거절
        { // 조건 시작
            const body = await response.json().catch(() => null) as { error?: unknown; detail?: unknown } | null; // 이유
            const code = typeof body?.error === "string" ? body.error : "unknown"; // 이유 코드
            if (fallbackCodes.has(code)) // 연습용으로 넘길 이유
            { // 조건 시작
                yield* this.fallback.streamReply(input, signal); // 연습용 AI
                return; // 종료
            } // 조건 종료
            throw new ChatServiceError(knownCodes.has(code as ChatServiceCode) ? code as ChatServiceCode : "unknown", typeof body?.detail === "string" ? body.detail : ""); // 화면에 알림
        } // 조건 종료
        const reader = response.body.getReader(); // 읽기 도구
        const decoder = new TextDecoder(); // 글자 변환
        let received = false; // 글자를 받았는지
        try // 읽기 시도
        { // 시도 시작
            while (true) // 조각 순회
            { // 순회 시작
                const { done, value } = await reader.read(); // 다음 조각
                const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true }); // 글자로
                if (chunk.length > 0) // 글자 있음
                { // 조건 시작
                    received = true; // 받음
                    yield chunk; // 조각 반환
                } // 조건 종료
                if (done) // 끝
                { // 조건 시작
                    break; // 종료
                } // 조건 종료
            } // 순회 종료
        } // 시도 종료
        finally // 정리
        { // 정리 시작
            reader.releaseLock(); // 읽기 도구 반납
        } // 정리 종료
        if (!received) // 빈 답
        { // 조건 시작
            throw new ChatServiceError("provider-error", "empty reply"); // 다시 시도 안내
        } // 조건 종료
    } // 함수 종료

    private async canAssist(tier: ChatTierId, contentRating: ContentRating | undefined): Promise<boolean> // 이 등급으로 보조 일(요약 등)을 실제 AI에 맡길 수 있는지
    { // 함수 시작
        const status = await this.status(); // 실제 AI 상태
        return status.tiers[tier] === true && (contentRating !== "mature" || getChatTier(tier).mature); // 실제 AI 등급이고, 19세 작품이면 직접 돌리는 모델일 때만
    } // 함수 종료

    public async summarizeConversation(input: SummaryInput): Promise<string> // 대화 요약(실제 AI를 쓸 수 있으면 맡기고, 못 쓰거나 실패하면 연습용 규칙)
    { // 함수 시작
        const tier = input.conversation.settings.tier; // 이 대화의 채팅 등급
        if (input.speakerName === undefined || !(await this.canAssist(tier, input.contentRating))) // 이름을 받지 못했거나 실제 AI를 쓸 수 없음
        { // 조건 시작
            return this.fallback.summarizeConversation(input); // 연습용 요약
        } // 조건 종료
        const speakerName = input.speakerName; // 답하는 쪽 이름
        const lines = input.messages.flatMap((message) => message.role === "user" ? [{ name: input.userName ?? "사용자", content: message.content }] : message.role === "assistant" ? [{ name: speakerName, content: message.content }] : []); // 이름을 붙인 대화 줄(안내 메시지 제외)
        try // 실제 AI 요약 시도
        { // 시도 시작
            const response = await this.fetcher("/api/chat/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: "summary", tier, contentRating: input.contentRating ?? "all", language: input.language ?? "ko", title: input.conversation.title, lines }) }); // 보조 통로 요청
            const body = response.ok ? await response.json() as { summary?: unknown } : null; // 받은 답
            if (typeof body?.summary === "string" && body.summary.trim().length > 0) // 쓸 수 있는 요약
            { // 조건 시작
                return body.summary.trim(); // 실제 AI 요약
            } // 조건 종료
        } // 시도 종료
        catch // 연결 실패
        { // 실패 시작
            // 요약은 대화를 막지 않으므로 알리지 않고 연습용 요약으로 넘어감
        } // 실패 종료
        return this.fallback.summarizeConversation(input); // 연습용 요약
    } // 함수 종료

    public async judgeStats(input: StatJudgeInput, signal?: AbortSignal): Promise<StatChange[]> // 스탯 판단(실제 AI를 쓸 수 있으면 맡기고, 못 쓰거나 실패하면 연습용 규칙)
    { // 함수 시작
        const byRules = async (): Promise<StatChange[]> => this.fallback.judgeStats === undefined ? [] : this.fallback.judgeStats(input, signal); // 연습용 판단
        const context = input.context; // 판단 문맥
        if (context === undefined || !(await this.canAssist(context.tier, context.contentRating))) // 문맥이 없거나 실제 AI를 쓸 수 없음
        { // 조건 시작
            return byRules(); // 연습용 판단
        } // 조건 종료
        const stopper = new AbortController(); // 중단 장치(사용자 중단과 시간 초과를 함께 받음)
        const stop = () => stopper.abort(); // 중단
        const timer = setTimeout(stop, STAT_JUDGE_TIMEOUT_MS); // 시간 초과
        signal?.addEventListener("abort", stop, { once: true }); // 사용자 중단
        try // 실제 AI 판단 시도
        { // 시도 시작
            const stats = input.stats.map((stat) => ({ name: stat.name, target: stat.target, value: stat.value, min: stat.min, max: stat.max, maxChange: stat.maxChange })); // 보낼 수치(식별자는 보내지 않고 순서로 맞춤)
            const response = await this.fetcher("/api/chat/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: "stats", tier: context.tier, contentRating: context.contentRating, userName: context.userName, speakerName: context.speakerName, stats, userMessage: input.userMessage, reply: input.reply }), signal: stopper.signal }); // 보조 통로 요청
            const body = response.ok ? await response.json() as { deltas?: unknown } : null; // 받은 답
            const deltas = Array.isArray(body?.deltas) ? body.deltas as unknown[] : []; // 번호 순서의 변화
            if (deltas.length === input.stats.length && deltas.every((delta) => typeof delta === "number" && Number.isFinite(delta))) // 수치마다 변화가 하나씩 있음
            { // 조건 시작
                return input.stats.map((stat, index) => ({ statId: stat.statId, target: stat.target, delta: deltas[index] as number })); // 실제 AI 판단
            } // 조건 종료
        } // 시도 종료
        catch // 연결 실패·중단·시간 초과
        { // 실패 시작
            // 판단이 안 돼도 답변은 그대로 두고 연습용 규칙으로 넘어감
        } // 실패 종료
        finally // 정리
        { // 정리 시작
            clearTimeout(timer); // 시간 초과 해제
            signal?.removeEventListener("abort", stop); // 중단 감지 해제
        } // 정리 종료
        return byRules(); // 연습용 판단
    } // 함수 종료
} // 클래스 종료
