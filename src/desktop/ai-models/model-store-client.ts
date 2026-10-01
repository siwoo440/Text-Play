export type ModelRole = "light" | "standard" | "high"; // 모델 역할
export type ModelFitness = "recommended" | "possible" | "slow" | "insufficient"; // 이 PC 적합도
export type ModelStatus = "not-installed" | "downloading" | "installed"; // 모델 상태

export interface HardwareInfo // PC 사양
{ // 구조 시작
    gpuName: string | null; // 가장 큰 그래픽 장치
    vramBytes: number; // 그래픽 전용 메모리
    ramBytes: number; // 전체 RAM
} // 구조 종료

export interface ModelView // 화면용 모델 정보
{ // 구조 시작
    id: string; // 모델 식별자
    label: string; // 표시 이름
    role: ModelRole; // 역할
    license: string; // 라이선스
    sizeBytes: number; // 크기(받기 정보가 없으면 예상치)
    status: ModelStatus; // 상태
    downloadedBytes: number; // 받은 크기
    available: boolean; // 받기 정보 있음
    fitness: ModelFitness; // 적합도
    hasRoom: boolean; // 디스크 여유
    active: boolean; // 사용 중
} // 구조 종료

export interface StoreView // 화면용 보관함 정보
{ // 구조 시작
    hardware: HardwareInfo; // PC 사양
    freeDiskBytes: number | null; // 남은 공간
    models: ModelView[]; // 모델 목록
    activeModelId: string | null; // 사용 중 모델
} // 구조 종료

export interface RuntimeStatus // 실행 엔진 상태
{ // 구조 시작
    state: "stopped" | "starting" | "ready" | "failed"; // 상태
    backend: "vulkan" | "cpu" | null; // 실행 방식
    message: string | null; // 실패 이유
} // 구조 종료

export type DownloadEvent = // 받기 진행 사건
    | { type: "progress"; receivedBytes: number; totalBytes: number; bytesPerSecond: number } // 진행률
    | { type: "verifying" } // 검사 중
    | { type: "done" }; // 완료

export interface ModelStoreClient // 모델 보관함 통신 계약
{ // 구조 시작
    getStore(): Promise<StoreView>; // 보관함 조회
    getRuntimeStatus(): Promise<RuntimeStatus>; // 엔진 상태 조회
    download(modelId: string, onEvent: (event: DownloadEvent) => void): Promise<void>; // 모델 받기
    cancel(modelId: string): Promise<void>; // 받기 취소
    remove(modelId: string): Promise<void>; // 모델 삭제
    select(modelId: string): Promise<void>; // 사용할 모델 선택
    stopRuntime(): Promise<void>; // 엔진 끄기
} // 구조 종료
