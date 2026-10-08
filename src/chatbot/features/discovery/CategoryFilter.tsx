import { getGenreKeyByLabel } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface CategoryFilterProps // 필터 속성
{ // 구조 시작
    categories: string[]; // 카테고리 목록
    selected: readonly string[]; // 고른 카테고리(비면 전체)
    onSelect(category: string): void; // 선택 처리(전체는 모두 해제, 나머지는 넣고 빼기)
} // 구조 종료

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) // 카테고리 필터
{ // 함수 시작
    return ( // 필터 반환
        <div role="group" aria-label={t("캐릭터 카테고리")}> {/* 필터 그룹 */}
            {categories.map((category) => <button key={category} type="button" data-genre={getGenreKeyByLabel(category)} aria-pressed={category === categories[0] ? selected.length === 0 : selected.includes(category)} onClick={() => onSelect(category)}>{t(category)}</button>)} {/* 필터 버튼 */}
        </div> // 그룹 종료
    ); // 반환 종료
} // 함수 종료
