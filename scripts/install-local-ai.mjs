// 로컬 설치(설치 프로그램 전 확인용): 받은 실행 엔진과 앱 목록(model-catalog.json)에 있는 모델 파일을
// 앱이 찾는 %LOCALAPPDATA%\MATE Text-Play\{runtime,models}로 SHA-256을 확인하고 복사한다
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs"; // 파일 시스템 도구
import { join } from "node:path"; // 경로 도구
import { parseArgs } from "node:util"; // 명령 인자 해석기
import { findManifestModel, getLocalAiRoot, getRepositoryRoot, getRuntimeDir, sha256File } from "./lib/local-ai-files.mjs"; // 작업 파일 도구
import { LLAMA_CPP_RELEASE } from "./local-ai/local-ai-pins.mjs"; // 고정 버전

function log(message) // 진행 안내
{ // 함수 시작
    console.log(`[install] ${message}`); // 안내 출력
} // 함수 종료

function readOptions() // 명령 인자 읽기
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        return parseArgs({ options: { target: { type: "string" }, "dry-run": { type: "boolean", default: false } } }).values; // 값 반환
    } // 시도 종료
    catch (error) // 해석 실패
    { // 실패 시작
        console.error(`[install] ${error.message}`); // 오류 안내
        process.exit(2); // 입력 오류 코드
    } // 실패 종료
} // 함수 종료

async function main() // 실행
{ // 함수 시작
    const options = readOptions(); // 명령 인자
    const target = options.target ?? join(process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? ".", "AppData", "Local"), "MATE Text-Play"); // 앱 데이터 폴더
    const root = getLocalAiRoot(); // 작업 폴더
    const catalog = JSON.parse(readFileSync(join(getRepositoryRoot(), "src-tauri", "resources", "model-catalog.json"), "utf8")); // 앱 모델 목록
    const manifestPath = join(root, "models", "manifest.json"); // 만든 모델 목록
    const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { models: [] }; // 만든 모델
    const runtimeCopies = ["vulkan", "cpu"].map((variant) => ({ variant, from: getRuntimeDir(root, LLAMA_CPP_RELEASE.tag, variant), to: join(target, "runtime", variant) })); // 엔진 복사 계획
    for (const copy of runtimeCopies) // 엔진 계획 출력
    { // 반복 시작
        log(`실행 엔진 ${copy.variant}: ${existsSync(join(copy.from, "llama-server.exe")) ? copy.from : "없음(먼저 pnpm local-ai:runtime)"} → ${copy.to}`); // 계획 줄
    } // 반복 종료
    const modelCopies = catalog.models.map((model) => // 모델 복사 계획
    { // 변환 시작
        const entry = manifest.models.find((candidate) => candidate.file === model.file) ?? null; // 만든 파일 정보
        return { model, entry, from: join(root, "models", model.file), to: join(target, "models", model.file) }; // 계획 반환
    }); // 변환 종료
    for (const copy of modelCopies) // 모델 계획 출력
    { // 반복 시작
        const state = copy.entry === null || !existsSync(copy.from) ? "없음(먼저 pnpm local-ai:models)" : copy.entry.size === copy.model.sizeBytes ? copy.from : `${copy.from} (앱 목록 크기 ${copy.model.sizeBytes}와 다름: model-catalog.json 갱신 필요)`; // 상태
        log(`모델 ${copy.model.file}: ${state} → ${copy.to}`); // 계획 줄
    } // 반복 종료
    if (options["dry-run"]) // 계획만 보기 확인
    { // 조건 시작
        return; // 처리 종료
    } // 조건 종료
    for (const copy of runtimeCopies.filter((item) => existsSync(join(item.from, "llama-server.exe")))) // 엔진 복사
    { // 반복 시작
        rmSync(copy.to, { recursive: true, force: true }); // 이전 엔진 삭제
        mkdirSync(copy.to, { recursive: true }); // 폴더 생성
        cpSync(copy.from, copy.to, { recursive: true }); // 엔진 복사
        log(`실행 엔진 ${copy.variant} 복사 완료`); // 완료 안내
    } // 반복 종료
    for (const copy of modelCopies.filter((item) => item.entry !== null && existsSync(item.from))) // 모델 복사
    { // 반복 시작
        if (findManifestModel(manifest, copy.entry.id, copy.entry.quantization) === null || (await sha256File(copy.from)) !== copy.entry.sha256) // 해시 확인
        { // 조건 시작
            throw new Error(`SHA-256이 모델 목록과 다릅니다: ${copy.from}`); // 손상 파일 거부
        } // 조건 종료
        if (existsSync(copy.to) && statSync(copy.to).size === copy.entry.size && (await sha256File(copy.to)) === copy.entry.sha256) // 이미 같은 파일 확인
        { // 조건 시작
            log(`모델 ${copy.model.file}: 이미 같은 파일이 있음`); // 생략 안내
            continue; // 다음 모델
        } // 조건 종료
        mkdirSync(join(target, "models"), { recursive: true }); // 폴더 생성
        copyFileSync(copy.from, copy.to); // 모델 복사
        log(`모델 ${copy.model.file} 복사 완료(앱 AI 모델 화면에서 사용하기를 누르세요)`); // 완료 안내
    } // 반복 종료
} // 함수 종료

await main(); // 실행
