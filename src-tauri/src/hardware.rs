// 이 PC 사양 확인: 그래픽 전용 메모리(DXGI), 전체 RAM, 모델 폴더 드라이브의 남은 공간
use serde::Serialize; // JSON 변환 도구
use std::path::Path; // 경로 도구

#[derive(Clone, Debug, Default, PartialEq, Serialize)] // 복사·비교·JSON 가능
#[serde(rename_all = "camelCase")] // 낙타식 필드 이름
pub struct HardwareInfo // PC 사양
{ // 구조 시작
    pub gpu_name: Option<String>, // 가장 큰 그래픽 장치 이름
    pub vram_bytes: u64, // 그래픽 전용 메모리
    pub ram_bytes: u64, // 전체 RAM
} // 구조 종료

#[derive(Clone, Debug, PartialEq)] // 복사·비교 가능
pub struct AdapterInfo // 그래픽 장치 정보
{ // 구조 시작
    pub name: String, // 장치 이름
    pub dedicated_bytes: u64, // 전용 메모리
    pub software: bool, // 소프트웨어 장치 여부
} // 구조 종료

pub fn pick_best_adapter(adapters: &[AdapterInfo]) -> Option<(String, u64)> // 전용 메모리가 가장 큰 실제 장치
{ // 함수 시작
    adapters.iter().filter(|adapter| !adapter.software && adapter.dedicated_bytes > 0).max_by_key(|adapter| adapter.dedicated_bytes).map(|adapter| (adapter.name.clone(), adapter.dedicated_bytes)) // 장치 반환
} // 함수 종료

#[cfg(windows)] // Windows 전용
fn list_adapters() -> Vec<AdapterInfo> // DXGI 그래픽 장치 목록
{ // 함수 시작
    use windows::Win32::Graphics::Dxgi::{CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE}; // DXGI API
    let Ok(factory) = (unsafe { CreateDXGIFactory1::<IDXGIFactory1>() }) else { return Vec::new(); }; // 장치 공장 생성
    let mut adapters = Vec::new(); // 장치 목록
    let mut index = 0u32; // 장치 번호
    while let Ok(adapter) = unsafe { factory.EnumAdapters1(index) } // 장치 순회
    { // 반복 시작
        if let Ok(description) = unsafe { adapter.GetDesc1() } // 장치 설명
        { // 조건 시작
            let length = description.Description.iter().position(|character| *character == 0).unwrap_or(description.Description.len()); // 이름 길이
            adapters.push(AdapterInfo { name: String::from_utf16_lossy(&description.Description[..length]), dedicated_bytes: description.DedicatedVideoMemory as u64, software: (description.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32) != 0 }); // 장치 추가
        } // 조건 종료
        index += 1; // 다음 장치
    } // 반복 종료
    adapters // 목록 반환
} // 함수 종료

#[cfg(not(windows))] // 다른 운영체제
fn list_adapters() -> Vec<AdapterInfo> // 그래픽 장치 목록
{ // 함수 시작
    Vec::new() // 확인하지 않음
} // 함수 종료

#[cfg(windows)] // Windows 전용
fn total_ram_bytes() -> u64 // 전체 RAM
{ // 함수 시작
    use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX}; // 메모리 API
    let mut status: MEMORYSTATUSEX = unsafe { std::mem::zeroed() }; // 메모리 정보
    status.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32; // 구조 크기
    if unsafe { GlobalMemoryStatusEx(&mut status) } == 0 { 0 } else { status.ullTotalPhys } // 전체 RAM 반환
} // 함수 종료

#[cfg(not(windows))] // 다른 운영체제
fn total_ram_bytes() -> u64 // 전체 RAM
{ // 함수 시작
    0 // 확인하지 않음
} // 함수 종료

pub fn detect_hardware() -> HardwareInfo // PC 사양 조회
{ // 함수 시작
    let best = pick_best_adapter(&list_adapters()); // 가장 큰 그래픽 장치
    HardwareInfo { gpu_name: best.as_ref().map(|(name, _)| name.clone()), vram_bytes: best.map(|(_, bytes)| bytes).unwrap_or(0), ram_bytes: total_ram_bytes() } // 사양 반환
} // 함수 종료

#[cfg(windows)] // Windows 전용
pub fn free_disk_bytes(path: &Path) -> Option<u64> // 경로가 있는 드라이브의 남은 공간
{ // 함수 시작
    use std::os::windows::ffi::OsStrExt; // 넓은 문자 변환
    let existing = path.ancestors().find(|candidate| candidate.exists())?; // 있는 상위 폴더
    let wide: Vec<u16> = existing.as_os_str().encode_wide().chain(std::iter::once(0)).collect(); // 넓은 문자 경로
    let mut available = 0u64; // 사용 가능 공간
    let succeeded = unsafe { windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW(wide.as_ptr(), &mut available, std::ptr::null_mut(), std::ptr::null_mut()) }; // 공간 조회
    if succeeded == 0 { None } else { Some(available) } // 결과 반환
} // 함수 종료

#[cfg(not(windows))] // 다른 운영체제
pub fn free_disk_bytes(_path: &Path) -> Option<u64> // 남은 공간
{ // 함수 시작
    None // 확인하지 않음
} // 함수 종료

#[cfg(test)] // 테스트 전용 모듈
mod tests // 단위 테스트 모듈
{ // 모듈 시작
    use super::*; // 상위 항목 사용

    #[test] // 테스트 표시
    fn the_adapter_with_most_dedicated_memory_wins_and_software_adapters_are_ignored() // 그래픽 선택 검증
    { // 함수 시작
        let adapters = vec![AdapterInfo { name: "AMD Radeon(TM) Graphics".to_string(), dedicated_bytes: 536_870_912, software: false }, AdapterInfo { name: "NVIDIA GeForce RTX 5070 Ti".to_string(), dedicated_bytes: 17_094_934_528, software: false }, AdapterInfo { name: "Microsoft Basic Render Driver".to_string(), dedicated_bytes: 99_000_000_000, software: true }]; // 장치 목록
        assert_eq!(pick_best_adapter(&adapters), Some(("NVIDIA GeForce RTX 5070 Ti".to_string(), 17_094_934_528))); // 큰 실제 장치 선택
        assert_eq!(pick_best_adapter(&[]), None); // 장치 없음
    } // 함수 종료

    #[test] // 테스트 표시
    fn this_pc_reports_memory_and_disk() // 실제 PC 조회 검증
    { // 함수 시작
        let info = detect_hardware(); // 사양 조회
        assert!(info.ram_bytes > 0); // RAM 확인
        assert!(free_disk_bytes(&std::env::temp_dir()).is_some_and(|bytes| bytes > 0)); // 남은 공간 확인
    } // 함수 종료
} // 모듈 종료
