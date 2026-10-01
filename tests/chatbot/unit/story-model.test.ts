import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, Story } from "@chatbot/features/core/types"; // 상태 타입
import { addressText, createSessionHref, createStoryConversation, createStoryOpening, deriveDisplayName, ensureConversationForStory, getDiscoverableStories, getMentionedCastMember, getRequiredStoryRating, parseStoryMessage, resolveStoryConversationRoute, STORY_CONTINUE_TEXT, summarizeStoryContent } from "@chatbot/features/story/story-model"; // 스토리 모델

function getStory(state: AppState, id: string): Story // 스토리 조회
{ // 함수 시작
    const story = state.stories.find((item) => item.id === id); // 스토리 검색
    if (story === undefined) // 부재 판정
    { // 조건 시작
        throw new Error(`${id} 스토리가 필요합니다.`); // 준비 오류
    } // 조건 종료
    return story; // 스토리 반환
} // 함수 종료

describe("스토리 모드 모델", () => // 스토리 모델 묶음
{ // 묶음 시작
    it("기본 예시 스토리 3개를 여러 명·한 명 등장인물로 제공한다", () => // 예시 스토리 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(state.stories.map((story) => story.cast.length)).toEqual([3, 2, 1]); // 등장인물 수 확인
        expect(getStory(state, "story-moonlit-archive").cast.map((member) => member.displayName)).toEqual(["리안", "세라", "노아"]); // 이야기 속 이름 확인
    }); // 검증 종료

    it("캐릭터 이름에서 이야기 속 짧은 이름을 만든다", () => // 짧은 이름 검증
    { // 검증 시작
        expect(deriveDisplayName("새벽 도서관의 리안")).toBe("리안"); // 띄어쓰기 이름
        expect(deriveDisplayName("비 오는 교실, 세라")).toBe("세라"); // 쉼표 이름
        expect(deriveDisplayName("하린")).toBe("하린"); // 한 단어 이름
    }); // 검증 종료

    it("한 응답 안의 내레이션과 여러 인물 대사를 나눈다", () => // 대사 나누기 검증
    { // 검증 시작
        const cast = getStory(createInitialState(), "story-moonlit-archive").cast; // 등장인물
        const segments = parseStoryMessage("[내레이션] 달빛이 번진다.\n[리안] 왔구나.\n이어지는 말.\n[세라] 이 페이지, 이상해.\n[낯선 목소리] 누구지?", cast); // 대사 나누기
        expect(segments.map((segment) => [segment.kind, segment.label, segment.characterId, segment.text])).toEqual([["narration", "내레이션", null, "달빛이 번진다."], ["character", "리안", "rian", "왔구나.\n이어지는 말."], ["character", "세라", "sera", "이 페이지, 이상해."], ["unknown", "낯선 목소리", null, "누구지?"]]); // 결과 확인
        expect(parseStoryMessage("표시 없는 첫 줄", cast)).toEqual([{ kind: "narration", label: "내레이션", characterId: null, text: "표시 없는 첫 줄" }]); // 표시 없는 줄 확인
    }); // 검증 종료

    it("미리보기에는 마지막 인물 대사를 이름과 함께 보여 준다", () => // 미리보기 검증
    { // 검증 시작
        const cast = getStory(createInitialState(), "story-moonlit-archive").cast; // 등장인물
        expect(summarizeStoryContent("[내레이션] 바람이 분다.\n[노아] 달이 지기 전에.", cast)).toBe("노아: 달이 지기 전에."); // 대사 미리보기
        expect(summarizeStoryContent("[내레이션] 바람이 분다.", cast)).toBe("바람이 분다."); // 내레이션 미리보기
    }); // 검증 종료

    it("시작 장면은 내레이션과 첫 대사로 만든다", () => // 시작 장면 검증
    { // 검증 시작
        const story = getStory(createInitialState(), "story-moonlit-archive"); // 스토리
        const opening = createStoryOpening(story); // 시작 장면
        expect(opening.split("\n")[0]).toBe(`[내레이션] ${story.opening}`); // 내레이션 확인
        expect(opening).toContain("[리안] 왔구나. 마침 손이 하나 더 필요했어."); // 첫 대사 확인
    }); // 검증 종료

    it("스토리 대화는 등장인물 묶음을 복사해 스토리 모드로 시작한다", () => // 스토리 대화 생성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const result = createStoryConversation(state, "story-moonlit-archive", "2026-10-01T09:00:00.000Z"); // 대화 생성
        expect(result.conversation).toMatchObject({ mode: "story", storyId: "story-moonlit-archive", characterId: "rian", title: "비 그친 밤의 기록관" }); // 대화 확인
        expect(result.conversation.storyCast.map((member) => member.characterId)).toEqual(["rian", "sera", "noah"]); // 등장인물 복사 확인
        expect(result.message.content).toBe(createStoryOpening(getStory(state, "story-moonlit-archive"))); // 첫 메시지 확인
        expect(result.href).toBe(`/stories/story-moonlit-archive/chat?conversation=${encodeURIComponent(result.conversation.id)}&version=${encodeURIComponent(result.version.id)}`); // 이동 주소 확인
        expect(result.state.selectedConversationId).toBe(result.conversation.id); // 선택 확인
    }); // 검증 종료

    it("이미 진행 중인 스토리 대화가 있으면 이어 하고 없으면 새로 만든다", () => // 이어하기 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const first = ensureConversationForStory(state, "story-closing-cafe", "2026-10-01T09:00:00.000Z"); // 첫 준비
        const again = ensureConversationForStory(first.state, "story-closing-cafe", "2026-10-01T10:00:00.000Z"); // 다시 준비
        expect(again.conversation.id).toBe(first.conversation.id); // 이어하기 확인
        expect(again.state.conversations.filter((conversation) => conversation.storyId === "story-closing-cafe")).toHaveLength(1); // 중복 생성 없음 확인
    }); // 검증 종료

    it("스토리 주소의 대화와 버전을 고르고 잘못된 주소는 바로잡는다", () => // 주소 선택 검증
    { // 검증 시작
        const created = createStoryConversation(createInitialState(), "story-star-signal", "2026-10-01T09:00:00.000Z"); // 대화 생성
        const exact = resolveStoryConversationRoute(created.state, "story-star-signal", created.conversation.id, created.version.id); // 정확한 주소
        const broken = resolveStoryConversationRoute(created.state, "story-star-signal", "없는-대화", "없는-버전"); // 잘못된 주소
        expect(exact.recovered).toBe(false); // 정상 주소 확인
        expect(broken.recovered).toBe(true); // 복구 확인
        expect(broken.canonicalHref).toBe(created.href); // 정규 주소 확인
    }); // 검증 종료

    it("대화 종류에 맞는 이동 주소를 만든다", () => // 이동 주소 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const characterConversation = state.conversations[0]; // 캐릭터 대화
        const story = createStoryConversation(state, "story-star-signal", "2026-10-01T09:00:00.000Z"); // 스토리 대화
        expect(createSessionHref(characterConversation)).toBe("/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1"); // 캐릭터 주소
        expect(createSessionHref(story.conversation)).toBe(story.href); // 스토리 주소
    }); // 검증 종료

    it("스토리 등급은 등장인물 중 가장 높은 등급보다 낮을 수 없다", () => // 등급 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const characters = (ids: string[]) => state.characters.filter((character) => ids.includes(character.id)); // 캐릭터 선택
        expect(getRequiredStoryRating(characters(["rian", "harin"]))).toBe("all"); // 전체 이용가
        expect(getRequiredStoryRating(characters(["rian", "sera"]))).toBe("teen"); // 15세
        expect(getRequiredStoryRating(characters(["rian", "rank-017"]))).toBe("mature"); // 19세
    }); // 검증 종료

    it("추천 목록에는 공개 발행 스토리만, 19+는 켰을 때만 보여 준다", () => // 노출 검증
    { // 검증 시작
        const stories = createInitialState().stories; // 기본 스토리
        const mature = { ...stories[0], id: "story-mature", contentRating: "mature" as const }; // 19세 스토리
        const draft = { ...stories[1], id: "story-draft", publicationStatus: "draft" as const }; // 임시 저장 스토리
        const privateStory = { ...stories[2], id: "story-private", visibility: "private" as const }; // 비공개 스토리
        const all = [...stories, mature, draft, privateStory]; // 전체 목록
        expect(getDiscoverableStories(all, false).map((story) => story.id)).toEqual(stories.map((story) => story.id)); // 19+ 끔 확인
        expect(getDiscoverableStories(all, true).map((story) => story.id)).toContain("story-mature"); // 19+ 켬 확인
    }); // 검증 종료

    it("말 걸 상대를 메시지 앞의 @이름으로 붙이고 다시 읽는다", () => // 지목 검증
    { // 검증 시작
        const cast = getStory(createInitialState(), "story-moonlit-archive").cast; // 등장인물
        const text = addressText(cast[1], "이 문장 어디서 봤어?"); // 지목 문장
        expect(text).toBe("@세라 이 문장 어디서 봤어?"); // 지목 표시 확인
        expect(getMentionedCastMember(text, cast)?.characterId).toBe("sera"); // 지목 해석 확인
        expect(getMentionedCastMember("그냥 말하기", cast)).toBeNull(); // 지목 없음 확인
        expect(STORY_CONTINUE_TEXT).toBe("(다음 장면으로)"); // 진행 문구 확인
    }); // 검증 종료
}); // 묶음 종료
