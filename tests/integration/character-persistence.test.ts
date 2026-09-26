import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { LocalStorageGateway } from "@/lib/repositories/local-storage-gateway"; // 로컬 저장소

describe("캐릭터 로컬 복원", () => // 복원 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 초기화

    it("저장한 캐릭터를 새 게이트웨이에서 복원한다", () => // 복원 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        const state = createInitialState(); // 초기 상태 준비
        const character = { ...state.characters[0], id: "local-lumi", creatorId: state.profile.id, name: "로컬 루미" }; // 로컬 캐릭터 생성
        gateway.save(appReducer(state, { type: "upsert-character", character })); // 캐릭터 저장
        const restored = new LocalStorageGateway(localStorage).load().state; // 새 게이트웨이 복원
        expect(restored.characters.some((item) => item.id === "local-lumi")).toBe(true); // 복원 확인
    }); // 검증 종료
}); // 묶음 종료
