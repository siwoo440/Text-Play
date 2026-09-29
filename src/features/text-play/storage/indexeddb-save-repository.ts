import type { TextPlaySaveSlot, TextPlaySlotId, TextPlayState } from "@/features/text-play/core/types"; // 저장 도메인 계약
import { cloneTextPlaySaveSlot, TextPlayStorageError, type TextPlaySaveRepository, validateTextPlaySaveSlot } from "@/features/text-play/storage/save-repository"; // 저장소 계약

const DATABASE_NAME = "mateverse:text-play"; // 데이터베이스 이름
const DATABASE_VERSION = 1; // 데이터베이스 버전
const STORE_NAME = "saves"; // 객체 저장소 이름
const SLOT_IDS: TextPlaySlotId[] = ["auto", "manual-1", "manual-2", "manual-3", "manual-4", "manual-5", "manual-6"]; // 슬롯 식별자 목록

interface TextPlaySaveReadResult // 저장 목록 해석 결과
{ // 구조 시작
    slots: TextPlaySaveSlot[]; // 정상 슬롯 목록
    corruptSlotIds: TextPlaySlotId[]; // 손상 슬롯 목록
} // 구조 종료

function isRecord(value: unknown): value is Record<string, unknown> // 객체 판정기
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부 반환
} // 함수 종료

export function readTextPlaySaveSlots(values: unknown[], packageId: string): TextPlaySaveReadResult // 저장 목록 해석기
{ // 함수 시작
    const slots: TextPlaySaveSlot[] = []; // 정상 슬롯 목록
    const corruptSlotIds: TextPlaySlotId[] = []; // 손상 슬롯 목록
    values.forEach((value) => // 저장 값 순회
    { // 순회 시작
        if (!isRecord(value) || value.packageId !== packageId || !SLOT_IDS.includes(String(value.slotId) as TextPlaySlotId)) // 식별 가능 슬롯 확인
        { // 조건 시작
            return; // 다른 값 생략
        } // 조건 종료
        const slotId = String(value.slotId) as TextPlaySlotId; // 슬롯 식별자 변환
        try // 슬롯 검증 시도
        { // 시도 시작
            slots.push(cloneTextPlaySaveSlot(validateTextPlaySaveSlot(value))); // 정상 슬롯 추가
        } // 시도 종료
        catch (error) // 손상 슬롯 처리
        { // 오류 시작
            if (error instanceof TextPlayStorageError && error.code === "invalid-save") // 손상 오류 확인
            { // 조건 시작
                corruptSlotIds.push(slotId); // 손상 슬롯 추가
                return; // 오류 처리 종료
            } // 조건 종료
            throw error; // 알 수 없는 오류 전달
        } // 오류 종료
    }); // 순회 종료
    slots.sort((left, right) => right.savedAt.localeCompare(left.savedAt)); // 최신 순서 정렬
    return { slots, corruptSlotIds: [...new Set(corruptSlotIds)] }; // 해석 결과 반환
} // 함수 종료

function requestResult<T>(request: IDBRequest<T>): Promise<T> // 요청 결과 변환
{ // 함수 시작
    return new Promise<T>((resolve, reject) => // 비동기 결과 생성
    { // 처리 시작
        request.onsuccess = () => resolve(request.result); // 성공 결과 처리
        request.onerror = () => reject(new TextPlayStorageError("write-failed")); // 요청 실패 처리
    }); // 처리 종료
} // 함수 종료

export class IndexedDBTextPlaySaveRepository implements TextPlaySaveRepository // IndexedDB 저장소
{ // 클래스 시작
    private readonly factory: IDBFactory; // IndexedDB 팩토리
    private readonly corruptSlotsByPackage = new Map<string, TextPlaySlotId[]>(); // 작품별 손상 슬롯

    public constructor(factory: IDBFactory | undefined = globalThis.indexedDB) // 생성자
    { // 생성자 시작
        if (factory === undefined) // 지원 여부 확인
        { // 조건 시작
            throw new TextPlayStorageError("unavailable"); // 사용 불가 오류
        } // 조건 종료
        this.factory = factory; // 팩토리 저장
    } // 생성자 종료

    private async open(): Promise<IDBDatabase> // 데이터베이스 열기
    { // 함수 시작
        const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION); // 열기 요청
        request.onupgradeneeded = () => // 스키마 생성 처리
        { // 처리 시작
            if (!request.result.objectStoreNames.contains(STORE_NAME)) // 저장소 존재 확인
            { // 조건 시작
                request.result.createObjectStore(STORE_NAME, { keyPath: "key" }); // 저장소 생성
            } // 조건 종료
        }; // 처리 종료
        return requestResult(request); // 연결 반환
    } // 함수 종료

    public async list(packageId: string): Promise<TextPlaySaveSlot[]> // 슬롯 목록
    { // 함수 시작
        const database = await this.open(); // 데이터베이스 연결
        try // 조회 시도
        { // 시도 시작
            const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(); // 전체 조회 요청
            const values = await requestResult(request); // 전체 결과 읽기
            const result = readTextPlaySaveSlots(values as unknown[], packageId); // 슬롯 목록 해석
            this.corruptSlotsByPackage.set(packageId, result.corruptSlotIds); // 손상 슬롯 저장
            return result.slots; // 정상 슬롯 반환
        } // 시도 종료
        finally // 연결 정리
        { // 정리 시작
            database.close(); // 데이터베이스 닫기
        } // 정리 종료
    } // 함수 종료

    public getCorruptSlotIds(packageId: string): TextPlaySlotId[] // 손상 슬롯 조회
    { // 함수 시작
        return [...(this.corruptSlotsByPackage.get(packageId) ?? [])]; // 독립 목록 반환
    } // 함수 종료

    public async load(packageId: string, slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null> // 슬롯 읽기
    { // 함수 시작
        const database = await this.open(); // 데이터베이스 연결
        try // 조회 시도
        { // 시도 시작
            const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(`${packageId}:${slotId}`); // 슬롯 조회 요청
            const value = await requestResult(request); // 조회 결과 읽기
            return value === undefined ? null : cloneTextPlaySaveSlot(validateTextPlaySaveSlot(value)); // 검증 결과 반환
        } // 시도 종료
        finally // 연결 정리
        { // 정리 시작
            database.close(); // 데이터베이스 닫기
        } // 정리 종료
    } // 함수 종료

    public async save(slotId: TextPlaySlotId, state: TextPlayState, summary: string): Promise<void> // 슬롯 저장
    { // 함수 시작
        const database = await this.open(); // 데이터베이스 연결
        try // 저장 시도
        { // 시도 시작
            const slot: TextPlaySaveSlot = // 저장 슬롯 생성
            { // 슬롯 시작
                key: `${state.packageId}:${slotId}`, // 저장 키
                slotId, // 슬롯 식별자
                packageId: state.packageId, // 작품 식별자
                summary, // 진행 요약
                state, // 게임 상태
                savedAt: state.updatedAt, // 저장 시각
            }; // 슬롯 종료
            const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(cloneTextPlaySaveSlot(slot)); // 저장 요청
            await requestResult(request); // 저장 완료 대기
        } // 시도 종료
        finally // 연결 정리
        { // 정리 시작
            database.close(); // 데이터베이스 닫기
        } // 정리 종료
    } // 함수 종료

    public async remove(packageId: string, slotId: TextPlaySlotId): Promise<void> // 슬롯 삭제
    { // 함수 시작
        const database = await this.open(); // 데이터베이스 연결
        try // 삭제 시도
        { // 시도 시작
            const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(`${packageId}:${slotId}`); // 삭제 요청
            await requestResult(request); // 삭제 완료 대기
        } // 시도 종료
        finally // 연결 정리
        { // 정리 시작
            database.close(); // 데이터베이스 닫기
        } // 정리 종료
    } // 함수 종료
} // 클래스 종료
