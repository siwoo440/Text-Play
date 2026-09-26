import { defineConfig, devices } from "@playwright/test"; // 종단 설정 도구

export default defineConfig( // 설정 내보내기
{ // 설정 시작
    testDir: "./tests/e2e", // 종단 테스트 경로
    fullyParallel: false, // 순차 실행
    use: // 공통 사용 설정
    { // 공통 설정 시작
        baseURL: "http://127.0.0.1:3000", // 기본 주소
        trace: "on-first-retry", // 재시도 추적
    }, // 공통 설정 종료
    projects: // 브라우저 목록
    [ // 목록 시작
        { // 브라우저 시작
            name: "chromium", // 브라우저 이름
            use: { ...devices["Desktop Chrome"] }, // 데스크톱 환경
        }, // 브라우저 종료
    ], // 목록 종료
    webServer: // 개발 서버 설정
    { // 서버 설정 시작
        command: "npm run dev", // 서버 실행 명령
        url: "http://127.0.0.1:3000", // 서버 확인 주소
        reuseExistingServer: true, // 기존 서버 재사용
    }, // 서버 설정 종료
}); // 설정 종료
