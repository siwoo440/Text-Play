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

async function chooseRecommendation(page: Page, label: string): Promise<void> // 추천 답안 선택 도우미
{ // 함수 시작
    const toggle = page.getByRole("button", { name: "AI 추천 답안" }); // 펼침 버튼 조회
    if (await toggle.getAttribute("aria-expanded") !== "true") // 접힘 상태 확인
    { // 조건 시작
        await toggle.click(); // 추천 펼치기
    } // 조건 종료
    await page.getByRole("button", { name: label }).click(); // 답안 선택
} // 함수 종료

test("Mock 플레이를 저장하고 새 세션에서 이어간다", async ({ page, context }) => // 자동 저장 흐름 검증
{ // 테스트 시작
    await page.goto("/"); // 데스크톱 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await chooseRecommendation(page, "달빛 등불을 든다"); // 선택지 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 자동 저장 장면 확인
    const resumedPage = await context.newPage(); // 새 앱 화면 생성
    await page.close(); // 기존 앱 화면 종료
    await resumedPage.goto("/"); // 새 앱 홈 진입
    await resumedPage.getByRole("button", { name: "이어하기" }).click(); // 자동 저장 복원
    await expect(resumedPage.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 복원 장면 확인
    await expect(resumedPage.getByLabel("AI 연결")).toHaveText("임시 인공지능"); // 임시 인공지능 표시 확인
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
    await chooseRecommendation(page, "달빛 등불을 든다"); // 회랑 이동
    await page.getByRole("button", { name: "저장 슬롯 열기" }).click(); // 저장 모달 열기
    const firstSlot = page.getByRole("group", { name: "수동 저장 슬롯 1" }); // 첫 저장 슬롯 조회
    await firstSlot.getByRole("button", { name: "저장" }).click(); // 수동 저장 실행
    await expect(firstSlot.getByText("moonlit-hall")).toBeVisible(); // 저장 장면 확인
    await page.getByRole("button", { name: "닫기" }).click(); // 저장 모달 닫기
    await chooseRecommendation(page, "봉인된 서재로 간다"); // 서재 이동
    await expect(page.getByRole("heading", { name: "봉인된 서재" })).toBeVisible(); // 이동 장면 확인
    await page.getByRole("button", { name: "불러오기 슬롯 열기" }).click(); // 불러오기 모달 열기
    page.once("dialog", async (dialog) => // 불러오기 확인 처리
    { // 함수 시작
        await dialog.accept(); // 불러오기 승인
    }); // 처리 종료
    await firstSlot.getByRole("button", { name: "불러오기" }).click(); // 수동 저장 복원
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 복원 장면 확인
    await page.getByRole("button", { name: "저장 슬롯 열기" }).click(); // 저장 모달 다시 열기
    page.once("dialog", async (dialog) => // 삭제 확인 처리
    { // 함수 시작
        await dialog.accept(); // 삭제 승인
    }); // 처리 종료
    await firstSlot.getByRole("button", { name: "삭제" }).click(); // 수동 저장 삭제
    await expect(firstSlot.getByText("저장된 대화가 없습니다.")).toBeVisible(); // 빈 슬롯 확인
}); // 테스트 종료

test("1280×720에서 설정과 여섯 번째 슬롯 전체 흐름을 제공한다", async ({ page }) => // 고정 화면 회귀 검증
{ // 테스트 시작
    await page.setViewportSize({ width: 1280, height: 720 }); // 검증 화면 크기
    await page.goto("/"); // 데스크톱 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await expect(page.getByRole("region", { name: "장면 무대" })).toBeVisible(); // 장면 무대 확인
    await page.getByRole("button", { name: "게임 설정 열기" }).click(); // 설정 모달 열기
    await page.getByRole("radio", { name: "미니멀 SF HUD 테마" }).check(); // SF 테마 선택
    await page.getByLabel("창 해상도").selectOption("1280x720"); // 창 해상도 선택
    await expect(page.locator("[data-text-play-root]")).toHaveAttribute("data-theme", "sci-fi"); // 테마 적용 확인
    await expect(page.locator("[data-text-play-root]")).toHaveAttribute("data-resolution", "1280x720"); // 해상도 적용 확인
    await page.getByRole("button", { name: "닫기" }).click(); // 설정 모달 닫기
    await page.getByRole("button", { name: "저장 슬롯 열기" }).click(); // 저장 모달 열기
    const sixthSlot = page.getByRole("group", { name: "수동 저장 슬롯 6" }); // 여섯 번째 슬롯 조회
    await sixthSlot.getByRole("button", { name: "저장" }).click(); // 여섯 번째 슬롯 저장
    await expect(sixthSlot.getByText("forest-gate")).toBeVisible(); // 저장 장면 확인
    await page.getByRole("button", { name: "닫기" }).click(); // 저장 모달 닫기
    await chooseRecommendation(page, "달빛 등불을 든다"); // 장면 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 진행 장면 확인
    await page.getByRole("button", { name: "불러오기 슬롯 열기" }).click(); // 불러오기 모달 열기
    page.once("dialog", async (dialog) => // 불러오기 확인 처리
    { // 함수 시작
        await dialog.accept(); // 불러오기 승인
    }); // 처리 종료
    await sixthSlot.getByRole("button", { name: "불러오기" }).click(); // 여섯 번째 슬롯 복원
    await expect(page.getByRole("heading", { name: "달빛 숲 입구" })).toBeVisible(); // 초기 장면 복원 확인
    const hasDocumentScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight); // 문서 스크롤 확인
    expect(hasDocumentScroll).toBe(false); // 전체 세로 스크롤 부재 확인
    await page.getByRole("button", { name: "메인으로 돌아가기: 달빛 숲의 기록" }).click(); // 홈 복귀
    await expect(page.getByRole("button", { name: "새 게임" })).toBeVisible(); // 홈 화면 확인
}); // 테스트 종료

async function measureFit(page: Page): Promise<{ documentScrolls: boolean; contentOverflows: boolean }> // 창 맞춤 측정기
{ // 함수 시작
    return page.evaluate(() => // 화면 측정
    { // 함수 시작
        const main = document.querySelector("main"); // 화면 루트 조회
        let bottom = 0; // 가장 아래 위치
        main?.querySelectorAll("*").forEach((element) => // 하위 요소 순회
        { // 순회 시작
            const rectangle = element.getBoundingClientRect(); // 요소 위치
            if (rectangle.height > 0) // 보이는 요소 확인
            { // 조건 시작
                bottom = Math.max(bottom, rectangle.bottom); // 아래 위치 갱신
            } // 조건 종료
        }); // 순회 종료
        return { documentScrolls: document.documentElement.scrollHeight > window.innerHeight, contentOverflows: bottom > window.innerHeight + 1 }; // 측정 결과 반환
    }); // 측정 종료
} // 함수 종료

test("최소 창 960×640에서 홈과 플레이 화면이 스크롤 없이 창 크기에 맞는다", async ({ page }) => // 창 맞춤 검증
{ // 테스트 시작
    await page.setViewportSize({ width: 960, height: 640 }); // 최소 창 크기
    await page.goto("/"); // 데스크톱 홈 진입
    await expect(page.getByRole("button", { name: "새 게임" })).toBeVisible(); // 홈 표시 확인
    expect(await measureFit(page)).toEqual({ documentScrolls: false, contentOverflows: false }); // 홈 맞춤 확인
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("button", { name: "AI 추천 답안" }).click(); // 추천 펼치기
    expect(await measureFit(page)).toEqual({ documentScrolls: false, contentOverflows: false }); // 플레이 맞춤 확인
    const overflow = await page.locator("[data-recommendation-toggle]").evaluate((toggle) => // 추천 영역 넘침 측정
    { // 함수 시작
        const area = toggle.parentElement?.parentElement; // 추천 영역 조회
        return area === null || area === undefined ? -1 : area.scrollHeight - area.clientHeight; // 넘침 높이 반환
    }); // 측정 종료
    expect(overflow).toBe(0); // 추천 영역 스크롤 부재 확인
    await expect(page.getByRole("button", { name: "주변을 자세히 살핀다" })).toBeVisible(); // 세 번째 답안 표시 확인
}); // 테스트 종료
