import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { buildCreatorStats } from "@chatbot/features/explore/explore-model"; // 제작자 통계
import { refreshBuiltInCreators } from "@chatbot/lib/repositories/state-migrations"; // 기본 캐릭터 제작자 나누기
import { RANKING_LAB_CREATOR_ID, rankingCreatorIds } from "@chatbot/mocks/ranking-character-concepts"; // 랭킹 캐릭터 제작자

describe("기본 캐릭터의 제작자", () => // 제작자 묶음
{ // 묶음 시작
    it("기본 캐릭터 100개가 제작자 15명에게 고르게 나뉘고 한 명이 14개를 넘지 않는다", () => // 분포 검증
    { // 검증 시작
        const creators = buildCreatorStats(createInitialState().characters); // 제작자 통계
        expect(creators).toHaveLength(15); // 제작자 수
        expect(creators.reduce((sum, creator) => sum + creator.works.length, 0)).toBe(100); // 작품 합계
        expect(Math.max(...creators.map((creator) => creator.works.length))).toBe(14); // 가장 많은 제작자
        expect(creators.filter((creator) => creator.works.length >= 3).length).toBeGreaterThanOrEqual(8); // 대표 작품 세 칸을 채우는 제작자
        expect(creators.some((creator) => creator.creatorId === RANKING_LAB_CREATOR_ID)).toBe(false); // 예전 제작자는 없음
        expect(new Set(creators.map((creator) => creator.creatorName)).size).toBe(15); // 이름 겹침 없음
    }); // 검증 종료

    it("예전에 저장한 데이터는 읽을 때 제작자만 바꾸고, 팔로우는 나눈 제작자로 옮긴다", () => // 저장 데이터 검증
    { // 검증 시작
        const fresh = createInitialState(); // 새 상태
        const mine = { ...fresh.characters[10], id: "my-character", creatorId: fresh.profile.id, creatorName: fresh.profile.nickname, name: "내가 만든 캐릭터" }; // 내가 만든 캐릭터
        const old = { ...fresh, characters: [...fresh.characters.map((character) => character.id.startsWith("rank-") ? { ...character, creatorId: RANKING_LAB_CREATOR_ID, creatorName: "메이트버스 랭킹 연구소", summary: `${character.summary} (고친 소개)` } : character), mine], followedCreatorIds: ["creator-archive", RANKING_LAB_CREATOR_ID] }; // 예전 모양의 저장 데이터
        const next = refreshBuiltInCreators(old); // 읽을 때 고침
        expect(next.characters.some((character) => character.creatorId === RANKING_LAB_CREATOR_ID)).toBe(false); // 예전 제작자 없음
        expect(next.characters.filter((character) => character.id.startsWith("rank-")).map((character) => [character.id, character.creatorId, character.creatorName])).toEqual(fresh.characters.filter((character) => character.id.startsWith("rank-")).map((character) => [character.id, character.creatorId, character.creatorName])); // 새 제작자와 같음
        expect(next.characters.find((character) => character.id === "rank-008")?.summary).toContain("(고친 소개)"); // 내용은 그대로
        expect(next.characters.find((character) => character.id === "my-character")).toEqual(mine); // 내가 만든 캐릭터는 그대로
        expect(next.followedCreatorIds).toEqual(["creator-archive", ...rankingCreatorIds]); // 팔로우를 나눈 제작자로
        expect(refreshBuiltInCreators(next)).toBe(next); // 다시 읽어도 바뀌지 않음
        expect(refreshBuiltInCreators(fresh)).toBe(fresh); // 새 데이터는 그대로
    }); // 검증 종료
}); // 묶음 종료
