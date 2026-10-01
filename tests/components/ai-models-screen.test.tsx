import { render, screen, waitFor, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AiModelsScreen } from "@/desktop/ai-models/AiModelsScreen"; // AI 모델 화면
import type { DownloadEvent, ModelStoreClient, ModelView, RuntimeStatus, StoreView } from "@/desktop/ai-models/model-store-client"; // 보관함 계약

const GIB = 1_073_741_824; // 1GiB

function model(overrides: Partial<ModelView>): ModelView // 시험 모델
{ // 함수 시작
    return { id: "midm-2.0-mini", label: "가벼움 · Mi:dm 2.0 Mini", role: "light", license: "MIT", sizeBytes: 1_600_000_000, status: "not-installed", downloadedBytes: 0, available: true, fitness: "recommended", hasRoom: true, active: false, ...overrides }; // 모델 반환
} // 함수 종료

function createClient(models: ModelView[], runtime: RuntimeStatus = { state: "stopped", backend: null, message: null }) // 가짜 보관함 통신기
{ // 함수 시작
    const store: StoreView = { hardware: { gpuName: "NVIDIA GeForce RTX 5070 Ti", vramBytes: 16 * GIB, ramBytes: 32 * GIB }, freeDiskBytes: 100 * GIB, models, activeModelId: null }; // 보관함 상태
    let finishDownload: (() => void) | null = null; // 받기 끝내기
    let failDownload: ((error: Error) => void) | null = null; // 받기 실패시키기
    let emit: ((event: DownloadEvent) => void) | null = null; // 진행 사건 전달기
    const client = // 통신기
    { // 객체 시작
        getStore: vi.fn(async () => structuredClone(store)), // 보관함 조회
        getRuntimeStatus: vi.fn(async () => ({ ...runtime })), // 엔진 상태 조회
        download: vi.fn((modelId: string, onEvent: (event: DownloadEvent) => void) => new Promise<void>((resolve, reject) => // 받기
        { // 약속 시작
            emit = onEvent; // 사건 전달기 보관
            finishDownload = () => // 완료 처리
            { // 처리 시작
                const target = store.models.find((item) => item.id === modelId); // 대상 모델
                if (target !== undefined) { target.status = "installed"; target.downloadedBytes = target.sizeBytes; } // 설치 반영
                onEvent({ type: "done" }); // 완료 사건
                resolve(); // 완료
            }; // 처리 종료
            failDownload = reject; // 실패 함수 보관
        })), // 받기 종료
        cancel: vi.fn(async () => failDownload?.(new Error("DOWNLOAD_CANCELLED: 다운로드를 취소했습니다."))), // 취소
        remove: vi.fn(async (modelId: string) => { const target = store.models.find((item) => item.id === modelId); if (target !== undefined) { target.status = "not-installed"; target.downloadedBytes = 0; target.active = false; } }), // 삭제(받은 파일도 지움)
        select: vi.fn(async (modelId: string) => { store.models.forEach((item) => { item.active = item.id === modelId; }); store.activeModelId = modelId; }), // 선택
        stopRuntime: vi.fn(async () => { runtime = { state: "stopped", backend: null, message: null }; }), // 엔진 끄기
    } satisfies ModelStoreClient; // 계약 확인
    return { client, emitProgress: (event: DownloadEvent) => emit?.(event), finish: () => finishDownload?.() }; // 통신기와 조작 함수 반환
} // 함수 종료

describe("AI 모델 화면", () => // 화면 묶음
{ // 묶음 시작
    it("이 PC 사양, 실행 엔진 상태, 모델 카드와 적합도를 보여 준다", async () => // 기본 표시 검증
    { // 테스트 시작
        const { client } = createClient([model({}), model({ id: "qwen3.5-4b", label: "표준 · Qwen3.5-4B", role: "standard", fitness: "possible" }), model({ id: "qwen3.5-9b", label: "고성능 · Qwen3.5-9B", role: "high", fitness: "insufficient" })]); // 통신기
        render(<AiModelsScreen client={client} />); // 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: "AI 모델" })).toBeInTheDocument(); // 제목 확인
        expect(await screen.findByText("NVIDIA GeForce RTX 5070 Ti · 그래픽 메모리 16.0GB · RAM 32.0GB · 남은 공간 100.0GB")).toBeInTheDocument(); // 사양 확인
        expect(screen.getByText("꺼짐 · 내장 AI로 행동을 보내면 켜집니다")).toBeInTheDocument(); // 엔진 상태 확인
        const light = screen.getByRole("article", { name: "가벼움 · Mi:dm 2.0 Mini" }); // 가벼움 카드
        expect(within(light).getByText("이 PC: 권장")).toBeInTheDocument(); // 적합도 확인
        expect(within(light).getByText("1.5GB · MIT")).toBeInTheDocument(); // 크기·라이선스 확인
        expect(within(screen.getByRole("article", { name: "표준 · Qwen3.5-4B" })).getByText("이 PC: 가능")).toBeInTheDocument(); // 표준 적합도
        const high = screen.getByRole("article", { name: "고성능 · Qwen3.5-9B" }); // 고성능 카드
        expect(within(high).getByText("이 PC 사양으로는 부족할 수 있습니다.")).toBeInTheDocument(); // 부족 경고 확인
        expect(within(high).getByRole("button", { name: "그래도 다운로드" })).toBeEnabled(); // 경고 후 받기 확인
    }); // 테스트 종료

    it("받기 정보가 없거나 공간이 부족하면 다운로드를 막는다", async () => // 받기 막기 검증
    { // 테스트 시작
        const { client } = createClient([model({ available: false }), model({ id: "qwen3.5-4b", label: "표준 · Qwen3.5-4B", hasRoom: false })]); // 통신기
        render(<AiModelsScreen client={client} />); // 화면 렌더
        const light = await screen.findByRole("article", { name: "가벼움 · Mi:dm 2.0 Mini" }); // 가벼움 카드
        expect(within(light).getByRole("button", { name: "준비 중" })).toBeDisabled(); // 준비 중 확인
        expect(within(light).getByText("약 1.5GB · MIT")).toBeInTheDocument(); // 예상 크기 확인
        expect(within(screen.getByRole("article", { name: "표준 · Qwen3.5-4B" })).getByRole("button", { name: "공간 부족" })).toBeDisabled(); // 공간 부족 확인
    }); // 테스트 종료

    it("다운로드 진행률을 보여 주고 끝나면 사용하기로 바뀌며 누르면 사용 중이 된다", async () => // 받기·사용 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작
        const { client, emitProgress, finish } = createClient([model({})]); // 통신기
        render(<AiModelsScreen client={client} />); // 화면 렌더
        const card = await screen.findByRole("article", { name: "가벼움 · Mi:dm 2.0 Mini" }); // 카드
        await user.click(within(card).getByRole("button", { name: "다운로드" })); // 받기 시작
        emitProgress({ type: "progress", receivedBytes: 800_000_000, totalBytes: 1_600_000_000, bytesPerSecond: 0 }); // 진행 사건
        expect(await within(card).findByRole("progressbar", { name: "가벼움 · Mi:dm 2.0 Mini 다운로드 진행률" })).toHaveAttribute("aria-valuenow", "50"); // 진행률 확인
        finish(); // 받기 완료
        await user.click(await within(card).findByRole("button", { name: "사용하기" })); // 사용하기
        expect(client.select).toHaveBeenCalledWith("midm-2.0-mini"); // 선택 확인
        expect(await within(card).findByText("사용 중")).toBeInTheDocument(); // 사용 중 확인
    }); // 테스트 종료

    it("받는 중에 취소하면 이어받을 수 있다고 안내한다", async () => // 취소 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작
        const { client, emitProgress } = createClient([model({})]); // 통신기
        render(<AiModelsScreen client={client} />); // 화면 렌더
        const card = await screen.findByRole("article", { name: "가벼움 · Mi:dm 2.0 Mini" }); // 카드
        await user.click(within(card).getByRole("button", { name: "다운로드" })); // 받기 시작
        emitProgress({ type: "progress", receivedBytes: 100, totalBytes: 1_600_000_000, bytesPerSecond: 50 }); // 진행 사건
        await user.click(await within(card).findByRole("button", { name: "취소" })); // 취소
        expect(client.cancel).toHaveBeenCalledWith("midm-2.0-mini"); // 취소 확인
        expect(await screen.findByText("다운로드를 취소했습니다. 다시 누르면 이어서 받습니다.")).toBeInTheDocument(); // 안내 확인
    }); // 테스트 종료

    it("삭제는 화면에서 한 번 더 확인한다", async () => // 삭제 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작
        const { client } = createClient([model({ status: "installed", downloadedBytes: 1_600_000_000, active: true })]); // 설치된 모델
        render(<AiModelsScreen client={client} />); // 화면 렌더
        const card = await screen.findByRole("article", { name: "가벼움 · Mi:dm 2.0 Mini" }); // 카드
        expect(within(card).getByText("사용 중")).toBeInTheDocument(); // 사용 중 확인
        await user.click(within(card).getByRole("button", { name: "삭제" })); // 삭제 누르기
        expect(client.remove).not.toHaveBeenCalled(); // 바로 지우지 않음 확인
        await user.click(within(card).getByRole("button", { name: "그만두기" })); // 그만두기
        await user.click(within(card).getByRole("button", { name: "삭제" })); // 다시 삭제
        await user.click(within(card).getByRole("button", { name: "삭제 확인" })); // 삭제 확인
        expect(client.remove).toHaveBeenCalledWith("midm-2.0-mini"); // 삭제 확인
        expect(await within(card).findByRole("button", { name: "다운로드" })).toBeInTheDocument(); // 미설치로 돌아감 확인
    }); // 테스트 종료

    it("받다 만 모델은 이어받기로 보여 준다", async () => // 이어받기 표시 검증
    { // 테스트 시작
        const { client } = createClient([model({ downloadedBytes: 400_000_000 })]); // 받다 만 모델
        render(<AiModelsScreen client={client} />); // 화면 렌더
        expect(within(await screen.findByRole("article", { name: "가벼움 · Mi:dm 2.0 Mini" })).getByRole("button", { name: "이어받기" })).toBeInTheDocument(); // 이어받기 확인
    }); // 테스트 종료

    it("켜진 엔진은 끌 수 있다", async () => // 엔진 끄기 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작
        const { client } = createClient([model({})], { state: "ready", backend: "vulkan", message: null }); // 켜진 엔진
        render(<AiModelsScreen client={client} />); // 화면 렌더
        expect(await screen.findByText("켜짐 · 그래픽(Vulkan)으로 실행 중")).toBeInTheDocument(); // 상태 확인
        await user.click(screen.getByRole("button", { name: "엔진 끄기" })); // 끄기
        expect(client.stopRuntime).toHaveBeenCalled(); // 끄기 호출 확인
        expect(await screen.findByText("꺼짐 · 내장 AI로 행동을 보내면 켜집니다")).toBeInTheDocument(); // 꺼짐 확인
    }); // 테스트 종료

    it("정보를 불러오지 못하면 실행 프로그램 전용이라고 안내한다", async () => // 실패 검증
    { // 테스트 시작
        const { client } = createClient([]); // 통신기
        client.getStore.mockRejectedValueOnce(new Error("invoke 없음")); // 조회 실패
        render(<AiModelsScreen client={client} />); // 화면 렌더
        expect(await screen.findByRole("alert")).toHaveTextContent("AI 모델 정보를 불러오지 못했습니다. Windows 실행 프로그램에서 사용할 수 있습니다."); // 안내 확인
        await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument()); // 카드 없음 확인
    }); // 테스트 종료
}); // 묶음 종료
