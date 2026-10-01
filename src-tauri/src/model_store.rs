// 내장 인공지능 모델 보관함: 모델 목록, 이 PC 적합도, 받기(이어받기·SHA-256·취소), 삭제, 사용할 모델 선택
// 모델 파일은 앱 업데이트와 상관없이 %LOCALAPPDATA%\MATE Text-Play\models에 둔다
use crate::hardware::{detect_hardware, free_disk_bytes, HardwareInfo}; // PC 사양
use crate::local_runtime::{LocalRuntimeManager, ModelSpec}; // 엔진 관리자
use futures_util::StreamExt; // 비동기 스트림 도구
use serde::{Deserialize, Serialize}; // JSON 변환 도구
use serde_json::{Map, Value}; // JSON 값 도구
use sha2::{Digest, Sha256}; // SHA-256
use std::collections::{HashMap, HashSet}; // 모음 도구
use std::io::{Read, Write}; // 파일 입출력
use std::path::PathBuf; // 경로 도구
use std::sync::atomic::{AtomicBool, Ordering}; // 취소 표시
use std::sync::{Arc, Mutex}; // 공유 상태
use std::time::{Duration, Instant}; // 시간 도구
use tauri::{ipc::Channel, State}; // Tauri 명령 도구

pub(crate) const BUNDLED_CATALOG: &str = include_str!("../resources/model-catalog.json"); // 앱에 넣은 모델 목록
pub(crate) const CATALOG_ENV: &str = "MATE_TEXT_PLAY_MODEL_CATALOG"; // 개발·확인용 목록 파일
pub(crate) const CANCELLED_DOWNLOAD: &str = "DOWNLOAD_CANCELLED: 다운로드를 취소했습니다."; // 취소 오류
const ROLES: [&str; 3] = ["light", "standard", "high"]; // 모델 역할
const PROGRESS_INTERVAL: Duration = Duration::from_millis(250); // 진행률 알림 간격
const GB: u64 = 1_073_741_824; // 1GiB

#[derive(Clone, Debug, Deserialize)] // 복사·JSON 가능
pub struct ModelDownload // 받기 정보
{ // 구조 시작
    pub url: String, // 고정 주소
    pub sha256: String, // 파일 SHA-256
} // 구조 종료

#[derive(Clone, Debug, Deserialize)] // 복사·JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct CatalogModel // 목록 속 모델
{ // 구조 시작
    pub id: String, // 모델 식별자
    pub label: String, // 표시 이름
    pub role: String, // 가벼움·표준·고성능
    pub file: String, // 파일 이름
    pub size_bytes: u64, // 파일 크기(받기 정보가 없으면 예상치)
    pub license: String, // 라이선스
    pub context_length: u32, // 문맥 길이
    #[serde(default)] // 없으면 빈 설정
    pub generation: Map<String, Value>, // 생성 설정
    #[serde(default)] // 없으면 없음
    pub chat_template_kwargs: Option<Value>, // 템플릿 인자
    #[serde(default)] // 없으면 준비 중
    pub download: Option<ModelDownload>, // 받기 정보
} // 구조 종료

#[derive(Clone, Debug, Deserialize)] // 복사·JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct Catalog // 모델 목록
{ // 구조 시작
    pub schema_version: u32, // 목록 형식 버전
    pub models: Vec<CatalogModel>, // 모델들
} // 구조 종료

#[derive(Clone, Copy, Debug, PartialEq)] // 복사·비교 가능
pub enum Fitness // 이 PC 적합도
{ // 열거 시작
    Recommended, // 권장
    Possible, // 가능
    Slow, // 느릴 수 있음
    Insufficient, // 부족
} // 열거 종료

impl Fitness // 적합도 동작
{ // 구현 시작
    fn label(self) -> &'static str // 화면 전달 이름
    { // 함수 시작
        match self { Fitness::Recommended => "recommended", Fitness::Possible => "possible", Fitness::Slow => "slow", Fitness::Insufficient => "insufficient" } // 이름 반환
    } // 함수 종료
} // 구현 종료

#[derive(Clone, Debug, PartialEq, Serialize)] // 복사·비교·JSON 가능
#[serde(tag = "type", rename_all = "kebab-case")] // 사건 구분 필드
pub enum DownloadEvent // 받기 진행 사건
{ // 열거 시작
    Progress // 진행률
    { // 필드 시작
        #[serde(rename = "receivedBytes")] // 받은 크기
        received_bytes: u64, // 받은 크기
        #[serde(rename = "totalBytes")] // 전체 크기
        total_bytes: u64, // 전체 크기
        #[serde(rename = "bytesPerSecond")] // 속도
        bytes_per_second: u64, // 초당 바이트
    }, // 필드 종료
    Verifying, // 검사 중
    Done, // 완료
} // 열거 종료

#[derive(Clone, Debug, Serialize)] // 복사·JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct ModelView // 화면용 모델 정보
{ // 구조 시작
    pub id: String, // 모델 식별자
    pub label: String, // 표시 이름
    pub role: String, // 역할
    pub license: String, // 라이선스
    pub size_bytes: u64, // 크기
    pub status: &'static str, // not-installed·downloading·installed
    pub downloaded_bytes: u64, // 받은 크기(.part 포함)
    pub available: bool, // 받기 정보 있음
    pub fitness: &'static str, // 적합도
    pub has_room: bool, // 디스크 여유
    pub active: bool, // 사용 중 모델
} // 구조 종료

#[derive(Clone, Debug, Serialize)] // 복사·JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct StoreView // 화면용 보관함 정보
{ // 구조 시작
    pub hardware: HardwareInfo, // PC 사양
    pub free_disk_bytes: Option<u64>, // 남은 공간
    pub models: Vec<ModelView>, // 모델들
    pub active_model_id: Option<String>, // 사용 중 모델
} // 구조 종료

fn is_safe_file_name(name: &str) -> bool // 모델 폴더 밖으로 나가지 않는 파일 이름
{ // 함수 시작
    name.ends_with(".gguf") && !name.contains("..") && name.chars().all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_')) // 허용 문자 확인
} // 함수 종료

pub fn is_allowed_download_url(url: &str, allow_loopback: bool) -> bool // 받기 허용 주소
{ // 함수 시작
    let Ok(parsed) = reqwest::Url::parse(url) else { return false; }; // 주소 해석
    if !parsed.username().is_empty() || parsed.password().is_some() // 사용자 정보 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    let host = parsed.host_str().unwrap_or("").to_ascii_lowercase(); // 호스트
    if parsed.scheme() == "https" // 암호화 주소 확인
    { // 조건 시작
        return host == "huggingface.co" || host.ends_with(".huggingface.co") || host.ends_with(".hf.co") || host == "github.com" || host.ends_with(".githubusercontent.com"); // 신뢰 호스트 확인
    } // 조건 종료
    allow_loopback && parsed.scheme() == "http" && matches!(host.as_str(), "127.0.0.1" | "localhost") && parsed.port().is_some() // 개발용 로컬 주소
} // 함수 종료

pub fn parse_catalog(json: &str, allow_loopback: bool) -> Result<Catalog, String> // 모델 목록 해석·검증
{ // 함수 시작
    let catalog: Catalog = serde_json::from_str(json).map_err(|error| format!("모델 목록 형식이 올바르지 않습니다: {error}"))?; // JSON 해석
    if catalog.schema_version != 1 // 형식 버전 확인
    { // 조건 시작
        return Err("지원하지 않는 모델 목록 버전입니다.".to_string()); // 버전 오류
    } // 조건 종료
    let mut ids = HashSet::new(); // 식별자 중복 확인
    for model in &catalog.models // 모델 순회
    { // 반복 시작
        if model.id.is_empty() || !ids.insert(model.id.clone()) || !ROLES.contains(&model.role.as_str()) || !is_safe_file_name(&model.file) || model.size_bytes == 0 || !(512..=32_768).contains(&model.context_length) // 기본 항목 확인
        { // 조건 시작
            return Err(format!("모델 목록 항목이 올바르지 않습니다: {}", model.id)); // 항목 오류
        } // 조건 종료
        if let Some(download) = &model.download // 받기 정보 확인
        { // 조건 시작
            let hash_ok = download.sha256.len() == 64 && download.sha256.chars().all(|character| character.is_ascii_digit() || ('a'..='f').contains(&character)); // 해시 형식
            if !hash_ok || !is_allowed_download_url(&download.url, allow_loopback) // 해시·주소 확인
            { // 조건 시작
                return Err(format!("모델 받기 정보가 올바르지 않습니다: {}", model.id)); // 받기 정보 오류
            } // 조건 종료
        } // 조건 종료
    } // 반복 종료
    Ok(catalog) // 목록 반환
} // 함수 종료

pub fn assess_fitness(role: &str, vram_bytes: u64, ram_bytes: u64) -> Fitness // 계획 문서 적합도 규칙
{ // 함수 시작
    match role // 역할 분기
    { // 분기 시작
        "light" if vram_bytes >= 4 * GB => Fitness::Recommended, // 그래픽 4GB 이상
        "light" if ram_bytes >= 8 * GB => Fitness::Possible, // RAM 8GB 이상
        "light" => Fitness::Slow, // 그 밖
        "standard" if vram_bytes >= 6 * GB => Fitness::Recommended, // 그래픽 6GB 이상
        "standard" if vram_bytes >= 4 * GB || ram_bytes >= 16 * GB => Fitness::Possible, // 그래픽 4GB 또는 RAM 16GB
        "standard" => Fitness::Slow, // 그 밖
        _ if vram_bytes >= 10 * GB => Fitness::Recommended, // 고성능 그래픽 10GB 이상
        _ if vram_bytes >= 8 * GB => Fitness::Possible, // 그래픽 8GB(문맥 축소)
        _ if ram_bytes >= 32 * GB => Fitness::Slow, // RAM 32GB CPU
        _ => Fitness::Insufficient, // 부족
    } // 분기 종료
} // 함수 종료

pub fn has_room(free_bytes: Option<u64>, size_bytes: u64) -> bool // 모델 크기의 1.2배 여유 확인
{ // 함수 시작
    free_bytes.map_or(true, |free| u128::from(free) * 10 >= u128::from(size_bytes) * 12) // 여유 여부 반환
} // 함수 종료

fn sha256_file(path: &std::path::Path) -> Result<String, String> // 파일 SHA-256
{ // 함수 시작
    let mut file = std::fs::File::open(path).map_err(|_| "받은 파일을 열지 못했습니다.".to_string())?; // 파일 열기
    let mut hasher = Sha256::new(); // 해시 준비
    let mut buffer = vec![0u8; 1 << 20]; // 1MB 버퍼
    loop // 읽기 반복
    { // 반복 시작
        let read = file.read(&mut buffer).map_err(|_| "받은 파일을 읽지 못했습니다.".to_string())?; // 조각 읽기
        if read == 0 { break; } // 끝 확인
        hasher.update(&buffer[..read]); // 해시 반영
    } // 반복 종료
    Ok(hasher.finalize().iter().map(|byte| format!("{byte:02x}")).collect()) // 16진수 반환
} // 함수 종료

#[derive(Default, Deserialize, Serialize)] // JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
struct StoreFile // 보관함 설정 파일(store.json)
{ // 구조 시작
    active_model_id: Option<String>, // 사용 중 모델
} // 구조 종료

pub struct ModelStore // 모델 보관함
{ // 구조 시작
    directory: PathBuf, // 모델 폴더
    pub(crate) catalog: Catalog, // 모델 목록
    allow_loopback: bool, // 개발용 로컬 주소 허용
    active: Mutex<Option<String>>, // 사용 중 모델
    downloads: Mutex<HashMap<String, Arc<AtomicBool>>>, // 받는 중 모델과 취소 표시
} // 구조 종료

impl ModelStore // 보관함 동작
{ // 구현 시작
    pub fn new(directory: PathBuf, catalog: Catalog, allow_loopback: bool) -> Self // 생성자
    { // 함수 시작
        let saved: StoreFile = std::fs::read_to_string(directory.join("store.json")).ok().and_then(|text| serde_json::from_str(&text).ok()).unwrap_or_default(); // 저장된 선택
        let active = saved.active_model_id.filter(|id| catalog.models.iter().any(|model| &model.id == id)); // 목록에 있는 선택만
        Self { directory, catalog, allow_loopback, active: Mutex::new(active), downloads: Mutex::new(HashMap::new()) } // 보관함 반환
    } // 함수 종료

    pub fn directory(&self) -> &std::path::Path // 모델 폴더
    { // 함수 시작
        &self.directory // 경로 반환
    } // 함수 종료

    fn model(&self, id: &str) -> Option<&CatalogModel> // 모델 조회
    { // 함수 시작
        self.catalog.models.iter().find(|model| model.id == id) // 일치 모델 반환
    } // 함수 종료

    fn final_path(&self, model: &CatalogModel) -> PathBuf // 완료 파일 경로
    { // 함수 시작
        self.directory.join(&model.file) // 경로 반환
    } // 함수 종료

    fn part_path(&self, model: &CatalogModel) -> PathBuf // 받는 중 파일 경로
    { // 함수 시작
        self.directory.join(format!("{}.part", model.file)) // 경로 반환
    } // 함수 종료

    fn is_installed(&self, model: &CatalogModel) -> bool // 설치 여부(크기 일치)
    { // 함수 시작
        std::fs::metadata(self.final_path(model)).is_ok_and(|metadata| metadata.len() == model.size_bytes) // 크기 확인
    } // 함수 종료

    fn active_id(&self) -> Option<String> // 사용 중 모델 식별자
    { // 함수 시작
        self.active.lock().ok().and_then(|active| active.clone()) // 식별자 복사
    } // 함수 종료

    pub fn is_active(&self, id: &str) -> bool // 선택된 모델인지 확인
    { // 함수 시작
        self.active_id().as_deref() == Some(id) // 비교 결과 반환
    } // 함수 종료

    fn save_active(&self, active: Option<String>) -> Result<(), String> // 선택 저장
    { // 함수 시작
        std::fs::create_dir_all(&self.directory).map_err(|_| "모델 폴더를 만들지 못했습니다.".to_string())?; // 폴더 생성
        let text = serde_json::to_string_pretty(&StoreFile { active_model_id: active.clone() }).map_err(|_| "선택을 저장하지 못했습니다.".to_string())?; // 설정 직렬화
        std::fs::write(self.directory.join("store.json"), text).map_err(|_| "선택을 저장하지 못했습니다.".to_string())?; // 파일 저장
        if let Ok(mut current) = self.active.lock() // 잠금 확인
        { // 조건 시작
            *current = active; // 선택 반영
        } // 조건 종료
        Ok(()) // 저장 완료
    } // 함수 종료

    fn spec(&self, model: &CatalogModel) -> ModelSpec // 엔진에 넘길 모델 정보
    { // 함수 시작
        ModelSpec { path: self.final_path(model), context_length: model.context_length, generation: model.generation.clone(), chat_template_kwargs: model.chat_template_kwargs.clone() } // 정보 반환
    } // 함수 종료

    pub fn view(&self, hardware: &HardwareInfo, free_disk: Option<u64>) -> Vec<ModelView> // 화면용 모델 정보
    { // 함수 시작
        let downloading: HashSet<String> = self.downloads.lock().map(|downloads| downloads.keys().cloned().collect()).unwrap_or_default(); // 받는 중 모델
        let active = self.active_id(); // 사용 중 모델
        self.catalog.models.iter().map(|model| // 모델 순회
        { // 변환 시작
            let installed = self.is_installed(model); // 설치 여부
            let partial = std::fs::metadata(self.part_path(model)).map(|metadata| metadata.len()).unwrap_or(0); // 받은 크기
            ModelView // 화면 정보
            { // 정보 시작
                id: model.id.clone(), // 식별자
                label: model.label.clone(), // 표시 이름
                role: model.role.clone(), // 역할
                license: model.license.clone(), // 라이선스
                size_bytes: model.size_bytes, // 크기
                status: if installed { "installed" } else if downloading.contains(&model.id) { "downloading" } else { "not-installed" }, // 상태
                downloaded_bytes: if installed { model.size_bytes } else { partial }, // 받은 크기
                available: model.download.is_some(), // 받기 가능
                fitness: assess_fitness(&model.role, hardware.vram_bytes, hardware.ram_bytes).label(), // 적합도
                has_room: installed || has_room(free_disk, model.size_bytes), // 디스크 여유
                active: active.as_deref() == Some(model.id.as_str()) && installed, // 사용 중
            } // 정보 종료
        }).collect() // 목록 반환
    } // 함수 종료

    pub async fn download<F: FnMut(DownloadEvent)>(&self, id: &str, free_disk: Option<u64>, mut emit: F) -> Result<(), String> // 모델 받기
    { // 함수 시작
        let model = self.model(id).ok_or_else(|| "모델을 찾을 수 없습니다.".to_string())?.clone(); // 모델
        let download = model.download.clone().ok_or_else(|| "이 모델은 아직 받을 수 없습니다(준비 중).".to_string())?; // 받기 정보
        if self.is_installed(&model) // 이미 설치 확인
        { // 조건 시작
            emit(DownloadEvent::Done); // 완료 알림
            return Ok(()); // 처리 종료
        } // 조건 종료
        if !has_room(free_disk, model.size_bytes) // 디스크 여유 확인
        { // 조건 시작
            return Err("디스크 공간이 부족합니다(모델 크기의 1.2배 필요).".to_string()); // 공간 부족
        } // 조건 종료
        let cancel = Arc::new(AtomicBool::new(false)); // 취소 표시
        { // 등록 시작
            let mut downloads = self.downloads.lock().map_err(|_| "받기 상태를 확인하지 못했습니다.".to_string())?; // 받기 목록
            if downloads.contains_key(id) // 중복 확인
            { // 조건 시작
                return Err("이미 받고 있는 모델입니다.".to_string()); // 중복 오류
            } // 조건 종료
            downloads.insert(id.to_string(), cancel.clone()); // 받기 등록
        } // 등록 종료
        let result = self.download_file(&model, &download, &cancel, &mut emit).await; // 받기 실행
        if let Ok(mut downloads) = self.downloads.lock() // 잠금 확인
        { // 조건 시작
            downloads.remove(id); // 받기 해제
        } // 조건 종료
        result // 결과 반환
    } // 함수 종료

    async fn download_file<F: FnMut(DownloadEvent)>(&self, model: &CatalogModel, download: &ModelDownload, cancel: &AtomicBool, emit: &mut F) -> Result<(), String> // 파일 받기·검사
    { // 함수 시작
        std::fs::create_dir_all(&self.directory).map_err(|_| "모델 폴더를 만들지 못했습니다.".to_string())?; // 폴더 생성
        let part = self.part_path(model); // 받는 중 파일
        let mut offset = std::fs::metadata(&part).map(|metadata| metadata.len()).unwrap_or(0); // 받은 크기
        if offset > model.size_bytes // 크기 초과 확인
        { // 조건 시작
            let _ = std::fs::remove_file(&part); // 잘못된 파일 삭제
            offset = 0; // 처음부터
        } // 조건 종료
        let allow_loopback = self.allow_loopback; // 로컬 허용 여부
        let client = reqwest::Client::builder() // 통신기 설정
            .no_proxy() // 시스템 프록시 우회
            .redirect(reqwest::redirect::Policy::custom(move |attempt| if attempt.previous().len() >= 5 { attempt.error("너무 많은 이동") } else if is_allowed_download_url(attempt.url().as_str(), allow_loopback) { attempt.follow() } else { attempt.stop() })) // 허용 주소로만 이동
            .connect_timeout(Duration::from_secs(15)) // 연결 제한 시간
            .read_timeout(Duration::from_secs(60)) // 읽기 제한 시간
            .build() // 통신기 생성
            .map_err(|_| "받기 통신기를 만들지 못했습니다.".to_string())?; // 생성 오류
        let mut request = client.get(&download.url); // 요청 준비
        if offset > 0 && offset < model.size_bytes // 이어받기 확인
        { // 조건 시작
            request = request.header(reqwest::header::RANGE, format!("bytes={offset}-")); // 남은 부분 요청
        } // 조건 종료
        if offset < model.size_bytes // 받을 부분 확인
        { // 조건 시작
            let response = request.send().await.map_err(|_| "모델 서버에 연결하지 못했습니다.".to_string())?; // 요청 전송
            let status = response.status().as_u16(); // 상태 코드
            if status != 200 && status != 206 // 상태 확인
            { // 조건 시작
                return Err(format!("모델을 받지 못했습니다({status}).")); // 상태 오류
            } // 조건 종료
            if status == 200 // 처음부터 응답 확인
            { // 조건 시작
                offset = 0; // 처음부터
            } // 조건 종료
            let mut file = std::fs::OpenOptions::new().create(true).write(true).append(offset > 0).truncate(offset == 0).open(&part).map_err(|_| "받는 파일을 만들지 못했습니다.".to_string())?; // 파일 열기
            let mut received = offset; // 받은 크기
            let started = Instant::now(); // 시작 시각
            let mut last_emit: Option<Instant> = None; // 마지막 알림
            let mut stream = response.bytes_stream(); // 응답 스트림
            while let Some(part_bytes) = stream.next().await // 조각 순회
            { // 반복 시작
                if cancel.load(Ordering::SeqCst) // 취소 확인
                { // 조건 시작
                    return Err(CANCELLED_DOWNLOAD.to_string()); // 취소(받은 부분은 이어받기용으로 둠)
                } // 조건 종료
                let bytes = part_bytes.map_err(|_| "받는 중 연결이 끊겼습니다. 다시 받으면 이어서 받습니다.".to_string())?; // 조각
                received = received.saturating_add(bytes.len() as u64); // 받은 크기
                if received > model.size_bytes // 크기 초과 확인
                { // 조건 시작
                    drop(file); // 파일 닫기
                    let _ = std::fs::remove_file(&part); // 잘못된 파일 삭제
                    return Err("모델 크기가 목록과 다릅니다.".to_string()); // 크기 오류
                } // 조건 종료
                file.write_all(&bytes).map_err(|_| "받은 내용을 저장하지 못했습니다(디스크 공간 확인).".to_string())?; // 조각 저장
                if last_emit.map_or(true, |time| time.elapsed() >= PROGRESS_INTERVAL) // 알림 간격 확인
                { // 조건 시작
                    let seconds = started.elapsed().as_secs_f64().max(0.001); // 경과 초
                    emit(DownloadEvent::Progress { received_bytes: received, total_bytes: model.size_bytes, bytes_per_second: ((received - offset) as f64 / seconds) as u64 }); // 진행률 알림
                    last_emit = Some(Instant::now()); // 알림 시각
                } // 조건 종료
            } // 반복 종료
            file.flush().map_err(|_| "받은 내용을 저장하지 못했습니다.".to_string())?; // 저장 마무리
            let seconds = started.elapsed().as_secs_f64().max(0.001); // 경과 초
            emit(DownloadEvent::Progress { received_bytes: received, total_bytes: model.size_bytes, bytes_per_second: ((received - offset) as f64 / seconds) as u64 }); // 마지막 진행률
            if cancel.load(Ordering::SeqCst) // 마지막 취소 확인
            { // 조건 시작
                return Err(CANCELLED_DOWNLOAD.to_string()); // 취소
            } // 조건 종료
            if received != model.size_bytes // 크기 확인
            { // 조건 시작
                return Err("받는 중 연결이 끊겼습니다. 다시 받으면 이어서 받습니다.".to_string()); // 미완료(이어받기 가능)
            } // 조건 종료
        } // 조건 종료
        emit(DownloadEvent::Verifying); // 검사 시작 알림
        let path = part.clone(); // 검사 경로
        let actual = tauri::async_runtime::spawn_blocking(move || sha256_file(&path)).await.map_err(|_| "받은 파일을 검사하지 못했습니다.".to_string())??; // SHA-256 계산(별도 스레드)
        if actual != download.sha256 // 해시 비교
        { // 조건 시작
            let _ = std::fs::remove_file(&part); // 잘못된 파일 삭제
            return Err("SHA-256이 맞지 않아 받은 파일을 지웠습니다. 다시 받아 주세요.".to_string()); // 해시 오류
        } // 조건 종료
        std::fs::rename(&part, self.final_path(model)).map_err(|_| "받은 파일을 옮기지 못했습니다.".to_string())?; // 완료 파일로 이동
        emit(DownloadEvent::Done); // 완료 알림
        Ok(()) // 성공
    } // 함수 종료

    pub fn cancel(&self, id: &str) // 받기 취소
    { // 함수 시작
        if let Some(flag) = self.downloads.lock().ok().and_then(|downloads| downloads.get(id).cloned()) // 받는 중 확인
        { // 조건 시작
            flag.store(true, Ordering::SeqCst); // 취소 표시
        } // 조건 종료
    } // 함수 종료

    pub fn delete(&self, id: &str) -> Result<bool, String> // 모델 삭제(선택 모델이었는지 반환)
    { // 함수 시작
        let model = self.model(id).ok_or_else(|| "모델을 찾을 수 없습니다.".to_string())?.clone(); // 모델
        if self.downloads.lock().map(|downloads| downloads.contains_key(id)).unwrap_or(false) // 받는 중 확인
        { // 조건 시작
            return Err("받는 중에는 지울 수 없습니다. 먼저 취소해 주세요.".to_string()); // 받는 중 오류
        } // 조건 종료
        for path in [self.final_path(&model), self.part_path(&model)] // 파일 순회
        { // 반복 시작
            if path.exists() // 파일 확인
            { // 조건 시작
                std::fs::remove_file(&path).map_err(|_| "모델 파일을 지우지 못했습니다(사용 중일 수 있음).".to_string())?; // 파일 삭제
            } // 조건 종료
        } // 반복 종료
        let was_active = self.active_id().as_deref() == Some(id); // 선택 모델 여부
        if was_active // 선택 해제 확인
        { // 조건 시작
            self.save_active(None)?; // 선택 해제 저장
        } // 조건 종료
        Ok(was_active) // 결과 반환
    } // 함수 종료

    pub fn select(&self, id: &str) -> Result<ModelSpec, String> // 사용할 모델 선택
    { // 함수 시작
        let model = self.model(id).ok_or_else(|| "모델을 찾을 수 없습니다.".to_string())?.clone(); // 모델
        if !self.is_installed(&model) // 설치 확인
        { // 조건 시작
            return Err("먼저 모델을 받아 주세요.".to_string()); // 미설치 오류
        } // 조건 종료
        self.save_active(Some(model.id.clone()))?; // 선택 저장
        Ok(self.spec(&model)) // 모델 정보 반환
    } // 함수 종료

    pub fn active_spec(&self) -> Option<ModelSpec> // 사용 중이고 설치된 모델 정보
    { // 함수 시작
        let id = self.active_id()?; // 선택 식별자
        let model = self.model(&id)?; // 모델
        self.is_installed(model).then(|| self.spec(model)) // 설치된 경우만 반환
    } // 함수 종료

    pub fn store_view(&self) -> StoreView // 화면용 보관함 정보
    { // 함수 시작
        let hardware = detect_hardware(); // PC 사양
        let free_disk = free_disk_bytes(&self.directory); // 남은 공간
        let models = self.view(&hardware, free_disk); // 모델 정보
        let active_model_id = models.iter().find(|model| model.active).map(|model| model.id.clone()); // 사용 중 모델
        StoreView { hardware, free_disk_bytes: free_disk, models, active_model_id } // 정보 반환
    } // 함수 종료
} // 구현 종료

#[tauri::command] // Tauri 명령 표시
pub fn get_model_store(store: State<'_, ModelStore>) -> StoreView // 보관함 조회 명령
{ // 함수 시작
    store.store_view() // 정보 반환
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub async fn download_model(model_id: String, on_event: Channel<DownloadEvent>, store: State<'_, ModelStore>) -> Result<(), String> // 모델 받기 명령
{ // 함수 시작
    let free_disk = free_disk_bytes(store.directory()); // 남은 공간
    store.download(&model_id, free_disk, |event| { let _ = on_event.send(event); }).await // 받기 실행
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub fn cancel_model_download(model_id: String, store: State<'_, ModelStore>) // 받기 취소 명령
{ // 함수 시작
    store.cancel(&model_id); // 취소
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub fn delete_model(model_id: String, store: State<'_, ModelStore>, runtime: State<'_, LocalRuntimeManager>) -> Result<(), String> // 모델 삭제 명령
{ // 함수 시작
    if store.is_active(&model_id) // 사용 중 모델 확인
    { // 조건 시작
        runtime.set_model(None); // 엔진 끄고 모델 해제(파일 잠금 풀기)
    } // 조건 종료
    store.delete(&model_id).map(|_| ()) // 삭제
} // 함수 종료

#[tauri::command] // Tauri 명령 표시
pub fn select_model(model_id: String, store: State<'_, ModelStore>, runtime: State<'_, LocalRuntimeManager>) -> Result<(), String> // 모델 선택 명령
{ // 함수 시작
    let spec = store.select(&model_id)?; // 선택
    runtime.set_model(Some(spec)); // 엔진에 반영(켜져 있으면 끄고 다음 요청에 새 모델로)
    Ok(()) // 완료
} // 함수 종료

#[cfg(test)] // 테스트 전용 모듈
mod tests // 단위 테스트 모듈
{ // 모듈 시작
    use super::*; // 상위 항목 사용
    use std::net::TcpListener; // 시험 서버

    const GB: u64 = 1_073_741_824; // 1GiB

    fn sha256_hex(bytes: &[u8]) -> String // 시험 해시
    { // 함수 시작
        use sha2::Digest; // 해시 계산
        sha2::Sha256::digest(bytes).iter().map(|byte| format!("{byte:02x}")).collect() // 16진수 반환
    } // 함수 종료

    fn catalog_json(url: Option<&str>, sha256: &str, size: u64) -> String // 시험 목록 JSON
    { // 함수 시작
        let download = url.map(|url| serde_json::json!({ "url": url, "sha256": sha256 })).unwrap_or(serde_json::Value::Null); // 받기 정보
        serde_json::json!({ "schemaVersion": 1, "models": [ // 모델 목록
            { "id": "light-model", "label": "가벼움", "role": "light", "file": "light.gguf", "sizeBytes": size, "license": "MIT", "contextLength": 4096, "generation": { "temperature": 0.8 }, "chatTemplateKwargs": null, "download": download }, // 가벼움
            { "id": "standard-model", "label": "표준", "role": "standard", "file": "standard.gguf", "sizeBytes": 3 * GB, "license": "Apache-2.0", "contextLength": 4096, "generation": {}, "chatTemplateKwargs": { "enable_thinking": false }, "download": null }, // 표준
        ] }).to_string() // 문자열 반환
    } // 함수 종료

    fn temp_dir() -> PathBuf // 임시 모델 폴더
    { // 함수 시작
        static SEED: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0); // 구분 번호
        let directory = std::env::temp_dir().join(format!("mate-models-{}-{}", std::process::id(), SEED.fetch_add(1, std::sync::atomic::Ordering::SeqCst))); // 폴더 경로
        std::fs::create_dir_all(&directory).expect("폴더"); // 폴더 생성
        directory // 경로 반환
    } // 함수 종료

    fn serve(body: Vec<u8>, honor_range: bool, delay_ms: u64) -> String // 받기 시험 서버(여러 번 응답)
    { // 함수 시작
        let listener = TcpListener::bind("127.0.0.1:0").expect("시험 서버"); // 임의 포트
        let address = format!("http://{}/model.gguf", listener.local_addr().expect("주소")); // 파일 주소
        std::thread::spawn(move || // 서버 실행
        { // 실행 시작
            for stream in listener.incoming().flatten() // 연결 순회
            { // 반복 시작
                let body = body.clone(); // 내용 복사
                std::thread::spawn(move || // 연결 처리
                { // 처리 시작
                    let mut stream = stream; // 연결
                    let mut buffer = [0u8; 4096]; // 읽기 버퍼
                    let read = stream.read(&mut buffer).unwrap_or(0); // 요청 읽기
                    let request = String::from_utf8_lossy(&buffer[..read]).to_ascii_lowercase(); // 요청 문자열
                    let start = request.lines().find_map(|line| line.strip_prefix("range: bytes=").and_then(|value| value.trim_end_matches('-').trim_end_matches("-\r").split('-').next().and_then(|number| number.trim().parse::<usize>().ok()))).filter(|_| honor_range).unwrap_or(0); // 이어받기 시작 위치
                    let header = if start > 0 { format!("HTTP/1.1 206 Partial Content\r\nContent-Length: {}\r\nContent-Range: bytes {}-{}/{}\r\nConnection: close\r\n\r\n", body.len() - start, start, body.len() - 1, body.len()) } else { format!("HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len()) }; // 응답 머리
                    let _ = stream.write_all(header.as_bytes()); // 머리 전송
                    for chunk in body[start..].chunks(16) // 16바이트씩
                    { // 반복 시작
                        if stream.write_all(chunk).is_err() { return; } // 조각 전송(끊기면 종료)
                        std::thread::sleep(Duration::from_millis(delay_ms)); // 느린 전송 흉내
                    } // 반복 종료
                }); // 처리 종료
            } // 반복 종료
        }); // 실행 종료
        address // 주소 반환
    } // 함수 종료

    fn store_for(url: Option<&str>, body: &[u8]) -> (ModelStore, PathBuf) // 시험 보관함
    { // 함수 시작
        let directory = temp_dir(); // 모델 폴더
        let catalog = parse_catalog(&catalog_json(url, &sha256_hex(body), body.len() as u64), true).expect("목록"); // 목록
        (ModelStore::new(directory.clone(), catalog, true), directory) // 보관함 반환
    } // 함수 종료

    #[test] // 테스트 표시
    fn bundled_catalog_lists_light_standard_and_high_models() // 내장 목록 검증
    { // 함수 시작
        let catalog = parse_catalog(BUNDLED_CATALOG, false).expect("내장 목록"); // 내장 목록 해석
        let roles: Vec<(&str, &str)> = catalog.models.iter().map(|model| (model.id.as_str(), model.role.as_str())).collect(); // 모델과 역할
        assert_eq!(roles, vec![("midm-2.0-mini", "light"), ("qwen3.5-4b", "standard"), ("qwen3.5-9b", "high")]); // 세 모델 확인
        assert!(catalog.models.iter().all(|model| model.file.ends_with(".gguf") && model.size_bytes > 0)); // 파일·크기 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn catalog_rejects_unsafe_or_broken_entries() // 목록 검증
    { // 함수 시작
        assert!(parse_catalog(&catalog_json(Some("http://example.com/a.gguf"), &"a".repeat(64), 10), false).is_err()); // 암호화 안 된 주소 거부
        assert!(parse_catalog(&catalog_json(Some("https://evil.example/a.gguf"), &"a".repeat(64), 10), false).is_err()); // 허용 밖 주소 거부
        assert!(parse_catalog(&catalog_json(Some("https://huggingface.co/a.gguf"), "짧음", 10), false).is_err()); // 잘못된 해시 거부
        assert!(parse_catalog(&catalog_json(Some("http://127.0.0.1:9/a.gguf"), &"a".repeat(64), 10), false).is_err()); // 로컬 주소는 개발 목록에서만
        assert!(parse_catalog(&catalog_json(Some("http://127.0.0.1:9/a.gguf"), &"a".repeat(64), 10), true).is_ok()); // 개발 목록 로컬 주소 허용
        assert!(parse_catalog(&catalog_json(None, "", 10).replace("light.gguf", "../light.gguf"), false).is_err()); // 폴더 밖 파일 이름 거부
    } // 함수 종료

    #[test] // 테스트 표시
    fn only_trusted_https_hosts_are_allowed_for_downloads() // 허용 주소 검증
    { // 함수 시작
        assert!(is_allowed_download_url("https://huggingface.co/x/resolve/main/a.gguf", false)); // 허깅페이스
        assert!(is_allowed_download_url("https://cas-bridge.xethub.hf.co/x", false)); // 허깅페이스 저장소
        assert!(is_allowed_download_url("https://github.com/x/releases/download/v1/a.gguf", false)); // 깃허브
        assert!(is_allowed_download_url("https://release-assets.githubusercontent.com/x", false)); // 깃허브 저장소
        assert!(!is_allowed_download_url("https://huggingface.co.evil.com/a", false)); // 위장 주소
        assert!(!is_allowed_download_url("http://huggingface.co/a", false)); // http 거부
        assert!(!is_allowed_download_url("https://user@huggingface.co/a", false)); // 사용자 정보 거부
        assert!(!is_allowed_download_url("http://127.0.0.1:8000/a", false)); // 로컬 거부(운영)
        assert!(is_allowed_download_url("http://127.0.0.1:8000/a", true)); // 로컬 허용(개발)
    } // 함수 종료

    #[test] // 테스트 표시
    fn fitness_follows_the_plan_table() // 적합도 검증
    { // 함수 시작
        assert_eq!(assess_fitness("light", 4 * GB, 16 * GB), Fitness::Recommended); // 가벼움 그래픽 4GB
        assert_eq!(assess_fitness("light", 0, 8 * GB), Fitness::Possible); // 가벼움 RAM 8GB
        assert_eq!(assess_fitness("light", 0, 4 * GB), Fitness::Slow); // 가벼움 RAM 부족
        assert_eq!(assess_fitness("standard", 6 * GB, 8 * GB), Fitness::Recommended); // 표준 그래픽 6GB
        assert_eq!(assess_fitness("standard", 4 * GB, 8 * GB), Fitness::Possible); // 표준 그래픽 4GB
        assert_eq!(assess_fitness("standard", 0, 16 * GB), Fitness::Possible); // 표준 RAM 16GB
        assert_eq!(assess_fitness("standard", 0, 8 * GB), Fitness::Slow); // 표준 그 밖
        assert_eq!(assess_fitness("high", 10 * GB, 16 * GB), Fitness::Recommended); // 고성능 그래픽 10GB
        assert_eq!(assess_fitness("high", 8 * GB, 16 * GB), Fitness::Possible); // 고성능 그래픽 8GB
        assert_eq!(assess_fitness("high", 0, 32 * GB), Fitness::Slow); // 고성능 RAM 32GB
        assert_eq!(assess_fitness("high", 0, 16 * GB), Fitness::Insufficient); // 고성능 부족
    } // 함수 종료

    #[test] // 테스트 표시
    fn downloads_need_one_point_two_times_the_model_size_free() // 디스크 여유 검증
    { // 함수 시작
        assert!(has_room(Some(120), 100)); // 1.2배 허용
        assert!(!has_room(Some(119), 100)); // 부족 거부
        assert!(has_room(None, 100)); // 확인 불가는 막지 않음(받기 중 오류로 처리)
    } // 함수 종료

    #[test] // 테스트 표시
    fn downloaded_model_is_verified_installed_and_selectable() // 받기·설치·선택 검증
    { // 함수 시작
        let body: Vec<u8> = (0..200u32).map(|value| (value % 251) as u8).collect(); // 모델 내용
        let url = serve(body.clone(), true, 0); // 시험 서버
        let (store, directory) = store_for(Some(&url), &body); // 보관함
        let mut events = Vec::new(); // 진행 사건
        tauri::async_runtime::block_on(store.download("light-model", Some(10 * GB), |event| events.push(event))).expect("받기"); // 받기
        assert_eq!(std::fs::read(directory.join("light.gguf")).expect("파일"), body); // 내용 확인
        assert!(!directory.join("light.gguf.part").exists()); // 임시 파일 정리 확인
        assert!(events.iter().any(|event| matches!(event, DownloadEvent::Progress { received_bytes, .. } if *received_bytes == 200))); // 진행률 확인
        assert!(matches!(events.last(), Some(DownloadEvent::Done))); // 완료 확인
        assert_eq!(store.view(&HardwareInfo::default(), Some(10 * GB))[0].status, "installed"); // 설치 상태 확인
        let spec = store.select("light-model").expect("선택"); // 선택
        assert_eq!(spec.path, directory.join("light.gguf")); // 모델 경로 확인
        assert_eq!(spec.generation.get("temperature"), Some(&serde_json::json!(0.8))); // 생성 설정 확인
        let reopened = ModelStore::new(directory.clone(), store.catalog.clone(), true); // 다시 열기
        assert_eq!(reopened.active_spec().map(|spec| spec.path), Some(directory.join("light.gguf"))); // 선택 유지 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn partial_download_is_resumed_from_where_it_stopped() // 이어받기 검증
    { // 함수 시작
        let body: Vec<u8> = (0..200u32).map(|value| (value % 199) as u8).collect(); // 모델 내용
        let url = serve(body.clone(), true, 0); // 시험 서버
        let (store, directory) = store_for(Some(&url), &body); // 보관함
        std::fs::write(directory.join("light.gguf.part"), &body[..80]).expect("받다 만 파일"); // 앞부분만
        let mut first_progress = None; // 첫 진행률
        tauri::async_runtime::block_on(store.download("light-model", None, |event| if let DownloadEvent::Progress { received_bytes, .. } = event { first_progress.get_or_insert(received_bytes); })).expect("이어받기"); // 받기
        assert!(first_progress.expect("진행률") > 80); // 80바이트 뒤부터 이어짐 확인
        assert_eq!(std::fs::read(directory.join("light.gguf")).expect("파일"), body); // 내용 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn hash_mismatch_deletes_the_file() // 해시 불일치 검증
    { // 함수 시작
        let body: Vec<u8> = vec![7u8; 64]; // 모델 내용
        let url = serve(vec![8u8; 64], true, 0); // 다른 내용을 보내는 서버
        let (store, directory) = store_for(Some(&url), &body); // 보관함(원래 내용의 해시)
        let error = tauri::async_runtime::block_on(store.download("light-model", None, |_| {})).expect_err("해시 오류"); // 받기
        assert!(error.contains("SHA-256")); // 오류 확인
        assert!(!directory.join("light.gguf").exists() && !directory.join("light.gguf.part").exists()); // 파일 삭제 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn blocked_downloads_report_clear_reasons() // 받기 거부 검증
    { // 함수 시작
        let body: Vec<u8> = vec![1u8; 100]; // 모델 내용
        let (store, _directory) = store_for(None, &body); // 받기 정보 없는 보관함
        assert!(tauri::async_runtime::block_on(store.download("light-model", None, |_| {})).expect_err("준비 중").contains("준비")); // 받기 정보 없음
        assert!(tauri::async_runtime::block_on(store.download("없는-모델", None, |_| {})).is_err()); // 없는 모델
        let url = serve(body.clone(), true, 0); // 시험 서버
        let (store, _directory) = store_for(Some(&url), &body); // 보관함
        assert!(tauri::async_runtime::block_on(store.download("light-model", Some(110), |_| {})).expect_err("공간 부족").contains("공간")); // 디스크 부족
        assert!(store.select("light-model").is_err()); // 설치 전 선택 거부
    } // 함수 종료

    #[test] // 테스트 표시
    fn cancelled_download_stops_and_keeps_the_partial_file() // 취소 검증
    { // 함수 시작
        let body: Vec<u8> = vec![3u8; 4_000]; // 큰 모델 내용
        let url = serve(body.clone(), true, 5); // 느린 시험 서버
        let (store, directory) = store_for(Some(&url), &body); // 보관함
        let store = std::sync::Arc::new(store); // 공유 보관함
        let canceller = store.clone(); // 취소용 참조
        let error = tauri::async_runtime::block_on(store.download("light-model", None, move |event| if matches!(event, DownloadEvent::Progress { .. }) { canceller.cancel("light-model"); })).expect_err("취소"); // 첫 진행률에서 취소
        assert_eq!(error, CANCELLED_DOWNLOAD); // 취소 오류 확인
        assert!(directory.join("light.gguf.part").exists()); // 이어받기용 파일 유지
        assert!(!directory.join("light.gguf").exists()); // 완료 파일 없음
    } // 함수 종료

    #[test] // 테스트 표시
    fn deleting_the_active_model_clears_the_selection() // 삭제 검증
    { // 함수 시작
        let body: Vec<u8> = vec![5u8; 50]; // 모델 내용
        let (store, directory) = store_for(None, &body); // 보관함
        std::fs::write(directory.join("light.gguf"), &body).expect("설치 흉내"); // 설치된 파일
        store.select("light-model").expect("선택"); // 선택
        assert_eq!(store.delete("light-model"), Ok(true)); // 선택 모델 삭제
        assert!(!directory.join("light.gguf").exists()); // 파일 삭제 확인
        assert!(store.active_spec().is_none()); // 선택 해제 확인
        assert_eq!(store.view(&HardwareInfo::default(), None)[0].status, "not-installed"); // 상태 확인
    } // 함수 종료

    #[test] // 테스트 표시
    fn view_reports_fitness_room_and_availability() // 화면용 정보 검증
    { // 함수 시작
        let body: Vec<u8> = vec![5u8; 50]; // 모델 내용
        let (store, _directory) = store_for(None, &body); // 보관함
        let hardware = HardwareInfo { gpu_name: Some("시험 그래픽".to_string()), vram_bytes: 8 * GB, ram_bytes: 32 * GB }; // 시험 사양
        let view = store.view(&hardware, Some(3 * GB)); // 화면용 정보
        assert_eq!((view[0].fitness, view[0].available, view[0].has_room), ("recommended", false, true)); // 가벼움
        assert_eq!((view[1].fitness, view[1].has_room), ("recommended", false)); // 표준(3GB×1.2 > 3GB)
    } // 함수 종료
} // 모듈 종료
