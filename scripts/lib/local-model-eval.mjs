// 내장 로컬 AI 측정 도구: 실행 방식 해석, llama-server 인자, 요청 본문, SSE 해석, 측정 요약, 보고서
const GPU_DEVICE = /^(Vulkan|CUDA|ROCm|SYCL|OpenCL)\d+$/u; // 그래픽 장치 이름 형식

export function parseBackendSpec(spec) // 실행 방식 해석(vulkan, vulkan:<장치>, cpu, cpu:<스레드>)
{ // 함수 시작
    const [kind, option, ...rest] = spec.split(":"); // 종류와 선택값
    if (rest.length > 0 || (kind !== "vulkan" && kind !== "cpu") || option === "") // 형식 확인
    { // 조건 시작
        throw new Error(`알 수 없는 실행 방식입니다: ${spec} (vulkan, vulkan:<장치>, cpu, cpu:<스레드> 중 하나)`); // 형식 오류
    } // 조건 종료
    if (kind === "vulkan") // 그래픽 실행 확인
    { // 조건 시작
        return { kind, device: option ?? null, threads: null, label: spec }; // 그래픽 실행 반환
    } // 조건 종료
    if (option === undefined) // CPU 기본 확인
    { // 조건 시작
        return { kind, device: null, threads: null, label: spec }; // CPU 기본 반환
    } // 조건 종료
    const threads = Number(option); // 스레드 수
    if (!Number.isInteger(threads) || threads <= 0) // 스레드 수 확인
    { // 조건 시작
        throw new Error(`스레드 수가 올바르지 않습니다: ${spec}`); // 스레드 오류
    } // 조건 종료
    return { kind, device: null, threads, label: spec }; // CPU 스레드 지정 반환
} // 함수 종료

export function parseListDevices(output) // llama-server --list-devices 출력 해석
{ // 함수 시작
    const pattern = /^\s*(\S+):\s+(.+?)\s+\((\d+) MiB, (\d+) MiB free\)\s*$/u; // 장치 줄 형식
    return output.split(/\r?\n/u).map((line) => line.match(pattern)).filter((match) => match !== null).map((match) => ({ name: match[1], description: match[2], totalMiB: Number(match[3]), freeMiB: Number(match[4]) })); // 장치 목록 반환
} // 함수 종료

export function pickSingleDevice(devices) // 그래픽 장치가 하나일 때만 자동 선택
{ // 함수 시작
    return devices.length === 1 ? devices[0].name : null; // 여러 개면 내장 그래픽이 공유 메모리를 크게 보고할 수 있어 직접 고르게 함
} // 함수 종료

export function buildLlamaServerArgs(options) // llama-server 실행 인자
{ // 함수 시작
    const { modelPath, port, apiKey, contextLength, backend, threads } = options; // 실행 설정
    const args = ["-m", modelPath, "--host", "127.0.0.1", "--port", String(port), "--api-key", apiKey, "-c", String(contextLength), "-np", "1", "--no-webui", "--jinja", "-t", String(threads)]; // 공통 인자(로컬 전용·일회용 키·단일 슬롯)
    if (backend.kind === "cpu") // CPU 실행 확인
    { // 조건 시작
        return [...args, "-ngl", "0"]; // 그래픽 층 없음
    } // 조건 종료
    return backend.device === null ? [...args, "-ngl", "999"] : [...args, "-ngl", "999", "--device", backend.device]; // 모든 층 그래픽 배치
} // 함수 종료

export function buildChatRequestBody(options) // OpenAI 호환 스트리밍 요청 본문
{ // 함수 시작
    const { messages, responseSchema, generation, chatTemplateKwargs, seed, maxTokens } = options; // 요청 설정
    const body = { messages, stream: true, max_tokens: maxTokens, seed, ...generation }; // 기본 본문
    if (responseSchema !== null) // 형식 강제 확인
    { // 조건 시작
        body.response_format = { type: "json_schema", json_schema: { name: "text_play_response", strict: true, schema: responseSchema } }; // JSON 스키마 강제
    } // 조건 종료
    if (chatTemplateKwargs !== null) // 템플릿 인자 확인
    { // 조건 시작
        body.chat_template_kwargs = chatTemplateKwargs; // 템플릿 인자 반영
    } // 조건 종료
    return body; // 본문 반환
} // 함수 종료

export function createSseDecoder() // SSE 조각 해석기
{ // 함수 시작
    let buffer = ""; // 남은 내용
    return { // 해석기 반환
        push(text) // 조각 추가
        { // 함수 시작
            buffer = `${buffer}${text}`.replace(/\r\n/gu, "\n"); // 줄바꿈 통일
            const events = []; // 완성 사건
            let separator = buffer.indexOf("\n\n"); // 사건 경계
            while (separator >= 0) // 완성 사건 순회
            { // 반복 시작
                const block = buffer.slice(0, separator); // 사건 내용
                buffer = buffer.slice(separator + 2); // 남은 내용
                const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n"); // 데이터 줄
                if (data.length > 0) // 데이터 확인
                { // 조건 시작
                    events.push(data === "[DONE]" ? "[DONE]" : JSON.parse(data)); // 사건 추가
                } // 조건 종료
                separator = buffer.indexOf("\n\n"); // 다음 경계
            } // 반복 종료
            return events; // 사건 반환
        }, // 함수 종료
    }; // 해석기 종료
} // 함수 종료

function round2(value) // 소수 둘째 자리 반올림
{ // 함수 시작
    return Math.round(value * 100) / 100; // 반올림 값 반환
} // 함수 종료

export function summarizeBufferSizes(logText) // 실행 엔진 기록의 메모리 버퍼 합계
{ // 함수 시작
    let gpu = 0; // 그래픽 메모리
    let cpu = 0; // 주 메모리
    for (const match of logText.matchAll(/(\S+) (?:model|KV|RS|compute|output) buffer size =\s*([\d.]+) MiB/gu)) // 버퍼 줄 순회
    { // 반복 시작
        if (GPU_DEVICE.test(match[1])) // 그래픽 장치 확인
        { // 조건 시작
            gpu += Number(match[2]); // 그래픽 메모리 누적
        } // 조건 종료
        else // 주 메모리 처리
        { // 조건 시작
            cpu += Number(match[2]); // 주 메모리 누적
        } // 조건 종료
    } // 반복 종료
    return { gpuMiB: round2(gpu), cpuMiB: round2(cpu) }; // 합계 반환
} // 함수 종료

export function percentile(values, fraction) // 가까운 순위 백분위
{ // 함수 시작
    if (values.length === 0) // 빈 목록 확인
    { // 조건 시작
        return null; // 값 없음 반환
    } // 조건 종료
    const sorted = [...values].sort((left, right) => left - right); // 오름차순 정렬
    return sorted[Math.max(Math.ceil(fraction * sorted.length) - 1, 0)]; // 순위 값 반환
} // 함수 종료

function ratio(count, total) // 비율 계산
{ // 함수 시작
    return total === 0 ? 0 : count / total; // 비율 반환
} // 함수 종료

export function summarizeRuns(runs) // 문맥별 측정 요약
{ // 함수 시작
    const parsed = runs.filter((run) => run.parse === "ok"); // 형식 성공
    const actionOk = parsed.filter((run) => run.validation === "ok").length; // 행동 통과
    const guarded = runs.filter((run) => run.forbiddenChecked); // 규칙 위반 문맥
    const koreanOk = parsed.filter((run) => (run.koreanRatio ?? 0) >= 0.8 && !run.hasHanCharacters).length; // 한국어 통과
    const timed = runs.filter((run) => run.error === null); // 시간 측정 대상
    const numbers = (pick) => timed.map(pick).filter((value) => typeof value === "number"); // 숫자 값 모음
    const turns = numbers((run) => run.totalMs); // 한 턴 시간
    return { // 요약 반환
        cases: runs.length, // 문맥 수
        jsonOk: parsed.length, // 형식 성공
        jsonRate: ratio(parsed.length, runs.length), // 형식 성공률
        actionOk, // 행동 통과
        actionRate: ratio(actionOk, parsed.length), // 행동 통과율
        guardedCases: guarded.length, // 규칙 위반 문맥
        guardedResisted: guarded.filter((run) => run.forbiddenHits.length === 0).length, // 차단 성공
        koreanOk, // 한국어 통과
        koreanRate: ratio(koreanOk, parsed.length), // 한국어 비율
        truncated: runs.filter((run) => run.finishReason === "length").length, // 길이 잘림
        errors: runs.filter((run) => run.error !== null).length, // 요청 오류
        ttftMedianMs: percentile(numbers((run) => run.ttftMs), 0.5), // 첫 글자 중앙값
        turnMedianMs: percentile(turns, 0.5), // 한 턴 중앙값
        turnP90Ms: percentile(turns, 0.9), // 한 턴 90%
        turnMaxMs: turns.length === 0 ? null : Math.max(...turns), // 한 턴 최대
        tokensPerSecondMedian: percentile(numbers((run) => run.predictedPerSecond), 0.5), // 생성 속도 중앙값
        promptTokensPerSecondMedian: percentile(numbers((run) => run.promptPerSecond), 0.5), // 문맥 처리 속도 중앙값
    }; // 요약 종료
} // 함수 종료

function formatRate(rate, count, total) // 비율 표시
{ // 함수 시작
    return total === 0 ? "-" : `${Math.round(rate * 100)}% (${count}/${total})`; // 백분율 반환
} // 함수 종료

function formatSeconds(milliseconds) // 초 표시
{ // 함수 시작
    return milliseconds === null || milliseconds === undefined ? "-" : `${(milliseconds / 1000).toFixed(1)}초`; // 초 반환
} // 함수 종료

function formatMiB(value) // 메모리 표시
{ // 함수 시작
    return value === null || value === undefined ? "-" : `${Math.round(value).toLocaleString("en-US")}MiB`; // 메모리 반환
} // 함수 종료

function formatAction(action) // 제안 행동 표시
{ // 함수 시작
    const signed = (amount) => (amount > 0 ? `+${amount}` : String(amount)); // 부호 표시
    if (action.type === "change-stat") // 능력치 확인
    { // 조건 시작
        return `${action.stat} ${signed(action.amount)}`; // 능력치 표시
    } // 조건 종료
    if (action.type === "add-item" || action.type === "remove-item") // 아이템 확인
    { // 조건 시작
        return `${action.type === "add-item" ? "+" : "-"}${action.itemId}×${action.quantity}`; // 아이템 표시
    } // 조건 종료
    if (action.type === "move-location") // 이동 확인
    { // 조건 시작
        return `이동 ${action.locationId}`; // 이동 표시
    } // 조건 종료
    if (action.type === "change-relation") // 관계도 확인
    { // 조건 시작
        return `${action.characterId} 관계 ${signed(action.amount)}`; // 관계도 표시
    } // 조건 종료
    if (action.type === "start-quest" || action.type === "complete-quest") // 퀘스트 확인
    { // 조건 시작
        return `퀘스트 ${action.type === "start-quest" ? "시작" : "완료"} ${action.questId}`; // 퀘스트 표시
    } // 조건 종료
    return `이벤트 ${action.eventId}`; // 이벤트 표시
} // 함수 종료

function renderSummaryRow(result) // 요약표 한 줄
{ // 함수 시작
    if (result.summary === null || result.summary === undefined) // 실패 결과 확인
    { // 조건 시작
        return `| ${result.label} | 실패: ${result.error ?? "알 수 없음"} |  |  |  |  |  |  |  |  |  |  |`; // 실패 줄 반환
    } // 조건 종료
    const summary = result.summary; // 요약
    const memory = result.memory ?? {}; // 메모리
    const tokens = summary.tokensPerSecondMedian === null ? "-" : `${Math.round(summary.tokensPerSecondMedian)} 토큰/초`; // 생성 속도
    const host = memory.peakWorkingSetMiB === null || memory.peakWorkingSetMiB === undefined ? formatMiB(memory.cpuMiB) : `${formatMiB(memory.cpuMiB)} (프로세스 최대 ${formatMiB(memory.peakWorkingSetMiB)})`; // 주 메모리
    return `| ${result.label} | ${formatRate(summary.jsonRate, summary.jsonOk, summary.cases)} | ${formatRate(summary.actionRate, summary.actionOk, summary.jsonOk)} | ${formatRate(summary.guardedCases === 0 ? 0 : summary.guardedResisted / summary.guardedCases, summary.guardedResisted, summary.guardedCases)} | ${formatRate(summary.koreanRate, summary.koreanOk, summary.jsonOk)} | ${formatSeconds(summary.ttftMedianMs)} | ${formatSeconds(summary.turnMedianMs)} | ${formatSeconds(summary.turnP90Ms)} | ${tokens} | ${formatMiB(memory.gpuMiB)} | ${host} | ${formatSeconds(result.startupMs)} |`; // 요약 줄 반환
} // 함수 종료

function renderRun(result, run) // 문맥별 응답 한 묶음
{ // 함수 시작
    const lines = [`**${result.label}** (형식 ${run.parse} · 행동 ${run.validation} · ${formatSeconds(run.totalMs)})`]; // 제목 줄
    if (run.error !== null) // 요청 오류 확인
    { // 조건 시작
        return [...lines, `- 오류: ${run.error}`].join("\n"); // 오류 반환
    } // 조건 종료
    if (run.narration === null || run.narration === undefined) // 해석 실패 확인
    { // 조건 시작
        return [...lines, `- 원문: ${JSON.stringify(run.raw ?? "")}`].join("\n"); // 원문 반환
    } // 조건 종료
    lines.push(`- 서술: ${run.narration}`); // 서술 줄
    lines.push(`- 대사: ${run.dialogue === null || run.dialogue === undefined ? "없음" : `${run.dialogue.speaker}: ${run.dialogue.content}`}`); // 대사 줄
    lines.push(`- 행동: ${(run.actions ?? []).length === 0 ? "없음" : run.actions.map(formatAction).join(", ")}`); // 행동 줄
    if ((run.forbiddenHits ?? []).length > 0) // 규칙 위반 확인
    { // 조건 시작
        lines.push(`- 규칙 위반에 넘어감: ${run.forbiddenHits.map(formatAction).join(", ")}`); // 위반 줄
    } // 조건 종료
    return lines.join("\n"); // 묶음 반환
} // 함수 종료

export function renderEvalReport(report) // 측정 보고서(마크다운)
{ // 함수 시작
    const { createdAt, machine, cases, results } = report; // 보고서 입력
    const lines = // 머리 부분
    [ // 줄 목록 시작
        "# 내장 로컬 AI 측정 결과", // 제목
        "", // 빈 줄
        `- 측정 시각: ${createdAt}`, // 시각
        `- 측정 PC: ${machine.cpu} · ${(machine.gpus ?? []).join(", ") || "그래픽 정보 없음"} · RAM ${machine.ramGB}GB`, // PC 사양
        `- 문맥: Text-Play 평가 문맥 ${cases.length}개`, // 문맥 수
        "", // 빈 줄
        "## 요약", // 요약 제목
        "", // 빈 줄
        "| 모델·실행 | JSON 형식 | 행동 통과 | 규칙 위반 차단 | 한국어 | 첫 글자(중앙) | 한 턴(중앙) | 한 턴(90%) | 생성 속도 | 그래픽 메모리 | 주 메모리 | 시작 시간 |", // 표 머리
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |", // 표 구분
        ...results.map(renderSummaryRow), // 표 내용
        "", // 빈 줄
        "## 문맥별 응답", // 비교 제목
    ]; // 줄 목록 종료
    for (const item of cases) // 문맥 순회
    { // 반복 시작
        lines.push("", `### ${item.id} · ${item.category} · ${item.stateLabel}`, "", `> ${item.input}`); // 문맥 머리
        for (const result of results) // 결과 순회
        { // 반복 시작
            const run = result.runs.find((candidate) => candidate.caseId === item.id); // 문맥 응답
            if (run !== undefined) // 응답 확인
            { // 조건 시작
                lines.push("", renderRun(result, run)); // 응답 추가
            } // 조건 종료
        } // 반복 종료
    } // 반복 종료
    return `${lines.join("\n")}\n`; // 보고서 반환
} // 함수 종료
