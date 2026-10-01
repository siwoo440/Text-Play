import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { buildCreatorStats, buildTagStats, createExploreHref, findTag, getCharactersByTag, getPublicCharacters, getTagHue, pickDiverseWorks, searchTags } from "@chatbot/features/explore/explore-model"; // 탐색 계산
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 도구

const characters = getPublicCharacters(createInitialState().characters); // 공개 작품

describe("탐색 계산", () => // 탐색 묶음
{ // 묶음 시작
    it("태그를 작품 수가 많은 순서로 집계한다", () => // 태그 통계 검증
    { // 검증 시작
        const stats = buildTagStats(characters); // 태그 통계
        expect(stats[0]?.tag).toBe("판타지"); // 최다 태그 확인
        expect(stats.every((stat, index) => index === 0 || stats[index - 1]!.count >= stat.count)).toBe(true); // 내림차순 확인
        expect(stats.find((stat) => stat.tag === "힐링")?.count).toBe(getCharactersByTag(characters, "힐링").length); // 개수 일치 확인
    }); // 검증 종료

    it("태그 검색은 # 기호를 무시하고 앞부분 일치를 먼저 보여 준다", () => // 태그 검색 검증
    { // 검증 시작
        const stats = buildTagStats(characters); // 태그 통계
        const results = searchTags(stats, "#힐"); // 태그 검색
        expect(results[0]?.tag.startsWith("힐")).toBe(true); // 앞부분 일치 우선
        expect(searchTags(stats, "   ")).toEqual([]); // 빈 검색어 결과
        expect(findTag(stats, " #SF ")).toBe("SF"); // 정확 일치 조회
        expect(findTag(stats, "없는태그")).toBeNull(); // 없는 태그 조회
    }); // 검증 종료

    it("제작자별로 작품과 대화 합계, 자주 쓴 태그를 묶는다", () => // 제작자 통계 검증
    { // 검증 시작
        const creators = buildCreatorStats(characters); // 제작자 통계
        const total = creators.reduce((sum, creator) => sum + creator.works.length, 0); // 전체 작품 수
        expect(total).toBe(characters.length); // 누락 없음 확인
        expect(creators.every((creator, index) => index === 0 || creators[index - 1]!.totalPopularity >= creator.totalPopularity)).toBe(true); // 대화 합계 순서 확인
        expect(creators.every((creator) => creator.topTags.length <= 3)).toBe(true); // 태그 세 개 이하 확인
    }); // 검증 종료

    it("추천 작품은 장르를 번갈아 고르고 중복이 없다", () => // 추천 작품 검증
    { // 검증 시작
        const works = pickDiverseWorks(characters, 12); // 추천 작품
        expect(works).toHaveLength(12); // 개수 확인
        expect(new Set(works.map((work) => work.id)).size).toBe(12); // 중복 없음 확인
        expect(new Set(works.slice(0, 5).map((work) => getGenreKey(work.tags))).size).toBe(5); // 앞쪽 장르 다양성 확인
    }); // 검증 종료

    it("태그 색 번호와 탐색 주소를 안정적으로 만든다", () => // 보조 함수 검증
    { // 검증 시작
        expect(getTagHue("편지")).toBe(getTagHue("편지")); // 같은 태그 같은 색
        expect(getTagHue("우주")).toBeGreaterThanOrEqual(0); // 색 범위 하한
        expect(getTagHue("우주")).toBeLessThan(8); // 색 범위 상한
        expect(createExploreHref("감정 교류")).toBe("/explore?tag=%EA%B0%90%EC%A0%95%20%EA%B5%90%EB%A5%98"); // 태그 주소
        expect(createExploreHref(null)).toBe("/explore"); // 기본 주소
    }); // 검증 종료
}); // 묶음 종료
