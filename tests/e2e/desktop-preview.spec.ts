import { expect, test, type Page } from "@playwright/test"; // 종단 테스트 도구

async function blockExternalRequests(page: Page): Promise<string[]> // 외부 요청 차단기
{ // 함수 시작
    const externalRequests: string[] = []; // 외부 요청 목록
    await page.route("**/*", async (route) => // 전체 요청 감시
    { // 함수 시작
        const url = new URL(route.request().url()); // 요청 주소 해석
        if (url.hostname === "127.0.0.1" && url.port === "1420") // 로컬 자산 확인
        { // 조건 시작
            await route.continue(); // 로컬 요청 허용
            return; // 처리 종료
        } // 조건 종료
        externalRequests.push(url.href); // 외부 요청 기록
        await route.abort(); // 외부 요청 차단
    }); // 감시 종료
    return externalRequests; // 요청 목록 반환
} // 함수 종료

test("Mock 플레이를 저장하고 새 세션에서 이어간다", async ({ page, context }) => // 자동 저장 흐름 검증
{ // 테스트 시작
    await page.goto("/"); // 데스크톱 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("button", { name: "달빛 등불을 든다" }).click(); // 선택지 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 자동 저장 장면 확인
    const resumedPage = await context.newPage(); // 새 앱 화면 생성
    await page.close(); // 기존 앱 화면 종료
    await resumedPage.goto("/"); // 새 앱 홈 진입
    await resumedPage.getByRole("button", { name: "이어하기" }).click(); // 자동 저장 복원
    await expect(resumedPage.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 복원 장면 확인
    await expect(resumedPage.getByLabel("AI 연결")).toHaveText("Mock AI"); // Mock 표시 확인
}); // 테스트 종료

test("자유 입력을 외부 네트워크 없이 처리한다", async ({ page }) => // 오프라인 AI 검증
{ // 테스트 시작
    const externalRequests = await blockExternalRequests(page); // 외부 요청 차단
    await page.goto("/"); // 데스크톱 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("textbox", { name: "행동 직접 입력" }).fill("문양을 자세히 살핀다"); // 자유 행동 입력
    await page.getByRole("button", { name: "전송" }).click(); // 자유 행동 전송
    await expect(page.getByText("그 선택을 기억할게.")).toBeVisible(); // Mock 응답 확인
    expect(externalRequests).toEqual([]); // 외부 요청 부재 확인
}); // 테스트 종료

test("수동 저장을 불러오고 삭제한다", async ({ page }) => // 수동 저장 흐름 검증
{ // 테스트 시작
    await page.goto("/"); // 데스크톱 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("button", { name: "달빛 등불을 든다" }).click(); // 회랑 이동
    const firstSlot = page.getByRole("group", { name: "수동 저장 슬롯 1" }); // 첫 저장 슬롯 조회
    await firstSlot.getByRole("button", { name: "저장" }).click(); // 수동 저장 실행
    await expect(firstSlot.getByText("moonlit-hall")).toBeVisible(); // 저장 장면 확인
    await page.getByRole("button", { name: "봉인된 서재로 간다" }).click(); // 서재 이동
    await expect(page.getByRole("heading", { name: "봉인된 서재" })).toBeVisible(); // 이동 장면 확인
    page.once("dialog", async (dialog) => // 불러오기 확인 처리
    { // 함수 시작
        await dialog.accept(); // 불러오기 승인
    }); // 처리 종료
    await firstSlot.getByRole("button", { name: "불러오기" }).click(); // 수동 저장 복원
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 복원 장면 확인
    page.once("dialog", async (dialog) => // 삭제 확인 처리
    { // 함수 시작
        await dialog.accept(); // 삭제 승인
    }); // 처리 종료
    await firstSlot.getByRole("button", { name: "삭제" }).click(); // 수동 저장 삭제
    await expect(firstSlot.getByText("빈 슬롯")).toBeVisible(); // 빈 슬롯 확인
}); // 테스트 종료
