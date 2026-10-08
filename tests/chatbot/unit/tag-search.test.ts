import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { Character } from "@chatbot/features/core/types"; // 캐릭터 타입
import { absorbTags, addTag, applyDiscoveryFilter, countActiveFilters, createDiscoveryFilter, isDefaultFilter, parseSearchQuery, removePendingTag, suggestTags, TAG_FILTER_LIMIT } from "@chatbot/features/discovery/discovery-filter"; // 태그 검색 규칙

const none = { talkedIds: new Set<string>(), interestIds: new Set<string>() }; // 대화·관심 정보 없음
const make = (id: string, tags: string[], patch: Partial<Character> = {}): Character => ({ ...createInitialState().characters[0], id, name: id, summary: "", worldSetting: "", tags, popularity: 0, ...patch }); // 캐릭터 만들기
const ids = (characters: Character[]) => characters.map((character) => character.id); // 식별자만
const works = [make("가", ["힐링", "카페", "일상"]), make("나", ["힐링", "판타지", "숲"]), make("다", ["판타지", "모험", "숲"]), make("라", ["힐링", "판타지", "편지"], { name: "편지를 쓰는 마법사 라", creatorName: "달빛 공방" })]; // 네 작품
const known = ["힐링", "카페", "일상", "판타지", "숲", "모험", "편지"]; // 알려진 태그

describe("메인 #태그 검색", () => // 태그 검색 묶음
{ // 묶음 시작
    it("검색창 글을 일반 검색어와 #태그 토막으로 나누고, 입력 중인 마지막 토막을 알아낸다", () => // 나누기
    { // 검증 시작
        expect(parseSearchQuery("마법사 #힐 #판타지")).toEqual({ text: "마법사", partials: ["힐", "판타지"], pending: "판타지" }); // 섞인 글
        expect(parseSearchQuery("#힐링 ")).toEqual({ text: "", partials: ["힐링"], pending: null }); // 띄어쓰기로 끝나면 입력 중이 아님
        expect(parseSearchQuery("#")).toEqual({ text: "", partials: [], pending: "" }); // #만 쳤을 때
        expect(parseSearchQuery("  리안  ")).toEqual({ text: "리안", partials: [], pending: null }); // 일반 검색어
        expect(removePendingTag("마법사 #판")).toBe("마법사 "); // 입력 중인 토막 빼기
        expect(removePendingTag("마법사 #판 ")).toBe("마법사 #판 "); // 입력 중이 아니면 그대로
    }); // 검증 종료

    it("태그를 여러 개 고르면 모두 가진 작품만 남는다", () => // 좁히기
    { // 검증 시작
        const base = createDiscoveryFilter(); // 처음 조건
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["힐링"] }, none))).toEqual(["가", "나", "라"]); // 한 개
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["힐링", "판타지"] }, none))).toEqual(["나", "라"]); // 두 개
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["힐링", "판타지", "숲"] }, none))).toEqual(["나"]); // 세 개
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["카페", "모험"] }, none))).toEqual([]); // 함께 가진 작품 없음
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["힐링", "판타지"], query: "마법사" }, none))).toEqual(["라"]); // 일반 검색어와 함께
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["판타지"], genres: ["힐링", "모험"] }, none))).toEqual(["나", "다", "라"]); // 장르(하나라도)와 함께
    }); // 검증 종료

    it("입력 중인 #토막도 바로 좁히고 초성으로도 찾는다", () => // 입력 중 좁히기
    { // 검증 시작
        const base = createDiscoveryFilter(); // 처음 조건
        expect(ids(applyDiscoveryFilter(works, { ...base, query: "#판" }, none))).toEqual(["나", "다", "라"]); // 앞 글자
        expect(ids(applyDiscoveryFilter(works, { ...base, query: "#ㅎㄹ #숲" }, none))).toEqual(["나"]); // 초성과 함께
        expect(ids(applyDiscoveryFilter(works, { ...base, query: "#" }, none))).toEqual(["가", "나", "다", "라"]); // #만 치면 그대로
        expect(ids(applyDiscoveryFilter(works, { ...base, query: "#없는태그" }, none))).toEqual([]); // 없는 태그
        expect(ids(applyDiscoveryFilter(works, { ...base, tags: ["힐링"], query: "#편" }, none))).toEqual(["라"]); // 고른 태그와 입력 중인 토막
    }); // 검증 종료

    it("다 적은 #태그는 정확히 같거나 하나만 맞을 때 칩으로 옮긴다", () => // 칩으로 옮기기
    { // 검증 시작
        expect(absorbTags("#힐링 ", [], known)).toEqual({ query: "", tags: ["힐링"] }); // 정확히 같음
        expect(absorbTags("마법사 #판 ", ["힐링"], known)).toEqual({ query: "마법사 ", tags: ["힐링", "판타지"] }); // 하나만 맞음
        expect(absorbTags("#ㅋㅍ 리안", [], known)).toEqual({ query: "리안", tags: ["카페"] }); // 초성으로 하나만 맞음
        expect(absorbTags("#힐링", [], known)).toEqual({ query: "#힐링", tags: [] }); // 아직 입력 중(뒤에 띄어쓰기 없음)
        expect(absorbTags("#없는태그 ", [], known)).toEqual({ query: "#없는태그 ", tags: [] }); // 맞는 태그 없음
        expect(absorbTags("#ㅍ ", [], known)).toEqual({ query: "#ㅍ ", tags: [] }); // 여러 개가 맞으면 그대로(판타지·편지)
        expect(absorbTags("#힐링 ", ["힐링"], known)).toEqual({ query: "", tags: ["힐링"] }); // 이미 고른 태그는 겹치지 않음
        const full = ["가", "나", "다", "라", "마"]; // 한도까지 고른 태그
        expect(full).toHaveLength(TAG_FILTER_LIMIT); // 한도 확인
        expect(absorbTags("#힐링 ", full, known)).toEqual({ query: "#힐링 ", tags: full }); // 한도를 넘으면 옮기지 않음
        expect(addTag(full, "힐링")).toEqual(full); // 직접 넣어도 한도까지
        expect(addTag(["힐링"], "숲")).toEqual(["힐링", "숲"]); // 넣기
    }); // 검증 종료

    it("이어서 좁힐 태그는 남은 작품에서 많이 쓴 순으로, 입력 중이면 앞부분이 맞는 것부터 보여 준다", () => // 제안
    { // 검증 시작
        expect(suggestTags(works, [], null).map((stat) => [stat.tag, stat.count])).toEqual([["판타지", 3], ["힐링", 3], ["숲", 2], ["모험", 1], ["일상", 1], ["카페", 1], ["편지", 1]]); // 많이 쓴 순(같으면 가나다순)
        const narrowed = applyDiscoveryFilter(works, { ...createDiscoveryFilter(), tags: ["힐링"] }, none); // 힐링으로 좁힌 작품
        expect(suggestTags(narrowed, ["힐링"], null).map((stat) => [stat.tag, stat.count])).toEqual([["판타지", 2], ["숲", 1], ["일상", 1], ["카페", 1], ["편지", 1]]); // 고른 태그는 빼고 남은 작품 기준
        expect(suggestTags(works, [], "ㅍ").map((stat) => stat.tag)).toEqual(["판타지", "편지", "카페"]); // 앞부분 일치 먼저, 그다음 중간 일치
        expect(suggestTags(works, [], "없는태그")).toEqual([]); // 없음
        expect(suggestTags(works, [], null, 2)).toHaveLength(2); // 개수 한도
    }); // 검증 종료

    it("#이 없는 검색어는 제목과 작가 이름에서만 찾고, 소개·세계관·태그에서는 찾지 않는다", () => // 제목·작가 검색
    { // 검증 시작
        const base = createDiscoveryFilter(); // 처음 조건
        const list = [make("새벽 도서관의 리안", ["판타지"], { creatorName: "아카이브 스튜디오", summary: "기억을 기록하는 사서", worldSetting: "새벽에만 여는 도서관" }), make("퇴근길 카페의 하린", ["힐링"], { creatorName: "저녁다섯시", summary: "도서관 옆 카페의 바리스타" }), make("아카이브의 밤", ["미스터리"], { creatorName: "푸른우산" })]; // 세 작품
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "리안" }, none))).toEqual(["새벽 도서관의 리안"]); // 제목
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "아카이브" }, none))).toEqual(["새벽 도서관의 리안", "아카이브의 밤"]); // 작가 이름과 제목 모두
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "저녁다섯시" }, none))).toEqual(["퇴근길 카페의 하린"]); // 작가 이름
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "ㅎㄹ" }, none))).toEqual(["퇴근길 카페의 하린"]); // 초성(하린)
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "도서관 아카이브" }, none))).toEqual(["새벽 도서관의 리안"]); // 낱말마다 제목이나 작가에 있어야 함
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "바리스타" }, none))).toEqual([]); // 한 줄 소개에서는 찾지 않음
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "새벽에만" }, none))).toEqual([]); // 세계관에서는 찾지 않음
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "미스터리" }, none))).toEqual([]); // 태그는 #을 붙여야 찾음
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "#미스터리" }, none))).toEqual(["아카이브의 밤"]); // #태그
        expect(ids(applyDiscoveryFilter(list, { ...base, query: "아카이브 #판" }, none))).toEqual(["새벽 도서관의 리안"]); // 제목·작가와 태그를 함께
    }); // 검증 종료

    it("고른 태그도 조건 수에 넣고, 태그가 있으면 기본 화면이 아니다", () => // 조건 수
    { // 검증 시작
        const base = createDiscoveryFilter(); // 처음 조건
        expect(base.tags).toEqual([]); // 처음에는 없음
        expect(countActiveFilters({ ...base, tags: ["힐링", "숲"] })).toBe(2); // 태그 수
        expect(countActiveFilters({ ...base, tags: ["힐링"], query: "#판" })).toBe(2); // 입력 중인 토막은 검색어로 한 개
        expect(isDefaultFilter({ ...base, tags: ["힐링"] })).toBe(false); // 기본 화면 아님
    }); // 검증 종료
}); // 묶음 종료
