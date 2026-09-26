import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTextPlayState } from "@/features/text-play/core/engine"; // 상태 생성 함수
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지
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
}); // 묶음 종료
