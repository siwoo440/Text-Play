import { readFileSync } from "node:fs"; // 파일 읽기 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

describe("Text-Play 턴 위치 스타일", () => // 턴 스타일 검증 묶음
{ // 묶음 시작
    it("긴 턴 목록을 가로로 이동할 수 있게 한다", () => // 가로 이동 검증
    { // 테스트 시작
        const source = readFileSync("src/features/text-play/ui/TextPlayScreen.module.css", "utf8"); // 스타일 원본 읽기
        const turnDotsBlock = source.match(/\.turnDots[^]*?\} \/\* 목록 종료 \*\//u)?.[0] ?? ""; // 턴 목록 블록 추출
        expect(turnDotsBlock).toContain("overflow-x: auto"); // 가로 스크롤 확인
        expect(turnDotsBlock).toContain("overflow-y: hidden"); // 세로 스크롤 차단 확인
        expect(turnDotsBlock).toContain("justify-content: safe center"); // 시작점 접근 확인
    }); // 테스트 종료
}); // 묶음 종료
