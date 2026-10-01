// 내장 로컬 AI 고정 버전: 실행 엔진 빌드와 공식 모델 가중치 리비전을 한곳에서 관리한다

export const LLAMA_CPP_RELEASE = // llama.cpp 고정 버전(안정판 v0.5.0과 같은 커밋)
{ // 객체 시작
    tag: "b11146", // 빌드 태그
    version: "v0.5.0", // 안정판 이름
    commit: "7fe450e19305b828c199d602c23a8337aaa1f03b", // 커밋
}; // 객체 종료

export const LLAMA_RUNTIME_ASSETS = // Windows 실행 엔진 압축 파일(GitHub 릴리스 SHA-256)
[ // 목록 시작
    { variant: "vulkan", file: "llama-b11146-bin-win-vulkan-x64.zip", size: 32127004, sha256: "55a378aa095b466979d85075234f66d7655c7a7483222af0c006c0e55b4d7bd6" }, // NVIDIA·AMD·Intel 공통 그래픽
    { variant: "cpu", file: "llama-b11146-bin-win-cpu-x64.zip", size: 18560055, sha256: "14cf1303ca9ac3abd94816850532f9f9a69ac66fbaca3776fc6f9061c2fac1d1" }, // CPU 전용
]; // 목록 종료

const QWEN_NON_THINKING = { temperature: 0.7, top_p: 0.8, top_k: 20, min_p: 0, presence_penalty: 1.5 }; // Qwen3.5 공식 비생각 일반 설정

export const LOCAL_MODEL_SOURCES = // 공식 가중치(허깅페이스 리비전 고정)
[ // 목록 시작
    { // 가벼움 시작
        id: "midm-2.0-mini", // 모델 식별자
        label: "Mi:dm 2.0 Mini", // 표시 이름
        role: "light", // 가벼움(설치 때 자동)
        repo: "K-intelligence/Midm-2.0-Mini-Instruct", // 공식 저장소
        revision: "383eb221c52a32278f1985257b264ade8d982e60", // 고정 리비전
        license: "MIT", // 라이선스
        sourceGB: 4.3, // 원본 크기
        contextLength: 32768, // 최대 문맥 길이(config.json)
        quantizations: ["Q4_K_M", "Q5_K_M"], // 비교 양자화
        generation: { temperature: 0.8, top_p: 0.75, top_k: 20 }, // 공식 generation_config.json
        chatTemplateKwargs: null, // 템플릿 인자 없음
    }, // 가벼움 종료
    { // 가벼움 대체 시작
        id: "qwen3.5-2b", // 모델 식별자
        label: "Qwen3.5-2B", // 표시 이름
        role: "light-alternative", // 가벼움 대체 후보
        repo: "Qwen/Qwen3.5-2B", // 공식 저장소
        revision: "15852e8c16360a2fea060d615a32b45270f8a8fc", // 고정 리비전
        license: "Apache-2.0", // 라이선스
        sourceGB: 4.26, // 원본 크기
        contextLength: 262144, // 최대 문맥 길이
        quantizations: ["Q4_K_M"], // 양자화
        generation: QWEN_NON_THINKING, // 비생각 설정
        chatTemplateKwargs: { enable_thinking: false }, // 기본 생각 모드 끄기
    }, // 가벼움 대체 종료
    { // 표준 시작
        id: "qwen3.5-4b", // 모델 식별자
        label: "Qwen3.5-4B", // 표시 이름
        role: "standard", // 표준(다운로드 버튼)
        repo: "Qwen/Qwen3.5-4B", // 공식 저장소
        revision: "851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a", // 고정 리비전
        license: "Apache-2.0", // 라이선스
        sourceGB: 8.7, // 원본 크기
        contextLength: 262144, // 최대 문맥 길이
        quantizations: ["Q4_K_M"], // 양자화
        generation: QWEN_NON_THINKING, // 비생각 설정
        chatTemplateKwargs: { enable_thinking: false }, // 기본 생각 모드 끄기
    }, // 표준 종료
    { // 고성능 시작
        id: "qwen3.5-9b", // 모델 식별자
        label: "Qwen3.5-9B", // 표시 이름
        role: "high", // 고성능(다운로드 버튼)
        repo: "Qwen/Qwen3.5-9B", // 공식 저장소
        revision: "c202236235762e1c871ad0ccb60c8ee5ba337b9a", // 고정 리비전
        license: "Apache-2.0", // 라이선스
        sourceGB: 18, // 원본 크기
        contextLength: 262144, // 최대 문맥 길이
        quantizations: ["Q4_K_M"], // 양자화
        generation: QWEN_NON_THINKING, // 비생각 설정
        chatTemplateKwargs: { enable_thinking: false }, // 기본 생각 모드 끄기
    }, // 고성능 종료
]; // 목록 종료

export function getRuntimeAssetUrl(asset) // 실행 엔진 압축 파일 주소
{ // 함수 시작
    return `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_RELEASE.tag}/${asset.file}`; // 릴리스 주소 반환
} // 함수 종료

export function findModelSource(id) // 모델 원본 조회
{ // 함수 시작
    return LOCAL_MODEL_SOURCES.find((model) => model.id === id) ?? null; // 일치 모델 반환
} // 함수 종료
