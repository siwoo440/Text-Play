import { describe, expect, it } from "vitest"; // 테스트 도구
import { buildConversationListItems, findConversationMatch } from "@chatbot/features/conversation/conversation-list-model"; // 대화방 목록
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { createDiscoveryFilter, parseStoredFilter, TAG_FILTER_LIMIT } from "@chatbot/features/discovery/discovery-filter"; // 메인 조건
import { createExploreHref, getCharactersByTags } from "@chatbot/features/explore/explore-model"; // 탐색 계산
import { matchesFields, searchBy, splitSearchWords } from "@chatbot/features/search/list-search"; // 목록 검색

describe("목록 검색", () => // 목록 검색 묶음
{ // 묶음 시작
    it("낱말마다 어느 한 글에라도 맞아야 하고 초성으로도 찾는다", () => // 낱말 검증
    { // 검증 시작
        expect(splitSearchWords("  새벽   도서관 ")).toEqual(["새벽", "도서관"]); // 낱말 나누기
        expect(matchesFields(["새벽 도서관의 리안", "판타지"], "리안")).toBe(true); // 한 낱말
        expect(matchesFields(["새벽 도서관의 리안", "판타지"], "리안 판타지")).toBe(true); // 서로 다른 글에 맞는 두 낱말
        expect(matchesFields(["새벽 도서관의 리안", "판타지"], "리안 힐링")).toBe(false); // 한 낱말이라도 안 맞으면 탈락
        expect(matchesFields(["새벽 도서관의 리안"], "ㄷㅅㄱ")).toBe(true); // 초성
        expect(matchesFields([null, undefined, ""], "리안")).toBe(false); // 글이 없으면 탈락
        expect(matchesFields([null], "   ")).toBe(true); // 검색어가 비면 통과
    }); // 검증 종료

    it("목록은 순서를 지키며 좁히고 검색어가 비면 그대로 돌려준다", () => // 좁히기 검증
    { // 검증 시작
        const items = [{ name: "리안", tags: ["판타지"] }, { name: "하린", tags: ["힐링"] }, { name: "세라", tags: ["힐링", "학원"] }]; // 목록
        const fields = (item: { name: string; tags: string[] }) => [item.name, ...item.tags]; // 검색 대상
        expect(searchBy(items, "", fields)).toEqual(items); // 그대로
        expect(searchBy(items, "힐링", fields).map((item) => item.name)).toEqual(["하린", "세라"]); // 순서 유지
        expect(searchBy(items, "힐링 학원", fields).map((item) => item.name)).toEqual(["세라"]); // 두 낱말
        expect(searchBy(items, "없는말", fields)).toEqual([]); // 없음
    }); // 검증 종료
}); // 묶음 종료

describe("대화방 검색", () => // 대화방 검색 묶음
{ // 묶음 시작
    const state = createInitialState(); // 초기 상태
    const item = buildConversationListItems(state, new Date("2026-10-04T03:00:00.000Z")).find((entry) => entry.conversation.id === "conversation-rian"); // 리안 대화
    if (item === undefined) // 대화 부재
    { // 조건 시작
        throw new Error("리안 대화가 없습니다."); // 준비 실패
    } // 조건 종료

    it("제목과 이름으로 찾으면 대화방만 찾고, 지난 말로 찾으면 그 말을 알려 준다", () => // 대화 전체 검색 검증
    { // 검증 시작
        expect(findConversationMatch(item, "", state.messages)).toEqual({ message: null }); // 검색어 없음
        expect(findConversationMatch(item, "리안", state.messages)).toEqual({ message: null }); // 이름
        expect(findConversationMatch(item, "남겨뒀어", state.messages)).toEqual({ message: null }); // 마지막 말
        expect(findConversationMatch(item, "창가", state.messages)?.message?.id).toBe("message-rian-1"); // 지난 말
        expect(findConversationMatch(item, "기록할 이야기", state.messages)?.message?.id).toBe("message-rian-2"); // 내가 한 말
        expect(findConversationMatch(item, "우산", state.messages)).toBeNull(); // 다른 대화의 말은 찾지 않음
        expect(findConversationMatch(item, "없는말", state.messages)).toBeNull(); // 없음
    }); // 검증 종료

    it("보관함처럼 낱말을 나눠 모두 맞는 대화방을 찾는다(순서가 달라도, 제목과 지난 말에 흩어져 있어도)", () => // 낱말 검색 검증
    { // 검증 시작
        expect(findConversationMatch(item, "리안 도서관", state.messages)).toEqual({ message: null }); // 제목 안에서 순서가 달라도 찾음
        expect(findConversationMatch(item, "  리안   새벽  ", state.messages)).toEqual({ message: null }); // 빈칸이 많아도 같음
        expect(findConversationMatch(item, "리안 창가", state.messages)?.message?.id).toBe("message-rian-1"); // 이름은 제목에, 다른 낱말은 지난 말에
        expect(findConversationMatch(item, "리안 우산", state.messages)).toBeNull(); // 한 낱말이라도 없으면 찾지 않음
        expect(findConversationMatch({ ...item, locked: true }, "리안 창가", state.messages)).toBeNull(); // 잠긴 대화는 내용으로 찾지 않음
    }); // 검증 종료

    it("같은 말이 여러 번 나오면 가장 최근 것을 고르고, 19+로 잠긴 대화는 내용을 찾지 않는다", () => // 최근·잠금 검증
    { // 검증 시작
        const messages = [...state.messages, { ...state.messages[0], id: "message-rian-extra", content: "창가에 다시 앉았어." }, { ...state.messages[0], id: "message-other-version", versionId: "another-version", content: "창가 이야기" }]; // 같은 낱말이 든 말 추가
        expect(findConversationMatch(item, "창가", messages)?.message?.id).toBe("message-rian-extra"); // 지금 버전의 가장 최근 것
        expect(findConversationMatch({ ...item, locked: true }, "창가", messages)).toBeNull(); // 잠긴 대화
        expect(findConversationMatch({ ...item, locked: true }, "리안", messages)).toEqual({ message: null }); // 이름으로는 찾음
    }); // 검증 종료
}); // 묶음 종료

describe("탐색 태그 여러 개와 메인 조건 기억", () => // 태그·조건 묶음
{ // 묶음 시작
    it("고른 태그를 모두 가진 작품만 남기고 주소에 태그를 되풀이해 적는다", () => // 여러 태그 검증
    { // 검증 시작
        const characters = createInitialState().characters; // 캐릭터
        const one = getCharactersByTags(characters, ["힐링"]); // 태그 하나
        const tag = one[0].tags.find((item) => item !== "힐링") ?? ""; // 첫 작품의 다른 태그
        const two = getCharactersByTags(characters, ["힐링", tag]); // 태그 둘
        expect(two.length).toBeGreaterThan(0); // 결과 있음
        expect(two.length).toBeLessThanOrEqual(one.length); // 더 좁혀짐
        expect(two.every((character) => character.tags.includes("힐링") && character.tags.includes(tag))).toBe(true); // 모두 가짐
        expect(createExploreHref(null)).toBe("/explore"); // 태그 없음
        expect(createExploreHref([])).toBe("/explore"); // 빈 목록
        expect(createExploreHref("힐링")).toBe("/explore?tag=%ED%9E%90%EB%A7%81"); // 하나(전과 같음)
        expect(createExploreHref(["힐링", "SF"])).toBe("/explore?tag=%ED%9E%90%EB%A7%81&tag=SF"); // 여러 개
    }); // 검증 종료

    it("기억해 둔 메인 조건은 모양이 맞을 때만 되살린다", () => // 조건 읽기 검증
    { // 검증 시작
        const filter = { ...createDiscoveryFilter(), query: "리안", tags: ["힐링"], genres: ["판타지"], rating: "teen" as const, onlyNew: true, sort: "popular" as const }; // 고른 조건
        expect(parseStoredFilter(JSON.stringify(filter))).toEqual(filter); // 그대로 되살림
        expect(parseStoredFilter(null)).toBeNull(); // 저장 없음
        expect(parseStoredFilter("{broken")).toBeNull(); // 깨진 글
        expect(parseStoredFilter("null")).toBeNull(); // 빈 값
        expect(parseStoredFilter(JSON.stringify({ ...filter, sort: "random" }))).toBeNull(); // 모르는 정렬
        expect(parseStoredFilter(JSON.stringify({ ...filter, rating: 19 }))).toBeNull(); // 모르는 등급
        expect(parseStoredFilter(JSON.stringify({ ...filter, tags: "힐링" }))).toBeNull(); // 목록이 아님
        expect(parseStoredFilter(JSON.stringify({ ...filter, tags: ["1", "2", "3", "4", "5", "6", "7"] }))?.tags).toHaveLength(TAG_FILTER_LIMIT); // 태그 한도
    }); // 검증 종료
}); // 묶음 종료
