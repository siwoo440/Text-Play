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

    it("여러 줄로 입력한 행동은 기록에서도 줄을 나눠 보여 준다", () => // 줄바꿈 표시 검증
    { // 테스트 시작
        const source = readFileSync("src/features/text-play/ui/TextPlayScreen.module.css", "utf8"); // 스타일 원본 읽기
        const entryBlock = source.match(/\.storyBox article p[^]*?\} \/\* 문구 종료 \*\//u)?.[0] ?? ""; // 기록 문구 블록 추출
        expect(entryBlock).toContain("white-space: pre-line"); // 줄바꿈 유지 확인
    }); // 테스트 종료
}); // 묶음 종료
