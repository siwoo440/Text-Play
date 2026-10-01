export interface BackendSpec // 실행 방식
{ // 구조 시작
    kind: "vulkan" | "cpu"; // 실행 종류
    device: string | null; // 그래픽 장치
    threads: number | null; // CPU 스레드 수
    label: string; // 표시 이름
} // 구조 종료

export interface ListedDevice // 실행 엔진 장치
{ // 구조 시작
    name: string; // 장치 이름
    description: string; // 장치 설명
    totalMiB: number; // 전체 메모리
    freeMiB: number; // 남은 메모리
} // 구조 종료

export interface LlamaServerArgsOptions // 실행 인자 설정
{ // 구조 시작
    modelPath: string; // 모델 파일
    port: number; // 포트
    apiKey: string; // 일회용 키
    contextLength: number; // 문맥 길이
    backend: { kind: "vulkan" | "cpu"; device: string | null }; // 실행 방식
    threads: number; // CPU 스레드 수
} // 구조 종료

export interface ChatRequestBodyOptions // 요청 본문 설정
{ // 구조 시작
    messages: { role: string; content: string }[]; // 메시지
    responseSchema: Record<string, unknown> | null; // 형식 강제 스키마
    generation: Record<string, number>; // 생성 설정
    chatTemplateKwargs: Record<string, unknown> | null; // 템플릿 인자
    seed: number; // 시드
    maxTokens: number; // 최대 생성 길이
} // 구조 종료

export interface EvalRunSummary // 측정 요약
{ // 구조 시작
    cases: number; // 문맥 수
    jsonOk: number; // 형식 성공
    jsonRate: number; // 형식 성공률
    actionOk: number; // 행동 통과
    actionRate: number; // 행동 통과율
    guardedCases: number; // 규칙 위반 문맥
    guardedResisted: number; // 차단 성공
    koreanOk: number; // 한국어 통과
    koreanRate: number; // 한국어 비율
    truncated: number; // 길이 잘림
    errors: number; // 요청 오류
    ttftMedianMs: number | null; // 첫 글자 중앙값
    turnMedianMs: number | null; // 한 턴 중앙값
    turnP90Ms: number | null; // 한 턴 90%
    turnMaxMs: number | null; // 한 턴 최대
    tokensPerSecondMedian: number | null; // 생성 속도 중앙값
    promptTokensPerSecondMedian: number | null; // 문맥 처리 속도 중앙값
} // 구조 종료

export function parseBackendSpec(spec: string): BackendSpec; // 실행 방식 해석
export function parseListDevices(output: string): ListedDevice[]; // 장치 목록 해석
export function pickSingleDevice(devices: ListedDevice[]): string | null; // 장치가 하나일 때만 선택
export function buildLlamaServerArgs(options: LlamaServerArgsOptions): string[]; // 실행 인자
export function buildChatRequestBody(options: ChatRequestBodyOptions): Record<string, unknown>; // 요청 본문
export function createSseDecoder(): { push(text: string): (Record<string, unknown> | "[DONE]")[] }; // SSE 해석기
export function summarizeBufferSizes(logText: string): { gpuMiB: number; cpuMiB: number }; // 메모리 버퍼 합계
export function percentile(values: number[], fraction: number): number | null; // 백분위
export function summarizeRuns(runs: Record<string, unknown>[]): EvalRunSummary; // 측정 요약
export function renderEvalReport(report: Record<string, unknown>): string; // 보고서
