import { describe, expect, it } from "vitest"; // 테스트 도구
import { getDiscoverableCharacters } from "@chatbot/features/adult/adult-access"; // 공개 캐릭터
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { Character } from "@chatbot/features/core/types"; // 캐릭터 타입
import { applyDiscoveryFilter, countActiveFilters, createDiscoveryFilter, getInterestCharacterIds, getTalkedCharacterIds, isDefaultFilter, toggleGenre } from "@chatbot/features/discovery/discovery-filter"; // 정렬과 필터
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 시작

const none = { talkedIds: new Set<string>(), interestIds: new Set<string>() }; // 대화·관심 정보 없음
const make = (id: string, patch: Partial<Character>): Character => ({ ...createInitialState().characters[0], id, name: id, tags: [], popularity: 0, contentRating: "all", updatedAt: "2026-01-01T00:00:00.000Z", ...patch }); // 캐릭터 만들기
const ids = (characters: Character[]) => characters.map((character) => character.id); // 식별자만

describe("메인 탐색 정렬과 필터", () => // 필터 묶음
{ // 묶음 시작
    it("처음 조건은 아무것도 걸지 않은 추천순이고, 조건 수는 정렬을 세지 않는다", () => // 기본 조건
    { // 검증 시작
        const filter = createDiscoveryFilter(); // 처음 조건
        expect(isDefaultFilter(filter)).toBe(true); // 기본
        expect(countActiveFilters(filter)).toBe(0); // 조건 없음
        expect(isDefaultFilter({ ...filter, sort: "popular" })).toBe(false); // 정렬만 바꿔도 기본이 아님
        expect(countActiveFilters({ ...filter, sort: "popular" })).toBe(0); // 정렬은 조건 수에 넣지 않음
        expect(countActiveFilters({ ...filter, query: " 리안 ", genres: ["힐링", "판타지"], rating: "teen", onlyNew: true, onlyInterest: true })).toBe(6); // 검색어 1 + 장르 2 + 등급 1 + 선택 2
        expect(countActiveFilters({ ...filter, query: "   " })).toBe(0); // 빈 검색어
    }); // 검증 종료

    it("장르는 누를 때마다 넣고 뺀다", () => // 장르 전환
    { // 검증 시작
        expect(toggleGenre([], "힐링")).toEqual(["힐링"]); // 넣기
        expect(toggleGenre(["힐링"], "판타지")).toEqual(["힐링", "판타지"]); // 하나 더
        expect(toggleGenre(["힐링", "판타지"], "힐링")).toEqual(["판타지"]); // 빼기
    }); // 검증 종료

    it("추천순은 원래 순서를 지키고, 인기순·최신순·이름순으로 바꿀 수 있다", () => // 정렬
    { // 검증 시작
        const characters = [make("다온", { popularity: 10, updatedAt: "2026-03-01T00:00:00.000Z" }), make("가람", { popularity: 30, updatedAt: "2026-01-01T00:00:00.000Z" }), make("나래", { popularity: 30, updatedAt: "2026-05-01T00:00:00.000Z" })]; // 세 캐릭터
        const base = createDiscoveryFilter(); // 처음 조건
        expect(ids(applyDiscoveryFilter(characters, base, none))).toEqual(["다온", "가람", "나래"]); // 추천순(원래 순서)
        expect(ids(applyDiscoveryFilter(characters, { ...base, sort: "popular" }, none))).toEqual(["가람", "나래", "다온"]); // 인기순(같으면 이름순)
        expect(ids(applyDiscoveryFilter(characters, { ...base, sort: "latest" }, none))).toEqual(["나래", "다온", "가람"]); // 최신순
        expect(ids(applyDiscoveryFilter(characters, { ...base, sort: "name" }, none))).toEqual(["가람", "나래", "다온"]); // 이름순
        expect(ids(characters)).toEqual(["다온", "가람", "나래"]); // 원래 목록은 바꾸지 않음
    }); // 검증 종료

    it("장르는 하나라도 맞으면 통과하고, 다른 조건과는 모두 맞아야 한다", () => // 여러 조건
    { // 검증 시작
        const characters = [make("힐링이", { tags: ["힐링"], contentRating: "all" }), make("판타지", { tags: ["판타지"], contentRating: "teen" }), make("둘다", { tags: ["힐링", "판타지"], contentRating: "teen", name: "숲의 마법사 둘다" }), make("현대", { tags: ["현대"], contentRating: "all" })]; // 네 캐릭터
        const base = createDiscoveryFilter(); // 처음 조건
        expect(ids(applyDiscoveryFilter(characters, { ...base, genres: ["힐링", "판타지"] }, none))).toEqual(["힐링이", "판타지", "둘다"]); // 장르 둘 중 하나
        expect(ids(applyDiscoveryFilter(characters, { ...base, genres: ["힐링", "판타지"], rating: "teen" }, none))).toEqual(["판타지", "둘다"]); // 장르와 등급
        expect(ids(applyDiscoveryFilter(characters, { ...base, genres: ["힐링", "판타지"], rating: "teen", query: " 마법사 " }, none))).toEqual(["둘다"]); // 검색어까지
        expect(ids(applyDiscoveryFilter(characters, { ...base, rating: "mature" }, none))).toEqual([]); // 맞는 등급 없음
        const context = { talkedIds: new Set(["힐링이"]), interestIds: new Set(["둘다", "현대"]) }; // 대화·관심 정보
        expect(ids(applyDiscoveryFilter(characters, { ...base, onlyNew: true }, context))).toEqual(["판타지", "둘다", "현대"]); // 처음 만나는 캐릭터
        expect(ids(applyDiscoveryFilter(characters, { ...base, onlyInterest: true }, context))).toEqual(["둘다", "현대"]); // 관심 목록
        expect(ids(applyDiscoveryFilter(characters, { ...base, onlyNew: true, onlyInterest: true, genres: ["현대"] }, context))).toEqual(["현대"]); // 모두 함께
    }); // 검증 종료

    it("대화해 본 캐릭터에는 스토리 등장인물이 들어가고, 관심 목록은 좋아요와 보관을 합친다", () => // 대화·관심 정보
    { // 검증 시작
        const base = createInitialState(); // 초기 상태(리안·세라·노아 대화)
        expect([...getTalkedCharacterIds(base)].sort()).toEqual(["noah", "rian", "sera"]); // 대화한 캐릭터
        const story = createStoryConversation(base, base.stories[0].id, "2026-10-03T12:00:00.000Z"); // 스토리 대화 시작
        const talked = getTalkedCharacterIds(story.state); // 스토리 포함
        expect(base.stories[0].cast.every((member) => talked.has(member.characterId))).toBe(true); // 등장인물 모두 포함
        expect([...getInterestCharacterIds({ likedCharacterIds: ["rian", "sera"], bookmarkedCharacterIds: ["sera", "kyle"] })].sort()).toEqual(["kyle", "rian", "sera"]); // 합친 관심 목록
    }); // 검증 종료

    it("기본 데이터에서도 조건을 걸면 그 조건에 맞는 캐릭터만 남는다", () => // 실제 데이터
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const discoverable = getDiscoverableCharacters(state.characters, false); // 공개 캐릭터
        const context = { talkedIds: getTalkedCharacterIds(state), interestIds: getInterestCharacterIds(state) }; // 대화·관심 정보
        const healing = applyDiscoveryFilter(discoverable, { ...createDiscoveryFilter(), genres: ["힐링"], onlyNew: true, sort: "popular" }, context); // 처음 만나는 힐링 캐릭터를 인기순으로
        expect(healing.length).toBeGreaterThan(0); // 결과 있음
        expect(healing.every((character) => character.tags.includes("힐링") && !context.talkedIds.has(character.id))).toBe(true); // 조건에 맞음
        expect(healing.every((character, index) => index === 0 || healing[index - 1].popularity >= character.popularity)).toBe(true); // 인기순
        expect(applyDiscoveryFilter(discoverable, createDiscoveryFilter(), context)).toEqual(discoverable); // 조건이 없으면 그대로
    }); // 검증 종료
}); // 묶음 종료
