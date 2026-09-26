import { describe, expect, it } from "vitest"; // 테스트 도구
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

describe("Text-Play 샘플 패키지", () => // 패키지 검증 묶음
{ // 묶음 시작
    it("모든 선택지가 실제 장면을 가리킨다", () => // 장면 참조 검증
    { // 테스트 시작
        const sceneIds = new Set(DEMO_TEXT_PLAY_PACKAGE.scenes.map((scene) => scene.id)); // 장면 식별자 집합
        const targetIds = DEMO_TEXT_PLAY_PACKAGE.scenes.flatMap((scene) => scene.choices.map((choice) => choice.targetSceneId)); // 이동 대상 목록
        expect(targetIds.every((targetId) => sceneIds.has(targetId))).toBe(true); // 모든 대상 존재 확인
    }); // 테스트 종료

    it("정상 엔딩과 후퇴 엔딩을 모두 가진다", () => // 엔딩 구성 검증
    { // 테스트 시작
        expect(DEMO_TEXT_PLAY_PACKAGE.endings.map((ending) => ending.id)).toEqual(["truth-ending", "retreat-ending"]); // 엔딩 식별자 확인
    }); // 테스트 종료
}); // 묶음 종료
