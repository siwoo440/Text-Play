import { readFileSync } from "node:fs"; // 파일 읽기
import { describe, expect, it } from "vitest"; // 테스트 도구

describe("AI 모델 화면 스타일", () => // 스타일 묶음
{ // 묶음 시작
    it("어두운 창 바탕 위에서도 글자가 보이도록 화면이 밝은 바탕을 직접 칠한다", () => // 바탕색 검증
    { // 테스트 시작
        const css = readFileSync("src/desktop/ai-models/AiModelsScreen.module.css", "utf8"); // 스타일 파일
        const page = css.slice(css.indexOf(".page"), css.indexOf("}", css.indexOf(".page"))); // 화면 규칙
        expect(page).toContain("background: var(--mv-canvas"); // 밝은 바탕 확인
        expect(page).toContain("min-height: calc(100vh - 64px)"); // 화면 높이 채움 확인
    }); // 테스트 종료
}); // 묶음 종료
