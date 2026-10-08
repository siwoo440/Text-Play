import { selectPromptMemories } from "@chatbot/features/chat/memory-model"; // 응답에 넘길 기억
import { createDefaultConversationSettings } from "@chatbot/features/core/defaults"; // 기본 설정
import type { AppState, ConversationSettings, ExampleDialogue, LoreEntry } from "@chatbot/features/core/types"; // 도메인 타입

export interface ChatContext // 응답 요청 직전에 넘기는 대화 맥락
{ // 구조 시작
    settings: ConversationSettings; // 대화방 설정
    persona: { name: string; description: string } | null; // 대화 프로필
    memories: string[]; // 요약 메모리 문장
    playGuide: string; // 플레이 가이드
    lorebook: LoreEntry[]; // 작품의 키워드 설정집
    examples: ExampleDialogue[]; // 작품의 예시 대화
} // 구조 종료

export function buildChatContext(state: AppState, conversationId: string): ChatContext // 전역 상태에서 대화 맥락 만들기
{ // 함수 시작
    const conversation = state.conversations.find((item) => item.id === conversationId); // 대화
    const settings = conversation?.settings ?? createDefaultConversationSettings(); // 설정
    const persona = state.personas.find((item) => item.id === settings.personaId) ?? state.personas[0] ?? null; // 고른 프로필(없으면 기본)
    const work = conversation?.mode === "story" ? state.stories.find((story) => story.id === conversation.storyId) : state.characters.find((character) => character.id === conversation?.characterId); // 작품
    return { settings: structuredClone(settings), persona: persona === null ? null : { name: persona.name, description: persona.description }, memories: selectPromptMemories(state.memories, conversationId), playGuide: work?.playGuide ?? "", lorebook: structuredClone(work?.lorebook ?? []), examples: structuredClone(work?.examples ?? []) }; // 맥락 반환
} // 함수 종료
