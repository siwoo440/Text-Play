import { describe, expect, it } from "vitest"; // 테스트 도구
import { filterTextPlayWorks, localizeTextPlayWork, TEXT_PLAY_WORKS } from "@/features/text-play/catalog/text-play-catalog"; // 작품 목록

const HANGUL = /[가-힣]/u; // 한글 글자

describe("Text-Play 작품 영어판", () => // 작품 영어판 묶음
{ // 묶음 시작
    it("모든 작품의 제목·인물·소개·태그에 영어판이 있다", () => // 영어판 빠짐 검증
    { // 테스트 시작
        const missing = TEXT_PLAY_WORKS.map((work) => localizeTextPlayWork(work, "en")).filter((work) => [work.title, work.leadName, work.summary, work.description, ...work.tags].some((text) => HANGUL.test(text))).map((work) => work.id); // 한글이 남은 작품
        expect(missing).toEqual([]); // 빠진 작품 없음
    }); // 테스트 종료

    it("한국어를 고르면 원문 그대로 쓴다", () => // 한국어 유지 검증
    { // 테스트 시작
        const work = TEXT_PLAY_WORKS.find((candidate) => candidate.id === "work-rank-008"); // 황혼 우체국
        expect(work === undefined ? undefined : localizeTextPlayWork(work, "ko")).toBe(work); // 같은 객체
    }); // 테스트 종료

    it("영어 제목·태그로도 작품을 찾고 장르 필터는 그대로 동작한다", () => // 영어 검색 검증
    { // 테스트 시작
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "twilight post", "전체").map((work) => work.id)).toEqual(["work-rank-008"]); // 영어 제목 검색
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "황혼", "전체").map((work) => work.id)).toEqual(["work-rank-008"]); // 한국어 검색 유지
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "steampunk", "전체").length).toBeGreaterThan(0); // 영어 태그 검색
        expect(filterTextPlayWorks(TEXT_PLAY_WORKS, "", "판타지").every((work) => work.tags.includes("판타지"))).toBe(true); // 장르 필터 유지
    }); // 테스트 종료
}); // 묶음 종료
