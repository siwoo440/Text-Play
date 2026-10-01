import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTextPlayResponseJsonSchema } from "@/features/text-play/ai/response-json-schema"; // 응답 JSON 스키마 생성기
import type { TextPlayPackage } from "@/features/text-play/core/types"; // 패키지 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

type SchemaNode = Record<string, unknown>; // 스키마 노드 형태

function getActionSchemas(schema: SchemaNode): SchemaNode[] // 액션 스키마 목록 추출
{ // 함수 시작
    const properties = schema.properties as Record<string, SchemaNode>; // 최상위 필드
    const items = properties.proposedActions.items as SchemaNode; // 액션 항목
    return items.anyOf as SchemaNode[]; // 액션 후보 반환
} // 함수 종료

function findActionSchema(schema: SchemaNode, type: string): SchemaNode | undefined // 액션 종류별 스키마 조회
{ // 함수 시작
    return getActionSchemas(schema).find((candidate) => ((candidate.properties as Record<string, SchemaNode>).type.const === type)); // 종류 일치 스키마 반환
} // 함수 종료

describe("Text-Play 응답 JSON 스키마", () => // 스키마 묶음
{ // 묶음 시작
    it("응답 세 필드만 필수로 두고 다른 필드를 막는다", () => // 최상위 구조 검증
    { // 테스트 시작
        const schema = createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE); // 스키마 생성
        expect(schema.type).toBe("object"); // 객체 형식 확인
        expect(schema.required).toEqual(["narration", "dialogue", "proposedActions"]); // 필수 필드 순서 확인
        expect(schema.additionalProperties).toBe(false); // 추가 필드 차단 확인
        expect(Object.keys(schema.properties as SchemaNode)).toEqual(["narration", "dialogue", "proposedActions"]); // 생성 순서 확인
    }); // 테스트 종료

    it("대사 발화자는 작품 등장인물의 표시 이름으로만 고를 수 있다", () => // 발화자 제한 검증
    { // 테스트 시작
        const properties = createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE).properties as Record<string, SchemaNode>; // 최상위 필드
        const dialogue = (properties.dialogue.anyOf as SchemaNode[])[1]; // 대사 객체
        expect((dialogue.properties as Record<string, SchemaNode>).speaker).toEqual({ type: "string", enum: ["리라"] }); // 표시 이름 목록 확인
        const noGlossary = createTextPlayResponseJsonSchema({ ...DEMO_TEXT_PLAY_PACKAGE, glossary: undefined }).properties as Record<string, SchemaNode>; // 용어 없는 작품
        expect((((noGlossary.dialogue.anyOf as SchemaNode[])[1].properties) as Record<string, SchemaNode>).speaker).toEqual({ type: "string", enum: ["lyra"] }); // 식별자 사용 확인
    }); // 테스트 종료

    it("서술·대사 길이와 제안 액션 개수에 상한을 둔다", () => // 길이 상한 검증
    { // 테스트 시작
        const properties = createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE).properties as Record<string, SchemaNode>; // 최상위 필드
        expect(properties.narration).toEqual({ type: "string", minLength: 1, maxLength: 300 }); // 서술 상한 확인
        const dialogue = properties.dialogue.anyOf as SchemaNode[]; // 대사 후보
        expect(dialogue[0]).toEqual({ type: "null" }); // 대사 없음 허용 확인
        expect(dialogue[1]).toMatchObject({ type: "object", required: ["speaker", "content"], additionalProperties: false }); // 대사 구조 확인
        expect((dialogue[1].properties as Record<string, SchemaNode>).content).toEqual({ type: "string", minLength: 1, maxLength: 150 }); // 대사 상한 확인
        expect(properties.proposedActions).toMatchObject({ type: "array", maxItems: 4 }); // 액션 개수 상한 확인
    }); // 테스트 종료

    it("AI는 능력치·관계·아이템 변화만 작품에 등록된 식별자로 제안할 수 있다", () => // 식별자 목록 검증
    { // 테스트 시작
        const schema = createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE); // 스키마 생성
        expect(getActionSchemas(schema).map((candidate) => (candidate.properties as Record<string, SchemaNode>).type.const)).toEqual(["change-stat", "add-item", "remove-item", "change-relation"]); // 액션 종류 확인(이동·퀘스트·사건은 선택지 전용)
        expect((findActionSchema(schema, "add-item")?.properties as Record<string, SchemaNode>).itemId).toEqual({ type: "string", enum: ["moon-lantern"] }); // 아이템 목록 확인
        expect((findActionSchema(schema, "change-relation")?.properties as Record<string, SchemaNode>).characterId).toEqual({ type: "string", enum: ["lyra"] }); // 인물 목록 확인
    }); // 테스트 종료

    it("변화량과 수량을 정수 범위로 제한한다", () => // 숫자 범위 검증
    { // 테스트 시작
        const schema = createTextPlayResponseJsonSchema(DEMO_TEXT_PLAY_PACKAGE); // 스키마 생성
        expect(findActionSchema(schema, "change-stat")).toEqual( // 능력치 액션 확인
        { // 기대값 시작
            type: "object", // 객체 형식
            properties: { type: { const: "change-stat" }, stat: { type: "string", enum: ["hp", "sanity", "gold"] }, amount: { type: "integer", minimum: -20, maximum: 20 } }, // 필드 목록
            required: ["type", "stat", "amount"], // 필수 필드
            additionalProperties: false, // 추가 필드 차단
        }); // 기대값 종료
        expect((findActionSchema(schema, "remove-item")?.properties as Record<string, SchemaNode>).quantity).toEqual({ type: "integer", minimum: 1, maximum: 3 }); // 수량 범위 확인
        expect((findActionSchema(schema, "change-relation")?.properties as Record<string, SchemaNode>).amount).toEqual({ type: "integer", minimum: -10, maximum: 10 }); // 관계도 범위 확인
    }); // 테스트 종료

    it("작품에 대상이 없는 액션 종류는 후보에서 뺀다", () => // 빈 목록 검증
    { // 테스트 시작
        const emptyPackage: TextPlayPackage = { ...DEMO_TEXT_PLAY_PACKAGE, itemIds: [], questIds: [], eventIds: [] }; // 대상 없는 작품
        const types = getActionSchemas(createTextPlayResponseJsonSchema(emptyPackage)).map((candidate) => (candidate.properties as Record<string, SchemaNode>).type.const); // 액션 종류 목록
        expect(types).toEqual(["change-stat", "change-relation"]); // 남은 종류 확인
    }); // 테스트 종료
}); // 묶음 종료
