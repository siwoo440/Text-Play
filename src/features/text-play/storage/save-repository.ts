import type { TextPlaySaveSlot, TextPlaySlotId, TextPlayState } from "@/features/text-play/core/types"; // 저장 도메인 계약

export type TextPlayStorageErrorCode = "unavailable" | "write-failed" | "invalid-save"; // 저장 오류 종류

export class TextPlayStorageError extends Error // 저장소 오류
{ // 클래스 시작
    public readonly code: TextPlayStorageErrorCode; // 오류 코드

    public constructor(code: TextPlayStorageErrorCode) // 생성자
    { // 생성자 시작
        super(code); // 기본 오류 생성
        this.name = "TextPlayStorageError"; // 오류 이름
        this.code = code; // 오류 코드 저장
    } // 생성자 종료
} // 클래스 종료

export interface TextPlaySaveRepository // 저장소 계약
{ // 구조 시작
    list(packageId: string): Promise<TextPlaySaveSlot[]>; // 슬롯 목록
    load(packageId: string, slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null>; // 슬롯 읽기
    save(slotId: TextPlaySlotId, state: TextPlayState, summary: string): Promise<void>; // 슬롯 저장
    remove(packageId: string, slotId: TextPlaySlotId): Promise<void>; // 슬롯 삭제
} // 구조 종료

function isRecord(value: unknown): value is Record<string, unknown> // 객체 확인
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 판정 반환
} // 함수 종료

function isStringArray(value: unknown): value is string[] // 문자열 배열 확인
{ // 함수 시작
    return Array.isArray(value) && value.every((item) => typeof item === "string"); // 배열 판정 반환
} // 함수 종료

function isTextPlayState(value: unknown): value is TextPlayState // 게임 상태 확인
{ // 함수 시작
    if (!isRecord(value) || !isRecord(value.stats) || !isRecord(value.relations) || !isRecord(value.inventory) || !isRecord(value.eventFlags)) // 객체 필드 확인
    { // 조건 시작
        return false; // 잘못된 상태 반환
    } // 조건 종료
    return typeof value.packageId === "string" // 작품 식별자 확인
        && typeof value.packageVersion === "string" // 작품 버전 확인
        && typeof value.saveSchemaVersion === "number" // 스키마 버전 확인
        && typeof value.sceneId === "string" // 장면 확인
        && typeof value.locationId === "string" // 위치 확인
        && typeof value.stats.hp === "number" // 체력 확인
        && typeof value.stats.sanity === "number" // 정신력 확인
        && typeof value.stats.gold === "number" // 골드 확인
        && isStringArray(value.activeQuestIds) // 진행 퀘스트 확인
        && isStringArray(value.completedQuestIds) // 완료 퀘스트 확인
        && (value.endingId === null || typeof value.endingId === "string") // 엔딩 확인
        && Array.isArray(value.log) // 기록 확인
        && typeof value.playTimeSeconds === "number" // 플레이 시간 확인
        && typeof value.updatedAt === "string"; // 갱신 시각 확인
} // 함수 종료

export function validateTextPlaySaveSlot(value: unknown): TextPlaySaveSlot // 저장 슬롯 검증
{ // 함수 시작
    if (!isRecord(value) // 슬롯 객체 확인
        || typeof value.key !== "string" // 저장 키 확인
        || !["auto", "manual-1", "manual-2", "manual-3"].includes(String(value.slotId)) // 슬롯 식별자 확인
        || typeof value.packageId !== "string" // 작품 식별자 확인
        || typeof value.summary !== "string" // 진행 요약 확인
        || typeof value.savedAt !== "string" // 저장 시각 확인
        || !isTextPlayState(value.state) // 게임 상태 확인
        || value.key !== `${value.packageId}:${String(value.slotId)}` // 저장 키 일치 확인
        || value.state.packageId !== value.packageId) // 상태 작품 일치 확인
    { // 조건 시작
        throw new TextPlayStorageError("invalid-save"); // 손상 오류 발생
    } // 조건 종료
    return value as unknown as TextPlaySaveSlot; // 검증 슬롯 반환
} // 함수 종료

export function cloneTextPlaySaveSlot(slot: TextPlaySaveSlot): TextPlaySaveSlot // 저장 슬롯 복제
{ // 함수 시작
    return JSON.parse(JSON.stringify(slot)) as TextPlaySaveSlot; // 독립 복사 반환
} // 함수 종료
