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
    await page.goto("/#/text-play"); // Text-Play 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await chooseRecommendation(page, "달빛 등불을 든다"); // 선택지 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 자동 저장 장면 확인
    const resumedPage = await context.newPage(); // 새 앱 화면 생성
    await page.close(); // 기존 앱 화면 종료
    await resumedPage.goto("/#/text-play"); // 새 앱 Text-Play 홈 진입
    await resumedPage.getByRole("button", { name: "이어하기", exact: true }).click(); // 자동 저장 복원
    await expect(resumedPage.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 복원 장면 확인
    await expect(resumedPage.getByLabel("AI 연결")).toHaveText("임시 인공지능"); // 임시 인공지능 표시 확인
}); // 테스트 종료

test("자유 입력을 외부 네트워크 없이 처리한다", async ({ page }) => // 오프라인 AI 검증
{ // 테스트 시작
    const externalRequests = await blockExternalRequests(page); // 외부 요청 차단
    await page.goto("/#/text-play"); // Text-Play 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("textbox", { name: "행동 직접 입력" }).fill("문양을 자세히 살핀다"); // 자유 행동 입력
    await page.getByRole("button", { name: "전송" }).click(); // 자유 행동 전송
    await expect(page.getByText("그 선택을 기억할게.")).toBeVisible(); // Mock 응답 확인
    expect(externalRequests).toEqual([]); // 외부 요청 부재 확인
}); // 테스트 종료

test("수동 저장을 불러오고 삭제한다", async ({ page }) => // 수동 저장 흐름 검증
{ // 테스트 시작
    await page.goto("/#/text-play"); // Text-Play 홈 진입
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
    await page.goto("/#/text-play"); // Text-Play 홈 진입
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

test("최소 창 960×640에서 메인은 스크롤바 없이 스크롤하고 플레이 화면은 창 크기에 맞는다", async ({ page }) => // 창 맞춤 검증
{ // 테스트 시작
    await page.setViewportSize({ width: 960, height: 640 }); // 최소 창 크기
    await page.goto("/#/text-play"); // Text-Play 홈 진입
    await expect(page.getByRole("button", { name: "새 게임" })).toBeVisible(); // 홈 표시 확인
    expect(await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBe(0); // 창 스크롤바 숨김 확인
    expect(await page.locator("[data-text-play-home]").evaluate((main) => (main as HTMLElement).offsetWidth - main.clientWidth)).toBe(0); // 메인 스크롤바 숨김 확인
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

for (const size of [{ width: 960, height: 640 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) // 검증 창 크기 순회
{ // 순회 시작
    test(`${size.width}×${size.height}에서 진행 명령 도크를 장면 무대 아래에 배치한다`, async ({ page }) => // 하단 도크 검증
    { // 테스트 시작
        await page.setViewportSize(size); // 검증 창 크기
        await page.goto("/#/text-play"); // Text-Play 홈 진입
        await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
        await page.getByRole("button", { name: "AI 추천 답안" }).click(); // 추천 펼치기
        await page.mouse.move(0, 0); // 답안 올림 효과 제거
        await page.waitForFunction(() => document.getAnimations().length === 0); // 펼침 효과 종료 대기
        const stage = await page.getByRole("region", { name: "장면 무대" }).boundingBox(); // 무대 위치
        const dock = await page.getByRole("complementary", { name: "진행 명령" }).boundingBox(); // 도크 위치
        const story = await page.getByRole("region", { name: "스토리 대화" }).boundingBox(); // 스토리 상자 위치
        const answers = await page.locator("[data-recommendation-toggle] ~ ul button").evaluateAll((buttons) => buttons.map((button) => Math.round(button.getBoundingClientRect().top))); // 답안 위쪽 위치
        expect(stage).not.toBeNull(); // 무대 존재 확인
        expect(dock).not.toBeNull(); // 도크 존재 확인
        expect(story).not.toBeNull(); // 스토리 존재 확인
        expect(dock!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height - 1); // 무대 아래 배치 확인
        expect(Math.abs(dock!.x - stage!.x)).toBeLessThanOrEqual(1); // 왼쪽 정렬 확인
        expect(Math.abs(dock!.width - stage!.width)).toBeLessThanOrEqual(1); // 무대와 같은 너비 확인
        expect(story!.y).toBeGreaterThanOrEqual(stage!.y); // 스토리 상자 위쪽 표시 확인
        expect(story!.y + story!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1); // 스토리 상자 무대 안 확인
        expect(answers).toHaveLength(3); // 답안 세 개 확인
        expect(new Set(answers).size).toBe(1); // 답안 한 줄 배치 확인
        expect((await measureFit(page)).contentOverflows).toBe(false); // 창 밖 넘침 부재 확인
    }); // 테스트 종료
} // 순회 종료

test("왼쪽 사이드바로 ChatBot 화면과 Text-Play를 외부 요청 없이 오간다", async ({ page }) => // 사이드바 이동 검증
{ // 테스트 시작
    const externalRequests = await blockExternalRequests(page); // 외부 요청 차단
    await page.setViewportSize({ width: 1280, height: 720 }); // 검증 창 크기
    await page.goto("/"); // 데스크톱 첫 화면
    const sidebar = await page.getByRole("complementary", { name: "Mate Verse 사이드바" }).boundingBox(); // 사이드바 위치
    expect(sidebar).toEqual({ x: 0, y: 0, width: 320, height: 720 }); // 창 왼쪽 전체 높이 고정 확인(ChatBot 왼쪽 창과 같은 목록 폭)
    const chatList = await page.getByRole("complementary", { name: "진행 중인 대화방" }).boundingBox(); // ChatBot 대화방 목록 위치
    expect(chatList!.width).toBeGreaterThanOrEqual(300); // ChatBot 목록 폭 확보 확인
    expect(await page.getByRole("complementary", { name: "진행 중인 대화방" }).getByRole("heading", { name: "대화방" }).evaluate((heading) => heading.getClientRects().length)).toBe(1); // 대화방 제목 한 줄 확인
    await expect(page.getByRole("heading", { level: 1, name: /오늘,/u })).toBeVisible(); // ChatBot 메인 확인
    const navigation = page.getByRole("navigation", { name: "주요 메뉴" }); // 주요 메뉴
    const programMenu = page.getByRole("navigation", { name: "프로그램 메뉴" }); // 프로그램 메뉴
    await navigation.getByRole("link", { name: "탐색" }).click(); // 탐색 이동
    await expect(page.getByRole("heading", { level: 1, name: /새로운 세계/u })).toBeVisible(); // 탐색 확인
    await page.reload(); // 새로고침
    await expect(page.getByRole("heading", { level: 1, name: /새로운 세계/u })).toBeVisible(); // 새로고침 후 화면 유지 확인
    await navigation.getByRole("link", { name: "내 작품" }).click(); // 보관함 이동
    await expect(page.getByRole("heading", { level: 1, name: "내 작품과 보관함" })).toBeVisible(); // 보관함 확인
    await programMenu.getByRole("link", { name: "설정" }).click(); // 설정 이동
    await expect(page.getByRole("heading", { level: 1, name: "프로필 관리" })).toBeVisible(); // 설정 확인
    await programMenu.getByRole("link", { name: "고객 지원" }).click(); // 지원 이동
    await expect(page.getByRole("heading", { level: 1, name: "고객 지원" })).toBeVisible(); // 지원 확인
    await navigation.getByRole("link", { name: "Text-Play" }).click(); // Text-Play 이동
    await expect(page.getByRole("button", { name: "새 게임" })).toBeVisible(); // Text-Play 홈 확인
    await page.goBack(); // 창 기록 뒤로
    await expect(page.getByRole("heading", { level: 1, name: "고객 지원" })).toBeVisible(); // 기록 이동 유지 확인
    expect(await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBe(0); // 창 스크롤바 숨김 확인
    expect(externalRequests).toEqual([]); // 외부 요청 부재 확인
}); // 테스트 종료

test("상단 바 오른쪽 화살표로 메인부터 고객 지원까지 사이드바 순서대로 이동한다", async ({ page }) => // 화살표 순서 검증
{ // 테스트 시작
    await page.goto("/"); // 메인 진입
    await expect(page.getByRole("button", { name: "이전 메뉴" })).toBeDisabled(); // 메인 이전 비활성 확인
    const steps = // 다음 메뉴 순서
    [ // 목록 시작
        { button: "다음 메뉴: 탐색", heading: /새로운 세계/u }, // 탐색
        { button: "다음 메뉴: 내 작품", heading: /내 작품과 보관함/u }, // 내 작품
        { button: "다음 메뉴: Text-Play", heading: /어떤 이야기/u }, // Text-Play
        { button: "다음 메뉴: 설정", heading: /프로필 관리/u }, // 설정
        { button: "다음 메뉴: 고객 지원", heading: /고객 지원/u }, // 고객 지원
    ]; // 목록 종료
    for (const step of steps) // 순서 순회
    { // 순회 시작
        await page.getByRole("button", { name: step.button }).click(); // 오른쪽 화살표 선택
        await expect(page.getByRole("heading", { level: 1, name: step.heading })).toBeVisible(); // 이동 화면 확인
    } // 순회 종료
    await expect(page.getByRole("button", { name: "다음 메뉴" })).toBeDisabled(); // 마지막 다음 비활성 확인
    await page.getByRole("button", { name: "이전 메뉴: 설정" }).click(); // 왼쪽 화살표 선택
    await expect(page.getByRole("heading", { level: 1, name: "프로필 관리" })).toBeVisible(); // 이전 메뉴 이동 확인
}); // 테스트 종료

test("Text-Play를 플레이하고 돌아오면 사이드바 Text-Play 대화방에 기록이 생기고 눌러서 이어한다", async ({ page }) => // Text-Play 대화방 검증
{ // 테스트 시작
    await page.goto("/#/text-play"); // Text-Play 홈 진입
    const playRooms = page.getByRole("region", { name: "Text-Play 대화방" }); // Text-Play 대화방
    await expect(playRooms.getByText("아직 Text-Play 기록이 없습니다.")).toBeVisible(); // 빈 기록 확인
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await chooseRecommendation(page, "달빛 등불을 든다"); // 선택지 진행
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 진행 장면 확인
    await page.getByRole("button", { name: "메인으로 돌아가기: 달빛 숲의 기록" }).click(); // Text-Play 홈 복귀
    const record = playRooms.getByRole("link", { name: "달빛 숲의 기록 자동 저장 이어하기" }); // 자동 저장 기록
    await expect(record).toBeVisible(); // 기록 반영 확인
    const chatRooms = await page.getByRole("complementary", { name: "진행 중인 대화방" }).boundingBox(); // ChatBot 대화방 위치
    const playBox = await playRooms.boundingBox(); // Text-Play 대화방 위치
    expect(playBox!.y).toBeGreaterThan(chatRooms!.y); // ChatBot 대화방 아래 배치 확인
    await record.click(); // 기록 선택
    await expect(page.getByRole("heading", { name: "폐허 회랑" })).toBeVisible(); // 이어하기 장면 확인
}); // 테스트 종료

test("ChatBot에서 내보낸 기록을 가져오면 사이드바 대화방에 같은 기록이 나타난다", async ({ browser }, testInfo) => // ChatBot 기록 가져오기 검증
{ // 테스트 시작
    const source = await browser.newContext(); // 기록을 만든 ChatBot 환경
    const sourcePage = await source.newPage(); // 원본 화면
    await sourcePage.goto("/#/characters/harin"); // 하린 상세 진입
    await sourcePage.getByRole("button", { name: "히어로 새 대화 시작" }).click(); // 새 대화 시작
    await sourcePage.getByLabel("메시지", { exact: true }).fill("가져오기 확인용 메시지"); // 메시지 입력
    await sourcePage.getByRole("button", { name: "전송" }).click(); // 메시지 전송
    await expect(sourcePage.getByText(/네 이야기를 더 듣고 싶어|그 마음을 기억해 둘게|네가 와서 분위기가 달라졌어/u).last()).toBeVisible(); // 응답 완료 확인
    await sourcePage.goto("/#/settings/privacy#data"); // 데이터 관리 진입
    sourcePage.once("dialog", async (dialog) => // 개인정보 확인 처리
    { // 함수 시작
        await dialog.accept(); // 내보내기 승인
    }); // 처리 종료
    const [download] = await Promise.all([sourcePage.waitForEvent("download"), sourcePage.getByRole("button", { name: "JSON 내보내기" }).click()]); // 내보내기 파일 받기
    const exportPath = testInfo.outputPath("mateverse-data.json"); // 내보내기 파일 경로
    await download.saveAs(exportPath); // 파일 저장
    await source.close(); // 원본 환경 종료
    const target = await browser.newContext(); // 새 exe 환경
    const page = await target.newPage(); // 대상 화면
    await page.goto("/"); // 첫 화면 진입
    const chatRooms = page.getByRole("complementary", { name: "진행 중인 대화방" }); // ChatBot 대화방
    await expect(chatRooms.getByText("퇴근길 카페의 하린")).toHaveCount(0); // 가져오기 전 부재 확인
    await page.getByRole("link", { name: "ChatBot 기록 가져오기" }).click(); // 가져오기 링크 선택
    await page.getByLabel("JSON 파일 선택").setInputFiles(exportPath); // 내보낸 파일 선택
    await page.getByRole("button", { name: "가져오기 확인" }).click(); // 가져오기 실행
    await expect(page.getByText("데이터를 가져왔습니다.")).toBeVisible(); // 가져오기 완료 확인
    await expect(chatRooms.getByText("퇴근길 카페의 하린").first()).toBeVisible(); // 사이드바 반영 확인
    await target.close(); // 대상 환경 종료
}); // 테스트 종료

test("캐릭터 상세에서 새 대화를 시작해 임시 응답을 받고 사이드바 대화 목록에 표시한다", async ({ page }) => // 캐릭터 대화 검증
{ // 테스트 시작
    await page.goto("/#/characters/harin"); // 하린 상세 진입
    await page.getByRole("button", { name: "히어로 새 대화 시작" }).click(); // 새 대화 시작
    await page.getByLabel("메시지", { exact: true }).fill("안녕"); // 메시지 입력
    await page.getByRole("button", { name: "전송" }).click(); // 메시지 전송
    await expect(page.getByText(/네 이야기를 더 듣고 싶어|그 마음을 기억해 둘게|네가 와서 분위기가 달라졌어/u).last()).toBeVisible(); // 임시 응답 확인
    await expect(page.getByRole("complementary", { name: "진행 중인 대화방" }).getByText("퇴근길 카페의 하린").first()).toBeVisible(); // 사이드바 대화 목록 확인
}); // 테스트 종료
