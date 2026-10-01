import { describe, expect, it } from "vitest"; // 테스트 도구
import type { DownloadEvent } from "@/desktop/ai-models/model-store-client"; // 보관함 계약
import { createTauriModelStoreClient } from "@/desktop/ai-models/tauri-model-store-client"; // Tauri 보관함 통신기
import type { TauriChannel } from "@/desktop/tauri-stream"; // 채널 계약

describe("Tauri 모델 보관함 통신기", () => // 통신기 묶음
{ // 묶음 시작
    it("보관함·엔진 명령을 정해진 이름과 인자로 부른다", async () => // 명령 검증
    { // 테스트 시작
        const calls: { command: string; argumentsValue?: Record<string, unknown> }[] = []; // 명령 기록
        const invokeCommand = async <T,>(command: string, argumentsValue?: Record<string, unknown>): Promise<T> => // 명령 대역
        { // 함수 시작
            calls.push({ command, argumentsValue }); // 명령 기록
            return (command === "get_model_store" ? { models: [] } : command === "get_local_runtime_status" ? { state: "stopped" } : undefined) as T; // 응답 반환
        }; // 함수 종료
        const client = createTauriModelStoreClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        expect(await client.getStore()).toEqual({ models: [] }); // 보관함 조회
        expect(await client.getRuntimeStatus()).toEqual({ state: "stopped" }); // 엔진 상태 조회
        await client.select("qwen3.5-4b"); // 선택
        await client.cancel("qwen3.5-4b"); // 취소
        await client.remove("qwen3.5-4b"); // 삭제
        await client.stopRuntime(); // 엔진 끄기
        expect(calls.map((call) => [call.command, call.argumentsValue])).toEqual( // 명령 확인
        [ // 기대 목록 시작
            ["get_model_store", undefined], // 보관함
            ["get_local_runtime_status", undefined], // 엔진 상태
            ["select_model", { modelId: "qwen3.5-4b" }], // 선택
            ["cancel_model_download", { modelId: "qwen3.5-4b" }], // 취소
            ["delete_model", { modelId: "qwen3.5-4b" }], // 삭제
            ["stop_local_runtime", undefined], // 엔진 끄기
        ]); // 기대 목록 종료
    }); // 테스트 종료

    it("받기 진행 사건을 채널로 받아 전달한다", async () => // 받기 검증
    { // 테스트 시작
        const events: DownloadEvent[] = []; // 받은 사건
        const invokeCommand = async <T,>(command: string, argumentsValue?: Record<string, unknown>): Promise<T> => // 명령 대역
        { // 함수 시작
            expect(command).toBe("download_model"); // 명령 확인
            expect(argumentsValue?.modelId).toBe("midm-2.0-mini"); // 모델 확인
            const channel = argumentsValue?.onEvent as TauriChannel<DownloadEvent>; // 채널
            channel.onmessage({ type: "progress", receivedBytes: 5, totalBytes: 10, bytesPerSecond: 1 }); // 진행률
            channel.onmessage({ type: "done" }); // 완료
            return undefined as T; // 명령 완료
        }; // 함수 종료
        const client = createTauriModelStoreClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        await client.download("midm-2.0-mini", (event) => events.push(event)); // 받기
        expect(events).toEqual([{ type: "progress", receivedBytes: 5, totalBytes: 10, bytesPerSecond: 1 }, { type: "done" }]); // 사건 확인
    }); // 테스트 종료

    it("Rust 오류 문자열을 Error로 바꾼다", async () => // 오류 검증
    { // 테스트 시작
        const client = createTauriModelStoreClient({ invokeCommand: async () => { throw "먼저 모델을 받아 주세요."; }, createChannel: () => ({ onmessage: () => undefined }) }); // 실패 통신기
        await expect(client.select("qwen3.5-9b")).rejects.toThrow("먼저 모델을 받아 주세요."); // 오류 확인
    }); // 테스트 종료
}); // 묶음 종료
