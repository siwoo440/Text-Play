#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // 배포 콘솔 창 차단

fn main() // 앱 진입점
{ // 함수 시작
    tauri::Builder::default() // 기본 앱 빌더
        .run(tauri::generate_context!()) // 설정 기반 앱 실행
        .expect("Tauri 앱 실행 실패"); // 실행 오류 처리
} // 함수 종료
