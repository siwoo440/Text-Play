import { describe, expect, it } from "vitest"; // 테스트 도구
import { HttpLLMAdapter } from "@/lib/adapters/http-llm-adapter"; // HTTP 어댑터
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류
import type { StructuredLLMInput } from "@/lib/adapters/llm-adapter"; // 구조화 입력

const structuredInput: StructuredLLMInput = // 구조화 입력 기준값
{ // 객체 시작
    system: "게임 규칙", // 시스템 규칙
    context: "현재 장면", // 게임 문맥
    userInput: "문을 연다", // 사용자 입력
    responseSchema: "JSON", // 응답 규격
}; // 객체 종료

function createStreamResponse(parts: string[], status = 200): Response // 스트림 응답 생성기
{ // 함수 시작
    const encoder = new TextEncoder(); // 문자 인코더
    const stream = new ReadableStream<Uint8Array> // 읽기 스트림
    ({ // 스트림 설정 시작
        start(controller) // 시작 처리
        { // 함수 시작
            parts.forEach((part) => controller.enqueue(encoder.encode(part))); // 조각 전달
            controller.close(); // 스트림 종료
        }, // 함수 종료
    }); // 스트림 생성 종료
    return new Response(stream, { status, headers: { "content-type": "application/x-ndjson" } }); // HTTP 응답 반환
} // 함수 종료

async function collect(stream: AsyncIterable<string>): Promise<string[]> // 스트림 수집기
{ // 함수 시작
    const chunks: string[] = []; // 조각 목록
    for await (const chunk of stream) // 조각 순회
    { // 순회 시작
        chunks.push(chunk); // 조각 저장
    } // 순회 종료
    return chunks; // 결과 반환
} // 함수 종료

describe("HTTP LLM 어댑터", () => // 어댑터 검증 묶음
{ // 묶음 시작
    it("여러 네트워크 조각으로 나뉜 NDJSON을 순서대로 전달한다", async () => // 분할 스트림 검증
    { // 테스트 시작
        let capturedBody = ""; // 요청 본문 기록
        const controller = new AbortController(); // 중단 제어기
        let capturedSignal: AbortSignal | null = null; // 요청 신호 기록
        const fetcher = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => // 가짜 외부 요청
        { // 함수 시작
            capturedBody = String(init?.body ?? ""); // 요청 본문 저장
            capturedSignal = init?.signal ?? null; // 요청 신호 저장
            return createStreamResponse(["{\"type\":\"ch", "unk\",\"content\":\"달빛\"}\n{\"type\":\"chunk\",\"content\":\" 숲\"}\n{\"type\":\"done\"}\n"]); // 분할 응답 반환
        }; // 함수 종료
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        const chunks = await collect(adapter.streamStructuredReply(structuredInput, controller.signal)); // 응답 수집
        expect(chunks).toEqual(["달빛", " 숲"]); // 조각 순서 확인
        expect(JSON.parse(capturedBody)).toEqual({ mode: "structured", input: structuredInput }); // 요청 계약 확인
        expect(capturedSignal).toBe(controller.signal); // 중단 신호 확인
    }); // 테스트 종료

    it("마지막 완료 프레임에 개행이 없어도 정상 종료한다", async () => // 마지막 줄 검증
    { // 테스트 시작
        const fetcher = async (): Promise<Response> => createStreamResponse(["{\"type\":\"chunk\",\"content\":\"기록\"}\n{\"type\":\"done\"}"]); // 무개행 응답
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        await expect(collect(adapter.streamStructuredReply(structuredInput))).resolves.toEqual(["기록"]); // 응답 확인
    }); // 테스트 종료

    it.each([ // 상태 코드 목록
        [401, "authentication-required"], // 인증 오류
        [402, "insufficient-credit"], // 크레딧 오류
        [429, "rate-limited"], // 요청 제한 오류
        [503, "unavailable"], // 서비스 오류
    ] as const)("HTTP %s를 %s 오류로 변환한다", async (status, code) => // 상태 오류 검증
    { // 테스트 시작
        const fetcher = async (): Promise<Response> => new Response(null, { status }); // 오류 응답
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        const request = collect(adapter.streamStructuredReply(structuredInput)); // 응답 요청
        await expect(request).rejects.toMatchObject<Partial<LLMServiceError>>({ code }); // 오류 코드 확인
    }); // 테스트 종료

    it("완료 프레임이 없는 스트림을 거부한다", async () => // 불완전 응답 검증
    { // 테스트 시작
        const fetcher = async (): Promise<Response> => createStreamResponse(["{\"type\":\"chunk\",\"content\":\"미완료\"}\n"]); // 불완전 응답
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        await expect(collect(adapter.streamStructuredReply(structuredInput))).rejects.toMatchObject<Partial<LLMServiceError>>({ code: "invalid-response" }); // 거부 확인
    }); // 테스트 종료

    it("스트림 읽기 중 연결 실패를 서비스 장애로 변환한다", async () => // 중간 연결 실패 검증
    { // 테스트 시작
        const stream = new ReadableStream<Uint8Array> // 실패 스트림
        ({ // 스트림 설정 시작
            start(controller) // 시작 처리
            { // 함수 시작
                controller.error(new TypeError("connection lost")); // 연결 실패 발생
            }, // 함수 종료
        }); // 스트림 생성 종료
        const fetcher = async (): Promise<Response> => new Response(stream); // 실패 응답 생성
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        await expect(collect(adapter.streamStructuredReply(structuredInput))).rejects.toMatchObject<Partial<LLMServiceError>>({ code: "unavailable" }); // 서비스 오류 확인
    }); // 테스트 종료

    it("잘못된 스트림 실패 시 본문을 취소하고 잠금을 해제한다", async () => // 실패 정리 검증
    { // 테스트 시작
        let canceled = false; // 취소 상태
        const encoder = new TextEncoder(); // 문자 인코더
        const stream = new ReadableStream<Uint8Array> // 열린 스트림
        ({ // 스트림 설정 시작
            start(controller) // 시작 처리
            { // 함수 시작
                controller.enqueue(encoder.encode("잘못된 JSON\n")); // 잘못된 프레임 전달
            }, // 함수 종료
            cancel() // 취소 처리
            { // 함수 시작
                canceled = true; // 취소 상태 반영
            }, // 함수 종료
        }); // 스트림 생성 종료
        const fetcher = async (): Promise<Response> => new Response(stream); // 열린 응답 생성
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        await expect(collect(adapter.streamStructuredReply(structuredInput))).rejects.toMatchObject<Partial<LLMServiceError>>({ code: "invalid-response" }); // 응답 오류 확인
        expect(canceled).toBe(true); // 스트림 취소 확인
        expect(stream.locked).toBe(false); // 잠금 해제 확인
    }); // 테스트 종료

    it("완료 프레임 뒤 잘못된 데이터가 오면 본문을 취소한다", async () => // 완료 뒤 실패 정리 검증
    { // 테스트 시작
        let canceled = false; // 취소 상태
        const encoder = new TextEncoder(); // 문자 인코더
        const stream = new ReadableStream<Uint8Array> // 열린 스트림
        ({ // 스트림 설정 시작
            start(controller) // 시작 처리
            { // 함수 시작
                controller.enqueue(encoder.encode('{"type":"done"}\n잘못된 JSON\n')); // 완료 뒤 잘못된 프레임 전달
            }, // 함수 종료
            cancel() // 취소 처리
            { // 함수 시작
                canceled = true; // 취소 상태 반영
            }, // 함수 종료
        }); // 스트림 생성 종료
        const fetcher = async (): Promise<Response> => new Response(stream); // 열린 응답 생성
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        await expect(collect(adapter.streamStructuredReply(structuredInput))).rejects.toMatchObject<Partial<LLMServiceError>>({ code: "invalid-response" }); // 응답 오류 확인
        expect(canceled).toBe(true); // 스트림 취소 확인
        expect(stream.locked).toBe(false); // 잠금 해제 확인
    }); // 테스트 종료

    it("소비자가 조기 종료하면 본문을 취소하고 잠금을 해제한다", async () => // 조기 종료 정리 검증
    { // 테스트 시작
        let canceled = false; // 취소 상태
        const encoder = new TextEncoder(); // 문자 인코더
        const stream = new ReadableStream<Uint8Array> // 열린 스트림
        ({ // 스트림 설정 시작
            start(controller) // 시작 처리
            { // 함수 시작
                controller.enqueue(encoder.encode('{"type":"chunk","content":"첫 조각"}\n')); // 첫 프레임 전달
            }, // 함수 종료
            cancel() // 취소 처리
            { // 함수 시작
                canceled = true; // 취소 상태 반영
            }, // 함수 종료
        }); // 스트림 생성 종료
        const fetcher = async (): Promise<Response> => new Response(stream); // 열린 응답 생성
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        const iterator = adapter.streamStructuredReply(structuredInput)[Symbol.asyncIterator](); // 응답 반복기 생성
        await iterator.next(); // 첫 조각 소비
        await iterator.return?.(); // 소비 조기 종료
        expect(canceled).toBe(true); // 스트림 취소 확인
        expect(stream.locked).toBe(false); // 잠금 해제 확인
    }); // 테스트 종료

    it("대화 요약 JSON을 반환한다", async () => // 요약 응답 검증
    { // 테스트 시작
        const fetcher = async (): Promise<Response> => new Response(JSON.stringify({ summary: "달빛 숲의 선택" }), { status: 200, headers: { "content-type": "application/json" } }); // 요약 응답
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        const summary = await adapter.summarizeConversation({ conversation: { id: "conversation", characterId: "character", userId: "user", title: "기록", relationshipLevel: 0, relationshipStage: "첫 만남", emotion: "중립", currentScene: "", lastMessage: "", archivedAt: null, createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" }, messages: [] }); // 요약 실행
        expect(summary).toBe("달빛 숲의 선택"); // 요약 확인
    }); // 테스트 종료

    it("요약 본문 중단 오류를 그대로 전달한다", async () => // 요약 중단 검증
    { // 테스트 시작
        const stream = new ReadableStream<Uint8Array> // 중단 스트림
        ({ // 스트림 설정 시작
            start(controller) // 시작 처리
            { // 함수 시작
                controller.error(new DOMException("aborted", "AbortError")); // 중단 오류 발생
            }, // 함수 종료
        }); // 스트림 생성 종료
        const fetcher = async (): Promise<Response> => new Response(stream); // 중단 응답 생성
        const adapter = new HttpLLMAdapter({ fetcher }); // 어댑터 생성
        const summary = adapter.summarizeConversation({ conversation: { id: "conversation", characterId: "character", userId: "user", title: "기록", relationshipLevel: 0, relationshipStage: "첫 만남", emotion: "중립", currentScene: "", lastMessage: "", archivedAt: null, createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z" }, messages: [] }); // 요약 실행
        await expect(summary).rejects.toMatchObject({ name: "AbortError" }); // 중단 오류 확인
    }); // 테스트 종료
}); // 묶음 종료
