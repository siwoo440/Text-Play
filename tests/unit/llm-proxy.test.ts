import { describe, expect, it } from "vitest"; // 테스트 도구
import { proxyLLMRequest } from "@/lib/server/llm-proxy"; // LLM 프록시

function createRequest(body: string, headers: Record<string, string> = {}): Request // 요청 생성기
{ // 함수 시작
    return new Request("http://localhost/api/llm", { method: "POST", headers: { "content-type": "application/json", ...headers }, body }); // 요청 반환
} // 함수 종료

describe("LLM 서버 프록시", () => // 프록시 검증 묶음
{ // 묶음 시작
    it("외부 서버가 설정되지 않으면 호출하지 않고 503을 반환한다", async () => // 미설정 검증
    { // 테스트 시작
        let called = false; // 호출 상태
        const fetcher = async (): Promise<Response> => // 가짜 요청기
        { // 함수 시작
            called = true; // 호출 기록
            return new Response(null); // 빈 응답 반환
        }; // 함수 종료
        const request = createRequest(JSON.stringify({ mode: "structured", input: {} })); // 내부 요청 생성
        const response = await proxyLLMRequest(request, {}, fetcher); // 프록시 실행
        expect(response.status).toBe(503); // 상태 확인
        expect(called).toBe(false); // 외부 미호출 확인
    }); // 테스트 종료

    it("지원하지 않는 모드를 외부 호출 전에 거부한다", async () => // 모드 검증
    { // 테스트 시작
        let called = false; // 호출 상태
        const fetcher = async (): Promise<Response> => // 가짜 요청기
        { // 함수 시작
            called = true; // 호출 기록
            return new Response(null); // 빈 응답 반환
        }; // 함수 종료
        const request = createRequest(JSON.stringify({ mode: "admin", input: {} })); // 잘못된 요청 생성
        const response = await proxyLLMRequest(request, { endpoint: "https://llm.example.test" }, fetcher); // 프록시 실행
        expect(response.status).toBe(400); // 상태 확인
        expect(called).toBe(false); // 외부 미호출 확인
    }); // 테스트 종료

    it.each([ // 잘못된 계약 목록
        { label: "배열 모드", body: { mode: ["chat"], input: {} } }, // 배열 모드 요청
        { label: "빈 구조화 입력", body: { mode: "structured", input: {} } }, // 빈 구조화 요청
        { label: "문자열 메시지", body: { mode: "chat", input: { character: {}, conversation: {}, messages: "잘못된 메시지" } } }, // 문자열 메시지 요청
        { label: "잘못된 요약 입력", body: { mode: "summary", input: { conversation: {}, messages: "잘못된 메시지" } } }, // 잘못된 요약 요청
    ])("$label 계약을 외부 호출 전에 거부한다", async ({ body }) => // 모드별 계약 검증
    { // 테스트 시작
        let called = false; // 호출 상태
        const fetcher = async (): Promise<Response> => // 가짜 요청기
        { // 함수 시작
            called = true; // 호출 기록
            return new Response(null); // 빈 응답 반환
        }; // 함수 종료
        const request = createRequest(JSON.stringify(body)); // 잘못된 요청 생성
        const response = await proxyLLMRequest(request, { endpoint: "https://llm.example.test" }, fetcher); // 프록시 실행
        expect(response.status).toBe(400); // 상태 확인
        expect(called).toBe(false); // 외부 미호출 확인
    }); // 테스트 종료

    it("64KiB를 넘는 본문을 외부 호출 전에 거부한다", async () => // 용량 검증
    { // 테스트 시작
        let called = false; // 호출 상태
        const fetcher = async (): Promise<Response> => // 가짜 요청기
        { // 함수 시작
            called = true; // 호출 기록
            return new Response(null); // 빈 응답 반환
        }; // 함수 종료
        const request = createRequest(JSON.stringify({ mode: "chat", input: { content: "가".repeat(70_000) } })); // 과대 요청 생성
        const response = await proxyLLMRequest(request, { endpoint: "https://llm.example.test" }, fetcher); // 프록시 실행
        expect(response.status).toBe(413); // 상태 확인
        expect(called).toBe(false); // 외부 미호출 확인
    }); // 테스트 종료

    it("검증된 본문과 서버 토큰만 외부 엔드포인트로 전달한다", async () => // 전달 검증
    { // 테스트 시작
        let capturedUrl = ""; // 요청 주소 기록
        let capturedInit: RequestInit | undefined; // 요청 설정 기록
        const fetcher = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => // 가짜 외부 요청
        { // 함수 시작
            capturedUrl = String(input); // 주소 저장
            capturedInit = init; // 설정 저장
            return new Response('{"type":"chunk","content":"달빛"}\n{"type":"done"}\n', { status: 200, headers: { "content-type": "application/x-ndjson" } }); // 외부 응답 반환
        }; // 함수 종료
        const body = JSON.stringify({ mode: "structured", input: { system: "게임 규칙", context: "현재 장면", userInput: "문을 연다", responseSchema: "JSON" } }); // 정상 본문
        const request = createRequest(body, { authorization: "Bearer browser-secret", cookie: "session=browser" }); // 민감 헤더 포함 요청
        const response = await proxyLLMRequest(request, { endpoint: "https://llm.example.test/v1/respond", token: "server-token" }, fetcher); // 프록시 실행
        const headers = new Headers(capturedInit?.headers); // 외부 헤더 생성
        expect(capturedUrl).toBe("https://llm.example.test/v1/respond"); // 정확한 주소 확인
        expect(capturedInit?.body).toBe(body); // 본문 확인
        expect(headers.get("authorization")).toBe("Bearer server-token"); // 서버 토큰 확인
        expect(headers.get("cookie")).toBeNull(); // 브라우저 쿠키 차단 확인
        expect(await response.text()).toContain('"content":"달빛"'); // 스트림 전달 확인
        expect(response.headers.get("content-type")).toContain("application/x-ndjson"); // 콘텐츠 유형 확인
    }); // 테스트 종료
}); // 묶음 종료
