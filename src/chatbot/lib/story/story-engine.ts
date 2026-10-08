import type { Conversation, ConversationVersion, RelationshipStage } from "@chatbot/features/core/types"; // 대화 타입

export interface StoryInput // 스토리 입력
{ // 구조 시작
    conversation: Conversation; // 현재 대화
    version: ConversationVersion; // 현재 버전
    userMessage: string; // 사용자 메시지
    userMessageCount: number; // 사용자 메시지 수
} // 구조 종료

export interface StoryUpdate // 스토리 결과
{ // 구조 시작
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
} // 구조 종료

export function resolveRelationshipStage(level: number): RelationshipStage // 관계 단계 계산(15·50·80 기준)
{ // 함수 시작
    if (level >= 80) // 특별 단계 판정
    { // 조건 시작
        return "특별한 사이"; // 특별 단계
    } // 조건 종료
    if (level >= 50) // 가까운 단계 판정
    { // 조건 시작
        return "가까운 사이"; // 가까운 단계
    } // 조건 종료
    if (level >= 15) // 지인 단계 판정
    { // 조건 시작
        return "아는 사이"; // 지인 단계
    } // 조건 종료
    return "첫 만남"; // 첫 단계
} // 함수 종료

export function evaluateStory(input: StoryInput): StoryUpdate // 스토리 판정
{ // 함수 시작
    const positive = /고마|좋아|행복|반가/.test(input.userMessage); // 긍정 표현
    const relationshipLevel = Math.min(100, input.version.relationshipLevel + (positive ? 3 : 1)); // 관계 증가
    return { relationshipLevel, relationshipStage: resolveRelationshipStage(relationshipLevel), emotion: positive ? "기쁨" : "관심" }; // 결과 반환
} // 함수 종료
