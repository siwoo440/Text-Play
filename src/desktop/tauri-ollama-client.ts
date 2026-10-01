import { Channel, invoke } from "@tauri-apps/api/core"; // Tauri 통신 도구
import { createRequestId, streamTauriEvents, type InvokeCommand, type TauriChannel } from "@/desktop/tauri-stream"; // Tauri 스트림 도구
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류
import type { OllamaChatRequest, OllamaClient, OllamaModel, RunningOllamaModel } from "@/lib/adapters/ollama-client"; // 올라마 계약

export type { TauriChannel } from "@/desktop/tauri-stream"; // 기존 채널 계약 재공개

interface TauriOllamaClientOptions // 통신기 설정
{ // 구조 시작
    invokeCommand?: InvokeCommand; // 명령 호출기
    createChannel?: <T>() => TauriChannel<T>; // 채널 생성기
    createRequestId?: () => string; // 요청 식별자 생성기
} // 구조 종료

function isOllamaModelList(value: unknown): value is OllamaModel[] // 모델 목록 판정기
{ // 함수 시작
    return Array.isArray(value) && value.every((model) => typeof model === "object" && model !== null && typeof (model as OllamaModel).name === "string" && typeof (model as OllamaModel).size === "number" && typeof (model as OllamaModel).modifiedAt === "string"); // 모델 목록 여부 반환
} // 함수 종료

function isRunningModelList(value: unknown): value is RunningOllamaModel[] // 실행 모델 목록 판정기
{ // 함수 시작
    return Array.isArray(value) && value.every((model) => typeof model === "object" && model !== null && typeof (model as RunningOllamaModel).name === "string" && typeof (model as RunningOllamaModel).sizeVram === "number" && typeof (model as RunningOllamaModel).contextLength === "number"); // 실행 목록 여부 반환
} // 함수 종료

function toOllamaError(message: string): LLMServiceError // Rust 오류 문구 변환
{ // 함수 시작
    return new LLMServiceError(message.includes("MODEL_NOT_FOUND") ? "model-unavailable" : message.length > 0 ? "unavailable" : "invalid-response"); // 서비스 오류 반환
} // 함수 종료

class TauriOllamaClient implements OllamaClient // Tauri 올라마 통신기
{ // 클래스 시작
    private readonly invokeCommand: InvokeCommand; // 명령 호출기
    private readonly createChannel: <T>() => TauriChannel<T>; // 채널 생성기
    private readonly createRequestId: () => string; // 요청 식별자 생성기

    public constructor(options: TauriOllamaClientOptions) // 생성자
    { // 생성자 시작
        this.invokeCommand = options.invokeCommand ?? invoke; // 명령 호출기 설정
        this.createChannel = options.createChannel ?? (() => new Channel() as TauriChannel<unknown>); // 채널 생성기 설정
        this.createRequestId = options.createRequestId ?? createRequestId; // 식별자 생성기 설정
    } // 생성자 종료

    public async listModels(): Promise<OllamaModel[]> // 설치 모델 조회
    { // 함수 시작
        try // 명령 호출 시도
        { // 시도 시작
            const result: unknown = await this.invokeCommand("list_local_models"); // 모델 목록 요청
            if (!isOllamaModelList(result)) // 응답 구조 확인
            { // 조건 시작
                throw new LLMServiceError("invalid-response"); // 구조 오류 발생
            } // 조건 종료
            return result; // 모델 목록 반환
        } // 시도 종료
        catch (error) // 호출 오류 처리
        { // 오류 시작
            if (error instanceof LLMServiceError) // 기존 오류 확인
            { // 조건 시작
                throw error; // 기존 오류 전달
            } // 조건 종료
            throw new LLMServiceError("unavailable"); // 연결 오류 변환
        } // 오류 종료
    } // 함수 종료

    public async listRunningModels(): Promise<RunningOllamaModel[]> // 실행 모델 조회
    { // 함수 시작
        try // 명령 호출 시도
        { // 시도 시작
            const result: unknown = await this.invokeCommand("list_running_local_models"); // 실행 목록 요청
            if (!isRunningModelList(result)) // 응답 구조 확인
            { // 조건 시작
                throw new LLMServiceError("invalid-response"); // 구조 오류 발생
            } // 조건 종료
            return result; // 실행 목록 반환
        } // 시도 종료
        catch (error) // 호출 오류 처리
        { // 오류 시작
            if (error instanceof LLMServiceError) // 기존 오류 확인
            { // 조건 시작
                throw error; // 기존 오류 전달
            } // 조건 종료
            throw new LLMServiceError("unavailable"); // 연결 오류 변환
        } // 오류 종료
    } // 함수 종료

    public streamChat(request: OllamaChatRequest, signal?: AbortSignal): AsyncIterable<string> // 대화 스트림
    { // 함수 시작
        return streamTauriEvents({ invokeCommand: this.invokeCommand, createChannel: this.createChannel, command: "stream_local_chat", request: { ...request }, requestId: this.createRequestId(), signal, toError: toOllamaError }); // Rust 올라마 스트림 반환
    } // 함수 종료
} // 클래스 종료

export function createTauriOllamaClient(options: TauriOllamaClientOptions = {}): OllamaClient // Tauri 통신기 생성기
{ // 함수 시작
    return new TauriOllamaClient(options); // 통신기 반환
} // 함수 종료
