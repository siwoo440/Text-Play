import type { StructuredLLMInput } from "@/lib/adapters/llm-adapter"; // 구조화 입력 계약

export interface StructuredChatMessage // 구조화 대화 메시지
{ // 구조 시작
    role: "system" | "user"; // 메시지 역할
    content: string; // 메시지 내용
} // 구조 종료

export function createStructuredMessages(input: StructuredLLMInput): StructuredChatMessage[] // 구조화 응답 메시지 생성
{ // 함수 시작
    return [ // 메시지 목록 반환
        { role: "system", content: `${input.system}\n\n응답 형식:\n${input.responseSchema}` }, // 시스템 규칙
        { role: "user", content: `${input.context}\n\n사용자 행동:\n${input.userInput}` }, // 문맥과 사용자 입력
    ]; // 목록 종료
} // 함수 종료
