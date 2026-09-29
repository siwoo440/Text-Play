import { createTextPlayState } from "@/features/text-play/core/engine"; // 상태 생성기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import type { TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import type { TextPlaySessionState } from "@/features/text-play/session/text-play-reducer"; // 세션 상태 계약

export const TEST_TEXT_PLAY_PLATFORM: TextPlayPlatform = // 테스트 플랫폼
{ // 객체 시작
    navigate: () => undefined, // 이동 생략
    renderSceneImage: (source) => source, // 이미지 경로 출력
}; // 객체 종료

export function createPreparedTextPlaySessionState(): TextPlaySessionState // 준비된 세션 생성
{ // 함수 시작
    return { // 세션 반환
        game: createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-26T00:00:00.000Z"), // 초기 게임 상태
        streamedText: "", // 빈 스트리밍 내용
        pendingInput: "", // 빈 입력 내용
        isStreaming: false, // 스트리밍 중지
        error: null, // 오류 없음
        saveNotice: null, // 저장 안내 없음
        isStatePanelOpen: false, // 상태 패널 닫힘
    }; // 세션 종료
} // 함수 종료
