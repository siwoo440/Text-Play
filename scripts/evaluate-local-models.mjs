// 내장 로컬 AI 측정: llama-server를 모델·실행 방식별로 띄우거나(--models·--backends) 이미 떠 있는 OpenAI 호환 서버(--server-url)에
// Text-Play 평가 문맥을 앱과 같은 메시지·JSON 스키마로 보내고, 형식·행동·속도·메모리를 results.json과 report.md로 남긴다
import { execFileSync, spawn, spawnSync } from "node:child_process"; // 자식 프로세스 도구
import { randomBytes } from "node:crypto"; // 일회용 키 생성기
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"; // 파일 시스템 도구
import { createServer } from "node:net"; // 빈 포트 확인용 서버
import { availableParallelism, cpus, totalmem } from "node:os"; // PC 정보
import { dirname, join, resolve } from "node:path"; // 경로 도구
import { parseArgs } from "node:util"; // 명령 인자 해석기
import { runnerImport } from "vite"; // 앱 TypeScript 모듈 불러오기
import { findManifestModel, getLocalAiRoot, getRepositoryRoot, getRuntimeDir } from "./lib/local-ai-files.mjs"; // 작업 파일 도구
import { buildChatRequestBody, buildLlamaServerArgs, createSseDecoder, parseBackendSpec, parseListDevices, pickLargestDevice, renderEvalReport, summarizeBufferSizes, summarizeRuns } from "./lib/local-model-eval.mjs"; // 측정 도구
import { LLAMA_CPP_RELEASE, LOCAL_MODEL_SOURCES, findModelSource } from "./local-ai/local-ai-pins.mjs"; // 고정 버전

const REQUEST_TIMEOUT_MS = 600_000; // 한 요청 최대 대기
const HEALTH_TIMEOUT_MS = 300_000; // 실행 엔진 준비 최대 대기

function fail(message) // 입력 오류 종료
{ // 함수 시작
    console.error(`[eval] ${message}`); // 오류 안내
    process.exit(2); // 입력 오류 코드
} // 함수 종료

function log(message) // 진행 안내
{ // 함수 시작
    console.log(`[eval] ${message}`); // 안내 출력
} // 함수 종료

function readOptions() // 명령 인자 읽기
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        return parseArgs( // 인자 해석
        { // 설정 시작
            options: // 지원 인자
            { // 목록 시작
                models: { type: "string" }, // 모델:양자화 목록
                backends: { type: "string", default: "vulkan,cpu" }, // 실행 방식 목록
                threads: { type: "string" }, // CPU 스레드 수
                context: { type: "string", default: "4096" }, // 문맥 길이
                limit: { type: "string" }, // 문맥 개수 제한
                "max-tokens": { type: "string", default: "640" }, // 최대 생성 길이
                out: { type: "string" }, // 결과 폴더
                "server-url": { type: "string" }, // 이미 떠 있는 서버 주소
                "model-id": { type: "string" }, // 서버 주소 사용 시 생성 설정 모델
                label: { type: "string" }, // 서버 주소 사용 시 표시 이름
                "api-key": { type: "string" }, // 서버 주소 사용 시 키
            }, // 목록 종료
        }).values; // 값 반환
    } // 시도 종료
    catch (error) // 해석 실패 처리
    { // 실패 시작
        return fail(error.message); // 입력 오류 종료
    } // 실패 종료
} // 함수 종료

function toPositiveInteger(value, name) // 양의 정수 변환
{ // 함수 시작
    const number = Number(value); // 숫자 변환
    if (!Number.isInteger(number) || number <= 0) // 값 확인
    { // 조건 시작
        fail(`${name} 값이 올바르지 않습니다: ${value}`); // 입력 오류
    } // 조건 종료
    return number; // 숫자 반환
} // 함수 종료

function readManifest(root) // 모델 목록 파일 읽기
{ // 함수 시작
    const path = join(root, "models", "manifest.json"); // 목록 경로
    if (!existsSync(path)) // 목록 존재 확인
    { // 조건 시작
        fail(`모델 목록이 없습니다: ${path} (먼저 node scripts/build-local-models.mjs 실행)`); // 준비 안내
    } // 조건 종료
    return JSON.parse(readFileSync(path, "utf8")); // 목록 반환
} // 함수 종료

function resolveModelTargets(root, spec) // 측정할 모델 파일 목록
{ // 함수 시작
    const manifest = readManifest(root); // 모델 목록
    const wanted = spec === undefined ? LOCAL_MODEL_SOURCES.flatMap((source) => source.quantizations.map((quantization) => `${source.id}:${quantization}`)) : spec.split(","); // 측정 대상
    const targets = []; // 모델 파일 목록
    for (const item of wanted) // 대상 순회
    { // 반복 시작
        const [id, quantization = "Q4_K_M"] = item.split(":"); // 모델과 양자화
        const source = findModelSource(id); // 모델 원본
        if (source === null) // 원본 확인
        { // 조건 시작
            fail(`알 수 없는 모델입니다: ${id}`); // 입력 오류
        } // 조건 종료
        const entry = findManifestModel(manifest, id, quantization); // 만든 모델 파일
        if (entry === null) // 파일 확인
        { // 조건 시작
            if (spec !== undefined) // 직접 고른 모델 확인
            { // 조건 시작
                fail(`만든 모델 파일이 없습니다: ${id} ${quantization}`); // 준비 안내
            } // 조건 종료
            continue; // 기본 목록에서는 건너뜀
        } // 조건 종료
        targets.push({ source, quantization, path: join(root, "models", entry.file), label: `${source.label} ${quantization}` }); // 대상 추가
    } // 반복 종료
    if (targets.length === 0) // 대상 확인
    { // 조건 시작
        fail("측정할 모델 파일이 없습니다."); // 준비 안내
    } // 조건 종료
    return targets; // 대상 반환
} // 함수 종료

async function loadEvalModule() // 앱 문맥·판정 모듈 불러오기(Vite 모듈 실행기)
{ // 함수 시작
    const root = getRepositoryRoot().replace(/\\/gu, "/"); // 저장소 경로
    const { module } = await runnerImport(`${root}/scripts/local-ai/text-play-eval.ts`, { configFile: false, root, logLevel: "error", resolve: { alias: { "@chatbot": `${root}/src/chatbot`, "@": `${root}/src` } } }); // 모듈 실행
    return module; // 모듈 반환
} // 함수 종료

function findFreePort() // 빈 포트 찾기
{ // 함수 시작
    return new Promise((resolvePort, rejectPort) => // 포트 대기
    { // 대기 시작
        const server = createServer(); // 임시 서버
        server.once("error", rejectPort); // 오류 전달
        server.listen(0, "127.0.0.1", () => // 임의 포트 열기
        { // 처리 시작
            const { port } = server.address(); // 받은 포트
            server.close(() => resolvePort(port)); // 닫고 포트 반환
        }); // 처리 종료
    }); // 대기 종료
} // 함수 종료

function sleep(milliseconds) // 잠시 대기
{ // 함수 시작
    return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)); // 대기 반환
} // 함수 종료

function readNvidiaMemoryUsedMiB() // NVIDIA 그래픽 메모리 사용량
{ // 함수 시작
    try // 조회 시도
    { // 시도 시작
        const output = execFileSync("nvidia-smi", ["--query-gpu=memory.used", "--format=csv,noheader,nounits"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); // 사용량 조회
        return output.split(/\r?\n/u).filter((line) => line.trim().length > 0).reduce((total, line) => total + Number(line.trim()), 0); // 합계 반환
    } // 시도 종료
    catch // 조회 실패 처리
    { // 실패 시작
        return null; // 정보 없음
    } // 실패 종료
} // 함수 종료

function readPeakWorkingSetMiB(pid) // 프로세스 최대 작업 집합(Windows)
{ // 함수 시작
    if (process.platform !== "win32") // Windows 확인
    { // 조건 시작
        return null; // 정보 없음
    } // 조건 종료
    try // 조회 시도
    { // 시도 시작
        const output = execFileSync("powershell", ["-NoProfile", "-Command", `(Get-Process -Id ${pid}).PeakWorkingSet64`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); // 최대 작업 집합 조회
        return Math.round(Number(output.trim()) / 1048576); // MiB 반환
    } // 시도 종료
    catch // 조회 실패 처리
    { // 실패 시작
        return null; // 정보 없음
    } // 실패 종료
} // 함수 종료

function listVulkanDevices(serverExe) // Vulkan 장치 목록
{ // 함수 시작
    const result = spawnSync(serverExe, ["--list-devices"], { cwd: dirname(serverExe), encoding: "utf8", windowsHide: true }); // 장치 조회
    return parseListDevices(`${result.stdout ?? ""}\n${result.stderr ?? ""}`); // 장치 해석
} // 함수 종료

async function chat(baseUrl, apiKey, body) // 스트리밍 응답 받기
{ // 함수 시작
    const started = performance.now(); // 시작 시각
    const response = await fetch(`${baseUrl}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...(apiKey === null ? {} : { Authorization: `Bearer ${apiKey}` }) }, body: JSON.stringify(body), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }); // 요청 전송
    if (!response.ok) // 응답 상태 확인
    { // 조건 시작
        throw new Error(`응답 실패 ${response.status}: ${(await response.text()).slice(0, 300)}`); // 상태 오류
    } // 조건 종료
    const decoder = createSseDecoder(); // SSE 해석기
    const text = new TextDecoder(); // 글자 해석기
    let content = ""; // 응답 내용
    let ttftMs = null; // 첫 글자 시간
    let finishReason = null; // 종료 이유
    let timings = null; // 실행 엔진 측정값
    for await (const chunk of response.body) // 스트림 순회
    { // 반복 시작
        for (const event of decoder.push(text.decode(chunk, { stream: true }))) // 사건 순회
        { // 반복 시작
            if (event === "[DONE]") // 종료 사건 확인
            { // 조건 시작
                continue; // 건너뜀
            } // 조건 종료
            const choice = event.choices?.[0]; // 첫 선택지
            const delta = choice?.delta?.content; // 응답 조각
            if (typeof delta === "string" && delta.length > 0) // 조각 확인
            { // 조건 시작
                ttftMs ??= performance.now() - started; // 첫 글자 시간 기록
                content += delta; // 내용 누적
            } // 조건 종료
            finishReason = choice?.finish_reason ?? finishReason; // 종료 이유 갱신
            timings = event.timings ?? timings; // 측정값 갱신
        } // 반복 종료
    } // 반복 종료
    return { content, ttftMs, totalMs: performance.now() - started, finishReason, timings }; // 결과 반환
} // 함수 종료

async function runCases(context) // 평가 문맥 전체 실행
{ // 함수 시작
    const { baseUrl, apiKey, source, requests, evalModule, maxTokens, label } = context; // 실행 설정
    const runs = []; // 실행 기록
    for (const [index, request] of requests.entries()) // 문맥 순회
    { // 반복 시작
        const body = buildChatRequestBody({ messages: request.messages, responseSchema: request.responseSchema, generation: source?.generation ?? {}, chatTemplateKwargs: source?.chatTemplateKwargs ?? null, seed: 20261001 + index, maxTokens }); // 요청 본문
        const base = { caseId: request.caseId, category: request.category, forbiddenChecked: request.forbidden.length > 0 }; // 공통 기록
        try // 요청 시도
        { // 시도 시작
            const reply = await chat(baseUrl, apiKey, body); // 응답 받기
            const judgement = evalModule.judgeTextPlayEvalOutput(request.caseId, reply.content); // 앱 기준 판정
            runs.push({ ...base, ...judgement, raw: reply.content, ttftMs: reply.ttftMs, totalMs: reply.totalMs, finishReason: reply.finishReason, predictedTokens: reply.timings?.predicted_n ?? null, predictedPerSecond: reply.timings?.predicted_per_second ?? null, promptTokens: reply.timings?.prompt_n ?? null, promptPerSecond: reply.timings?.prompt_per_second ?? null, error: null }); // 기록 추가
        } // 시도 종료
        catch (error) // 요청 실패 처리
        { // 실패 시작
            runs.push({ ...base, parse: "request-error", validation: "skipped", forbiddenHits: [], narration: null, dialogue: null, actions: [], koreanRatio: null, hasHanCharacters: false, raw: "", ttftMs: null, totalMs: null, finishReason: null, predictedTokens: null, predictedPerSecond: null, promptTokens: null, promptPerSecond: null, error: error.message }); // 실패 기록 추가
        } // 실패 종료
        const last = runs.at(-1); // 마지막 기록
        log(`(${index + 1}/${requests.length}) ${label} ${request.caseId} 형식 ${last.parse} · 행동 ${last.validation} · ${last.totalMs === null ? "-" : `${(last.totalMs / 1000).toFixed(1)}초`}`); // 진행 안내
    } // 반복 종료
    return runs; // 기록 반환
} // 함수 종료

async function waitForHealth(baseUrl, child, getLog) // 실행 엔진 준비 대기
{ // 함수 시작
    const deadline = Date.now() + HEALTH_TIMEOUT_MS; // 마감 시각
    while (Date.now() < deadline) // 마감 전 반복
    { // 반복 시작
        if (child.exitCode !== null) // 비정상 종료 확인
        { // 조건 시작
            throw new Error(`실행 엔진이 종료되었습니다(코드 ${child.exitCode}): ${getLog().slice(-800)}`); // 종료 오류
        } // 조건 종료
        try // 준비 확인 시도
        { // 시도 시작
            const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) }); // 준비 확인
            if (response.ok) // 준비 완료 확인
            { // 조건 시작
                return; // 대기 종료
            } // 조건 종료
        } // 시도 종료
        catch // 연결 실패 처리
        { // 실패 시작
            // 아직 열리지 않음
        } // 실패 종료
        await sleep(500); // 잠시 대기
    } // 반복 종료
    throw new Error("실행 엔진 준비 시간이 지났습니다."); // 시간 초과
} // 함수 종료

async function stopServer(child) // 실행 엔진 종료
{ // 함수 시작
    if (child.exitCode !== null) // 이미 종료 확인
    { // 조건 시작
        return; // 처리 종료
    } // 조건 종료
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit)); // 종료 대기
    child.kill(); // 종료 요청
    await Promise.race([exited, sleep(10_000)]); // 종료 또는 시간 초과
} // 함수 종료

async function measureWithServer(context) // llama-server를 띄워 한 모델·실행 방식 측정
{ // 함수 시작
    const { root, target, backend, threads, contextLength, out } = context; // 측정 설정
    const label = `${target.label} · ${backend.label}`; // 표시 이름
    const result = { label, modelId: target.source.id, quantization: target.quantization, backend: backend.label, startupMs: null, warmupMs: null, memory: null, summary: null, runs: [], error: null }; // 결과 틀
    const serverExe = join(getRuntimeDir(root, LLAMA_CPP_RELEASE.tag, backend.kind), "llama-server.exe"); // 실행 엔진 경로
    if (!existsSync(serverExe)) // 실행 엔진 확인
    { // 조건 시작
        return { ...result, error: `실행 엔진이 없습니다: ${serverExe} (먼저 node scripts/fetch-llama-runtime.mjs 실행)` }; // 준비 안내
    } // 조건 종료
    const device = backend.kind === "vulkan" ? backend.device ?? pickLargestDevice(listVulkanDevices(serverExe)) : null; // 그래픽 장치
    const port = await findFreePort(); // 빈 포트
    const apiKey = randomBytes(24).toString("hex"); // 일회용 키
    const gpuBefore = readNvidiaMemoryUsedMiB(); // 실행 전 그래픽 메모리
    const started = performance.now(); // 시작 시각
    const child = spawn(serverExe, buildLlamaServerArgs({ modelPath: target.path, port, apiKey, contextLength, backend: { kind: backend.kind, device }, threads: backend.threads ?? threads }), { cwd: dirname(serverExe), stdio: ["ignore", "pipe", "pipe"], windowsHide: true }); // 실행 엔진 시작
    let serverLog = ""; // 실행 엔진 기록
    child.stdout.on("data", (chunk) => { serverLog += chunk.toString("utf8"); }); // 표준 출력 기록
    child.stderr.on("data", (chunk) => { serverLog += chunk.toString("utf8"); }); // 오류 출력 기록
    const baseUrl = `http://127.0.0.1:${port}`; // 서버 주소
    try // 측정 시도
    { // 시도 시작
        log(`${label} 실행 엔진 시작 (${device ?? "CPU"})`); // 시작 안내
        await waitForHealth(baseUrl, child, () => serverLog); // 준비 대기
        result.startupMs = performance.now() - started; // 준비 시간
        const warmup = await chat(baseUrl, apiKey, buildChatRequestBody({ messages: [{ role: "user", content: "안녕" }], responseSchema: null, generation: {}, chatTemplateKwargs: target.source.chatTemplateKwargs, seed: 1, maxTokens: 8 })); // 첫 응답(셰이더 준비 포함)
        result.warmupMs = warmup.totalMs; // 첫 응답 시간
        const gpuAfter = readNvidiaMemoryUsedMiB(); // 적재 후 그래픽 메모리
        result.runs = await runCases({ ...context, baseUrl, apiKey, source: target.source, label }); // 문맥 실행
        result.memory = { ...summarizeBufferSizes(serverLog), peakWorkingSetMiB: readPeakWorkingSetMiB(child.pid), gpuUsedDeltaMiB: gpuBefore === null || gpuAfter === null ? null : gpuAfter - gpuBefore }; // 메모리 기록
        result.summary = summarizeRuns(result.runs); // 요약
    } // 시도 종료
    catch (error) // 측정 실패 처리
    { // 실패 시작
        result.error = error.message; // 실패 기록
    } // 실패 종료
    finally // 정리
    { // 정리 시작
        await stopServer(child); // 실행 엔진 종료
        writeFileSync(join(out, `${target.source.id}-${target.quantization}-${backend.label.replace(":", "-")}.log`), serverLog); // 실행 엔진 기록 저장
    } // 정리 종료
    return result; // 결과 반환
} // 함수 종료

function describeMachine(root) // 측정 PC 정보
{ // 함수 시작
    const vulkanExe = join(getRuntimeDir(root, LLAMA_CPP_RELEASE.tag, "vulkan"), "llama-server.exe"); // Vulkan 실행 엔진
    const gpus = existsSync(vulkanExe) ? listVulkanDevices(vulkanExe).map((device) => `${device.name} ${device.description} (${device.totalMiB}MiB)`) : []; // 그래픽 장치
    return { cpu: `${cpus()[0]?.model.trim() ?? "알 수 없음"} (${availableParallelism()}스레드)`, gpus, ramGB: Math.round(totalmem() / 1073741824) }; // 정보 반환
} // 함수 종료

function saveReport(out, report) // 결과·보고서 저장
{ // 함수 시작
    writeFileSync(join(out, "results.json"), `${JSON.stringify(report, null, 2)}\n`); // 결과 파일
    writeFileSync(join(out, "report.md"), renderEvalReport(report)); // 보고서 파일
} // 함수 종료

async function main() // 측정 실행
{ // 함수 시작
    const options = readOptions(); // 명령 인자
    const root = getLocalAiRoot(); // 작업 폴더
    const contextLength = toPositiveInteger(options.context, "--context"); // 문맥 길이
    const maxTokens = toPositiveInteger(options["max-tokens"], "--max-tokens"); // 최대 생성 길이
    const threads = options.threads === undefined ? Math.max(1, Math.floor(availableParallelism() / 2)) : toPositiveInteger(options.threads, "--threads"); // CPU 스레드 수
    const out = resolve(options.out ?? join(root, "eval", new Date().toISOString().replace(/[:.]/gu, "-"))); // 결과 폴더
    mkdirSync(out, { recursive: true }); // 결과 폴더 생성
    const evalModule = await loadEvalModule(); // 앱 모듈
    const allRequests = evalModule.createTextPlayEvalRequests(); // 평가 요청
    const requests = options.limit === undefined ? allRequests : allRequests.slice(0, toPositiveInteger(options.limit, "--limit")); // 문맥 제한
    const report = { createdAt: new Date().toISOString(), llamaCpp: LLAMA_CPP_RELEASE, machine: describeMachine(root), settings: { contextLength, maxTokens, threads }, cases: evalModule.createTextPlayEvalCases().slice(0, requests.length).map(({ id, category, stateLabel, input }) => ({ id, category, stateLabel, input })), results: [] }; // 보고서 틀
    if (options["server-url"] !== undefined) // 외부 서버 측정 확인
    { // 조건 시작
        const source = options["model-id"] === undefined ? null : findModelSource(options["model-id"]); // 생성 설정 모델
        if (options["model-id"] !== undefined && source === null) // 모델 확인
        { // 조건 시작
            fail(`알 수 없는 모델입니다: ${options["model-id"]}`); // 입력 오류
        } // 조건 종료
        const label = options.label ?? options["server-url"]; // 표시 이름
        const baseUrl = options["server-url"].replace(/\/$/u, ""); // 서버 주소
        const apiKey = options["api-key"] ?? null; // 키
        const warmup = await chat(baseUrl, apiKey, buildChatRequestBody({ messages: [{ role: "user", content: "안녕" }], responseSchema: null, generation: {}, chatTemplateKwargs: source?.chatTemplateKwargs ?? null, seed: 1, maxTokens: 8 })); // 첫 응답
        const runs = await runCases({ baseUrl, apiKey, source, requests, evalModule, maxTokens, label }); // 문맥 실행
        report.results.push({ label, modelId: source?.id ?? null, quantization: null, backend: "server-url", startupMs: null, warmupMs: warmup.totalMs, memory: null, summary: summarizeRuns(runs), runs, error: null }); // 결과 추가
        saveReport(out, report); // 저장
        log(`결과: ${join(out, "report.md")}`); // 결과 안내
        return; // 처리 종료
    } // 조건 종료
    let backends = []; // 실행 방식 목록
    try // 실행 방식 해석
    { // 시도 시작
        backends = options.backends.split(",").map(parseBackendSpec); // 실행 방식 해석
    } // 시도 종료
    catch (error) // 해석 실패 처리
    { // 실패 시작
        fail(error.message); // 입력 오류
    } // 실패 종료
    for (const target of resolveModelTargets(root, options.models)) // 모델 순회
    { // 반복 시작
        for (const backend of backends) // 실행 방식 순회
        { // 반복 시작
            report.results.push(await measureWithServer({ root, target, backend, threads, contextLength, out, requests, evalModule, maxTokens })); // 측정 결과 추가
            saveReport(out, report); // 중간 저장
        } // 반복 종료
    } // 반복 종료
    log(`결과: ${join(out, "report.md")}`); // 결과 안내
} // 함수 종료

await main(); // 측정 실행
