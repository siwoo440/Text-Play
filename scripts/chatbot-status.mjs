import { execFileSync } from "node:child_process"; // git 실행 도구
import { existsSync, readFileSync } from "node:fs"; // 파일 시스템 도구
import { resolve } from "node:path"; // 경로 도구

const positional = []; // 위치 인자 목록
let ref = "origin/main"; // 비교할 ChatBot 커밋(기본: 원격 main)
let fetchRemote = true; // 원격 최신 기록 가져오기 여부
let check = false; // 가져올 커밋이 있으면 실패 코드로 끝낼지 여부
const args = process.argv.slice(2); // 명령 인자
for (let index = 0; index < args.length; index += 1) // 인자 순회
{ // 순회 시작
    const arg = args[index]; // 현재 인자
    if (arg === "--ref") // 비교 커밋 지정 확인
    { // 조건 시작
        ref = args[index + 1] ?? ref; // 비교 커밋 반영
        index += 1; // 값 건너뛰기
    } // 조건 종료
    else if (arg === "--no-fetch") // 원격 생략 확인
    { // 조건 시작
        fetchRemote = false; // 원격 가져오기 생략
    } // 조건 종료
    else if (arg === "--check") // 검사 모드 확인
    { // 조건 시작
        check = true; // 검사 모드 설정
    } // 조건 종료
    else // 위치 인자 처리
    { // 조건 시작
        positional.push(arg); // 위치 인자 저장
    } // 조건 종료
} // 순회 종료

const chatbotRoot = resolve(positional[0] ?? "../ChatBot"); // ChatBot 저장소 경로
const sourcePath = resolve("src/chatbot/SOURCE.md"); // Text-Play 사본 원본 기록

function report(message) // 안내 출력
{ // 함수 시작
    console.log(`[chatbot-status] ${message}`); // 안내 문구 출력
} // 함수 종료

function fail(message) // 실패 종료
{ // 함수 시작
    report(message); // 실패 안내
    process.exit(2); // 확인 불가 종료 코드
} // 함수 종료

function git(gitArgs) // ChatBot git 실행
{ // 함수 시작
    return execFileSync("git", ["-C", chatbotRoot, ...gitArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); // 실행 결과 반환
} // 함수 종료

if (!existsSync(sourcePath)) // 원본 기록 확인
{ // 조건 시작
    fail("src/chatbot/SOURCE.md가 없습니다. 먼저 pnpm chatbot:sync로 ChatBot 소스를 가져오세요."); // 기록 없음
} // 조건 종료
const synced = readFileSync(sourcePath, "utf8").match(/원본 커밋: `([0-9a-f]{7,40})`/u)?.[1]; // 가져온 커밋
if (synced === undefined) // 커밋 기록 확인
{ // 조건 시작
    fail("src/chatbot/SOURCE.md에서 원본 커밋을 찾지 못했습니다."); // 기록 형식 오류
} // 조건 종료
if (!existsSync(resolve(chatbotRoot, ".git"))) // ChatBot 저장소 확인
{ // 조건 시작
    fail(`ChatBot 저장소를 찾지 못했습니다: ${chatbotRoot}`); // 저장소 없음
} // 조건 종료
if (fetchRemote) // 원격 가져오기 확인
{ // 조건 시작
    try // 원격 가져오기 시도
    { // 시도 시작
        git(["fetch", "-q", "origin"]); // 원격 기록만 갱신(작업 폴더는 건드리지 않음)
    } // 시도 종료
    catch // 원격 실패 처리
    { // 실패 시작
        report("원격 기록을 가져오지 못해 마지막으로 받은 기록과 비교합니다."); // 오프라인 안내
    } // 실패 종료
} // 조건 종료

const latest = git(["rev-parse", "--verify", `${ref}^{commit}`]); // 비교 커밋
let newCommits = []; // 가져올 커밋 목록
let diverged = false; // 기록 불일치 여부
try // 커밋 차이 계산
{ // 시도 시작
    git(["merge-base", "--is-ancestor", synced, latest]); // 가져온 커밋이 조상인지 확인
    newCommits = git(["log", "--format=%h %s", `${synced}..${latest}`]).split("\n").filter((line) => line.length > 0); // 새 커밋 목록
} // 시도 종료
catch // 조상 아님 처리
{ // 실패 시작
    diverged = true; // 기록이 갈라짐(강제 푸시 등)
} // 실패 종료
const dirty = git(["status", "--porcelain"]).split("\n").filter((line) => line.length > 0); // 커밋하지 않은 수정

report(`Text-Play 사본: ${synced.slice(0, 7)} / ChatBot ${ref}: ${latest.slice(0, 7)}`); // 비교 대상 안내
if (diverged) // 기록 불일치 확인
{ // 조건 시작
    report("동기화 필요: ChatBot 기록이 Text-Play 사본과 갈라졌습니다. pnpm chatbot:sync로 다시 가져오세요."); // 다시 가져오기 안내
} // 조건 종료
else if (newCommits.length > 0) // 새 커밋 확인
{ // 조건 시작
    report(`동기화 필요: 새 커밋 ${newCommits.length}개`); // 새 커밋 수 안내
    newCommits.forEach((line) => report(`  - ${line}`)); // 새 커밋 제목 안내
    report("pnpm chatbot:sync로 가져온 뒤 pnpm test:run, 데스크톱 통합 테스트, pnpm exe:rebuild로 확인하세요."); // 다음 순서 안내
} // 조건 종료
else // 최신 처리
{ // 조건 시작
    report("최신입니다. 가져올 ChatBot 기능이 없습니다."); // 최신 안내
} // 조건 종료
if (dirty.length > 0) // 작업 중 수정 확인
{ // 조건 시작
    report(`ChatBot 작업 폴더에 커밋하지 않은 수정 ${dirty.length}개가 있습니다. 동기화는 커밋된 내용만 가져옵니다.`); // 작업 중 안내
} // 조건 종료
if (check && (diverged || newCommits.length > 0)) // 검사 모드 실패 확인
{ // 조건 시작
    process.exit(1); // 가져올 커밋 있음
} // 조건 종료
