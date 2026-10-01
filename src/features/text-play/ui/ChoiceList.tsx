import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 언어
import type { TextPlayRecommendation } from "@/features/text-play/ui/text-play-recommendations"; // 추천 답안 계약
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자

interface ChoiceListProps // 추천 목록 속성
{ // 구조 시작
    recommendations: TextPlayRecommendation[]; // 추천 답안 목록
    expanded: boolean; // 펼침 여부
    disabled: boolean; // 선택 비활성 여부
    onToggle(): void; // 펼침 전환
    onSelect(recommendation: TextPlayRecommendation): void; // 답안 선택
} // 구조 종료

export function ChoiceList({ recommendations, expanded, disabled, onToggle, onSelect }: ChoiceListProps) // 추천 답안 목록
{ // 함수 시작
    const text = TEXT_PLAY_UI_TEXT[useAppLanguage()].choices; // 언어별 추천 글자
    if (recommendations.length === 0) // 종료 장면 확인
    { // 조건 시작
        return <section aria-label={text.region}><p>{text.ended}</p></section>; // 종료 안내 반환
    } // 조건 종료
    return ( // 목록 반환
        <section aria-label={text.region} data-expanded={expanded}> {/* 추천 영역 */}
            <button type="button" data-recommendation-toggle aria-expanded={expanded} aria-controls={expanded ? "text-play-recommendation-list" : undefined} onClick={onToggle}> {/* 펼침 버튼 */}
                <span>{text.toggle}</span> {/* 펼침 제목 */}
                <span aria-hidden="true">{expanded ? "▾" : "▴"}</span> {/* 펼침 방향 */}
            </button> {/* 펼침 버튼 종료 */}
            {expanded ? <ul id="text-play-recommendation-list" aria-label={text.list}>{recommendations.map((recommendation) => <li key={recommendation.id}><button type="button" data-kind={recommendation.kind} disabled={disabled} onClick={() => onSelect(recommendation)}>{recommendation.label}</button></li>)}</ul> : null} {/* 펼친 답안 */}
        </section> // 추천 영역 종료
    ); // 반환 종료
} // 함수 종료
