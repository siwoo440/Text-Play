import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { LLMServiceError, type LLMServiceErrorCode } from "@/lib/adapters/llm-service-error"; // 서비스 오류

interface HttpLLMAdapterOptions // HTTP 어댑터 설정
{ // 구조 시작
    endpoint?: string; // 내부 API 주소
    fetcher?: typeof fetch; // HTTP 요청기
} // 구조 종료

type LLMStreamFrame = { type: "chunk"; content: string } | { type: "done" }; // 스트림 프레임

function mapStatus(status: number): LLMServiceErrorCode // 상태 오류 변환
{ // 함수 시작
    if (status === 401) // 인증 상태 확인
    { // 조건 시작
        return "authentication-required"; // 인증 오류 반환
    } // 조건 종료
    if (status === 402) // 크레딧 상태 확인
    { // 조건 시작
        return "insufficient-credit"; // 크레딧 오류 반환
    } // 조건 종료
    if (status === 429) // 요청 제한 확인
    { // 조건 시작
        return "rate-limited"; // 요청 제한 반환
    } // 조건 종료
    if (status === 502 || status === 503 || status === 504) // 서비스 장애 확인
    { // 조건 시작
        return "unavailable"; // 서비스 오류 반환
    } // 조건 종료
    return "invalid-response"; // 기타 응답 오류 반환
} // 함수 종료

function parseFrame(raw: string): LLMStreamFrame // 스트림 프레임 해석
{ // 함수 시작
    try // JSON 해석 시도
    { // 시도 시작
        const value = JSON.parse(raw) as unknown; // JSON 값 생성
        if (typeof value !== "object" || value === null || !("type" in value)) // 객체 구조 확인
        { // 조건 시작
            throw new LLMServiceError("invalid-response"); // 구조 오류 발생
        } // 조건 종료
        const frame = value as Record<string, unknown>; // 프레임 객체 변환
        if (frame.type === "done") // 완료 프레임 확인
        { // 조건 시작
            return { type: "done" }; // 완료 프레임 반환
        } // 조건 종료
        if (frame.type === "chunk" && typeof frame.content === "string") // 조각 프레임 확인
        { // 조건 시작
            return { type: "chunk", content: frame.content }; // 조각 프레임 반환
        } // 조건 종료
        throw new LLMServiceError("invalid-response"); // 형식 오류 발생
    } // 시도 종료
    catch (error) // JSON 오류 처리
    { // 오류 시작
        if (error instanceof LLMServiceError) // 서비스 오류 확인
        { // 조건 시작
            throw error; // 기존 오류 전달
        } // 조건 종료
        throw new LLMServiceError("invalid-response"); // 응답 오류 변환
    } // 오류 종료
} // 함수 종료

function isAbortError(error: unknown): error is DOMException // 중단 오류 확인
{ // 함수 시작
    return error instanceof DOMException && error.name === "AbortError"; // 중단 여부 반환
} // 함수 종료

function mapBodyError(error: unknown): Error // 본문 오류 변환
{ // 함수 시작
    if (error instanceof LLMServiceError || isAbortError(error)) // 기존 오류 확인
    { // 조건 시작
        return error; // 기존 오류 반환
    } // 조건 종료
    if (error instanceof TypeError) // 연결 오류 확인
    { // 조건 시작
        return new LLMServiceError("unavailable"); // 서비스 오류 반환
    } // 조건 종료
    return new LLMServiceError("invalid-response"); // 응답 오류 반환
} // 함수 종료

export class HttpLLMAdapter implements LLMAdapter // HTTP LLM 어댑터
{ // 클래스 시작
    private readonly endpoint: string; // 내부 API 주소
    private readonly fetcher: typeof fetch; // HTTP 요청기

    public constructor(options: HttpLLMAdapterOptions = {}) // 생성자
    { // 생성자 시작
        this.endpoint = options.endpoint ?? "/api/llm"; // API 주소 설정
        this.fetcher = options.fetcher ?? fetch; // 요청기 설정
    } // 생성자 종료

    private async request(mode: "chat" | "structured" | "summary", input: LLMInput | StructuredLLMInput | SummaryInput, signal?: AbortSignal): Promise<Response> // 내부 요청 실행
    { // 함수 시작
        try // 요청 시도
        { // 시도 시작
            const response = await this.fetcher(this.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, input }), signal }); // 서버 요청
            if (!response.ok) // 실패 응답 확인
            { // 조건 시작
                throw new LLMServiceError(mapStatus(response.status)); // 상태 오류 발생
            } // 조건 종료
            return response; // 성공 응답 반환
        } // 시도 종료
        catch (error) // 요청 오류 처리
        { // 오류 시작
            if (error instanceof LLMServiceError || isAbortError(error)) // 기존 오류 확인
            { // 조건 시작
                throw error; // 기존 오류 전달
            } // 조건 종료
            throw new LLMServiceError("unavailable"); // 네트워크 오류 변환
        } // 오류 종료
    } // 함수 종료

    private async *stream(mode: "chat" | "structured", input: LLMInput | StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string> // 스트림 요청 처리
    { // 함수 시작
        const response = await this.request(mode, input, signal); // HTTP 응답 요청
        if (response.body === null) // 응답 본문 확인
        { // 조건 시작
            throw new LLMServiceError("invalid-response"); // 빈 응답 오류 발생
        } // 조건 종료
        const reader = response.body.getReader(); // 스트림 읽기 도구
        const decoder = new TextDecoder(); // 문자 해석기
        let buffer = ""; // 미완성 줄 저장
        let completed = false; // 완료 상태
        let succeeded = false; // 전체 처리 성공 상태
        try // 본문 처리 시도
        { // 시도 시작
            while (true) // 스트림 반복
            { // 조건 시작
                const part = await reader.read(); // 다음 조각 읽기
                if (part.done) // 스트림 종료 확인
                { // 조건 시작
                    buffer += decoder.decode(); // 남은 문자 반영
                    break; // 반복 종료
                } // 조건 종료
                buffer += decoder.decode(part.value, { stream: true }); // 문자 조각 누적
                let lineEnd = buffer.indexOf("\n"); // 줄 끝 위치
                while (lineEnd >= 0) // 완성 줄 반복
                { // 반복 시작
                    const line = buffer.slice(0, lineEnd).replace(/\r$/, "").trim(); // 현재 줄 정리
                    buffer = buffer.slice(lineEnd + 1); // 처리 줄 제거
                    if (line.length > 0) // 빈 줄 제외
                    { // 기타 시작
                        const frame = parseFrame(line); // 프레임 해석
                        if (frame.type === "done") // 완료 프레임 확인
                        { // 조건 시작
                            completed = true; // 완료 상태 반영
                        } // 조건 종료
                        else if (!completed) // 완료 전 조각 확인
                        { // 조건 시작
                            yield frame.content; // 텍스트 조각 전달
                        } // 조건 종료
                        else // 완료 뒤 조각 처리
                        { // 기타 시작
                            throw new LLMServiceError("invalid-response"); // 순서 오류 발생
                        } // 기타 종료
                    } // 기타 종료
                    lineEnd = buffer.indexOf("\n"); // 다음 줄 위치
                } // 반복 종료
            } // 반복 종료
            const lastLine = buffer.replace(/\r$/, "").trim(); // 마지막 줄 정리
            if (lastLine.length > 0) // 마지막 줄 확인
            { // 조건 시작
                const frame = parseFrame(lastLine); // 마지막 프레임 해석
                if (frame.type === "done") // 완료 프레임 확인
                { // 조건 시작
                    completed = true; // 완료 상태 반영
                } // 조건 종료
                else if (!completed) // 완료 전 조각 확인
                { // 조건 시작
                    yield frame.content; // 마지막 조각 전달
                } // 조건 종료
                else // 완료 뒤 조각 처리
                { // 기타 시작
                    throw new LLMServiceError("invalid-response"); // 순서 오류 발생
                } // 기타 종료
            } // 조건 종료
            if (!completed) // 완료 프레임 확인
            { // 기타 시작
                throw new LLMServiceError("invalid-response"); // 불완전 스트림 오류 발생
            } // 기타 종료
            succeeded = true; // 전체 처리 성공 반영
        } // 시도 종료
        catch (error) // 본문 오류 처리
        { // 오류 시작
            throw mapBodyError(error); // 본문 오류 전달
        } // 오류 종료
        finally // 스트림 정리
        { // 종료 시작
            if (!succeeded) // 비정상 종료 확인
            { // 조건 시작
                try // 스트림 취소 시도
                { // 시도 시작
                    await reader.cancel(); // 남은 응답 취소
                } // 시도 종료
                catch // 취소 오류 처리
                { // 오류 시작
                    // 기존 본문 오류 보존
                } // 오류 종료
            } // 조건 종료
            reader.releaseLock(); // 읽기 잠금 해제
        } // 종료 끝
    } // 함수 종료

    public streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string> // 일반 응답 스트림
    { // 함수 시작
        return this.stream("chat", input, signal); // 일반 스트림 반환
    } // 함수 종료

    public streamStructuredReply(input: StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string> // 구조화 응답 스트림
    { // 함수 시작
        return this.stream("structured", input, signal); // 구조화 스트림 반환
    } // 함수 종료

    public async summarizeConversation(input: SummaryInput, signal?: AbortSignal): Promise<string> // 대화 요약
    { // 함수 시작
        const response = await this.request("summary", input, signal); // 요약 응답 요청
        try // JSON 해석 시도
        { // 시도 시작
            const value = await response.json() as unknown; // JSON 응답 읽기
            if (typeof value !== "object" || value === null || !("summary" in value) || typeof (value as Record<string, unknown>).summary !== "string") // 요약 구조 확인
            { // 조건 시작
                throw new LLMServiceError("invalid-response"); // 요약 오류 발생
            } // 조건 종료
            return (value as { summary: string }).summary; // 요약 반환
        } // 시도 종료
        catch (error) // JSON 오류 처리
        { // 오류 시작
            throw mapBodyError(error); // 본문 오류 전달
        } // 오류 종료
    } // 함수 종료
} // 클래스 종료
