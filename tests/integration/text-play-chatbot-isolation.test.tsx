import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { chooseTextPlayRecommendation } from "@/test/text-play-recommendations"; // 추천 답안 선택 도우미
import { describe, expect, it } from "vitest"; // 테스트 도구
import { AppProvider, useAppStore } from "@/features/core/AppProvider"; // 앱 상태 공급자
import { createInitialState } from "@/features/core/initial-state"; // 앱 초기 상태
import { TextPlayPlatformProvider } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 공급자
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 게임 공급자
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 게임 화면
import { createPreparedTextPlaySessionState, TEST_TEXT_PLAY_PLATFORM } from "@/test/text-play-fixtures"; // 게임 세션 픽스처

function AppStateProbe() // 앱 상태 확인기
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="챗봇 상태">{JSON.stringify(state)}</output>; // 앱 상태 출력
} // 함수 종료

describe("Text-Play와 챗봇 상태 격리", () => // 격리 검증 묶음
{ // 묶음 시작
    it("게임 선택과 저장 뒤에도 기존 챗봇 상태를 변경하지 않는다", async () => // 상태 격리 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        const appState = createInitialState(); // 기준 앱 상태 생성
        const before = JSON.stringify(appState); // 기준 상태 직렬화
        render(<AppProvider initialState={appState} repository={{ load: () => appState, save: () => undefined }}><TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><AppStateProbe /><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider></AppProvider>); // 통합 화면 렌더
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 게임 선택
        await user.click(screen.getByRole("button", { name: "저장 슬롯 열기" })); // 저장 모달 열기
        const firstSave = within(screen.getByRole("group", { name: "수동 저장 슬롯 1" })).getByRole("button", { name: "저장" }); // 첫 저장 버튼 조회
        await user.click(firstSave); // 게임 저장
        expect(screen.getByLabelText("챗봇 상태")).toHaveTextContent(before); // 챗봇 상태 유지 확인
    }); // 테스트 종료
}); // 묶음 종료
