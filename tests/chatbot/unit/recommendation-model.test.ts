import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { getInterestCharacters, getRecommendedCharacters } from "@chatbot/features/discovery/recommendation-model"; // 추천 계산

describe("메뉴 추천·관심 목록 계산", () => // 계산 묶음
{ // 묶음 시작
    it("좋아요·보관·대화한 캐릭터의 태그와 많이 겹치는 캐릭터를 추천하고 이미 아는 캐릭터는 뺀다", () => // 취향 추천 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.conversations = []; // 대화 없음
        state.likedCharacterIds = ["rank-019"]; // 사막 별 관측자(판타지·천문·여행) 좋아요
        state.bookmarkedCharacterIds = ["rank-029"]; // 새벽 열차 차장(여행·판타지·힐링) 보관
        const result = getRecommendedCharacters(state, false, 8); // 추천 계산
        expect(result.personalized).toBe(true); // 취향 기반 확인
        expect(result.basisTags.slice(0, 2)).toEqual(["판타지", "여행"]); // 가장 많이 겹친 태그
        expect(result.characters).toHaveLength(8); // 개수 확인
        expect(result.characters.map((character) => character.id)).not.toContain("rank-019"); // 좋아요 캐릭터 제외
        expect(result.characters.map((character) => character.id)).not.toContain("rank-029"); // 보관 캐릭터 제외
        const score = (tags: string[]) => tags.reduce((sum, tag) => sum + (({ 판타지: 5, 여행: 5, 천문: 3, 힐링: 2 } as Record<string, number>)[tag] ?? 0), 0); // 취향 점수
        const scores = result.characters.map((character) => score(character.tags)); // 추천 점수
        expect(scores).toEqual([...scores].sort((left, right) => right - left)); // 점수 높은 순 확인
        expect(scores[0]).toBeGreaterThanOrEqual(5); // 취향 태그가 겹친 캐릭터 우선
    }); // 검증 종료

    it("취향 정보가 없으면 아직 대화하지 않은 인기 캐릭터를 추천한다", () => // 기본 추천 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.conversations = []; // 대화 없음
        const result = getRecommendedCharacters(state, false, 4); // 추천 계산
        expect(result.personalized).toBe(false); // 기본 추천 확인
        expect(result.basisTags).toEqual([]); // 기준 태그 없음
        expect(result.characters.map((character) => character.id)).toEqual(state.characters.filter((character) => character.contentRating !== "mature").slice(0, 4).map((character) => character.id)); // 인기순 확인
    }); // 검증 종료

    it("대화 중인 캐릭터도 취향에 넣고 추천에서는 뺀다", () => // 대화 반영 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태(리안·세라·노아와 대화 중)
        const result = getRecommendedCharacters(state, false, 30); // 추천 계산
        expect(result.personalized).toBe(true); // 취향 기반 확인
        expect(result.characters.map((character) => character.id)).not.toContain("rian"); // 대화 캐릭터 제외
    }); // 검증 종료

    it("19+를 끄면 19세 캐릭터를 추천과 관심 목록에서 뺀다", () => // 19세 제외 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.likedCharacterIds = ["rank-017", "harin"]; // 19세 캐릭터와 일반 캐릭터 좋아요
        expect(getRecommendedCharacters(state, false, 100).characters.some((character) => character.contentRating === "mature")).toBe(false); // 추천 제외
        expect(getInterestCharacters(state, false).map((entry) => entry.character.id)).toEqual(["harin"]); // 관심 목록 제외
        expect(getInterestCharacters(state, true).map((entry) => entry.character.id)).toEqual(["rank-017", "harin"]); // 19+ 켜면 포함
    }); // 검증 종료

    it("관심 목록은 좋아요와 보관을 합쳐 한 번씩 보여 주고 표시를 붙인다", () => // 관심 목록 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.likedCharacterIds = ["harin", "kyle", "없는-캐릭터"]; // 좋아요
        state.bookmarkedCharacterIds = ["kyle", "miel"]; // 보관
        const entries = getInterestCharacters(state, false); // 관심 목록
        expect(entries.map((entry) => [entry.character.id, entry.liked, entry.bookmarked])).toEqual([["harin", true, false], ["kyle", true, true], ["miel", false, true]]); // 합친 결과 확인
    }); // 검증 종료
}); // 묶음 종료
