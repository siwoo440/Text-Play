import assert from "node:assert/strict"; // 단언 도구
import { createRequire } from "node:module"; // 공통 모듈 도구
import test from "node:test"; // 테스트 도구
const require = createRequire(import.meta.url); // 지역 불러오기 생성
const { createRankingEntries, formatRankingSuggestion, getNextRankingIndex, normalizeRankingPeriod, topSearchRankings } = require("./ranking-data.js"); // 순위 데이터 모듈

test("검색 순위 다섯 개를 정해진 형식으로 순환한다", () => // 검색 회전 검증
{ // 검증 시작
    assert.equal(topSearchRankings.length, 5); // 추천 개수 확인
    assert.equal(formatRankingSuggestion(topSearchRankings[0]), "# 성인 1등 : 새벽 도서관의 리안"); // 첫 문구 확인
    assert.equal(getNextRankingIndex(0, topSearchRankings.length), 1); // 다음 번호 확인
    assert.equal(getNextRankingIndex(4, topSearchRankings.length), 0); // 순환 번호 확인
}); // 검증 종료

test("기간별 순위 목록을 1등부터 100등까지 생성한다", () => // 목록 생성 검증
{ // 검증 시작
    const entries = createRankingEntries("monthly"); // 월간 목록 생성
    assert.equal(entries.length, 100); // 목록 개수 확인
    assert.equal(entries[0].rank, 1); // 첫 순위 확인
    assert.equal(entries[99].rank, 100); // 마지막 순위 확인
    assert.equal(new Set(entries.map((entry) => entry.id)).size, 100); // 식별자 중복 확인
}); // 검증 종료

test("잘못된 기간은 월간으로 안전하게 보정한다", () => // 기간 보정 검증
{ // 검증 시작
    assert.equal(normalizeRankingPeriod("weekly"), "weekly"); // 주간 유지 확인
    assert.equal(normalizeRankingPeriod("daily"), "daily"); // 일간 유지 확인
    assert.equal(normalizeRankingPeriod("unknown"), "monthly"); // 기본 기간 확인
}); // 검증 종료
