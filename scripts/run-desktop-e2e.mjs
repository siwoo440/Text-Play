import { spawn, spawnSync } from "node:child_process"; // 자식 프로세스 도구
import { resolve } from "node:path"; // 절대 경로 도구

const root = process.cwd(); // 프로젝트 루트
const viteCli = resolve(root, "node_modules/vite/bin/vite.js"); // Vite 실행 파일
const playwrightCli = resolve(root, "node_modules/@playwright/test/cli.js"); // Playwright 실행 파일
const serverUrl = "http://127.0.0.1:1420"; // 미리보기 주소

function waitForExit(child) // 프로세스 종료 대기기
{ // 함수 시작
    return new Promise((resolveExit, rejectExit) => // 종료 약속 생성
    { // 약속 시작
        child.once("error", rejectExit); // 실행 오류 처리
        child.once("exit", (code) => resolveExit(code ?? 1)); // 종료 코드 처리
    }); // 약속 종료
} // 함수 종료

async function waitForServer() // 서버 준비 대기기
{ // 함수 시작
    const deadline = Date.now() + 30_000; // 준비 제한 시각
    while (Date.now() < deadline) // 제한 시간 순회
    { // 순회 시작
        try // 서버 요청 시도
        { // 시도 시작
            const response = await fetch(serverUrl); // 서버 상태 요청
            if (response.ok) // 준비 상태 확인
            { // 조건 시작
                await response.body?.cancel(); // 상태 응답 연결 정리
                return; // 준비 완료
            } // 조건 종료
        } // 시도 종료
        catch // 미준비 처리
        { // 오류 시작
            await new Promise((resolveWait) => setTimeout(resolveWait, 250)); // 짧은 재시도 대기
        } // 오류 종료
    } // 순회 종료
    throw new Error("데스크톱 Vite 서버가 준비되지 않았습니다."); // 준비 실패
} // 함수 종료

function stopServer(server) // 서버 종료기
{ // 함수 시작
    if (server.pid === undefined) // 프로세스 식별자 확인
    { // 조건 시작
        return; // 종료 생략
    } // 조건 종료
    if (process.platform === "win32") // Windows 확인
    { // 조건 시작
        spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); // 서버 트리 종료
        return; // 처리 종료
    } // 조건 종료
    server.kill("SIGTERM"); // 비 Windows 서버 종료
} // 함수 종료

const server = spawn(process.execPath, [viteCli, "--config", "vite.desktop.config.ts", "--host", "127.0.0.1", "--port", "1420"], { cwd: root, stdio: "inherit", windowsHide: true }); // Vite 서버 시작
let testExitCode = 1; // 기본 실패 코드
try // 테스트 실행 시도
{ // 시도 시작
    await waitForServer(); // 서버 준비 대기
    const testRunner = spawn(process.execPath, [playwrightCli, "test", "--config", "playwright.desktop.config.ts"], { cwd: root, stdio: "inherit", windowsHide: true }); // Playwright 시작
    testExitCode = await waitForExit(testRunner); // 테스트 종료 코드 저장
} // 시도 종료
finally // 서버 정리
{ // 정리 시작
    stopServer(server); // Vite 서버 종료
} // 정리 종료
process.exit(testExitCode); // 최종 종료 코드 반환
