use futures_util::StreamExt; // 비동기 스트림 도구
use reqwest::Client; // HTTP 통신기
use serde::{Deserialize, Serialize}; // JSON 변환 도구
use std::collections::HashSet; // 중단 요청 집합
use std::sync::Mutex; // 공유 상태 잠금
use std::time::Duration; // 제한 시간 단위
use tauri::{ipc::Channel, State}; // Tauri 명령 도구

const OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434"; // 고정 올라마 주소
const MAX_MESSAGE_LENGTH: usize = 20_000; // 단일 메시지 제한
const MAX_TOTAL_MESSAGE_LENGTH: usize = 200_000; // 전체 메시지 제한
const MAX_RESPONSE_BYTES: usize = 2_000_000; // 응답 크기 제한

#[derive(Default)] // 기본 상태 생성
pub struct LocalAIState // 로컬 인공지능 상태
{ // 구조 시작
    cancelled_requests: Mutex<HashSet<String>>, // 중단 요청 목록
} // 구조 종료

#[derive(Clone, Serialize)] // 출력 구조 변환
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct LocalModel // 설치 모델 구조
{ // 구조 시작
    name: String, // 모델 이름
    size: u64, // 모델 크기
    modified_at: String, // 수정 시각
} // 구조 종료

#[derive(Clone, Serialize)] // 출력 구조 변환
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct RunningLocalModel // 실행 모델 구조
{ // 구조 시작
    name: String, // 모델 이름
    size_vram: u64, // 그래픽 메모리 크기
    context_length: u64, // 문맥 길이
} // 구조 종료

#[derive(Deserialize, Serialize)] // 입출력 구조 변환
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct LocalChatMessage // 대화 메시지 구조
{ // 구조 시작
    pub(crate) role: String, // 메시지 역할
    pub(crate) content: String, // 메시지 내용
} // 구조 종료

#[derive(Deserialize)] // 입력 구조 변환
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct LocalChatRequest // 대화 요청 구조
{ // 구조 시작
    request_id: String, // 요청 식별자
    model: String, // 선택 모델
    messages: Vec<LocalChatMessage>, // 대화 메시지
    format: Option<String>, // 응답 형식
} // 구조 종료

#[derive(Clone, Serialize)] // 채널 구조 변환
#[serde(tag = "type", rename_all = "snake_case")] // 사건 구분 필드
pub enum LocalAIStreamEvent // 스트림 사건
{ // 열거 시작
    Chunk { content: String }, // 응답 조각
    Done, // 응답 완료
} // 열거 종료

#[derive(Deserialize)] // 올라마 목록 변환
struct OllamaTagsResponse // 모델 목록 응답
{ // 구조 시작
    models: Vec<OllamaTagModel>, // 설치 모델 목록
} // 구조 종료

#[derive(Deserialize)] // 올라마 모델 변환
struct OllamaTagModel // 설치 모델 응답
{ // 구조 시작
    name: String, // 모델 이름
    #[serde(default)] // 기본 크기 허용
    size: u64, // 모델 크기
    #[serde(default)] // 기본 시각 허용
    modified_at: String, // 수정 시각
} // 구조 종료

#[derive(Deserialize)] // 올라마 실행 목록 변환
struct OllamaProcessResponse // 실행 모델 목록 응답
{ // 구조 시작
    models: Vec<OllamaProcessModel>, // 실행 모델 목록
} // 구조 종료

#[derive(Deserialize)] // 올라마 실행 모델 변환
struct OllamaProcessModel // 실행 모델 응답
{ // 구조 시작
    name: String, // 모델 이름
    #[serde(default)] // 기본 그래픽 메모리 허용
    size_vram: u64, // 그래픽 메모리 크기
    #[serde(default)] // 기본 문맥 허용
    context_length: u64, // 문맥 길이
} // 구조 종료

#[derive(Deserialize)] // 올라마 스트림 변환
struct OllamaStreamFrame // 스트림 응답 구조
{ // 구조 시작
    #[serde(default)] // 빈 메시지 허용
    message: Option<OllamaStreamMessage>, // 응답 메시지
    #[serde(default)] // 기본 완료 상태
    done: bool, // 완료 상태
    #[serde(default)] // 빈 오류 허용
    error: Option<String>, // 오류 문구
} // 구조 종료

#[derive(Deserialize)] // 올라마 메시지 변환
struct OllamaStreamMessage // 스트림 메시지 구조
{ // 구조 시작
    #[serde(default)] // 빈 내용 허용
    content: String, // 응답 내용
} // 구조 종료

fn build_client() -> Result<Client, String> // HTTP 통신기 생성기
{ // 함수 시작
    Client::builder() // 통신기 설정 시작
        .no_proxy() // 시스템 프록시 우회
        .redirect(reqwest::redirect::Policy::none()) // 외부 우회 연결 차단
        .connect_timeout(Duration::from_secs(3)) // 연결 제한 시간
        .timeout(Duration::from_secs(120)) // 전체 제한 시간
        .build() // 통신기 생성
        .map_err(|_| "올라마 통신기를 만들지 못했습니다.".to_string()) // 생성 오류 변환
} // 함수 종료

pub(crate) fn validate_request_fields(request_id: &str, model: &str, messages: &[(&str, &str)]) -> Result<(), String> // 요청 값 검증기
{ // 함수 시작
    if request_id.is_empty() || request_id.len() > 128 || !request_id.chars().all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_') // 식별자 확인
    { // 조건 시작
        return Err("잘못된 요청 식별자입니다.".to_string()); // 식별자 오류 반환
    } // 조건 종료
    if model.trim().is_empty() || model.len() > 200 // 모델 이름 확인
    { // 조건 시작
        return Err("잘못된 모델 이름입니다.".to_string()); // 모델 오류 반환
    } // 조건 종료
    if messages.is_empty() || messages.len() > 100 // 메시지 개수 확인
    { // 조건 시작
        return Err("대화 메시지 개수가 올바르지 않습니다.".to_string()); // 개수 오류 반환
    } // 조건 종료
    let mut total_length = 0usize; // 전체 길이 누적값
    for (role, content) in messages // 메시지 순회
    { // 반복 시작
        if !matches!(*role, "system" | "user" | "assistant") // 역할 확인
        { // 조건 시작
            return Err("허용되지 않은 메시지 역할입니다.".to_string()); // 역할 오류 반환
        } // 조건 종료
        if content.is_empty() || content.chars().count() > MAX_MESSAGE_LENGTH // 메시지 길이 확인
        { // 조건 시작
            return Err("대화 메시지 길이가 제한을 벗어났습니다.".to_string()); // 길이 오류 반환
        } // 조건 종료
        total_length = total_length.saturating_add(content.chars().count()); // 전체 길이 누적
    } // 반복 종료
    if total_length > MAX_TOTAL_MESSAGE_LENGTH // 전체 길이 확인
    { // 조건 시작
        return Err("전체 대화 길이가 제한을 벗어났습니다.".to_string()); // 전체 길이 오류 반환
    } // 조건 종료
    Ok(()) // 검증 성공 반환
} // 함수 종료

fn parse_ollama_stream_line(line: &str) -> Result<(Option<String>, bool), String> // 스트림 줄 해석기
{ // 함수 시작
    let frame: OllamaStreamFrame = serde_json::from_str(line).map_err(|_| "올라마 응답 형식이 올바르지 않습니다.".to_string())?; // JSON 줄 해석
    if let Some(message) = frame.error // 오류 문구 확인
    { // 조건 시작
        return Err(message); // 올라마 오류 반환
    } // 조건 종료
    let content = frame.message.and_then(|message| if message.content.is_empty() { None } else { Some(message.content) }); // 빈 조각 제외
    Ok((content, frame.done)) // 조각과 완료 반환
} // 함수 종료

fn build_chat_body(request: &LocalChatRequest) -> serde_json::Value // 대화 본문 생성기
{ // 함수 시작
    let mut body = serde_json::json!({ "model": &request.model, "messages": &request.messages, "stream": true }); // 기본 요청 본문
    if let Some(format) = &request.format // 선택 형식 확인
    { // 조건 시작
        body["format"] = serde_json::Value::String(format.clone()); // 선택 형식 추가
    } // 조건 종료
    body // 요청 본문 반환
} // 함수 종료

pub(crate) fn is_cancelled(state: &LocalAIState, request_id: &str) -> bool // 중단 상태 확인기
{ // 함수 시작
    state.cancelled_requests.lock().map(|requests| requests.contains(request_id)).unwrap_or(true) // 중단 여부 반환
} // 함수 종료

pub(crate) fn clear_cancelled(state: &LocalAIState, request_id: &str) // 중단 상태 정리기
{ // 함수 시작
    if let Ok(mut requests) = state.cancelled_requests.lock() // 잠금 성공 확인
    { // 조건 시작
        requests.remove(request_id); // 중단 요청 제거
    } // 조건 종료
} // 함수 종료

async fn fetch_tags(client: &Client) -> Result<Vec<LocalModel>, String> // 설치 모델 내부 조회기
{ // 함수 시작
    let response = client.get(format!("{OLLAMA_BASE_URL}/api/tags")).send().await.map_err(|_| "올라마가 실행 중인지 확인해 주세요.".to_string())?; // 모델 목록 요청
    if !response.status().is_success() // 상태 코드 확인
    { // 조건 시작
        return Err("올라마 모델 목록을 불러오지 못했습니다.".to_string()); // 상태 오류 반환
    } // 조건 종료
    let payload: OllamaTagsResponse = response.json().await.map_err(|_| "올라마 모델 목록 형식이 올바르지 않습니다.".to_string())?; // 목록 응답 해석
    Ok(payload.models.into_iter().map(|model| LocalModel { name: model.name, size: model.size, modified_at: model.modified_at }).collect()) // 공용 모델 목록 반환
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub async fn list_local_models() -> Result<Vec<LocalModel>, String> // 설치 모델 조회 명령
{ // 함수 시작
    let client = build_client()?; // HTTP 통신기 생성
    fetch_tags(&client).await // 설치 모델 반환
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub async fn list_running_local_models() -> Result<Vec<RunningLocalModel>, String> // 실행 모델 조회 명령
{ // 함수 시작
    let client = build_client()?; // HTTP 통신기 생성
    let response = client.get(format!("{OLLAMA_BASE_URL}/api/ps")).send().await.map_err(|_| "올라마가 실행 중인지 확인해 주세요.".to_string())?; // 실행 목록 요청
    if !response.status().is_success() // 상태 코드 확인
    { // 조건 시작
        return Err("실행 중인 모델 목록을 불러오지 못했습니다.".to_string()); // 상태 오류 반환
    } // 조건 종료
    let payload: OllamaProcessResponse = response.json().await.map_err(|_| "실행 중인 모델 목록 형식이 올바르지 않습니다.".to_string())?; // 실행 목록 해석
    Ok(payload.models.into_iter().map(|model| RunningLocalModel { name: model.name, size_vram: model.size_vram, context_length: model.context_length }).collect()) // 실행 모델 반환
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub fn cancel_local_chat(request_id: String, state: State<'_, LocalAIState>) -> Result<(), String> // 대화 중단 명령
{ // 함수 시작
    if request_id.is_empty() || request_id.len() > 128 // 식별자 길이 확인
    { // 조건 시작
        return Err("잘못된 요청 식별자입니다.".to_string()); // 식별자 오류 반환
    } // 조건 종료
    state.cancelled_requests.lock().map_err(|_| "중단 상태를 저장하지 못했습니다.".to_string())?.insert(request_id); // 중단 요청 저장
    Ok(()) // 중단 저장 완료
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub async fn stream_local_chat(request: LocalChatRequest, on_event: Channel<LocalAIStreamEvent>, state: State<'_, LocalAIState>) -> Result<(), String> // 대화 스트림 명령
{ // 함수 시작
    let validation_messages: Vec<(&str, &str)> = request.messages.iter().map(|message| (message.role.as_str(), message.content.as_str())).collect(); // 검증 메시지 생성
    validate_request_fields(&request.request_id, &request.model, &validation_messages)?; // 요청 값 검증
    if request.format.as_deref().is_some_and(|format| format != "json") // 응답 형식 확인
    { // 조건 시작
        return Err("허용되지 않은 응답 형식입니다.".to_string()); // 형식 오류 반환
    } // 조건 종료
    if is_cancelled(&state, &request.request_id) // 사전 중단 확인
    { // 조건 시작
        clear_cancelled(&state, &request.request_id); // 중단 상태 정리
        return Err("응답 생성이 중단되었습니다.".to_string()); // 중단 오류 반환
    } // 조건 종료
    let client = build_client()?; // HTTP 통신기 생성
    let models = fetch_tags(&client).await?; // 설치 모델 조회
    if !models.iter().any(|model| model.name == request.model) // 선택 모델 존재 확인
    { // 조건 시작
        return Err("MODEL_NOT_FOUND: 선택한 올라마 모델이 설치되어 있지 않습니다.".to_string()); // 모델 누락 오류 반환
    } // 조건 종료
    let body = build_chat_body(&request); // 올라마 요청 본문
    let response = client.post(format!("{OLLAMA_BASE_URL}/api/chat")).json(&body).send().await.map_err(|_| "올라마 대화를 시작하지 못했습니다.".to_string())?; // 대화 요청
    if !response.status().is_success() // 상태 코드 확인
    { // 조건 시작
        return Err("올라마가 대화 요청을 거부했습니다.".to_string()); // 상태 오류 반환
    } // 조건 종료
    let mut stream = response.bytes_stream(); // 응답 바이트 스트림
    let mut buffer: Vec<u8> = Vec::new(); // 미완성 줄 버퍼
    let mut received_bytes = 0usize; // 수신 크기
    let mut completed = false; // 완료 상태
    while let Some(part) = stream.next().await // 응답 조각 순회
    { // 반복 시작
        if is_cancelled(&state, &request.request_id) // 중단 상태 확인
        { // 조건 시작
            clear_cancelled(&state, &request.request_id); // 중단 상태 정리
            return Err("응답 생성이 중단되었습니다.".to_string()); // 중단 오류 반환
        } // 조건 종료
        let bytes = part.map_err(|_| "올라마 응답을 읽지 못했습니다.".to_string())?; // 바이트 조각 해석
        received_bytes = received_bytes.saturating_add(bytes.len()); // 수신 크기 누적
        if received_bytes > MAX_RESPONSE_BYTES // 응답 크기 확인
        { // 조건 시작
            return Err("올라마 응답이 허용 크기를 넘었습니다.".to_string()); // 크기 오류 반환
        } // 조건 종료
        buffer.extend_from_slice(&bytes); // 바이트 조각 누적
        while let Some(line_end) = buffer.iter().position(|byte| *byte == b'\n') // 완성 줄 순회
        { // 반복 시작
            let line_bytes: Vec<u8> = buffer.drain(..=line_end).collect(); // 현재 줄 분리
            let line = std::str::from_utf8(&line_bytes[..line_bytes.len().saturating_sub(1)]).map_err(|_| "올라마 응답 문자가 올바르지 않습니다.".to_string())?.trim_end_matches('\r').trim(); // UTF-8 줄 변환
            if line.is_empty() // 빈 줄 확인
            { // 조건 시작
                continue; // 빈 줄 제외
            } // 조건 종료
            let (content, done) = parse_ollama_stream_line(line)?; // 스트림 줄 해석
            if let Some(content) = content // 응답 조각 확인
            { // 조건 시작
                on_event.send(LocalAIStreamEvent::Chunk { content }).map_err(|_| "화면에 응답을 전달하지 못했습니다.".to_string())?; // 응답 조각 전송
            } // 조건 종료
            if done // 완료 상태 확인
            { // 조건 시작
                completed = true; // 완료 상태 반영
                break; // 줄 순회 종료
            } // 조건 종료
        } // 반복 종료
        if completed // 전체 완료 확인
        { // 조건 시작
            break; // 스트림 순회 종료
        } // 조건 종료
    } // 반복 종료
    if !completed && !buffer.is_empty() // 마지막 줄 확인
    { // 조건 시작
        let line = std::str::from_utf8(&buffer).map_err(|_| "올라마 응답 문자가 올바르지 않습니다.".to_string())?.trim(); // 마지막 줄 변환
        let (content, done) = parse_ollama_stream_line(line)?; // 마지막 줄 해석
        if let Some(content) = content // 마지막 조각 확인
        { // 조건 시작
            on_event.send(LocalAIStreamEvent::Chunk { content }).map_err(|_| "화면에 응답을 전달하지 못했습니다.".to_string())?; // 마지막 조각 전송
        } // 조건 종료
        completed = done; // 완료 상태 반영
    } // 조건 종료
    clear_cancelled(&state, &request.request_id); // 중단 상태 정리
    if !completed // 완료 프레임 확인
    { // 조건 시작
        return Err("올라마 응답이 완료되지 않았습니다.".to_string()); // 불완전 오류 반환
    } // 조건 종료
    on_event.send(LocalAIStreamEvent::Done).map_err(|_| "화면에 완료 상태를 전달하지 못했습니다.".to_string())?; // 완료 사건 전송
    Ok(()) // 스트림 완료 반환
} // 함수 종료

#[cfg(test)] // 테스트 전용 모듈
mod tests // 단위 테스트 모듈
{ // 모듈 시작
    use super::*; // 상위 항목 사용

    #[test] // 테스트 표시
    fn invalid_request_identifiers_are_rejected() // 잘못된 요청 식별자 검증
    { // 함수 시작
        assert!(validate_request_fields("", "qwen3:8b", &[("user", "안녕")]).is_err()); // 빈 식별자 거부
        assert!(validate_request_fields("request/1", "qwen3:8b", &[("user", "안녕")]).is_err()); // 경로 문자 거부
    } // 함수 종료

    #[test] // 테스트 표시
    fn invalid_models_and_messages_are_rejected() // 잘못된 대화 입력 검증
    { // 함수 시작
        assert!(validate_request_fields("request-1", "", &[("user", "안녕")]).is_err()); // 빈 모델 거부
        assert!(validate_request_fields("request-1", "qwen3:8b", &[("tool", "안녕")]).is_err()); // 잘못된 역할 거부
        assert!(validate_request_fields("request-1", "qwen3:8b", &[("user", &"가".repeat(20_001))]).is_err()); // 과대 메시지 거부
    } // 함수 종료

    #[test] // 테스트 표시
    fn ollama_stream_lines_are_parsed_without_losing_unicode() // 스트림 줄 해석 검증
    { // 함수 시작
        let chunk = parse_ollama_stream_line(r#"{"message":{"content":"달빛"},"done":false}"#).expect("조각 해석"); // 한글 조각 해석
        let done = parse_ollama_stream_line(r#"{"message":{"content":""},"done":true}"#).expect("완료 해석"); // 완료 조각 해석
        assert_eq!(chunk, (Some("달빛".to_string()), false)); // 조각 결과 확인
        assert_eq!(done, (None, true)); // 완료 결과 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn optional_format_is_omitted_from_plain_chat_requests() // 선택 형식 생략 검증
    { // 함수 시작
        let request = LocalChatRequest { request_id: "request-1".to_string(), model: "qwen3:8b".to_string(), messages: vec![LocalChatMessage { role: "user".to_string(), content: "안녕".to_string() }], format: None }; // 일반 요청 생성
        let body = build_chat_body(&request); // 요청 본문 생성
        assert!(body.get("format").is_none()); // 형식 필드 부재 확인
        assert_eq!(body.get("stream"), Some(&serde_json::Value::Bool(true))); // 스트림 설정 확인
    } // 함수 종료
} // 모듈 종료
