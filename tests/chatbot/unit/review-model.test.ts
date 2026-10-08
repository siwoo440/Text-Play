import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { createExcerpt, getBookmarkedMessages, getBookmarkEntries, messageAnchor, moveMatch, sceneCardFileName, searchMessages, toCardText, toPlainText, wrapCardLines } from "@chatbot/features/chat/review-model"; // 다시 보기 규칙
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { LocalStorageGateway } from "@chatbot/lib/repositories/local-storage-gateway"; // 저장소

const say = (id: string, role: "user" | "assistant" | "system", content: string) => ({ id, role, content }); // 메시지 만들기
const narrow = (value: string) => value.length; // 한 글자를 너비 1로 보는 측정

describe("대화 안 검색", () => // 검색 묶음
{ // 묶음 시작
    it("검색어가 든 메시지를 대화 순서대로 찾고 초성으로도 찾는다", () => // 찾기
    { // 검증 시작
        const talk = [say("a", "assistant", "이 자리는 늘 네가 오던 창가야."), say("b", "user", "오늘 기록할 이야기가 많아."), say("c", "system", "자리 안내"), say("d", "assistant", "오늘도 네 자리를 남겨뒀어.")]; // 대화
        expect(searchMessages(talk, "자리")).toEqual(["a", "d"]); // 안내 메시지는 제외
        expect(searchMessages(talk, "  기록  ")).toEqual(["b"]); // 앞뒤 공백 무시
        expect(searchMessages(talk, "ㅊㄱ")).toEqual(["a"]); // 초성(창가)
        expect(searchMessages(talk, "없는말")).toEqual([]); // 없음
        expect(searchMessages(talk, " ")).toEqual([]); // 빈 검색어
    }); // 검증 종료

    it("찾은 말 사이는 끝에서 처음으로 돌아가며 옮긴다", () => // 이동
    { // 검증 시작
        expect([moveMatch(3, 0, 1), moveMatch(3, 2, 1), moveMatch(3, 0, -1), moveMatch(1, 0, 1)]).toEqual([1, 0, 2, 0]); // 돌아가며 이동
        expect(moveMatch(0, -1, 1)).toBe(-1); // 찾은 말 없음
    }); // 검증 종료

    it("메시지 표식은 메시지 식별자로 만든다", () => // 표식
    { // 검증 시작
        expect(messageAnchor("message-rian-3")).toBe("message-message-rian-3"); // 표식
    }); // 검증 종료
}); // 묶음 종료

describe("명장면 카드 글", () => // 카드 묶음
{ // 묶음 시작
    it("지문 별표와 줄바꿈을 정리하고 길면 줄임표로 줄인다", () => // 글 다듬기
    { // 검증 시작
        expect(toPlainText("*고개를 든다.*\n\n오늘도  왔구나.")).toBe("고개를 든다. 오늘도 왔구나."); // 정리
        expect(createExcerpt("가".repeat(100), 10)).toBe(`${"가".repeat(9)}…`); // 길면 줄임
        expect(createExcerpt("짧은 글", 10)).toBe("짧은 글"); // 짧으면 그대로
        expect(toCardText("가".repeat(300))).toHaveLength(220); // 카드 글자 한도
    }); // 검증 종료

    it("카드 너비에 맞춰 띄어쓰기에서 줄을 나누고 긴 낱말은 글자 단위로 나눈다", () => // 줄 나누기
    { // 검증 시작
        expect(wrapCardLines("오늘도 네 자리를 남겨뒀어", 8, narrow)).toEqual(["오늘도 네", "자리를 남겨뒀어"]); // 띄어쓰기 기준(여덟 글자까지 한 줄)
        expect(wrapCardLines("오늘도 네 자리를 남겨뒀어", 5, narrow)).toEqual(["오늘도 네", "자리를", "남겨뒀어"]); // 더 좁으면 낱말마다
        expect(wrapCardLines("가나다라마바사아자차", 4, narrow)).toEqual(["가나다라", "마바사아", "자차"]); // 긴 낱말
        expect(wrapCardLines("", 4, narrow)).toEqual([]); // 빈 글
        const long = wrapCardLines(Array.from({ length: 12 }, (_item, index) => `낱말${index}`).join(" "), 4, narrow, 3); // 줄 수 제한
        expect(long).toHaveLength(3); // 세 줄
        expect(long[2].endsWith("…")).toBe(true); // 마지막 줄 줄임표
        expect(long.every((line) => line.length <= 4)).toBe(true); // 너비를 넘지 않음
    }); // 검증 종료

    it("저장 파일 이름은 작품 이름과 서울 날짜로 만들고 쓸 수 없는 글자는 바꾼다", () => // 파일 이름
    { // 검증 시작
        expect(sceneCardFileName("새벽 도서관의 리안", new Date("2026-10-03T16:30:00.000Z"))).toBe("mateverse-scene-새벽-도서관의-리안-20261004.png"); // 서울은 다음 날 새벽
        expect(sceneCardFileName(' a/b:c*?"<>| ', new Date("2026-10-03T01:00:00.000Z"))).toBe("mateverse-scene-a-b-c-20261003.png"); // 금지 글자 정리
        expect(sceneCardFileName("   ", new Date("2026-10-03T01:00:00.000Z"))).toBe("mateverse-scene-card-20261003.png"); // 이름 없음
    }); // 검증 종료
}); // 묶음 종료

describe("답변 책갈피", () => // 책갈피 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("답변에만 책갈피를 넣고, 다시 누르면 표시를 없앤다", () => // 전환
    { // 검증 시작
        const state = createInitialState(); // 초기 상태(리안 대화: 답변·내 말·답변)
        const marked = appReducer(state, { type: "toggle-message-bookmark", messageId: "message-rian-3" }); // 책갈피 넣기
        expect(marked.messages.find((message) => message.id === "message-rian-3")?.bookmarked).toBe(true); // 표시
        expect(getBookmarkedMessages(marked.messages).map((message) => message.id)).toEqual(["message-rian-3"]); // 한 건
        const cleared = appReducer(marked, { type: "toggle-message-bookmark", messageId: "message-rian-3" }); // 빼기
        expect("bookmarked" in cleared.messages.find((message) => message.id === "message-rian-3")!).toBe(false); // 항목 자체가 없음
        expect(appReducer(state, { type: "toggle-message-bookmark", messageId: "message-rian-2" })).toBe(state); // 내 말에는 넣지 않음
        expect(appReducer(state, { type: "toggle-message-bookmark", messageId: "없는-메시지" })).toBe(state); // 없는 메시지
    }); // 검증 종료

    it("모든 대화방의 책갈피를 최근 답변 순으로 모으고 그 답변으로 가는 주소를 붙인다", () => // 모아 보기
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        expect(getBookmarkEntries(base)).toEqual([]); // 처음에는 없음
        const sera = base.messages.find((message) => message.conversationId === "conversation-sera" && message.role === "assistant")!; // 세라 답변
        const state = [sera.id, "message-rian-1", "message-rian-3"].reduce<AppState>((current, messageId) => appReducer(current, { type: "toggle-message-bookmark", messageId }), base); // 세 답변 책갈피
        const entries = getBookmarkEntries(state); // 모으기
        expect(entries).toHaveLength(3); // 세 건
        expect([...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt))).toEqual(entries); // 최근 답변이 앞
        const rian = entries.find((entry) => entry.messageId === "message-rian-3")!; // 리안 답변
        expect(rian).toMatchObject({ conversationId: "conversation-rian", title: "새벽 도서관의 리안", excerpt: "오늘도 네 자리를 남겨뒀어.", href: "/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1&message=message-rian-3" }); // 주소와 글
    }); // 검증 종료

    it("책갈피 표시는 참·거짓만 저장하고 예전 데이터(표시 없음)는 그대로 읽는다", () => // 저장 검사
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이
        const withMark = (value: unknown) => ({ ...state, messages: state.messages.map((message) => message.id === "message-rian-3" ? { ...message, bookmarked: value } : message) }) as unknown as AppState; // 표시 바꾸기
        expect(() => gateway.save(state)).not.toThrow(); // 표시 없음
        expect(() => gateway.save(withMark(true))).not.toThrow(); // 참
        expect(() => gateway.save(withMark(false))).not.toThrow(); // 거짓
        expect(() => gateway.save(withMark("예"))).toThrow(TypeError); // 다른 값 거부
        gateway.save(withMark(true)); // 책갈피 저장
        expect(new LocalStorageGateway(localStorage).load().state.messages.find((message) => message.id === "message-rian-3")?.bookmarked).toBe(true); // 다시 읽어도 유지
    }); // 검증 종료
}); // 묶음 종료
