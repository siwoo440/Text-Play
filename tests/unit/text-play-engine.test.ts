import { describe, expect, it } from "vitest"; // 테스트 도구
import { applyTextPlayActions, createTextPlayState, getAvailableChoices, selectTextPlayChoice } from "@/features/text-play/core/engine"; // 엔진 함수
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

describe("Text-Play Engine", () => // 엔진 검증 묶음
{ // 묶음 시작
    it("초기 상태를 패키지 선언과 같은 값으로 만든다", () => // 초기 상태 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        expect(initial.sceneId).toBe("forest-gate"); // 시작 장면 확인
        expect(initial.locationId).toBe("forest-gate"); // 시작 위치 확인
        expect(initial.stats).toEqual({ hp: 100, sanity: 80, gold: 10 }); // 초기 능력치 확인
        expect(initial.inventory).toEqual({}); // 빈 인벤토리 확인
        expect(initial.activeQuestIds).toEqual([]); // 빈 진행 퀘스트 확인
        expect(initial.endingId).toBeNull(); // 진행 상태 확인
    }); // 테스트 종료

    it("등불 선택 뒤 장면과 인벤토리를 함께 갱신한다", () => // 선택 처리 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, initial, "take-lantern", "2026-09-25T00:01:00.000Z"); // 선택 적용
        expect(result.ok).toBe(true); // 성공 확인
        expect(result.state.sceneId).toBe("moonlit-hall"); // 장면 이동 확인
        expect(result.state.inventory["moon-lantern"]).toBe(1); // 등불 획득 확인
        expect(result.state.playTimeSeconds).toBe(60); // 플레이 시간 누적 확인
        expect(result.state.updatedAt).toBe("2026-09-25T00:01:00.000Z"); // 갱신 시각 확인
    }); // 테스트 종료

    it("존재하지 않는 아이템 액션은 전체 상태를 유지한다", () => // 잘못된 액션 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = applyTextPlayActions(DEMO_TEXT_PLAY_PACKAGE, initial, [{ type: "add-item", itemId: "missing", quantity: 1 }], "2026-09-25T00:01:00.000Z"); // 잘못된 액션 적용
        expect(result).toEqual({ ok: false, reason: "unknown-item", state: initial }); // 원자적 거부 확인
    }); // 테스트 종료

    it("능력치 범위를 넘는 액션을 보정하지 않고 거부한다", () => // 범위 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = applyTextPlayActions(DEMO_TEXT_PLAY_PACKAGE, initial, [{ type: "change-stat", stat: "hp", amount: 1 }], "2026-09-25T00:01:00.000Z"); // 범위 초과 액션 적용
        expect(result).toEqual({ ok: false, reason: "stat-out-of-range", state: initial }); // 범위 거부 확인
    }); // 테스트 종료

    it("현재 장면에 없는 선택지를 거부한다", () => // 선택지 범위 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, initial, "decode-records", "2026-09-25T00:01:00.000Z"); // 다른 장면 선택 적용
        expect(result).toEqual({ ok: false, reason: "unknown-choice", state: initial }); // 선택 거부 확인
    }); // 테스트 종료

    it("선택지 경로를 따라 퀘스트를 완료하고 정상 엔딩에 도달한다", () => // 전체 경로 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const lantern = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, initial, "take-lantern", "2026-09-25T00:01:00.000Z"); // 등불 선택
        const study = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, lantern.state, "enter-study", "2026-09-25T00:02:00.000Z"); // 서재 선택
        const ending = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, study.state, "decode-records", "2026-09-25T00:03:00.000Z"); // 기록 해독
        expect(study.state.activeQuestIds).toEqual(["voices-below"]); // 진행 퀘스트 확인
        expect(ending.ok).toBe(true); // 엔딩 처리 성공 확인
        expect(ending.state.sceneId).toBe("truth-ending"); // 엔딩 장면 확인
        expect(ending.state.endingId).toBe("truth-ending"); // 엔딩 상태 확인
        expect(ending.state.activeQuestIds).toEqual([]); // 진행 퀘스트 제거 확인
        expect(ending.state.completedQuestIds).toEqual(["voices-below"]); // 완료 퀘스트 확인
        expect(ending.state.eventFlags["truth-revealed"]).toBe(true); // 이벤트 완료 확인
    }); // 테스트 종료

    it("현재 장면의 선택지만 반환한다", () => // 선택지 조회 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        expect(getAvailableChoices(DEMO_TEXT_PLAY_PACKAGE, initial).map((choice) => choice.id)).toEqual(["take-lantern", "retreat"]); // 시작 선택지 확인
    }); // 테스트 종료
}); // 묶음 종료
