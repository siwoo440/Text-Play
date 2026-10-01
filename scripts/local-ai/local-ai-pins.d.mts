export interface LlamaCppRelease // llama.cpp 고정 버전
{ // 구조 시작
    tag: string; // 빌드 태그
    version: string; // 안정판 이름
    commit: string; // 커밋
} // 구조 종료

export interface LlamaRuntimeAsset // 실행 엔진 압축 파일
{ // 구조 시작
    variant: "vulkan" | "cpu"; // 빌드 종류
    file: string; // 파일 이름
    size: number; // 파일 크기
    sha256: string; // 파일 SHA-256
} // 구조 종료

export interface LocalModelGeneration // 모델 생성 설정
{ // 구조 시작
    temperature: number; // 온도
    top_p: number; // top-p
    top_k: number; // top-k
    min_p?: number; // min-p
    presence_penalty?: number; // 반복 억제
} // 구조 종료

export interface LocalModelSource // 공식 가중치 원본
{ // 구조 시작
    id: string; // 모델 식별자
    label: string; // 표시 이름
    role: "light" | "light-alternative" | "standard" | "high"; // 역할
    repo: string; // 허깅페이스 저장소
    revision: string; // 고정 리비전
    license: string; // 라이선스
    sourceGB: number; // 원본 크기
    contextLength: number; // 최대 문맥 길이
    quantizations: string[]; // 양자화 목록
    generation: LocalModelGeneration; // 생성 설정
    chatTemplateKwargs: Record<string, unknown> | null; // 템플릿 인자
} // 구조 종료

export const LLAMA_CPP_RELEASE: LlamaCppRelease; // llama.cpp 고정 버전
export const LLAMA_RUNTIME_ASSETS: LlamaRuntimeAsset[]; // 실행 엔진 압축 파일 목록
export const LOCAL_MODEL_SOURCES: LocalModelSource[]; // 공식 가중치 목록
export function getRuntimeAssetUrl(asset: LlamaRuntimeAsset): string; // 실행 엔진 주소
export function findModelSource(id: string): LocalModelSource | null; // 모델 원본 조회
