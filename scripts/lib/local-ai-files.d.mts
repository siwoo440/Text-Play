export interface LocalModelManifestEntry // 모델 목록 항목
{ // 구조 시작
    id: string; // 모델 식별자
    quantization: string; // 양자화
    file: string; // 파일 이름
    size: number; // 파일 크기
    sha256: string; // 파일 SHA-256
    [key: string]: unknown; // 추가 정보
} // 구조 종료

export interface LocalModelManifest // 모델 목록 파일
{ // 구조 시작
    models: LocalModelManifestEntry[]; // 모델 항목
    [key: string]: unknown; // 추가 정보
} // 구조 종료

export interface DownloadFileOptions // 받기 설정
{ // 구조 시작
    expectedSize?: number; // 기대 크기
    expectedSha256?: string; // 기대 SHA-256
    onProgress?: (received: number) => void; // 진행률 알림
    attempts?: number; // 재시도 횟수
} // 구조 종료

export function getRepositoryRoot(): string; // 저장소 최상위 폴더
export function getLocalAiRoot(): string; // 로컬 AI 작업 폴더
export function getHfResolveUrl(repo: string, revision: string, path: string): string; // 허깅페이스 파일 주소
export function getHfTreeUrl(repo: string, revision: string): string; // 허깅페이스 목록 주소
export function getSourceDir(root: string, repo: string, revision: string): string; // 공식 가중치 폴더
export function getRuntimeDir(root: string, tag: string, variant: string): string; // 실행 엔진 폴더
export function getModelFileName(modelId: string, quantization: string): string; // 모델 파일 이름
export function sha256File(path: string): Promise<string>; // 파일 SHA-256
export function gitBlobSha1File(path: string): Promise<string>; // git 블롭 SHA-1
export function downloadFile(url: string, target: string, options?: DownloadFileOptions): Promise<void>; // 이어받기·검사 다운로드
export function upsertManifestEntry(manifest: LocalModelManifest, entry: LocalModelManifestEntry): LocalModelManifest; // 목록 항목 추가·교체
export function findManifestModel(manifest: LocalModelManifest, id: string, quantization: string): LocalModelManifestEntry | null; // 목록 항목 조회
