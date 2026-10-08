import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import * as gateway from "@chatbot/lib/repositories/local-storage-gateway"; // 저장소(기존 이름)
import { addMissingBuiltInStories, migrateParsedState, migrateVersionTwelve } from "@chatbot/lib/repositories/state-migrations"; // 버전 변환
import { isAppState } from "@chatbot/lib/repositories/state-validation"; // 데이터 검사

describe("저장소 모듈 나누기", () => // 모듈 묶음
{ // 묶음 시작
    it("검사와 버전 변환을 따로 불러 쓸 수 있고, 저장소 파일의 기존 이름도 같은 함수를 가리킨다", () => // 호환 검증
    { // 검증 시작
        expect(isAppState(createInitialState())).toBe(true); // 검사 단독 사용
        expect(gateway.isAppState).toBe(isAppState); // 기존 이름 유지
        expect(gateway.migrateVersionTwelve).toBe(migrateVersionTwelve); // 변환 이름 유지
        expect(gateway.addMissingBuiltInStories).toBe(addMissingBuiltInStories); // 보충 이름 유지
    }); // 검증 종료

    it("현재 버전은 복사해 돌려주고, 모르는 버전이나 객체가 아닌 값은 변환하지 않는다", () => // 변환 진입 검증
    { // 검증 시작
        const state = createInitialState(); // 현재 버전 상태
        const migrated = migrateParsedState(state); // 변환
        expect(migrated).toEqual(state); // 같은 내용
        expect(migrated).not.toBe(state); // 다른 객체(복사)
        expect(migrateParsedState({ ...state, schemaVersion: 99 })).toBeNull(); // 모르는 버전
        expect(migrateParsedState("문자열")).toBeNull(); // 객체 아님
    }); // 검증 종료
}); // 묶음 종료
