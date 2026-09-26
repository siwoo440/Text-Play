import { describe, expect, it } from "vitest"; // 테스트 도구
import { recommendLayout } from "@/features/chat/layout-resolver"; // 추천 함수

describe("레이아웃 추천", () => // 추천 묶음
{ // 묶음 시작
    it.each([ // 자동 추천 사례
        [{ width: 390, height: 844, platformMode: "auto", layoutId: null }, "M1"], // 모바일 세로
        [{ width: 844, height: 390, platformMode: "mobile", layoutId: null }, "M3"], // 모바일 가로
        [{ width: 1180, height: 820, platformMode: "tablet", layoutId: null }, "T1"], // 태블릿 가로
        [{ width: 820, height: 1180, platformMode: "tablet", layoutId: null }, "T2"], // 태블릿 세로
        [{ width: 1700, height: 1000, platformMode: "desktop", layoutId: null }, "D2"], // 넓은 모니터
        [{ width: 1500, height: 700, platformMode: "desktop", layoutId: null }, "D3"], // 초광폭 모니터
        [{ width: 1440, height: 900, platformMode: "desktop", layoutId: null }, "D1"], // 일반 모니터
    ] as const)("화면 조건에 맞는 %s를 추천한다", (input, expected) => // 사례 검증
    { // 검증 시작
        expect(recommendLayout(input)).toBe(expected); // 추천 결과
    }); // 검증 종료

    it("사용자 선택을 자동 추천보다 우선한다", () => // 강제 선택 검증
    { // 검증 시작
        expect(recommendLayout({ width: 390, height: 844, platformMode: "auto", layoutId: "D3" })).toBe("D3"); // 선택 우선
    }); // 검증 종료
}); // 묶음 종료
