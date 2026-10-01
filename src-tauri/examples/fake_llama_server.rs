// 가짜 llama-server(개발·확인용, 설치본에 넣지 않음): 실제 모델 없이 엔진 관리자와 exe 전체 흐름을 확인한다
// 빌드: cargo build --release --example fake_llama_server --manifest-path src-tauri/Cargo.toml
// 사용: 결과 파일을 <폴더>\cpu\llama-server.exe(그리고 실패 흉내용 <폴더>\vulkan\llama-server.exe)로 복사하고
//       MATE_TEXT_PLAY_LLAMA_RUNTIME_DIR=<폴더>, MATE_TEXT_PLAY_BUNDLED_MODEL=<아무 .gguf 파일>로 exe 실행
use std::io::{BufRead, BufReader, Read, Write}; // 입출력 도구
use std::net::{TcpListener, TcpStream}; // 로컬 HTTP 서버
use std::time::{Duration, Instant}; // 시간 도구

fn argument(args: &[String], name: &str) -> Option<String> // 이름 뒤 인자 값
{ // 함수 시작
    args.iter().position(|arg| arg == name).and_then(|index| args.get(index + 1)).cloned() // 값 반환
} // 함수 종료

fn user_action(body: &serde_json::Value) -> String // 마지막 사용자 행동
{ // 함수 시작
    let last = body["messages"].as_array().and_then(|messages| messages.iter().rev().find(|message| message["role"] == "user")).and_then(|message| message["content"].as_str()).unwrap_or(""); // 마지막 사용자 메시지
    let action = last.rsplit("사용자 행동:\n").next().unwrap_or(last).trim(); // 행동 부분
    action.chars().take(60).collect() // 짧은 행동 반환
} // 함수 종료

fn handle(mut stream: TcpStream, api_key: &str, started: Instant) // 요청 하나 처리
{ // 함수 시작
    let mut reader = BufReader::new(stream.try_clone().expect("복제")); // 줄 읽기 도구
    let mut request_line = String::new(); // 첫 줄
    if reader.read_line(&mut request_line).is_err() // 첫 줄 읽기
    { // 조건 시작
        return; // 처리 종료
    } // 조건 종료
    let mut content_length = 0usize; // 본문 길이
    let mut authorization = String::new(); // 인증 머리
    loop // 머리 읽기
    { // 반복 시작
        let mut line = String::new(); // 머리 줄
        if reader.read_line(&mut line).unwrap_or(0) == 0 || line == "\r\n" // 머리 끝 확인
        { // 조건 시작
            break; // 읽기 종료
        } // 조건 종료
        let lower = line.to_ascii_lowercase(); // 소문자 비교
        if let Some(value) = lower.strip_prefix("content-length:") { content_length = value.trim().parse().unwrap_or(0); } // 본문 길이
        if lower.starts_with("authorization:") { authorization = line.trim_end().to_string(); } // 인증 머리
    } // 반복 종료
    let mut body = vec![0u8; content_length]; // 본문 버퍼
    let _ = reader.read_exact(&mut body); // 본문 읽기
    if request_line.starts_with("GET /health") // 준비 확인
    { // 조건 시작
        let status = if started.elapsed() < Duration::from_millis(1200) { "503 Service Unavailable" } else { "200 OK" }; // 처음 1.2초는 적재 중
        let _ = stream.write_all(format!("HTTP/1.1 {status}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{{}}").as_bytes()); // 응답
        return; // 처리 종료
    } // 조건 종료
    if !request_line.starts_with("POST /v1/chat/completions") // 대화 경로 확인
    { // 조건 시작
        let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); // 없는 경로
        return; // 처리 종료
    } // 조건 종료
    if authorization != format!("Authorization: Bearer {api_key}") && authorization != format!("authorization: Bearer {api_key}") // 일회용 키 확인
    { // 조건 시작
        let _ = stream.write_all(b"HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); // 키 거부
        return; // 처리 종료
    } // 조건 종료
    let request: serde_json::Value = serde_json::from_slice(&body).unwrap_or_default(); // 요청 해석
    let action = user_action(&request); // 사용자 행동
    let content = if request.get("response_format").is_some() // 형식 강제 확인
    { // 조건 시작
        serde_json::json!({ "narration": format!("가짜 엔진이 \"{action}\" 행동을 받았습니다. 엔진 관리자가 켠 실행 엔진이 대답합니다."), "dialogue": { "speaker": "리라", "content": "엔진이 잘 켜졌어요." }, "proposedActions": [] }).to_string() // Text-Play JSON
    } // 조건 종료
    else // 일반 대화
    { // 조건 시작
        format!("가짜 엔진이 \"{action}\"에 대답합니다.") // 일반 문장
    }; // 조건 종료
    let _ = stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n"); // 스트림 머리
    let characters: Vec<char> = content.chars().collect(); // 글자 목록
    for chunk in characters.chunks(8) // 8글자씩
    { // 반복 시작
        let piece: String = chunk.iter().collect(); // 조각
        let _ = stream.write_all(format!("data: {}\n\n", serde_json::json!({ "choices": [{ "index": 0, "delta": { "content": piece }, "finish_reason": null }] })).as_bytes()); // 조각 전송
        std::thread::sleep(Duration::from_millis(25)); // 생성 흉내
    } // 반복 종료
    let _ = stream.write_all(format!("data: {}\n\ndata: [DONE]\n\n", serde_json::json!({ "choices": [{ "index": 0, "delta": {}, "finish_reason": "stop" }] })).as_bytes()); // 종료
} // 함수 종료

fn main() // 진입점
{ // 함수 시작
    let args: Vec<String> = std::env::args().collect(); // 명령 인자
    let folder = std::env::current_exe().ok().and_then(|path| path.parent().and_then(|parent| parent.file_name()).map(|name| name.to_string_lossy().to_string())).unwrap_or_default(); // 실행 폴더 이름
    if args.iter().any(|arg| arg == "--list-devices") // 장치 목록 요청
    { // 조건 시작
        println!("Available devices:"); // 목록 제목
        if folder == "vulkan" { println!("  Vulkan0: Fake GPU (8192 MiB, 8000 MiB free)"); } // 가짜 그래픽 장치
        return; // 종료
    } // 조건 종료
    if folder == "vulkan" // 그래픽 빌드 위치 확인
    { // 조건 시작
        eprintln!("가짜 Vulkan 초기화 실패(CPU 전환 확인용)"); // 실패 흉내
        std::process::exit(1); // 실패 종료
    } // 조건 종료
    let port = argument(&args, "--port").expect("--port 필요"); // 포트
    let api_key = argument(&args, "--api-key").expect("--api-key 필요"); // 일회용 키
    let listener = TcpListener::bind(("127.0.0.1", port.parse::<u16>().expect("포트 숫자"))).expect("포트 열기"); // 로컬 전용 열기
    eprintln!("가짜 llama-server 시작: 127.0.0.1:{port}"); // 시작 기록
    let started = Instant::now(); // 시작 시각
    for stream in listener.incoming().flatten() // 연결 순회
    { // 반복 시작
        let key = api_key.clone(); // 키 복사
        std::thread::spawn(move || handle(stream, &key, started)); // 연결 처리
    } // 반복 종료
} // 함수 종료
