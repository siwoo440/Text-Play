export interface LLMProxyConfiguration // 프록시 설정
{ // 구조 시작
    endpoint?: string; // 외부 API 주소
    token?: string; // 서버 인증 토큰
    maxBodyBytes?: number; // 본문 최대 크기
} // 구조 종료

const DEFAULT_MAX_BODY_BYTES = 65_536; // 기본 본문 제한

function jsonError(status: number, code: string): Response // JSON 오류 생성
{ // 함수 시작
    return Response.json({ error: code }, { status }); // 오류 응답 반환
} // 함수 종료

function isRecord(value: unknown): value is Record<string, unknown> // 객체 확인
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부 반환
} // 함수 종료

function hasString(record: Record<string, unknown>, key: string): boolean // 문자열 필드 확인
{ // 함수 시작
    return typeof record[key] === "string"; // 문자열 여부 반환
} // 함수 종료

function hasRecord(record: Record<string, unknown>, key: string): boolean // 객체 필드 확인
{ // 함수 시작
    return isRecord(record[key]); // 객체 여부 반환
} // 함수 종료

function hasRecordArray(record: Record<string, unknown>, key: string): boolean // 객체 목록 확인
{ // 함수 시작
    const value = record[key]; // 필드 값 조회
    return Array.isArray(value) && value.every(isRecord); // 객체 목록 여부 반환
} // 함수 종료

function isValidRequest(value: unknown): boolean // 요청 구조 확인
{ // 함수 시작
    if (!isRecord(value) || typeof value.mode !== "string" || !isRecord(value.input)) // 기본 구조 확인
    { // 조건 시작
        return false; // 잘못된 요청 반환
    } // 조건 종료
    if (value.mode === "chat") // 대화 모드 확인
    { // 조건 시작
        return hasRecord(value.input, "character") && hasRecord(value.input, "conversation") && hasRecordArray(value.input, "messages"); // 대화 입력 반환
    } // 조건 종료
    if (value.mode === "structured") // 구조화 모드 확인
    { // 조건 시작
        return hasString(value.input, "system") && hasString(value.input, "context") && hasString(value.input, "userInput") && hasString(value.input, "responseSchema"); // 구조화 입력 반환
    } // 조건 종료
    if (value.mode === "summary") // 요약 모드 확인
    { // 조건 시작
        return hasRecord(value.input, "conversation") && hasRecordArray(value.input, "messages"); // 요약 입력 반환
    } // 조건 종료
    return false; // 지원하지 않는 모드 반환
} // 함수 종료

export async function proxyLLMRequest(request: Request, configuration: LLMProxyConfiguration, fetcher: typeof fetch = fetch): Promise<Response> // LLM 요청 프록시
{ // 함수 시작
    if (configuration.endpoint === undefined || configuration.endpoint.trim().length === 0) // 서버 설정 확인
    { // 조건 시작
        return jsonError(503, "llm-service-unconfigured"); // 미설정 오류 반환
    } // 조건 종료
    const body = await request.text(); // 요청 본문 읽기
    const bodyBytes = new TextEncoder().encode(body).byteLength; // 본문 바이트 계산
    if (bodyBytes > (configuration.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES)) // 본문 제한 확인
    { // 조건 시작
        return jsonError(413, "request-too-large"); // 용량 오류 반환
    } // 조건 종료
    let parsed: unknown; // 분석 본문 준비
    try // JSON 분석 시도
    { // 시도 시작
        parsed = JSON.parse(body) as unknown; // JSON 본문 분석
    } // 시도 종료
    catch // JSON 오류 처리
    { // 오류 시작
        return jsonError(400, "invalid-request"); // 형식 오류 반환
    } // 오류 종료
    if (!isValidRequest(parsed)) // 계약 확인
    { // 조건 시작
        return jsonError(400, "invalid-request"); // 계약 오류 반환
    } // 조건 종료
    const headers = new Headers({ "content-type": "application/json", accept: "application/x-ndjson, application/json" }); // 외부 요청 헤더
    if (configuration.token !== undefined && configuration.token.length > 0) // 서버 토큰 확인
    { // 조건 시작
        headers.set("authorization", `Bearer ${configuration.token}`); // 서버 인증 추가
    } // 조건 종료
    try // 외부 요청 시도
    { // 시도 시작
        const upstream = await fetcher(configuration.endpoint, { method: "POST", headers, body, signal: request.signal }); // 외부 서버 호출
        const responseHeaders = new Headers(); // 브라우저 응답 헤더
        const contentType = upstream.headers.get("content-type"); // 콘텐츠 유형 조회
        if (contentType !== null) // 콘텐츠 유형 확인
        { // 조건 시작
            responseHeaders.set("content-type", contentType); // 콘텐츠 유형 전달
        } // 조건 종료
        responseHeaders.set("cache-control", "no-store"); // 캐시 차단
        return new Response(upstream.body, { status: upstream.status, headers: responseHeaders }); // 스트림 응답 반환
    } // 시도 종료
    catch // 외부 요청 실패 처리
    { // 오류 시작
        return jsonError(502, "llm-service-unavailable"); // 연결 오류 반환
    } // 오류 종료
} // 함수 종료
