import { render, screen, within } from "@testing-library/react"; // 화면 검증
import userEvent from "@testing-library/user-event"; // 사용자 행동
import { describe, expect, it } from "vitest"; // 검증 도구
import { TextPlayPlatformProvider } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 공급자
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 작품 목록
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 독립 저장소
import { createPreparedTextPlaySessionState, TEST_TEXT_PLAY_PLATFORM } from "@/test/text-play-fixtures"; // 준비된 상태
import { chooseTextPlayRecommendation } from "@/test/text-play-recommendations"; // 실제 답안 선택

describe("대표 작품 진행 안내", () => // 화면 검증 묶음
{ // 묶음 시작
    it("현재 목표와 얻은 아이템을 상시 표시한다", async () => // 진행 요약 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 준비
        render(<TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 플레이 화면
        expect(screen.getByRole("region", { name: "현재 진행" })).toHaveTextContent("등불을 들고 기록관의 흔적"); // 시작 목표
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 첫 단서 획득
        expect(screen.getByRole("region", { name: "현재 진행" })).toHaveTextContent("달빛 등불"); // 아이템 변화 표시
    }); // 검증 종료

    it("실제 작품과 공개 예정 작품을 나누고 임의 인기 수치를 숨긴다", () => // 목록 신뢰성 검증
    { // 검증 시작
        render(<TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 작품 목록
        expect(screen.getByRole("heading", { name: "플레이 가능한 작품" })).toBeInTheDocument(); // 실제 작품 구분
        expect(within(screen.getByRole("region", { name: "공개 예정 작품" })).getAllByRole("button").length).toBeGreaterThan(1); // 예정 작품 별도 영역
        expect(screen.queryByText(/212,400|184,000|인기 랭킹/u)).not.toBeInTheDocument(); // 예시 통계 제거
    }); // 검증 종료
}); // 묶음 종료
