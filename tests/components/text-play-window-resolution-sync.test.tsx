import { render, waitFor } from "@testing-library/react"; // 렌더 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 공급자
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { saveTextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 설정 저장기
import { TextPlayWindowResolutionSync } from "@/features/text-play/preferences/TextPlayWindowResolutionSync"; // 해상도 동기화기

describe("Text-Play 창 해상도 동기화", () => // 동기화 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        window.localStorage.clear(); // 저장소 초기화
    }); // 초기화 종료

    it("플레이 화면 진입 전에도 저장된 해상도를 적용한다", async () => // 홈 해상도 검증
    { // 테스트 시작
        saveTextPlayPreferences(window.localStorage, { schemaVersion: 2, themeId: "dark-fantasy", resolutionId: "1600x900", aiProviderId: "mock", localModelId: null }); // 저장 해상도 준비
        const applyWindowResolution = vi.fn(async () => undefined); // 적용 기록기
        const platform: TextPlayPlatform = { applyWindowResolution, navigate: vi.fn(), renderSceneImage: () => null }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlayWindowResolutionSync /><span>홈 화면</span></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 홈 구조 렌더
        await waitFor(() => expect(applyWindowResolution).toHaveBeenCalledWith("1600x900")); // 저장 해상도 적용 확인
    }); // 테스트 종료
}); // 묶음 종료
