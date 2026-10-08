import type { StatChange, StatJudgeInput } from "@chatbot/features/chat/stat-model"; // 스탯 판단 형식
import type { Locale } from "@chatbot/lib/i18n"; // 화면 언어
import type { Character, ChatTierId, ContentRating, Conversation, ConversationVersion, LengthMultiplier, Message, ThinkingDepth, WritingStyle } from "@chatbot/features/core/types"; // 도메인 타입

export interface ChatReplyOptions // 대화방 설정에서 온 응답 조건
{ // 구조 시작
    tier: ChatTierId; // 모델 등급
    length: LengthMultiplier; // 답변 최대 길이 배수
    thinking: ThinkingDepth; // 생각 깊이
    writingStyle: WritingStyle; // 문체
    preventImpersonation: boolean; // 유저 사칭 방지
    persona: { name: string; description: string } | null; // 대화 프로필
    userNote: string; // 유저 노트
    memories: string[]; // 요약 메모리
    playGuide: string; // 플레이 가이드
    stats: Array<{ name: string; target: string | null; value: number; min: number; max: number }>; // 지금 스탯 값(역할극에 반영)
    lore: Array<{ title: string; keywords: string[]; content: string }>; // 최근 대화에 키워드가 나온 설정집 내용(가장 최근 것부터)
    examples: Array<{ user: string; reply: string }>; // 말투를 보여 주는 예시 대화
    language?: Locale; // 답변 언어(없으면 한국어)
} // 구조 종료
import type { StoryPromptContext } from "@chatbot/lib/story/mock-story-writer"; // 스토리 문맥

export interface LLMInput // 대화 입력
{ // 구조 시작
    character: Character; // 캐릭터(스토리 모드는 첫 등장인물)
    conversation: Conversation; // 대화방
    version: ConversationVersion; // 대화 버전
    messages: Message[]; // 최근 메시지
    story?: StoryPromptContext; // 스토리 모드 문맥([이름] 대사 형식으로 답함)
    options?: ChatReplyOptions; // 대화방 설정(없으면 기본)
    contentRating?: ContentRating; // 작품 이용 등급(19세 작품은 외부 AI 약관 때문에 연습용 AI로 답함)
} // 구조 종료

export interface SummaryInput // 요약 입력
{ // 구조 시작
    conversation: Conversation; // 대화방
    version: ConversationVersion; // 대화 버전
    messages: Message[]; // 요약 메시지
    userName?: string; // 사용자 이름(대화 프로필). 실제 AI 요약의 대화 줄에 붙임
    speakerName?: string; // 답하는 쪽 이름(캐릭터의 짧은 이름, 스토리는 「이야기」). 없으면 연습용 요약을 씀
    contentRating?: ContentRating; // 작품 이용 등급(19세 작품은 직접 돌리는 모델만 요약)
    language?: Locale; // 요약 언어(없으면 한국어)
} // 구조 종료

export interface LLMAdapter // 대화 어댑터
{ // 구조 시작
    streamReply(input: LLMInput, signal?: AbortSignal): AsyncIterable<string>; // 중단 가능 응답 스트림
    summarizeConversation(input: SummaryInput): Promise<string>; // 대화 요약
    judgeStats?(input: StatJudgeInput, signal?: AbortSignal): Promise<StatChange[]>; // AI가 정하는 스탯 변화(없으면 규칙만 적용)
} // 구조 종료
