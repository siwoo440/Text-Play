import { applyTextPlayActions, type TextPlayEngineFailure } from "@/features/text-play/core/actions"; // 엔진 액션 검증
import type { TextPlayAction, TextPlayPackage, TextPlayState } from "@/features/text-play/core/types"; // 도메인 계약

export type TextPlayActionValidationResult = // 액션 검증 결과
    | { ok: true; actions: TextPlayAction[] } // 검증 성공
    | { ok: false; reason: TextPlayEngineFailure }; // 검증 실패

export function validateProposedActions(packageData: TextPlayPackage, state: TextPlayState, actions: TextPlayAction[]): TextPlayActionValidationResult // 제안 액션 검증
{ // 함수 시작
    const result = applyTextPlayActions(packageData, state, actions, state.updatedAt); // 엔진 검증 실행
    if (!result.ok) // 검증 실패 확인
    { // 조건 시작
        return { ok: false, reason: result.reason }; // 실패 결과 반환
    } // 조건 종료
    return { ok: true, actions }; // 성공 결과 반환
} // 함수 종료
