import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 함수

describe("초기 앱 상태", () => // 초기 상태 묶음
{ // 묶음 시작
    it("스키마 버전과 Mock 공급자를 고정한다", () => // 기본값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        expect(state.schemaVersion).toBe(5); // 스키마 버전 확인
        expect(state.providerMode).toBe("mock"); // Mock 공급자 확인
        expect(state.settings.leftPanelOpen).toBe(true); // 왼쪽 패널 확인
        expect(state.settings.rightPanelOpen).toBe(false); // 오른쪽 패널 확인
        expect(state.characters).toHaveLength(100); // 캐릭터 수 확인
        expect(state.conversations.length).toBeGreaterThanOrEqual(3); // 대화방 수 확인
        expect(state.wallet.balance).toBe(1240); // 초기 토큰 확인
    }); // 검증 종료

    it("랭킹 캐릭터의 식별자와 이름을 중복 없이 제공한다", () => // 랭킹 중복 방지
    { // 검증 시작
        const characters = createInitialState().characters; // 캐릭터 목록 생성
        const identifiers = new Set(characters.map((character) => character.id)); // 식별자 집합 생성
        const names = new Set(characters.map((character) => character.name)); // 이름 집합 생성
        expect(identifiers.size).toBe(100); // 식별자 고유성 확인
        expect(names.size).toBe(100); // 이름 고유성 확인
    }); // 검증 종료

    it("인기도 순서로 1위부터 100위까지 정렬한다", () => // 랭킹 순서 검증
    { // 검증 시작
        const characters = createInitialState().characters; // 캐릭터 목록 생성
        const popularity = characters.map((character) => character.popularity); // 인기도 목록 생성
        expect(popularity).toEqual([...popularity].sort((left, right) => right - left)); // 내림차순 확인
        expect(characters[7].id).toBe("rank-008"); // 첫 임시 순위 확인
        expect(characters[99].id).toBe("rank-100"); // 마지막 임시 순위 확인
    }); // 검증 종료

    it("생성 완료된 50위까지 고유 이미지를 연결한다", () => // 생성 이미지 연결 검증
    { // 검증 시작
        const characters = createInitialState().characters; // 캐릭터 목록 생성
        const generatedImages = characters.slice(7, 50).map((character) => character.coverImage); // 생성 이미지 목록 생성
        expect(generatedImages).toHaveLength(43); // 생성 이미지 수 확인
        expect(new Set(generatedImages).size).toBe(43); // 이미지 고유성 확인
        expect(generatedImages[0]).toBe("/images/characters/rank-008.webp"); // 첫 생성 이미지 확인
        expect(generatedImages[42]).toBe("/images/characters/rank-050.webp"); // 마지막 생성 이미지 확인
        expect(characters[50].coverImage).not.toBe("/images/characters/rank-051.webp"); // 미생성 이미지 제외 확인
    }); // 검증 종료

    it("호출마다 독립된 변경 가능 상태를 반환한다", () => // 상태 격리 검증
    { // 검증 시작
        const firstState = createInitialState(); // 첫 상태 생성
        const secondState = createInitialState(); // 둘째 상태 생성
        firstState.characters[0].name = "변경된 이름"; // 첫 상태 변경
        expect(secondState.characters[0].name).not.toBe("변경된 이름"); // 상태 격리 확인
    }); // 검증 종료
}); // 묶음 종료
