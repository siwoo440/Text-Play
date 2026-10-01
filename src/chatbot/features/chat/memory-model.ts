import type { CharacterMemory, MemoryCategory } from "@chatbot/features/core/types"; // 도메인 타입

export const MEMORY_SUMMARY_INTERVAL = 5; // 단기 기억을 만드는 턴 간격
export const MEMORY_LONG_INTERVAL = 15; // 장기 기억으로 묶는 턴 간격
export const MEMORY_CONTENT_LIMIT = 300; // 기억 내용 최대 글자 수
export const memoryCategories: MemoryCategory[] = ["long", "short", "relation", "goal"]; // 분류 순서
export const memoryCategoryLabels: Record<MemoryCategory, string> = { long: "장기 기억", short: "단기 기억", relation: "관계도", goal: "목표" }; // 분류 이름

export type MemoryOrder = "newest" | "oldest"; // 정렬

export interface MemoryPerson // 관계도 인물
{ // 구조 시작
    name: string; // 이름
    level: number; // 호감도
    stage: string; // 관계 단계
    emotion: string; // 감정
} // 구조 종료

export interface AutoMemoryInput // 자동 기억 입력
{ // 구조 시작
    conversationId: string; // 대화
    characterId: string; // 대표 캐릭터
    turn: number; // 현재 턴
    userMessageId: string; // 이번 턴 사용자 메시지
    summary: string; // 요약 문장
    people: MemoryPerson[]; // 관계도 인물
    existing: CharacterMemory[]; // 이 대화의 기존 기억
    now: string; // 생성 시각
} // 구조 종료

export function getConversationMemories(memories: readonly CharacterMemory[], conversationId: string, category: MemoryCategory, order: MemoryOrder = "newest"): CharacterMemory[] // 대화·분류별 기억
{ // 함수 시작
    const list = memories.filter((memory) => memory.conversationId === conversationId && memory.category === category); // 필터
    return list.sort((left, right) => order === "newest" ? right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id) : left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)); // 정렬
} // 함수 종료

export function createMemory(input: { id: string; conversationId: string; characterId: string; category: MemoryCategory; content: string; sourceMessageIds?: string[]; editedByUser: boolean; now: string }): CharacterMemory // 기억 만들기
{ // 함수 시작
    return { id: input.id, conversationId: input.conversationId, characterId: input.characterId, category: input.category, content: input.content.trim().slice(0, MEMORY_CONTENT_LIMIT), sourceMessageIds: input.sourceMessageIds ?? [], editedByUser: input.editedByUser, createdAt: input.now, updatedAt: input.now }; // 기억 반환
} // 함수 종료

export function buildAutoMemories(input: AutoMemoryInput): CharacterMemory[] // 턴 간격마다 단기 기억·관계도·장기 기억 만들기
{ // 함수 시작
    if (input.turn === 0 || input.turn % MEMORY_SUMMARY_INTERVAL !== 0 || input.existing.some((memory) => memory.sourceMessageIds.includes(input.userMessageId))) // 간격·중복 판정
    { // 조건 시작
        return []; // 만들 기억 없음
    } // 조건 종료
    const result: CharacterMemory[] = []; // 결과
    const base = { conversationId: input.conversationId, characterId: input.characterId, editedByUser: false, now: input.now }; // 공통 값
    result.push(createMemory({ ...base, id: `${input.conversationId}-short-${input.turn}`, category: "short", content: `${input.turn}턴까지: ${input.summary}`, sourceMessageIds: [input.userMessageId] })); // 단기 기억
    for (const person of input.people) // 관계도 순회
    { // 순회 시작
        const id = `${input.conversationId}-relation-${person.name}`; // 인물별 고정 식별자
        const previous = input.existing.find((memory) => memory.id === id); // 기존 관계도
        if (previous?.editedByUser === true) // 사용자가 고친 관계도 판정
        { // 조건 시작
            continue; // 사용자 내용 유지
        } // 조건 종료
        const memory = createMemory({ ...base, id, category: "relation", content: `${person.name} · ${person.stage} · ${person.emotion} (호감도 ${person.level})`, sourceMessageIds: [input.userMessageId] }); // 관계도
        result.push(previous === undefined ? memory : { ...memory, createdAt: previous.createdAt }); // 생성 시각 유지
    } // 순회 종료
    if (input.turn % MEMORY_LONG_INTERVAL === 0) // 장기 기억 간격 판정
    { // 조건 시작
        const shorts = [...input.existing.filter((memory) => memory.category === "short"), result[0]].slice(-3).map((memory) => memory.content.replace(/^\d+턴까지: /, "")); // 최근 단기 기억 3개
        result.push(createMemory({ ...base, id: `${input.conversationId}-long-${input.turn}`, category: "long", content: `${input.turn}턴 요약: ${shorts.join(" / ")}`, sourceMessageIds: [input.userMessageId] })); // 장기 기억
    } // 조건 종료
    return result; // 기억 반환
} // 함수 종료

export function selectPromptMemories(memories: readonly CharacterMemory[], conversationId: string, limit = 8): string[] // 응답에 넘길 기억(목표·장기·관계도·최근 단기 순)
{ // 함수 시작
    const order: MemoryCategory[] = ["goal", "long", "relation", "short"]; // 우선순위
    return order.flatMap((category) => getConversationMemories(memories, conversationId, category)).slice(0, limit).map((memory) => `[${memoryCategoryLabels[memory.category]}] ${memory.content}`); // 문장 반환
} // 함수 종료
