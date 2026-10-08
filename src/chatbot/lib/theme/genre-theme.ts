import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export type GenreKey = "healing" | "fantasy" | "modern" | "romance" | "mystery" | "sf" | "other"; // 장르 색 종류

export const genreLabels: Readonly<Record<Exclude<GenreKey, "other">, string>> = // 장르 이름
{ // 이름 시작
    healing: "힐링", // 힐링 장르
    fantasy: "판타지", // 판타지 장르
    modern: "현대", // 현대 장르
    romance: "로맨스", // 로맨스 장르
    mystery: "미스터리", // 미스터리 장르
    sf: "SF", // SF 장르
}; // 이름 종료

const keyByLabel = new Map(Object.entries(genreLabels).map(([key, label]) => [label, key as GenreKey])); // 이름별 장르

export function getGenreKeyByLabel(label: string): GenreKey | "all" // 이름으로 장르 조회
{ // 함수 시작
    return label === "전체" ? "all" : keyByLabel.get(label) ?? "other"; // 장르 반환
} // 함수 종료

export function getGenreKey(tags: readonly string[]): GenreKey // 태그로 대표 장르 조회
{ // 함수 시작
    for (const tag of tags) // 태그 순회
    { // 순회 시작
        const key = keyByLabel.get(tag); // 장르 일치 확인
        if (key !== undefined) // 장르 발견
        { // 조건 시작
            return key; // 첫 장르 반환
        } // 조건 종료
    } // 순회 종료
    return "other"; // 기타 장르 반환
} // 함수 종료

export function getGenreLabel(tags: readonly string[]): string // 태그로 대표 장르 이름 조회
{ // 함수 시작
    const key = getGenreKey(tags); // 대표 장르 조회
    return key === "other" ? tags[0] ?? t("이야기") : genreLabels[key]; // 장르 이름 반환
} // 함수 종료
