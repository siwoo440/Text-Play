import type { HardwareInfo, ModelFitness, ModelRole, RuntimeStatus } from "@/desktop/ai-models/model-store-client"; // 보관함 계약

const GIB = 1_073_741_824; // 1GiB
const MIB = 1_048_576; // 1MiB

export const FITNESS_LABELS: Record<ModelFitness, string> = { recommended: "권장", possible: "가능", slow: "느릴 수 있음", insufficient: "부족" }; // 적합도 이름
export const ROLE_LABELS: Record<ModelRole, string> = { light: "가벼움", standard: "표준", high: "고성능" }; // 역할 이름

function gigabytes(bytes: number): string // GB 한 자리
{ // 함수 시작
    return `${(bytes / GIB).toFixed(1)}GB`; // 크기 반환
} // 함수 종료

export function formatGigabytes(bytes: number, estimate: boolean): string // 크기 표시(예상치는 약)
{ // 함수 시작
    return estimate ? `약 ${gigabytes(bytes)}` : gigabytes(bytes); // 크기 반환
} // 함수 종료

export function describeHardware(hardware: HardwareInfo, freeDiskBytes: number | null): string // PC 사양 한 줄 요약
{ // 함수 시작
    const graphics = hardware.gpuName === null ? "그래픽 장치 없음(CPU로 실행)" : `${hardware.gpuName} · 그래픽 메모리 ${gigabytes(hardware.vramBytes)}`; // 그래픽
    const disk = freeDiskBytes === null ? "남은 공간 확인 불가" : `남은 공간 ${gigabytes(freeDiskBytes)}`; // 디스크
    return `${graphics} · RAM ${gigabytes(hardware.ramBytes)} · ${disk}`; // 요약 반환
} // 함수 종료

export function describeRuntime(status: RuntimeStatus): string // 실행 엔진 상태 안내
{ // 함수 시작
    if (status.state === "ready") // 켜짐 확인
    { // 조건 시작
        return `켜짐 · ${status.backend === "vulkan" ? "그래픽(Vulkan)으로" : "CPU로"} 실행 중`; // 켜짐 안내(받침에 맞는 조사)
    } // 조건 종료
    if (status.state === "starting") // 켜는 중 확인
    { // 조건 시작
        return "켜는 중"; // 켜는 중 안내
    } // 조건 종료
    if (status.state === "failed") // 실패 확인
    { // 조건 시작
        return `켜지 못함 · ${status.message ?? "이유를 알 수 없습니다."}`; // 실패 안내
    } // 조건 종료
    return "꺼짐 · 내장 AI로 행동을 보내면 켜집니다"; // 꺼짐 안내
} // 함수 종료

export function formatProgress(receivedBytes: number, totalBytes: number, bytesPerSecond: number): { percent: number; text: string } // 진행률 표시
{ // 함수 시작
    const percent = totalBytes <= 0 ? 0 : Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)); // 백분율
    const amount = `${gigabytes(receivedBytes)} / ${gigabytes(totalBytes)}`; // 받은 크기
    if (bytesPerSecond <= 0) // 속도 확인
    { // 조건 시작
        return { percent, text: `${amount} · 속도 계산 중` }; // 속도 계산 중
    } // 조건 종료
    const minutes = Math.max(1, Math.ceil(Math.max(0, totalBytes - receivedBytes) / bytesPerSecond / 60)); // 남은 분
    return { percent, text: `${amount} · ${(bytesPerSecond / MIB).toFixed(1)}MB/초 · 약 ${minutes}분 남음` }; // 진행률 반환
} // 함수 종료

export function toModelErrorMessage(error: unknown): string // 사용자 안내 오류 문구
{ // 함수 시작
    const message = error instanceof Error ? error.message : String(error); // 원문
    if (message.startsWith("DOWNLOAD_CANCELLED")) // 취소 확인
    { // 조건 시작
        return "다운로드를 취소했습니다. 다시 누르면 이어서 받습니다."; // 취소 안내
    } // 조건 종료
    return message.replace(/^[A-Z_]+:\s*/u, ""); // 내부 표시 제거
} // 함수 종료
