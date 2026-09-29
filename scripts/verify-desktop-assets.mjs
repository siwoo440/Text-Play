import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"; // 파일 시스템 도구
import { resolve } from "node:path"; // 경로 결합 도구

const outputRoot = resolve("desktop-dist"); // 출력 루트 경로
const indexPath = resolve(outputRoot, "index.html"); // HTML 경로
const requiredAssets = // 필수 장면 자산
[ // 목록 시작
    "images/scenes/moon-library.svg", // 달빛 도서관 이미지
    "images/scenes/dawn-letter.svg", // 새벽 편지 이미지
    "images/scenes/rainy-classroom.svg", // 비 오는 교실 이미지
    "images/scenes/fallback-scene.svg", // 기본 장면 이미지
]; // 목록 종료
const forbiddenStrings = ["MATEVERSE_LLM_API_TOKEN", "/api/llm"]; // 금지 문자열 목록

function collectTextFiles(directory) // 텍스트 파일 수집기
{ // 함수 시작
    return readdirSync(directory).flatMap((name) => // 폴더 항목 순회
    { // 함수 시작
        const target = resolve(directory, name); // 항목 경로 생성
        if (statSync(target).isDirectory()) // 폴더 여부 확인
        { // 조건 시작
            return collectTextFiles(target); // 하위 파일 반환
        } // 조건 종료
        return /\.(?:css|html|js|mjs)$/u.test(name) ? [target] : []; // 텍스트 자산 반환
    }); // 순회 종료
} // 함수 종료

function fail(message) // 검증 실패 처리기
{ // 함수 시작
    console.error(`[desktop-assets] ${message}`); // 실패 문구 출력
    process.exitCode = 1; // 실패 종료 코드
} // 함수 종료

if (!existsSync(indexPath)) // HTML 존재 확인
{ // 조건 시작
    fail("desktop-dist/index.html 파일이 없습니다."); // HTML 누락 기록
} // 조건 종료
else // HTML 존재 처리
{ // 조건 시작
    const index = readFileSync(indexPath, "utf8"); // HTML 내용 읽기
    if (/(?:src|href)=["']https?:\/\//iu.test(index)) // 원격 자산 주소 확인
    { // 조건 시작
        fail("index.html에 원격 자산 주소가 있습니다."); // 원격 자산 실패 기록
    } // 조건 종료
} // 조건 종료

for (const asset of requiredAssets) // 필수 자산 순회
{ // 순회 시작
    if (!existsSync(resolve(outputRoot, asset))) // 자산 존재 확인
    { // 조건 시작
        fail(`필수 자산이 없습니다: ${asset}`); // 자산 누락 기록
    } // 조건 종료
} // 순회 종료

if (existsSync(outputRoot)) // 출력 폴더 확인
{ // 조건 시작
    const bundledText = collectTextFiles(outputRoot).map((file) => readFileSync(file, "utf8")).join("\n"); // 번들 문자열 결합
    for (const forbidden of forbiddenStrings) // 금지 문자열 순회
    { // 순회 시작
        if (bundledText.includes(forbidden)) // 금지 문자열 확인
        { // 조건 시작
            fail(`금지 문자열이 포함되었습니다: ${forbidden}`); // 금지 문자열 기록
        } // 조건 종료
    } // 순회 종료
} // 조건 종료

if (process.exitCode !== 1) // 검증 성공 확인
{ // 조건 시작
    console.log("[desktop-assets] 필수 자산과 오프라인 경계를 확인했습니다."); // 성공 문구 출력
} // 조건 종료
