import { execFileSync } from "node:child_process"; // git 실행 도구
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"; // 파일 시스템 도구
import { dirname, resolve } from "node:path"; // 경로 도구

const root = process.cwd(); // Text-Play 저장소 루트
const sourceRoot = resolve(process.argv[2] ?? "../ChatBot"); // ChatBot 저장소 루트
const requestedRef = process.argv[3] ?? "origin/main"; // 가져올 커밋(기본: 원격 main)
const targetSource = resolve(root, "src/chatbot"); // 소스 대상 폴더
const targetTests = resolve(root, "tests/chatbot"); // 테스트 대상 폴더
const sourceFolders = ["app", "components", "features", "lib", "mocks", "test"]; // 가져올 소스 폴더
const testFolders = ["unit", "components", "integration"]; // 가져올 테스트 폴더
const importRules = // 가져오기 경로 변환 규칙(순서 중요)
[ // 규칙 시작
    [/(["'])@\//gu, "$1@chatbot/"], // ChatBot 별칭을 전용 별칭으로 변경
    [/(["'])next\/link\1/gu, "$1@/desktop/next-compat/link$1"], // 링크를 데스크톱 호환 모듈로 변경
    [/(["'])next\/image\1/gu, "$1@/desktop/next-compat/image$1"], // 이미지를 데스크톱 호환 모듈로 변경
    [/(["'])next\/navigation\1/gu, "$1@/desktop/next-compat/navigation$1"], // 경로 도구를 데스크톱 호환 모듈로 변경
]; // 규칙 종료

function fail(message) // 실패 처리기
{ // 함수 시작
    console.error(`[sync-chatbot] ${message}`); // 실패 문구 출력
    process.exit(1); // 실패 종료
} // 함수 종료

function git(args, encoding = "utf8") // git 명령 실행기
{ // 함수 시작
    return execFileSync("git", ["-C", sourceRoot, ...args], { encoding, maxBuffer: 256 * 1024 * 1024 }); // 실행 결과 반환
} // 함수 종료

function rewriteRouteType(text) // Next 경로 타입 가져오기 변환
{ // 함수 시작
    return text.replace(/import type \{([^}]*)\} from (["'])next\2;?/gu, (match, names, quote) => // 타입 가져오기 순회
    { // 변환 시작
        const list = names.split(",").map((name) => name.trim()).filter((name) => name.length > 0); // 타입 이름 목록
        if (!list.includes("Route")) // 경로 타입 포함 확인
        { // 조건 시작
            return match; // 그대로 유지
        } // 조건 종료
        const routeImport = `import type { Route } from ${quote}@/desktop/next-compat/route${quote};`; // 호환 경로 타입
        const rest = list.filter((name) => name !== "Route"); // 나머지 타입
        return rest.length === 0 ? routeImport : `import type { ${rest.join(", ")} } from ${quote}next${quote}; ${routeImport}`; // 변환 결과 반환
    }); // 변환 종료
} // 함수 종료

function rewriteImports(text) // 가져오기 경로 변환기
{ // 함수 시작
    return rewriteRouteType(importRules.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)); // 규칙 적용 결과 반환
} // 함수 종료

function sameAsset(current, incoming, path) // 자산 내용 비교
{ // 함수 시작
    if (/\.(?:svg|json|txt|css|html)$/u.test(path)) // 텍스트 자산 확인
    { // 조건 시작
        return current.toString("utf8").replace(/\r\n/gu, "\n") === incoming.toString("utf8").replace(/\r\n/gu, "\n"); // 줄바꿈 차이 무시 비교
    } // 조건 종료
    return current.equals(incoming); // 이진 비교
} // 함수 종료

function targetOf(path) // 원본 경로의 대상 경로
{ // 함수 시작
    const [top, folder, ...rest] = path.split("/"); // 경로 조각
    if (top === "src" && sourceFolders.includes(folder)) // 소스 확인
    { // 조건 시작
        return resolve(targetSource, folder, ...rest); // 소스 대상 반환
    } // 조건 종료
    if (top === "tests" && testFolders.includes(folder)) // 테스트 확인
    { // 조건 시작
        return resolve(targetTests, folder, ...rest); // 테스트 대상 반환
    } // 조건 종료
    return null; // 대상 아님
} // 함수 종료

if (!existsSync(resolve(sourceRoot, ".git"))) // 원본 저장소 확인
{ // 조건 시작
    fail(`git 저장소가 아닙니다: ${sourceRoot}`); // 원본 오류
} // 조건 종료
const commit = git(["rev-parse", "--verify", `${requestedRef}^{commit}`]).trim(); // 가져올 커밋 확정
const subject = git(["log", "-1", "--format=%s", commit]).trim(); // 커밋 제목
const files = git(["ls-tree", "-r", "-z", "--name-only", commit, "--", "src", "tests", "public"]).split("\0").filter((path) => path.length > 0); // 커밋 파일 목록
if (!files.includes("src/features/core/types.ts")) // ChatBot 구조 확인
{ // 조건 시작
    fail(`ChatBot 저장소가 아닙니다: ${sourceRoot}`); // 구조 오류
} // 조건 종료

rmSync(targetSource, { recursive: true, force: true }); // 기존 소스 사본 삭제
rmSync(targetTests, { recursive: true, force: true }); // 기존 테스트 사본 삭제
let addedAssets = 0; // 추가 자산 수
for (const path of files) // 커밋 파일 순회
{ // 순회 시작
    const content = git(["show", `${commit}:${path}`], "buffer"); // 커밋 내용 읽기
    if (path.startsWith("public/")) // 공용 자산 확인
    { // 조건 시작
        const target = resolve(root, path); // 대상 자산 경로
        if (!existsSync(target)) // 새 자산 확인
        { // 조건 시작
            mkdirSync(dirname(target), { recursive: true }); // 대상 폴더 생성
            writeFileSync(target, content); // 새 자산 저장
            addedAssets += 1; // 추가 수 증가
        } // 조건 종료
        else if (!sameAsset(readFileSync(target), content, path)) // 같은 이름 다른 내용 확인
        { // 조건 시작
            console.warn(`[sync-chatbot] 내용이 다른 자산은 웹 화면 보호를 위해 덮어쓰지 않았습니다: ${path}`); // 덮어쓰기 생략 안내
        } // 조건 종료
        continue; // 다음 파일
    } // 조건 종료
    const target = targetOf(path); // 대상 경로 계산
    if (target === null) // 대상 아님 확인
    { // 조건 시작
        continue; // 다음 파일
    } // 조건 종료
    mkdirSync(dirname(target), { recursive: true }); // 대상 폴더 생성
    writeFileSync(target, /\.(?:ts|tsx)$/u.test(path) ? rewriteImports(content.toString("utf8")) : content); // 변환 후 저장
} // 순회 종료

writeFileSync(resolve(targetSource, "SOURCE.md"), [ // 원본 기록 저장
    "---", // 구분선
    "# ChatBot 원본 기록", // 제목
    "", // 빈 줄
    "이 폴더는 `scripts/sync-chatbot.mjs`가 [siwoo440/ChatBot](https://github.com/siwoo440/ChatBot)의 커밋에서 만든 소스 사본입니다. 작업 폴더의 커밋하지 않은 수정은 가져오지 않습니다. 직접 고치지 말고 ChatBot에서 고쳐 커밋한 뒤 다시 동기화합니다.", // 안내
    "", // 빈 줄
    `- 원본 커밋: \`${commit}\` (\`${subject}\`)`, // 커밋 기록
    "- 범위: `src/app`·`components`·`features`·`lib`·`mocks`·`test`, `tests/unit`·`components`·`integration`, Text-Play에 없는 `public` 자산", // 범위 기록
    "- 변환: `@/` → `@chatbot/`, `next/link`·`next/image`·`next/navigation`·`Route` 타입 → `@/desktop/next-compat/*`", // 변환 기록
    "- 동기화: `node scripts/sync-chatbot.mjs <ChatBot 저장소 경로> [커밋, 기본 origin/main]`", // 실행 방법
    "", // 끝 줄
].join("\n")); // 기록 종료
console.log(`[sync-chatbot] ${commit.slice(0, 7)} 동기화 완료, 파일 ${files.length}개 확인, 새 공용 자산 ${addedAssets}개`); // 완료 안내
