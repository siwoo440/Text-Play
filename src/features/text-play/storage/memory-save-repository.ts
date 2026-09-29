import type { TextPlaySaveSlot, TextPlaySlotId, TextPlayState } from "@/features/text-play/core/types"; // 저장 도메인 계약
import { cloneTextPlaySaveSlot, type TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약

export class MemoryTextPlaySaveRepository implements TextPlaySaveRepository // 메모리 저장소
{ // 클래스 시작
    private readonly slots = new Map<string, TextPlaySaveSlot>(); // 슬롯 저장소

    public async list(packageId: string): Promise<TextPlaySaveSlot[]> // 슬롯 목록
    { // 함수 시작
        return [...this.slots.values()] // 전체 슬롯 배열
            .filter((slot) => slot.packageId === packageId) // 작품 슬롯 필터
            .sort((left, right) => right.savedAt.localeCompare(left.savedAt)) // 최신 순서 정렬
            .map(cloneTextPlaySaveSlot); // 독립 복사 반환
    } // 함수 종료

    public async load(packageId: string, slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null> // 슬롯 읽기
    { // 함수 시작
        const slot = this.slots.get(`${packageId}:${slotId}`); // 저장 슬롯 조회
        return slot === undefined ? null : cloneTextPlaySaveSlot(slot); // 조회 결과 반환
    } // 함수 종료

    public async save(slotId: TextPlaySlotId, state: TextPlayState, summary: string): Promise<void> // 슬롯 저장
    { // 함수 시작
        const slot: TextPlaySaveSlot = // 저장 슬롯 생성
        { // 슬롯 시작
            key: `${state.packageId}:${slotId}`, // 저장 키
            slotId, // 슬롯 식별자
            packageId: state.packageId, // 작품 식별자
            summary, // 진행 요약
            state, // 게임 상태
            savedAt: state.updatedAt, // 저장 시각
        }; // 슬롯 종료
        this.slots.set(slot.key, cloneTextPlaySaveSlot(slot)); // 슬롯 복사 저장
    } // 함수 종료

    public async remove(packageId: string, slotId: TextPlaySlotId): Promise<void> // 슬롯 삭제
    { // 함수 시작
        this.slots.delete(`${packageId}:${slotId}`); // 저장 슬롯 제거
    } // 함수 종료

    public getCorruptSlotIds(_packageId: string): TextPlaySlotId[] // 손상 슬롯 조회
    { // 함수 시작
        void _packageId; // 미사용 작품 표시
        return []; // 빈 목록 반환
    } // 함수 종료
} // 클래스 종료
