import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { GET, POST } from "@chatbot/app/api/chat/route"; // 서버 통로
import { createTokenVerifier, identifyCaller, resetCallerCache, VERIFY_CACHE_MS, type TokenVerifier } from "@chatbot/lib/llm/chat-caller"; // 요청한 사람 확인
import { DEFAULT_USER_MESSAGES_PER_DAY, DEFAULT_USER_REQUESTS_PER_MINUTE, getSeoulDayKey, readUsageLimits, resetChatSlots, resetUserSlots, takeTotalSlot, takeUserSlot } from "@chatbot/lib/llm/chat-gate"; // 문지기
import type { ChatRequest } from "@chatbot/lib/llm/prompt-builder"; // 서버 통로 요청

const encoder = new TextEncoder(); // 글자 변환
const supabaseEnv = { NEXT_PUBLIC_ACCOUNT_SERVICE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key" }; // 계정 서비스 설정(가짜 주소와 공개 키)
const noon = Date.parse("2026-10-08T03:00:00.000Z"); // 서울 낮 12시

const request: ChatRequest = { // 캐릭터 대화 요청
    tier: "plus", // 플러스챗
    character: { name: "리안", summary: "기억을 기록하는 사서", description: "새벽 도서관에서 일한다.", personality: "차분하고 다정하다.", greeting: "어서 와.", worldSetting: "기억이 책이 되는 도서관", prompt: "반말로 답한다.", tags: ["힐링"], contentRating: "all" }, // 캐릭터
    story: null, // 스토리 아님
    messages: [{ role: "assistant", content: "어서 와." }, { role: "user", content: "오늘도 왔어." }], // 대화
    options: { tier: "plus", length: 1.5, thinking: "off", writingStyle: "romance", preventImpersonation: true, persona: { name: "소하", description: "도서관 단골" }, userNote: "", memories: [], playGuide: "", stats: [], lore: [], examples: [], language: "ko" }, // 응답 조건
}; // 요청 종료

function ask(host: string, token?: string): Request // 요청 만들기(출입증이 있으면 머리말에 붙임)
{ // 함수 시작
    return new Request(`http://${host}/api/chat`, { headers: { host, ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) } }); // 요청 반환
} // 함수 종료

afterEach(() => // 테스트 정리
{ // 정리 시작
    vi.unstubAllEnvs(); // 환경 변수 복원
    vi.unstubAllGlobals(); // 전역 대역 복원
    resetChatSlots(); // 전체 요청 기록 비움
    resetUserSlots(); // 사람별 기록 비움
    resetCallerCache(); // 확인해 둔 출입증 비움
}); // 정리 종료

describe("사람별 사용량 한도", () => // 한도 묶음
{ // 묶음 시작
    it("한도는 환경 변수로 정하고, 없거나 잘못된 값이면 기본값을 쓴다", () => // 한도 읽기
    { // 검증 시작
        expect(readUsageLimits({})).toEqual({ perMinute: DEFAULT_USER_REQUESTS_PER_MINUTE, perDay: DEFAULT_USER_MESSAGES_PER_DAY, totalPerDay: 0 }); // 기본값(전체 한도는 없음)
        expect(readUsageLimits({ CHAT_USER_REQUESTS_PER_MINUTE: "6", CHAT_USER_MESSAGES_PER_DAY: "50", CHAT_TOTAL_MESSAGES_PER_DAY: "1000" })).toEqual({ perMinute: 6, perDay: 50, totalPerDay: 1000 }); // 정한 값
        expect(readUsageLimits({ CHAT_USER_REQUESTS_PER_MINUTE: "0", CHAT_USER_MESSAGES_PER_DAY: "많이", CHAT_TOTAL_MESSAGES_PER_DAY: "-5" })).toEqual({ perMinute: DEFAULT_USER_REQUESTS_PER_MINUTE, perDay: DEFAULT_USER_MESSAGES_PER_DAY, totalPerDay: 0 }); // 잘못된 값은 기본값
    }); // 검증 종료

    it("1분 한도는 모든 요청을, 하루 한도는 메시지만 사람마다 따로 센다", () => // 사람별 세기
    { // 검증 시작
        const limits = { perMinute: 4, perDay: 3, totalPerDay: 0 }; // 시험용 한도
        expect([takeUserSlot("soha", "message", limits, noon).ok, takeUserSlot("soha", "assist", limits, noon + 1).ok, takeUserSlot("soha", "assist", limits, noon + 2).ok, takeUserSlot("soha", "message", limits, noon + 3).ok]).toEqual([true, true, true, true]); // 1분에 네 번까지
        expect(takeUserSlot("soha", "assist", limits, noon + 4)).toEqual({ ok: false, reason: "minute", retryAfterSeconds: 60 }); // 다섯 번째는 1분 한도
        expect(takeUserSlot("mina", "message", limits, noon + 5).ok).toBe(true); // 다른 사람은 따로 셈
        expect(takeUserSlot("soha", "message", limits, noon + 61_000).ok).toBe(true); // 1분 뒤 세 번째 메시지
        expect(takeUserSlot("soha", "assist", limits, noon + 61_001).ok).toBe(true); // 보조 요청은 하루 한도에 들지 않음
        const fourth = takeUserSlot("soha", "message", limits, noon + 61_002); // 네 번째 메시지
        expect(fourth).toMatchObject({ ok: false, reason: "day" }); // 하루 한도
        expect(fourth.ok ? 0 : fourth.retryAfterSeconds).toBe(12 * 3600 - 61); // 서울 자정까지 남은 시간(초, 올림)
        expect(takeUserSlot("soha", "message", limits, noon + 12 * 3600 * 1000).ok).toBe(true); // 서울 날짜가 바뀌면 다시 받음
    }); // 검증 종료

    it("하루는 서울 시각으로 나누고, 전체 한도는 정했을 때만 모든 사람을 합쳐 센다", () => // 날짜와 전체 한도
    { // 검증 시작
        expect(getSeoulDayKey(Date.parse("2026-10-08T14:59:59.000Z"))).toBe("2026-10-08"); // 서울 23시 59분
        expect(getSeoulDayKey(Date.parse("2026-10-08T15:00:00.000Z"))).toBe("2026-10-09"); // 서울 자정
        expect([takeTotalSlot(0, noon), takeTotalSlot(0, noon), takeTotalSlot(0, noon)]).toEqual([true, true, true]); // 전체 한도가 없으면 세지 않음
        expect([takeTotalSlot(2, noon), takeTotalSlot(2, noon + 1), takeTotalSlot(2, noon + 2)]).toEqual([true, true, false]); // 정한 수까지만
        expect(takeTotalSlot(2, noon + 12 * 3600 * 1000)).toBe(true); // 날짜가 바뀌면 다시
    }); // 검증 종료
}); // 묶음 종료

describe("요청한 사람 확인", () => // 확인 묶음
{ // 묶음 시작
    const member: TokenVerifier = async (token) => token === "good-token" ? { ok: true, userId: "user-1" } : token === "slow-token" ? { ok: false, reason: "unavailable" } : { ok: false, reason: "invalid" }; // 출입증 확인 대역

    it("내 컴퓨터는 그대로 받고, 바깥은 공개를 켜고 로그인한 사람만 받는다", async () => // 받는 조건
    { // 검증 시작
        expect(await identifyCaller(ask("localhost:3002"), {}, member)).toEqual({ kind: "local" }); // 내 컴퓨터
        expect(await identifyCaller(ask("mateverse.example", "good-token"), {}, member)).toEqual({ kind: "refused", status: 403, code: "local-only" }); // 공개를 켜지 않으면 로그인해도 거절
        const open = { CHAT_ALLOW_PUBLIC: "true" }; // 공개 켬
        expect(await identifyCaller(ask("mateverse.example"), open, member)).toEqual({ kind: "refused", status: 401, code: "login-required" }); // 출입증 없음
        expect(await identifyCaller(ask("mateverse.example", "bad-token"), open, member)).toEqual({ kind: "refused", status: 401, code: "login-required" }); // 쓸 수 없는 출입증
        expect(await identifyCaller(ask("mateverse.example", "slow-token"), open, member)).toEqual({ kind: "refused", status: 503, code: "auth-unavailable" }); // 확인 서비스에 닿지 못함
        expect(await identifyCaller(ask("mateverse.example", "good-token"), open, member)).toEqual({ kind: "member", userId: "user-1" }); // 로그인한 사람
        expect(await identifyCaller(ask("mateverse.example", "good-token"), open, null)).toEqual({ kind: "refused", status: 503, code: "auth-unavailable" }); // 계정 서비스를 연결하지 않음
    }); // 검증 종료

    it("출입증은 계정 서비스에 물어 확인하고, 확인한 결과는 잠깐 기억해 매번 묻지 않는다", async () => // 출입증 확인
    { // 검증 시작
        const calls: Array<{ url: string; headers: Record<string, string> }> = []; // 계정 서비스가 받은 요청
        let clock = noon; // 지금 시각
        let down = false; // 계정 서비스가 닿지 않는지
        const fetcher = (async (input: RequestInfo | URL, init: RequestInit = {}) => // 가짜 계정 서비스
        { // 함수 시작
            const headers = init.headers as Record<string, string>; // 머리말
            calls.push({ url: String(input), headers }); // 기록
            if (down) // 닿지 않음
            { // 조건 시작
                throw new Error("network"); // 연결 실패
            } // 조건 종료
            return headers.authorization === "Bearer good-token" ? Response.json({ id: "0A1B-user" }) : Response.json({ msg: "invalid JWT" }, { status: 401 }); // 출입증이 맞을 때만 사용자
        }) as typeof fetch; // 요청 함수 모양
        expect(createTokenVerifier({}, fetcher)).toBeNull(); // 계정 서비스를 연결하지 않으면 확인할 수 없음
        expect(createTokenVerifier({ ...supabaseEnv, NEXT_PUBLIC_ACCOUNT_SERVICE: "practice" }, fetcher)).toBeNull(); // 연습용 로그인은 서버가 확인할 수 없음
        const verify = createTokenVerifier(supabaseEnv, fetcher, () => clock)!; // 확인 함수
        expect(await verify("good-token")).toEqual({ ok: true, userId: "0a1b-user" }); // 확인됨(식별자는 소문자로)
        expect(calls[0]).toEqual({ url: "https://demo.supabase.co/auth/v1/user", headers: { apikey: "public-key", authorization: "Bearer good-token" } }); // 공개 키와 출입증으로 물음
        expect(await verify("good-token")).toEqual({ ok: true, userId: "0a1b-user" }); // 다시 확인
        expect(calls).toHaveLength(1); // 기억해 둔 결과를 씀
        clock += VERIFY_CACHE_MS + 1; // 기억하는 시간이 지남
        await verify("good-token"); // 다시 확인
        expect(calls).toHaveLength(2); // 다시 물음
        expect(await verify("bad-token")).toEqual({ ok: false, reason: "invalid" }); // 쓸 수 없는 출입증
        down = true; // 계정 서비스가 닿지 않음
        expect(await verify("other-token")).toEqual({ ok: false, reason: "unavailable" }); // 확인하지 못함(로그인이 틀린 것과 구별)
    }); // 검증 종료
}); // 묶음 종료

describe("공개 주소의 서버 통로", () => // 공개 통로 묶음
{ // 묶음 시작
    const host = "mateverse.example"; // 공개 주소
    const post = (token?: string) => POST(new Request(`http://${host}/api/chat`, { method: "POST", headers: { host, "content-type": "application/json", ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) }, body: JSON.stringify(request) })); // 요청 보내기
    const status = async (token?: string) => await (await GET(ask(host, token))).json() as { enabled: boolean; loginRequired?: boolean; tiers: Record<string, boolean> }; // 상태 묻기
    const reason = async (response: Response) => (await response.json() as { error: string }).error; // 거절 이유

    function open(): void // 공개를 켜고 가짜 계정 서비스와 가짜 AI 회사를 붙임
    { // 함수 시작
        vi.stubEnv("ENABLE_REAL_PROVIDERS", "true"); // 스위치 켬
        vi.stubEnv("ANTHROPIC_API_KEY", "key-a"); // Claude 열쇠
        vi.stubEnv("CHAT_ALLOW_PUBLIC", "true"); // 공개 켬
        vi.stubEnv("CHAT_USER_MESSAGES_PER_DAY", "2"); // 하루 두 번
        Object.entries(supabaseEnv).forEach(([name, value]) => vi.stubEnv(name, value)); // 계정 서비스 설정
        vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => // 가짜 바깥 서비스
        { // 함수 시작
            if (String(input).endsWith("/auth/v1/user")) // 출입증 확인
            { // 조건 시작
                const authorization = (init.headers as Record<string, string>).authorization; // 출입증
                return authorization === "Bearer token-soha" ? Response.json({ id: "soha" }) : authorization === "Bearer token-mina" ? Response.json({ id: "mina" }) : Response.json({ msg: "invalid JWT" }, { status: 401 }); // 두 사람만 확인됨
            } // 조건 종료
            return new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode("data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"왔구나.\"}}\n\n")); controller.close(); } }), { status: 200 }); // AI 회사의 답
        })); // 대역 종료
    } // 함수 종료

    it("로그인하지 않은 사람에게는 연습용으로 알리고 요청을 받지 않으며, 로그인한 사람에게만 실제 AI를 연다", async () => // 로그인한 사람만
    { // 검증 시작
        open(); // 공개 켬
        expect(await status()).toMatchObject({ enabled: false, loginRequired: true }); // 손님에게는 꺼진 것으로, 로그인하면 된다고 알림
        expect(Object.values((await status()).tiers).some(Boolean)).toBe(false); // 손님은 모든 등급이 연습용
        const guest = await post(); // 손님의 요청
        expect([guest.status, await reason(guest)]).toEqual([401, "login-required"]); // 로그인하라고 거절
        expect((await status("token-soha")).tiers.plus).toBe(true); // 로그인한 사람에게는 열림
        expect((await status("token-soha")).loginRequired).toBeUndefined(); // 로그인 안내 없음
        const reply = await post("token-soha"); // 로그인한 사람의 요청
        expect([reply.status, await reply.text()]).toEqual([200, "왔구나."]); // 실제 AI의 답
    }); // 검증 종료

    it("하루 한도를 넘으면 그 사람만 막고 언제 다시 되는지 알려 준다", async () => // 하루 한도
    { // 검증 시작
        open(); // 공개 켬(하루 두 번)
        expect([(await post("token-soha")).status, (await post("token-soha")).status]).toEqual([200, 200]); // 두 번까지
        const third = await post("token-soha"); // 세 번째
        expect([third.status, await reason(third)]).toEqual([429, "daily-limit"]); // 하루 한도
        expect(Number(third.headers.get("retry-after"))).toBeGreaterThan(0); // 다시 되는 때까지 남은 초
        expect((await post("token-mina")).status).toBe(200); // 다른 사람은 그대로 받음
    }); // 검증 종료

    it("전체 한도를 정하면 모든 사람을 합쳐 그 수까지만 받는다", async () => // 전체 한도
    { // 검증 시작
        open(); // 공개 켬
        vi.stubEnv("CHAT_TOTAL_MESSAGES_PER_DAY", "1"); // 하루 전체 한 번
        expect((await post("token-soha")).status).toBe(200); // 첫 요청
        const next = await post("token-mina"); // 다른 사람의 다음 요청
        expect([next.status, await reason(next)]).toEqual([429, "service-limit"]); // 서비스 전체 한도
    }); // 검증 종료
}); // 묶음 종료
