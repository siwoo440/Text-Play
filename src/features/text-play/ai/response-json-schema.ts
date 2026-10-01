import type { TextPlayPackage, TextPlayStatKey } from "@/features/text-play/core/types"; // 도메인 계약

export type TextPlayJsonSchema = Record<string, unknown>; // JSON 스키마 객체

const STAT_KEYS: TextPlayStatKey[] = ["hp", "sanity", "gold"]; // 능력치 식별자 목록
const NARRATION_MAX_LENGTH = 300; // 서술 최대 글자 수
const DIALOGUE_MAX_LENGTH = 150; // 대사 최대 글자 수
const SPEAKER_MAX_LENGTH = 20; // 발화자 최대 글자 수
const MAX_PROPOSED_ACTIONS = 4; // 제안 액션 최대 개수
const STAT_CHANGE_LIMIT = 20; // 능력치 한 번 변화 상한
const RELATION_CHANGE_LIMIT = 10; // 관계도 한 번 변화 상한
const ITEM_QUANTITY_LIMIT = 3; // 아이템 한 번 수량 상한

function idEnum(ids: string[]): TextPlayJsonSchema // 식별자 목록 스키마
{ // 함수 시작
    return { type: "string", enum: ids }; // 목록 제한 반환
} // 함수 종료

function integerRange(minimum: number, maximum: number): TextPlayJsonSchema // 정수 범위 스키마
{ // 함수 시작
    return { type: "integer", minimum, maximum }; // 범위 제한 반환
} // 함수 종료

function actionSchema(type: string, fields: Record<string, TextPlayJsonSchema>): TextPlayJsonSchema // 액션 한 종류 스키마
{ // 함수 시작
    return { // 액션 스키마 반환
        type: "object", // 객체 형식
        properties: { type: { const: type }, ...fields }, // 종류와 필드
        required: ["type", ...Object.keys(fields)], // 모든 필드 필수
        additionalProperties: false, // 추가 필드 차단
    }; // 스키마 종료
} // 함수 종료

function createActionSchemas(packageData: TextPlayPackage): TextPlayJsonSchema[] // 작품별 액션 후보 생성
{ // 함수 시작
    const actions = [actionSchema("change-stat", { stat: idEnum(STAT_KEYS), amount: integerRange(-STAT_CHANGE_LIMIT, STAT_CHANGE_LIMIT) })]; // 능력치 액션
    if (packageData.itemIds.length > 0) // 아이템 존재 확인
    { // 조건 시작
        actions.push(actionSchema("add-item", { itemId: idEnum(packageData.itemIds), quantity: integerRange(1, ITEM_QUANTITY_LIMIT) })); // 아이템 추가 액션
        actions.push(actionSchema("remove-item", { itemId: idEnum(packageData.itemIds), quantity: integerRange(1, ITEM_QUANTITY_LIMIT) })); // 아이템 제거 액션
    } // 조건 종료
    if (packageData.locationIds.length > 0) // 장소 존재 확인
    { // 조건 시작
        actions.push(actionSchema("move-location", { locationId: idEnum(packageData.locationIds) })); // 위치 이동 액션
    } // 조건 종료
    if (packageData.characterIds.length > 0) // 인물 존재 확인
    { // 조건 시작
        actions.push(actionSchema("change-relation", { characterId: idEnum(packageData.characterIds), amount: integerRange(-RELATION_CHANGE_LIMIT, RELATION_CHANGE_LIMIT) })); // 관계도 액션
    } // 조건 종료
    if (packageData.questIds.length > 0) // 퀘스트 존재 확인
    { // 조건 시작
        actions.push(actionSchema("start-quest", { questId: idEnum(packageData.questIds) })); // 퀘스트 시작 액션
        actions.push(actionSchema("complete-quest", { questId: idEnum(packageData.questIds) })); // 퀘스트 완료 액션
    } // 조건 종료
    if (packageData.eventIds.length > 0) // 이벤트 존재 확인
    { // 조건 시작
        actions.push(actionSchema("trigger-event", { eventId: idEnum(packageData.eventIds) })); // 이벤트 액션
    } // 조건 종료
    return actions; // 후보 목록 반환
} // 함수 종료

export function createTextPlayResponseJsonSchema(packageData: TextPlayPackage): TextPlayJsonSchema // 응답 JSON 스키마 생성
{ // 함수 시작
    return { // 스키마 반환
        type: "object", // 객체 형식
        properties: // 응답 필드(생성 순서)
        { // 필드 시작
            narration: { type: "string", minLength: 1, maxLength: NARRATION_MAX_LENGTH }, // 장면 서술
            dialogue: // 선택 대사
            { // 대사 시작
                anyOf: // 대사 후보
                [ // 후보 시작
                    { type: "null" }, // 대사 없음
                    { // 대사 객체 시작
                        type: "object", // 객체 형식
                        properties: { speaker: { type: "string", minLength: 1, maxLength: SPEAKER_MAX_LENGTH }, content: { type: "string", minLength: 1, maxLength: DIALOGUE_MAX_LENGTH } }, // 발화자와 내용
                        required: ["speaker", "content"], // 필수 필드
                        additionalProperties: false, // 추가 필드 차단
                    }, // 대사 객체 종료
                ], // 후보 종료
            }, // 대사 종료
            proposedActions: { type: "array", items: { anyOf: createActionSchemas(packageData) }, maxItems: MAX_PROPOSED_ACTIONS }, // 제안 액션
        }, // 필드 종료
        required: ["narration", "dialogue", "proposedActions"], // 필수 필드
        additionalProperties: false, // 추가 필드 차단
    }; // 스키마 종료
} // 함수 종료
