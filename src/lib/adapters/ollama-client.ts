import type { LocalAIStreamEvent } from "@/lib/adapters/local-ai-stream"; // 로컬 AI 스트림 사건

export interface OllamaModel // 설치 모델 구조
{ // 구조 시작
    name: string; // 모델 이름
    size: number; // 모델 크기
    modifiedAt: string; // 수정 시각
} // 구조 종료

export interface RunningOllamaModel // 실행 모델 구조
{ // 구조 시작
    name: string; // 모델 이름
    sizeVram: number; // 그래픽 메모리 크기
    contextLength: number; // 문맥 길이
} // 구조 종료

export interface OllamaChatMessage // 대화 메시지 구조
{ // 구조 시작
    role: "system" | "user" | "assistant"; // 메시지 역할
    content: string; // 메시지 내용
} // 구조 종료

export interface OllamaChatRequest // 대화 요청 구조
{ // 구조 시작
    model: string; // 선택 모델
    messages: OllamaChatMessage[]; // 대화 메시지
    format?: "json"; // 응답 형식
} // 구조 종료

export type OllamaStreamEvent = LocalAIStreamEvent; // 스트림 사건 종류(내장 AI와 공통)

export interface OllamaClient // 올라마 통신 계약
{ // 구조 시작
    listModels(): Promise<OllamaModel[]>; // 설치 모델 조회
    listRunningModels(): Promise<RunningOllamaModel[]>; // 실행 모델 조회
    streamChat(request: OllamaChatRequest, signal?: AbortSignal): AsyncIterable<string>; // 대화 스트림
} // 구조 종료
