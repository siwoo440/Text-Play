// 스토리 모드 홈의 정렬과 필터: 캐릭터 모드 홈(discovery-filter.ts)과 같은 방식으로, 스토리에 맞는 조건만 둔다.
import type { AppState, Story } from "@chatbot/features/core/types"; // 상태·스토리 타입
import { ratingFilters, type RatingFilter } from "@chatbot/features/discovery/discovery-filter"; // 이용 등급 조건(캐릭터 홈과 같은 선택지)

export type StorySort = "popular" | "latest" | "name"; // 정렬 방법
export type StoryCastFilter = "any" | "solo" | "group"; // 인원 조건(모두·한 명과·여럿이)

export interface StoryFilter // 스토리 탐색 조건
{ // 구조 시작
    sort: StorySort; // 정렬
    rating: RatingFilter; // 이용 등급
    cast: StoryCastFilter; // 등장인물 수
    onlyNew: boolean; // 아직 해 보지 않은 스토리만
} // 구조 종료

export const STORY_FILTER_KEY = "mateverse:v1:story-filter"; // 이 탭에서 고른 조건을 기억하는 칸(세션 저장소)
export const storySorts: Array<{ id: StorySort; label: string }> = [{ id: "popular", label: "인기순" }, { id: "latest", label: "최신순" }, { id: "name", label: "이름순" }]; // 정렬 선택지
export const storyCastFilters: Array<{ id: StoryCastFilter; label: string }> = [{ id: "any", label: "모든 인원" }, { id: "solo", label: "한 명과" }, { id: "group", label: "여럿이" }]; // 인원 선택지

export function createStoryFilter(): StoryFilter // 처음 조건(인기순, 아무것도 걸지 않음)
{ // 함수 시작
    return { sort: "popular", rating: "any", cast: "any", onlyNew: false }; // 기본 조건
} // 함수 종료

export function countActiveStoryFilters(filter: StoryFilter): number // 걸려 있는 조건 수(정렬은 세지 않음)
{ // 함수 시작
    return (filter.rating === "any" ? 0 : 1) + (filter.cast === "any" ? 0 : 1) + (filter.onlyNew ? 1 : 0); // 조건 수
} // 함수 종료

export function isDefaultStoryFilter(filter: StoryFilter): boolean // 아무 조건도 없고 인기순인지
{ // 함수 시작
    return countActiveStoryFilters(filter) === 0 && filter.sort === "popular"; // 기본 판정
} // 함수 종료

export function parseStoredStoryFilter(raw: string | null): StoryFilter | null // 기억해 둔 조건 읽기(모양이 다르면 버림)
{ // 함수 시작
    if (raw === null) // 기억 없음
    { // 조건 시작
        return null; // 없음
    } // 조건 종료
    try // 해석 시도
    { // 시도 시작
        const value = JSON.parse(raw) as Partial<Record<keyof StoryFilter, unknown>> | null; // 저장 값
        if (value === null || typeof value !== "object" || typeof value.onlyNew !== "boolean" || !storySorts.some((item) => item.id === value.sort) || !ratingFilters.some((item) => item.id === value.rating) || !storyCastFilters.some((item) => item.id === value.cast)) // 모양 확인
        { // 조건 시작
            return null; // 버림
        } // 조건 종료
        return { sort: value.sort as StorySort, rating: value.rating as RatingFilter, cast: value.cast as StoryCastFilter, onlyNew: value.onlyNew }; // 조건 반환
    } // 시도 종료
    catch // 해석 실패
    { // 실패 시작
        return null; // 버림
    } // 실패 종료
} // 함수 종료

export function getStartedStoryIds(state: Pick<AppState, "conversations">): Set<string> // 해 본 스토리(스토리 대화가 있는 스토리)
{ // 함수 시작
    return new Set(state.conversations.flatMap((conversation) => conversation.mode === "story" && conversation.storyId !== null ? [conversation.storyId] : [])); // 스토리 식별자 모음
} // 함수 종료

export function applyStoryFilter(stories: readonly Story[], filter: StoryFilter, startedIds: ReadonlySet<string>): Story[] // 조건을 걸고 정렬하기(원래 목록은 그대로 둠)
{ // 함수 시작
    const matched = stories.filter((story) => // 조건 순회
        (filter.rating === "any" || story.contentRating === filter.rating) // 이용 등급
        && (filter.cast === "any" || (filter.cast === "solo" ? story.cast.length === 1 : story.cast.length > 1)) // 인원
        && (!filter.onlyNew || !startedIds.has(story.id))); // 처음 만나는 스토리
    if (filter.sort === "latest") // 최신순
    { // 조건 시작
        return matched.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, "ko")); // 최근에 고친 순
    } // 조건 종료
    if (filter.sort === "name") // 이름순
    { // 조건 시작
        return matched.sort((left, right) => left.title.localeCompare(right.title, "ko")); // 가나다순
    } // 조건 종료
    return matched.sort((left, right) => right.popularity - left.popularity || left.title.localeCompare(right.title, "ko")); // 인기순(같으면 이름순)
} // 함수 종료
