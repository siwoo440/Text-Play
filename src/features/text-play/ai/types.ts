import type { TextPlayAction } from "@/features/text-play/core/types"; // 게임 액션 계약

export interface TextPlayDialogue // AI 대사 구조
{ // 구조 시작
    speaker: string; // 발화자 식별자
    content: string; // 대사 내용
} // 구조 종료

export interface TextPlayAIResponse // AI 응답 구조
{ // 구조 시작
    narration: string; // 장면 서술
    dialogue: TextPlayDialogue | null; // 선택 대사
    proposedActions: TextPlayAction[]; // 제안 액션
} // 구조 종료

export type TextPlayResponseFailure = "invalid-json" | "invalid-schema" | "invalid-action"; // 응답 실패 종류

export type TextPlayResponseParseResult = // 응답 해석 결과
    | { ok: true; value: TextPlayAIResponse } // 응답 성공
    | { ok: false; reason: TextPlayResponseFailure }; // 응답 실패
