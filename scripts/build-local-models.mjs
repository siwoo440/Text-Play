// 공식 가중치를 고정 리비전으로 받아(SHA-256·git 해시 검사) llama.cpp 변환기로 GGUF를 만들고,
// 양자화한 파일의 크기·SHA-256을 .local-ai/models/manifest.json에 기록한다
import { execFileSync } from "node:child_process"; // 외부 명령 실행기
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"; // 파일 시스템 도구
import { availableParallelism } from "node:os"; // CPU 정보
import { join } from "node:path"; // 경로 도구
import { parseArgs } from "node:util"; // 명령 인자 해석기
import { downloadFile, getHfResolveUrl, getHfTreeUrl, getLocalAiRoot, getModelFileName, getRuntimeDir, getSourceDir, gitBlobSha1File, sha256File, upsertManifestEntry } from "./lib/local-ai-files.mjs"; // 작업 파일 도구
import { LLAMA_CPP_RELEASE, LOCAL_MODEL_SOURCES, findModelSource } from "./local-ai/local-ai-pins.mjs"; // 고정 버전

const STEPS = ["download", "tools", "convert", "quantize"]; // 단계 순서
const LLAMA_CPP_REPOSITORY = "https://github.com/ggml-org/llama.cpp"; // 변환기 저장소

function log(message) // 진행 안내
{ // 함수 시작
    console.log(`[models] ${message}`); // 안내 출력
} // 함수 종료

function fail(message) // 입력 오류 종료
{ // 함수 시작
    console.error(`[models] ${message}`); // 오류 안내
    process.exit(2); // 입력 오류 코드
} // 함수 종료

function readOptions() // 명령 인자 읽기
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        return parseArgs({ options: { models: { type: "string" }, steps: { type: "string", default: STEPS.join(",") }, threads: { type: "string" }, "keep-sources": { type: "boolean", default: false }, "dry-run": { type: "boolean", default: false } } }).values; // 값 반환
    } // 시도 종료
    catch (error) // 해석 실패 처리
    { // 실패 시작
        return fail(error.message); // 입력 오류 종료
    } // 실패 종료
} // 함수 종료

function getPaths(root) // 작업 경로 모음
{ // 함수 시작
    const venv = join(root, "venv"); // 변환기 파이썬 환경
    return { // 경로 반환
        tools: join(root, "tools", `llama.cpp-${LLAMA_CPP_RELEASE.tag}`), // 변환기 소스
        venv, // 파이썬 환경
        python: process.platform === "win32" ? join(venv, "Scripts", "python.exe") : join(venv, "bin", "python"), // 환경 파이썬
        work: join(root, "work"), // 중간 파일
        models: join(root, "models"), // 결과 모델
        manifest: join(root, "models", "manifest.json"), // 모델 목록
        quantize: join(getRuntimeDir(root, LLAMA_CPP_RELEASE.tag, "cpu"), process.platform === "win32" ? "llama-quantize.exe" : "llama-quantize"), // 양자화 도구
    }; // 경로 종료
} // 함수 종료

function run(command, args, options = {}) // 외부 명령 실행(출력 표시)
{ // 함수 시작
    execFileSync(command, args, { stdio: "inherit", ...options }); // 실행
} // 함수 종료

function formatGB(bytes) // GB 표시
{ // 함수 시작
    return `${(bytes / 1073741824).toFixed(2)}GB`; // 크기 반환
} // 함수 종료

async function verifySourceFile(path, file) // 원본 파일 해시 검사
{ // 함수 시작
    if (!existsSync(path) || statSync(path).size !== file.size) // 크기 확인
    { // 조건 시작
        return false; // 불일치
    } // 조건 종료
    return file.lfs === undefined ? (await gitBlobSha1File(path)) === file.oid : (await sha256File(path)) === file.lfs.oid; // 해시 비교 반환
} // 함수 종료

async function download(root, source) // 공식 가중치 받기
{ // 함수 시작
    const directory = getSourceDir(root, source.repo, source.revision); // 원본 폴더
    mkdirSync(directory, { recursive: true }); // 폴더 생성
    const response = await fetch(getHfTreeUrl(source.repo, source.revision)); // 파일 목록 요청
    if (!response.ok) // 응답 확인
    { // 조건 시작
        throw new Error(`파일 목록을 받지 못했습니다 ${response.status}: ${source.repo}@${source.revision}`); // 목록 오류
    } // 조건 종료
    const files = (await response.json()).filter((entry) => entry.type === "file" && entry.path !== ".gitattributes"); // 받을 파일
    writeFileSync(join(directory, "_files.json"), `${JSON.stringify(files, null, 2)}\n`); // 목록 보관
    for (const file of files) // 파일 순회
    { // 반복 시작
        const target = join(directory, ...file.path.split("/")); // 저장 위치
        if (await verifySourceFile(target, file)) // 기존 파일 확인
        { // 조건 시작
            log(`  이미 받음 ${file.path}`); // 생략 안내
            continue; // 다음 파일
        } // 조건 종료
        log(`  받는 중 ${file.path} (${formatGB(file.size)})`); // 받기 안내
        let reported = 0; // 마지막 안내 크기
        await downloadFile(getHfResolveUrl(source.repo, source.revision, file.path), target, { expectedSize: file.size, expectedSha256: file.lfs?.oid, onProgress: (received) => // 받기·검사
        { // 진행률 시작
            if (received - reported >= 536870912) // 512MB마다 안내
            { // 조건 시작
                reported = received; // 안내 크기 갱신
                log(`    ${formatGB(received)} / ${formatGB(file.size)}`); // 진행률 안내
            } // 조건 종료
        } }); // 진행률 종료
        if (!(await verifySourceFile(target, file))) // 받은 파일 검사
        { // 조건 시작
            rmSync(target, { force: true }); // 잘못된 파일 삭제
            throw new Error(`해시가 맞지 않습니다: ${file.path}`); // 해시 오류
        } // 조건 종료
    } // 반복 종료
    log(`  원본 준비 완료 ${directory}`); // 완료 안내
} // 함수 종료

function prepareTools(paths) // 변환기 소스와 파이썬 환경 준비
{ // 함수 시작
    if (!existsSync(join(paths.tools, ".git"))) // 소스 확인
    { // 조건 시작
        run("git", ["clone", "--depth", "1", "--branch", LLAMA_CPP_RELEASE.tag, LLAMA_CPP_REPOSITORY, paths.tools]); // 고정 태그 받기
    } // 조건 종료
    const head = execFileSync("git", ["-C", paths.tools, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); // 받은 커밋
    if (head !== LLAMA_CPP_RELEASE.commit) // 커밋 확인
    { // 조건 시작
        throw new Error(`변환기 커밋이 고정 버전과 다릅니다: ${head}`); // 커밋 오류
    } // 조건 종료
    if (!existsSync(paths.python)) // 파이썬 환경 확인
    { // 조건 시작
        run("python", ["-m", "venv", paths.venv]); // 환경 생성
    } // 조건 종료
    const marker = join(paths.venv, `.requirements-${LLAMA_CPP_RELEASE.tag}`); // 설치 완료 표시
    if (!existsSync(marker)) // 설치 확인
    { // 조건 시작
        run(paths.python, ["-m", "pip", "install", "-r", join(paths.tools, "requirements", "requirements-convert_hf_to_gguf.txt")], { cwd: paths.tools }); // 변환기 의존성 설치
        writeFileSync(marker, `${new Date().toISOString()}\n`); // 설치 표시
    } // 조건 종료
    log(`변환기 준비 완료 (${LLAMA_CPP_RELEASE.tag} ${head.slice(0, 10)})`); // 완료 안내
} // 함수 종료

function convert(root, paths, source) // 공식 가중치 → BF16 GGUF
{ // 함수 시작
    const output = join(paths.work, `${source.id}-BF16.gguf`); // 변환 결과
    if (existsSync(output)) // 기존 결과 확인
    { // 조건 시작
        log(`  변환 결과 있음 ${output}`); // 생략 안내
        return; // 처리 종료
    } // 조건 종료
    const partial = join(paths.work, `${source.id}-BF16.partial.gguf`); // 변환 중 파일
    mkdirSync(paths.work, { recursive: true }); // 폴더 생성
    run(paths.python, [join(paths.tools, "convert_hf_to_gguf.py"), getSourceDir(root, source.repo, source.revision), "--outtype", "bf16", "--outfile", partial], { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }); // 변환 실행
    renameSync(partial, output); // 완료 파일로 이동
} // 함수 종료

function readManifest(paths) // 모델 목록 읽기
{ // 함수 시작
    return existsSync(paths.manifest) ? JSON.parse(readFileSync(paths.manifest, "utf8")) : { llamaCpp: LLAMA_CPP_RELEASE, models: [] }; // 목록 반환
} // 함수 종료

async function quantize(root, paths, source, threads, keepSources) // BF16 GGUF → 양자화·해시 기록
{ // 함수 시작
    const input = join(paths.work, `${source.id}-BF16.gguf`); // 변환 결과
    if (!existsSync(paths.quantize)) // 양자화 도구 확인
    { // 조건 시작
        throw new Error(`양자화 도구가 없습니다: ${paths.quantize} (먼저 node scripts/fetch-llama-runtime.mjs 실행)`); // 준비 안내
    } // 조건 종료
    mkdirSync(paths.models, { recursive: true }); // 폴더 생성
    for (const quantization of source.quantizations) // 양자화 순회
    { // 반복 시작
        const file = getModelFileName(source.id, quantization); // 결과 파일 이름
        const output = join(paths.models, file); // 결과 위치
        const partial = `${output}.partial`; // 양자화 중 파일
        run(paths.quantize, [input, partial, quantization, String(threads)]); // 양자화 실행
        renameSync(partial, output); // 완료 파일로 이동
        const entry = { id: source.id, label: source.label, role: source.role, quantization, file, size: statSync(output).size, sha256: await sha256File(output), license: source.license, source: { repo: source.repo, revision: source.revision }, llamaCpp: LLAMA_CPP_RELEASE.tag, createdAt: new Date().toISOString() }; // 목록 항목
        writeFileSync(paths.manifest, `${JSON.stringify(upsertManifestEntry(readManifest(paths), entry), null, 2)}\n`); // 목록 저장
        log(`  ${file} ${formatGB(entry.size)} SHA-256 ${entry.sha256}`); // 결과 안내
    } // 반복 종료
    rmSync(input, { force: true }); // 중간 파일 삭제
    if (!keepSources) // 원본 보존 확인
    { // 조건 시작
        rmSync(getSourceDir(root, source.repo, source.revision), { recursive: true, force: true }); // 원본 삭제(디스크 확보)
    } // 조건 종료
} // 함수 종료

async function main() // 실행
{ // 함수 시작
    const options = readOptions(); // 명령 인자
    const root = getLocalAiRoot(); // 작업 폴더
    const paths = getPaths(root); // 작업 경로
    const steps = options.steps.split(","); // 실행 단계
    const unknownSteps = steps.filter((step) => !STEPS.includes(step)); // 모르는 단계
    if (unknownSteps.length > 0) // 단계 확인
    { // 조건 시작
        fail(`알 수 없는 단계입니다: ${unknownSteps.join(", ")} (${STEPS.join(", ")} 중에서 고르세요)`); // 입력 오류
    } // 조건 종료
    const ids = options.models === undefined ? LOCAL_MODEL_SOURCES.map((source) => source.id) : options.models.split(","); // 모델 식별자
    const sources = ids.map((id) => findModelSource(id) ?? fail(`알 수 없는 모델입니다: ${id} (${LOCAL_MODEL_SOURCES.map((source) => source.id).join(", ")})`)); // 모델 원본
    const threads = options.threads === undefined ? availableParallelism() : Number(options.threads); // 양자화 스레드
    log(`llama.cpp ${LLAMA_CPP_RELEASE.version} (${LLAMA_CPP_RELEASE.tag}) · 단계 ${steps.join(" → ")}`); // 버전 안내
    for (const source of sources) // 계획 출력
    { // 반복 시작
        log(`${source.id}: ${source.repo}@${source.revision} (원본 ${source.sourceGB}GB, ${source.license})`); // 원본 줄
        log(`  변환: convert_hf_to_gguf.py → ${join(paths.work, `${source.id}-BF16.gguf`)}`); // 변환 줄
        for (const quantization of source.quantizations) // 양자화 순회
        { // 반복 시작
            log(`  양자화: ${quantization} → ${join(paths.models, getModelFileName(source.id, quantization))}`); // 양자화 줄
        } // 반복 종료
    } // 반복 종료
    if (options["dry-run"]) // 계획만 보기 확인
    { // 조건 시작
        return; // 처리 종료
    } // 조건 종료
    if (steps.includes("tools")) // 변환기 단계 확인
    { // 조건 시작
        prepareTools(paths); // 변환기 준비
    } // 조건 종료
    for (const source of sources) // 모델 순회(하나씩 끝내 디스크 사용을 줄임)
    { // 반복 시작
        log(`${source.id} 시작`); // 시작 안내
        if (steps.includes("download")) // 받기 단계 확인
        { // 조건 시작
            await download(root, source); // 원본 받기
        } // 조건 종료
        if (steps.includes("convert")) // 변환 단계 확인
        { // 조건 시작
            convert(root, paths, source); // 변환
        } // 조건 종료
        if (steps.includes("quantize")) // 양자화 단계 확인
        { // 조건 시작
            await quantize(root, paths, source, threads, options["keep-sources"]); // 양자화
        } // 조건 종료
    } // 반복 종료
    log(`모델 목록: ${paths.manifest}`); // 결과 안내
} // 함수 종료

await main(); // 실행
