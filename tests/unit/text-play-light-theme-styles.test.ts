import { readFileSync } from "node:fs"; // 파일 읽기 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

const THEME_VARIABLES = ["--accent", "--accent-strong", "--accent-soft", "--page-bg", "--bar-bg", "--panel-bg", "--panel-line", "--dialog-bg", "--main-text", "--muted-text"]; // 테마가 정하는 색 변수
const FILES = ["TextPlayScreen.module.css", "TextPlayDialog.module.css", "SaveManager.module.css", "TextPlaySettingsDialog.module.css"].map((name) => `src/features/text-play/ui/${name}`); // 플레이 화면과 그 안의 창 스타일

function declarations(css: string): string[] // 색이 들어간 선언 줄(주석 제외)
{ // 함수 시작
    return css.split("\n").map((line) => line.replace(/\/\*.*?\*\//gu, "").trim()).filter((line) => /#[0-9a-fA-F]{3,8}\b|rgb\(/u.test(line)); // 색 선언만 반환
} // 함수 종료

function withoutLightDark(line: string): string // light-dark(…) 쌍을 걷어 낸 나머지
{ // 함수 시작
    let rest = line; // 남은 글자
    for (let index = rest.indexOf("light-dark("); index !== -1; index = rest.indexOf("light-dark(")) // 쌍 순회
    { // 순회 시작
        let depth = 0; // 괄호 깊이
        let end = index + "light-dark".length; // 닫는 괄호 위치
        for (; end < rest.length; end += 1) // 괄호 짝 찾기
        { // 탐색 시작
            depth += rest[end] === "(" ? 1 : rest[end] === ")" ? -1 : 0; // 깊이 갱신
            if (depth === 0) // 짝 찾음
            { // 조건 시작
                break; // 탐색 종료
            } // 조건 종료
        } // 탐색 종료
        rest = rest.slice(0, index) + rest.slice(end + 1); // 쌍 제거
    } // 순회 종료
    return rest; // 나머지 반환
} // 함수 종료

describe("Text-Play 플레이 화면 밝은 디자인", () => // 밝은 디자인 묶음
{ // 묶음 시작
    it("테마 세 가지 모두 색 변수를 밝은 값·어두운 값 쌍으로 정해 앱 테마를 따른다", () => // 테마 변수 검증
    { // 테스트 시작
        const css = readFileSync(FILES[0], "utf8"); // 플레이 화면 스타일
        const blocks = [css.match(/\.page \/\* 플레이 화면 \*\/[^]*?\} \/\* 화면 종료 \*\//u)?.[0], css.match(/\.page\[data-theme="sci-fi"\][^]*?\}/u)?.[0], css.match(/\.page\[data-theme="classic-novel"\][^]*?\}/u)?.[0]]; // 기본·SF·노벨 테마 규칙
        for (const block of blocks) // 테마 순회
        { // 순회 시작
            expect(block).toBeDefined(); // 규칙 존재 확인
            for (const name of THEME_VARIABLES) // 변수 순회
            { // 변수 시작
                const line = block?.split("\n").find((candidate) => candidate.trim().startsWith(`${name}:`)) ?? ""; // 변수 선언
                expect(line, `${name} 선언`).toContain("light-dark("); // 밝은·어두운 쌍 확인
            } // 변수 종료
        } // 순회 종료
    }); // 테스트 종료

    it("플레이 화면과 저장·설정 창에 한쪽 테마 전용으로 굳은 색을 남기지 않는다", () => // 굳은 색 검증
    { // 테스트 시작
        const allowed = /^(#fff(?:fff)?|rgb\(0 0 0 \/ 0%\))$/u; // 강조색 버튼 위 흰 글자와 완전 투명은 양쪽 공용
        const fixed = FILES.flatMap((file) => declarations(readFileSync(file, "utf8")).flatMap((line) => (withoutLightDark(line).match(/#[0-9a-fA-F]{3,8}\b|rgb\([^)]*\)/gu) ?? []).filter((color) => !allowed.test(color)).map((color) => `${file.split("/").at(-1)}: ${color} ← ${line}`))); // 쌍 밖에 남은 색
        expect(fixed).toEqual([]); // 굳은 색 없음
    }); // 테스트 종료
}); // 묶음 종료
