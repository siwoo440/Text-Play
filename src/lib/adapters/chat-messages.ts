import type { LLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // 대화 입력 계약

export interface ChatMessage // 대화 메시지
{ // 구조 시작
    role: "system" | "user" | "assistant"; // 메시지 역할
    content: string; // 메시지 내용
} // 구조 종료

function createCharacterSystem(input: LLMInput): string // 캐릭터 규칙 생성기
{ // 함수 시작
    return [ // 규칙 목록 반환
        `캐릭터: ${input.character.name}`, // 캐릭터 이름
        `성격: ${input.character.personality}`, // 캐릭터 성격
        `세계관: ${input.character.worldSetting}`, // 세계관
        `대화 규칙: ${input.character.prompt}`, // 제작자 규칙
        `현재 감정: ${input.conversation.emotion}`, // 현재 감정
        `관계 단계: ${input.conversation.relationshipStage}`, // 관계 단계
    ].join("\n"); // 규칙 결합
} // 함수 종료

export function createCharacterMessages(input: LLMInput): ChatMessage[] // 캐릭터 대화 메시지 생성
{ // 함수 시작
    return [{ role: "system", content: createCharacterSystem(input) }, ...input.messages.map((message) => ({ role: message.role, content: message.content }))]; // 메시지 목록 반환
} // 함수 종료

export function createSummaryMessages(input: SummaryInput): ChatMessage[] // 대화 요약 메시지 생성
{ // 함수 시작
    return [ // 메시지 목록 반환
        { role: "system", content: "대화의 핵심 사건과 관계 변화를 한국어 160자 이내로 요약하세요." }, // 요약 규칙
        { role: "user", content: input.messages.map((message) => `${message.role}: ${message.content}`).join("\n") }, // 요약 대상
    ]; // 목록 종료
} // 함수 종료
