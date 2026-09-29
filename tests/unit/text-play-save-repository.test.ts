import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTextPlayState } from "@/features/text-play/core/engine"; // 상태 생성 함수
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지
import { ResilientTextPlaySaveRepository, TEXT_PLAY_MEMORY_STORAGE_WARNING } from "@/features/text-play/storage/browser-save-repository"; // 복구 저장소
import { IndexedDBTextPlaySaveRepository } from "@/features/text-play/storage/indexeddb-save-repository"; // IndexedDB 저장소
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayStorageError, validateTextPlaySaveSlot } from "@/features/text-play/storage/save-repository"; // 저장 계약

describe("Text-Play 저장소", () => // 저장소 검증 묶음
{ // 묶음 시작
    it("작품과 슬롯을 분리해 저장한다", async () => // 슬롯 격리 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        await repository.save("manual-1", state, "첫 장면"); // 수동 슬롯 저장
        expect((await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1"))?.state).toEqual(state); // 저장 상태 확인
        expect(await repository.load("another-package", "manual-1")).toBeNull(); // 작품 격리 확인
    }); // 테스트 종료

    it("같은 슬롯을 최신 상태로 덮어쓴다", async () => // 덮어쓰기 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const updated = { ...initial, sceneId: "moonlit-hall", updatedAt: "2026-09-25T00:01:00.000Z" }; // 변경 상태 생성
        await repository.save("manual-1", initial, "첫 장면"); // 첫 상태 저장
        await repository.save("manual-1", updated, "폐허 회랑"); // 변경 상태 저장
        expect((await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1"))?.summary).toBe("폐허 회랑"); // 최신 요약 확인
        expect((await repository.list(DEMO_TEXT_PLAY_PACKAGE.id))).toHaveLength(1); // 단일 슬롯 확인
    }); // 테스트 종료

    it("저장 슬롯을 삭제한다", async () => // 삭제 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        await repository.save("manual-1", state, "첫 장면"); // 수동 슬롯 저장
        await repository.remove(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1"); // 슬롯 삭제
        expect(await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1")).toBeNull(); // 삭제 확인
    }); // 테스트 종료

    it("IndexedDB를 사용할 수 없으면 명시적인 오류를 반환한다", () => // 저장소 부재 검증
    { // 테스트 시작
        expect(() => new IndexedDBTextPlaySaveRepository(undefined)).toThrowError(new TextPlayStorageError("unavailable")); // 사용 불가 오류 확인
    }); // 테스트 종료

    it("손상된 저장 데이터를 거부한다", () => // 저장 스키마 검증
    { // 테스트 시작
        expect(() => validateTextPlaySaveSlot({ key: "bad" })).toThrowError(new TextPlayStorageError("invalid-save")); // 손상 데이터 오류 확인
    }); // 테스트 종료

    it("IndexedDB 비동기 실패 후 메모리 저장소로 전환한다", async () => // 비동기 대체 검증
    { // 테스트 시작
        const failingRepository = // 실패 저장소 생성
        { // 저장소 시작
            list: async () => // 목록 실패 함수
            { // 함수 시작
                throw new TextPlayStorageError("write-failed"); // 목록 실패
            }, // 함수 종료
            load: async () => // 읽기 실패 함수
            { // 함수 시작
                throw new TextPlayStorageError("write-failed"); // 읽기 실패
            }, // 함수 종료
            save: async () => // 저장 실패 함수
            { // 함수 시작
                throw new TextPlayStorageError("write-failed"); // 저장 실패
            }, // 함수 종료
            remove: async () => // 삭제 실패 함수
            { // 함수 시작
                throw new TextPlayStorageError("write-failed"); // 삭제 실패
            }, // 함수 종료
        }; // 저장소 종료
        const repository = new ResilientTextPlaySaveRepository(failingRepository); // 복구 저장소 생성
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-29T00:00:00.000Z"); // 저장 상태 생성
        await repository.save("manual-1", state, "메모리 저장"); // 실패 후 메모리 저장
        expect((await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1"))?.summary).toBe("메모리 저장"); // 메모리 복원 확인
        expect(repository.getStorageWarning()).toBe(TEXT_PLAY_MEMORY_STORAGE_WARNING); // 대체 경고 확인
    }); // 테스트 종료

    it("손상된 IndexedDB 데이터는 메모리 저장소로 숨기지 않는다", async () => // 손상 오류 유지 검증
    { // 테스트 시작
        const corruptRepository = // 손상 저장소 생성
        { // 저장소 시작
            list: async () => // 목록 손상 함수
            { // 함수 시작
                throw new TextPlayStorageError("invalid-save"); // 목록 손상
            }, // 함수 종료
            load: async () => null, // 빈 읽기
            save: async () => undefined, // 저장 성공
            remove: async () => undefined, // 삭제 성공
        }; // 저장소 종료
        const repository = new ResilientTextPlaySaveRepository(corruptRepository); // 복구 저장소 생성
        await expect(repository.list(DEMO_TEXT_PLAY_PACKAGE.id)).rejects.toEqual(new TextPlayStorageError("invalid-save")); // 손상 오류 확인
        expect(repository.getStorageWarning()).toBeNull(); // 대체 경고 부재 확인
    }); // 테스트 종료

    it("동시에 실패한 IndexedDB 저장을 모두 메모리 저장소에서 재시도한다", async () => // 동시 대체 검증
    { // 테스트 시작
        const failingRepository = // 실패 저장소 생성
        { // 저장소 시작
            list: async () => [], // 빈 목록
            load: async () => null, // 빈 읽기
            save: async () => // 지연 저장 실패 함수
            { // 함수 시작
                await Promise.resolve(); // 동시 실행 대기
                throw new TextPlayStorageError("write-failed"); // 저장 실패
            }, // 함수 종료
            remove: async () => undefined, // 삭제 성공
        }; // 저장소 종료
        const repository = new ResilientTextPlaySaveRepository(failingRepository); // 복구 저장소 생성
        const firstState = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-29T00:00:00.000Z"); // 첫 저장 상태
        const secondState = { ...firstState, updatedAt: "2026-09-29T00:01:00.000Z" }; // 둘째 저장 상태
        await expect(Promise.all([repository.save("manual-1", firstState, "첫 저장"), repository.save("manual-2", secondState, "둘째 저장")])).resolves.toEqual([undefined, undefined]); // 동시 재시도 확인
        expect(await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1")).not.toBeNull(); // 첫 저장 확인
        expect(await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-2")).not.toBeNull(); // 둘째 저장 확인
    }); // 테스트 종료
}); // 묶음 종료
