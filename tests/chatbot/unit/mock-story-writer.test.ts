import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { Message, StoryCastMember } from "@chatbot/features/core/types"; // 도메인 타입
import { parseStoryMessage, STORY_CONTINUE_TEXT } from "@chatbot/features/story/story-model"; // 스토리 모델
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { composeStoryReply } from "@chatbot/lib/story/mock-story-writer"; // Mock 스토리 작성기

function userMessage(content: string, index = 1): Message // 사용자 메시지 생성
{ // 함수 시작
    return { id: `user-${index}`, conversationId: "story", versionId: "story-version", sourceMessageId: null, role: "user", content, emotion: null, sceneEvent: null, createdAt: `2026-10-01T00:0${index}:00.000Z` }; // 메시지 반환
} // 함수 종료

function castOf(storyId: string): StoryCastMember[] // 등장인물 조회
{ // 함수 시작
    return createInitialState().stories.find((story) => story.id === storyId)?.cast ?? []; // 등장인물 반환
} // 함수 종료

describe("Mock 스토리 응답", () => // 스토리 응답 묶음
{ // 묶음 시작
    it("내레이션 뒤에 등장인물 대사가 이름 표시와 함께 이어진다", () => // 응답 형식 검증
    { // 검증 시작
        const cast = castOf("story-moonlit-archive"); // 등장인물
        const reply = composeStoryReply({ story: { title: "비 그친 밤의 기록관", synopsis: "", userRole: "", cast }, messages: [userMessage("여긴 어디야?")], seed: 1 }); // 응답 생성
        const segments = parseStoryMessage(reply, cast); // 대사 나누기
        expect(segments[0]?.kind).toBe("narration"); // 내레이션 우선 확인
        expect(segments.slice(1).length).toBeGreaterThanOrEqual(1); // 대사 존재 확인
        expect(segments.slice(1).every((segment) => segment.kind === "character")).toBe(true); // 등장인물 대사 확인
    }); // 검증 종료

    it("같은 입력에는 같은 응답을 만든다", () => // 결정성 검증
    { // 검증 시작
        const cast = castOf("story-moonlit-archive"); // 등장인물
        const input = { story: { title: "비 그친 밤의 기록관", synopsis: "", userRole: "", cast }, messages: [userMessage("단서를 찾자")], seed: 3 }; // 같은 입력
        expect(composeStoryReply(input)).toBe(composeStoryReply(input)); // 결과 일치 확인
    }); // 검증 종료

    it("@이름으로 지목한 인물이 먼저 대답한다", () => // 지목 응답 검증
    { // 검증 시작
        const cast = castOf("story-moonlit-archive"); // 등장인물
        for (const member of cast) // 인물 순회
        { // 순회 시작
            const reply = composeStoryReply({ story: { title: "", synopsis: "", userRole: "", cast }, messages: [userMessage(`@${member.displayName} 어떻게 생각해?`)], seed: 1 }); // 지목 응답
            const firstLine = parseStoryMessage(reply, cast).find((segment) => segment.kind === "character"); // 첫 대사
            expect(firstLine?.characterId).toBe(member.characterId); // 지목 인물 확인
        } // 순회 종료
    }); // 검증 종료

    it("한 명뿐인 스토리는 그 인물만 말한다", () => // 단독 스토리 검증
    { // 검증 시작
        const cast = castOf("story-star-signal"); // 한 명 등장인물
        const reply = composeStoryReply({ story: { title: "", synopsis: "", userRole: "", cast }, messages: [userMessage(STORY_CONTINUE_TEXT)], seed: 7 }); // 진행 응답
        const speakers = parseStoryMessage(reply, cast).filter((segment) => segment.kind === "character").map((segment) => segment.characterId); // 화자 목록
        expect(new Set(speakers)).toEqual(new Set(["kyle"])); // 단독 화자 확인
    }); // 검증 종료

    it("Mock 대화 어댑터가 스토리 입력이면 스토리 형식으로 흘려보낸다", async () => // 어댑터 연결 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const cast = castOf("story-moonlit-archive"); // 등장인물
        const story = { title: "비 그친 밤의 기록관", synopsis: "", userRole: "", cast }; // 스토리 입력
        const messages = [userMessage("@노아 달은 언제 져?")]; // 대화 입력
        let streamed = ""; // 스트림 누적
        for await (const chunk of new MockLLMAdapter({ delayMs: 0, seed: 1 }).streamReply({ character: state.characters[0], conversation: state.conversations[0], version: state.conversationVersions[0], messages, story })) // 스트림 순회
        { // 순회 시작
            streamed += chunk; // 조각 누적
        } // 순회 종료
        expect(streamed).toBe(composeStoryReply({ story, messages, seed: 1 })); // 같은 응답 확인
    }); // 검증 종료
}); // 묶음 종료
