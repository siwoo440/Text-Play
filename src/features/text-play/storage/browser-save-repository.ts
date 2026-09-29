import { IndexedDBTextPlaySaveRepository } from "@/features/text-play/storage/indexeddb-save-repository"; // IndexedDB 저장소
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import type { TextPlaySaveSlot, TextPlaySlotId, TextPlayState } from "@/features/text-play/core/types"; // 저장 도메인 계약
import { TextPlayStorageError, type TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약

export const TEXT_PLAY_MEMORY_STORAGE_WARNING = "영구 저장소를 사용할 수 없어 현재 실행 중에만 메모리에 저장합니다."; // 메모리 저장 경고

export class ResilientTextPlaySaveRepository implements TextPlaySaveRepository // 복구 저장소
{ // 함수 시작
    private readonly memoryRepository = new MemoryTextPlaySaveRepository(); // 메모리 저장소
    private activeRepository: TextPlaySaveRepository; // 활성 저장소
    private usingMemory: boolean; // 메모리 사용 상태

    public constructor(primaryRepository: TextPlaySaveRepository | null = null) // 생성자
    { // 시도 시작
        try // IndexedDB 생성 시도
        { // 시도 시작
            this.activeRepository = primaryRepository ?? new IndexedDBTextPlaySaveRepository(); // 기본 저장소 지정
            this.usingMemory = false; // 영구 저장 상태
        } // 시도 종료
        catch // 미지원 처리
        { // 오류 시작
            this.activeRepository = this.memoryRepository; // 메모리 저장소 지정
            this.usingMemory = true; // 메모리 사용 표시
        } // 오류 종료
    } // 생성자 종료

    private async execute<T>(operation: (repository: TextPlaySaveRepository) => Promise<T>): Promise<T> // 저장 작업 실행
    { // 함수 시작
        const attemptedRepository = this.activeRepository; // 작업 시작 저장소
        try // 기본 저장소 시도
        { // 시도 시작
            return await operation(attemptedRepository); // 기본 결과 반환
        } // 시도 종료
        catch (error) // 기본 저장소 실패
        { // 오류 시작
            if (attemptedRepository === this.memoryRepository || (error instanceof TextPlayStorageError && error.code === "invalid-save")) // 대체 금지 확인
            { // 조건 시작
                throw error; // 원래 오류 전달
            } // 조건 종료
            this.activeRepository = this.memoryRepository; // 메모리 저장소 전환
            this.usingMemory = true; // 메모리 사용 표시
            return operation(this.activeRepository); // 메모리 작업 반환
        } // 오류 종료
    } // 함수 종료

    public list(packageId: string): Promise<TextPlaySaveSlot[]> // 슬롯 목록
    { // 함수 시작
        return this.execute((repository) => repository.list(packageId)); // 목록 작업 실행
    } // 함수 종료

    public load(packageId: string, slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null> // 슬롯 읽기
    { // 함수 시작
        return this.execute((repository) => repository.load(packageId, slotId)); // 읽기 작업 실행
    } // 함수 종료

    public save(slotId: TextPlaySlotId, state: TextPlayState, summary: string): Promise<void> // 슬롯 저장
    { // 함수 시작
        return this.execute((repository) => repository.save(slotId, state, summary)); // 저장 작업 실행
    } // 함수 종료

    public remove(packageId: string, slotId: TextPlaySlotId): Promise<void> // 슬롯 삭제
    { // 함수 시작
        return this.execute((repository) => repository.remove(packageId, slotId)); // 삭제 작업 실행
    } // 함수 종료

    public getCorruptSlotIds(packageId: string): TextPlaySlotId[] // 손상 슬롯 조회
    { // 함수 시작
        return this.activeRepository.getCorruptSlotIds?.(packageId) ?? []; // 활성 저장소 결과 반환
    } // 함수 종료

    public getStorageWarning(): string | null // 저장 방식 경고
    { // 함수 시작
        return this.usingMemory ? TEXT_PLAY_MEMORY_STORAGE_WARNING : null; // 경고 반환
    } // 함수 종료
} // 클래스 종료

export function createBrowserTextPlaySaveRepository(): TextPlaySaveRepository // 브라우저 저장소 생성
{ // 함수 시작
    return new ResilientTextPlaySaveRepository(); // 복구 저장소 반환
} // 함수 종료
