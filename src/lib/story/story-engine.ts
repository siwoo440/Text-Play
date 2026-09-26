import type { Conversation, RelationshipStage } from "@/features/core/types"; // 대화 타입

export interface StoryInput // 스토리 입력
{ // 구조 시작
    conversation: Conversation; // 현재 대화
    userMessage: string; // 사용자 메시지
    userMessageCount: number; // 사용자 메시지 수
} // 구조 종료

export interface StoryUpdate // 스토리 결과
{ // 구조 시작
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
    importantEvent: boolean; // 중요 사건
    sceneId: string; // 장면 식별자
} // 구조 종료

function resolveStage(level: number): RelationshipStage // 관계 단계 계산
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

function resolveScene(characterId: string): string // 장면 계산
{ // 함수 시작
    if (characterId === "rian") // 리안 판정
    { // 조건 시작
        return "dawn"; // 새벽 장면
    } // 조건 종료
    if (characterId === "sera") // 세라 판정
    { // 조건 시작
        return "rain"; // 비 장면
    } // 조건 종료
    if (characterId === "noah") // 노아 판정
    { // 조건 시작
        return "library"; // 기록관 장면
    } // 조건 종료
    return "fallback"; // 대체 장면
} // 함수 종료

export function evaluateStory(input: StoryInput): StoryUpdate // 스토리 판정
{ // 함수 시작
    const positive = /고마|좋아|행복|반가/.test(input.userMessage); // 긍정 표현
    const relationshipLevel = Math.min(100, input.conversation.relationshipLevel + (positive ? 3 : 1)); // 관계 증가
    const importantEvent = input.userMessageCount > 0 && input.userMessageCount % 3 === 0; // 중요 사건 판정
    return { relationshipLevel, relationshipStage: resolveStage(relationshipLevel), emotion: positive ? "기쁨" : "관심", importantEvent, sceneId: resolveScene(input.conversation.characterId) }; // 결과 반환
} // 함수 종료
