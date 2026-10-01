import type { HardwareInfo, ModelFitness, ModelRole, RuntimeStatus } from "@/desktop/ai-models/model-store-client"; // 보관함 계약
import { defineText } from "@/features/text-play/i18n/localized-text"; // 언어별 글자 정의
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어

const GIB = 1_073_741_824; // 1GiB
const MIB = 1_048_576; // 1MiB

export const AI_MODELS_TEXT = defineText( // AI 모델 화면 글자
    { // 한국어 시작
        fitness: { recommended: "권장", possible: "가능", slow: "느릴 수 있음", insufficient: "부족" } satisfies Record<ModelFitness, string>, // 적합도 이름
        roles: { light: "가벼움", standard: "표준", high: "고성능" } satisfies Record<ModelRole, string>, // 역할 이름
        about: (size: string) => `약 ${size}`, // 예상 크기
        noGpu: "그래픽 장치 없음(CPU로 실행)", // 그래픽 없음
        gpu: (name: string, vram: string) => `${name} · 그래픽 메모리 ${vram}`, // 그래픽
        diskUnknown: "남은 공간 확인 불가", // 디스크 모름
        disk: (free: string) => `남은 공간 ${free}`, // 디스크
        runtimeReady: (vulkan: boolean) => `켜짐 · ${vulkan ? "그래픽(Vulkan)으로" : "CPU로"} 실행 중`, // 켜짐(받침에 맞는 조사)
        runtimeStarting: "켜는 중", // 켜는 중
        runtimeFailed: (reason: string | null) => `켜지 못함 · ${reason ?? "이유를 알 수 없습니다."}`, // 실패
        runtimeStopped: "꺼짐 · 내장 AI로 행동을 보내면 켜집니다", // 꺼짐
        measuringSpeed: (amount: string) => `${amount} · 속도 계산 중`, // 속도 계산 중
        progress: (amount: string, speed: string, minutes: number) => `${amount} · ${speed}MB/초 · 약 ${minutes}분 남음`, // 진행률
        cancelled: "다운로드를 취소했습니다. 다시 누르면 이어서 받습니다.", // 취소
        eyebrow: "내장 AI", // 작은 제목
        title: "AI 모델", // 제목
        description: "이 PC에서 인터넷 없이 Text-Play 응답을 만드는 AI 모델을 받고 고릅니다. 대화 내용은 PC 밖으로 나가지 않습니다.", // 설명
        loadFailed: "AI 모델 정보를 불러오지 못했습니다. Windows 실행 프로그램에서 사용할 수 있습니다.", // 불러오기 실패
        loading: "AI 모델 정보를 불러오고 있습니다.", // 불러오는 중
        thisPC: "이 PC", // PC 사양
        engine: "실행 엔진", // 엔진
        engineStopped: "실행 엔진을 껐습니다.", // 엔진 끔
        stopEngine: "엔진 끄기", // 엔진 끄기
        fitnessLine: (fitness: string) => `이 PC: ${fitness}`, // 적합도
        insufficientWarning: "이 PC 사양으로는 부족할 수 있습니다.", // 부족 경고
        active: "사용 중", // 사용 중
        downloaded: (model: string) => `${model} 다운로드를 마쳤습니다. 사용하기를 누르면 내장 AI가 이 모델로 대답합니다.`, // 받기 완료
        progressLabel: (model: string) => `${model} 다운로드 진행률`, // 진행 막대
        verifying: "받은 파일을 검사하고 있습니다", // 검사 중
        cancel: "취소", // 취소
        selected: (model: string) => `${model}을(를) 내장 AI 모델로 정했습니다.`, // 선택 완료
        use: "사용하기", // 사용하기
        confirmDelete: "정말 삭제할까요?", // 삭제 확인
        removed: (model: string) => `${model}을(를) 삭제했습니다.`, // 삭제 완료
        deleteConfirm: "삭제 확인", // 삭제 확인 버튼
        keep: "그만두기", // 그만두기
        remove: "삭제", // 삭제
        preparing: "준비 중", // 준비 중
        noRoom: "공간 부족", // 공간 부족
        downloading: "받는 중", // 받는 중
        resume: "이어받기", // 이어받기
        downloadAnyway: "그래도 다운로드", // 그래도 받기
        download: "다운로드", // 받기
        tip: "Text-Play 플레이 화면 오른쪽 위 AI 선택에서 ‘내장 AI(이 PC)’를 고르면 사용 중 모델이 대답합니다. 모델을 받기 전에는 임시 인공지능을 쓰면 됩니다.", // 사용 안내
    }, // 한국어 종료
    { // 영어 시작
        fitness: { recommended: "Recommended", possible: "Possible", slow: "May be slow", insufficient: "Insufficient" }, // 적합도 이름
        roles: { light: "Light", standard: "Standard", high: "High performance" }, // 역할 이름
        about: (size: string) => `about ${size}`, // 예상 크기
        noGpu: "No graphics device (runs on CPU)", // 그래픽 없음
        gpu: (name: string, vram: string) => `${name} · ${vram} graphics memory`, // 그래픽
        diskUnknown: "Free space unknown", // 디스크 모름
        disk: (free: string) => `${free} free`, // 디스크
        runtimeReady: (vulkan: boolean) => `On · running on ${vulkan ? "graphics (Vulkan)" : "CPU"}`, // 켜짐
        runtimeStarting: "Starting", // 켜는 중
        runtimeFailed: (reason: string | null) => `Could not start · ${reason ?? "Unknown reason."}`, // 실패
        runtimeStopped: "Off · starts when you send an action with the built-in AI", // 꺼짐
        measuringSpeed: (amount: string) => `${amount} · measuring speed`, // 속도 계산 중
        progress: (amount: string, speed: string, minutes: number) => `${amount} · ${speed}MB/s · about ${minutes} min left`, // 진행률
        cancelled: "Download cancelled. Press again to resume.", // 취소
        eyebrow: "Built-in AI", // 작은 제목
        title: "AI models", // 제목
        description: "Download and choose AI models that create Text-Play replies on this PC without the internet. Your conversations never leave this PC.", // 설명
        loadFailed: "Could not load AI model information. It is available in the Windows app.", // 불러오기 실패
        loading: "Loading AI model information.", // 불러오는 중
        thisPC: "This PC", // PC 사양
        engine: "Engine", // 엔진
        engineStopped: "Turned off the engine.", // 엔진 끔
        stopEngine: "Turn off engine", // 엔진 끄기
        fitnessLine: (fitness: string) => `This PC: ${fitness}`, // 적합도
        insufficientWarning: "This PC may not be powerful enough.", // 부족 경고
        active: "In use", // 사용 중
        downloaded: (model: string) => `Finished downloading ${model}. Press Use to have the built-in AI answer with this model.`, // 받기 완료
        progressLabel: (model: string) => `${model} download progress`, // 진행 막대
        verifying: "Checking the downloaded file", // 검사 중
        cancel: "Cancel", // 취소
        selected: (model: string) => `Set ${model} as the built-in AI model.`, // 선택 완료
        use: "Use", // 사용하기
        confirmDelete: "Delete this model?", // 삭제 확인
        removed: (model: string) => `Deleted ${model}.`, // 삭제 완료
        deleteConfirm: "Delete", // 삭제 확인 버튼
        keep: "Keep", // 그만두기
        remove: "Delete", // 삭제
        preparing: "Coming soon", // 준비 중
        noRoom: "Not enough space", // 공간 부족
        downloading: "Downloading", // 받는 중
        resume: "Resume download", // 이어받기
        downloadAnyway: "Download anyway", // 그래도 받기
        download: "Download", // 받기
        tip: "Choose ‘Built-in AI (this PC)’ in the AI menu at the top right of the Text-Play play screen to have the model in use answer. Before downloading a model, you can use the temporary AI.", // 사용 안내
    }, // 영어 종료
); // 글자 종료

export const FITNESS_LABELS: Record<ModelFitness, string> = AI_MODELS_TEXT.ko.fitness; // 적합도 이름(한국어)
export const ROLE_LABELS: Record<ModelRole, string> = AI_MODELS_TEXT.ko.roles; // 역할 이름(한국어)

function gigabytes(bytes: number): string // GB 한 자리
{ // 함수 시작
    return `${(bytes / GIB).toFixed(1)}GB`; // 크기 반환
} // 함수 종료

export function formatGigabytes(bytes: number, estimate: boolean, language: AppLanguage = "ko"): string // 크기 표시(예상치는 약)
{ // 함수 시작
    return estimate ? AI_MODELS_TEXT[language].about(gigabytes(bytes)) : gigabytes(bytes); // 크기 반환
} // 함수 종료

export function describeHardware(hardware: HardwareInfo, freeDiskBytes: number | null, language: AppLanguage = "ko"): string // PC 사양 한 줄 요약
{ // 함수 시작
    const text = AI_MODELS_TEXT[language]; // 언어별 글자
    const graphics = hardware.gpuName === null ? text.noGpu : text.gpu(hardware.gpuName, gigabytes(hardware.vramBytes)); // 그래픽
    const disk = freeDiskBytes === null ? text.diskUnknown : text.disk(gigabytes(freeDiskBytes)); // 디스크
    return `${graphics} · RAM ${gigabytes(hardware.ramBytes)} · ${disk}`; // 요약 반환
} // 함수 종료

export function describeRuntime(status: RuntimeStatus, language: AppLanguage = "ko"): string // 실행 엔진 상태 안내
{ // 함수 시작
    const text = AI_MODELS_TEXT[language]; // 언어별 글자
    if (status.state === "ready") // 켜짐 확인
    { // 조건 시작
        return text.runtimeReady(status.backend === "vulkan"); // 켜짐 안내
    } // 조건 종료
    if (status.state === "starting") // 켜는 중 확인
    { // 조건 시작
        return text.runtimeStarting; // 켜는 중 안내
    } // 조건 종료
    if (status.state === "failed") // 실패 확인
    { // 조건 시작
        return text.runtimeFailed(status.message ?? null); // 실패 안내
    } // 조건 종료
    return text.runtimeStopped; // 꺼짐 안내
} // 함수 종료

export function formatProgress(receivedBytes: number, totalBytes: number, bytesPerSecond: number, language: AppLanguage = "ko"): { percent: number; text: string } // 진행률 표시
{ // 함수 시작
    const text = AI_MODELS_TEXT[language]; // 언어별 글자
    const percent = totalBytes <= 0 ? 0 : Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)); // 백분율
    const amount = `${gigabytes(receivedBytes)} / ${gigabytes(totalBytes)}`; // 받은 크기
    if (bytesPerSecond <= 0) // 속도 확인
    { // 조건 시작
        return { percent, text: text.measuringSpeed(amount) }; // 속도 계산 중
    } // 조건 종료
    const minutes = Math.max(1, Math.ceil(Math.max(0, totalBytes - receivedBytes) / bytesPerSecond / 60)); // 남은 분
    return { percent, text: text.progress(amount, (bytesPerSecond / MIB).toFixed(1), minutes) }; // 진행률 반환
} // 함수 종료

export function toModelErrorMessage(error: unknown, language: AppLanguage = "ko"): string // 사용자 안내 오류 문구
{ // 함수 시작
    const message = error instanceof Error ? error.message : String(error); // 원문
    if (message.startsWith("DOWNLOAD_CANCELLED")) // 취소 확인
    { // 조건 시작
        return AI_MODELS_TEXT[language].cancelled; // 취소 안내
    } // 조건 종료
    return message.replace(/^[A-Z_]+:\s*/u, ""); // 내부 표시 제거(엔진이 보낸 이유는 한국어 그대로)
} // 함수 종료

export function modelDisplayName(label: string, language: AppLanguage = "ko"): string // 모델 표시 이름(영어는 목록 파일의 한국어 역할 앞말을 뺌, 역할은 카드 위 표시로 보여 줌)
{ // 함수 시작
    return language === "en" ? label.replace(/^[^·]*[가-힣][^·]*·\s*/u, "") : label; // 이름 반환
} // 함수 종료
