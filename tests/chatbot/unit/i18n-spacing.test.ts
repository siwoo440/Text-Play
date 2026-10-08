import { readdirSync, readFileSync, statSync } from "node:fs"; // 파일 읽기
import { join } from "node:path"; // 경로 합치기
import { describe, expect, it } from "vitest"; // 테스트 도구
import { setActiveLocale, t, tc } from "@chatbot/lib/i18n"; // 번역 도구
import { en } from "@chatbot/lib/i18n/en"; // 영어 사전

const KEY = String.raw`((?:[^"\\]|\\.)*)`; // t("…") 안의 글자
const startsOk = new RegExp(String.raw`^[\s.,!?:;)%’'”"…·\-/]`); // 값 뒤에 붙어도 되는 시작(빈칸·문장 부호)
const allowed = new Set(["봉인을 바로 뜯어 본다", "보낸 사람이 누구인지 묻는다", "편지를 노을빛에 비춰 본다"]); // 번호 칸 뒤에 오는 선택지(모양으로 띄움)

function listScreens(dir: string): string[] // 화면 파일 모으기
{ // 함수 시작
    return readdirSync(dir).flatMap((name) => // 항목 순회
    { // 변환 시작
        const full = join(dir, name); // 전체 경로
        return statSync(full).isDirectory() ? listScreens(full) : full.endsWith(".tsx") ? [full] : []; // 폴더는 안으로, 화면 파일만
    }); // 변환 종료
} // 함수 종료

describe("영어 문구의 띄어쓰기와 자리별 번역", () => // 영어 다듬기 묶음
{ // 묶음 시작
    it("숫자나 이름 바로 뒤에 붙여 쓰는 영어 조각은 빈칸이나 문장 부호로 시작한다", () => // 띄어쓰기 검증
    { // 검증 시작
        const patterns = [new RegExp(String.raw`\}\{t\("` + KEY + String.raw`"\)\}`, "g"), new RegExp(String.raw`<\/(?:span|strong|b|em|small)>\{t\("` + KEY + String.raw`"\)\}`, "g")]; // 값·강조 바로 뒤의 조각
        const broken = new Set<string>(); // 붙어 버리는 조각
        for (const file of listScreens(join(process.cwd(), "src"))) // 화면 순회
        { // 순회 시작
            const text = readFileSync(file, "utf8"); // 화면 코드
            for (const pattern of patterns) // 모양 순회
            { // 순회 시작
                for (const match of text.matchAll(pattern)) // 조각 순회
                { // 순회 시작
                    const key = JSON.parse(`"${match[1]}"`) as string; // 한국어 조각
                    const value = Object.hasOwn(en, key) ? en[key] : ""; // 영어 조각
                    if (value.length > 0 && !startsOk.test(value) && !allowed.has(key)) // 빈칸 없이 붙음
                    { // 조건 시작
                        broken.add(`${key} => ${value}`); // 기록
                    } // 조건 종료
                } // 순회 종료
            } // 순회 종료
        } // 순회 종료
        expect([...broken]).toEqual([]); // 없음(예: "5" + "tokens" → "5tokens")
    }, 60_000); // 소스 전체를 읽어 넉넉히 기다림

    it("같은 한국어도 자리에 따라 다른 영어로 바꾸고, 자리 문구가 없으면 보통 번역을 쓴다", () => // 자리별 번역 검증
    { // 검증 시작
        expect(tc("tab", "임시 저장")).toBe("임시 저장"); // 한국어는 그대로
        setActiveLocale("en"); // 영어 화면
        expect(t("임시 저장")).toBe("Save draft"); // 버튼
        expect(tc("tab", "임시 저장")).toBe("Drafts"); // 탭
        expect(tc("tab", "책갈피")).toBe("Bookmarks"); // 탭
        expect(tc("count", "대화")).toBe("chats"); // 수 옆
        expect(tc("tab", "내 캐릭터")).toBe(t("내 캐릭터")); // 자리 문구가 없으면 보통 번역
        expect(tc("tab", "사전에 없는 글자")).toBe("사전에 없는 글자"); // 없으면 그대로
        expect(t("토큰 받기")).toBe("Get tokens"); // 제목
        expect(`30${tc("amount", "토큰 받기")}`).toBe("30 tokens"); // 수 뒤
    }); // 검증 종료
}); // 묶음 종료
