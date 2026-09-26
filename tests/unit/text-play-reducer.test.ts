import { describe, expect, it } from "vitest"; // 테스트 도구
import { textPlayReducer } from "@/features/text-play/session/text-play-reducer"; // 세션 리듀서
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

describe("Text-Play 세션 리듀서", () => // 리듀서 검증 묶음
{ // 묶음 시작
    it("AI 실패 뒤 확정된 게임 상태를 유지한다", () => // 실패 원자성 검증
    { // 테스트 시작
        const preparedSessionState = createPreparedTextPlaySessionState(); // 준비 상태 생성
        const next = textPlayReducer(preparedSessionState, { type: "ai-failed", message: "응답을 해석하지 못했습니다." }); // 실패 동작 적용
        expect(next.game).toEqual(preparedSessionState.game); // 게임 상태 유지 확인
        expect(next.pendingInput).toBe(preparedSessionState.pendingInput); // 입력 유지 확인
        expect(next.error).toBe("응답을 해석하지 못했습니다."); // 오류 표시 확인
    }); // 테스트 종료

    it("스트리밍 조각을 누적하고 완료 상태로 전환한다", () => // 스트리밍 검증
    { // 테스트 시작
        const preparedSessionState = createPreparedTextPlaySessionState(); // 준비 상태 생성
        const streaming = textPlayReducer(preparedSessionState, { type: "ai-started", input: "문양을 읽는다" }); // 스트리밍 시작
        const chunked = textPlayReducer(streaming, { type: "ai-chunk", chunk: "달빛" }); // 조각 반영
        expect(chunked.streamedText).toBe("달빛"); // 조각 누적 확인
        expect(chunked.isStreaming).toBe(true); // 스트리밍 상태 확인
    }); // 테스트 종료
}); // 묶음 종료
