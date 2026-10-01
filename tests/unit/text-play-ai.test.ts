import { describe, expect, it } from "vitest"; // 테스트 도구
import { selectApplicableActions, validateProposedActions } from "@/features/text-play/ai/action-validator"; // 액션 검증기
import { buildTextPlayContext } from "@/features/text-play/ai/context-builder"; // 문맥 생성기
import { createTextPlayResponseJsonSchema } from "@/features/text-play/ai/response-json-schema"; // 응답 JSON 스키마 생성기
import { parseTextPlayResponse } from "@/features/text-play/ai/response-schema"; // 응답 파서
import { createTextPlayState } from "@/features/text-play/core/engine"; // 상태 생성기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지
import { localizeTextPlayPackage } from "@/features/text-play/data/localize-package"; // 작품 언어판

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

    it("이야기꾼 역할과 한국어·되풀이 금지·지어내기 금지·행동 범위 규칙을 시스템 규칙에 담는다", () => // 시스템 규칙 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const { system } = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "리라에게 말을 건다"); // 구조화 문맥 생성
        expect(system).toContain("「달빛 숲의 기록」의 이야기꾼"); // 역할 확인
        expect(system).toContain("한국어로만"); // 언어 규칙 확인
        expect(system).toContain("되풀이하지 않는다"); // 되풀이 금지 확인
        expect(system).toContain("지어내지 않는다"); // 지어내기 금지 확인
        expect(system).toContain("장소 이동, 퀘스트, 사건, 엔딩은 선택지로만"); // 행동 범위 확인
        expect(system).toContain("응답 예시"); // 짧은 예시 확인
        expect(system).toContain("받을 수 없는 요구"); // 규칙 위반 대응 예시 확인
    }); // 테스트 종료

    it("장면 서술·인물 이름과 소개·쉬운 말 상태·선택지·최근 기록을 문맥으로 준다", () => // 문맥 내용 검증
    { // 테스트 시작
        const start = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const state = { ...start, inventory: { "moon-lantern": 1 }, relations: { lyra: 5 }, log: [...start.log, { id: "log-1", kind: "system" as const, speaker: null, content: "주변을 본다", createdAt: start.updatedAt }, { id: "log-2", kind: "dialogue" as const, speaker: "lyra", content: "조심해요.", createdAt: start.updatedAt }] }; // 진행 상태
        const { context, userInput } = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "리라에게 말을 건다"); // 구조화 문맥 생성
        expect(context).toContain("현재 장면: 달빛 숲 입구 — 은빛 안개 너머에서 낡은 등불이 희미하게 빛난다."); // 장면 확인
        expect(context).toContain("리라:"); // 인물 이름 확인
        expect(context).toContain("체력 100/100, 정신력 80/100, 골드 10"); // 능력치 확인
        expect(context).toContain("가진 물건: 달빛 등불 1개"); // 물건 확인
        expect(context).toContain("리라와의 관계: 5"); // 관계 확인
        expect(context).toContain("이 장면의 선택지: 달빛 등불을 든다 / 숲 밖으로 후퇴한다"); // 선택지 확인
        expect(context).toContain("플레이어 행동: 주변을 본다"); // 최근 행동 확인
        expect(context).toContain("리라: 조심해요."); // 최근 대사 표시 이름 확인
        expect(context).not.toContain("forest-gate"); // 내부 식별자 미노출 확인
        expect(userInput).toBe("리라에게 말을 건다"); // 사용자 입력 확인
    }); // 테스트 종료

    it("최근 기록은 마지막 6개만 넣는다", () => // 기록 개수 검증
    { // 테스트 시작
        const start = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const log = Array.from({ length: 10 }, (_, index) => ({ id: `log-${index}`, kind: "narration" as const, speaker: null, content: `서술 ${index}`, createdAt: start.updatedAt })); // 긴 기록
        const { context } = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, { ...start, log }, "본다"); // 구조화 문맥 생성
        expect(context).not.toContain("서술 3"); // 오래된 기록 제외 확인
        expect(context).toContain("서술 4"); // 최근 6개 시작 확인
        expect(context).toContain("서술 9"); // 마지막 기록 확인
    }); // 테스트 종료

    it("AI가 제안할 수 없는 행동과 너무 큰 변화는 빼고 나머지만 순서대로 적용 대상으로 고른다", () => // 부분 적용 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = selectApplicableActions(DEMO_TEXT_PLAY_PACKAGE, state, // 제안 행동 고르기
        [ // 제안 목록 시작
            { type: "change-relation", characterId: "lyra", amount: 2 }, // 적용 가능
            { type: "complete-quest", questId: "voices-below" }, // 선택지 전용
            { type: "remove-item", itemId: "moon-lantern", quantity: 1 }, // 가진 적 없음
            { type: "change-stat", stat: "gold", amount: 500 }, // 너무 큰 변화
            { type: "change-stat", stat: "sanity", amount: -5 }, // 적용 가능
        ]); // 제안 목록 종료
        expect(result.accepted).toEqual([{ type: "change-relation", characterId: "lyra", amount: 2 }, { type: "change-stat", stat: "sanity", amount: -5 }]); // 적용 행동 확인
        expect(result.rejected.map((item) => item.reason)).toEqual(["choice-only", "insufficient-item", "too-large"]); // 거부 이유 확인
        expect(state.stats.sanity).toBe(80); // 원본 상태 유지 확인
    }); // 테스트 종료

    it("형식을 강제할 수 있는 AI를 위해 작품 응답 JSON 스키마를 함께 담는다", () => // 스키마 동봉 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const context = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "주변을 본다"); // 구조화 문맥 생성
        expect(context.jsonSchema).toEqual(createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE)); // 스키마 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("Text-Play AI 영어 답변", () => // 영어 답변 묶음
{ // 묶음 시작
    it("샘플 작품의 모든 장면·선택지·엔딩·용어에 영어판이 있다", () => // 영어판 범위 검증
    { // 테스트 시작
        const english = localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, "en"); // 영어판
        expect(english.title).toBe("Moonlit Forest Records"); // 제목 확인
        const hangul = /[가-힣]/u; // 한글 판정
        const texts = [english.title, english.description, ...english.scenes.flatMap((scene) => [scene.title, scene.narration, ...scene.choices.map((choice) => choice.label)]), ...english.endings.flatMap((ending) => [ending.title, ending.summary]), ...Object.values(english.glossary?.characters ?? {}).flatMap((character) => [character.name, character.description]), ...Object.values(english.glossary?.items ?? {}), ...Object.values(english.glossary?.locations ?? {}), ...Object.values(english.glossary?.quests ?? {}), ...Object.values(english.glossary?.events ?? {})]; // 모든 글
        expect(texts.filter((text) => hangul.test(text))).toEqual([]); // 한글 남은 글 없음 확인
        expect(english.scenes.map((scene) => scene.id)).toEqual(DEMO_TEXT_PLAY_PACKAGE.scenes.map((scene) => scene.id)); // 구조 유지 확인
        expect(localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, "ko")).toBe(DEMO_TEXT_PLAY_PACKAGE); // 한국어는 원문 그대로
    }); // 테스트 종료

    it("English를 고르면 영어 이야기꾼 규칙·영어 문맥·영어 발화자 이름으로 요청한다", () => // 영어 문맥 검증
    { // 테스트 시작
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태(첫 서술은 한국어 기록)
        const input = buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "Look around", "en"); // 영어 문맥
        expect(input.language).toBe("en"); // 언어 전달 확인
        expect(input.system).toContain("storyteller of the text adventure \"Moonlit Forest Records\""); // 영어 역할 확인
        expect(input.system).toContain("only in English"); // 영어 규칙 확인
        expect(input.context).toContain("Current scene: Moonlit Forest Gate"); // 영어 장면 확인
        expect(input.context).toContain("HP 100/100, Sanity 80/100, Gold 10"); // 영어 능력치 확인
        expect(input.context).toContain("Choices in this scene: Take the moon lantern / Retreat out of the forest"); // 영어 선택지 확인
        expect(input.context).not.toMatch(/[가-힣]/u); // 한국어 기록까지 영어로 바뀜 확인
        const dialogue = ((input.jsonSchema?.properties as Record<string, Record<string, unknown>>).dialogue.anyOf as Record<string, unknown>[])[1]; // 대사 스키마
        expect((dialogue.properties as Record<string, unknown>).speaker).toEqual({ type: "string", enum: ["Lyra"] }); // 영어 발화자 확인
        expect(buildTextPlayContext(DEMO_TEXT_PLAY_PACKAGE, state, "본다").language).toBe("ko"); // 기본 한국어 확인
    }); // 테스트 종료
}); // 묶음 종료
