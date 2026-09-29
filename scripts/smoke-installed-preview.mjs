import { chromium, expect } from "@playwright/test"; // 브라우저 자동화 도구

const verificationMode = process.argv[2]; // 검증 단계
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222"); // 설치 앱 연결
const context = browser.contexts()[0]; // 설치 앱 컨텍스트
const page = context.pages()[0]; // 설치 앱 화면
const externalRequests = []; // 외부 요청 목록

page.on("request", (request) => // 요청 감시기
{ // 함수 시작
    const requestUrl = request.url(); // 요청 주소
    if ((requestUrl.startsWith("http://") || requestUrl.startsWith("https://")) && !requestUrl.startsWith("http://tauri.localhost/")) // 외부 웹 요청 확인
    { // 조건 시작
        externalRequests.push(requestUrl); // 외부 요청 기록
    } // 조건 종료
}); // 감시 종료

await page.waitForLoadState("domcontentloaded"); // 화면 준비 대기

if (verificationMode === "prepare") // 저장 생성 단계
{ // 조건 시작
    await expect(page.getByRole("heading", { name: "Text-Play" })).toBeVisible(); // 홈 화면 확인
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("button", { name: "달빛 등불을 든다" }).click(); // 선택지 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 자동 저장 장면 확인
    const firstSlot = page.getByRole("group", { name: "수동 저장 슬롯 1" }); // 첫 저장 슬롯 조회
    await firstSlot.getByRole("button", { name: "저장" }).click(); // 수동 저장 실행
    await expect(firstSlot.getByText("moonlit-hall")).toBeVisible(); // 수동 저장 확인
} // 조건 종료
else if (verificationMode === "resume") // 저장 복원 단계
{ // 조건 시작
    await expect(page.getByRole("heading", { name: "Text-Play" })).toBeVisible(); // 재실행 홈 확인
    await page.getByRole("button", { name: "이어하기" }).click(); // 자동 저장 복원
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 복원 장면 확인
    await expect(page.getByRole("group", { name: "수동 저장 슬롯 1" }).getByText("moonlit-hall")).toBeVisible(); // 수동 저장 유지 확인
    await expect(page.getByLabel("AI 연결")).toHaveText("Mock AI"); // Mock 연결 확인
} // 조건 종료
else // 알 수 없는 단계
{ // 조건 시작
    throw new Error(`알 수 없는 설치 앱 검증 단계: ${verificationMode}`); // 단계 오류
} // 조건 종료

expect(externalRequests).toEqual([]); // 외부 요청 부재 확인
console.log(`[installed-smoke] ${verificationMode} 단계 통과`); // 단계 결과 출력
console.log(`[installed-smoke] page=${page.url()}`); // 앱 주소 출력
console.log("[installed-smoke] external_requests_after_cdp_attach=0"); // 외부 요청 결과 출력
process.exit(0); // 자동화 연결 종료
