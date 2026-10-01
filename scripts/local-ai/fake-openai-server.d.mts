export interface FakeOpenAIServerOptions // 가짜 서버 설정
{ // 구조 시작
    port?: number; // 포트(0이면 임의)
    delayMs?: number; // 조각 사이 지연
} // 구조 종료

export function startFakeOpenAIServer(options?: FakeOpenAIServerOptions): Promise<{ url: string; close(): Promise<void> }>; // 가짜 서버 시작
