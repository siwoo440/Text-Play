import { render, screen } from "@testing-library/react"; // 렌더 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 홈 화면
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

describe("Text-Play 홈", () => // 홈 검증 묶음
{ // 묶음 시작
    it("샘플 작품과 새 게임 경로를 제공한다", () => // 진입점 검증
    { // 테스트 시작
        render(<TextPlayHome repository={new MemoryTextPlaySaveRepository()} />); // 홈 렌더
        expect(screen.getByRole("heading", { name: "달빛 숲의 기록" })).toBeInTheDocument(); // 작품 제목 확인
        expect(screen.getByRole("link", { name: "새 게임" })).toHaveAttribute("href", "/text-play/demo?mode=new"); // 새 게임 링크 확인
        expect(screen.getByRole("link", { name: "Mate Verse 탐색으로 돌아가기" })).toHaveAttribute("href", "/"); // 복귀 링크 확인
    }); // 테스트 종료

    it("자동 저장이 있으면 진행 요약과 이어하기 경로를 표시한다", async () => // 이어하기 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const session = createPreparedTextPlaySessionState(); // 세션 생성
        session.game.sceneId = "moonlit-hall"; // 저장 장면 지정
        session.game.locationId = "moonlit-hall"; // 저장 위치 지정
        session.game.playTimeSeconds = 125; // 플레이 시간 지정
        await repository.save("auto", session.game, "폐허 회랑"); // 자동 슬롯 저장
        render(<TextPlayHome repository={repository} />); // 홈 렌더
        expect(await screen.findByRole("link", { name: "이어하기" })).toHaveAttribute("href", "/text-play/demo?mode=resume"); // 이어하기 경로 확인
        expect(screen.getByText("폐허 회랑 · 2분 5초")).toBeInTheDocument(); // 진행 요약 확인
    }); // 테스트 종료
}); // 묶음 종료
