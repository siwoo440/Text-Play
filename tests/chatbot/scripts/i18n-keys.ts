// 번역할 화면 글자 모으기: 소스에서 t("…")로 감싼 글자와, 화면에 그대로 나오는 이름표(label·title 등)를 찾아 목록으로 만든다.
// 사용: node scripts/i18n-keys.ts          → 영어 사전에 없는 글자를 출력
//       node scripts/i18n-keys.ts --all    → 모든 글자를 출력
//       node scripts/i18n-keys.ts --dir=features/chat,components → 그 폴더의 글자만
import fs from "node:fs"; // 파일 도구
import path from "node:path"; // 경로 도구
import { fileURLToPath } from "node:url"; // 파일 주소 변환
import ts from "typescript"; // 구문 분석 도구

const here = path.dirname(fileURLToPath(import.meta.url)); // 이 파일 위치
const root = path.join(here, "..", "..", "..", "src", "chatbot"); // 소스 위치
const hangul = /[가-힣ㄱ-ㆎ]/; // 한글 판정
const DISPLAY_PROPS = new Set(["label", "title", "description", "hint", "question", "answer", "actionLabel", "message", "body", "caption", "kicker", "lead", "placeholder", "tooltip", "heading", "subtitle", "detail", "notice"]); // 화면에 나오는 항목 이름
const DISPLAY_VARS = /(Labels?|Names?|Titles?|Texts?|Messages?|Descriptions?|Hints?)$/; // 화면에 나오는 이름표 묶음의 변수 이름
const EXCLUDE = [/^mocks\//, /^lib\/adapters\//, /^lib\/story\/mock-story-writer\.ts$/, /^lib\/i18n\//, /^test\//, /^features\/character\/character-detail-data\.ts$/]; // 작품 내용·연습용 응답·사전 자체는 제외

function listFiles(dir: string, out: string[] = []): string[] // 소스 파일 목록
{ // 함수 시작
    for (const name of fs.readdirSync(dir)) // 항목 순회
    { // 순회 시작
        const full = path.join(dir, name); // 전체 경로
        if (fs.statSync(full).isDirectory()) // 폴더
        { // 조건 시작
            listFiles(full, out); // 안쪽으로
        } // 조건 종료
        else if (/\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) // 소스 파일
        { // 조건 시작
            out.push(full); // 목록에 추가
        } // 조건 종료
    } // 순회 종료
    return out; // 목록 반환
} // 함수 종료

function inFunction(node: ts.Node): boolean // 함수 안에 있는지
{ // 함수 시작
    for (let parent = node.parent; parent; parent = parent.parent) // 위로 순회
    { // 순회 시작
        if (ts.isFunctionLike(parent)) // 함수
        { // 조건 시작
            return true; // 함수 안
        } // 조건 종료
    } // 순회 종료
    return false; // 파일 바깥 수준
} // 함수 종료

function variableName(node: ts.Node): string // 이 값이 들어가는 변수 이름
{ // 함수 시작
    for (let parent = node.parent; parent; parent = parent.parent) // 위로 순회
    { // 순회 시작
        if (ts.isVariableDeclaration(parent)) // 변수 선언
        { // 조건 시작
            return parent.name.getText(); // 변수 이름
        } // 조건 종료
    } // 순회 종료
    return ""; // 이름 없음
} // 함수 종료

export function collectKeys(): Map<string, string> // 번역할 글자 모으기(글자 → 처음 나온 파일)
{ // 함수 시작
    const keys = new Map<string, string>(); // 글자 목록
    const add = (text: string, rel: string) => { if (!keys.has(text)) { keys.set(text, rel); } }; // 처음 나온 곳만 기록
    for (const file of listFiles(root)) // 파일 순회
    { // 순회 시작
        const rel = path.relative(root, file).replace(/\\/g, "/"); // 상대 경로
        if (EXCLUDE.some((pattern) => pattern.test(rel))) // 제외 대상
        { // 조건 시작
            continue; // 건너뜀
        } // 조건 종료
        const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS); // 구문 분석
        (function visit(node: ts.Node): void // 구문 순회
        { // 순회 시작
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments.length > 0 && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) // t("…") 호출
            { // 조건 시작
                add(node.arguments[0].text, rel); // 글자 기록
            } // 조건 종료
            else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && hangul.test(node.text) && !inFunction(node) && !rel.startsWith("app/")) // 파일 바깥 수준의 한글 글자(페이지 제목 같은 서버 정보는 제외)
            { // 조건 시작
                const parent = node.parent; // 부모 구문
                const named = ts.isPropertyAssignment(parent) && parent.initializer === node && DISPLAY_PROPS.has(parent.name.getText().replace(/["']/g, "")); // 화면 항목 이름
                const grouped = DISPLAY_VARS.test(variableName(node)) && !(ts.isPropertyAssignment(parent) && parent.name === node); // 이름표 묶음의 값
                if (named || grouped) // 화면에 나오는 글자
                { // 조건 시작
                    add(node.text, rel); // 글자 기록
                } // 조건 종료
            } // 조건 종료
            ts.forEachChild(node, visit); // 안쪽으로
        })(source); // 순회 실행
    } // 순회 종료
    return keys; // 목록 반환
} // 함수 종료

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) // 직접 실행
{ // 실행 시작
    const dictionaryDir = path.join(root, "lib", "i18n", "en"); // 영어 사전 위치
    const known = new Set<string>(); // 사전에 있는 글자
    if (fs.existsSync(dictionaryDir)) // 사전 있음
    { // 조건 시작
        for (const file of listFiles(dictionaryDir)) // 사전 파일 순회
        { // 순회 시작
            const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true); // 구문 분석
            (function visit(node: ts.Node): void // 구문 순회
            { // 순회 시작
                if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.name) || ts.isNoSubstitutionTemplateLiteral(node.name))) // "글자": "번역"
                { // 조건 시작
                    known.add(node.name.text); // 글자 기록
                } // 조건 종료
                ts.forEachChild(node, visit); // 안쪽으로
            })(source); // 순회 실행
        } // 순회 종료
    } // 조건 종료
    const all = process.argv.includes("--all"); // 전체 출력 여부
    const only = process.argv.find((arg) => arg.startsWith("--dir="))?.slice(6); // 폴더 한정
    const rows = [...collectKeys()].filter(([text, rel]) => (all || !known.has(text)) && (only === undefined || only.split(",").some((dir) => rel.startsWith(dir)))); // 출력할 글자
    for (const [text, rel] of rows) // 글자 순회
    { // 순회 시작
        console.log(`${rel}\t${JSON.stringify(text)}`); // 파일과 글자
    } // 순회 종료
    console.error(`${rows.length} keys`); // 개수
} // 실행 종료
