import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { loadTextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 설정 읽기
import { TextPlaySettingsDialog } from "@/features/text-play/ui/TextPlaySettingsDialog"; // 설정 대화상자

describe("Text-Play 설정 대화상자", () => // 설정 대화상자 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        window.localStorage.clear(); // 저장소 초기화
    }); // 초기화 종료

    it("세 가지 테마를 제공하고 선택한 테마를 저장한다", async () => // 테마 선택 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        const platform: TextPlayPlatform = { applyWindowResolution: async () => undefined, navigate: vi.fn(), renderSceneImage: () => null }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlaySettingsDialog open onClose={vi.fn()} /></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 설정 화면 렌더
        expect(screen.getAllByRole("radio", { name: /테마/u })).toHaveLength(3); // 테마 개수 확인
        expect(screen.getByRole("radio", { name: "다크 판타지 글래스 테마" })).toHaveFocus(); // 초기 초점 확인
        await user.click(screen.getByRole("radio", { name: "클래식 비주얼 노벨 테마" })); // 클래식 테마 선택
        expect(loadTextPlayPreferences(window.localStorage).themeId).toBe("classic-novel"); // 테마 저장 확인
    }); // 테스트 종료

    it("해상도를 저장하고 로컬 GPU 선택은 비활성 상태로 표시한다", async () => // 화면 설정 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        const applyWindowResolution = vi.fn(async () => undefined); // 해상도 적용 기록
        const platform: TextPlayPlatform = { applyWindowResolution, navigate: vi.fn(), renderSceneImage: () => null }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlaySettingsDialog open onClose={vi.fn()} /></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 설정 화면 렌더
        await user.selectOptions(screen.getByLabelText("창 해상도"), "1600x900"); // 해상도 선택
        expect(loadTextPlayPreferences(window.localStorage).resolutionId).toBe("1600x900"); // 해상도 저장 확인
        expect(applyWindowResolution).toHaveBeenCalledWith("1600x900"); // 창 적용 확인
        expect(screen.getByRole("option", { name: "로컬 GPU 모델 · 연결 준비 중" })).toBeDisabled(); // 로컬 AI 비활성 확인
    }); // 테스트 종료
}); // 묶음 종료
