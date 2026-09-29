import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { createElement } from "react"; // 리액트 요소 생성기
import { renderToString } from "react-dom/server"; // 서버 렌더 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPreferencesProvider, useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 문맥
import { DEFAULT_TEXT_PLAY_PREFERENCES, LEGACY_TEXT_PLAY_PREFERENCES_KEY, TEXT_PLAY_PREFERENCES_KEY, loadTextPlayPreferences, saveTextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 환경 설정 도구

function PreferencesProbe() // 설정 확인 요소
{ // 함수 시작
    const { preferences, updatePreferences } = useTextPlayPreferences(); // 설정 문맥 조회
    return createElement("button", { type: "button", onClick: () => updatePreferences({ themeId: "classic-novel" }) }, preferences.themeId); // 설정 변경 버튼
} // 함수 종료

describe("Text-Play 환경 설정", () => // 환경 설정 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        window.localStorage.clear(); // 저장소 초기화
    }); // 초기화 종료

    it("저장 값이 없으면 안전한 기본값을 사용한다", () => // 기본값 검증
    { // 테스트 시작
        expect(loadTextPlayPreferences(window.localStorage)).toEqual(DEFAULT_TEXT_PLAY_PREFERENCES); // 기본값 확인
    }); // 테스트 종료

    it("손상된 환경 설정을 안전한 기본값으로 복구한다", () => // 손상 복구 검증
    { // 테스트 시작
        window.localStorage.setItem(TEXT_PLAY_PREFERENCES_KEY, "broken"); // 손상 값 저장
        expect(loadTextPlayPreferences(window.localStorage)).toEqual(DEFAULT_TEXT_PLAY_PREFERENCES); // 복구값 확인
    }); // 테스트 종료

    it("선택한 테마와 해상도와 올라마 모델을 저장하고 다시 불러온다", () => // 영속성 검증
    { // 테스트 시작
        const preferences = { schemaVersion: 2 as const, themeId: "sci-fi" as const, resolutionId: "1600x900" as const, aiProviderId: "ollama" as const, localModelId: "qwen3:8b" }; // 선택 설정
        saveTextPlayPreferences(window.localStorage, preferences); // 설정 저장
        expect(loadTextPlayPreferences(window.localStorage)).toEqual(preferences); // 저장값 확인
    }); // 테스트 종료

    it("버전 1 설정의 화면 선택을 보존하며 버전 2로 이전한다", () => // 이전 검증
    { // 테스트 시작
        window.localStorage.setItem(LEGACY_TEXT_PLAY_PREFERENCES_KEY, JSON.stringify({ schemaVersion: 1, themeId: "classic-novel", resolutionId: "1280x720", aiProviderId: "mock" })); // 예전 설정 저장
        expect(loadTextPlayPreferences(window.localStorage)).toEqual({ schemaVersion: 2, themeId: "classic-novel", resolutionId: "1280x720", aiProviderId: "mock", localModelId: null }); // 이전 결과 확인
    }); // 테스트 종료

    it("알 수 없는 설정값은 안전한 기본값으로 복구한다", () => // 값 검증
    { // 테스트 시작
        window.localStorage.setItem(TEXT_PLAY_PREFERENCES_KEY, JSON.stringify({ schemaVersion: 2, themeId: "unknown", resolutionId: "fit", aiProviderId: "mock", localModelId: null })); // 잘못된 값 저장
        expect(loadTextPlayPreferences(window.localStorage)).toEqual(DEFAULT_TEXT_PLAY_PREFERENCES); // 복구값 확인
    }); // 테스트 종료

    it("모델 없는 올라마 선택을 안전한 기본값으로 복구한다", () => // AI 값 검증
    { // 테스트 시작
        window.localStorage.setItem(TEXT_PLAY_PREFERENCES_KEY, JSON.stringify({ schemaVersion: 2, themeId: "sci-fi", resolutionId: "1600x900", aiProviderId: "ollama", localModelId: null })); // 불완전 AI 저장
        expect(loadTextPlayPreferences(window.localStorage)).toEqual(DEFAULT_TEXT_PLAY_PREFERENCES); // 기본값 복구 확인
    }); // 테스트 종료

    it("브라우저 전역 없이 서버에서 안전하게 렌더한다", () => // 서버 렌더 검증
    { // 테스트 시작
        const browserWindow = globalThis.window; // 브라우저 전역 보관
        vi.stubGlobal("window", undefined); // 브라우저 전역 제거
        try // 서버 렌더 시도
        { // 시도 시작
            expect(() => renderToString(createElement(TextPlayPreferencesProvider, null, createElement("span", null, "서버 화면")))).not.toThrow(); // 서버 렌더 확인
        } // 시도 종료
        finally // 전역 복구
        { // 정리 시작
            vi.stubGlobal("window", browserWindow); // 브라우저 전역 복원
        } // 정리 종료
    }); // 테스트 종료

    it("공급자에서 변경한 설정을 화면과 저장소에 함께 반영한다", async () => // 문맥 변경 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        render(createElement(TextPlayPreferencesProvider, null, createElement(PreferencesProbe))); // 설정 공급자 렌더
        await user.click(screen.getByRole("button", { name: "dark-fantasy" })); // 테마 변경 실행
        expect(screen.getByRole("button", { name: "classic-novel" })).toBeInTheDocument(); // 화면 변경 확인
        expect(loadTextPlayPreferences(window.localStorage).themeId).toBe("classic-novel"); // 저장 변경 확인
    }); // 테스트 종료
}); // 묶음 종료
