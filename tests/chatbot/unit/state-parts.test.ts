import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 생성
import { ensureConversationForCharacter } from "@chatbot/features/character/character-detail-model"; // 캐릭터 대화 준비
import { hashBody, mergeParts, parseManifest, splitState, stringifyManifest } from "@chatbot/lib/account/state-parts"; // 앱 데이터를 조각으로 나누기

function withTwoConversations(): AppState // 대화 두 개가 있는 앱 데이터
{ // 함수 시작
    const story = createStoryConversation(createInitialState(), "story-moonlit-archive", "2026-10-08T00:00:00.000Z").state; // 스토리 대화
    return ensureConversationForCharacter(story, "harin", "2026-10-08T00:01:00.000Z").state; // 캐릭터 대화
} // 함수 종료

describe("앱 데이터를 조각으로 나누기", () => // 조각 묶음
{ // 묶음 시작
    it("기본 정보·작품·그림과 대화마다 하나씩으로 나누고, 다시 합치면 같은 데이터가 된다", () => // 나누고 합치기
    { // 검증 시작
        const state = withTwoConversations(); // 앱 데이터
        const parts = splitState(JSON.stringify(state)); // 나눔
        const names = Object.keys(parts); // 조각 이름
        expect(names.filter((name) => !name.startsWith("c:")).sort()).toEqual(["core", "images", "works"]); // 기본 조각 셋
        expect(names.filter((name) => name.startsWith("c:")).sort()).toEqual(state.conversations.map((conversation) => `c:${conversation.id}`).sort()); // 대화마다 하나
        expect(JSON.parse(parts.works)).toEqual({ characters: state.characters, stories: state.stories }); // 작품 조각
        expect(JSON.parse(parts.core).characters).toEqual([]); // 기본 조각에는 작품이 없음
        expect(JSON.parse(parts.core).messages).toEqual([]); // 메시지도 없음
        expect(parts.core.length).toBeLessThan(JSON.stringify(state).length / 10); // 기본 조각은 전체보다 훨씬 작음
        const merged = JSON.parse(mergeParts(parts)) as AppState; // 다시 합침
        expect({ ...merged, messages: [], conversationVersions: [] }).toEqual({ ...state, messages: [], conversationVersions: [] }); // 대화 내용 말고는 그대로
        expect(Object.keys(merged)).toEqual(Object.keys(state)); // 항목 순서도 그대로
        const byId = <T extends { id: string }>(list: T[]) => [...list].sort((left, right) => left.id.localeCompare(right.id)); // 식별자 순서로
        expect(byId(merged.messages)).toEqual(byId(state.messages)); // 메시지는 빠짐없이 그대로
        expect(byId(merged.conversationVersions)).toEqual(byId(state.conversationVersions)); // 대화 버전도 그대로
        state.conversations.forEach((conversation) => expect(merged.messages.filter((message) => message.conversationId === conversation.id)).toEqual(state.messages.filter((message) => message.conversationId === conversation.id))); // 한 대화 안의 순서는 그대로
    }); // 검증 종료

    it("합친 것을 다시 나누면 같은 조각이 나오고, 한 대화만 바뀌면 그 조각과 기본 조각만 달라진다", async () => // 바뀐 조각만
    { // 검증 시작
        const state = withTwoConversations(); // 앱 데이터
        const parts = splitState(JSON.stringify(state)); // 나눔
        expect(splitState(mergeParts(parts))).toEqual(parts); // 다시 나눠도 같음(받은 기기와 올린 기기의 조각이 같아야 바뀐 것만 가릴 수 있음)
        const target = state.conversations[0]; // 바꿀 대화
        const changed: AppState = { ...state, wallet: { ...state.wallet, balance: state.wallet.balance - 1 }, messages: state.messages.map((message) => message.conversationId === target.id ? { ...message, content: `${message.content}!` } : message) }; // 한 대화의 말과 잔액이 바뀜
        const next = splitState(JSON.stringify(changed)); // 나눔
        const differing = (await Promise.all(Object.keys(parts).map(async (name) => await hashBody(parts[name]) === await hashBody(next[name]) ? null : name))).filter((name) => name !== null); // 지문이 달라진 조각
        expect(differing.sort()).toEqual([`c:${target.id}`, "core"].sort()); // 그 대화와 기본 조각만
    }); // 검증 종료

    it("대화 목록에 없는 대화의 메시지도 잃지 않고, 앱 데이터 모양이 아니면 통째로 한 조각에 둔다", () => // 빠짐없이 나누기
    { // 검증 시작
        const state = withTwoConversations(); // 앱 데이터
        const orphan = { ...state.messages[0], id: "orphan-message", conversationId: "gone-conversation" }; // 대화 목록에 없는 대화의 메시지
        const parts = splitState(JSON.stringify({ ...state, messages: [...state.messages, orphan] })); // 나눔
        expect(JSON.parse(parts["c:gone-conversation"]).messages).toEqual([orphan]); // 따로 조각이 생김
        expect((JSON.parse(mergeParts(parts)) as AppState).messages.some((message) => message.id === "orphan-message")).toBe(true); // 합쳐도 남아 있음
        expect(splitState("그냥 글")).toEqual({ all: "그냥 글" }); // JSON이 아니면 통째로
        expect(splitState("{\"a\":1}")).toEqual({ all: "{\"a\":1}" }); // 앱 데이터 모양이 아니어도 통째로
        expect(mergeParts({ all: "그냥 글" })).toBe("그냥 글"); // 그대로 돌려줌
    }); // 검증 종료

    it("지문은 내용이 같으면 같고 다르면 다르며, 조각 목록은 모양이 맞을 때만 읽는다", async () => // 지문과 목록
    { // 검증 시작
        expect(await hashBody("같은 글")).toBe(await hashBody("같은 글")); // 같은 내용
        expect(await hashBody("같은 글")).not.toBe(await hashBody("다른 글")); // 다른 내용
        expect(await hashBody("같은 글")).toMatch(/^[A-Za-z0-9_-]{43}$/); // 주소에 넣을 수 있는 글자 43자
        const manifest = { core: "a".repeat(43), "c:one": "b".repeat(43) }; // 조각 목록
        expect(parseManifest(stringifyManifest(manifest))).toEqual(manifest); // 읽기
        expect(parseManifest(JSON.stringify(createInitialState()))).toBeNull(); // 예전처럼 통째로 올린 앱 데이터는 목록이 아님
        expect(parseManifest("깨진 글")).toBeNull(); // 깨진 글
        expect(parseManifest(JSON.stringify({ format: "mv-parts-2", parts: { core: 3 } }))).toBeNull(); // 모양이 다름
    }); // 검증 종료
}); // 묶음 종료
