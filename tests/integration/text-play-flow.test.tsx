import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 공급자
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면
import { createPreparedTextPlaySessionState, TEST_TEXT_PLAY_PLATFORM } from "@/test/text-play-fixtures"; // 세션 픽스처

describe("Text-Play 전체 플레이 흐름", () => // 플레이 흐름 묶음
{ // 묶음 시작
    it("선택지를 따라 진실 엔딩과 완료 퀘스트에 도달한다", async () => // 정상 엔딩 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPlatformProvider>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 등불 선택
        await user.click(screen.getByRole("button", { name: "봉인된 서재로 간다" })); // 서재 선택
        await user.click(screen.getByRole("button", { name: "기록을 해독한다" })); // 기록 해독
        expect(screen.getByRole("heading", { name: "기록의 진실" })).toBeInTheDocument(); // 엔딩 제목 확인
        expect(screen.getByText("완료: voices-below")).toBeInTheDocument(); // 완료 퀘스트 확인
    }); // 테스트 종료
}); // 묶음 종료
