interface CategoryFilterProps // 필터 속성
{ // 구조 시작
    categories: string[]; // 카테고리 목록
    selected: string; // 선택 카테고리
    onSelect(category: string): void; // 선택 처리
} // 구조 종료

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) // 카테고리 필터
{ // 함수 시작
    return ( // 필터 반환
        <div role="group" aria-label="캐릭터 카테고리"> {/* 필터 그룹 */}
            {categories.map((category) => <button key={category} type="button" aria-pressed={selected === category} onClick={() => onSelect(category)}>{category}</button>)} {/* 필터 버튼 */}
        </div> // 그룹 종료
    ); // 반환 종료
} // 함수 종료
