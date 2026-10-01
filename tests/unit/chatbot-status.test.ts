import { execFileSync } from "node:child_process"; // 자식 프로세스 도구
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"; // 파일 시스템 도구
import { tmpdir } from "node:os"; // 임시 폴더 도구
import { join, resolve } from "node:path"; // 경로 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

function git(cwd: string, ...args: string[]): string // git 실행 도우미
{ // 함수 시작
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); // 실행 결과 반환
} // 함수 종료

function createChatbotRepository(): { path: string; first: string; second: string } // 임시 ChatBot 저장소 생성
{ // 함수 시작
    const path = mkdtempSync(join(tmpdir(), "chatbot-")); // 임시 폴더
    git(path, "init", "-q", "-b", "main"); // 저장소 생성
    git(path, "config", "user.email", "test@example.com"); // 테스트 작성자 메일
    git(path, "config", "user.name", "test"); // 테스트 작성자 이름
    writeFileSync(join(path, "feature.txt"), "1"); // 첫 기능 파일
    git(path, "add", "."); // 변경 추가
    git(path, "commit", "-q", "-m", "첫 기능"); // 첫 커밋
    const first = git(path, "rev-parse", "HEAD"); // 첫 커밋 식별자
    writeFileSync(join(path, "feature.txt"), "2"); // 새 기능 변경
    git(path, "commit", "-q", "-am", "대화방 고정 추가"); // 새 커밋
    return { path, first, second: git(path, "rev-parse", "HEAD") }; // 저장소 정보 반환
} // 함수 종료

function createTextPlayRoot(syncedCommit: string): string // 임시 Text-Play 폴더 생성
{ // 함수 시작
    const root = mkdtempSync(join(tmpdir(), "textplay-")); // 임시 폴더
    mkdirSync(join(root, "src/chatbot"), { recursive: true }); // 사본 폴더 생성
    writeFileSync(join(root, "src/chatbot/SOURCE.md"), `- 원본 커밋: \`${syncedCommit}\` (\`첫 기능\`)\n`); // 원본 기록 작성
    return root; // 폴더 반환
} // 함수 종료

function runStatus(root: string, chatbot: string, ...extra: string[]): { code: number; output: string } // 확인 명령 실행
{ // 함수 시작
    try // 실행 시도
    { // 시도 시작
        const output = execFileSync(process.execPath, [resolve("scripts/chatbot-status.mjs"), chatbot, "--ref", "main", "--no-fetch", ...extra], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); // 명령 실행
        return { code: 0, output }; // 성공 결과 반환
    } // 시도 종료
    catch (caught) // 실패 종료 처리
    { // 실패 시작
        const failure = caught as { status: number; stdout: string }; // 실패 정보
        return { code: failure.status, output: failure.stdout }; // 실패 결과 반환
    } // 실패 종료
} // 함수 종료

describe("ChatBot 동기화 확인 명령", () => // 확인 명령 묶음
{ // 묶음 시작
    it("ChatBot에 새 커밋이 있으면 동기화가 필요하다고 알리고 새 커밋 제목을 보여 준다", () => // 새 커밋 검증
    { // 테스트 시작
        const chatbot = createChatbotRepository(); // 임시 ChatBot
        const result = runStatus(createTextPlayRoot(chatbot.first), chatbot.path); // 확인 실행
        expect(result.code).toBe(0); // 안내 모드 성공 확인
        expect(result.output).toContain("동기화 필요: 새 커밋 1개"); // 동기화 필요 확인
        expect(result.output).toContain("대화방 고정 추가"); // 새 커밋 제목 확인
        expect(result.output).toContain("pnpm chatbot:sync"); // 동기화 명령 안내 확인
    }); // 테스트 종료

    it("--check는 가져올 커밋이 있으면 실패 코드로 끝난다", () => // 검사 모드 검증
    { // 테스트 시작
        const chatbot = createChatbotRepository(); // 임시 ChatBot
        expect(runStatus(createTextPlayRoot(chatbot.first), chatbot.path, "--check").code).toBe(1); // 실패 코드 확인
        expect(runStatus(createTextPlayRoot(chatbot.second), chatbot.path, "--check").code).toBe(0); // 최신 성공 확인
    }); // 테스트 종료

    it("최신이면 가져올 ChatBot 기능이 없다고 알린다", () => // 최신 검증
    { // 테스트 시작
        const chatbot = createChatbotRepository(); // 임시 ChatBot
        expect(runStatus(createTextPlayRoot(chatbot.second), chatbot.path).output).toContain("최신입니다"); // 최신 안내 확인
    }); // 테스트 종료

    it("ChatBot 작업 폴더의 커밋하지 않은 수정은 가져오지 않는다고 알린다", () => // 작업 중 수정 검증
    { // 테스트 시작
        const chatbot = createChatbotRepository(); // 임시 ChatBot
        writeFileSync(join(chatbot.path, "feature.txt"), "작업 중"); // 커밋하지 않은 수정
        expect(runStatus(createTextPlayRoot(chatbot.second), chatbot.path).output).toContain("커밋하지 않은 수정 1개"); // 작업 중 안내 확인
    }); // 테스트 종료
}); // 묶음 종료
