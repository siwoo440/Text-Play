import { render, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { TierSelector } from "@chatbot/features/chat/TierSelector"; // 등급 선택
import { createDefaultConversationSettings } from "@chatbot/features/core/defaults"; // 기본값
import type { LLMAdapter, LLMInput } from "@chatbot/lib/adapters/llm-adapter"; // 어댑터 계약
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { resetModelStatus, type ModelStatus } from "@chatbot/lib/adapters/model-status"; // 실제 AI 상태
import { ChatServiceError, RemoteLLMAdapter, REQUEST_HISTORY_MESSAGES, toChatRequest } from "@chatbot/lib/adapters/remote-llm-adapter"; // 실제 AI 어댑터
import { mockCharacters, mockConversations, mockConversationVersions } from "@chatbot/mocks/fixtures"; // Mock 데이터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/chat/rian", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

vi.setConfig({ testTimeout: 20_000 }); // 화면이 큰 테스트라 넉넉히 기다림

const encoder = new TextEncoder(); // 글자 변환
const options = { tier: "plus" as const, length: 1 as const, thinking: "off" as const, writingStyle: "default" as const, preventImpersonation: true, persona: null, userNote: "", memories: [], playGuide: "", stats: [], lore: [], examples: [] }; // 응답 조건
const message = (role: "user" | "assistant" | "system", content: string) => ({ id: `m-${content}`, conversationId: mockConversations[0].id, versionId: mockConversationVersions[0].id, sourceMessageId: null, role, content, emotion: null, sceneEvent: null, createdAt: "2026-10-04T00:00:00.000Z" }); // 메시지 생성
const input: LLMInput = { character: mockCharacters[0], conversation: mockConversations[0], version: mockConversationVersions[0], messages: [message("system", "안내"), message("assistant", "어서 와."), message("user", "안녕")], options, contentRating: "all" }; // 대화 입력
const live: ModelStatus = { enabled: true, tiers: { plus: true }, models: {} }; // 플러스챗만 실제 AI
const practice: LLMAdapter = { async *streamReply() { yield "연습용 답"; }, summarizeConversation: async () => "요약", judgeStats: async () => [] }; // 연습용 AI 대역

function streamed(chunks: string[]): Response // 글자 조각으로 흘러나오는 답
{ // 함수 시작
    return new Response(new ReadableStream<Uint8Array>({ start(controller) { chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk))); controller.close(); } }), { status: 200 }); // 흐름 응답
} // 함수 종료

async function collect(chunks: AsyncIterable<string>): Promise<string> // 흐름 모으기
{ // 함수 시작
    let text = ""; // 누적
    for await (const chunk of chunks) // 조각 순회
    { // 순회 시작
        text += chunk; // 붙임
    } // 순회 종료
    return text; // 전체 반환
} // 함수 종료

afterEach(() => // 테스트 정리
{ // 정리 시작
    vi.unstubAllGlobals(); // 전역 대역 복원
    resetModelStatus(); // 상태 기억 지움
}); // 정리 종료

describe("실제 AI 어댑터", () => // 어댑터 묶음
{ // 묶음 시작
    it("실제 AI를 쓸 수 있는 등급이면 서버 통로로 보내고 흘러나온 답을 그대로 돌려준다", async () => // 실제 AI 검증
    { // 검증 시작
        const fetcher = vi.fn(async () => streamed(["왔구나, ", "소하."])); // 서버 통로 대역
        const adapter = new RemoteLLMAdapter(practice, fetcher as unknown as typeof fetch, async () => live); // 어댑터
        expect(await collect(adapter.streamReply(input))).toBe("왔구나, 소하."); // 실제 답
        const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]; // 보낸 요청
        expect(url).toBe("/api/chat"); // 서버 통로
        expect(init.method).toBe("POST"); // 보내기
        const body = JSON.parse(init.body as string) as ReturnType<typeof toChatRequest>; // 내용
        expect(body.tier).toBe("plus"); // 등급
        expect(body.character.name).toBe(mockCharacters[0].name); // 캐릭터
        expect(body.messages).toEqual([{ role: "assistant", content: "어서 와." }, { role: "user", content: "안녕" }]); // 안내 메시지 제외
        expect(body.story).toBeNull(); // 캐릭터 대화
        expect(JSON.stringify(body)).not.toContain("coverImage"); // 필요한 정보만 보냄
    }); // 검증 종료

    it("열쇠가 없는 등급·19세 작품·서버가 연습용으로 넘긴 경우에는 연습용 AI로 답한다", async () => // 연습용 검증
    { // 검증 시작
        const fetcher = vi.fn(async () => streamed(["실제"])); // 서버 통로 대역
        const adapter = new RemoteLLMAdapter(practice, fetcher as unknown as typeof fetch, async () => live); // 어댑터
        expect(await collect(adapter.streamReply({ ...input, options: { ...options, tier: "basic" } }))).toBe("연습용 답"); // 열쇠 없는 등급
        expect(await collect(adapter.streamReply({ ...input, contentRating: "mature" }))).toBe("연습용 답"); // 19세 작품
        expect(await collect(adapter.streamReply({ ...input, options: undefined }))).toBe("연습용 답"); // 조건 없음
        expect(fetcher).not.toHaveBeenCalled(); // 서버 통로를 부르지 않음
        const noKey = new RemoteLLMAdapter(practice, (async () => Response.json({ error: "no-key" }, { status: 503 })) as unknown as typeof fetch, async () => live); // 서버가 열쇠 없음으로 답함
        expect(await collect(noKey.streamReply(input))).toBe("연습용 답"); // 연습용으로 넘김
        expect(await adapter.summarizeConversation({ conversation: mockConversations[0], version: mockConversationVersions[0], messages: [] })).toBe("요약"); // 요약은 연습용 규칙
    }); // 검증 종료

    it("19세 작품은 오픈챗(내 컴퓨터 모델)일 때만 서버 통로로 보낸다", async () => // 19세 작품 검증
    { // 검증 시작
        const fetcher = vi.fn(async () => streamed(["가까이 와."])); // 서버 통로 대역
        const adapter = new RemoteLLMAdapter(practice, fetcher as unknown as typeof fetch, async () => ({ enabled: true, tiers: { plus: true, open: true }, models: { open: "qwen3:14b" } })); // 플러스챗과 오픈챗이 실제 AI
        expect(await collect(adapter.streamReply({ ...input, contentRating: "mature" }))).toBe("연습용 답"); // 플러스챗은 연습용
        expect(fetcher).not.toHaveBeenCalled(); // 외부 AI로 보내지 않음
        expect(await collect(adapter.streamReply({ ...input, contentRating: "mature", options: { ...options, tier: "open" } }))).toBe("가까이 와."); // 오픈챗은 실제 답
        const body = JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string) as ReturnType<typeof toChatRequest>; // 보낸 내용
        expect([body.tier, body.character.contentRating]).toEqual(["open", "mature"]); // 19세 작품임을 알림
        const offline = new RemoteLLMAdapter(practice, (async () => Response.json({ error: "model-offline" }, { status: 502 })) as unknown as typeof fetch, async () => ({ enabled: true, tiers: { open: true }, models: {} })); // 프로그램 꺼짐
        await expect(collect(offline.streamReply({ ...input, options: { ...options, tier: "open" } }))).rejects.toMatchObject({ code: "model-offline" }); // 이유 전달
    }); // 검증 종료

    it("긴 대화는 최근 말만 서버 통로로 보낸다", () => // 긴 대화 검증
    { // 검증 시작
        const long = Array.from({ length: 300 }, (_item, index) => message(index % 2 === 0 ? "user" : "assistant", `말 ${index}`)); // 300개짜리 대화
        const body = toChatRequest({ ...input, messages: long }, options); // 보낼 요청
        expect(body.messages).toHaveLength(REQUEST_HISTORY_MESSAGES); // 최근 것만
        expect(body.messages.at(-1)?.content).toBe("말 299"); // 가장 최근 말 포함
        expect(toChatRequest(input, options).messages).toHaveLength(2); // 짧은 대화는 그대로(안내 메시지 제외)
    }); // 검증 종료

    it("서버 통로에 캐릭터의 짧은 이름과 스토리 등장인물의 성격을 함께 보낸다", () => // 지시문 재료 검증
    { // 검증 시작
        expect(toChatRequest({ ...input, character: { ...input.character, name: "새벽 도서관의 리안" } }, options).character.displayName).toBe("리안"); // 짧은 이름
        const story = { title: "기록관", synopsis: "", userRole: "", cast: [{ characterId: "rian", displayName: "리안", role: "사서", firstLine: "" }, { characterId: "noah", displayName: "노아", role: "안내자", firstLine: "" }], castNotes: [{ displayName: "리안", personality: "차분하고 다정하다.", sample: "왔구나." }] }; // 스토리 문맥(성격과 말투 예 포함)
        expect(toChatRequest({ ...input, story }, options).story?.cast).toEqual([{ displayName: "리안", role: "사서", personality: "차분하고 다정하다.", sample: "왔구나." }, { displayName: "노아", role: "안내자", personality: "", sample: "" }]); // 성격과 말투 예를 붙여 보냄
    }); // 검증 종료

    it("대화 요약은 실제 AI를 쓸 수 있으면 보조 통로에 맡기고, 못 쓰거나 실패하면 연습용 요약으로 넘어간다", async () => // 요약 검증
    { // 검증 시작
        const conversation = { ...mockConversations[0], settings: { ...mockConversations[0].settings, tier: "plus" as const } }; // 플러스챗 대화
        const summaryInput = { conversation, version: mockConversationVersions[0], messages: [message("system", "안내"), message("assistant", "어서 와."), message("user", "안녕")], userName: "소하", speakerName: "리안", contentRating: "all" as const, language: "ko" as const }; // 요약 입력
        const fetcher = vi.fn(async () => Response.json({ summary: "소하가 도서관에 들렀다." })); // 가짜 보조 통로
        const adapter = new RemoteLLMAdapter(practice, fetcher as unknown as typeof fetch, async () => live); // 어댑터
        expect(await adapter.summarizeConversation(summaryInput)).toBe("소하가 도서관에 들렀다."); // 실제 AI 요약
        const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]; // 보낸 요청
        expect(url).toBe("/api/chat/assist"); // 보조 통로
        expect(JSON.parse(init.body as string)).toEqual({ task: "summary", tier: "plus", contentRating: "all", language: "ko", title: conversation.title, lines: [{ name: "리안", content: "어서 와." }, { name: "소하", content: "안녕" }] }); // 이름을 붙인 대화 줄(안내 메시지 제외)
        fetcher.mockClear(); // 기록 비움
        expect(await adapter.summarizeConversation({ ...summaryInput, contentRating: "mature" })).toBe("요약"); // 19세 작품은 회사 등급에 보내지 않음
        expect(await new RemoteLLMAdapter(practice, fetcher as unknown as typeof fetch, async () => ({ enabled: false, tiers: {}, models: {} })).summarizeConversation(summaryInput)).toBe("요약"); // 실제 AI가 꺼져 있으면 연습용
        expect(await adapter.summarizeConversation({ conversation, version: mockConversationVersions[0], messages: summaryInput.messages })).toBe("요약"); // 이름을 받지 못하면 연습용
        expect(fetcher).not.toHaveBeenCalled(); // 세 경우 모두 보내지 않음
        const failing = new RemoteLLMAdapter(practice, (async () => Response.json({ error: "bad-output" }, { status: 502 })) as unknown as typeof fetch, async () => live); // 실패하는 보조 통로
        expect(await failing.summarizeConversation(summaryInput)).toBe("요약"); // 실패하면 연습용 요약
        const offline = new RemoteLLMAdapter(practice, (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch, async () => live); // 연결 실패
        expect(await offline.summarizeConversation(summaryInput)).toBe("요약"); // 연결이 안 돼도 연습용 요약
    }); // 검증 종료

    it("스탯 판단은 실제 AI를 쓸 수 있으면 보조 통로에 맡기고, 못 쓰거나 실패하면 연습용 규칙으로 넘어간다", async () => // 스탯 판단 검증
    { // 검증 시작
        const judgeInput = { stats: [{ statId: "affection", name: "호감도", target: "리안", value: 34, min: 0, max: 100, maxChange: 5 }, { statId: "memory", name: "기록한 기억", target: null, value: 3, min: 0, max: 50, maxChange: 2 }], userMessage: "고마워", reply: "나도 고마워.", emotion: "설렘", context: { tier: "plus" as const, contentRating: "all" as const, userName: "소하", speakerName: "리안" } }; // 판단 입력
        const rules: LLMAdapter = { ...practice, judgeStats: async () => [{ statId: "affection", target: "리안", delta: 1 }] }; // 연습용 규칙 대역
        const fetcher = vi.fn(async () => Response.json({ deltas: [4, 0] })); // 가짜 보조 통로
        const adapter = new RemoteLLMAdapter(rules, fetcher as unknown as typeof fetch, async () => live); // 어댑터
        expect(await adapter.judgeStats(judgeInput)).toEqual([{ statId: "affection", target: "리안", delta: 4 }, { statId: "memory", target: null, delta: 0 }]); // 실제 AI 판단을 스탯에 맞춰 돌려줌
        const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]; // 보낸 요청
        expect(url).toBe("/api/chat/assist"); // 보조 통로
        expect(JSON.parse(init.body as string)).toEqual({ task: "stats", tier: "plus", contentRating: "all", userName: "소하", speakerName: "리안", stats: [{ name: "호감도", target: "리안", value: 34, min: 0, max: 100, maxChange: 5 }, { name: "기록한 기억", target: null, value: 3, min: 0, max: 50, maxChange: 2 }], userMessage: "고마워", reply: "나도 고마워." }); // 스탯 식별자는 보내지 않음
        fetcher.mockClear(); // 기록 비움
        const expected = [{ statId: "affection", target: "리안", delta: 1 }]; // 연습용 규칙의 결과
        expect(await adapter.judgeStats({ ...judgeInput, context: undefined })).toEqual(expected); // 문맥이 없으면 연습용
        expect(await adapter.judgeStats({ ...judgeInput, context: { ...judgeInput.context, contentRating: "mature" } })).toEqual(expected); // 19세 작품은 회사 등급에 보내지 않음
        expect(fetcher).not.toHaveBeenCalled(); // 두 경우 모두 보내지 않음
        expect(await new RemoteLLMAdapter(rules, (async () => Response.json({ deltas: [4] })) as unknown as typeof fetch, async () => live).judgeStats(judgeInput)).toEqual(expected); // 개수가 다르면 연습용
        expect(await new RemoteLLMAdapter(rules, (async () => Response.json({ error: "bad-output" }, { status: 502 })) as unknown as typeof fetch, async () => live).judgeStats(judgeInput)).toEqual(expected); // 실패하면 연습용
        expect(await new RemoteLLMAdapter(rules, (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch, async () => live).judgeStats(judgeInput)).toEqual(expected); // 연결이 안 돼도 연습용
    }); // 검증 종료

    it("열쇠가 틀리거나 답이 비면 이유를 담은 오류를 낸다", async () => // 실패 검증
    { // 검증 시작
        const badKey = new RemoteLLMAdapter(practice, (async () => Response.json({ error: "bad-key", detail: "invalid" }, { status: 502 })) as unknown as typeof fetch, async () => live); // 열쇠 거절
        await expect(collect(badKey.streamReply(input))).rejects.toMatchObject({ name: "ChatServiceError", code: "bad-key" }); // 열쇠 문제
        const strange = new RemoteLLMAdapter(practice, (async () => new Response("oops", { status: 500 })) as unknown as typeof fetch, async () => live); // 알 수 없는 실패
        await expect(collect(strange.streamReply(input))).rejects.toMatchObject({ code: "unknown" }); // 알 수 없음
        const empty = new RemoteLLMAdapter(practice, (async () => streamed([])) as unknown as typeof fetch, async () => live); // 빈 답
        await expect(collect(empty.streamReply(input))).rejects.toMatchObject({ code: "provider-error" }); // 다시 시도 안내
    }); // 검증 종료
}); // 묶음 종료

describe("등급 선택 화면", () => // 화면 묶음
{ // 묶음 시작
    it("등급마다 별명과 모델 이름을 보여 주고, 실제 AI를 쓸 수 있는 등급을 표시한다", async () => // 등급 목록 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: true, tiers: { master: true, premium: true, plus: true, balance: false, smart: false, basic: false, open: true }, models: { open: "qwen3:14b" } }))); // 상태 대역(Claude 열쇠와 내 컴퓨터 모델)
        const onSelect = vi.fn(); // 선택 처리
        render(<TierSelector settings={createDefaultConversationSettings()} onSelect={onSelect} onSaveOptions={() => undefined} />); // 선택기 렌더
        await user.click(screen.getByRole("button", { name: "채팅 모델 베이직챗, 메시지당 1 토큰" })); // 목록 열기
        const items = within(screen.getByRole("menu", { name: "채팅 모델 선택" })).getAllByRole("menuitemradio"); // 등급 항목
        expect(items.map((item) => item.querySelector("strong")?.textContent)).toEqual(["마스터챗", "프리미엄챗", "플러스챗", "밸런스챗", "스마트챗", "베이직챗", "오픈챗"]); // 일곱 등급
        expect(items[2]).toHaveTextContent("Claude Sonnet"); // 모델 이름
        expect(items[3]).toHaveTextContent("GPT"); // 모델 이름
        expect(items[5]).toHaveTextContent("Gemini Flash"); // 모델 이름
        expect(await within(items[2]).findByText("실제 AI")).toBeInTheDocument(); // 열쇠가 있는 등급
        expect(within(items[5]).getByText("연습용 AI")).toBeInTheDocument(); // 열쇠가 없는 등급
        expect(items[6]).toHaveTextContent("qwen3:14b · 내 컴퓨터 모델 · 19세 작품 가능"); // 설치한 모델 이름
        expect(within(items[6]).getByText("실제 AI")).toBeInTheDocument(); // 내 컴퓨터 모델
        await user.click(items[0]); // 마스터챗 고르기
        expect(onSelect).toHaveBeenCalledWith("master"); // 선택 전달
    }); // 테스트 종료

    it("19세 작품에서는 오픈챗을 맨 위에 올려 혼자만 실제 AI로 표시하고, 모델 이름을 모르면 '공개 모델'로 보여 준다", async () => // 19세 작품 등급 목록 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: true, tiers: { plus: true, open: true }, models: {} }))); // 상태 대역
        render(<TierSelector settings={createDefaultConversationSettings()} mature onSelect={() => undefined} onSaveOptions={() => undefined} />); // 19세 작품의 선택기
        await user.click(screen.getByRole("button", { name: "채팅 모델 베이직챗, 메시지당 1 토큰" })); // 목록 열기
        const items = within(screen.getByRole("menu", { name: "채팅 모델 선택" })).getAllByRole("menuitemradio"); // 등급 항목
        expect(items.map((item) => item.querySelector("strong")?.textContent)).toEqual(["오픈챗", "마스터챗", "프리미엄챗", "플러스챗", "밸런스챗", "스마트챗", "베이직챗"]); // 19세 작품에 답하는 등급이 맨 위
        expect(await within(items[0]).findByText("실제 AI")).toBeInTheDocument(); // 오픈챗은 실제 AI
        expect(within(items[3]).getByText("연습용 AI")).toBeInTheDocument(); // 플러스챗은 열쇠가 있어도 연습용
        expect(items[0]).toHaveTextContent("공개 모델 · 내 컴퓨터 모델"); // 모델 이름을 모를 때
    }); // 테스트 종료

    it("내 컴퓨터의 AI 프로그램이 꺼져 있으면 켜라고 알려 준다", async () => // 프로그램 꺼짐 안내 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const failing: LLMAdapter = { streamReply: () => ({ [Symbol.asyncIterator]: () => ({ next: async () => { throw new ChatServiceError("model-offline"); } }) }), summarizeConversation: async () => "" }; // 프로그램이 꺼진 내 컴퓨터 모델
        renderWithApp(<ChatScreen characterId="rian" llm={failing} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        await user.type(screen.getByRole("textbox", { name: "메시지" }), "안녕{Enter}"); // 보내기
        expect(await screen.findByText("내 컴퓨터의 AI 프로그램(Ollama)이 꺼져 있어요. 프로그램을 켠 뒤 다시 시도해 주세요.")).toBeInTheDocument(); // 이유 안내
        expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument(); // 다시 시도
    }); // 테스트 종료

    it("실제 AI가 실패하면 채팅 화면이 이유를 쉬운 말로 알려 주고 다시 시도할 수 있게 한다", async () => // 실패 안내 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const failing: LLMAdapter = { streamReply: () => ({ [Symbol.asyncIterator]: () => ({ next: async () => { throw new ChatServiceError("bad-key"); } }) }), summarizeConversation: async () => "" }; // 열쇠가 틀린 실제 AI
        renderWithApp(<ChatScreen characterId="rian" llm={failing} images={new MockImageAdapter()} />); // 채팅 화면 렌더
        const box = screen.getByRole("textbox", { name: "메시지" }); // 입력창
        await user.type(box, "안녕{Enter}"); // 보내기
        expect(await screen.findByText("AI 열쇠가 맞지 않아요. .env.local의 열쇠를 확인한 뒤 서버를 다시 켜 주세요.")).toBeInTheDocument(); // 이유 안내
        expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument(); // 다시 시도
    }); // 테스트 종료
}); // 묶음 종료
