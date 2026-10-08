import { readFileSync } from "node:fs"; // 파일 읽기 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

const HOME_CSS = readFileSync("src/features/text-play/ui/TextPlayHome.module.css", "utf8").replace(/\r\n/gu, "\n"); // Text-Play 메인 스타일
const DIALOG_CSS = readFileSync("src/features/text-play/ui/TextPlayDialog.module.css", "utf8").replace(/\r\n/gu, "\n"); // 공통 대화상자 스타일
const SURFACE_PROPERTIES = /^(background|border|border-color|box-shadow):/u; // 표면을 칠하는 속성

function declarations(css: string): string[] // 주석을 뺀 선언 줄
{ // 함수 시작
    return css.split("\n").map((line) => line.replace(/\/\*.*?\*\//gu, "").trim()).filter((line) => line.includes(":") && line.endsWith(";")); // 선언만 반환
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

describe("Text-Play 메인 다크 모드", () => // 메인 다크 모드 묶음
{ // 묶음 시작
    it("기본 색 변수를 밝은 값·어두운 값 쌍으로 정한다", () => // 기본 변수 검증
    { // 테스트 시작
        const lines = declarations(HOME_CSS); // 선언 줄
        for (const name of ["--mv-ink", "--mv-muted", "--mv-line", "--mv-surface", "--mv-canvas", "--mv-focus", "--page-explore", "--page-ranking", "--page-library", "--page-textplay"]) // 변수 순회
        { // 순회 시작
            const line = lines.find((candidate) => candidate.startsWith(`${name}:`)) ?? ""; // 변수 선언
            expect(line, `${name} 선언`).toContain("light-dark("); // 밝은·어두운 쌍 확인
        } // 순회 종료
    }); // 테스트 종료

    it("장르의 연한 배경과 진한 글자를 모두 쌍으로 정한다", () => // 장르 변수 검증
    { // 테스트 시작
        const genreLines = declarations(HOME_CSS).filter((line) => line.startsWith("--genre-soft:") || line.startsWith("--genre-strong:")); // 장르 변수 선언
        expect(genreLines.length).toBe(16); // 장르 8종 × 2
        expect(genreLines.filter((line) => !line.includes("light-dark("))).toEqual([]); // 한쪽 전용 값 없음
    }); // 테스트 종료

    it("앱이 다크 모드면 메인도 어두운 색 구성을 쓰고 웹에서는 밝게 유지한다", () => // 색 구성 전환 검증
    { // 테스트 시작
        const lightBlock = HOME_CSS.match(/\n\.home \/\* 메인 화면 \*\/\n\{[^]*?\} \/\* 화면 종료 \*\//u)?.[0] ?? ""; // 메인 기본 규칙
        expect(lightBlock).toContain("color-scheme: light"); // 기본은 밝게(웹은 테마 표시가 없음)
        const darkBlock = HOME_CSS.match(/:global\(:root\[data-theme="dark"\]\) \.home[^]*?\}/u)?.[0] ?? ""; // 다크 모드 규칙
        expect(darkBlock).toContain("color-scheme: dark"); // 앱 다크 모드면 어둡게
    }); // 테스트 종료

    it("흰색으로 굳은 표면과 흰색 섞기를 남기지 않는다", () => // 굳은 흰 표면 검증
    { // 테스트 시작
        const fixed = declarations(HOME_CSS).filter((line) => SURFACE_PROPERTIES.test(line)).filter((line) => /#fff(?:fff)?\b|rgb\(255 255 255|,\s*white\)/u.test(withoutLightDark(line))); // 쌍 밖에 남은 흰 표면
        expect(fixed).toEqual([]); // 굳은 흰 표면 없음
    }); // 테스트 종료

    it("밝은 바탕 위에만 맞는 굳은 글자색을 남기지 않는다", () => // 굳은 글자색 검증
    { // 테스트 시작
        const allowed = /^#fff(?:fff)?$/u; // 강조색 채움 위 흰 글자는 양쪽 공용
        const fixed = declarations(HOME_CSS).filter((line) => line.startsWith("color:")).flatMap((line) => (withoutLightDark(line).match(/#[0-9a-fA-F]{3,8}\b/gu) ?? []).filter((color) => !allowed.test(color)).map((color) => `${color} ← ${line}`)); // 쌍 밖에 남은 글자색
        expect(fixed).toEqual(["#451a03 ← color: #451a03;", "#1e293b ← color: #1e293b;"]); // 금·은 순위 배지 글자만 공용(배지 바탕이 양쪽 같음)
    }); // 테스트 종료

    it("작품 상세 창(밝은 톤 대화상자)도 앱 다크 모드를 따르고 웹에서는 밝게 유지한다", () => // 상세 창 전환 검증
    { // 테스트 시작
        const lightBlock = DIALOG_CSS.match(/\n\.backdrop\[data-tone="light"\] \/\* 밝은 배경 \*\/\n\{[^]*?\}/u)?.[0] ?? ""; // 밝은 톤 기본 규칙
        expect(lightBlock).toContain("color-scheme: light"); // 기본은 밝게
        const darkBlock = DIALOG_CSS.match(/:global\(:root\[data-theme="dark"\]\) \.backdrop\[data-tone="light"\][^]*?\}/u)?.[0] ?? ""; // 다크 모드 규칙
        expect(darkBlock).toContain("color-scheme: dark"); // 앱 다크 모드면 어둡게
    }); // 테스트 종료
}); // 묶음 종료
