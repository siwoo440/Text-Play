import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { ResilientTextPlaySaveRepository, TEXT_PLAY_MEMORY_STORAGE_WARNING } from "@/features/text-play/storage/browser-save-repository"; // 복구 저장소
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 홈 화면
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

function createPlatform(navigate = vi.fn()): TextPlayPlatform // 테스트 플랫폼 생성기
{ // 함수 시작
    return { applyWindowResolution: async () => undefined, navigate, renderSceneImage: () => null }; // 테스트 플랫폼 반환
} // 함수 종료

describe("Text-Play 홈", () => // 홈 검증 묶음
{ // 묶음 시작
    it("샘플 작품과 새 게임 동작을 제공한다", async () => // 진입점 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        render(<TextPlayPlatformProvider value={createPlatform(navigate)}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 홈 렌더
        expect(screen.getByRole("heading", { name: "달빛 숲의 기록" })).toBeInTheDocument(); // 작품 제목 확인
        await user.click(screen.getByRole("button", { name: "새 게임" })); // 새 게임 선택
        await user.click(screen.getByRole("button", { name: "Mate Verse 탐색으로 돌아가기" })); // 복귀 선택
        expect(navigate).toHaveBeenNthCalledWith(1, "new"); // 새 게임 이동 확인
        expect(navigate).toHaveBeenNthCalledWith(2, "back"); // 복귀 이동 확인
    }); // 테스트 종료

    it("자동 저장이 있으면 진행 요약과 이어하기 경로를 표시한다", async () => // 이어하기 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const session = createPreparedTextPlaySessionState(); // 세션 생성
        session.game.sceneId = "moonlit-hall"; // 저장 장면 지정
        session.game.locationId = "moonlit-hall"; // 저장 위치 지정
        session.game.playTimeSeconds = 125; // 플레이 시간 지정
        await repository.save("auto", session.game, "폐허 회랑"); // 자동 슬롯 저장
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        render(<TextPlayPlatformProvider value={createPlatform(navigate)}><TextPlayHome repository={repository} /></TextPlayPlatformProvider>); // 홈 렌더
        await user.click(await screen.findByRole("button", { name: "이어하기" })); // 이어하기 선택
        expect(navigate).toHaveBeenCalledWith("resume"); // 이어하기 이동 확인
        expect(screen.getByText("폐허 회랑 · 2분 5초")).toBeInTheDocument(); // 진행 요약 확인
    }); // 테스트 종료

    it("IndexedDB 실패 시 메모리 저장 경고를 표시한다", async () => // 대체 저장 경고 검증
    { // 테스트 시작
        const failingRepository = // 실패 저장소 생성
        { // 저장소 시작
            list: async () => [], // 빈 목록
            load: async () => // 읽기 실패 함수
            { // 함수 시작
                throw new Error("indexeddb-failed"); // 읽기 실패
            }, // 함수 종료
            save: async () => undefined, // 저장 성공
            remove: async () => undefined, // 삭제 성공
        }; // 저장소 종료
        const repository = new ResilientTextPlaySaveRepository(failingRepository); // 복구 저장소 생성
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={repository} /></TextPlayPlatformProvider>); // 홈 렌더
        expect(await screen.findByRole("alert")).toHaveTextContent(TEXT_PLAY_MEMORY_STORAGE_WARNING); // 대체 경고 확인
    }); // 테스트 종료
}); // 묶음 종료
