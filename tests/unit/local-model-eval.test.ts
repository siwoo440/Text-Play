import { describe, expect, it } from "vitest"; // 테스트 도구
import { buildChatRequestBody, buildLlamaServerArgs, createSseDecoder, parseBackendSpec, parseListDevices, percentile, pickSingleDevice, renderEvalReport, summarizeBufferSizes, summarizeRuns } from "../../scripts/lib/local-model-eval.mjs"; // 평가 도구

const DEVICE_OUTPUT = // 장치 목록 출력 예시
[ // 줄 목록 시작
    "load_backend: loaded Vulkan backend from C:\\llama\\ggml-vulkan.dll", // 백엔드 적재 줄
    "Available devices:", // 목록 제목
    "  Vulkan0: NVIDIA GeForce RTX 5070 Ti (16303 MiB, 15012 MiB free)", // 외장 그래픽
    "  Vulkan1: AMD Radeon(TM) Graphics (8146 MiB, 7900 MiB free)", // 내장 그래픽
].join("\n"); // 줄 결합

const SERVER_LOG = // 실행 엔진 기록 예시
[ // 줄 목록 시작
    "load_tensors:      Vulkan0 model buffer size =  1450.25 MiB", // 모델 그래픽 메모리
    "load_tensors:   CPU_Mapped model buffer size =   210.00 MiB", // 모델 주 메모리
    "llama_kv_cache:    Vulkan0 KV buffer size =   192.00 MiB", // 문맥 저장 그래픽 메모리
    "llama_memory_recurrent:    Vulkan0 RS buffer size =    50.00 MiB", // 순환 상태 그래픽 메모리
    "llama_context:    Vulkan0 compute buffer size =   300.50 MiB", // 계산 그래픽 메모리
    "llama_context: Vulkan_Host compute buffer size =    20.01 MiB", // 계산 주 메모리
].join("\n"); // 줄 결합

function createRun(overrides: Record<string, unknown> = {}): Record<string, unknown> // 평가 실행 기록 생성
{ // 함수 시작
    return { caseId: "c01", category: "탐색", parse: "ok", validation: "ok", forbiddenChecked: false, forbiddenHits: [], koreanRatio: 1, hasHanCharacters: false, ttftMs: 100, totalMs: 1000, predictedTokens: 50, predictedPerSecond: 50, promptTokens: 400, promptPerSecond: 800, finishReason: "stop", error: null, ...overrides }; // 기본 기록 반환
} // 함수 종료

describe("실행 방식 해석", () => // 실행 방식 묶음
{ // 묶음 시작
    it("vulkan·cpu와 장치·스레드 지정을 해석한다", () => // 해석 검증
    { // 테스트 시작
        expect(parseBackendSpec("vulkan")).toEqual({ kind: "vulkan", device: null, threads: null, label: "vulkan" }); // 그래픽 자동
        expect(parseBackendSpec("vulkan:Vulkan1")).toEqual({ kind: "vulkan", device: "Vulkan1", threads: null, label: "vulkan:Vulkan1" }); // 그래픽 지정
        expect(parseBackendSpec("cpu")).toEqual({ kind: "cpu", device: null, threads: null, label: "cpu" }); // CPU 기본
        expect(parseBackendSpec("cpu:4")).toEqual({ kind: "cpu", device: null, threads: 4, label: "cpu:4" }); // CPU 스레드 지정
        expect(() => parseBackendSpec("cuda")).toThrow("실행 방식"); // 지원하지 않는 방식
        expect(() => parseBackendSpec("cpu:0")).toThrow("스레드"); // 잘못된 스레드
    }); // 테스트 종료

    it("그래픽 장치가 하나일 때만 자동으로 고른다", () => // 장치 선택 검증
    { // 테스트 시작
        const devices = parseListDevices(DEVICE_OUTPUT); // 장치 해석
        expect(devices).toEqual( // 장치 목록 확인
        [ // 기대 목록 시작
            { name: "Vulkan0", description: "NVIDIA GeForce RTX 5070 Ti", totalMiB: 16303, freeMiB: 15012 }, // 외장 그래픽
            { name: "Vulkan1", description: "AMD Radeon(TM) Graphics", totalMiB: 8146, freeMiB: 7900 }, // 내장 그래픽
        ]); // 기대 목록 종료
        expect(pickSingleDevice(devices)).toBeNull(); // 여러 장치는 고르지 않음(내장 그래픽이 공유 메모리를 크게 보고함)
        expect(pickSingleDevice(devices.slice(0, 1))).toBe("Vulkan0"); // 하나면 그 장치
        expect(pickSingleDevice([])).toBeNull(); // 장치 없음 확인
    }); // 테스트 종료

    it("로컬 전용 주소·일회용 키·단일 슬롯으로 실행 인자를 만든다", () => // 실행 인자 검증
    { // 테스트 시작
        const common = ["-m", "m.gguf", "--host", "127.0.0.1", "--port", "4321", "--api-key", "k", "-c", "4096", "-np", "1", "--no-webui", "--jinja", "-t", "8"]; // 공통 인자
        expect(buildLlamaServerArgs({ modelPath: "m.gguf", port: 4321, apiKey: "k", contextLength: 4096, backend: { kind: "vulkan", device: "Vulkan0" }, threads: 8 })).toEqual([...common, "-ngl", "999", "--device", "Vulkan0"]); // 그래픽 실행 인자
        expect(buildLlamaServerArgs({ modelPath: "m.gguf", port: 4321, apiKey: "k", contextLength: 4096, backend: { kind: "cpu", device: null }, threads: 8 })).toEqual([...common, "-ngl", "0"]); // CPU 실행 인자
    }); // 테스트 종료
}); // 묶음 종료

describe("응답 요청과 스트림", () => // 요청 묶음
{ // 묶음 시작
    it("JSON 스키마 강제·생성 설정·템플릿 인자를 담은 스트리밍 요청을 만든다", () => // 요청 본문 검증
    { // 테스트 시작
        const body = buildChatRequestBody({ messages: [{ role: "user", content: "x" }], responseSchema: { type: "object" }, generation: { temperature: 0.7, top_p: 0.8 }, chatTemplateKwargs: { enable_thinking: false }, seed: 7, maxTokens: 640 }); // 본문 생성
        expect(body).toEqual( // 본문 확인
        { // 기대값 시작
            messages: [{ role: "user", content: "x" }], // 메시지
            stream: true, // 스트리밍
            max_tokens: 640, // 최대 길이
            seed: 7, // 고정 시드
            temperature: 0.7, // 온도
            top_p: 0.8, // top-p
            response_format: { type: "json_schema", json_schema: { name: "text_play_response", strict: true, schema: { type: "object" } } }, // 형식 강제
            chat_template_kwargs: { enable_thinking: false }, // 템플릿 인자
        }); // 기대값 종료
        expect(buildChatRequestBody({ messages: [], responseSchema: null, generation: {}, chatTemplateKwargs: null, seed: 1, maxTokens: 8 })).toEqual({ messages: [], stream: true, max_tokens: 8, seed: 1 }); // 선택 항목 생략 확인
    }); // 테스트 종료

    it("나뉘어 도착한 SSE 줄을 사건으로 모은다", () => // SSE 해석 검증
    { // 테스트 시작
        const decoder = createSseDecoder(); // 해석기 생성
        expect(decoder.push("data: {\"a\":1}\r\n\r\nda")).toEqual([{ a: 1 }]); // 첫 사건 확인
        expect(decoder.push("ta: {\"b\":2}\n\n: 주석\n\ndata: [DONE]\n\n")).toEqual([{ b: 2 }, "[DONE]"]); // 이어진 사건 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("측정 요약", () => // 요약 묶음
{ // 묶음 시작
    it("실행 엔진 기록에서 그래픽·주 메모리 사용량을 더한다", () => // 메모리 합계 검증
    { // 테스트 시작
        expect(summarizeBufferSizes(SERVER_LOG)).toEqual({ gpuMiB: 1992.75, cpuMiB: 230.01 }); // 합계 확인
    }); // 테스트 종료

    it("가까운 순위 방식으로 백분위를 구한다", () => // 백분위 검증
    { // 테스트 시작
        expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3); // 중앙값 확인
        expect(percentile([5, 1, 3, 2, 4, 6, 7, 8, 9, 10], 0.9)).toBe(9); // 90% 확인
        expect(percentile([], 0.5)).toBeNull(); // 빈 목록 확인
    }); // 테스트 종료

    it("형식 성공률·행동 통과율·규칙 위반 차단·한국어·속도를 요약한다", () => // 요약 검증
    { // 테스트 시작
        const summary = summarizeRuns( // 요약 실행
        [ // 실행 기록 시작
            createRun({ totalMs: 1000, ttftMs: 100, predictedPerSecond: 40 }), // 정상
            createRun({ caseId: "c02", validation: "stat-out-of-range", totalMs: 2000, ttftMs: 300, predictedPerSecond: 60 }), // 행동 실패
            createRun({ caseId: "c03", parse: "invalid-json", validation: "skipped", koreanRatio: null, finishReason: "length", totalMs: 4000, ttftMs: 200, predictedPerSecond: 50 }), // 형식 실패
            createRun({ caseId: "c04", category: "규칙 위반", forbiddenChecked: true, forbiddenHits: [{ type: "change-stat", stat: "gold", amount: 5 }], hasHanCharacters: true, totalMs: 3000, ttftMs: 400, predictedPerSecond: 30 }), // 규칙 위반 넘어감
        ]); // 실행 기록 종료
        expect(summary).toEqual( // 요약 확인
        { // 기대값 시작
            cases: 4, // 문맥 수
            jsonOk: 3, // 형식 성공
            jsonRate: 0.75, // 형식 성공률
            actionOk: 2, // 행동 통과
            actionRate: 2 / 3, // 행동 통과율
            guardedCases: 1, // 규칙 위반 문맥
            guardedResisted: 0, // 차단 성공
            koreanOk: 2, // 한국어 통과
            koreanRate: 2 / 3, // 한국어 비율
            truncated: 1, // 길이 잘림
            errors: 0, // 요청 오류
            ttftMedianMs: 200, // 첫 글자 중앙값
            turnMedianMs: 2000, // 한 턴 중앙값
            turnP90Ms: 4000, // 한 턴 90%
            turnMaxMs: 4000, // 한 턴 최대
            tokensPerSecondMedian: 40, // 생성 속도 중앙값
            promptTokensPerSecondMedian: 800, // 문맥 처리 속도 중앙값
        }); // 기대값 종료
    }); // 테스트 종료

    it("모델별 요약표와 문맥별 응답 비교를 보고서로 만든다", () => // 보고서 검증
    { // 테스트 시작
        const runs = [createRun({ narration: "달빛이 번진다.", dialogue: { speaker: "리라", content: "왔구나." }, actions: [] })]; // 실행 기록
        const report = renderEvalReport( // 보고서 생성
        { // 입력 시작
            createdAt: "2026-10-01T00:00:00.000Z", // 생성 시각
            machine: { cpu: "Ryzen", gpus: ["RTX"], ramGB: 32 }, // 측정 PC
            cases: [{ id: "c01", category: "탐색", stateLabel: "숲 입구 시작", input: "둘러본다" }], // 문맥 목록
            results: [{ label: "Mi:dm Q4_K_M · vulkan", startupMs: 1500, warmupMs: 300, memory: { gpuMiB: 1900, cpuMiB: 200, peakWorkingSetMiB: 900 }, summary: summarizeRuns(runs), runs }], // 결과 목록
        }); // 입력 종료
        expect(report).toContain("| 모델·실행 | JSON 형식 | 행동 통과 |"); // 요약표 머리 확인
        expect(report).toContain("| Mi:dm Q4_K_M · vulkan | 100% (1/1) | 100% (1/1) |"); // 요약 행 확인
        expect(report).toContain("### c01 · 탐색 · 숲 입구 시작"); // 문맥 제목 확인
        expect(report).toContain("> 둘러본다"); // 입력 확인
        expect(report).toContain("달빛이 번진다."); // 서술 확인
        expect(report).toContain("리라: 왔구나."); // 대사 확인
    }); // 테스트 종료
}); // 묶음 종료
