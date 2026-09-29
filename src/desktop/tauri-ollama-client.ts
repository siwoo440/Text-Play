import { Channel, invoke } from "@tauri-apps/api/core"; // Tauri 통신 도구
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류
import type { OllamaChatRequest, OllamaClient, OllamaModel, OllamaStreamEvent, RunningOllamaModel } from "@/lib/adapters/ollama-client"; // 올라마 계약

export interface TauriChannel<T> // Tauri 채널 최소 계약
{ // 구조 시작
    onmessage(message: T): void; // 메시지 처리기
} // 구조 종료

interface TauriOllamaClientOptions // 통신기 설정
{ // 구조 시작
    invokeCommand?: <T>(command: string, argumentsValue?: Record<string, unknown>) => Promise<T>; // 명령 호출기
    createChannel?: <T>() => TauriChannel<T>; // 채널 생성기
    createRequestId?: () => string; // 요청 식별자 생성기
} // 구조 종료

interface QueuedEvent // 대기 사건 구조
{ // 구조 시작
    value: OllamaStreamEvent; // 사건 값
} // 구조 종료

function createRequestId(): string // 요청 식별자 생성기
{ // 함수 시작
    return globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}-${Math.random().toString(16).slice(2)}`; // 고유 식별자 반환
} // 함수 종료

function abortError(): DOMException // 중단 오류 생성기
{ // 함수 시작
    return new DOMException("응답 생성을 중지했습니다.", "AbortError"); // 중단 오류 반환
} // 함수 종료

function isOllamaModelList(value: unknown): value is OllamaModel[] // 모델 목록 판정기
{ // 함수 시작
    return Array.isArray(value) && value.every((model) => typeof model === "object" && model !== null && typeof (model as OllamaModel).name === "string" && typeof (model as OllamaModel).size === "number" && typeof (model as OllamaModel).modifiedAt === "string"); // 모델 목록 여부 반환
} // 함수 종료

function isRunningModelList(value: unknown): value is RunningOllamaModel[] // 실행 모델 목록 판정기
{ // 함수 시작
    return Array.isArray(value) && value.every((model) => typeof model === "object" && model !== null && typeof (model as RunningOllamaModel).name === "string" && typeof (model as RunningOllamaModel).sizeVram === "number" && typeof (model as RunningOllamaModel).contextLength === "number"); // 실행 목록 여부 반환
} // 함수 종료

class TauriOllamaClient implements OllamaClient // Tauri 올라마 통신기
{ // 클래스 시작
    private readonly invokeCommand: <T>(command: string, argumentsValue?: Record<string, unknown>) => Promise<T>; // 명령 호출기
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

    public async *streamChat(request: OllamaChatRequest, signal?: AbortSignal): AsyncIterable<string> // 대화 스트림
    { // 함수 시작
        if (signal?.aborted) // 사전 중단 확인
        { // 조건 시작
            throw abortError(); // 중단 오류 발생
        } // 조건 종료
        const requestId = this.createRequestId(); // 요청 식별자 생성
        const queue: QueuedEvent[] = []; // 사건 대기열
        let wake: (() => void) | null = null; // 대기 해제기
        let finished = false; // 완료 상태
        const push = (value: OllamaStreamEvent) => // 사건 추가기
        { // 함수 시작
            queue.push({ value }); // 사건 저장
            wake?.(); // 대기 해제
            wake = null; // 해제기 초기화
        }; // 함수 종료
        const channel = this.createChannel<OllamaStreamEvent>(); // 스트림 채널 생성
        channel.onmessage = push; // 사건 처리기 연결
        const onAbort = () => // 중단 처리기
        { // 함수 시작
            push({ type: "cancelled" }); // 중단 사건 추가
            void this.invokeCommand("cancel_local_chat", { requestId }).catch(() => undefined); // Rust 중단 요청
        }; // 함수 종료
        signal?.addEventListener("abort", onAbort, { once: true }); // 중단 감시 시작
        const completion = this.invokeCommand<void>("stream_local_chat", { request: { ...request, requestId }, onEvent: channel }).catch((error: unknown) => // 스트림 명령 실행
        { // 오류 처리 시작
            push({ type: "error", message: error instanceof Error ? error.message : String(error) }); // 명령 오류 사건 추가
        }); // 오류 처리 종료
        const nextEvent = async (): Promise<OllamaStreamEvent> => // 다음 사건 조회기
        { // 함수 시작
            while (queue.length === 0) // 사건 대기
            { // 반복 시작
                await new Promise<void>((resolve) => // 대기 약속 생성
                { // 약속 시작
                    wake = resolve; // 해제기 저장
                }); // 약속 종료
            } // 반복 종료
            return queue.shift()?.value ?? { type: "error", message: "응답 사건이 없습니다." }; // 다음 사건 반환
        }; // 함수 종료
        try // 스트림 처리 시도
        { // 시도 시작
            while (true) // 사건 순회
            { // 반복 시작
                const event = await nextEvent(); // 다음 사건 조회
                if (event.type === "chunk") // 조각 사건 확인
                { // 조건 시작
                    yield event.content; // 조각 전달
                    continue; // 다음 사건 이동
                } // 조건 종료
                if (event.type === "done") // 완료 사건 확인
                { // 조건 시작
                    finished = true; // 완료 상태 반영
                    return; // 스트림 종료
                } // 조건 종료
                if (event.type === "cancelled") // 중단 사건 확인
                { // 조건 시작
                    throw abortError(); // 중단 오류 발생
                } // 조건 종료
                throw new LLMServiceError(event.message.includes("MODEL_NOT_FOUND") ? "model-unavailable" : event.message.length > 0 ? "unavailable" : "invalid-response"); // 서비스 오류 발생
            } // 반복 종료
        } // 시도 종료
        finally // 스트림 정리
        { // 정리 시작
            signal?.removeEventListener("abort", onAbort); // 중단 감시 해제
            if (!finished) // 미완료 확인
            { // 조건 시작
                void this.invokeCommand("cancel_local_chat", { requestId }).catch(() => undefined); // 잔여 요청 중단
                void completion; // 백그라운드 명령 정리 유지
            } // 조건 종료
            else // 정상 완료 처리
            { // 조건 시작
                await completion; // 명령 종료 대기
            } // 조건 종료
        } // 정리 종료
    } // 함수 종료
} // 클래스 종료

export function createTauriOllamaClient(options: TauriOllamaClientOptions = {}): OllamaClient // Tauri 통신기 생성기
{ // 함수 시작
    return new TauriOllamaClient(options); // 통신기 반환
} // 함수 종료
