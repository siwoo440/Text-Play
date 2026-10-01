import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { loadTextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 설정 읽기
import { TextPlaySettingsDialog } from "@/features/text-play/ui/TextPlaySettingsDialog"; // 설정 대화상자
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약

function createLocalAIClient(): OllamaClient // 로컬 통신기 생성기
{ // 함수 시작
    return { // 통신기 반환
        listModels: async () => [{ name: "qwen3:8b", size: 5_000_000_000, modifiedAt: "2026-09-29T00:00:00Z" }], // 설치 모델 반환
        listRunningModels: async () => [{ name: "qwen3:8b", sizeVram: 4_294_967_296, contextLength: 8_192 }], // 실행 모델 반환
        streamChat: async function* () // 대화 스트림 대역
        { // 함수 시작
            yield ""; // 빈 조각 반환
        }, // 함수 종료
    }; // 통신기 종료
} // 함수 종료

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

    it("해상도와 설치된 로컬 모델을 검색하고 올라마 공급자로 저장한다", async () => // 화면 설정 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        const applyWindowResolution = vi.fn(async () => undefined); // 해상도 적용 기록
        const platform: TextPlayPlatform = { applyWindowResolution, navigate: vi.fn(), renderSceneImage: () => null, localAI: createLocalAIClient() }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlaySettingsDialog open onClose={vi.fn()} /></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 설정 화면 렌더
        await user.selectOptions(screen.getByLabelText("창 해상도"), "1600x900"); // 해상도 선택
        expect(loadTextPlayPreferences(window.localStorage).resolutionId).toBe("1600x900"); // 해상도 저장 확인
        expect(applyWindowResolution).toHaveBeenCalledWith("1600x900"); // 창 적용 확인
        await user.click(screen.getByRole("button", { name: "설치 모델 검색" })); // 모델 검색 실행
        await user.selectOptions(await screen.findByLabelText("로컬 모델"), "qwen3:8b"); // 로컬 모델 선택
        await user.selectOptions(screen.getByLabelText("사용할 챗봇"), "ollama"); // 올라마 공급자 선택
        expect(loadTextPlayPreferences(window.localStorage)).toMatchObject({ aiProviderId: "ollama", localModelId: "qwen3:8b" }); // 로컬 선택 저장 확인
        expect(screen.getByText("그래픽 메모리 4.0GB 사용 중")).toBeInTheDocument(); // 그래픽 메모리 상태 확인
    }); // 테스트 종료

    it("웹 플랫폼에서는 로컬 모델 검색을 제공하지 않는다", () => // 웹 제한 검증
    { // 테스트 시작
        const platform: TextPlayPlatform = { applyWindowResolution: async () => undefined, navigate: vi.fn(), renderSceneImage: () => null }; // 웹 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlaySettingsDialog open onClose={vi.fn()} /></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 설정 화면 렌더
        expect(screen.getByText("로컬 모델은 Windows 실행 프로그램에서 사용할 수 있습니다.")).toBeInTheDocument(); // 플랫폼 제한 안내 확인
        expect(screen.queryByRole("button", { name: "설치 모델 검색" })).not.toBeInTheDocument(); // 검색 버튼 부재 확인
        expect(screen.getByRole("option", { name: "내장 AI(이 PC)" })).toBeDisabled(); // 웹에서 내장 AI 막힘 확인
    }); // 테스트 종료

    it("Windows 실행 프로그램에서는 모델 선택 없이 내장 AI를 고를 수 있다", async () => // 내장 AI 선택 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        const platform: TextPlayPlatform = { applyWindowResolution: async () => undefined, navigate: vi.fn(), renderSceneImage: () => null, localAI: createLocalAIClient() }; // 데스크톱 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlaySettingsDialog open onClose={vi.fn()} /></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 설정 화면 렌더
        await user.selectOptions(screen.getByLabelText("사용할 챗봇"), "bundled"); // 내장 AI 선택
        expect(loadTextPlayPreferences(window.localStorage)).toMatchObject({ aiProviderId: "bundled", localModelId: null }); // 내장 AI 저장 확인
    }); // 테스트 종료
}); // 묶음 종료
