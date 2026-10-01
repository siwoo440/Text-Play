// 내장 인공지능 연결 통로: 이 PC의 실행 엔진(OpenAI 호환 llama-server)에 대화를 보내고 응답 조각을 화면으로 전달한다
// 실행 엔진을 켜고 끄는 일은 엔진 관리자(다음 단계)가 맡고, 여기서는 연결 정보가 있을 때만 통신한다
use crate::local_ai::{clear_cancelled, is_cancelled, validate_request_fields, LocalAIState, LocalAIStreamEvent, LocalChatMessage}; // 로컬 AI 공통 도구
use crate::local_runtime::{now_secs, LocalRuntimeManager}; // 엔진 관리자
use futures_util::StreamExt; // 비동기 스트림 도구
use reqwest::Client; // HTTP 통신기
use serde::Deserialize; // JSON 변환 도구
use serde_json::{json, Map, Value}; // JSON 값 도구
use std::sync::Mutex; // 공유 상태 잠금
use std::time::Duration; // 제한 시간 단위
use tauri::{ipc::Channel, State}; // Tauri 명령 도구

const BUNDLED_URL_ENV: &str = "MATE_TEXT_PLAY_BUNDLED_AI_URL"; // 개발·확인용 연결 주소 환경 변수
const BUNDLED_KEY_ENV: &str = "MATE_TEXT_PLAY_BUNDLED_AI_KEY"; // 개발·확인용 키 환경 변수
const MAX_SCHEMA_BYTES: usize = 64_000; // 응답 스키마 크기 제한
const MAX_TOKENS_LIMIT: u32 = 2_048; // 최대 생성 길이 제한
const MAX_RESPONSE_BYTES: usize = 2_000_000; // 응답 크기 제한
const RESERVED_BODY_KEYS: [&str; 5] = ["messages", "stream", "max_tokens", "response_format", "chat_template_kwargs"]; // 생성 설정이 덮어쓰면 안 되는 필드
pub(crate) const NOT_READY_MESSAGE: &str = "BUNDLED_NOT_READY: 내장 AI 실행 엔진이 아직 준비되지 않았습니다."; // 미준비 오류
pub(crate) const CANCELLED_MESSAGE: &str = "응답 생성이 중단되었습니다."; // 중단 오류

#[derive(Clone, Debug, PartialEq)] // 복사·비교 가능
pub struct BundledEndpoint // 실행 엔진 연결 정보
{ // 구조 시작
    pub base_url: String, // 로컬 주소(http://127.0.0.1:포트)
    pub api_key: Option<String>, // 일회용 키
    pub generation: Map<String, Value>, // 모델별 생성 설정
    pub chat_template_kwargs: Option<Value>, // 모델별 템플릿 인자
} // 구조 종료

#[derive(Default)] // 기본 상태(연결 정보 없음)
pub struct BundledAIState // 내장 인공지능 상태
{ // 구조 시작
    endpoint: Mutex<Option<BundledEndpoint>>, // 현재 연결 정보
} // 구조 종료

impl BundledAIState // 상태 동작
{ // 구현 시작
    pub fn from_env() -> Self // 환경 변수로 시작 상태 생성(개발·확인용)
    { // 함수 시작
        Self { endpoint: Mutex::new(endpoint_from_env_values(std::env::var(BUNDLED_URL_ENV).ok(), std::env::var(BUNDLED_KEY_ENV).ok())) } // 상태 반환
    } // 함수 종료

    #[cfg(test)] // 테스트 전용
    pub fn with_endpoint(endpoint: Option<BundledEndpoint>) -> Self // 연결 정보 지정 상태
    { // 함수 시작
        Self { endpoint: Mutex::new(endpoint) } // 상태 반환
    } // 함수 종료

    fn current(&self) -> Option<BundledEndpoint> // 현재 연결 정보 조회
    { // 함수 시작
        self.endpoint.lock().ok().and_then(|endpoint| endpoint.clone()) // 연결 정보 복사 반환
    } // 함수 종료
} // 구현 종료

#[derive(Deserialize)] // 입력 구조 변환
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct BundledChatRequest // 내장 AI 대화 요청
{ // 구조 시작
    request_id: String, // 요청 식별자
    messages: Vec<LocalChatMessage>, // 대화 메시지
    response_schema: Option<Value>, // 응답 형식 강제 스키마
    max_tokens: u32, // 최대 생성 길이
} // 구조 종료

#[derive(Debug, PartialEq)] // 비교 가능
pub(crate) enum SseItem // SSE 한 줄 해석 결과
{ // 열거 시작
    Content(String), // 응답 조각
    Finished, // 생성 완료 이유 도착
    Done, // 스트림 종료 표시
    Skip, // 무시할 줄
} // 열거 종료

pub(crate) fn is_loopback_http_url(url: &str) -> bool // 이 PC 안의 http 주소인지 확인
{ // 함수 시작
    let Some(rest) = url.strip_prefix("http://") else { return false; }; // http 확인
    let rest = rest.strip_suffix('/').unwrap_or(rest); // 끝 슬래시 제거
    let Some((host, port)) = rest.rsplit_once(':') else { return false; }; // 주소와 포트 분리
    matches!(host, "127.0.0.1" | "localhost") && !port.is_empty() && port.len() <= 5 && port.chars().all(|character| character.is_ascii_digit()) // 로컬 주소·숫자 포트 확인
} // 함수 종료

pub(crate) fn endpoint_from_env_values(url: Option<String>, key: Option<String>) -> Option<BundledEndpoint> // 환경 변수 값으로 연결 정보 생성
{ // 함수 시작
    let url = url?.trim().to_string(); // 주소 값
    if !is_loopback_http_url(&url) // 로컬 주소 확인
    { // 조건 시작
        return None; // 외부 주소 무시
    } // 조건 종료
    Some(BundledEndpoint { base_url: url.trim_end_matches('/').to_string(), api_key: key.filter(|value| !value.is_empty()), generation: Map::new(), chat_template_kwargs: None }) // 연결 정보 반환
} // 함수 종료

pub(crate) async fn resolve_endpoint(state: &BundledAIState, runtime: &LocalRuntimeManager) -> Result<BundledEndpoint, String> // 연결 정보 결정
{ // 함수 시작
    match state.current() // 확인용 연결 주소 확인
    { // 분기 시작
        Some(endpoint) => Ok(endpoint), // 지정 주소 사용
        None => runtime.ensure_ready().await, // 엔진 관리자가 켜거나 미준비 오류
    } // 분기 종료
} // 함수 종료

pub(crate) fn validate_bundled_request(request: &BundledChatRequest) -> Result<(), String> // 요청 검증
{ // 함수 시작
    let messages: Vec<(&str, &str)> = request.messages.iter().map(|message| (message.role.as_str(), message.content.as_str())).collect(); // 검증 메시지
    validate_request_fields(&request.request_id, "bundled", &messages)?; // 식별자·메시지 검증
    if request.max_tokens == 0 || request.max_tokens > MAX_TOKENS_LIMIT // 생성 길이 확인
    { // 조건 시작
        return Err("최대 생성 길이가 올바르지 않습니다.".to_string()); // 길이 오류 반환
    } // 조건 종료
    if let Some(schema) = &request.response_schema // 스키마 확인
    { // 조건 시작
        if !schema.is_object() || schema.to_string().len() > MAX_SCHEMA_BYTES // 객체·크기 확인
        { // 조건 시작
            return Err("응답 형식 스키마가 올바르지 않습니다.".to_string()); // 스키마 오류 반환
        } // 조건 종료
    } // 조건 종료
    Ok(()) // 검증 성공
} // 함수 종료

pub(crate) fn build_bundled_chat_body(request: &BundledChatRequest, endpoint: &BundledEndpoint) -> Value // OpenAI 호환 요청 본문 생성
{ // 함수 시작
    let mut body = json!({ "messages": &request.messages, "stream": true, "max_tokens": request.max_tokens }); // 기본 본문
    for (key, value) in &endpoint.generation // 생성 설정 순회
    { // 반복 시작
        if !RESERVED_BODY_KEYS.contains(&key.as_str()) // 보호 필드 확인
        { // 조건 시작
            body[key] = value.clone(); // 생성 설정 반영
        } // 조건 종료
    } // 반복 종료
    if let Some(kwargs) = &endpoint.chat_template_kwargs // 템플릿 인자 확인
    { // 조건 시작
        body["chat_template_kwargs"] = kwargs.clone(); // 템플릿 인자 반영
    } // 조건 종료
    if let Some(schema) = &request.response_schema // 형식 강제 확인
    { // 조건 시작
        body["response_format"] = json!({ "type": "json_schema", "json_schema": { "name": "text_play_response", "strict": true, "schema": schema } }); // JSON 스키마 강제
    } // 조건 종료
    body // 본문 반환
} // 함수 종료

pub(crate) fn parse_sse_line(line: &str) -> Result<SseItem, String> // SSE 한 줄 해석
{ // 함수 시작
    let Some(data) = line.strip_prefix("data:") else { return Ok(SseItem::Skip); }; // 데이터 줄 확인(빈 줄·주석·기타 무시)
    let data = data.trim(); // 앞뒤 공백 제거
    if data == "[DONE]" // 종료 표시 확인
    { // 조건 시작
        return Ok(SseItem::Done); // 종료 반환
    } // 조건 종료
    let frame: Value = serde_json::from_str(data).map_err(|_| "내장 AI 응답 형식이 올바르지 않습니다.".to_string())?; // JSON 해석
    if let Some(error) = frame.get("error") // 서버 오류 확인
    { // 조건 시작
        return Err(error.get("message").and_then(Value::as_str).unwrap_or("내장 AI가 오류를 보냈습니다.").to_string()); // 오류 전달
    } // 조건 종료
    let choice = &frame["choices"][0]; // 첫 선택지
    if let Some(content) = choice["delta"]["content"].as_str().filter(|content| !content.is_empty()) // 응답 조각 확인
    { // 조건 시작
        return Ok(SseItem::Content(content.to_string())); // 조각 반환
    } // 조건 종료
    if choice["finish_reason"].is_string() // 완료 이유 확인
    { // 조건 시작
        return Ok(SseItem::Finished); // 완료 반환
    } // 조건 종료
    Ok(SseItem::Skip) // 무시 반환
} // 함수 종료

pub(crate) fn build_bundled_client() -> Result<Client, String> // 실행 엔진 통신기 생성
{ // 함수 시작
    Client::builder() // 통신기 설정 시작
        .no_proxy() // 시스템 프록시 우회
        .redirect(reqwest::redirect::Policy::none()) // 우회 연결 차단
        .connect_timeout(Duration::from_secs(3)) // 연결 제한 시간
        .timeout(Duration::from_secs(600)) // CPU 생성까지 고려한 전체 제한 시간
        .build() // 통신기 생성
        .map_err(|_| "내장 AI 통신기를 만들지 못했습니다.".to_string()) // 생성 오류 변환
} // 함수 종료

pub(crate) async fn stream_openai_chat<F, C>(client: &Client, endpoint: &BundledEndpoint, body: &Value, mut emit: F, cancelled: C) -> Result<(), String> // OpenAI 호환 스트림 전달
where // 함수 제약
    F: FnMut(String) -> Result<(), String>, // 조각 전달기
    C: Fn() -> bool, // 중단 확인기
{ // 함수 시작
    let mut request = client.post(format!("{}/v1/chat/completions", endpoint.base_url)).json(body); // 대화 요청 준비
    if let Some(key) = &endpoint.api_key // 키 확인
    { // 조건 시작
        request = request.bearer_auth(key); // 일회용 키 첨부
    } // 조건 종료
    let response = request.send().await.map_err(|_| "내장 AI 실행 엔진에 연결하지 못했습니다.".to_string())?; // 요청 전송
    if !response.status().is_success() // 상태 코드 확인
    { // 조건 시작
        return Err(format!("내장 AI가 요청을 거부했습니다({}).", response.status().as_u16())); // 거부 오류 반환
    } // 조건 종료
    let mut stream = response.bytes_stream(); // 응답 바이트 스트림
    let mut buffer: Vec<u8> = Vec::new(); // 미완성 줄 버퍼
    let mut received_bytes = 0usize; // 수신 크기
    let mut finished = false; // 완료 이유 도착 여부
    while let Some(part) = stream.next().await // 응답 조각 순회
    { // 반복 시작
        if cancelled() // 중단 확인
        { // 조건 시작
            return Err(CANCELLED_MESSAGE.to_string()); // 중단 오류 반환
        } // 조건 종료
        let bytes = part.map_err(|_| "내장 AI 응답을 읽지 못했습니다.".to_string())?; // 바이트 조각
        received_bytes = received_bytes.saturating_add(bytes.len()); // 수신 크기 누적
        if received_bytes > MAX_RESPONSE_BYTES // 응답 크기 확인
        { // 조건 시작
            return Err("내장 AI 응답이 허용 크기를 넘었습니다.".to_string()); // 크기 오류 반환
        } // 조건 종료
        buffer.extend_from_slice(&bytes); // 바이트 누적
        while let Some(line_end) = buffer.iter().position(|byte| *byte == b'\n') // 완성 줄 순회
        { // 반복 시작
            let line_bytes: Vec<u8> = buffer.drain(..=line_end).collect(); // 현재 줄 분리
            let line = std::str::from_utf8(&line_bytes).map_err(|_| "내장 AI 응답 문자가 올바르지 않습니다.".to_string())?.trim(); // UTF-8 줄 변환
            match parse_sse_line(line)? // 줄 해석
            { // 분기 시작
                SseItem::Content(content) => emit(content)?, // 조각 전달
                SseItem::Finished => finished = true, // 완료 이유 기록
                SseItem::Done => return Ok(()), // 정상 종료
                SseItem::Skip => {} // 무시
            } // 분기 종료
        } // 반복 종료
    } // 반복 종료
    if finished // 완료 이유만 받고 끝난 경우
    { // 조건 시작
        return Ok(()); // 정상 종료
    } // 조건 종료
    Err("내장 AI 응답이 완료되지 않았습니다.".to_string()) // 미완료 오류 반환
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub async fn stream_bundled_chat(request: BundledChatRequest, on_event: Channel<LocalAIStreamEvent>, bundled: State<'_, BundledAIState>, local: State<'_, LocalAIState>, runtime: State<'_, LocalRuntimeManager>) -> Result<(), String> // 내장 AI 대화 스트림 명령
{ // 함수 시작
    validate_bundled_request(&request)?; // 요청 검증
    let endpoint = resolve_endpoint(&bundled, &runtime).await?; // 연결 정보 확인(필요하면 엔진 켜기)
    runtime.touch(now_secs()); // 사용 시각 기록
    if is_cancelled(&local, &request.request_id) // 사전 중단 확인
    { // 조건 시작
        clear_cancelled(&local, &request.request_id); // 중단 상태 정리
        return Err(CANCELLED_MESSAGE.to_string()); // 중단 오류 반환
    } // 조건 종료
    let client = build_bundled_client()?; // 통신기 생성
    let body = build_bundled_chat_body(&request, &endpoint); // 요청 본문
    let result = stream_openai_chat(&client, &endpoint, &body, |content| on_event.send(LocalAIStreamEvent::Chunk { content }).map_err(|_| "화면에 응답을 전달하지 못했습니다.".to_string()), || is_cancelled(&local, &request.request_id)).await; // 스트림 전달
    clear_cancelled(&local, &request.request_id); // 중단 상태 정리
    runtime.touch(now_secs()); // 사용 시각 다시 기록(긴 생성 뒤 바로 내리지 않도록)
    result?; // 스트림 오류 전달
    on_event.send(LocalAIStreamEvent::Done).map_err(|_| "화면에 완료 상태를 전달하지 못했습니다.".to_string()) // 완료 사건 전송
} // 함수 종료

#[cfg(test)] // 테스트 전용 모듈
mod tests // 단위 테스트 모듈
{ // 모듈 시작
    use super::*; // 상위 항목 사용
    use std::io::{Read, Write}; // 시험 서버 입출력
    use std::net::TcpListener; // 시험 서버
    use std::sync::mpsc; // 요청 전달 통로

    fn endpoint(base_url: &str) -> BundledEndpoint // 시험 연결 정보
    { // 함수 시작
        let mut generation = serde_json::Map::new(); // 생성 설정
        generation.insert("temperature".to_string(), serde_json::json!(0.7)); // 온도
        BundledEndpoint { base_url: base_url.to_string(), api_key: Some("key-1".to_string()), generation, chat_template_kwargs: Some(serde_json::json!({ "enable_thinking": false })) } // 연결 정보 반환
    } // 함수 종료

    fn request(schema: Option<serde_json::Value>, max_tokens: u32) -> BundledChatRequest // 시험 요청
    { // 함수 시작
        BundledChatRequest { request_id: "request-1".to_string(), messages: vec![LocalChatMessage { role: "user".to_string(), content: "문을 연다".to_string() }], response_schema: schema, max_tokens } // 요청 반환
    } // 함수 종료

    #[test] // 테스트 표시
    fn only_loopback_http_addresses_are_accepted() // 로컬 주소 제한 검증
    { // 함수 시작
        assert!(is_loopback_http_url("http://127.0.0.1:8765")); // 숫자 로컬 주소 허용
        assert!(is_loopback_http_url("http://localhost:8765/")); // 이름 로컬 주소 허용
        assert!(!is_loopback_http_url("https://127.0.0.1:8765")); // 암호화 주소 거부(로컬 엔진은 http)
        assert!(!is_loopback_http_url("http://192.168.0.2:8765")); // 다른 PC 거부
        assert!(!is_loopback_http_url("http://127.0.0.1.evil.com:8765")); // 위장 주소 거부
        assert!(!is_loopback_http_url("http://127.0.0.1:8765/v1")); // 경로 포함 거부
        assert!(!is_loopback_http_url("http://127.0.0.1")); // 포트 없음 거부
    } // 함수 종료

    #[test] // 테스트 표시
    fn environment_values_create_an_endpoint_only_for_loopback_addresses() // 환경 변수 연결 검증
    { // 함수 시작
        let created = endpoint_from_env_values(Some("http://127.0.0.1:8765/".to_string()), Some("secret".to_string())).expect("연결 정보"); // 로컬 주소 연결
        assert_eq!(created.base_url, "http://127.0.0.1:8765"); // 끝 슬래시 제거 확인
        assert_eq!(created.api_key, Some("secret".to_string())); // 키 확인
        assert!(endpoint_from_env_values(Some("http://10.0.0.1:8765".to_string()), None).is_none()); // 외부 주소 무시
        assert!(endpoint_from_env_values(None, None).is_none()); // 값 없음 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn missing_engine_is_reported_as_not_ready() // 실행 엔진 미준비 검증
    { // 함수 시작
        struct NoLauncher; // 실행하지 않는 실행기
        impl crate::local_runtime::ProcessLauncher for NoLauncher // 실행기 동작
        { // 구현 시작
            fn list_devices(&self, _program: &std::path::Path) -> String { String::new() } // 장치 없음
            fn launch(&self, _program: &std::path::Path, _args: &[String], _log_path: Option<&std::path::Path>) -> Result<Box<dyn crate::local_runtime::RuntimeProcess>, String> { Err("실행 안 함".to_string()) } // 실행 실패
        } // 구현 종료
        let runtime = LocalRuntimeManager::new(crate::local_runtime::RuntimeConfig::default(), Box::new(NoLauncher), Duration::from_secs(1)); // 모델 없는 관리자
        let error = tauri::async_runtime::block_on(resolve_endpoint(&BundledAIState::default(), &runtime)).expect_err("미준비 오류"); // 연결 정보 없는 상태
        assert!(error.starts_with("BUNDLED_NOT_READY")); // 오류 표시 확인
        let given = endpoint("http://127.0.0.1:1"); // 지정 연결 정보
        assert_eq!(tauri::async_runtime::block_on(resolve_endpoint(&BundledAIState::with_endpoint(Some(given.clone())), &runtime)), Ok(given)); // 지정 주소 우선
    } // 함수 종료

    #[test] // 테스트 표시
    fn requests_with_invalid_schema_or_length_are_rejected() // 요청 검증
    { // 함수 시작
        assert!(validate_bundled_request(&request(Some(serde_json::json!({ "type": "object" })), 640)).is_ok()); // 정상 요청 허용
        assert!(validate_bundled_request(&request(None, 0)).is_err()); // 길이 0 거부
        assert!(validate_bundled_request(&request(None, 4_096)).is_err()); // 과대 길이 거부
        assert!(validate_bundled_request(&request(Some(serde_json::json!("문자열")), 640)).is_err()); // 객체가 아닌 스키마 거부
        assert!(validate_bundled_request(&request(Some(serde_json::json!({ "description": "가".repeat(70_000) })), 640)).is_err()); // 과대 스키마 거부
    } // 함수 종료

    #[test] // 테스트 표시
    fn chat_body_carries_schema_generation_settings_and_template_options() // 요청 본문 검증
    { // 함수 시작
        let body = build_bundled_chat_body(&request(Some(serde_json::json!({ "type": "object" })), 640), &endpoint("http://127.0.0.1:1")); // 본문 생성
        assert_eq!(body["stream"], serde_json::json!(true)); // 스트리밍 확인
        assert_eq!(body["max_tokens"], serde_json::json!(640)); // 최대 길이 확인
        assert_eq!(body["temperature"], serde_json::json!(0.7)); // 생성 설정 확인
        assert_eq!(body["chat_template_kwargs"], serde_json::json!({ "enable_thinking": false })); // 템플릿 인자 확인
        assert_eq!(body["response_format"], serde_json::json!({ "type": "json_schema", "json_schema": { "name": "text_play_response", "strict": true, "schema": { "type": "object" } } })); // 형식 강제 확인
        assert_eq!(body["messages"][0]["content"], serde_json::json!("문을 연다")); // 메시지 확인
        let plain = build_bundled_chat_body(&request(None, 8), &endpoint("http://127.0.0.1:1")); // 형식 강제 없는 본문
        assert!(plain.get("response_format").is_none()); // 형식 필드 없음 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn sse_lines_are_parsed_into_content_finish_and_done() // SSE 줄 해석 검증
    { // 함수 시작
        assert_eq!(parse_sse_line(r#"data: {"choices":[{"delta":{"content":"달빛"},"finish_reason":null}]}"#), Ok(SseItem::Content("달빛".to_string()))); // 조각 확인
        assert_eq!(parse_sse_line(r#"data: {"choices":[{"delta":{},"finish_reason":"stop"}]}"#), Ok(SseItem::Finished)); // 완료 이유 확인
        assert_eq!(parse_sse_line("data: [DONE]"), Ok(SseItem::Done)); // 종료 표시 확인
        assert_eq!(parse_sse_line(": keep-alive"), Ok(SseItem::Skip)); // 주석 무시
        assert_eq!(parse_sse_line(""), Ok(SseItem::Skip)); // 빈 줄 무시
        assert!(parse_sse_line(r#"data: {"error":{"message":"grammar 오류"}}"#).is_err()); // 서버 오류 전달
        assert!(parse_sse_line("data: {깨진").is_err()); // 깨진 JSON 거부
    } // 함수 종료

    fn serve_once(response: String) -> (String, mpsc::Receiver<String>) // 한 번 응답하는 시험 서버
    { // 함수 시작
        let listener = TcpListener::bind("127.0.0.1:0").expect("시험 서버"); // 임의 포트
        let address = format!("http://{}", listener.local_addr().expect("주소")); // 서버 주소
        let (sender, receiver) = mpsc::channel(); // 요청 전달 통로
        std::thread::spawn(move || // 서버 실행
        { // 실행 시작
            let (mut stream, _) = listener.accept().expect("연결"); // 연결 수락
            let mut received = Vec::new(); // 받은 바이트
            let mut buffer = [0u8; 4096]; // 읽기 버퍼
            loop // 요청 읽기
            { // 반복 시작
                let read = stream.read(&mut buffer).expect("읽기"); // 조각 읽기
                received.extend_from_slice(&buffer[..read]); // 조각 누적
                let text = String::from_utf8_lossy(&received).to_string(); // 문자 변환
                if let Some(header_end) = text.find("\r\n\r\n") // 머리 끝 확인
                { // 조건 시작
                    let length = text[..header_end].lines().find_map(|line| line.to_ascii_lowercase().strip_prefix("content-length:").map(|value| value.trim().parse::<usize>().unwrap_or(0))).unwrap_or(0); // 본문 길이
                    if received.len() >= header_end + 4 + length || read == 0 // 본문 완료 확인
                    { // 조건 시작
                        sender.send(text).expect("요청 전달"); // 요청 전달
                        break; // 읽기 종료
                    } // 조건 종료
                } // 조건 종료
            } // 반복 종료
            stream.write_all(response.as_bytes()).expect("응답 쓰기"); // 응답 전송
        }); // 실행 종료
        (address, receiver) // 주소와 통로 반환
    } // 함수 종료

    #[test] // 테스트 표시
    fn openai_compatible_stream_is_forwarded_in_order_with_bearer_key() // 스트림 전달 검증
    { // 함수 시작
        let sse = "data: {\"choices\":[{\"delta\":{\"content\":\"숲이\"},\"finish_reason\":null}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\" 깨어난다\"},\"finish_reason\":null}]}\n\ndata: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n"; // SSE 본문
        let (address, received) = serve_once(format!("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n{sse}")); // 시험 서버
        let mut chunks = Vec::new(); // 받은 조각
        let body = build_bundled_chat_body(&request(None, 8), &endpoint(&address)); // 요청 본문
        let result = tauri::async_runtime::block_on(stream_openai_chat(&build_bundled_client().expect("통신기"), &endpoint(&address), &body, |chunk| { chunks.push(chunk); Ok(()) }, || false)); // 스트림 실행
        assert_eq!(result, Ok(())); // 완료 확인
        assert_eq!(chunks, vec!["숲이".to_string(), " 깨어난다".to_string()]); // 조각 순서 확인
        let request_text = received.recv().expect("요청"); // 받은 요청
        assert!(request_text.starts_with("POST /v1/chat/completions")); // 경로 확인
        assert!(request_text.to_ascii_lowercase().contains("authorization: bearer key-1")); // 일회용 키 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn rejected_or_unfinished_streams_are_errors() // 실패 스트림 검증
    { // 함수 시작
        let (address, _received) = serve_once("HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".to_string()); // 거부 서버
        let body = build_bundled_chat_body(&request(None, 8), &endpoint(&address)); // 요청 본문
        assert!(tauri::async_runtime::block_on(stream_openai_chat(&build_bundled_client().expect("통신기"), &endpoint(&address), &body, |_| Ok(()), || false)).is_err()); // 거부 오류 확인
        let (address, _received) = serve_once("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\ndata: {\"choices\":[{\"delta\":{\"content\":\"중간\"}}]}\n\n".to_string()); // 중간에 끊긴 서버
        assert!(tauri::async_runtime::block_on(stream_openai_chat(&build_bundled_client().expect("통신기"), &endpoint(&address), &body, |_| Ok(()), || false)).is_err()); // 미완료 오류 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn cancellation_stops_the_stream() // 중단 검증
    { // 함수 시작
        let (address, _received) = serve_once("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\ndata: {\"choices\":[{\"delta\":{\"content\":\"첫\"}}]}\n\ndata: [DONE]\n\n".to_string()); // 시험 서버
        let body = build_bundled_chat_body(&request(None, 8), &endpoint(&address)); // 요청 본문
        let result = tauri::async_runtime::block_on(stream_openai_chat(&build_bundled_client().expect("통신기"), &endpoint(&address), &body, |_| Ok(()), || true)); // 중단 상태로 실행
        assert_eq!(result, Err(CANCELLED_MESSAGE.to_string())); // 중단 오류 확인
    } // 함수 종료
} // 모듈 종료
