import type { TextPlayResponseParseResult } from "@/features/text-play/ai/types"; // 응답 결과 계약
import type { TextPlayAction } from "@/features/text-play/core/types"; // 게임 액션 계약

function isRecord(value: unknown): value is Record<string, unknown> // 객체 여부 확인
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 판정 반환
} // 함수 종료

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean // 필드 집합 확인
{ // 함수 시작
    const actualKeys = Object.keys(value).sort(); // 실제 필드 정렬
    const expectedKeys = [...keys].sort(); // 기대 필드 정렬
    return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index]); // 동일 필드 반환
} // 함수 종료

function isFiniteNumber(value: unknown): value is number // 유한 숫자 확인
{ // 함수 시작
    return typeof value === "number" && Number.isFinite(value); // 숫자 판정 반환
} // 함수 종료

function parseAction(value: unknown): TextPlayAction | null // 액션 해석
{ // 함수 시작
    if (!isRecord(value) || typeof value.type !== "string") // 기본 구조 확인
    { // 조건 시작
        return null; // 잘못된 액션 반환
    } // 조건 종료

    if (value.type === "change-stat") // 능력치 액션 확인
    { // 조건 시작
        if (!hasExactKeys(value, ["type", "stat", "amount"]) || !["hp", "sanity", "gold"].includes(String(value.stat)) || !isFiniteNumber(value.amount)) // 필드 유효성 확인
        { // 조건 시작
            return null; // 잘못된 액션 반환
        } // 조건 종료
        return { type: value.type, stat: value.stat as "hp" | "sanity" | "gold", amount: value.amount }; // 능력치 액션 반환
    } // 조건 종료

    if (value.type === "add-item" || value.type === "remove-item") // 아이템 액션 확인
    { // 조건 시작
        if (!hasExactKeys(value, ["type", "itemId", "quantity"]) || typeof value.itemId !== "string" || !isFiniteNumber(value.quantity)) // 필드 유효성 확인
        { // 조건 시작
            return null; // 잘못된 액션 반환
        } // 조건 종료
        return { type: value.type, itemId: value.itemId, quantity: value.quantity }; // 아이템 액션 반환
    } // 조건 종료

    if (value.type === "move-location") // 위치 액션 확인
    { // 조건 시작
        if (!hasExactKeys(value, ["type", "locationId"]) || typeof value.locationId !== "string") // 필드 유효성 확인
        { // 조건 시작
            return null; // 잘못된 액션 반환
        } // 조건 종료
        return { type: value.type, locationId: value.locationId }; // 위치 액션 반환
    } // 조건 종료

    if (value.type === "change-relation") // 관계도 액션 확인
    { // 조건 시작
        if (!hasExactKeys(value, ["type", "characterId", "amount"]) || typeof value.characterId !== "string" || !isFiniteNumber(value.amount)) // 필드 유효성 확인
        { // 조건 시작
            return null; // 잘못된 액션 반환
        } // 조건 종료
        return { type: value.type, characterId: value.characterId, amount: value.amount }; // 관계도 액션 반환
    } // 조건 종료

    if (value.type === "start-quest" || value.type === "complete-quest") // 퀘스트 액션 확인
    { // 조건 시작
        if (!hasExactKeys(value, ["type", "questId"]) || typeof value.questId !== "string") // 필드 유효성 확인
        { // 조건 시작
            return null; // 잘못된 액션 반환
        } // 조건 종료
        return { type: value.type, questId: value.questId }; // 퀘스트 액션 반환
    } // 조건 종료

    if (value.type === "trigger-event") // 이벤트 액션 확인
    { // 조건 시작
        if (!hasExactKeys(value, ["type", "eventId"]) || typeof value.eventId !== "string") // 필드 유효성 확인
        { // 조건 시작
            return null; // 잘못된 액션 반환
        } // 조건 종료
        return { type: value.type, eventId: value.eventId }; // 이벤트 액션 반환
    } // 조건 종료

    return null; // 미지원 액션 반환
} // 함수 종료

export function parseTextPlayResponse(raw: string): TextPlayResponseParseResult // AI 응답 해석
{ // 함수 시작
    let decoded: unknown; // 해석 대상
    try // JSON 해석 시도
    { // 시도 시작
        decoded = JSON.parse(raw); // JSON 해석
    } // 시도 종료
    catch // JSON 오류 처리
    { // 오류 시작
        return { ok: false, reason: "invalid-json" }; // JSON 오류 반환
    } // 오류 종료

    if (!isRecord(decoded) || !hasExactKeys(decoded, ["narration", "dialogue", "proposedActions"])) // 최상위 구조 확인
    { // 조건 시작
        return { ok: false, reason: "invalid-schema" }; // 스키마 오류 반환
    } // 조건 종료
    if (typeof decoded.narration !== "string" || decoded.narration.trim().length === 0 || !Array.isArray(decoded.proposedActions)) // 필수 필드 확인
    { // 조건 시작
        return { ok: false, reason: "invalid-schema" }; // 스키마 오류 반환
    } // 조건 종료
    if (decoded.dialogue !== null && (!isRecord(decoded.dialogue) || !hasExactKeys(decoded.dialogue, ["speaker", "content"]) || typeof decoded.dialogue.speaker !== "string" || typeof decoded.dialogue.content !== "string")) // 대사 구조 확인
    { // 조건 시작
        return { ok: false, reason: "invalid-schema" }; // 스키마 오류 반환
    } // 조건 종료

    const proposedActions = decoded.proposedActions.map(parseAction); // 액션 목록 해석
    if (proposedActions.some((action) => action === null)) // 액션 오류 확인
    { // 조건 시작
        return { ok: false, reason: "invalid-action" }; // 액션 오류 반환
    } // 조건 종료

    return { // 성공 결과 반환
        ok: true, // 성공 표시
        value: // 응답 값
        { // 응답 시작
            narration: decoded.narration, // 서술 내용
            dialogue: decoded.dialogue === null ? null : { speaker: decoded.dialogue.speaker as string, content: decoded.dialogue.content as string }, // 대사 내용
            proposedActions: proposedActions as TextPlayAction[], // 검증 액션
        }, // 응답 종료
    }; // 결과 종료
} // 함수 종료
