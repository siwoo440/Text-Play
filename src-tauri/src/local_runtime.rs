// 내장 인공지능 엔진 관리자: llama-server를 이 PC 안(127.0.0.1)에서 켜고, 준비될 때까지 기다리고, 끄는 일을 맡는다
// 그래픽(Vulkan)으로 먼저 켜 보고 실패하면 CPU로 다시 켠다. 앱이 끝나거나 오래 쓰지 않으면 끈다
use crate::bundled_ai::{BundledEndpoint, NOT_READY_MESSAGE}; // 내장 AI 연결 정보
use serde::Serialize; // JSON 변환 도구
use serde_json::{Map, Value}; // JSON 값 도구
use std::path::{Path, PathBuf}; // 경로 도구
use std::sync::Mutex; // 공유 상태 잠금
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH}; // 시간 도구

pub(crate) const RUNTIME_DIR_ENV: &str = "MATE_TEXT_PLAY_LLAMA_RUNTIME_DIR"; // 실행 엔진 폴더 지정(개발·확인용)
pub(crate) const MODEL_ENV: &str = "MATE_TEXT_PLAY_BUNDLED_MODEL"; // 모델 파일 지정(모델 보관함 전까지 개발·확인용)
pub(crate) const SERVER_FILE_NAME: &str = if cfg!(windows) { "llama-server.exe" } else { "llama-server" }; // 실행 엔진 파일 이름
pub(crate) const IDLE_LIMIT_SECS: u64 = 600; // 쉬는 시간 제한(10분)
pub(crate) const HEALTH_TIMEOUT: Duration = Duration::from_secs(180); // 모델 적재 최대 대기
const DEFAULT_CONTEXT_LENGTH: u32 = 4_096; // Text-Play 문맥 길이

#[derive(Clone, Copy, Debug, PartialEq)] // 복사·비교 가능
pub enum RuntimeVariant // 실행 엔진 빌드 종류
{ // 열거 시작
    Vulkan, // 그래픽(NVIDIA·AMD·Intel 공통)
    Cpu, // CPU 전용
} // 열거 종료

impl RuntimeVariant // 빌드 종류 동작
{ // 구현 시작
    fn label(self) -> &'static str // 폴더·표시 이름
    { // 함수 시작
        match self { RuntimeVariant::Vulkan => "vulkan", RuntimeVariant::Cpu => "cpu" } // 이름 반환
    } // 함수 종료
} // 구현 종료

#[derive(Clone, Debug, PartialEq)] // 복사·비교 가능
pub struct RuntimeBackend // 실행 방식
{ // 구조 시작
    pub variant: RuntimeVariant, // 빌드 종류
    pub device: Option<String>, // 그래픽 장치 이름
} // 구조 종료

#[derive(Clone, Debug, PartialEq)] // 복사·비교 가능
pub struct ModelSpec // 불러올 모델
{ // 구조 시작
    pub path: PathBuf, // GGUF 파일
    pub context_length: u32, // 문맥 길이
    pub generation: Map<String, Value>, // 생성 설정
    pub chat_template_kwargs: Option<Value>, // 템플릿 인자
} // 구조 종료

#[derive(Clone, Debug, Default)] // 복사·기본값 가능
pub struct RuntimeConfig // 엔진 관리자 설정
{ // 구조 시작
    pub runtime_root: Option<PathBuf>, // vulkan·cpu 하위 폴더를 가진 실행 엔진 폴더
    pub model: Option<ModelSpec>, // 현재 모델
    pub log_path: Option<PathBuf>, // 실행 엔진 기록 파일
} // 구조 종료

#[derive(Clone, Debug, PartialEq)] // 복사·비교 가능
pub struct ListedDevice // 실행 엔진이 찾은 장치
{ // 구조 시작
    pub name: String, // 장치 이름(Vulkan0 등)
    pub description: String, // 장치 설명
    pub total_mib: u64, // 전체 메모리
} // 구조 종료

#[derive(Clone, Debug, PartialEq, Serialize)] // 복사·비교·JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct RuntimeStatus // 엔진 상태(화면 표시용)
{ // 구조 시작
    pub state: &'static str, // stopped·starting·ready·failed
    pub backend: Option<String>, // 실행 중 빌드 종류
    pub message: Option<String>, // 실패 이유
} // 구조 종료

impl RuntimeStatus // 상태 생성
{ // 구현 시작
    fn stopped() -> Self // 꺼짐
    { // 함수 시작
        Self { state: "stopped", backend: None, message: None } // 상태 반환
    } // 함수 종료
} // 구현 종료

pub trait RuntimeProcess: Send // 실행 중 엔진 프로세스
{ // 계약 시작
    fn has_exited(&mut self) -> bool; // 종료 여부
    fn kill(&mut self); // 강제 종료
} // 계약 종료

pub trait ProcessLauncher: Send + Sync // 엔진 실행기
{ // 계약 시작
    fn list_devices(&self, program: &Path) -> String; // --list-devices 출력
    fn launch(&self, program: &Path, args: &[String], log_path: Option<&Path>) -> Result<Box<dyn RuntimeProcess>, String>; // 엔진 실행
} // 계약 종료

pub fn config_from_values(runtime_dir: Option<String>, model_path: Option<String>, default_runtime_root: Option<PathBuf>, log_path: Option<PathBuf>) -> RuntimeConfig // 설정 값 해석
{ // 함수 시작
    let runtime_root = runtime_dir.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()).map(PathBuf::from).or(default_runtime_root); // 실행 엔진 폴더
    let model = model_path.map(PathBuf::from).filter(|path| path.is_file() && path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("gguf"))).map(|path| ModelSpec { path, context_length: DEFAULT_CONTEXT_LENGTH, generation: Map::new(), chat_template_kwargs: None }); // 있는 GGUF 모델만
    RuntimeConfig { runtime_root, model, log_path } // 설정 반환
} // 함수 종료

pub fn parse_list_devices(output: &str) -> Vec<ListedDevice> // 장치 목록 해석
{ // 함수 시작
    output.lines().filter_map(|line| // 줄 순회
    { // 해석 시작
        let (name, rest) = line.trim().split_once(": ")?; // 이름과 나머지
        let rest = rest.strip_suffix(" MiB free)")?; // 끝 표시 확인
        let (description, sizes) = rest.rsplit_once(" (")?; // 설명과 크기
        let total = sizes.split_once(" MiB, ")?.0.parse::<u64>().ok()?; // 전체 메모리
        if name.contains(char::is_whitespace) // 장치 이름 형식 확인
        { // 조건 시작
            return None; // 다른 줄 제외
        } // 조건 종료
        Some(ListedDevice { name: name.to_string(), description: description.to_string(), total_mib: total }) // 장치 반환
    }).collect() // 목록 반환
} // 함수 종료

pub fn pick_largest_device(devices: &[ListedDevice]) -> Option<String> // 그래픽 메모리가 가장 큰 장치
{ // 함수 시작
    devices.iter().max_by_key(|device| device.total_mib).map(|device| device.name.clone()) // 장치 이름 반환
} // 함수 종료

pub fn build_server_args(model: &ModelSpec, port: u16, api_key: &str, backend: &RuntimeBackend) -> Vec<String> // 실행 인자
{ // 함수 시작
    let mut args: Vec<String> = vec!["-m".into(), model.path.to_string_lossy().to_string(), "--host".into(), "127.0.0.1".into(), "--port".into(), port.to_string(), "--api-key".into(), api_key.into(), "-c".into(), model.context_length.to_string(), "-np".into(), "1".into(), "--no-webui".into()]; // 로컬 전용·일회용 키·단일 슬롯
    match backend.variant // 빌드 종류 분기
    { // 분기 시작
        RuntimeVariant::Cpu => args.extend(["-ngl".to_string(), "0".to_string()]), // 그래픽 층 없음
        RuntimeVariant::Vulkan => // 그래픽 실행
        { // 처리 시작
            args.extend(["-ngl".to_string(), "999".to_string()]); // 모든 층 그래픽 배치
            if let Some(device) = &backend.device // 장치 확인
            { // 조건 시작
                args.extend(["--device".to_string(), device.clone()]); // 한 장치만 사용(내장 그래픽과 나눠 쓰지 않음)
            } // 조건 종료
        } // 처리 종료
    } // 분기 종료
    args // 인자 반환
} // 함수 종료

pub fn generate_api_key() -> Result<String, String> // 일회용 키(32바이트 난수)
{ // 함수 시작
    let mut bytes = [0u8; 32]; // 난수 버퍼
    getrandom::getrandom(&mut bytes).map_err(|_| "일회용 키를 만들지 못했습니다.".to_string())?; // 운영체제 난수
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect()) // 16진수 반환
} // 함수 종료

fn pick_free_port() -> Result<u16, String> // 빈 로컬 포트
{ // 함수 시작
    let listener = std::net::TcpListener::bind("127.0.0.1:0").map_err(|_| "빈 포트를 찾지 못했습니다.".to_string())?; // 임의 포트 열기
    listener.local_addr().map(|address| address.port()).map_err(|_| "빈 포트를 찾지 못했습니다.".to_string()) // 포트 반환(닫고 엔진이 사용)
} // 함수 종료

pub fn should_unload(last_used: Option<u64>, now: u64, limit: u64) -> bool // 쉬는 시간 초과 여부
{ // 함수 시작
    last_used.is_some_and(|used| now.saturating_sub(used) >= limit) // 초과 여부 반환
} // 함수 종료

pub fn now_secs() -> u64 // 현재 시각(초)
{ // 함수 시작
    SystemTime::now().duration_since(UNIX_EPOCH).map(|duration| duration.as_secs()).unwrap_or(0) // 초 반환
} // 함수 종료

struct RunningEngine // 실행 중 엔진
{ // 구조 시작
    process: Box<dyn RuntimeProcess>, // 프로세스
    endpoint: BundledEndpoint, // 연결 정보
} // 구조 종료

pub struct LocalRuntimeManager // 엔진 관리자
{ // 구조 시작
    config: Mutex<RuntimeConfig>, // 설정
    launcher: Box<dyn ProcessLauncher>, // 실행기
    health_timeout: Duration, // 준비 최대 대기
    start_lock: tokio::sync::Mutex<()>, // 동시에 두 번 켜지 않기
    engine: Mutex<Option<RunningEngine>>, // 실행 중 엔진
    status: Mutex<RuntimeStatus>, // 상태
    last_used: Mutex<Option<u64>>, // 마지막 사용 시각
} // 구조 종료

impl LocalRuntimeManager // 관리자 동작
{ // 구현 시작
    pub fn new(config: RuntimeConfig, launcher: Box<dyn ProcessLauncher>, health_timeout: Duration) -> Self // 생성자
    { // 함수 시작
        Self { config: Mutex::new(config), launcher, health_timeout, start_lock: tokio::sync::Mutex::new(()), engine: Mutex::new(None), status: Mutex::new(RuntimeStatus::stopped()), last_used: Mutex::new(None) } // 관리자 반환
    } // 함수 종료

    pub fn status(&self) -> RuntimeStatus // 현재 상태
    { // 함수 시작
        self.status.lock().map(|status| status.clone()).unwrap_or_else(|_| RuntimeStatus::stopped()) // 상태 복사 반환
    } // 함수 종료

    fn set_status(&self, status: RuntimeStatus) // 상태 변경
    { // 함수 시작
        if let Ok(mut current) = self.status.lock() // 잠금 확인
        { // 조건 시작
            *current = status; // 상태 반영
        } // 조건 종료
    } // 함수 종료

    fn running_endpoint(&self) -> Option<BundledEndpoint> // 살아 있는 엔진의 연결 정보
    { // 함수 시작
        let mut engine = self.engine.lock().ok()?; // 엔진 잠금
        if engine.as_mut().is_some_and(|running| running.process.has_exited()) // 저절로 종료 확인
        { // 조건 시작
            *engine = None; // 엔진 정리
            drop(engine); // 잠금 해제
            self.set_status(RuntimeStatus::stopped()); // 꺼짐 반영
            return None; // 연결 정보 없음
        } // 조건 종료
        engine.as_ref().map(|running| running.endpoint.clone()) // 연결 정보 반환
    } // 함수 종료

    fn candidates(&self, root: &Path) -> Vec<RuntimeBackend> // 시도할 실행 방식(그래픽 → CPU)
    { // 함수 시작
        let mut candidates = Vec::new(); // 후보 목록
        let vulkan = root.join(RuntimeVariant::Vulkan.label()).join(SERVER_FILE_NAME); // 그래픽 빌드
        if vulkan.is_file() // 그래픽 빌드 확인
        { // 조건 시작
            if let Some(device) = pick_largest_device(&parse_list_devices(&self.launcher.list_devices(&vulkan))) // 그래픽 장치 확인
            { // 조건 시작
                candidates.push(RuntimeBackend { variant: RuntimeVariant::Vulkan, device: Some(device) }); // 그래픽 후보
            } // 조건 종료
        } // 조건 종료
        if root.join(RuntimeVariant::Cpu.label()).join(SERVER_FILE_NAME).is_file() // CPU 빌드 확인
        { // 조건 시작
            candidates.push(RuntimeBackend { variant: RuntimeVariant::Cpu, device: None }); // CPU 후보
        } // 조건 종료
        candidates // 후보 반환
    } // 함수 종료

    async fn wait_ready(&self, port: u16, process: &mut Box<dyn RuntimeProcess>) -> Result<(), String> // 준비 확인(/health) 대기
    { // 함수 시작
        let client = reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(2)).build().map_err(|_| "준비 확인 통신기를 만들지 못했습니다.".to_string())?; // 확인 통신기
        let deadline = Instant::now() + self.health_timeout; // 마감 시각
        while Instant::now() < deadline // 마감 전 반복
        { // 반복 시작
            if process.has_exited() // 비정상 종료 확인
            { // 조건 시작
                return Err("실행 엔진이 시작 중에 종료되었습니다.".to_string()); // 종료 오류
            } // 조건 종료
            if let Ok(response) = client.get(format!("http://127.0.0.1:{port}/health")).send().await // 준비 확인 요청
            { // 조건 시작
                if response.status().is_success() // 준비 완료 확인
                { // 조건 시작
                    return Ok(()); // 준비 완료
                } // 조건 종료
            } // 조건 종료
            tokio::time::sleep(Duration::from_millis(200)).await; // 잠시 대기
        } // 반복 종료
        Err("실행 엔진 준비 시간이 지났습니다.".to_string()) // 시간 초과
    } // 함수 종료

    async fn try_start(&self, root: &Path, model: &ModelSpec, log_path: Option<&Path>, backend: &RuntimeBackend) -> Result<RunningEngine, String> // 한 방식으로 켜기
    { // 함수 시작
        let port = pick_free_port()?; // 빈 포트
        let api_key = generate_api_key()?; // 일회용 키
        let program = root.join(backend.variant.label()).join(SERVER_FILE_NAME); // 실행 파일
        let mut process = self.launcher.launch(&program, &build_server_args(model, port, &api_key, backend), log_path)?; // 실행
        if let Err(error) = self.wait_ready(port, &mut process).await // 준비 대기
        { // 조건 시작
            process.kill(); // 실패 엔진 종료
            return Err(error); // 오류 전달
        } // 조건 종료
        Ok(RunningEngine { process, endpoint: BundledEndpoint { base_url: format!("http://127.0.0.1:{port}"), api_key: Some(api_key), generation: model.generation.clone(), chat_template_kwargs: model.chat_template_kwargs.clone() } }) // 실행 중 엔진 반환
    } // 함수 종료

    pub async fn ensure_ready(&self) -> Result<BundledEndpoint, String> // 엔진 준비(꺼져 있으면 켜기)
    { // 함수 시작
        let _guard = self.start_lock.lock().await; // 동시 시작 막기
        if let Some(endpoint) = self.running_endpoint() // 실행 중 확인
        { // 조건 시작
            return Ok(endpoint); // 그대로 사용
        } // 조건 종료
        let config = self.config.lock().map(|config| config.clone()).map_err(|_| NOT_READY_MESSAGE.to_string())?; // 설정 복사
        let (Some(root), Some(model)) = (config.runtime_root, config.model) else { return Err(NOT_READY_MESSAGE.to_string()); }; // 실행 엔진·모델 확인
        let candidates = self.candidates(&root); // 시도할 방식
        if candidates.is_empty() // 실행 엔진 확인
        { // 조건 시작
            return Err(NOT_READY_MESSAGE.to_string()); // 미준비 반환
        } // 조건 종료
        self.set_status(RuntimeStatus { state: "starting", backend: None, message: None }); // 시작 중 반영
        let mut failures = Vec::new(); // 실패 이유
        for backend in candidates // 방식 순회
        { // 반복 시작
            match self.try_start(&root, &model, config.log_path.as_deref(), &backend).await // 켜기 시도
            { // 분기 시작
                Ok(engine) => // 성공
                { // 처리 시작
                    let endpoint = engine.endpoint.clone(); // 연결 정보
                    if let Ok(mut current) = self.engine.lock() // 엔진 잠금
                    { // 조건 시작
                        *current = Some(engine); // 엔진 보관
                    } // 조건 종료
                    self.set_status(RuntimeStatus { state: "ready", backend: Some(backend.variant.label().to_string()), message: None }); // 준비 반영
                    return Ok(endpoint); // 연결 정보 반환
                } // 처리 종료
                Err(error) => failures.push(format!("{}: {error}", backend.variant.label())), // 실패 기록 후 다음 방식
            } // 분기 종료
        } // 반복 종료
        let message = format!("내장 AI 실행 엔진을 시작하지 못했습니다. {}", failures.join(" / ")); // 실패 안내
        self.set_status(RuntimeStatus { state: "failed", backend: None, message: Some(message.clone()) }); // 실패 반영
        Err(message) // 실패 반환
    } // 함수 종료

    pub fn stop(&self) // 엔진 끄기
    { // 함수 시작
        if let Ok(mut engine) = self.engine.lock() // 엔진 잠금
        { // 조건 시작
            if let Some(mut running) = engine.take() // 실행 중 확인
            { // 조건 시작
                running.process.kill(); // 프로세스 종료
            } // 조건 종료
        } // 조건 종료
        self.set_status(RuntimeStatus::stopped()); // 꺼짐 반영
    } // 함수 종료

    pub fn touch(&self, now: u64) // 사용 시각 기록
    { // 함수 시작
        if let Ok(mut last_used) = self.last_used.lock() // 잠금 확인
        { // 조건 시작
            *last_used = Some(now); // 시각 반영
        } // 조건 종료
    } // 함수 종료

    pub fn unload_if_idle(&self, now: u64, limit: u64) -> bool // 쉬는 시간이 지나면 끄기
    { // 함수 시작
        let running = self.engine.lock().map(|engine| engine.is_some()).unwrap_or(false); // 실행 여부
        let last_used = self.last_used.lock().map(|value| *value).unwrap_or(None); // 마지막 사용
        if !running || !should_unload(last_used, now, limit) // 끌 조건 확인
        { // 조건 시작
            return false; // 유지
        } // 조건 종료
        self.stop(); // 끄기
        true // 내림 반환
    } // 함수 종료
} // 구현 종료

impl Drop for LocalRuntimeManager // 관리자 정리
{ // 구현 시작
    fn drop(&mut self) // 정리
    { // 함수 시작
        self.stop(); // 엔진 끄기
    } // 함수 종료
} // 구현 종료

struct SystemProcess // 실제 엔진 프로세스
{ // 구조 시작
    child: std::process::Child, // 자식 프로세스
} // 구조 종료

impl RuntimeProcess for SystemProcess // 실제 프로세스 동작
{ // 구현 시작
    fn has_exited(&mut self) -> bool // 종료 여부
    { // 함수 시작
        !matches!(self.child.try_wait(), Ok(None)) // 실행 중이 아니면 종료
    } // 함수 종료

    fn kill(&mut self) // 강제 종료
    { // 함수 시작
        let _ = self.child.kill(); // 종료 요청
        let _ = self.child.wait(); // 종료 대기
    } // 함수 종료
} // 구현 종료

impl Drop for SystemProcess // 프로세스 정리
{ // 구현 시작
    fn drop(&mut self) // 정리
    { // 함수 시작
        if matches!(self.child.try_wait(), Ok(None)) // 실행 중 확인
        { // 조건 시작
            self.kill(); // 종료
        } // 조건 종료
    } // 함수 종료
} // 구현 종료

#[cfg(windows)] // Windows 전용
struct KillOnCloseJob(windows_sys::Win32::Foundation::HANDLE); // 앱이 끝나면 소속 프로세스를 끝내는 Job Object

#[cfg(windows)] // Windows 전용
unsafe impl Send for KillOnCloseJob {} // 핸들은 스레드 사이 공유 가능
#[cfg(windows)] // Windows 전용
unsafe impl Sync for KillOnCloseJob {} // 핸들은 읽기만 함

#[cfg(windows)] // Windows 전용
impl KillOnCloseJob // Job Object 동작
{ // 구현 시작
    fn create() -> Option<Self> // 생성
    { // 함수 시작
        use windows_sys::Win32::Foundation::CloseHandle; // 핸들 닫기
        use windows_sys::Win32::System::JobObjects::{CreateJobObjectW, JobObjectExtendedLimitInformation, SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE}; // Job Object API
        unsafe // 운영체제 호출
        { // 호출 시작
            let job = CreateJobObjectW(std::ptr::null(), std::ptr::null()); // 이름 없는 Job 생성
            if job.is_null() // 생성 실패 확인
            { // 조건 시작
                return None; // 없음 반환
            } // 조건 종료
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed(); // 제한 정보
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE; // 마지막 핸들이 닫히면 소속 프로세스 종료
            if SetInformationJobObject(job, JobObjectExtendedLimitInformation, &info as *const _ as *const core::ffi::c_void, std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32) == 0 // 설정 확인
            { // 조건 시작
                CloseHandle(job); // 핸들 닫기
                return None; // 없음 반환
            } // 조건 종료
            Some(Self(job)) // Job 반환
        } // 호출 종료
    } // 함수 종료

    fn assign(&self, child: &std::process::Child) // 프로세스 소속시키기
    { // 함수 시작
        use std::os::windows::io::AsRawHandle; // 원시 핸들
        unsafe // 운영체제 호출
        { // 호출 시작
            windows_sys::Win32::System::JobObjects::AssignProcessToJobObject(self.0, child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE); // 소속 지정(실패해도 일반 종료로 정리)
        } // 호출 종료
    } // 함수 종료
} // 구현 종료

pub struct SystemLauncher // 실제 실행기
{ // 구조 시작
    #[cfg(windows)] // Windows 전용
    job: Option<KillOnCloseJob>, // 앱 수명과 묶는 Job Object(앱 프로세스가 끝나면 핸들이 닫힘)
} // 구조 종료

impl SystemLauncher // 실제 실행기 생성
{ // 구현 시작
    pub fn new() -> Self // 생성자
    { // 함수 시작
        Self { #[cfg(windows)] job: KillOnCloseJob::create() } // 실행기 반환
    } // 함수 종료

    fn command(program: &Path) -> std::process::Command // 창 없는 명령 준비
    { // 함수 시작
        let mut command = std::process::Command::new(program); // 명령 생성
        if let Some(parent) = program.parent() // 실행 파일 폴더 확인
        { // 조건 시작
            command.current_dir(parent); // DLL을 찾도록 작업 폴더 지정
        } // 조건 종료
        #[cfg(windows)] // Windows 전용
        { // 설정 시작
            use std::os::windows::process::CommandExt; // 생성 옵션
            command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: 콘솔 창 숨김
        } // 설정 종료
        command // 명령 반환
    } // 함수 종료
} // 구현 종료

impl ProcessLauncher for SystemLauncher // 실제 실행기 동작
{ // 구현 시작
    fn list_devices(&self, program: &Path) -> String // 장치 목록
    { // 함수 시작
        Self::command(program).arg("--list-devices").stdin(std::process::Stdio::null()).output().map(|output| format!("{}\n{}", String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr))).unwrap_or_default() // 출력 반환
    } // 함수 종료

    fn launch(&self, program: &Path, args: &[String], log_path: Option<&Path>) -> Result<Box<dyn RuntimeProcess>, String> // 엔진 실행
    { // 함수 시작
        let mut command = Self::command(program); // 명령 준비
        command.args(args).stdin(std::process::Stdio::null()); // 인자와 입력 차단
        match log_path.and_then(|path| std::fs::File::create(path).ok()) // 기록 파일 확인
        { // 분기 시작
            Some(file) => // 기록 파일 있음
            { // 처리 시작
                let error_file = file.try_clone().map_err(|_| "실행 엔진 기록 파일을 열지 못했습니다.".to_string())?; // 오류 출력용 복제
                command.stdout(file).stderr(error_file); // 출력 기록
            } // 처리 종료
            None => // 기록 파일 없음
            { // 처리 시작
                command.stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()); // 출력 버림
            } // 처리 종료
        } // 분기 종료
        let child = command.spawn().map_err(|_| format!("실행 엔진을 실행하지 못했습니다: {}", program.display()))?; // 실행
        #[cfg(windows)] // Windows 전용
        if let Some(job) = &self.job // Job 확인
        { // 조건 시작
            job.assign(&child); // 앱과 수명 묶기
        } // 조건 종료
        Ok(Box::new(SystemProcess { child })) // 프로세스 반환
    } // 함수 종료
} // 구현 종료

#[tauri::command] // Tauri 명령 표시
pub fn get_local_runtime_status(runtime: tauri::State<'_, LocalRuntimeManager>) -> RuntimeStatus // 엔진 상태 조회 명령
{ // 함수 시작
    runtime.status() // 상태 반환
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub fn stop_local_runtime(runtime: tauri::State<'_, LocalRuntimeManager>) // 엔진 끄기 명령
{ // 함수 시작
    runtime.stop(); // 끄기
} // 함수 종료

#[cfg(test)] // 테스트 전용 모듈
mod tests // 단위 테스트 모듈
{ // 모듈 시작
    use super::*; // 상위 항목 사용
    use std::io::{Read, Write}; // 시험 서버 입출력
    use std::net::TcpListener; // 시험 서버
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering}; // 공유 표시
    use std::sync::Arc; // 공유 소유

    const DEVICES: &str = "load_backend: loaded Vulkan backend\nAvailable devices:\n  Vulkan0: AMD Radeon(TM) Graphics (8146 MiB, 7900 MiB free)\n  Vulkan1: NVIDIA GeForce RTX 5070 Ti (16303 MiB, 15012 MiB free)\n"; // 장치 목록 예시

    struct FakeProcess // 가짜 실행 엔진 프로세스
    { // 구조 시작
        running: Arc<AtomicBool>, // 실행 중 표시
    } // 구조 종료

    impl RuntimeProcess for FakeProcess // 프로세스 동작
    { // 구현 시작
        fn has_exited(&mut self) -> bool // 종료 확인
        { // 함수 시작
            !self.running.load(Ordering::SeqCst) // 실행 표시 반대
        } // 함수 종료

        fn kill(&mut self) // 종료
        { // 함수 시작
            self.running.store(false, Ordering::SeqCst); // 실행 표시 끄기
        } // 함수 종료
    } // 구현 종료

    fn serve_health(port: u16, running: Arc<AtomicBool>, busy_first: bool) // 준비 확인 시험 서버
    { // 함수 시작
        let listener = TcpListener::bind(("127.0.0.1", port)).expect("시험 서버"); // 받은 포트로 열기
        listener.set_nonblocking(true).expect("비차단"); // 종료 확인을 위한 비차단
        std::thread::spawn(move || // 서버 실행
        { // 실행 시작
            let mut answered = 0usize; // 응답 횟수
            while running.load(Ordering::SeqCst) // 실행 중 반복
            { // 반복 시작
                match listener.accept() // 연결 확인
                { // 분기 시작
                    Ok((mut stream, _)) => // 연결 수락
                    { // 처리 시작
                        stream.set_nonblocking(false).ok(); // 차단 읽기
                        let mut buffer = [0u8; 2048]; // 읽기 버퍼
                        let _ = stream.read(&mut buffer); // 요청 읽기
                        let status = if busy_first && answered == 0 { "503 Service Unavailable" } else { "200 OK" }; // 첫 응답은 적재 중
                        answered += 1; // 응답 횟수 증가
                        let _ = stream.write_all(format!("HTTP/1.1 {status}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{{}}").as_bytes()); // 응답 전송
                    } // 처리 종료
                    Err(_) => std::thread::sleep(Duration::from_millis(20)), // 잠시 대기
                } // 분기 종료
            } // 반복 종료
        }); // 실행 종료
    } // 함수 종료

    struct FakeLauncher // 가짜 실행기
    { // 구조 시작
        fail_vulkan: bool, // 그래픽 실행 실패 여부
        fail_cpu: bool, // CPU 실행 실패 여부
        launches: Arc<AtomicUsize>, // 실행 횟수
        last_args: Arc<Mutex<Vec<String>>>, // 마지막 인자
        processes: Arc<Mutex<Vec<Arc<AtomicBool>>>>, // 만든 프로세스 표시
    } // 구조 종료

    impl FakeLauncher // 가짜 실행기 생성
    { // 구현 시작
        fn new(fail_vulkan: bool, fail_cpu: bool) -> Self // 생성자
        { // 함수 시작
            Self { fail_vulkan, fail_cpu, launches: Arc::new(AtomicUsize::new(0)), last_args: Arc::new(Mutex::new(Vec::new())), processes: Arc::new(Mutex::new(Vec::new())) } // 실행기 반환
        } // 함수 종료
    } // 구현 종료

    impl ProcessLauncher for FakeLauncher // 실행기 동작
    { // 구현 시작
        fn list_devices(&self, _program: &Path) -> String // 장치 목록
        { // 함수 시작
            DEVICES.to_string() // 예시 반환
        } // 함수 종료

        fn launch(&self, program: &Path, args: &[String], _log_path: Option<&Path>) -> Result<Box<dyn RuntimeProcess>, String> // 실행
        { // 함수 시작
            self.launches.fetch_add(1, Ordering::SeqCst); // 실행 횟수 증가
            *self.last_args.lock().expect("잠금") = args.to_vec(); // 인자 기록
            let is_vulkan = program.to_string_lossy().contains("vulkan"); // 그래픽 빌드 여부
            let running = Arc::new(AtomicBool::new(true)); // 실행 표시
            self.processes.lock().expect("잠금").push(running.clone()); // 표시 보관
            if (is_vulkan && self.fail_vulkan) || (!is_vulkan && self.fail_cpu) // 실패 흉내 확인
            { // 조건 시작
                running.store(false, Ordering::SeqCst); // 바로 종료
                return Ok(Box::new(FakeProcess { running })); // 종료된 프로세스 반환
            } // 조건 종료
            let port: u16 = args[args.iter().position(|arg| arg == "--port").expect("포트") + 1].parse().expect("포트 숫자"); // 포트 인자
            serve_health(port, running.clone(), true); // 준비 확인 서버 시작
            Ok(Box::new(FakeProcess { running })) // 프로세스 반환
        } // 함수 종료
    } // 구현 종료

    fn temp_runtime(with_vulkan: bool) -> (PathBuf, ModelSpec) // 시험용 실행 엔진·모델 폴더
    { // 함수 시작
        let root = std::env::temp_dir().join(format!("mate-runtime-{}-{}", std::process::id(), PORT_SEED.fetch_add(1, std::sync::atomic::Ordering::SeqCst))); // 임시 폴더
        let variants: &[&str] = if with_vulkan { &["vulkan", "cpu"] } else { &["cpu"] }; // 빌드 종류
        for variant in variants // 빌드 순회
        { // 반복 시작
            std::fs::create_dir_all(root.join(variant)).expect("폴더"); // 폴더 생성
            std::fs::write(root.join(variant).join(SERVER_FILE_NAME), b"").expect("파일"); // 빈 실행 파일
        } // 반복 종료
        let model = root.join("model.gguf"); // 모델 파일
        std::fs::write(&model, b"GGUF").expect("모델"); // 빈 모델
        (root, ModelSpec { path: model, context_length: 4096, generation: Map::new(), chat_template_kwargs: None }) // 폴더와 모델 반환
    } // 함수 종료

    static PORT_SEED: AtomicUsize = AtomicUsize::new(0); // 임시 폴더 구분 번호

    fn manager(launcher: FakeLauncher, root: Option<PathBuf>, model: Option<ModelSpec>) -> LocalRuntimeManager // 시험 관리자
    { // 함수 시작
        LocalRuntimeManager::new(RuntimeConfig { runtime_root: root, model, log_path: None }, Box::new(launcher), Duration::from_secs(5)) // 관리자 반환
    } // 함수 종료

    #[test] // 테스트 표시
    fn largest_vulkan_device_is_selected() // 장치 선택 검증
    { // 함수 시작
        let devices = parse_list_devices(DEVICES); // 장치 해석
        assert_eq!(devices.len(), 2); // 장치 수 확인
        assert_eq!(pick_largest_device(&devices), Some("Vulkan1".to_string())); // 큰 장치 선택
        assert_eq!(pick_largest_device(&parse_list_devices("Available devices:\n")), None); // 장치 없음
    } // 함수 종료

    #[test] // 테스트 표시
    fn server_arguments_bind_locally_with_one_time_key() // 실행 인자 검증
    { // 함수 시작
        let model = ModelSpec { path: PathBuf::from("m.gguf"), context_length: 4096, generation: Map::new(), chat_template_kwargs: None }; // 모델
        let common = ["-m", "m.gguf", "--host", "127.0.0.1", "--port", "4321", "--api-key", "k", "-c", "4096", "-np", "1", "--no-webui"].map(String::from).to_vec(); // 공통 인자
        assert_eq!(build_server_args(&model, 4321, "k", &RuntimeBackend { variant: RuntimeVariant::Vulkan, device: Some("Vulkan1".to_string()) }), [common.clone(), ["-ngl", "999", "--device", "Vulkan1"].map(String::from).to_vec()].concat()); // 그래픽 인자
        assert_eq!(build_server_args(&model, 4321, "k", &RuntimeBackend { variant: RuntimeVariant::Cpu, device: None }), [common, ["-ngl", "0"].map(String::from).to_vec()].concat()); // CPU 인자
    } // 함수 종료

    #[test] // 테스트 표시
    fn one_time_keys_are_long_random_hex() // 일회용 키 검증
    { // 함수 시작
        let first = generate_api_key().expect("키"); // 첫 키
        let second = generate_api_key().expect("키"); // 둘째 키
        assert_eq!(first.len(), 64); // 길이 확인
        assert!(first.chars().all(|character| character.is_ascii_hexdigit())); // 16진수 확인
        assert_ne!(first, second); // 매번 다름 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn idle_engine_is_unloaded_after_the_limit() // 쉬는 시간 검증
    { // 함수 시작
        assert!(!should_unload(Some(100), 100 + 599, 600)); // 제한 전 유지
        assert!(should_unload(Some(100), 100 + 600, 600)); // 제한 도달 내리기
        assert!(!should_unload(None, 10_000, 600)); // 사용 기록 없음 유지
    } // 함수 종료

    #[test] // 테스트 표시
    fn environment_values_configure_runtime_folder_and_model() // 환경 변수 설정 검증
    { // 함수 시작
        let (root, model) = temp_runtime(false); // 시험 폴더
        let config = config_from_values(Some(root.to_string_lossy().to_string()), Some(model.path.to_string_lossy().to_string()), None, None); // 설정 생성
        assert_eq!(config.runtime_root, Some(root.clone())); // 실행 엔진 폴더 확인
        assert_eq!(config.model.map(|spec| spec.path), Some(model.path.clone())); // 모델 확인
        let missing = config_from_values(None, Some(root.join("없음.gguf").to_string_lossy().to_string()), Some(root.join("기본")), None); // 없는 모델
        assert!(missing.model.is_none()); // 없는 모델 무시
        assert_eq!(missing.runtime_root, Some(root.join("기본"))); // 기본 리소스 폴더 사용
        assert!(config_from_values(None, Some(root.join("model.txt").to_string_lossy().to_string()), None, None).model.is_none()); // GGUF 아닌 파일 무시
    } // 함수 종료

    #[test] // 테스트 표시
    fn missing_model_or_runtime_is_not_ready() // 미준비 검증
    { // 함수 시작
        let (root, model) = temp_runtime(false); // 시험 폴더
        let no_model = manager(FakeLauncher::new(false, false), Some(root.clone()), None); // 모델 없음
        assert!(tauri::async_runtime::block_on(no_model.ensure_ready()).expect_err("미준비").starts_with("BUNDLED_NOT_READY")); // 미준비 확인
        let no_runtime = manager(FakeLauncher::new(false, false), Some(root.join("없음")), Some(model)); // 실행 엔진 없음
        assert!(tauri::async_runtime::block_on(no_runtime.ensure_ready()).expect_err("미준비").starts_with("BUNDLED_NOT_READY")); // 미준비 확인
        assert_eq!(no_runtime.status().state, "stopped"); // 꺼짐 상태 유지
    } // 함수 종료

    #[test] // 테스트 표시
    fn vulkan_failure_falls_back_to_cpu_and_reuses_the_running_engine() // CPU 전환·재사용 검증
    { // 함수 시작
        let (root, model) = temp_runtime(true); // 그래픽·CPU 폴더
        let launcher = FakeLauncher::new(true, false); // 그래픽 실패 실행기
        let launches = launcher.launches.clone(); // 실행 횟수
        let args = launcher.last_args.clone(); // 마지막 인자
        let runtime = manager(launcher, Some(root), Some(model)); // 관리자
        let endpoint = tauri::async_runtime::block_on(runtime.ensure_ready()).expect("준비"); // 준비
        assert!(endpoint.base_url.starts_with("http://127.0.0.1:")); // 로컬 주소 확인
        assert_eq!(endpoint.api_key.as_deref().map(str::len), Some(64)); // 일회용 키 확인
        assert_eq!(launches.load(Ordering::SeqCst), 2); // 그래픽 1번 + CPU 1번
        assert!(args.lock().expect("잠금").ends_with(&["-ngl".to_string(), "0".to_string()])); // CPU 인자 확인
        let status = runtime.status(); // 상태
        assert_eq!((status.state, status.backend), ("ready", Some("cpu".to_string()))); // 준비·CPU 확인
        assert_eq!(tauri::async_runtime::block_on(runtime.ensure_ready()).expect("재사용"), endpoint); // 같은 엔진 재사용
        assert_eq!(launches.load(Ordering::SeqCst), 2); // 추가 실행 없음
    } // 함수 종료

    #[test] // 테스트 표시
    fn graphics_device_is_used_when_vulkan_starts() // 그래픽 실행 검증
    { // 함수 시작
        let (root, model) = temp_runtime(true); // 그래픽·CPU 폴더
        let launcher = FakeLauncher::new(false, false); // 정상 실행기
        let args = launcher.last_args.clone(); // 마지막 인자
        let runtime = manager(launcher, Some(root), Some(model)); // 관리자
        tauri::async_runtime::block_on(runtime.ensure_ready()).expect("준비"); // 준비
        assert!(args.lock().expect("잠금").ends_with(&["--device".to_string(), "Vulkan1".to_string()])); // 큰 그래픽 장치 확인
        assert_eq!(runtime.status().backend, Some("vulkan".to_string())); // 그래픽 실행 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn failure_on_every_backend_is_reported() // 모두 실패 검증
    { // 함수 시작
        let (root, model) = temp_runtime(true); // 그래픽·CPU 폴더
        let runtime = manager(FakeLauncher::new(true, true), Some(root), Some(model)); // 모두 실패 실행기
        assert!(tauri::async_runtime::block_on(runtime.ensure_ready()).is_err()); // 실패 확인
        let status = runtime.status(); // 상태
        assert_eq!(status.state, "failed"); // 실패 상태 확인
        assert!(status.message.is_some()); // 실패 이유 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn stopping_and_idle_unload_kill_the_engine() // 종료·내리기 검증
    { // 함수 시작
        let (root, model) = temp_runtime(false); // CPU 폴더
        let launcher = FakeLauncher::new(false, false); // 정상 실행기
        let processes = launcher.processes.clone(); // 프로세스 표시
        let runtime = manager(launcher, Some(root), Some(model)); // 관리자
        tauri::async_runtime::block_on(runtime.ensure_ready()).expect("준비"); // 준비
        runtime.stop(); // 종료
        assert!(!processes.lock().expect("잠금")[0].load(Ordering::SeqCst)); // 프로세스 종료 확인
        assert_eq!(runtime.status().state, "stopped"); // 꺼짐 확인
        tauri::async_runtime::block_on(runtime.ensure_ready()).expect("다시 준비"); // 다시 준비
        runtime.touch(1_000); // 사용 시각 기록
        assert!(!runtime.unload_if_idle(1_000 + 599, 600)); // 제한 전 유지
        assert!(runtime.unload_if_idle(1_000 + 600, 600)); // 제한 도달 내리기
        assert!(!processes.lock().expect("잠금")[1].load(Ordering::SeqCst)); // 둘째 프로세스 종료 확인
        assert_eq!(runtime.status().state, "stopped"); // 꺼짐 확인
    } // 함수 종료
} // 모듈 종료
