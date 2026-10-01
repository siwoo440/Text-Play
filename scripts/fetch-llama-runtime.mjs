// llama.cpp 고정 빌드(Windows Vulkan·CPU)를 GitHub 릴리스에서 받아 SHA-256을 검사하고 .local-ai/runtime/<태그>/<종류>에 푼다
import { execFileSync } from "node:child_process"; // 압축 해제 실행기
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"; // 파일 시스템 도구
import { join } from "node:path"; // 경로 도구
import { parseArgs } from "node:util"; // 명령 인자 해석기
import { downloadFile, getLocalAiRoot, getRuntimeDir, sha256File } from "./lib/local-ai-files.mjs"; // 작업 파일 도구
import { LLAMA_CPP_RELEASE, LLAMA_RUNTIME_ASSETS, getRuntimeAssetUrl } from "./local-ai/local-ai-pins.mjs"; // 고정 버전

function log(message) // 진행 안내
{ // 함수 시작
    console.log(`[runtime] ${message}`); // 안내 출력
} // 함수 종료

function fail(message) // 입력 오류 종료
{ // 함수 시작
    console.error(`[runtime] ${message}`); // 오류 안내
    process.exit(2); // 입력 오류 코드
} // 함수 종료

function readOptions() // 명령 인자 읽기
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        return parseArgs({ options: { variants: { type: "string", default: "vulkan,cpu" }, "dry-run": { type: "boolean", default: false } } }).values; // 값 반환
    } // 시도 종료
    catch (error) // 해석 실패 처리
    { // 실패 시작
        return fail(error.message); // 입력 오류 종료
    } // 실패 종료
} // 함수 종료

function isPrepared(directory, asset) // 이미 푼 빌드 확인
{ // 함수 시작
    const marker = join(directory, ".complete.json"); // 완료 표시 파일
    return existsSync(marker) && JSON.parse(readFileSync(marker, "utf8")).sha256 === asset.sha256 && existsSync(join(directory, "llama-server.exe")); // 같은 빌드 확인
} // 함수 종료

async function prepare(root, asset) // 한 빌드 받기·검사·풀기
{ // 함수 시작
    const directory = getRuntimeDir(root, LLAMA_CPP_RELEASE.tag, asset.variant); // 풀 위치
    if (isPrepared(directory, asset)) // 준비 여부 확인
    { // 조건 시작
        log(`${asset.variant}: 이미 준비됨 (${directory})`); // 생략 안내
        return; // 처리 종료
    } // 조건 종료
    const archive = join(root, "downloads", asset.file); // 압축 파일 위치
    mkdirSync(join(root, "downloads"), { recursive: true }); // 받기 폴더 생성
    if (existsSync(archive) && (await sha256File(archive)) !== asset.sha256) // 기존 파일 검사
    { // 조건 시작
        rmSync(archive); // 손상 파일 삭제
    } // 조건 종료
    if (!existsSync(archive)) // 받기 필요 확인
    { // 조건 시작
        log(`${asset.variant}: 받는 중 ${getRuntimeAssetUrl(asset)}`); // 받기 안내
        await downloadFile(getRuntimeAssetUrl(asset), archive, { expectedSize: asset.size, expectedSha256: asset.sha256 }); // 받기·검사
    } // 조건 종료
    rmSync(directory, { recursive: true, force: true }); // 이전 풀기 결과 삭제
    mkdirSync(directory, { recursive: true }); // 풀 위치 생성
    const tar = process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar"; // ZIP을 푸는 Windows 기본 tar
    execFileSync(tar, ["-xf", archive, "-C", directory], { stdio: "inherit" }); // 압축 풀기
    if (!existsSync(join(directory, "llama-server.exe"))) // 실행 파일 확인
    { // 조건 시작
        throw new Error(`압축 안에 llama-server.exe가 없습니다: ${archive}`); // 구조 오류
    } // 조건 종료
    writeFileSync(join(directory, ".complete.json"), `${JSON.stringify({ tag: LLAMA_CPP_RELEASE.tag, variant: asset.variant, file: asset.file, sha256: asset.sha256, preparedAt: new Date().toISOString() }, null, 2)}\n`); // 완료 표시
    log(`${asset.variant}: 준비 완료 (${directory})`); // 완료 안내
} // 함수 종료

async function main() // 실행
{ // 함수 시작
    const options = readOptions(); // 명령 인자
    const root = getLocalAiRoot(); // 작업 폴더
    const variants = options.variants.split(","); // 고른 빌드
    const unknown = variants.filter((variant) => !LLAMA_RUNTIME_ASSETS.some((asset) => asset.variant === variant)); // 모르는 빌드
    if (unknown.length > 0) // 입력 확인
    { // 조건 시작
        fail(`알 수 없는 빌드입니다: ${unknown.join(", ")} (vulkan, cpu 중에서 고르세요)`); // 입력 오류
    } // 조건 종료
    const assets = LLAMA_RUNTIME_ASSETS.filter((asset) => variants.includes(asset.variant)); // 받을 빌드
    log(`llama.cpp ${LLAMA_CPP_RELEASE.version} (${LLAMA_CPP_RELEASE.tag}, ${LLAMA_CPP_RELEASE.commit.slice(0, 10)})`); // 버전 안내
    for (const asset of assets) // 계획 출력
    { // 반복 시작
        log(`${asset.variant}: ${getRuntimeAssetUrl(asset)} (${(asset.size / 1048576).toFixed(1)}MB, SHA-256 ${asset.sha256.slice(0, 12)}…) → ${getRuntimeDir(root, LLAMA_CPP_RELEASE.tag, asset.variant)}`); // 계획 줄
    } // 반복 종료
    if (options["dry-run"]) // 계획만 보기 확인
    { // 조건 시작
        return; // 처리 종료
    } // 조건 종료
    for (const asset of assets) // 빌드 순회
    { // 반복 시작
        await prepare(root, asset); // 빌드 준비
    } // 반복 종료
} // 함수 종료

await main(); // 실행
