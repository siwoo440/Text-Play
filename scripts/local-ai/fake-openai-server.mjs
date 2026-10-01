// 가짜 내장 AI 서버: 실제 모델 없이 OpenAI 호환 스트리밍으로 Text-Play JSON을 돌려준다(개발·확인용, 127.0.0.1 전용)
// 실행: node scripts/local-ai/fake-openai-server.mjs --port 8765
// exe 연결: MATE_TEXT_PLAY_BUNDLED_AI_URL=http://127.0.0.1:8765 환경 변수로 exe를 실행
import { createServer } from "node:http"; // HTTP 서버
import { pathToFileURL } from "node:url"; // 실행 파일 비교
import { parseArgs } from "node:util"; // 명령 인자 해석기

function readBody(request) // 요청 본문 읽기
{ // 함수 시작
    return new Promise((resolveBody, rejectBody) => // 본문 대기
    { // 대기 시작
        let body = ""; // 본문 누적값
        request.setEncoding("utf8"); // 문자 인코딩
        request.on("data", (chunk) => { body += chunk; }); // 조각 누적
        request.on("end", () => resolveBody(body)); // 완료 전달
        request.on("error", rejectBody); // 오류 전달
    }); // 대기 종료
} // 함수 종료

function findUserAction(messages) // 마지막 사용자 행동 찾기
{ // 함수 시작
    const last = [...(messages ?? [])].reverse().find((message) => message.role === "user")?.content ?? ""; // 마지막 사용자 메시지
    const marker = "사용자 행동:\n"; // 앱 메시지 표시
    const action = last.includes(marker) ? last.slice(last.lastIndexOf(marker) + marker.length) : last; // 행동 부분
    return action.trim().slice(0, 60) || "아무 말도 하지 않음"; // 짧은 행동 반환
} // 함수 종료

function createContent(body) // 응답 내용 만들기
{ // 함수 시작
    const action = findUserAction(body.messages); // 사용자 행동
    if (body.response_format === undefined) // 형식 강제 없음 확인
    { // 조건 시작
        return `가짜 내장 AI가 "${action}"에 대답합니다.`; // 일반 문장 반환
    } // 조건 종료
    return JSON.stringify({ narration: `가짜 내장 AI가 "${action}" 행동을 받았습니다. 안개 너머에서 대답하듯 등불이 흔들립니다.`, dialogue: { speaker: "리라", content: "지금은 가짜 AI가 대신 대답하고 있어요." }, proposedActions: [] }); // Text-Play JSON 반환
} // 함수 종료

function sleep(milliseconds) // 잠시 대기
{ // 함수 시작
    return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)); // 대기 반환
} // 함수 종료

async function streamContent(response, content, delayMs) // SSE 조각 전송
{ // 함수 시작
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }); // 스트림 머리
    const characters = [...content]; // 글자 목록
    for (let index = 0; index < characters.length; index += 8) // 8글자씩 순회
    { // 반복 시작
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: characters.slice(index, index + 8).join("") }, finish_reason: null }] })}\n\n`); // 조각 전송
        await sleep(delayMs); // 생성 흉내
    } // 반복 종료
    response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }], timings: { prompt_n: 0, prompt_ms: 0, predicted_n: characters.length, predicted_ms: 0 } })}\n\n`); // 마지막 조각
    response.end("data: [DONE]\n\n"); // 스트림 종료
} // 함수 종료

export async function startFakeOpenAIServer(options = {}) // 가짜 서버 시작
{ // 함수 시작
    const { port = 8765, delayMs = 30 } = options; // 서버 설정
    const server = createServer(async (request, response) => // 요청 처리기
    { // 처리 시작
        if (request.method === "GET" && request.url === "/health") // 준비 확인
        { // 조건 시작
            response.writeHead(200, { "Content-Type": "application/json" }); // 응답 머리
            response.end("{\"status\":\"ok\"}"); // 준비 응답
            return; // 처리 종료
        } // 조건 종료
        if (request.method !== "POST" || request.url !== "/v1/chat/completions") // 대화 경로 확인
        { // 조건 시작
            response.writeHead(404); // 없는 경로
            response.end(); // 응답 종료
            return; // 처리 종료
        } // 조건 종료
        try // 요청 처리 시도
        { // 시도 시작
            const body = JSON.parse(await readBody(request)); // 요청 본문
            await streamContent(response, createContent(body), delayMs); // 응답 전송
        } // 시도 종료
        catch // 잘못된 요청 처리
        { // 실패 시작
            response.writeHead(400, { "Content-Type": "application/json" }); // 오류 머리
            response.end("{\"error\":{\"message\":\"잘못된 요청\"}}"); // 오류 응답
        } // 실패 종료
    }); // 처리기 종료
    await new Promise((resolveListen) => server.listen(port, "127.0.0.1", resolveListen)); // 로컬 전용 열기
    const url = `http://127.0.0.1:${server.address().port}`; // 서버 주소
    return { url, close: () => new Promise((resolveClose) => server.close(() => resolveClose())) }; // 주소와 종료 함수 반환
} // 함수 종료

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) // 직접 실행 확인
{ // 조건 시작
    const { values } = parseArgs({ options: { port: { type: "string", default: "8765" } } }); // 명령 인자
    const { url } = await startFakeOpenAIServer({ port: Number(values.port) }); // 서버 시작
    console.log(`[fake-ai] 가짜 내장 AI 서버: ${url}`); // 주소 안내
    console.log(`[fake-ai] exe 연결: MATE_TEXT_PLAY_BUNDLED_AI_URL=${url} 환경 변수로 exe 실행`); // 연결 안내
} // 조건 종료
