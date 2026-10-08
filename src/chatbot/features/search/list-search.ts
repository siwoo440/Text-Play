// 목록 검색: 보관함·스토리 목록·내 이미지처럼 화면에 이미 있는 목록을 낱말로 좁힌다(초성 포함, 낱말이 여러 개면 모두 맞아야 함).
import { matchesKoreanText, splitSearchWords } from "@chatbot/features/conversation/conversation-list-model"; // 초성 포함 검색·낱말 나누기

export type SearchField = string | null | undefined; // 검색 대상 글(없으면 건너뜀)

export { splitSearchWords }; // 낱말 나누기(대화 목록 검색과 같은 함수를 씀)

export function matchesFields(fields: readonly SearchField[], query: string): boolean // 낱말마다 어느 한 글에라도 맞는지
{ // 함수 시작
    const texts = fields.filter((field): field is string => typeof field === "string" && field.length > 0); // 글이 있는 대상
    return splitSearchWords(query).every((word) => texts.some((text) => matchesKoreanText(text, word))); // 모든 낱말 일치(검색어가 비면 통과)
} // 함수 종료

export function searchBy<T>(items: readonly T[], query: string, fields: (item: T) => readonly SearchField[]): T[] // 목록 좁히기(순서 유지)
{ // 함수 시작
    return splitSearchWords(query).length === 0 ? [...items] : items.filter((item) => matchesFields(fields(item), query)); // 검색어가 비면 그대로
} // 함수 종료
