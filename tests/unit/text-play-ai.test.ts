import { describe, expect, it } from "vitest"; // 테스트 도구
import { validateProposedActions } from "@/features/text-play/ai/action-validator"; // 액션 검증기
import { buildTextPlayContext } from "@/features/text-play/ai/context-builder"; // 문맥 생성기
import { createTextPlayResponseJsonSchema } from "@/features/text-play/ai/response-json-schema"; // 응답 JSON 스키마 생성기
import { parseTextPlayResponse } from "@/features/text-play/ai/response-schema"; // 응답 파서
import { createTextPlayState } from "@/features/text-play/core/engine"; // 상태 생성기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

describe("Text-Play AI 응답", () => // 응답 검증 묶음
{ // 묶음 시작
    it("잘못된 JSON을 거부한다", () => // JSON 오류 검증
    { // 테스트 시작
        expect(parseTextPlayResponse("not-json")).toEqual({ ok: false, reason: "invalid-json" }); // JSON 거부 확인
    }); // 테스트 종료

    it("허용되지 않은 액션을 거부한다", () => // 액션 허용 목록 검증
    { // 테스트 시작
        const raw = JSON.stringify({ narration: "문이 열린다.", dialogue: null, proposedActions: [{ type: "run-code", command: "x" }] }); // 악성 응답 생성
        expect(parseTextPlayResponse(raw)).toEqual({ ok: false, reason: "invalid-action" }); // 액션 거부 확인
    }); // 테스트 종료

    it("정해진 응답 필드 외의 값을 거부한다", () => // 추가 필드 검증
    { // 테스트 시작
        const raw = JSON.stringify({ narration: "문이 열린다.", dialogue: null, proposedActions: [], hiddenCommand: "x" }); // 추가 필드 응답 생성
        expect(parseTextPlayResponse(raw)).toEqual({ ok: false, reason: "invalid-schema" }); // 스키마 거부 확인
    }); // 테스트 종료

    it("범위를 벗어난 제안 액션을 상태 변경 없이 거부한다", () => // 능력치 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = validateProposedActions(DEMO_TEXT_PLAY_PACKAGE, state, [{ type: "change-stat", stat: "hp", amount: 1 }]); // 범위 초과 검증
        expect(result).toEqual({ ok: false, reason: "stat-out-of-range" }); // 액션 거부 확인
        expect(state.stats.hp).toBe(100); // 원본 상태 확인
    }); // 테스트 종료

    it("현재 상태와 허용 대상만 구조화 문맥에 포함한다", () => // 문맥 최소화 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const context = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "리라에게 말을 건다"); // 구조화 문맥 생성
        const decoded = JSON.parse(context.context) as Record<string, unknown>; // 문맥 해석
        expect(decoded).toMatchObject({ sceneId: "forest-gate", stats: { hp: 100, sanity: 80, gold: 10 }, allowedCharacterIds: ["lyra"] }); // 필수 문맥 확인
        expect(decoded).not.toHaveProperty("log"); // 전체 기록 제외 확인
        expect(context.userInput).toBe("리라에게 말을 건다"); // 사용자 입력 확인
    }); // 테스트 종료

    it("형식을 강제할 수 있는 AI를 위해 작품 응답 JSON 스키마를 함께 담는다", () => // 스키마 동봉 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const context = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "주변을 본다"); // 구조화 문맥 생성
        expect(context.jsonSchema).toEqual(createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE)); // 스키마 확인
    }); // 테스트 종료
}); // 묶음 종료
