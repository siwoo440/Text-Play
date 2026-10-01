import { describe, expect, it } from "vitest"; // 테스트 도구
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { filterTextPlayWorks, getTextPlayGenreKey, TEXT_PLAY_WORKS, withKoreanParticle } from "@/features/text-play/catalog/text-play-catalog"; // 작품 목록

describe("Text-Play 작품 목록", () => // 작품 목록 묶음
{ // 묶음 시작
    it("실제 플레이 가능한 샘플 작품을 첫 번째로 두고 Mock 작품을 대량으로 제공한다", () => // 목록 구성 검증
    { // 테스트 시작
        expect(TEXT_PLAY_WORKS[0]).toMatchObject({ id: DEMO_TEXT_PLAY_PACKAGE.id, title: "달빛 숲의 기록", playable: true }); // 샘플 작품 확인
        expect(TEXT_PLAY_WORKS.length).toBeGreaterThanOrEqual(40); // 대량 작품 확인
        expect(TEXT_PLAY_WORKS.filter((work) => work.playable)).toHaveLength(1); // 플레이 가능 작품 확인
        expect(new Set(TEXT_PLAY_WORKS.map((work) => work.id)).size).toBe(TEXT_PLAY_WORKS.length); // 식별자 중복 부재 확인
        expect(TEXT_PLAY_WORKS.every((work) => work.coverImage.startsWith("/images/"))).toBe(true); // 대표 이미지 확인
    }); // 테스트 종료

    it("플레이 수 내림차순으로 정렬한다", () => // 정렬 검증
    { // 테스트 시작
        const counts = TEXT_PLAY_WORKS.map((work) => work.playCount); // 플레이 수 목록
        expect(counts).toEqual([...counts].sort((left, right) => right - left)); // 내림차순 확인
    }); // 테스트 종료

    it("태그의 첫 장르를 대표 장르로 고른다", () => // 장르 판정 검증
    { // 테스트 시작
        expect(getTextPlayGenreKey(["모험", "미스터리", "판타지"])).toBe("mystery"); // 첫 장르 확인
        expect(getTextPlayGenreKey(["요리", "장인"])).toBe("other"); // 기타 장르 확인
    }); // 테스트 종료

    it("검색어와 장르로 작품을 거른다", () => // 필터 검증
    { // 테스트 시작
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "달빛 숲", "전체").map((work) => work.title)).toContain("달빛 숲의 기록"); // 검색 확인
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "", "SF").every((work) => work.tags.includes("SF"))).toBe(true); // 장르 확인
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "존재하지 않는 작품", "전체")).toEqual([]); // 빈 결과 확인
    }); // 테스트 종료

    it("받침에 맞춰 조사를 붙인다", () => // 조사 검증
    { // 테스트 시작
        expect(withKoreanParticle("애린", "와", "과")).toBe("애린과"); // 받침 있음 확인
        expect(withKoreanParticle("레오", "와", "과")).toBe("레오와"); // 받침 없음 확인
    }); // 테스트 종료
}); // 묶음 종료
