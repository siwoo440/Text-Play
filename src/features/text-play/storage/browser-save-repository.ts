import { IndexedDBTextPlaySaveRepository } from "@/features/text-play/storage/indexeddb-save-repository"; // IndexedDB 저장소
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약

export function createBrowserTextPlaySaveRepository(): TextPlaySaveRepository // 브라우저 저장소 생성
{ // 함수 시작
    try // IndexedDB 생성 시도
    { // 시도 시작
        return new IndexedDBTextPlaySaveRepository(); // IndexedDB 저장소 반환
    } // 시도 종료
    catch // 미지원 처리
    { // 오류 시작
        return new MemoryTextPlaySaveRepository(); // 메모리 저장소 반환
    } // 오류 종료
} // 함수 종료
