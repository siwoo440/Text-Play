import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { Story } from "@chatbot/features/core/types"; // 스토리 타입
import { applyStoryFilter, countActiveStoryFilters, createStoryFilter, getStartedStoryIds, isDefaultStoryFilter, parseStoredStoryFilter, type StoryFilter } from "@chatbot/features/story/story-filter"; // 스토리 정렬·필터
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 생성

const base = createInitialState().stories[0]; // 본보기 스토리

function story(id: string, patch: Partial<Story>): Story // 시험용 스토리
{ // 함수 시작
    return { ...base, id, title: id, popularity: 0, contentRating: "all", updatedAt: "2026-10-01T00:00:00.000Z", ...patch }; // 본보기에 덮어씀
} // 함수 종료

const solo = base.cast.slice(0, 1); // 한 명
const group = [...base.cast, ...base.cast].slice(0, 2); // 두 명

const stories: Story[] = // 시험 목록
[ // 목록 시작
    story("다", { popularity: 10, updatedAt: "2026-10-03T00:00:00.000Z", cast: solo }), // 인기 2위·가장 최근·한 명
    story("가", { popularity: 30, updatedAt: "2026-10-01T00:00:00.000Z", cast: group, contentRating: "teen" }), // 인기 1위·가장 오래됨·여럿·15세
    story("나", { popularity: 10, updatedAt: "2026-10-02T00:00:00.000Z", cast: group }), // 인기 2위(이름으로 가름)·여럿
]; // 목록 종료

function ids(filter: Partial<StoryFilter>, started: string[] = []): string[] // 조건을 건 결과의 순서
{ // 함수 시작
    return applyStoryFilter(stories, { ...createStoryFilter(), ...filter }, new Set(started)).map((item) => item.id); // 식별자 순서
} // 함수 종료

describe("스토리 정렬과 필터", () => // 묶음
{ // 묶음 시작
    it("처음 조건은 인기순이고 아무것도 걸지 않는다", () => // 기본 조건
    { // 검증 시작
        expect(createStoryFilter()).toEqual({ sort: "popular", rating: "any", cast: "any", onlyNew: false }); // 기본값
        expect(isDefaultStoryFilter(createStoryFilter())).toBe(true); // 기본 판정
        expect(countActiveStoryFilters(createStoryFilter())).toBe(0); // 걸린 조건 없음
    }); // 검증 종료

    it("인기순·최신순·이름순으로 정렬하고 원래 목록은 바꾸지 않는다", () => // 정렬
    { // 검증 시작
        expect(ids({ sort: "popular" })).toEqual(["가", "나", "다"]); // 인기가 같으면 이름순
        expect(ids({ sort: "latest" })).toEqual(["다", "나", "가"]); // 최근에 고친 순
        expect(ids({ sort: "name" })).toEqual(["가", "나", "다"]); // 가나다순
        expect(stories.map((item) => item.id)).toEqual(["다", "가", "나"]); // 원래 순서 그대로
    }); // 검증 종료

    it("이용 등급·인원·처음 만나는 스토리로 좁히고 걸린 조건 수를 센다", () => // 필터
    { // 검증 시작
        expect(ids({ rating: "teen" })).toEqual(["가"]); // 15세만
        expect(ids({ rating: "all" })).toEqual(["나", "다"]); // 전체 이용가만
        expect(ids({ cast: "solo" })).toEqual(["다"]); // 한 명과
        expect(ids({ cast: "group" })).toEqual(["가", "나"]); // 여럿이
        expect(ids({ onlyNew: true }, ["가"])).toEqual(["나", "다"]); // 해 본 스토리는 빠짐
        expect(ids({ cast: "group", onlyNew: true }, ["가"])).toEqual(["나"]); // 조건은 모두 맞아야 함
        expect(countActiveStoryFilters({ sort: "name", rating: "teen", cast: "group", onlyNew: true })).toBe(3); // 정렬은 세지 않음
        expect(isDefaultStoryFilter({ ...createStoryFilter(), sort: "name" })).toBe(false); // 정렬만 바꿔도 기본이 아님
    }); // 검증 종료

    it("해 본 스토리는 스토리 대화가 있는 스토리다", () => // 해 본 스토리
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(getStartedStoryIds(state).size).toBe(0); // 처음에는 없음
        const started = createStoryConversation(state, state.stories[0].id, "2026-10-08T00:00:00.000Z"); // 스토리 시작
        expect([...getStartedStoryIds(started.state)]).toEqual([state.stories[0].id]); // 그 스토리가 들어감
    }); // 검증 종료

    it("기억해 둔 조건은 모양이 맞을 때만 되살린다", () => // 기억한 조건 읽기
    { // 검증 시작
        const saved: StoryFilter = { sort: "latest", rating: "teen", cast: "solo", onlyNew: true }; // 고른 조건
        expect(parseStoredStoryFilter(JSON.stringify(saved))).toEqual(saved); // 그대로 되살림
        expect(parseStoredStoryFilter(null)).toBeNull(); // 없음
        expect(parseStoredStoryFilter("{")).toBeNull(); // 깨진 글
        expect(parseStoredStoryFilter(JSON.stringify({ ...saved, sort: "recommended" }))).toBeNull(); // 모르는 정렬
        expect(parseStoredStoryFilter(JSON.stringify({ ...saved, cast: 2 }))).toBeNull(); // 모양이 다름
    }); // 검증 종료
}); // 묶음 종료
