#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // 배포 콘솔 창 차단

mod local_ai; // 로컬 인공지능 모듈

fn main() // 앱 진입점
{ // 함수 시작
    tauri::Builder::default() // 기본 앱 빌더
        .manage(local_ai::LocalAIState::default()) // 로컬 인공지능 상태 등록
        .invoke_handler(tauri::generate_handler![local_ai::list_local_models, local_ai::list_running_local_models, local_ai::stream_local_chat, local_ai::cancel_local_chat]) // 로컬 인공지능 명령 등록
        .run(tauri::generate_context!()) // 설정 기반 앱 실행
        .expect("Tauri 앱 실행 실패"); // 실행 오류 처리
} // 함수 종료
