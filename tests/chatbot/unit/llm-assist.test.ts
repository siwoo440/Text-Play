import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { POST } from "@chatbot/app/api/chat/assist/route"; // 보조 통로
import { buildStatsPrompt, buildSummaryPrompt, cleanSummary, parseAssistRequest, parseStatDeltas, SUMMARY_LIMIT, type StatsRequest, type SummaryRequest } from "@chatbot/lib/llm/assist-builder"; // 보조 지시문
import { resetChatSlots } from "@chatbot/lib/llm/chat-gate"; // 문지기
import type { FetchLike } from "@chatbot/lib/llm/providers"; // 요청 함수 형식

const encoder = new TextEncoder(); // 글자 변환

function sse(text: string): Response // 가짜 Ollama 답(OpenAI 형식)
{ // 함수 시작
    const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`; // 흐름 글
    return new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode(body)); controller.close(); } }), { status: 200 }); // 흐름 응답
} // 함수 종료

function useLocalModel(): void // 오픈챗(내 컴퓨터 모델)만 켠 환경
{ // 함수 시작
    vi.stubEnv("ENABLE_REAL_PROVIDERS", "true"); // 스위치 켬
    vi.stubEnv("CHAT_MODEL_OPEN", "qwen3:14b"); // 설치한 모델
    vi.stubEnv("LOCAL_BASE_URL", ""); // 기본 주소
    vi.stubEnv("LOCAL_API_KEY", ""); // 열쇠 없음
    vi.stubEnv("LOCAL_REASONING_EFFORT", ""); // 기본(생각 끔)
    vi.stubEnv("ANTHROPIC_API_KEY", ""); // 회사 열쇠 없음
    vi.stubEnv("GEMINI_API_KEY", ""); // 회사 열쇠 없음
    vi.stubEnv("OPENAI_API_KEY", ""); // 회사 열쇠 없음
    vi.stubEnv("CHAT_ALLOW_PUBLIC", ""); // 공개 꺼짐
} // 함수 종료

const summary: SummaryRequest = { task: "summary", tier: "open", contentRating: "all", language: "ko", title: "새벽 도서관의 리안 · 다시 온 독자", lines: [{ name: "소하", content: "오늘 비가 와서 우울해." }, { name: "리안", content: "*옆자리에 앉는다.* 여기 있을게." }] }; // 요약 요청
const stats: StatsRequest = { task: "stats", tier: "open", contentRating: "all", userName: "소하", speakerName: "리안", stats: [{ name: "호감도", target: "리안", value: 34, min: 0, max: 100, maxChange: 5 }, { name: "기록한 기억", target: null, value: 3, min: 0, max: 50, maxChange: 2 }], userMessage: "고마워, 이건 선물이야.", reply: "*찻잔을 받아 든다.* 고마워." }; // 스탯 판단 요청
const post = (body: unknown, host = "localhost:3002") => POST(new Request(`http://${host}/api/chat/assist`, { method: "POST", headers: { host, "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) })); // 요청 보내기
const reason = async (response: Response) => (await response.json() as { error: string }).error; // 거절 이유

afterEach(() => // 테스트 정리
{ // 정리 시작
    vi.unstubAllEnvs(); // 환경 변수 복원
    vi.unstubAllGlobals(); // 전역 대역 복원
    resetChatSlots(); // 요청 기록 비움
}); // 정리 종료

describe("대화 요약 지시문", () => // 요약 묶음
{ // 묶음 시작
    it("요청을 검사하고 길이를 자른다", () => // 요청 정리 검증
    { // 검증 시작
        expect(parseAssistRequest(summary)).toEqual(summary); // 올바른 요청은 그대로
        expect(parseAssistRequest({ ...summary, task: "other" })).toBeNull(); // 모르는 일
        expect(parseAssistRequest({ ...summary, tier: "gold" })).toBeNull(); // 모르는 등급
        expect(parseAssistRequest({ ...summary, lines: [] })).toBeNull(); // 대화 없음
        expect(parseAssistRequest({ ...summary, lines: [{ name: "소하", content: "" }, { name: "", content: "말" }] })).toBeNull(); // 빈 줄만 있음
        const long = parseAssistRequest({ ...summary, language: "fr", contentRating: "x", lines: Array.from({ length: 40 }, (_item, index) => ({ name: "소하", content: `${index}번째 ${"가".repeat(2000)}` })) }); // 긴 요청
        expect(long?.task === "summary" ? [long.lines.length, long.lines[0].content.startsWith("20번째"), long.lines[0].content.length, long.language, long.contentRating] : null).toEqual([20, true, 800, "ko", "all"]); // 최근 20줄, 줄마다 800자, 모르는 값은 기본값
    }); // 검증 종료

    it("대화 줄과 요약 규칙을 담고, 답변 언어를 따른다", () => // 지시문 검증
    { // 검증 시작
        const prompt = buildSummaryPrompt(summary); // 지시문
        for (const part of ["2~3문장", "150자 안팎", "대화에 없는 내용을 지어내지 않는다", "요약 문장만 쓴다", "한국어로 쓴다"]) // 규칙
        { // 순회 시작
            expect(prompt.system).toContain(part); // 포함 확인
        } // 순회 종료
        expect(prompt.messages).toHaveLength(1); // 사용자 말 하나
        expect(prompt.messages[0].content).toContain("소하: 오늘 비가 와서 우울해.\n리안: *옆자리에 앉는다.* 여기 있을게."); // 대화 줄
        expect(prompt.messages[0].content).toContain("새벽 도서관의 리안 · 다시 온 독자"); // 대화방 이름
        expect(prompt.maxTokens).toBeLessThanOrEqual(400); // 짧은 답만 받음
        expect(buildSummaryPrompt({ ...summary, language: "en" }).system).toContain("Write the summary in English."); // 영어 요약
    }); // 검증 종료

    it("머리말·따옴표·줄바꿈을 걷어 내고 한도를 넘으면 문장 끝에서 자른다", () => // 요약 정리 검증
    { // 검증 시작
        expect(cleanSummary("요약: \"소하는 비 오는 날 도서관을 찾았다.\n리안은 곁에 있어 주었다.\"")).toBe("소하는 비 오는 날 도서관을 찾았다. 리안은 곁에 있어 주었다."); // 머리말·따옴표·줄바꿈 제거
        expect(cleanSummary("**Summary:** They met again.")).toBe("They met again."); // 영어 머리말과 강조 표시 제거
        const long = `${"가나다라마바사아자차. ".repeat(40)}`; // 긴 요약
        const cut = cleanSummary(long); // 정리
        expect(cut.length).toBeLessThanOrEqual(SUMMARY_LIMIT); // 한도 안
        expect(cut.endsWith(".")).toBe(true); // 문장 끝에서 자름
        expect(cleanSummary("   ")).toBe(""); // 빈 답
    }); // 검증 종료
}); // 묶음 종료

describe("보조 통로의 대화 요약", () => // 통로 묶음
{ // 묶음 시작
    it("꺼져 있거나 바깥 요청이거나 요청이 틀리면 거절한다", async () => // 거절 검증
    { // 검증 시작
        vi.stubEnv("ENABLE_REAL_PROVIDERS", "false"); // 스위치 끔
        const disabled = await post(summary); // 요청
        expect([disabled.status, await reason(disabled)]).toEqual([503, "disabled"]); // 연습용으로
        useLocalModel(); // 오픈챗 켬
        const outside = await post(summary, "mateverse.example"); // 바깥 요청
        expect([outside.status, await reason(outside)]).toEqual([403, "local-only"]); // 거절
        const broken = await post("{not-json"); // 깨진 요청
        expect([broken.status, await reason(broken)]).toEqual([400, "bad-request"]); // 거절
        const wrong = await post({ ...summary, lines: [] }); // 대화 없음
        expect([wrong.status, await reason(wrong)]).toEqual([400, "bad-request"]); // 거절
        const mature = await post({ ...summary, tier: "plus", contentRating: "mature" }); // 19세 작품을 회사 등급으로
        expect([mature.status, await reason(mature)]).toEqual([422, "mature-not-supported"]); // 연습용으로
        const noKey = await post({ ...summary, tier: "plus" }); // 열쇠 없는 등급
        expect([noKey.status, await reason(noKey)]).toEqual([503, "no-key"]); // 연습용으로
    }); // 검증 종료

    it("내 컴퓨터 모델에 요약을 맡기고 정리한 요약을 돌려준다", async () => // 요약 검증
    { // 검증 시작
        useLocalModel(); // 오픈챗 켬
        const fetcher = vi.fn<FetchLike>(async () => sse("요약: 소하는 비 오는 날 도서관을 찾았고, 리안은 곁에 있어 주었다.")); // 가짜 Ollama
        vi.stubGlobal("fetch", fetcher); // 요청 함수 바꿈
        const response = await post(summary); // 요청
        expect([response.status, await response.json()]).toEqual([200, { summary: "소하는 비 오는 날 도서관을 찾았고, 리안은 곁에 있어 주었다." }]); // 정리한 요약
        const sent = JSON.parse(fetcher.mock.calls[0][1].body as string) as { model: string; max_tokens: number; messages: Array<{ role: string; content: string }> }; // 보낸 내용
        expect([fetcher.mock.calls[0][0], sent.model]).toEqual(["http://127.0.0.1:11434/v1/chat/completions", "qwen3:14b"]); // 내 컴퓨터 모델
        expect(sent.messages[1].content).toContain("소하: 오늘 비가 와서 우울해."); // 대화 줄을 보냄
        vi.stubGlobal("fetch", vi.fn(async () => sse("   "))); // 빈 답
        const empty = await post(summary); // 요청
        expect([empty.status, await reason(empty)]).toEqual([502, "bad-output"]); // 쓸 수 없는 답
        vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); })); // 프로그램 꺼짐
        const offline = await post(summary); // 요청
        expect([offline.status, await reason(offline)]).toEqual([502, "model-offline"]); // 프로그램 꺼짐으로 알림
    }); // 검증 종료
}); // 묶음 종료

describe("스탯 판단 지시문", () => // 스탯 판단 묶음
{ // 묶음 시작
    it("요청을 검사하고 수치를 정리한다", () => // 요청 정리 검증
    { // 검증 시작
        expect(parseAssistRequest(stats)).toEqual(stats); // 올바른 요청은 그대로
        expect(parseAssistRequest({ ...stats, stats: [] })).toBeNull(); // 판단할 수치 없음
        expect(parseAssistRequest({ ...stats, reply: "" })).toBeNull(); // 답변 없음
        const cleaned = parseAssistRequest({ ...stats, userName: "", stats: [{ name: "호감도", target: "", value: 34.6, min: 0, max: 100, maxChange: 0 }, { name: "", target: null, value: 1, min: 0, max: 1, maxChange: 1 }, { name: "긴장", target: "리안", value: "많음", min: 0, max: 10, maxChange: 3 }] }); // 어긋난 값이 섞인 요청
        expect(cleaned?.task === "stats" ? [cleaned.userName, cleaned.stats] : null).toEqual(["사용자", [{ name: "호감도", target: null, value: 35, min: 0, max: 100, maxChange: 1 }]]); // 이름 없는 수치·숫자가 아닌 값은 빼고, 값은 정수로, 변화 한도는 1 이상으로
    }); // 검증 종료

    it("수치 목록에 번호를 붙이고 이번 대화와 답 형식을 알려 준다", () => // 지시문 검증
    { // 검증 시작
        const prompt = buildStatsPrompt(stats); // 지시문
        for (const part of ["정수", "허용 범위 안에서", "'소하'의 이번 말과 행동을 '리안' 쪽에서 어떻게 받아들였는지", "답변의 말투가 부드럽다는 이유로 올리지 않는다", "JSON 한 줄만", "{\"1\": 0, \"2\": 0}"]) // 규칙
        { // 순회 시작
            expect(prompt.system).toContain(part); // 포함 확인
        } // 순회 종료
        expect(prompt.messages[0].content).toContain("1. 리안의 호감도: 지금 34 (범위 0~100, 이번 변화 -5~+5)\n2. 기록한 기억: 지금 3 (범위 0~50, 이번 변화 -2~+2)"); // 번호를 붙인 수치 목록
        expect(prompt.messages[0].content).toContain("소하: 고마워, 이건 선물이야.\n리안: *찻잔을 받아 든다.* 고마워."); // 이번 대화
        expect(prompt.maxTokens).toBeLessThanOrEqual(300); // 짧은 답만 받음
    }); // 검증 종료

    it("답에서 JSON을 찾아 번호 순서대로 읽고, 한도를 넘는 값은 줄이고, 읽을 수 없으면 없음을 돌려준다", () => // 답 읽기 검증
    { // 검증 시작
        expect(parseStatDeltas("{\"1\": 3, \"2\": 0}", stats.stats)).toEqual([3, 0]); // 그대로
        expect(parseStatDeltas("```json\n{\"1\": +9, \"2\": -7.6}\n```\n호감도가 올랐습니다.", stats.stats)).toEqual([5, -2]); // 울타리·덧붙인 말·더하기 표시가 있어도 읽고 한도 안으로
        expect(parseStatDeltas("{\"1\": \"2\"}", stats.stats)).toEqual([2, 0]); // 글자로 온 숫자, 빠진 번호는 0
        expect(parseStatDeltas("{\"호감도\": 3}", stats.stats)).toEqual([0, 0]); // 번호가 아닌 열쇠는 0
        expect(parseStatDeltas("호감도가 3 올랐습니다.", stats.stats)).toBeNull(); // JSON 없음
        expect(parseStatDeltas("{1: 3", stats.stats)).toBeNull(); // 깨진 JSON
    }); // 검증 종료

    it("보조 통로가 내 컴퓨터 모델의 판단을 번호 순서의 변화 목록으로 돌려준다", async () => // 통로 검증
    { // 검증 시작
        useLocalModel(); // 오픈챗 켬
        const fetcher = vi.fn<FetchLike>(async () => sse("{\"1\": 4, \"2\": 1}")); // 가짜 Ollama
        vi.stubGlobal("fetch", fetcher); // 요청 함수 바꿈
        const response = await post(stats); // 요청
        expect([response.status, await response.json()]).toEqual([200, { deltas: [4, 1] }]); // 변화 목록
        const sent = JSON.parse(fetcher.mock.calls[0][1].body as string) as { messages: Array<{ role: string; content: string }> }; // 보낸 내용
        expect(sent.messages[1].content).toContain("1. 리안의 호감도"); // 수치 목록을 보냄
        vi.stubGlobal("fetch", vi.fn(async () => sse("잘 모르겠어요."))); // 읽을 수 없는 답
        const unreadable = await post(stats); // 요청
        expect([unreadable.status, await reason(unreadable)]).toEqual([502, "bad-output"]); // 쓸 수 없는 답
        const mature = await post({ ...stats, tier: "plus", contentRating: "mature" }); // 19세 작품을 회사 등급으로
        expect([mature.status, await reason(mature)]).toEqual([422, "mature-not-supported"]); // 연습용으로
    }); // 검증 종료
}); // 묶음 종료
