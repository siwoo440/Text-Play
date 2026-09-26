import type { TextPlayState } from "@/features/text-play/core/types"; // 게임 상태 계약

export interface TextPlaySessionState // 세션 상태 구조
{ // 구조 시작
    game: TextPlayState; // 확정 게임 상태
    streamedText: string; // 스트리밍 수신 내용
    pendingInput: string; // 보존 사용자 입력
    isStreaming: boolean; // 스트리밍 상태
    error: string | null; // 오류 안내
    saveNotice: string | null; // 저장 안내
    isStatePanelOpen: boolean; // 상태 패널 열림
} // 구조 종료

export type TextPlaySessionAction = // 세션 동작 묶음
    | { type: "ai-started"; input: string } // AI 시작 동작
    | { type: "ai-chunk"; chunk: string } // AI 조각 동작
    | { type: "ai-succeeded"; game: TextPlayState } // AI 성공 동작
    | { type: "ai-failed"; message: string } // AI 실패 동작
    | { type: "ai-aborted" } // AI 중지 동작
    | { type: "game-changed"; game: TextPlayState } // 게임 변경 동작
    | { type: "game-restored"; game: TextPlayState } // 게임 복원 동작
    | { type: "save-notice"; message: string | null } // 저장 안내 동작
    | { type: "toggle-state-panel" }; // 패널 전환 동작

export function textPlayReducer(state: TextPlaySessionState, action: TextPlaySessionAction): TextPlaySessionState // 세션 리듀서
{ // 함수 시작
    if (action.type === "ai-started") // AI 시작 확인
    { // 조건 시작
        return { ...state, streamedText: "", pendingInput: action.input, isStreaming: true, error: null, saveNotice: null }; // 시작 상태 반환
    } // 조건 종료
    if (action.type === "ai-chunk") // AI 조각 확인
    { // 조건 시작
        return { ...state, streamedText: `${state.streamedText}${action.chunk}` }; // 조각 누적 반환
    } // 조건 종료
    if (action.type === "ai-succeeded") // AI 성공 확인
    { // 조건 시작
        return { ...state, game: action.game, streamedText: "", pendingInput: "", isStreaming: false, error: null }; // 성공 상태 반환
    } // 조건 종료
    if (action.type === "ai-failed") // AI 실패 확인
    { // 조건 시작
        return { ...state, streamedText: "", isStreaming: false, error: action.message }; // 실패 상태 반환
    } // 조건 종료
    if (action.type === "ai-aborted") // AI 중지 확인
    { // 조건 시작
        return { ...state, streamedText: "", isStreaming: false, error: "응답 생성을 중지했습니다." }; // 중지 상태 반환
    } // 조건 종료
    if (action.type === "game-changed" || action.type === "game-restored") // 게임 변경 확인
    { // 조건 시작
        return { ...state, game: action.game, streamedText: "", pendingInput: "", isStreaming: false, error: null }; // 변경 상태 반환
    } // 조건 종료
    if (action.type === "save-notice") // 저장 안내 확인
    { // 조건 시작
        return { ...state, saveNotice: action.message }; // 저장 안내 반환
    } // 조건 종료
    return { ...state, isStatePanelOpen: !state.isStatePanelOpen }; // 패널 전환 반환
} // 함수 종료
