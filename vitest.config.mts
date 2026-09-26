import react from "@vitejs/plugin-react"; // 리액트 플러그인
import { defineConfig } from "vitest/config"; // 테스트 설정 도구

export default defineConfig( // 설정 내보내기
{ // 설정 시작
    plugins: [react()], // 플러그인 목록
    resolve: // 경로 설정
    { // 경로 설정 시작
        tsconfigPaths: true, // 타입 경로 활성화
    }, // 경로 설정 종료
    test: // 테스트 설정
    { // 테스트 설정 시작
        environment: "jsdom", // 브라우저 환경
        setupFiles: ["./src/test/setup.ts"], // 초기 설정 파일
        include: // 수집 경로
        [ // 수집 목록 시작
            "tests/unit/**/*.test.{ts,tsx}", // 단위 테스트 수집
            "tests/components/**/*.test.{ts,tsx}", // 컴포넌트 테스트 수집
            "tests/integration/**/*.test.{ts,tsx}", // 통합 테스트 수집
        ], // 수집 목록 종료
        css: true, // 스타일 처리
    }, // 테스트 설정 종료
}); // 설정 종료
