#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // 배포 콘솔 창 차단

mod bundled_ai; // 내장 인공지능 모듈
mod hardware; // 이 PC 사양 확인
mod local_ai; // 로컬 인공지능 모듈
mod local_runtime; // 내장 인공지능 엔진 관리자
mod model_store; // 내장 인공지능 모델 보관함

use tauri::Manager; // 앱 상태·경로 도구

fn create_runtime_manager(app: &tauri::App) -> local_runtime::LocalRuntimeManager // 엔진 관리자 생성
{ // 함수 시작
    let resource_root = app.path().resource_dir().ok().map(|directory| directory.join("llama-runtime")); // 설치본 실행 엔진 폴더
    let user_root = app.path().local_data_dir().ok().map(|directory| directory.join("MATE Text-Play").join("runtime")); // 모델 옆 실행 엔진 폴더(설치 프로그램 전 로컬 확인용)
    let default_root = local_runtime::choose_runtime_root(&[resource_root.clone(), user_root].into_iter().flatten().collect::<Vec<_>>()).or(resource_root); // 엔진이 있는 폴더
    let log_path = app.path().app_log_dir().ok().and_then(|directory| std::fs::create_dir_all(&directory).ok().map(|_| directory.join("llama-server.log"))); // 실행 엔진 기록 파일
    let mut config = local_runtime::config_from_values(std::env::var(local_runtime::RUNTIME_DIR_ENV).ok(), std::env::var(local_runtime::MODEL_ENV).ok(), default_root, log_path); // 설정
    let hardware = hardware::detect_hardware(); // PC 사양
    config.preferred_gpu = hardware.gpu_name.filter(|_| hardware.vram_bytes >= 2 * 1_073_741_824); // 전용 메모리 2GB 이상 그래픽만 Vulkan 사용
    local_runtime::LocalRuntimeManager::new(config, Box::new(local_runtime::SystemLauncher::new()), local_runtime::HEALTH_TIMEOUT) // 관리자 반환
} // 함수 종료

fn create_model_store(app: &tauri::App) -> model_store::ModelStore // 모델 보관함 생성
{ // 함수 시작
    let directory = app.path().local_data_dir().map(|directory| directory.join("MATE Text-Play").join("models")).unwrap_or_else(|_| std::env::temp_dir().join("MATE Text-Play").join("models")); // 앱 업데이트와 무관한 모델 폴더
    let override_catalog = std::env::var(model_store::CATALOG_ENV).ok().and_then(|path| std::fs::read_to_string(path).ok()).and_then(|text| model_store::parse_catalog(&text, true).ok()); // 개발·확인용 목록
    let catalog = override_catalog.clone().unwrap_or_else(|| model_store::parse_catalog(model_store::BUNDLED_CATALOG, false).expect("내장 모델 목록 오류")); // 사용할 목록
    model_store::ModelStore::new(directory, catalog, override_catalog.is_some()) // 보관함 반환
} // 함수 종료

fn main() // 앱 진입점
{ // 함수 시작
    let app = tauri::Builder::default() // 기본 앱 빌더
        .manage(local_ai::LocalAIState::default()) // 로컬 인공지능 상태 등록
        .manage(bundled_ai::BundledAIState::from_env()) // 내장 인공지능 상태 등록
        .setup(|app| // 시작 준비
        { // 준비 시작
            let manager = create_runtime_manager(app); // 엔진 관리자
            let store = create_model_store(app); // 모델 보관함
            if !manager.has_model() // 개발용 모델 지정이 없으면
            { // 조건 시작
                manager.set_model(store.active_spec()); // 보관함에서 고른 모델 사용
            } // 조건 종료
            app.manage(manager); // 엔진 관리자 등록
            app.manage(store); // 모델 보관함 등록
            let handle = app.handle().clone(); // 앱 핸들
            std::thread::spawn(move || loop // 쉬는 시간 감시
            { // 감시 시작
                std::thread::sleep(std::time::Duration::from_secs(60)); // 1분마다
                if let Some(runtime) = handle.try_state::<local_runtime::LocalRuntimeManager>() // 관리자 확인
                { // 조건 시작
                    runtime.unload_if_idle(local_runtime::now_secs(), local_runtime::IDLE_LIMIT_SECS); // 10분 쉬면 엔진 끄기
                } // 조건 종료
            }); // 감시 종료
            Ok(()) // 준비 완료
        }) // 준비 종료
        .invoke_handler(tauri::generate_handler![local_ai::list_local_models, local_ai::list_running_local_models, local_ai::stream_local_chat, local_ai::cancel_local_chat, bundled_ai::stream_bundled_chat, local_runtime::get_local_runtime_status, local_runtime::stop_local_runtime, model_store::get_model_store, model_store::download_model, model_store::cancel_model_download, model_store::delete_model, model_store::select_model]) // 로컬·내장 인공지능·모델 보관함 명령 등록
        .build(tauri::generate_context!()) // 설정 기반 앱 생성
        .expect("Tauri 앱 실행 실패"); // 생성 오류 처리
    app.run(|handle, event| // 앱 실행
    { // 사건 처리 시작
        if let tauri::RunEvent::Exit = event // 앱 종료 확인
        { // 조건 시작
            if let Some(runtime) = handle.try_state::<local_runtime::LocalRuntimeManager>() // 관리자 확인
            { // 조건 시작
                runtime.stop(); // 엔진 끄기
            } // 조건 종료
        } // 조건 종료
    }); // 사건 처리 종료
} // 함수 종료
