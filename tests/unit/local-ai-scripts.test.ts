// @vitest-environment node
import { execFile, execFileSync } from "node:child_process"; // 자식 프로세스 도구
import { mkdtempSync, readFileSync } from "node:fs"; // 파일 시스템 도구
import { createServer, type IncomingMessage, type Server } from "node:http"; // 시험용 HTTP 서버
import type { AddressInfo } from "node:net"; // 서버 주소 형식
import { tmpdir } from "node:os"; // 임시 폴더 도구
import { join } from "node:path"; // 경로 도구
import { afterEach, describe, expect, it } from "vitest"; // 테스트 도구

let server: Server | null = null; // 실행 중 서버

function runScript(args: string[]): { code: number; output: string } // 스크립트 동기 실행
{ // 함수 시작
    try // 실행 시도
    { // 시도 시작
        return { code: 0, output: execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; // 성공 결과 반환
    } // 시도 종료
    catch (caught) // 실패 처리
    { // 실패 시작
        const failure = caught as { status: number; stdout: string; stderr: string }; // 실패 정보
        return { code: failure.status, output: `${failure.stdout}${failure.stderr}` }; // 실패 결과 반환
    } // 실패 종료
} // 함수 종료

function runScriptAsync(args: string[]): Promise<{ code: number; output: string }> // 스크립트 비동기 실행
{ // 함수 시작
    return new Promise((resolveRun) => // 완료 대기
    { // 대기 시작
        execFile(process.execPath, args, { encoding: "utf8" }, (error, stdout, stderr) => resolveRun({ code: error === null ? 0 : Number(error.code ?? 1), output: `${stdout}${stderr}` })); // 결과 전달
    }); // 대기 종료
} // 함수 종료

function readBody(request: IncomingMessage): Promise<string> // 요청 본문 읽기
{ // 함수 시작
    return new Promise((resolveBody) => // 본문 대기
    { // 대기 시작
        let body = ""; // 본문 누적값
        request.setEncoding("utf8"); // 문자 인코딩
        request.on("data", (chunk: string) => { body += chunk; }); // 조각 누적
        request.on("end", () => resolveBody(body)); // 완료 전달
    }); // 대기 종료
} // 함수 종료

async function startFakeLlamaServer(bodies: Record<string, unknown>[]): Promise<string> // 가짜 OpenAI 호환 서버 시작
{ // 함수 시작
    server = createServer(async (request, response) => // 요청 처리기
    { // 처리 시작
        if (request.url === "/health") // 준비 확인 요청
        { // 조건 시작
            response.writeHead(200, { "Content-Type": "application/json" }); // 준비 응답 머리
            response.end("{\"status\":\"ok\"}"); // 준비 응답
            return; // 처리 종료
        } // 조건 종료
        const body = JSON.parse(await readBody(request)) as Record<string, unknown>; // 요청 본문
        bodies.push(body); // 본문 기록
        const content = JSON.stringify({ narration: "안개가 천천히 걷힌다.", dialogue: null, proposedActions: [] }); // 응답 내용
        const half = Math.floor(content.length / 2); // 나눌 위치
        response.writeHead(200, { "Content-Type": "text/event-stream" }); // 스트림 머리
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: content.slice(0, half) }, finish_reason: null }] })}\n\n`); // 첫 조각
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: content.slice(half) }, finish_reason: null }] })}\n\n`); // 둘째 조각
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }], timings: { prompt_n: 120, prompt_ms: 60, prompt_per_second: 2000, predicted_n: 24, predicted_ms: 240, predicted_per_second: 100 } })}\n\n`); // 마지막 조각
        response.end("data: [DONE]\n\n"); // 스트림 종료
    }); // 처리기 종료
    await new Promise<void>((resolveListen) => server?.listen(0, "127.0.0.1", resolveListen)); // 임의 포트 대기
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`; // 주소 반환
} // 함수 종료

afterEach(async () => // 서버 정리
{ // 정리 시작
    await new Promise<void>((resolveClose) => (server === null ? resolveClose() : server.close(() => resolveClose()))); // 서버 종료
    server = null; // 참조 제거
}); // 정리 종료

describe("실행 엔진 받기 스크립트", () => // 실행 엔진 묶음
{ // 묶음 시작
    it("받기 계획에 고정 빌드 주소와 풀 위치를 보여 준다", () => // 계획 출력 검증
    { // 테스트 시작
        const result = runScript(["scripts/fetch-llama-runtime.mjs", "--dry-run"]); // 계획 실행
        expect(result.code).toBe(0); // 성공 확인
        expect(result.output).toContain("https://github.com/ggml-org/llama.cpp/releases/download/b11146/llama-b11146-bin-win-vulkan-x64.zip"); // Vulkan 주소 확인
        expect(result.output).toContain("https://github.com/ggml-org/llama.cpp/releases/download/b11146/llama-b11146-bin-win-cpu-x64.zip"); // CPU 주소 확인
        expect(result.output).toContain(join(".local-ai", "runtime", "b11146", "vulkan")); // 풀 위치 확인
    }); // 테스트 종료

    it("--variants로 고른 빌드만 받는다", () => // 빌드 선택 검증
    { // 테스트 시작
        const result = runScript(["scripts/fetch-llama-runtime.mjs", "--dry-run", "--variants", "cpu"]); // 계획 실행
        expect(result.output).toContain("win-cpu-x64.zip"); // CPU 포함 확인
        expect(result.output).not.toContain("win-vulkan-x64.zip"); // Vulkan 제외 확인
        expect(runScript(["scripts/fetch-llama-runtime.mjs", "--dry-run", "--variants", "cuda"]).code).toBe(2); // 모르는 빌드 거부 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("로컬 설치 스크립트", () => // 로컬 설치 묶음
{ // 묶음 시작
    it("실행 엔진과 앱 목록에 있는 모델을 앱 데이터 폴더로 옮기는 계획을 보여 준다", () => // 계획 출력 검증
    { // 테스트 시작
        const target = mkdtempSync(join(tmpdir(), "local-install-")); // 대상 폴더
        const result = runScript(["scripts/install-local-ai.mjs", "--dry-run", "--target", target]); // 계획 실행
        expect(result.code, result.output).toBe(0); // 성공 확인
        expect(result.output).toContain(join(target, "runtime", "vulkan")); // 그래픽 엔진 위치 확인
        expect(result.output).toContain(join(target, "runtime", "cpu")); // CPU 엔진 위치 확인
        expect(result.output).toContain("midm-2.0-mini-Q4_K_M.gguf"); // 앱 목록 가벼운 모델 확인
        expect(result.output).not.toContain("midm-2.0-mini-Q5_K_M.gguf"); // 앱 목록에 없는 비교용 파일 제외 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("모델 만들기 스크립트", () => // 모델 만들기 묶음
{ // 묶음 시작
    it("공식 가중치 리비전·변환·양자화 결과 파일을 계획으로 보여 준다", () => // 계획 출력 검증
    { // 테스트 시작
        const result = runScript(["scripts/build-local-models.mjs", "--dry-run", "--models", "midm-2.0-mini"]); // 계획 실행
        expect(result.code).toBe(0); // 성공 확인
        expect(result.output).toContain("K-intelligence/Midm-2.0-Mini-Instruct@383eb221c52a32278f1985257b264ade8d982e60"); // 원본 리비전 확인
        expect(result.output).toContain("convert_hf_to_gguf.py"); // 변환 도구 확인
        expect(result.output).toContain("midm-2.0-mini-Q4_K_M.gguf"); // Q4 결과 확인
        expect(result.output).toContain("midm-2.0-mini-Q5_K_M.gguf"); // Q5 결과 확인
        expect(result.output).not.toContain("Qwen/Qwen3.5-4B"); // 다른 모델 제외 확인
    }); // 테스트 종료

    it("모르는 모델이나 단계는 실패 코드 2로 끝낸다", () => // 입력 오류 검증
    { // 테스트 시작
        expect(runScript(["scripts/build-local-models.mjs", "--dry-run", "--models", "gpt-9"]).code).toBe(2); // 모르는 모델 확인
        expect(runScript(["scripts/build-local-models.mjs", "--dry-run", "--steps", "upload"]).code).toBe(2); // 모르는 단계 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("로컬 모델 측정 스크립트", () => // 측정 묶음
{ // 묶음 시작
    it("OpenAI 호환 서버에 앱과 같은 요청을 보내고 결과와 보고서를 남긴다", async () => // 종단 측정 검증
    { // 테스트 시작
        const bodies: Record<string, unknown>[] = []; // 받은 요청 목록
        const url = await startFakeLlamaServer(bodies); // 가짜 서버 시작
        const out = mkdtempSync(join(tmpdir(), "local-eval-")); // 결과 폴더
        const result = await runScriptAsync(["scripts/evaluate-local-models.mjs", "--server-url", url, "--model-id", "qwen3.5-4b", "--label", "가짜 서버", "--limit", "3", "--out", out]); // 측정 실행
        expect(result.code, result.output).toBe(0); // 성공 확인
        const saved = JSON.parse(readFileSync(join(out, "results.json"), "utf8")) as { results: { runs: unknown[]; summary: Record<string, unknown> }[] }; // 결과 파일
        expect(saved.results).toHaveLength(1); // 결과 묶음 확인
        expect(saved.results[0].runs).toHaveLength(3); // 문맥 수 확인
        expect(saved.results[0].summary).toMatchObject({ cases: 3, jsonOk: 3, actionOk: 3, tokensPerSecondMedian: 100 }); // 요약 확인
        expect(readFileSync(join(out, "report.md"), "utf8")).toContain("가짜 서버"); // 보고서 확인
        const caseBodies = bodies.filter((body) => body.response_format !== undefined) as { messages: { content: string }[]; response_format: { json_schema: { schema: { required: string[] } } } }[]; // 문맥 요청만
        expect(caseBodies).toHaveLength(3); // 문맥 요청 수 확인
        expect(caseBodies[0]).toMatchObject({ stream: true, temperature: 0.7, top_p: 0.8, top_k: 20, chat_template_kwargs: { enable_thinking: false }, response_format: { type: "json_schema" } }); // 요청 설정 확인
        expect(caseBodies[0].response_format.json_schema.schema.required).toEqual(["narration", "dialogue", "proposedActions"]); // 스키마 확인
        expect(caseBodies[0].messages[1].content).toContain("사용자 행동:"); // 앱 메시지 형식 확인
    }, 60_000); // 시간 제한
}); // 묶음 종료
