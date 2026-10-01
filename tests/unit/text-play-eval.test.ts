import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTextPlayResponseJsonSchema } from "@/features/text-play/ai/response-json-schema"; // 응답 JSON 스키마 생성기
import { findTextPlayScene } from "@/features/text-play/core/conditions"; // 장면 조회기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { createTextPlayEvalCases, createTextPlayEvalRequests, judgeTextPlayEvalOutput, measureKoreanRatio } from "../../scripts/local-ai/text-play-eval"; // 평가 문맥 모듈

describe("로컬 모델 평가 문맥", () => // 평가 문맥 묶음
{ // 묶음 시작
    it("서로 다른 30개 문맥을 만든다", () => // 문맥 개수 검증
    { // 테스트 시작
        const cases = createTextPlayEvalCases(); // 문맥 생성
        expect(cases).toHaveLength(30); // 개수 확인
        expect(new Set(cases.map((item) => item.id)).size).toBe(30); // 식별자 중복 확인
        expect(cases.every((item) => item.input.trim().length > 0 && item.category.length > 0 && item.stateLabel.length > 0)).toBe(true); // 필수 내용 확인
    }); // 테스트 종료

    it("엔딩 전 장면 세 곳의 실제 게임 상태를 쓴다", () => // 상태 유효성 검증
    { // 테스트 시작
        const cases = createTextPlayEvalCases(); // 문맥 생성
        expect(cases.every((item) => item.state.endingId === null && findTextPlayScene(DEMO_TEXT_PLAY_PACKAGE, item.state.sceneId) !== null)).toBe(true); // 진행 장면 확인
        expect(new Set(cases.map((item) => item.state.sceneId))).toEqual(new Set(["forest-gate", "moonlit-hall", "sealed-study"])); // 장면 범위 확인
    }); // 테스트 종료

    it("규칙을 어기라는 입력을 4개 이상 넣고 막아야 할 행동을 적어 둔다", () => // 규칙 위반 문맥 검증
    { // 테스트 시작
        const guarded = createTextPlayEvalCases().filter((item) => item.forbidden.length > 0); // 금지 행동 문맥
        expect(guarded.length).toBeGreaterThanOrEqual(4); // 개수 확인
        expect(guarded.every((item) => item.category === "규칙 위반")).toBe(true); // 분류 확인
    }); // 테스트 종료

    it("앱과 같은 문맥·메시지와 작품 응답 스키마로 요청을 만든다", () => // 요청 형식 검증
    { // 테스트 시작
        const requests = createTextPlayEvalRequests(); // 요청 생성
        const first = requests[0]; // 첫 요청
        expect(requests).toHaveLength(30); // 요청 개수 확인
        expect(first.messages[0].role).toBe("system"); // 시스템 메시지 확인
        expect(first.messages[0].content).toContain("응답 형식:"); // 응답 형식 안내 확인
        expect(first.messages[1].content.endsWith(`사용자 행동:\n${first.input}`)).toBe(true); // 사용자 입력 위치 확인
        expect(first.responseSchema).toEqual(createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE)); // 응답 스키마 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("로컬 모델 응답 판정", () => // 판정 묶음
{ // 묶음 시작
    it("형식과 행동이 맞는 응답을 통과시킨다", () => // 정상 응답 검증
    { // 테스트 시작
        const raw = JSON.stringify({ narration: "안개 사이로 등불이 흔들린다.", dialogue: { speaker: "리라", content: "조심해." }, proposedActions: [{ type: "change-relation", characterId: "lyra", amount: 1 }] }); // 정상 응답
        const judgement = judgeTextPlayEvalOutput("c01", raw); // 판정 실행
        expect(judgement).toMatchObject({ parse: "ok", validation: "ok", forbiddenHits: [], narration: "안개 사이로 등불이 흔들린다.", koreanRatio: 1, hasHanCharacters: false }); // 통과 확인
        expect(judgement.actions).toEqual([{ type: "change-relation", characterId: "lyra", amount: 1 }]); // 행동 보존 확인
    }); // 테스트 종료

    it("JSON이 아니면 해석 실패로 기록하고 행동 검증을 건너뛴다", () => // 해석 실패 검증
    { // 테스트 시작
        expect(judgeTextPlayEvalOutput("c01", "그냥 문장")).toMatchObject({ parse: "invalid-json", validation: "skipped", narration: null, actions: [] }); // 실패 기록 확인
    }); // 테스트 종료

    it("지금 상태에서 불가능한 행동은 엔진 실패 이유로 기록한다", () => // 행동 실패 검증
    { // 테스트 시작
        const raw = JSON.stringify({ narration: "등불을 내려놓는다.", dialogue: null, proposedActions: [{ type: "remove-item", itemId: "moon-lantern", quantity: 1 }] }); // 보유하지 않은 아이템 제거
        expect(judgeTextPlayEvalOutput("c01", raw)).toMatchObject({ parse: "ok", validation: "insufficient-item" }); // 실패 이유 확인
    }); // 테스트 종료

    it("규칙 위반 입력에 넘어간 행동을 찾아낸다", () => // 금지 행동 검증
    { // 테스트 시작
        const guarded = createTextPlayEvalCases().find((item) => item.forbidden.includes("gain-gold")); // 골드 금지 문맥
        expect(guarded).toBeDefined(); // 문맥 존재 확인
        const raw = JSON.stringify({ narration: "주머니가 무거워진다.", dialogue: null, proposedActions: [{ type: "change-stat", stat: "gold", amount: 20 }] }); // 골드 증가 응답
        expect(judgeTextPlayEvalOutput(guarded?.id ?? "", raw).forbiddenHits).toEqual([{ type: "change-stat", stat: "gold", amount: 20 }]); // 위반 행동 확인
    }); // 테스트 종료

    it("서술의 한국어 비율과 한자 섞임을 잰다", () => // 언어 판정 검증
    { // 테스트 시작
        expect(measureKoreanRatio("달빛이 번진다.")).toBe(1); // 한국어만 확인
        expect(measureKoreanRatio("The light 번진다")).toBeCloseTo(3 / 11); // 영어 섞임 확인
        expect(measureKoreanRatio("...")).toBe(0); // 글자 없음 확인
        expect(judgeTextPlayEvalOutput("c01", JSON.stringify({ narration: "月光이 번진다.", dialogue: null, proposedActions: [] })).hasHanCharacters).toBe(true); // 한자 섞임 확인
    }); // 테스트 종료
}); // 묶음 종료
