import type { Character } from "@chatbot/features/core/types"; // 캐릭터 타입
import { getGenreKey, type GenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 도구
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export interface TagStat // 태그 통계
{ // 구조 시작
    tag: string; // 태그 이름
    count: number; // 작품 수
    popularity: number; // 대화 합계
} // 구조 종료

export interface CreatorStat // 제작자 통계
{ // 구조 시작
    creatorId: string; // 제작자 식별자
    creatorName: string; // 제작자 이름
    works: Character[]; // 인기순 작품
    totalPopularity: number; // 대화 합계
    topTags: string[]; // 자주 쓴 태그
    genre: GenreKey; // 대표 장르
} // 구조 종료

const tagHueCount = 8; // 태그 색 개수

export function getPublicCharacters(characters: readonly Character[]): Character[] // 공개 캐릭터 조회
{ // 함수 시작
    return characters.filter((character) => character.publicationStatus === "published" && character.visibility === "public"); // 공개 작품 반환
} // 함수 종료

function byPopularity(left: Character, right: Character): number // 인기순 비교
{ // 함수 시작
    return right.popularity - left.popularity || left.name.localeCompare(right.name, "ko"); // 인기·이름 순서
} // 함수 종료

export function normalizeTag(value: string): string // 태그 정규화
{ // 함수 시작
    return value.trim().replace(/^#+/, "").trim().toLowerCase(); // 공백·# 제거
} // 함수 종료

export function buildTagStats(characters: readonly Character[]): TagStat[] // 태그 통계 계산
{ // 함수 시작
    const stats = new Map<string, TagStat>(); // 태그별 누적
    for (const character of characters) // 작품 순회
    { // 순회 시작
        for (const tag of new Set(character.tags)) // 중복 없는 태그 순회
        { // 태그 순회 시작
            const current = stats.get(tag) ?? { tag, count: 0, popularity: 0 }; // 기존 통계 조회
            stats.set(tag, { tag, count: current.count + 1, popularity: current.popularity + character.popularity }); // 통계 누적
        } // 태그 순회 종료
    } // 순회 종료
    return [...stats.values()].sort((left, right) => right.count - left.count || right.popularity - left.popularity || left.tag.localeCompare(right.tag, "ko")); // 많이 쓴 순서 반환
} // 함수 종료

export function searchTags(stats: readonly TagStat[], query: string, limit = 12): TagStat[] // 태그 검색
{ // 함수 시작
    const normalized = normalizeTag(query); // 검색어 정규화
    if (normalized.length === 0) // 빈 검색어 판정
    { // 조건 시작
        return []; // 빈 결과 반환
    } // 조건 종료
    const matches = stats.filter((stat) => stat.tag.toLowerCase().includes(normalized)); // 포함 태그 조회
    const startsWith = matches.filter((stat) => stat.tag.toLowerCase().startsWith(normalized)); // 앞부분 일치
    const rest = matches.filter((stat) => !stat.tag.toLowerCase().startsWith(normalized)); // 중간 일치
    return [...startsWith, ...rest].slice(0, limit); // 앞부분 일치 우선 반환
} // 함수 종료

export function findTag(stats: readonly TagStat[], value: string): string | null // 정확한 태그 조회
{ // 함수 시작
    const normalized = normalizeTag(value); // 값 정규화
    return stats.find((stat) => stat.tag.toLowerCase() === normalized)?.tag ?? null; // 일치 태그 반환
} // 함수 종료

export function getCharactersByTag(characters: readonly Character[], tag: string): Character[] // 태그 작품 조회
{ // 함수 시작
    return characters.filter((character) => character.tags.includes(tag)).sort(byPopularity); // 인기순 작품 반환
} // 함수 종료

export function buildCreatorStats(characters: readonly Character[]): CreatorStat[] // 제작자 통계 계산
{ // 함수 시작
    const groups = new Map<string, Character[]>(); // 제작자별 작품
    for (const character of characters) // 작품 순회
    { // 순회 시작
        groups.set(character.creatorId, [...(groups.get(character.creatorId) ?? []), character]); // 작품 묶기
    } // 순회 종료
    return [...groups.entries()].map(([creatorId, works]) => // 제작자 변환
    { // 변환 시작
        const sorted = [...works].sort(byPopularity); // 인기순 작품
        const tagStats = buildTagStats(sorted); // 제작자 태그 통계
        const genreCounts = new Map<GenreKey, number>(); // 장르별 개수
        for (const work of sorted) // 작품 순회
        { // 순회 시작
            const genre = getGenreKey(work.tags); // 작품 장르
            genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1); // 장르 누적
        } // 순회 종료
        const genre = [...genreCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "other"; // 대표 장르
        return { creatorId, creatorName: sorted[0]?.creatorName ?? t("알 수 없는 제작자"), works: sorted, totalPopularity: sorted.reduce((sum, work) => sum + work.popularity, 0), topTags: tagStats.slice(0, 3).map((stat) => stat.tag), genre }; // 제작자 통계 반환
    }).sort((left, right) => right.totalPopularity - left.totalPopularity || left.creatorName.localeCompare(right.creatorName, "ko")); // 대화 합계 순서 반환
} // 함수 종료

export function pickDiverseWorks(characters: readonly Character[], limit = 12): Character[] // 장르를 섞은 추천 작품
{ // 함수 시작
    const queues = new Map<GenreKey, Character[]>(); // 장르별 대기열
    for (const character of [...characters].sort(byPopularity)) // 인기순 순회
    { // 순회 시작
        const genre = getGenreKey(character.tags); // 작품 장르
        queues.set(genre, [...(queues.get(genre) ?? []), character]); // 대기열 추가
    } // 순회 종료
    const picked: Character[] = []; // 선택 작품
    while (picked.length < limit && [...queues.values()].some((queue) => queue.length > 0)) // 남은 작품 반복
    { // 반복 시작
        for (const queue of queues.values()) // 장르 순서대로 하나씩
        { // 장르 순회 시작
            const next = queue.shift(); // 다음 작품
            if (next !== undefined && picked.length < limit) // 추가 가능 판정
            { // 조건 시작
                picked.push(next); // 작품 추가
            } // 조건 종료
        } // 장르 순회 종료
    } // 반복 종료
    return picked; // 추천 작품 반환
} // 함수 종료

export function getTagHue(tag: string): number // 태그 색 번호
{ // 함수 시작
    let hash = 0; // 해시 값
    for (const char of tag) // 글자 순회
    { // 순회 시작
        hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 9973; // 해시 누적
    } // 순회 종료
    return hash % tagHueCount; // 색 번호 반환
} // 함수 종료

export function getCharactersByTags(characters: readonly Character[], tags: readonly string[]): Character[] // 고른 태그를 모두 가진 작품 조회
{ // 함수 시작
    return characters.filter((character) => tags.every((tag) => character.tags.includes(tag))).sort(byPopularity); // 인기순 작품 반환
} // 함수 종료

export function createExploreHref(tag: string | readonly string[] | null): string // 탐색 주소 생성(태그 여러 개는 tag를 되풀이)
{ // 함수 시작
    const tags = tag === null ? [] : typeof tag === "string" ? [tag] : tag; // 태그 목록
    return tags.length === 0 ? "/explore" : `/explore?${tags.map((item) => `tag=${encodeURIComponent(item)}`).join("&")}`; // 태그 주소 반환
} // 함수 종료
