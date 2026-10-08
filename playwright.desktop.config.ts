import { defineConfig, devices } from "@playwright/test"; // 종단 설정 도구

export default defineConfig( // 데스크톱 종단 설정
{ // 설정 시작
    testDir: "./tests/e2e", // 종단 테스트 경로
    testMatch: "desktop-preview.spec.ts", // 데스크톱 테스트 선택
    fullyParallel: false, // 순차 실행
    workers: 1, // 단일 브라우저 작업자
    use: // 공통 사용 설정
    { // 공통 설정 시작
        baseURL: "http://127.0.0.1:1420", // 데스크톱 미리보기 주소
        trace: "on-first-retry", // 재시도 추적
        locale: "ko-KR", // 화면 언어를 한국어로 고정(ChatBot의 자동 언어는 브라우저 언어를 따름)
    }, // 공통 설정 종료
    projects: // 브라우저 목록
    [ // 목록 시작
        { // 브라우저 시작
            name: "chromium", // 브라우저 이름
            use: { ...devices["Desktop Chrome"] }, // 데스크톱 환경
        }, // 브라우저 종료
    ], // 목록 종료
}); // 설정 종료
