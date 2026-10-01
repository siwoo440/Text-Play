import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { createCharacterMessages, createSummaryMessages } from "@/lib/adapters/chat-messages"; // 대화 메시지 생성기

describe("캐릭터 대화 메시지", () => // 메시지 묶음
{ // 묶음 시작
    it("캐릭터 규칙을 시스템 메시지로 두고 최근 메시지를 이어 붙인다", () => // 대화 메시지 검증
    { // 테스트 시작
        const state = createInitialState(); // 초기 상태
        const conversation = state.conversations[0]; // 첫 대화방
        const character = state.characters.find((item) => item.id === conversation.characterId) ?? state.characters[0]; // 대화 캐릭터
        const messages = state.messages.filter((message) => message.conversationId === conversation.id); // 대화 메시지
        const result = createCharacterMessages({ character, conversation, messages }); // 메시지 생성
        expect(result[0]).toEqual( // 시스템 메시지 확인
        { // 기대값 시작
            role: "system", // 시스템 역할
            content: [`캐릭터: ${character.name}`, `성격: ${character.personality}`, `세계관: ${character.worldSetting}`, `대화 규칙: ${character.prompt}`, `현재 감정: ${conversation.emotion}`, `관계 단계: ${conversation.relationshipStage}`].join("\n"), // 캐릭터 규칙
        }); // 기대값 종료
        expect(result.slice(1)).toEqual(messages.map((message) => ({ role: message.role, content: message.content }))); // 최근 메시지 확인
    }); // 테스트 종료

    it("요약 요청은 160자 규칙과 역할별 대화 기록으로 만든다", () => // 요약 메시지 검증
    { // 테스트 시작
        const state = createInitialState(); // 초기 상태
        const conversation = state.conversations[0]; // 첫 대화방
        const messages = state.messages.filter((message) => message.conversationId === conversation.id).slice(0, 2); // 요약 대상
        expect(createSummaryMessages({ conversation, messages })).toEqual( // 요약 메시지 확인
        [ // 기대 목록 시작
            { role: "system", content: "대화의 핵심 사건과 관계 변화를 한국어 160자 이내로 요약하세요." }, // 요약 규칙
            { role: "user", content: messages.map((message) => `${message.role}: ${message.content}`).join("\n") }, // 요약 대상
        ]); // 기대 목록 종료
    }); // 테스트 종료
}); // 묶음 종료
