import { expect, test, type Page } from "@playwright/test"; // 종단 테스트 도구

function collectConsoleErrors(page: Page): string[] // 콘솔 오류 수집기
{ // 함수 시작
    const errors: string[] = []; // 오류 목록
    page.on("console", (message) => // 콘솔 감시
    { // 함수 시작
        if (message.type() === "error") // 오류 여부 확인
        { // 조건 시작
            errors.push(message.text()); // 오류 기록
        } // 조건 종료
    }); // 감시 종료
    page.on("pageerror", (error) => // 처리되지 않은 오류 감시
    { // 함수 시작
        errors.push(error.message); // 오류 기록
    }); // 감시 종료
    return errors; // 오류 목록 반환
} // 함수 종료

test("웹 Text-Play 홈과 플레이 화면을 화면 불일치 오류 없이 연다", async ({ page }) => // 웹 기본 흐름 검증
{ // 테스트 시작
    const errors = collectConsoleErrors(page); // 콘솔 오류 수집
    await page.goto("/text-play"); // 웹 홈 진입
    await expect(page.getByRole("heading", { name: "오늘, 어떤 이야기를 플레이할까요?", level: 1 })).toBeVisible(); // 메인 제목 확인
    await expect(page).toHaveTitle("Text-Play · Mate Verse"); // 홈 탭 제목 확인
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await expect(page.getByRole("heading", { name: "달빛 숲 입구" })).toBeVisible(); // 첫 장면 확인
    await expect(page).toHaveTitle("달빛 숲의 기록 · Text-Play · Mate Verse"); // 플레이 탭 제목 확인
    await page.getByRole("button", { name: "AI 추천 답안" }).click(); // 추천 펼치기
    await page.getByRole("button", { name: "달빛 등불을 든다" }).click(); // 선택지 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 다음 장면 확인
    expect(errors).toEqual([]); // 화면 불일치 등 콘솔 오류 부재 확인
}); // 테스트 종료
