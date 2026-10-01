import { describe, expect, it } from "vitest"; // 테스트 도구
import { describeHardware, describeRuntime, formatProgress, toModelErrorMessage } from "@/desktop/ai-models/ai-model-view"; // AI 모델 표시 도구
import { createDesktopLLMSelection } from "@/desktop/desktop-llm"; // 데스크톱 AI 생성기
import { getDesktopRouteTitle } from "@/desktop/router/desktop-routes"; // 화면 제목
import { formatTextPlaySaveSummary, getTextPlaySlotLabel, getTextPlayWorkTitle } from "@/features/text-play/ui/text-play-save-summary"; // 저장 요약 도구
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

const GIB = 1_073_741_824; // 1GiB

describe("데스크톱 영어 글자", () => // 영어 글자 묶음
{ // 묶음 시작
    it("상단 바 화면 제목을 영어로 만든다", () => // 화면 제목 검증
    { // 테스트 시작
        expect(getDesktopRouteTitle({ kind: "chat", characterId: "rian", conversationId: undefined, versionId: undefined }, "en")).toBe("Chat"); // 대화 제목
        expect(getDesktopRouteTitle({ kind: "settings", section: "privacy" }, "en")).toBe("Settings · Privacy and security"); // 설정 제목
        expect(getDesktopRouteTitle({ kind: "ai-models" }, "en")).toBe("AI models"); // AI 모델 제목
        expect(getDesktopRouteTitle({ kind: "ai-models" })).toBe("AI 모델"); // 기본은 한국어
    }); // 테스트 종료

    it("AI 연결 이름을 고른 언어로 만든다", () => // AI 이름 검증
    { // 테스트 시작
        expect(createDesktopLLMSelection({ schemaVersion: 2, themeId: "dark-fantasy", resolutionId: "fit", aiProviderId: "mock", localModelId: null, language: "en" }).label).toBe("Temporary AI"); // 임시 AI
    }); // 테스트 종료

    it("AI 모델 화면의 사양·엔진·진행률·취소 안내를 영어로 만든다", () => // AI 모델 글자 검증
    { // 테스트 시작
        expect(describeHardware({ gpuName: "RTX", vramBytes: 16 * GIB, ramBytes: 32 * GIB }, 100 * GIB, "en")).toBe("RTX · 16.0GB graphics memory · RAM 32.0GB · 100.0GB free"); // 사양
        expect(describeRuntime({ state: "ready", backend: "vulkan", message: null }, "en")).toBe("On · running on graphics (Vulkan)"); // 엔진 켜짐
        expect(formatProgress(GIB, 2 * GIB, 0, "en").text).toBe("1.0GB / 2.0GB · measuring speed"); // 진행률
        expect(toModelErrorMessage(new Error("DOWNLOAD_CANCELLED: 다운로드를 취소했습니다."), "en")).toBe("Download cancelled. Press again to resume."); // 취소
    }); // 테스트 종료

    it("Text-Play 저장 기록 요약을 영어로 만든다", () => // 저장 요약 검증
    { // 테스트 시작
        const game = { ...createPreparedTextPlaySessionState().game, playTimeSeconds: 75 }; // 1분 15초 플레이
        const slot = { key: "k", slotId: "auto" as const, packageId: game.packageId, summary: "forest-gate", state: game, savedAt: "2026-10-01T00:00:00.000Z" }; // 자동 저장 슬롯
        expect(getTextPlayWorkTitle(game.packageId, "en")).toBe("Moonlit Forest Records"); // 작품 제목
        expect(getTextPlaySlotLabel("manual-2", "en")).toBe("Manual save 2"); // 슬롯 이름
        expect(formatTextPlaySaveSummary(slot, "en")).toBe("Moonlit Forest Gate · 1m 15s"); // 장면·시간 요약
    }); // 테스트 종료
}); // 묶음 종료
