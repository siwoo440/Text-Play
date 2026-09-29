import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { DesktopApp } from "@/desktop/DesktopApp"; // 데스크톱 앱
import type { TextPlaySaveSlot, TextPlaySlotId, TextPlayState } from "@/features/text-play/core/types"; // 저장 도메인 계약
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약

class CorruptLoadRepository implements TextPlaySaveRepository // 손상 저장소
{ // 클래스 시작
    public async list(_packageId: string): Promise<TextPlaySaveSlot[]> // 슬롯 목록
    { // 함수 시작
        void _packageId; // 미사용 값 표시
        return []; // 빈 목록 반환
    } // 함수 종료

    public async load(_packageId: string, _slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null> // 손상 슬롯 읽기
    { // 함수 시작
        void _packageId; // 미사용 작품 표시
        void _slotId; // 미사용 슬롯 표시
        throw new Error("손상 저장"); // 손상 오류
    } // 함수 종료

    public async save(_slotId: TextPlaySlotId, _state: TextPlayState, _summary: string): Promise<void> // 슬롯 저장
    { // 함수 시작
        void _slotId; // 미사용 슬롯 표시
        void _state; // 미사용 상태 표시
        void _summary; // 미사용 요약 표시
    } // 함수 종료

    public async remove(_packageId: string, _slotId: TextPlaySlotId): Promise<void> // 슬롯 삭제
    { // 함수 시작
        void _packageId; // 미사용 작품 표시
        void _slotId; // 미사용 슬롯 표시
    } // 함수 종료
} // 클래스 종료

describe("데스크톱 앱", () => // 데스크톱 앱 묶음
{ // 묶음 시작
    it("손상 저장이 있어도 새 게임 진입을 제공한다", async () => // 손상 저장 검증
    { // 테스트 시작
        render(<DesktopApp createRepository={() => new CorruptLoadRepository()} />); // 손상 저장 앱 렌더
        expect(await screen.findByRole("button", { name: "새 게임" })).toBeInTheDocument(); // 새 게임 표시 확인
        expect(screen.getByText("이어할 저장 없음")).toBeInTheDocument(); // 이어하기 비활성 확인
    }); // 테스트 종료

    it("임시 인공지능으로 네트워크 없이 플레이하고 같은 저장소로 홈에 복귀한다", async () => // 오프라인 흐름 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const createRepository = vi.fn(() => repository); // 저장소 생성 기록
        const fetchSpy = vi.spyOn(globalThis, "fetch"); // 네트워크 호출 감시
        render(<DesktopApp createRepository={createRepository} />); // 데스크톱 앱 렌더
        await user.click(await screen.findByRole("button", { name: "새 게임" })); // 새 게임 진입
        expect(screen.getByLabelText("AI 연결")).toHaveTextContent("임시 인공지능"); // 임시 인공지능 표시 확인
        await user.type(screen.getByRole("textbox", { name: "행동 직접 입력" }), "문양을 살핀다"); // 자유 행동 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 자유 행동 전송
        expect(await screen.findByText("그 선택을 기억할게.")).toBeInTheDocument(); // Mock 응답 완료 확인
        expect(fetchSpy).not.toHaveBeenCalled(); // 네트워크 미사용 확인
        await user.click(screen.getByRole("button", { name: "메인으로 돌아가기: 달빛 숲의 기록" })); // 홈 복귀
        expect(await screen.findByRole("button", { name: "새 게임" })).toBeInTheDocument(); // 홈 화면 확인
        expect(createRepository).toHaveBeenCalledOnce(); // 저장소 단일 생성 확인
        fetchSpy.mockRestore(); // 네트워크 감시 복원
    }); // 테스트 종료

    it("설정에서 선택한 올라마 모델을 현재 게임의 다음 응답부터 사용한다", async () => // 실행 중 전환 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const localAIClient: OllamaClient = { // 로컬 통신기 대역
            listModels: async () => [{ name: "qwen3:8b", size: 5_000_000_000, modifiedAt: "2026-09-29T00:00:00Z" }], // 설치 모델 반환
            listRunningModels: async () => [], // 실행 모델 없음 반환
            streamChat: async function* () // 대화 스트림 반환
            { // 함수 시작
                yield JSON.stringify({ narration: "로컬 모델이 달빛 문을 열었다.", dialogue: null, proposedActions: [] }); // 구조화 응답 반환
            }, // 함수 종료
        }; // 통신기 종료
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} createLocalAIClient={() => localAIClient} />); // 데스크톱 앱 렌더
        await user.click(await screen.findByRole("button", { name: "새 게임" })); // 새 게임 진입
        await user.click(screen.getByRole("button", { name: "게임 설정 열기" })); // 설정 열기
        await user.click(screen.getByRole("button", { name: "설치 모델 검색" })); // 모델 검색 실행
        await user.selectOptions(await screen.findByLabelText("로컬 모델"), "qwen3:8b"); // 로컬 모델 선택
        await user.selectOptions(screen.getByLabelText("사용할 챗봇"), "ollama"); // 올라마 공급자 선택
        expect(screen.getByLabelText("AI 연결")).toHaveTextContent("로컬 · qwen3:8b"); // 실행 공급자 표시 확인
        await user.click(screen.getByRole("button", { name: "닫기" })); // 설정 닫기
        await user.type(screen.getByRole("textbox", { name: "행동 직접 입력" }), "달빛 문을 연다"); // 자유 행동 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 자유 행동 전송
        expect(await screen.findByText("로컬 모델이 달빛 문을 열었다.")).toBeInTheDocument(); // 로컬 응답 표시 확인
    }); // 테스트 종료
}); // 묶음 종료
