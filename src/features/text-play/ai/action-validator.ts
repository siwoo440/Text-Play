import { AI_ACTION_TYPES, ITEM_QUANTITY_LIMIT, RELATION_CHANGE_LIMIT, STAT_CHANGE_LIMIT } from "@/features/text-play/ai/response-json-schema"; // AI 행동 범위
import { applyTextPlayActions, type TextPlayEngineFailure } from "@/features/text-play/core/actions"; // 엔진 액션 검증
import type { TextPlayAction, TextPlayPackage, TextPlayState } from "@/features/text-play/core/types"; // 도메인 계약

export type TextPlayActionValidationResult = // 액션 검증 결과
    | { ok: true; actions: TextPlayAction[] } // 검증 성공
    | { ok: false; reason: TextPlayEngineFailure }; // 검증 실패

export type TextPlayActionRejection = TextPlayEngineFailure | "choice-only" | "too-large"; // 행동 제외 이유

export interface TextPlayActionSelection // 적용할 행동 고르기 결과
{ // 구조 시작
    accepted: TextPlayAction[]; // 적용할 행동
    rejected: { action: TextPlayAction; reason: TextPlayActionRejection }[]; // 뺀 행동과 이유
} // 구조 종료

export function validateProposedActions(packageData: TextPlayPackage, state: TextPlayState, actions: TextPlayAction[]): TextPlayActionValidationResult // 제안 액션 전체 검증
{ // 함수 시작
    const result = applyTextPlayActions(packageData, state, actions, state.updatedAt); // 엔진 검증 실행
    if (!result.ok) // 검증 실패 확인
    { // 조건 시작
        return { ok: false, reason: result.reason }; // 실패 결과 반환
    } // 조건 종료
    return { ok: true, actions }; // 성공 결과 반환
} // 함수 종료

function exceedsLimit(action: TextPlayAction): boolean // 한 번 변화량 상한 초과 확인
{ // 함수 시작
    if (action.type === "change-stat") // 능력치 확인
    { // 조건 시작
        return Math.abs(action.amount) > STAT_CHANGE_LIMIT; // 능력치 상한
    } // 조건 종료
    if (action.type === "change-relation") // 관계도 확인
    { // 조건 시작
        return Math.abs(action.amount) > RELATION_CHANGE_LIMIT; // 관계도 상한
    } // 조건 종료
    if (action.type === "add-item" || action.type === "remove-item") // 아이템 확인
    { // 조건 시작
        return action.quantity > ITEM_QUANTITY_LIMIT; // 수량 상한
    } // 조건 종료
    return false; // 상한 없음
} // 함수 종료

export function selectApplicableActions(packageData: TextPlayPackage, state: TextPlayState, actions: TextPlayAction[]): TextPlayActionSelection // AI 제안 중 지금 적용할 수 있는 행동만 고르기
{ // 함수 시작
    const selection: TextPlayActionSelection = { accepted: [], rejected: [] }; // 결과 준비
    let draft = state; // 순서대로 적용해 보는 상태
    for (const action of actions) // 제안 순회
    { // 반복 시작
        if (!(AI_ACTION_TYPES as readonly string[]).includes(action.type)) // AI 허용 종류 확인
        { // 조건 시작
            selection.rejected.push({ action, reason: "choice-only" }); // 선택지 전용 행동 제외
            continue; // 다음 행동
        } // 조건 종료
        if (exceedsLimit(action)) // 변화량 확인
        { // 조건 시작
            selection.rejected.push({ action, reason: "too-large" }); // 너무 큰 변화 제외
            continue; // 다음 행동
        } // 조건 종료
        const result = applyTextPlayActions(packageData, draft, [action], draft.updatedAt); // 하나씩 적용해 보기
        if (!result.ok) // 엔진 실패 확인
        { // 조건 시작
            selection.rejected.push({ action, reason: result.reason }); // 불가능한 행동 제외
            continue; // 다음 행동
        } // 조건 종료
        draft = result.state; // 적용 상태 이어가기
        selection.accepted.push(action); // 적용 행동 추가
    } // 반복 종료
    return selection; // 결과 반환
} // 함수 종료
