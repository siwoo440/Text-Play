import { Channel, invoke } from "@tauri-apps/api/core"; // Tauri 통신 도구
import { createRequestId, streamTauriEvents, type InvokeCommand, type TauriChannel } from "@/desktop/tauri-stream"; // Tauri 스트림 도구
import type { BundledChatRequest, BundledRuntimeClient } from "@/lib/adapters/bundled-runtime-client"; // 내장 AI 통신 계약
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류

interface TauriBundledClientOptions // 통신기 설정
{ // 구조 시작
    invokeCommand?: InvokeCommand; // 명령 호출기
    createChannel?: <T>() => TauriChannel<T>; // 채널 생성기
    createRequestId?: () => string; // 요청 식별자 생성기
} // 구조 종료

function toBundledError(message: string): LLMServiceError // Rust 오류 문구 변환
{ // 함수 시작
    if (message.includes("BUNDLED_NOT_READY")) // 실행 엔진 미준비 확인
    { // 조건 시작
        return new LLMServiceError("local-ai-not-ready"); // 미준비 오류 반환
    } // 조건 종료
    return new LLMServiceError(message.length > 0 ? "unavailable" : "invalid-response"); // 연결·형식 오류 반환
} // 함수 종료

export function createTauriBundledClient(options: TauriBundledClientOptions = {}): BundledRuntimeClient // Tauri 내장 AI 통신기 생성
{ // 함수 시작
    const invokeCommand = options.invokeCommand ?? invoke; // 명령 호출기
    const createChannel = options.createChannel ?? (() => new Channel() as TauriChannel<unknown>); // 채널 생성기
    const nextRequestId = options.createRequestId ?? createRequestId; // 요청 식별자 생성기
    return { // 통신기 반환
        streamChat(request: BundledChatRequest, signal?: AbortSignal): AsyncIterable<string> // 대화 스트림
        { // 함수 시작
            return streamTauriEvents({ invokeCommand, createChannel: createChannel as <T>() => TauriChannel<T>, command: "stream_bundled_chat", request: { ...request }, requestId: nextRequestId(), signal, toError: toBundledError }); // Rust 내장 AI 스트림 반환
        }, // 함수 종료
    }; // 통신기 종료
} // 함수 종료
