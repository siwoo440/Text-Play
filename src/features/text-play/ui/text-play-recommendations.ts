import type { TextPlayChoice } from "@/features/text-play/core/types"; // 선택지 계약

export const TEXT_PLAY_RECOMMENDATION_COUNT = 3; // 추천 답안 개수

const FREE_ACTION_SUGGESTIONS = ["주변을 자세히 살핀다", "지금까지 얻은 단서를 정리한다", "숨을 고르며 주변 소리에 귀를 기울인다"]; // 자유 행동 추천 문구

export type TextPlayRecommendation = // 추천 답안 계약
    | { kind: "choice"; id: string; label: string } // 작품 선택지 답안
    | { kind: "free-action"; id: string; label: string }; // 자유 행동 답안

export function buildTextPlayRecommendations(choices: TextPlayChoice[]): TextPlayRecommendation[] // 추천 답안 생성기
{ // 함수 시작
    if (choices.length === 0) // 종료 장면 확인
    { // 조건 시작
        return []; // 빈 추천 반환
    } // 조건 종료
    const choiceAnswers: TextPlayRecommendation[] = choices.slice(0, TEXT_PLAY_RECOMMENDATION_COUNT).map((choice) => ({ kind: "choice", id: choice.id, label: choice.label })); // 선택지 답안 변환
    const freeAnswers: TextPlayRecommendation[] = FREE_ACTION_SUGGESTIONS.slice(0, TEXT_PLAY_RECOMMENDATION_COUNT - choiceAnswers.length).map((label, index) => ({ kind: "free-action", id: `free-action-${index}`, label })); // 부족분 자유 행동 채움
    return [...choiceAnswers, ...freeAnswers]; // 추천 답안 반환
} // 함수 종료
