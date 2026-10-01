import { describe, expect, it } from "vitest"; // 테스트 도구
import { buildConversationListItems, CONVERSATION_PIN_LIMIT, formatConversationTime, groupConversationItems, matchesConversationQuery, matchesKoreanText, sortConversationItems } from "@chatbot/features/conversation/conversation-list-model"; // 대화 목록 계산
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, Message } from "@chatbot/features/core/types"; // 상태 타입

const now = new Date("2026-10-01T03:00:00.000Z"); // 기준 시각(서울 정오)

function withActivity(state: AppState, conversationId: string, updatedAt: string): AppState // 활동 시각 지정
{ // 함수 시작
    return ( // 상태 반환
    { // 상태 시작
        ...state, // 기존 상태
        conversations: state.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt } : conversation), // 대화 시각 변경
        conversationVersions: state.conversationVersions.map((version) => version.conversationId === conversationId ? { ...version, updatedAt } : version), // 버전 시각 변경
    }); // 상태 종료
} // 함수 종료

function userMessage(conversationId: string, versionId: string, index: number): Message // 사용자 메시지 생성
{ // 함수 시작
    return { id: `${conversationId}-user-${index}`, conversationId, versionId, sourceMessageId: null, role: "user", content: `질문 ${index}`, emotion: null, sceneEvent: null, createdAt: `2026-09-30T0${index}:00:00.000Z` }; // 메시지 반환
} // 함수 종료

describe("왼쪽 대화방 목록 계산", () => // 목록 계산 묶음
{ // 묶음 시작
    it("보관한 대화를 빼고 현재 버전의 사용자 메시지 수를 턴으로 센다", () => // 목록 구성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.conversations = state.conversations.map((conversation) => conversation.id === "conversation-noah" ? { ...conversation, archivedAt: "2026-09-30T00:00:00.000Z" } : conversation); // 노아 보관
        state.messages.push(userMessage("conversation-sera", "conversation-sera-version-1", 1), userMessage("conversation-sera", "conversation-sera-version-1", 2)); // 세라 사용자 메시지
        state.messages.push(userMessage("conversation-sera", "다른-버전", 3)); // 다른 버전 메시지
        const items = buildConversationListItems(state, now); // 목록 생성
        expect(items.map((item) => item.conversation.id)).toEqual(["conversation-rian", "conversation-sera"]); // 보관 제외 확인
        expect(items.find((item) => item.conversation.id === "conversation-rian")?.turnCount).toBe(1); // 리안 턴 확인
        expect(items.find((item) => item.conversation.id === "conversation-sera")?.turnCount).toBe(2); // 세라 턴 확인
    }); // 검증 종료

    it("대화방과 현재 버전 중 더 최근 시각을 마지막 활동으로 쓴다", () => // 활동 시각 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.conversations = state.conversations.map((conversation) => conversation.id === "conversation-noah" ? { ...conversation, updatedAt: "2026-09-30T10:00:00.000Z" } : conversation); // 대화 시각만 변경
        const noah = buildConversationListItems(state, now).find((item) => item.conversation.id === "conversation-noah"); // 노아 항목
        expect(noah?.lastActivityAt).toBe("2026-09-30T10:00:00.000Z"); // 최근 시각 확인
    }); // 검증 종료

    it("19+ 잠금 대화와 고정 대화를 표시한다", () => // 상태 표시 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.characters = state.characters.map((character) => character.id === "sera" ? { ...character, contentRating: "mature" } : character); // 세라 19세 지정
        state.pinnedConversationIds = ["conversation-noah"]; // 노아 고정
        const items = buildConversationListItems(state, now); // 목록 생성
        expect(items.find((item) => item.conversation.id === "conversation-sera")?.locked).toBe(true); // 잠금 확인
        expect(items.find((item) => item.conversation.id === "conversation-noah")?.pinned).toBe(true); // 고정 확인
        expect(items.find((item) => item.conversation.id === "conversation-rian")?.pinned).toBe(false); // 비고정 확인
    }); // 검증 종료

    it("정렬 기준마다 순서를 바꾸고 같은 값은 최근 대화를 앞에 둔다", () => // 정렬 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.messages.push(...[1, 2, 3].map((index) => userMessage("conversation-noah", "conversation-noah-version-1", index))); // 노아 턴 추가
        const items = buildConversationListItems(state, now); // 목록 생성
        const ids = (sort: Parameters<typeof sortConversationItems>[1]) => sortConversationItems(items, sort).map((item) => item.conversation.id); // 정렬 결과
        expect(ids("recent")).toEqual(["conversation-rian", "conversation-sera", "conversation-noah"]); // 최근순 확인
        expect(ids("relationship")).toEqual(["conversation-rian", "conversation-sera", "conversation-noah"]); // 관계순 확인
        expect(ids("turns")).toEqual(["conversation-noah", "conversation-rian", "conversation-sera"]); // 턴순 확인
        expect(ids("title")).toEqual(["conversation-noah", "conversation-sera", "conversation-rian"]); // 이름순 확인
    }); // 검증 종료

    it("최근순에서는 고정됨·오늘·어제·최근 7일·이전으로 묶는다", () => // 날짜 묶음 검증
    { // 검증 시작
        let state = createInitialState(); // 초기 상태
        state = withActivity(state, "conversation-rian", "2026-09-30T16:00:00.000Z"); // 서울 10월 1일 새벽
        state = withActivity(state, "conversation-sera", "2026-09-30T14:00:00.000Z"); // 서울 9월 30일 밤
        state = withActivity(state, "conversation-noah", "2026-09-27T03:00:00.000Z"); // 서울 9월 27일
        const items = buildConversationListItems(state, now); // 목록 생성
        const groups = groupConversationItems(items, "recent", [], now); // 묶음 생성
        expect(groups.map((group) => [group.label, group.items.map((item) => item.conversation.id)])).toEqual([["오늘", ["conversation-rian"]], ["어제", ["conversation-sera"]], ["최근 7일", ["conversation-noah"]]]); // 날짜 묶음 확인
        const pinnedState = { ...state, pinnedConversationIds: ["conversation-noah", "conversation-sera"] }; // 고정 상태
        const pinnedGroups = groupConversationItems(buildConversationListItems(pinnedState, now), "recent", pinnedState.pinnedConversationIds, now); // 고정 묶음 생성
        expect(pinnedGroups[0]?.label).toBe("고정됨"); // 고정 묶음 우선 확인
        expect(pinnedGroups[0]?.items.map((item) => item.conversation.id)).toEqual(["conversation-noah", "conversation-sera"]); // 고정 순서 확인
        expect(pinnedGroups.slice(1).map((group) => group.label)).toEqual(["오늘"]); // 나머지 묶음 확인
    }); // 검증 종료

    it("최근순이 아니면 고정 외 대화를 한 묶음으로 보여 준다", () => // 단일 묶음 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const groups = groupConversationItems(buildConversationListItems(state, now), "title", [], now); // 이름순 묶음
        expect(groups).toHaveLength(1); // 묶음 수 확인
        expect(groups[0]?.label).toBe("전체 대화"); // 묶음 이름 확인
    }); // 검증 종료

    it("마지막 활동 시각을 짧은 한국어 상대 시간으로 표시한다", () => // 상대 시간 검증
    { // 검증 시작
        expect(formatConversationTime("2026-10-01T02:59:40.000Z", now)).toBe("방금 전"); // 1분 미만
        expect(formatConversationTime("2026-10-01T02:47:00.000Z", now)).toBe("13분 전"); // 분 단위
        expect(formatConversationTime("2026-09-30T16:00:00.000Z", now)).toBe("11시간 전"); // 같은 날 시간 단위
        expect(formatConversationTime("2026-09-30T14:00:00.000Z", now)).toBe("어제"); // 어제
        expect(formatConversationTime("2026-09-27T03:00:00.000Z", now)).toBe("4일 전"); // 일 단위
        expect(formatConversationTime("2026-09-22T06:20:00.000Z", now)).toBe("9월 22일"); // 올해 날짜
        expect(formatConversationTime("2025-12-30T06:20:00.000Z", now)).toBe("2025. 12. 30."); // 지난해 날짜
    }); // 검증 종료

    it("띄어쓰기와 대소문자를 무시하고 초성만으로도 찾는다", () => // 초성 검색 검증
    { // 검증 시작
        expect(matchesKoreanText("새벽 도서관의 리안", "새벽도서관")).toBe(true); // 띄어쓰기 무시
        expect(matchesKoreanText("새벽 도서관의 리안", "ㄹㅇ")).toBe(true); // 초성 검색
        expect(matchesKoreanText("새벽 도서관의 리안", "ㄷ서ㄱ")).toBe(true); // 초성 섞어 검색
        expect(matchesKoreanText("별 항해사 카일 SF", "sf")).toBe(true); // 대소문자 무시
        expect(matchesKoreanText("새벽 도서관의 리안", "ㅋㅇ")).toBe(false); // 불일치 확인
    }); // 검증 종료

    it("잠긴 19+ 대화는 최근 메시지로 검색되지 않는다", () => // 잠금 검색 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.characters = state.characters.map((character) => character.id === "sera" ? { ...character, contentRating: "mature" } : character); // 세라 19세 지정
        const sera = buildConversationListItems(state, now).find((item) => item.conversation.id === "conversation-sera"); // 세라 항목
        if (sera === undefined) // 항목 부재 확인
        { // 조건 시작
            throw new Error("세라 대화가 필요합니다."); // 준비 오류
        } // 조건 종료
        expect(matchesConversationQuery(sera, "우산")).toBe(false); // 메시지 검색 차단
        expect(matchesConversationQuery(sera, "세라")).toBe(true); // 이름 검색 허용
        expect(matchesConversationQuery({ ...sera, locked: false }, "우산")).toBe(true); // 잠금 해제 시 검색
    }); // 검증 종료

    it("대화방 고정은 최대 5개다", () => // 고정 한도 검증
    { // 검증 시작
        expect(CONVERSATION_PIN_LIMIT).toBe(5); // 한도 확인
    }); // 검증 종료
}); // 묶음 종료
