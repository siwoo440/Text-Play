import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTauriOllamaClient, type TauriChannel } from "@/desktop/tauri-ollama-client"; // 데스크톱 올라마 통신기
import { OllamaLLMAdapter } from "@/lib/adapters/ollama-llm-adapter"; // 올라마 대화 어댑터
import type { OllamaChatRequest, OllamaClient, OllamaStreamEvent } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약
import type { StructuredLLMInput } from "@/lib/adapters/llm-adapter"; // 구조화 입력 계약

class RecordingOllamaClient implements OllamaClient // 기록용 올라마 통신기
{ // 클래스 시작
    public lastRequest: OllamaChatRequest | null = null; // 최근 요청

    public async listModels() // 모델 목록
    { // 함수 시작
        return [{ name: "qwen3:8b", size: 5_000, modifiedAt: "2026-09-29T00:00:00Z" }]; // 모델 목록 반환
    } // 함수 종료

    public async listRunningModels() // 실행 모델 목록
    { // 함수 시작
        return []; // 빈 실행 목록 반환
    } // 함수 종료

    public async *streamChat(request: OllamaChatRequest): AsyncIterable<string> // 대화 스트림
    { // 함수 시작
        this.lastRequest = request; // 요청 기록
        yield "{\"narration\":"; // 첫 조각 반환
        yield "\"달빛이 번진다.\"}"; // 둘째 조각 반환
    } // 함수 종료
} // 클래스 종료

function makeStructuredInput(): StructuredLLMInput // 구조화 입력 생성기
{ // 함수 시작
    return { system: "게임 규칙", context: "현재 장면", userInput: "문을 연다", responseSchema: "JSON 객체" }; // 구조화 입력 반환
} // 함수 종료

async function collect(chunks: AsyncIterable<string>): Promise<string> // 스트림 수집기
{ // 함수 시작
    let result = ""; // 결과 문자열
    for await (const chunk of chunks) // 조각 순회
    { // 반복 시작
        result += chunk; // 조각 누적
    } // 반복 종료
    return result; // 결과 반환
} // 함수 종료

describe("올라마 대화 어댑터", () => // 어댑터 묶음
{ // 묶음 시작
    it("선택 모델과 JSON 형식으로 구조화 응답을 순서대로 전달한다", async () => // 구조화 스트림 검증
    { // 테스트 시작
        const client = new RecordingOllamaClient(); // 기록 통신기 생성
        const adapter = new OllamaLLMAdapter("qwen3:8b", client); // 어댑터 생성
        const response = await collect(adapter.streamStructuredReply(makeStructuredInput())); // 구조화 응답 수집
        expect(response).toBe("{\"narration\":\"달빛이 번진다.\"}"); // 조각 순서 확인
        expect(client.lastRequest).toMatchObject({ model: "qwen3:8b", format: "json" }); // 모델과 형식 확인
        expect(client.lastRequest?.messages).toEqual([ // 메시지 변환 확인
            { role: "system", content: "게임 규칙\n\n응답 형식:\nJSON 객체" }, // 시스템 메시지
            { role: "user", content: "현재 장면\n\n사용자 행동:\n문을 연다" }, // 사용자 메시지
        ]); // 메시지 확인 종료
    }); // 테스트 종료
}); // 묶음 종료

describe("Tauri 올라마 통신기", () => // 통신기 묶음
{ // 묶음 시작
    it("고정 명령으로 설치 모델 목록을 불러온다", async () => // 목록 조회 검증
    { // 테스트 시작
        const invokeCommand = async <T,>(command: string): Promise<T> => // 명령 대역
        { // 함수 시작
            if (command !== "list_local_models") // 명령 확인
            { // 조건 시작
                throw new Error("예상하지 못한 명령"); // 명령 오류
            } // 조건 종료
            return [{ name: "qwen3:8b", size: 5_000, modifiedAt: "2026-09-29T00:00:00Z" }] as T; // 모델 응답 반환
        }; // 함수 종료
        const client = createTauriOllamaClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        await expect(client.listModels()).resolves.toEqual([{ name: "qwen3:8b", size: 5_000, modifiedAt: "2026-09-29T00:00:00Z" }]); // 목록 반환 확인
    }); // 테스트 종료

    it("채널 사건의 응답 조각을 수신 순서대로 전달한다", async () => // 채널 순서 검증
    { // 테스트 시작
        let channel: TauriChannel<OllamaStreamEvent> | null = null; // 생성 채널 보관
        const invokeCommand = async <T,>(command: string, argumentsValue?: Record<string, unknown>): Promise<T> => // 명령 대역
        { // 함수 시작
            if (command !== "stream_local_chat") // 명령 확인
            { // 조건 시작
                throw new Error("예상하지 못한 명령"); // 명령 오류
            } // 조건 종료
            channel = argumentsValue?.onEvent as TauriChannel<OllamaStreamEvent>; // 요청 채널 조회
            queueMicrotask(() => // 사건 전달 예약
            { // 작업 시작
                channel?.onmessage({ type: "chunk", content: "첫째" }); // 첫 조각 전달
                channel?.onmessage({ type: "chunk", content: "둘째" }); // 둘째 조각 전달
                channel?.onmessage({ type: "done" }); // 완료 전달
            }); // 작업 종료
            return undefined as T; // 명령 완료 반환
        }; // 함수 종료
        const client = createTauriOllamaClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }), createRequestId: () => "request-1" }); // 통신기 생성
        const result = await collect(client.streamChat({ model: "qwen3:8b", messages: [{ role: "user", content: "안녕" }] })); // 스트림 수집
        expect(result).toBe("첫째둘째"); // 조각 순서 확인
    }); // 테스트 종료

    it("중단 신호를 즉시 중단 오류로 전달한다", async () => // 중단 검증
    { // 테스트 시작
        const controller = new AbortController(); // 중단 제어기 생성
        controller.abort(); // 사전 중단 실행
        const client = createTauriOllamaClient({ invokeCommand: async <T,>() => undefined as T, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        await expect(collect(client.streamChat({ model: "qwen3:8b", messages: [{ role: "user", content: "안녕" }] }, controller.signal))).rejects.toMatchObject({ name: "AbortError" }); // 중단 오류 확인
    }); // 테스트 종료

    it("삭제된 선택 모델 오류를 별도 오류 코드로 전달한다", async () => // 모델 삭제 검증
    { // 테스트 시작
        const invokeCommand = async <T,>(command: string): Promise<T> => // 명령 대역
        { // 함수 시작
            if (command === "stream_local_chat") // 스트림 명령 확인
            { // 조건 시작
                throw new Error("MODEL_NOT_FOUND: 선택 모델 없음"); // 모델 누락 오류
            } // 조건 종료
            return undefined as T; // 기타 명령 완료
        }; // 함수 종료
        const client = createTauriOllamaClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        await expect(collect(client.streamChat({ model: "qwen3:8b", messages: [{ role: "user", content: "안녕" }] }))).rejects.toMatchObject({ code: "model-unavailable" }); // 모델 오류 확인
    }); // 테스트 종료

    it("Rust 스트림이 대기 중이어도 사용자 중단을 즉시 반환한다", async () => // 즉시 중단 검증
    { // 테스트 시작
        let markStarted: (() => void) | null = null; // 시작 알림기
        const started = new Promise<void>((resolve) => // 시작 약속 생성
        { // 약속 시작
            markStarted = resolve; // 시작 알림기 저장
        }); // 약속 종료
        const invokeCommand = async <T,>(command: string): Promise<T> => // 명령 대역
        { // 함수 시작
            if (command === "stream_local_chat") // 스트림 명령 확인
            { // 조건 시작
                markStarted?.(); // 스트림 시작 알림
                return await new Promise<T>(() => undefined); // 종료되지 않는 Rust 요청
            } // 조건 종료
            return undefined as T; // 중단 명령 완료
        }; // 함수 종료
        const controller = new AbortController(); // 중단 제어기 생성
        const client = createTauriOllamaClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        const operation = collect(client.streamChat({ model: "qwen3:8b", messages: [{ role: "user", content: "안녕" }] }, controller.signal)).then(() => "완료", (error: unknown) => typeof error === "object" && error !== null && "name" in error ? String(error.name) : "알 수 없는 오류"); // 스트림 결과 준비
        await started; // 스트림 시작 대기
        controller.abort(); // 사용자 중단 실행
        const outcome = await Promise.race([operation, new Promise<string>((resolve) => setTimeout(() => resolve("시간 초과"), 50))]); // 즉시 결과 경쟁
        expect(outcome).toBe("AbortError"); // 즉시 중단 확인
    }); // 테스트 종료
}); // 묶음 종료
