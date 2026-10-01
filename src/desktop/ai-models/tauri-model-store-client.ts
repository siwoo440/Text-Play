import { Channel, invoke } from "@tauri-apps/api/core"; // Tauri 통신 도구
import type { DownloadEvent, ModelStoreClient, RuntimeStatus, StoreView } from "@/desktop/ai-models/model-store-client"; // 보관함 계약
import type { InvokeCommand, TauriChannel } from "@/desktop/tauri-stream"; // Tauri 명령·채널 계약

interface TauriModelStoreClientOptions // 통신기 설정
{ // 구조 시작
    invokeCommand?: InvokeCommand; // 명령 호출기
    createChannel?: <T>() => TauriChannel<T>; // 채널 생성기
} // 구조 종료

export function createTauriModelStoreClient(options: TauriModelStoreClientOptions = {}): ModelStoreClient // Tauri 보관함 통신기 생성
{ // 함수 시작
    const invokeCommand = options.invokeCommand ?? invoke; // 명령 호출기
    const createChannel = (options.createChannel ?? (() => new Channel() as TauriChannel<unknown>)) as <T>() => TauriChannel<T>; // 채널 생성기
    const call = async <T,>(command: string, argumentsValue?: Record<string, unknown>): Promise<T> => // 오류를 Error로 바꾸는 호출
    { // 함수 시작
        try // 호출 시도
        { // 시도 시작
            return await invokeCommand<T>(command, argumentsValue); // 결과 반환
        } // 시도 종료
        catch (error) // 오류 처리
        { // 오류 시작
            throw error instanceof Error ? error : new Error(String(error)); // Error로 전달
        } // 오류 종료
    }; // 함수 종료
    return { // 통신기 반환
        getStore: () => call<StoreView>("get_model_store"), // 보관함 조회
        getRuntimeStatus: () => call<RuntimeStatus>("get_local_runtime_status"), // 엔진 상태 조회
        download: async (modelId, onEvent) => // 모델 받기
        { // 함수 시작
            const channel = createChannel<DownloadEvent>(); // 진행 채널
            channel.onmessage = onEvent; // 사건 전달 연결
            await call<void>("download_model", { modelId, onEvent: channel }); // 받기 실행
        }, // 함수 종료
        cancel: (modelId) => call<void>("cancel_model_download", { modelId }), // 받기 취소
        remove: (modelId) => call<void>("delete_model", { modelId }), // 모델 삭제
        select: (modelId) => call<void>("select_model", { modelId }), // 모델 선택
        stopRuntime: () => call<void>("stop_local_runtime"), // 엔진 끄기
    }; // 통신기 종료
} // 함수 종료
