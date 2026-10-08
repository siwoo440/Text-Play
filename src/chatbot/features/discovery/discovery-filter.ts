// 메인 탐색의 정렬과 필터: 검색어·#태그(여러 개로 좁히기)·장르(여러 개)·이용 등급·처음 만나는 캐릭터·관심 목록을 함께 걸고, 고른 순서로 늘어놓는다.
import { matchesKoreanText } from "@chatbot/features/conversation/conversation-list-model"; // 초성 포함 검색
import type { AppState, Character, ContentRating } from "@chatbot/features/core/types"; // 도메인 타입
import { buildTagStats, type TagStat } from "@chatbot/features/explore/explore-model"; // 태그 통계

export const TAG_FILTER_LIMIT = 5; // 함께 걸 수 있는 태그 수
export const TAG_SUGGESTION_LIMIT = 8; // 한 번에 보여 주는 태그 제안 수

export type DiscoverySort = "recommended" | "popular" | "latest" | "name"; // 정렬 방법
export type RatingFilter = "any" | ContentRating; // 이용 등급 조건

export interface DiscoveryFilter // 탐색 조건
{ // 구조 시작
    query: string; // 검색어(#으로 시작하는 토막은 입력 중인 태그)
    tags: string[]; // 고른 태그(모두 가진 작품만 통과)
    genres: string[]; // 고른 장르(하나라도 맞으면 통과, 비면 전체)
    rating: RatingFilter; // 이용 등급
    onlyNew: boolean; // 아직 대화하지 않은 캐릭터만
    onlyInterest: boolean; // 좋아요·보관한 캐릭터만
    sort: DiscoverySort; // 정렬
} // 구조 종료

export const discoverySorts: Array<{ id: DiscoverySort; label: string }> = [{ id: "recommended", label: "추천순" }, { id: "popular", label: "인기순" }, { id: "latest", label: "최신순" }, { id: "name", label: "이름순" }]; // 정렬 선택지
export const ratingFilters: Array<{ id: RatingFilter; label: string }> = [{ id: "any", label: "모든 등급" }, { id: "all", label: "전체 이용가" }, { id: "teen", label: "15세 이용가" }, { id: "mature", label: "19세 이용가" }]; // 등급 선택지

export function createDiscoveryFilter(): DiscoveryFilter // 처음 조건(아무것도 걸지 않음)
{ // 함수 시작
    return { query: "", tags: [], genres: [], rating: "any", onlyNew: false, onlyInterest: false, sort: "recommended" }; // 기본 조건
} // 함수 종료

export const DISCOVERY_FILTER_KEY = "mateverse:v1:discovery-filter"; // 탭에 잠깐 기억해 두는 메인 조건(새로고침·뒤로 가기에도 유지, 탭을 닫으면 사라짐)

export function parseStoredFilter(raw: string | null): DiscoveryFilter | null // 기억해 둔 조건 읽기(모양이 다르면 버림)
{ // 함수 시작
    if (raw === null) // 저장 없음
    { // 조건 시작
        return null; // 없음
    } // 조건 종료
    try // 해석 시도
    { // 시도 시작
        const value = JSON.parse(raw) as Partial<Record<keyof DiscoveryFilter, unknown>> | null; // 저장 값
        const strings = (list: unknown): list is string[] => Array.isArray(list) && list.every((item) => typeof item === "string"); // 글자 목록 확인
        if (value === null || typeof value !== "object" || typeof value.query !== "string" || !strings(value.tags) || !strings(value.genres) || typeof value.onlyNew !== "boolean" || typeof value.onlyInterest !== "boolean" || !ratingFilters.some((item) => item.id === value.rating) || !discoverySorts.some((item) => item.id === value.sort)) // 모양 확인
        { // 조건 시작
            return null; // 버림
        } // 조건 종료
        return { query: value.query.slice(0, 80), tags: value.tags.slice(0, TAG_FILTER_LIMIT), genres: value.genres, rating: value.rating as RatingFilter, onlyNew: value.onlyNew, onlyInterest: value.onlyInterest, sort: value.sort as DiscoverySort }; // 조건 반환
    } // 시도 종료
    catch // 해석 실패
    { // 실패 시작
        return null; // 버림
    } // 실패 종료
} // 함수 종료

export interface ParsedSearch // 검색창 글을 나눈 결과
{ // 구조 시작
    text: string; // 일반 검색어(제목·작가에서 찾음)
    partials: string[]; // #으로 적은 태그 토막(# 뺀 글자, 빈 것 제외)
    pending: string | null; // 지금 입력 중인 마지막 #토막(# 뺀 글자, 없으면 없음)
} // 구조 종료

export function parseSearchQuery(query: string): ParsedSearch // 검색창 글을 일반 검색어와 #태그 토막으로 나누기
{ // 함수 시작
    const words = query.split(/\s+/).filter((word) => word.length > 0); // 낱말
    const last = words.at(-1); // 마지막 낱말
    const typing = last !== undefined && last.startsWith("#") && !/\s$/.test(query); // 마지막 낱말이 입력 중인 #토막인지
    return { text: words.filter((word) => !word.startsWith("#")).join(" "), partials: words.filter((word) => word.startsWith("#")).map((word) => word.replace(/^#+/, "")).filter((word) => word.length > 0), pending: typing ? last.replace(/^#+/, "") : null }; // 나눈 결과
} // 함수 종료

export function removePendingTag(query: string): string // 입력 중인 마지막 #토막을 뺀 검색창 글
{ // 함수 시작
    return parseSearchQuery(query).pending === null ? query : query.replace(/#\S*$/, ""); // 마지막 #토막 제거
} // 함수 종료

export function addTag(tags: readonly string[], tag: string): string[] // 태그 넣기(겹치거나 한도를 넘으면 그대로)
{ // 함수 시작
    return tags.includes(tag) || tags.length >= TAG_FILTER_LIMIT ? [...tags] : [...tags, tag]; // 다음 태그
} // 함수 종료

export function absorbTags(query: string, tags: readonly string[], known: readonly string[]): { query: string; tags: string[] } // 다 적은 #태그(뒤에 띄어쓰기)를 칩으로 옮기기(정확히 같거나 하나만 맞을 때)
{ // 함수 시작
    let next = [...tags]; // 다음 태그
    const kept = query.split(/(\s+)/).map((piece, index, pieces) => // 낱말과 띄어쓰기 순회
    { // 순회 시작
        const finished = piece.startsWith("#") && piece.length > 1 && index < pieces.length - 1; // 뒤에 띄어쓰기가 있는 #토막
        if (!finished) // 그대로 둘 낱말
        { // 조건 시작
            return piece; // 그대로
        } // 조건 종료
        const word = piece.replace(/^#+/, "").toLowerCase(); // # 뺀 글자
        const candidates = known.filter((tag) => matchesKoreanText(tag, word)); // 맞는 태그
        const tag = known.find((item) => item.toLowerCase() === word) ?? (candidates.length === 1 ? candidates[0] : undefined); // 정확히 같은 태그, 없으면 하나만 맞는 태그
        if (tag === undefined || (!next.includes(tag) && next.length >= TAG_FILTER_LIMIT)) // 정하지 못했거나 한도를 넘음
        { // 조건 시작
            return piece; // 검색창에 남김
        } // 조건 종료
        next = addTag(next, tag); // 칩으로
        return ""; // 검색창에서 지움
    }); // 순회 종료
    return { query: kept.join("").replace(/^\s+/, "").replace(/\s{2,}/g, " "), tags: next }; // 남은 글과 태그
} // 함수 종료

export function suggestTags(characters: readonly Character[], chosen: readonly string[], pending: string | null, limit = TAG_SUGGESTION_LIMIT): TagStat[] // 지금 남은 작품에서 이어서 좁힐 태그(작품 수가 많은 순, 입력 중이면 앞부분이 맞는 것 먼저)
{ // 함수 시작
    const stats = buildTagStats(characters).filter((stat) => !chosen.includes(stat.tag)); // 이미 고른 태그는 제외
    if (pending === null || pending.length === 0) // 입력 중인 글자 없음
    { // 조건 시작
        return stats.slice(0, limit); // 많이 쓴 순
    } // 조건 종료
    const word = pending.toLowerCase(); // 입력 글자
    const matched = stats.filter((stat) => matchesKoreanText(stat.tag, word)); // 맞는 태그(초성 포함)
    const length = Array.from(word.replace(/\s+/g, "")).length; // 입력 글자 수
    const starts = (tag: string) => matchesKoreanText(Array.from(tag.replace(/\s+/g, "")).slice(0, length).join(""), word); // 앞부분이 맞는지(초성 포함)
    return [...matched.filter((stat) => starts(stat.tag)), ...matched.filter((stat) => !starts(stat.tag))].slice(0, limit); // 앞부분 일치 먼저
} // 함수 종료

export function countActiveFilters(filter: DiscoveryFilter): number // 걸려 있는 조건 수(검색어·태그·장르·등급·두 선택, 정렬은 세지 않음)
{ // 함수 시작
    return (filter.query.trim().length > 0 ? 1 : 0) + filter.tags.length + filter.genres.length + (filter.rating === "any" ? 0 : 1) + (filter.onlyNew ? 1 : 0) + (filter.onlyInterest ? 1 : 0); // 조건 수
} // 함수 종료

export function isDefaultFilter(filter: DiscoveryFilter): boolean // 아무 조건도 없고 추천순인지(기본 화면)
{ // 함수 시작
    return countActiveFilters(filter) === 0 && filter.sort === "recommended"; // 기본 판정
} // 함수 종료

export function toggleGenre(genres: readonly string[], genre: string): string[] // 장르 넣고 빼기
{ // 함수 시작
    return genres.includes(genre) ? genres.filter((item) => item !== genre) : [...genres, genre]; // 다음 장르
} // 함수 종료

export function getTalkedCharacterIds(state: Pick<AppState, "conversations">): Set<string> // 대화해 본 캐릭터(스토리 등장인물 포함)
{ // 함수 시작
    return new Set(state.conversations.flatMap((conversation) => conversation.mode === "story" ? conversation.storyCast.map((member) => member.characterId) : [conversation.characterId])); // 대화 인물
} // 함수 종료

export function getInterestCharacterIds(state: Pick<AppState, "likedCharacterIds" | "bookmarkedCharacterIds">): Set<string> // 좋아요·보관한 캐릭터
{ // 함수 시작
    return new Set([...state.likedCharacterIds, ...state.bookmarkedCharacterIds]); // 관심 캐릭터
} // 함수 종료

export function applyDiscoveryFilter(characters: readonly Character[], filter: DiscoveryFilter, context: { talkedIds: ReadonlySet<string>; interestIds: ReadonlySet<string> }): Character[] // 조건을 걸고 정렬하기
{ // 함수 시작
    const parsed = parseSearchQuery(filter.query); // 일반 검색어와 #토막
    const words = parsed.text.split(" ").filter((word) => word.length > 0); // #이 없는 검색어 낱말
    const matched = characters.filter((character) => // 조건 순회
    { // 순회 시작
        return words.every((word) => matchesKoreanText(character.name, word) || matchesKoreanText(character.creatorName, word)) // 검색어(낱말마다 제목이나 작가 이름에 있어야 함, 초성 포함)
            && filter.tags.every((tag) => character.tags.includes(tag)) // 고른 태그(모두)
            && parsed.partials.every((partial) => character.tags.some((tag) => matchesKoreanText(tag, partial))) // 입력 중인 #토막(초성 포함)
            && (filter.genres.length === 0 || filter.genres.some((genre) => character.tags.includes(genre))) // 장르(하나라도)
            && (filter.rating === "any" || character.contentRating === filter.rating) // 이용 등급
            && (!filter.onlyNew || !context.talkedIds.has(character.id)) // 처음 만나는 캐릭터
            && (!filter.onlyInterest || context.interestIds.has(character.id)); // 관심 목록
    }); // 순회 종료
    if (filter.sort === "popular") // 인기순
    { // 조건 시작
        return matched.sort((left, right) => right.popularity - left.popularity || left.name.localeCompare(right.name, "ko")); // 대화 수가 많은 순
    } // 조건 종료
    if (filter.sort === "latest") // 최신순
    { // 조건 시작
        return matched.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.name.localeCompare(right.name, "ko")); // 최근에 고친 순
    } // 조건 종료
    if (filter.sort === "name") // 이름순
    { // 조건 시작
        return matched.sort((left, right) => left.name.localeCompare(right.name, "ko")); // 가나다순
    } // 조건 종료
    return matched; // 추천순(원래 순서)
} // 함수 종료
