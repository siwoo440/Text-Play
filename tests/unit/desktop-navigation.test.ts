import { describe, expect, it } from "vitest"; // 테스트 도구
import { reduceDesktopRoute } from "@/desktop/desktop-navigation"; // 화면 전이 함수

describe("데스크톱 화면 전이", () => // 화면 전이 묶음
{ // 묶음 시작
    it("새 게임과 이어하기의 복원 슬롯을 구분한다", () => // 화면 전이 검증
    { // 테스트 시작
        expect(reduceDesktopRoute({ screen: "home" }, { type: "start-new" })).toEqual({ screen: "play", resumeSlot: null }); // 새 게임 확인
        expect(reduceDesktopRoute({ screen: "home" }, { type: "resume" })).toEqual({ screen: "play", resumeSlot: "auto" }); // 이어하기 확인
    }); // 테스트 종료

    it("플레이 화면에서 홈으로 돌아간다", () => // 홈 복귀 검증
    { // 테스트 시작
        expect(reduceDesktopRoute({ screen: "play", resumeSlot: null }, { type: "show-home" })).toEqual({ screen: "home" }); // 홈 화면 확인
    }); // 테스트 종료
}); // 묶음 종료
