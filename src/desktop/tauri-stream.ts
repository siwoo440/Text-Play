import type { LocalAIStreamEvent } from "@/lib/adapters/local-ai-stream"; // 스트림 사건 계약

export interface TauriChannel<T> // Tauri 채널 최소 계약
{ // 구조 시작
    onmessage(message: T): void; // 메시지 처리기
} // 구조 종료

export type InvokeCommand = <T>(command: string, argumentsValue?: Record<string, unknown>) => Promise<T>; // 명령 호출기 형식

export interface TauriStreamOptions // 스트림 명령 설정
{ // 구조 시작
    invokeCommand: InvokeCommand; // 명령 호출기
    createChannel: <T>() => TauriChannel<T>; // 채널 생성기
    command: string; // 스트림 명령 이름
    request: Record<string, unknown>; // 요청 본문(요청 식별자 제외)
    requestId: string; // 요청 식별자
    signal?: AbortSignal; // 중단 신호
    toError(message: string): Error; // Rust 오류 문구 변환기
} // 구조 종료

export function createRequestId(): string // 요청 식별자 생성기
{ // 함수 시작
    return globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}-${Math.random().toString(16).slice(2)}`; // 고유 식별자 반환
} // 함수 종료

export function abortError(): DOMException // 중단 오류 생성기
{ // 함수 시작
    return new DOMException("응답 생성을 중지했습니다.", "AbortError"); // 중단 오류 반환
} // 함수 종료

export async function* streamTauriEvents(options: TauriStreamOptions): AsyncIterable<string> // Rust 스트림 명령을 조각 스트림으로 변환
{ // 함수 시작
    const { invokeCommand, createChannel, command, request, requestId, signal, toError } = options; // 설정 분해
    if (signal?.aborted) // 사전 중단 확인
    { // 조건 시작
        throw abortError(); // 중단 오류 발생
    } // 조건 종료
    const queue: LocalAIStreamEvent[] = []; // 사건 대기열
    let wake: (() => void) | null = null; // 대기 해제기
    let finished = false; // 완료 상태
    const push = (value: LocalAIStreamEvent) => // 사건 추가기
    { // 함수 시작
        queue.push(value); // 사건 저장
        wake?.(); // 대기 해제
        wake = null; // 해제기 초기화
    }; // 함수 종료
    const channel = createChannel<LocalAIStreamEvent>(); // 스트림 채널 생성
    channel.onmessage = push; // 사건 처리기 연결
    const onAbort = () => // 중단 처리기
    { // 함수 시작
        push({ type: "cancelled" }); // 중단 사건 추가
        void invokeCommand("cancel_local_chat", { requestId }).catch(() => undefined); // Rust 중단 요청
    }; // 함수 종료
    signal?.addEventListener("abort", onAbort, { once: true }); // 중단 감시 시작
    const completion = invokeCommand<void>(command, { request: { ...request, requestId }, onEvent: channel }).catch((error: unknown) => // 스트림 명령 실행
    { // 오류 처리 시작
        push({ type: "error", message: error instanceof Error ? error.message : String(error) }); // 명령 오류 사건 추가
    }); // 오류 처리 종료
    const nextEvent = async (): Promise<LocalAIStreamEvent> => // 다음 사건 조회기
    { // 함수 시작
        while (queue.length === 0) // 사건 대기
        { // 반복 시작
            await new Promise<void>((resolve) => // 대기 약속 생성
            { // 약속 시작
                wake = resolve; // 해제기 저장
            }); // 약속 종료
        } // 반복 종료
        return queue.shift() ?? { type: "error", message: "응답 사건이 없습니다." }; // 다음 사건 반환
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
            throw toError(event.message); // 서비스 오류 발생
        } // 반복 종료
    } // 시도 종료
    finally // 스트림 정리
    { // 정리 시작
        signal?.removeEventListener("abort", onAbort); // 중단 감시 해제
        if (!finished) // 미완료 확인
        { // 조건 시작
            void invokeCommand("cancel_local_chat", { requestId }).catch(() => undefined); // 잔여 요청 중단
            void completion; // 백그라운드 명령 정리 유지
        } // 조건 종료
        else // 정상 완료 처리
        { // 조건 시작
            await completion; // 명령 종료 대기
        } // 조건 종료
    } // 정리 종료
} // 함수 종료
