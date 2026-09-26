import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

describe("Text-Play 저장 흐름", () => // 저장 흐름 묶음
{ // 묶음 시작
    it("자동 저장 슬롯을 이어하기 모드에서 복원한다", async () => // 자동 복원 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const savedSession = createPreparedTextPlaySessionState(); // 저장 세션 생성
        savedSession.game.sceneId = "moonlit-hall"; // 저장 장면 지정
        savedSession.game.locationId = "moonlit-hall"; // 저장 위치 지정
        savedSession.game.inventory["moon-lantern"] = 1; // 저장 아이템 지정
        await repository.save("auto", savedSession.game, "폐허 회랑"); // 자동 슬롯 저장
        render(<TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={repository} resumeSlot="auto"><TextPlayScreen /></TextPlayProvider>); // 이어하기 화면 렌더
        expect(await screen.findByRole("heading", { name: "폐허 회랑" })).toBeInTheDocument(); // 저장 장면 복원 확인
        expect(screen.getByText("moon-lantern × 1")).toBeInTheDocument(); // 저장 아이템 복원 확인
    }); // 테스트 종료

    it("수동 저장 뒤 진행한 상태를 저장 시점으로 복원한다", async () => // 저장 복원 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 회랑 이동
        const manager = screen.getByRole("region", { name: "저장 슬롯" }); // 저장 관리자 조회
        const firstSlot = within(manager).getByText("슬롯 1").parentElement as HTMLElement; // 첫 슬롯 조회
        await user.click(within(firstSlot).getByRole("button", { name: "저장" })); // 수동 저장
        await user.click(screen.getByRole("button", { name: "봉인된 서재로 간다" })); // 서재 이동
        expect(screen.getByRole("heading", { name: "봉인된 서재" })).toBeInTheDocument(); // 이동 확인
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true); // 불러오기 확인 설정
        await user.click(within(firstSlot).getByRole("button", { name: "불러오기" })); // 저장 복원
        expect(screen.getByRole("heading", { name: "폐허 회랑" })).toBeInTheDocument(); // 복원 확인
        confirm.mockRestore(); // 확인 함수 복원
    }); // 테스트 종료

    it("사용 중인 수동 슬롯에 장면과 플레이 시간을 표시한다", async () => // 슬롯 메타데이터 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 회랑 이동
        const firstSlot = screen.getByRole("group", { name: "수동 저장 슬롯 1" }); // 첫 슬롯 조회
        await user.click(within(firstSlot).getByRole("button", { name: "저장" })); // 수동 저장
        expect(await within(firstSlot).findByText("moonlit-hall")).toBeInTheDocument(); // 저장 장면 확인
        expect(within(firstSlot).getByText(/플레이 \d+분 \d+초/)).toBeInTheDocument(); // 플레이 시간 확인
        expect(within(firstSlot).getByText(/저장 /)).toBeInTheDocument(); // 저장 시각 확인
    }); // 테스트 종료

    it("불러오기 확인을 취소하면 현재 진행을 유지한다", async () => // 불러오기 취소 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 회랑 이동
        const firstSlot = screen.getByRole("group", { name: "수동 저장 슬롯 1" }); // 첫 슬롯 조회
        await user.click(within(firstSlot).getByRole("button", { name: "저장" })); // 수동 저장
        await user.click(screen.getByRole("button", { name: "봉인된 서재로 간다" })); // 서재 이동
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); // 확인 취소 설정
        await user.click(within(firstSlot).getByRole("button", { name: "불러오기" })); // 불러오기 선택
        expect(screen.getByRole("heading", { name: "봉인된 서재" })).toBeInTheDocument(); // 현재 장면 유지 확인
        expect(confirm).toHaveBeenCalledOnce(); // 확인 대화상자 확인
        confirm.mockRestore(); // 확인 함수 복원
    }); // 테스트 종료
}); // 묶음 종료
