import "@testing-library/jest-dom/vitest"; // DOM 단언 확장
import { cleanup } from "@testing-library/react"; // 렌더 정리 도구
import { afterEach } from "vitest"; // 테스트 종료 훅

if (typeof window !== "undefined") // 브라우저 환경 확인(node 환경 테스트에는 window가 없음)
{ // 조건 시작
    await import("@chatbot/test/setup"); // ChatBot 사본의 준비도 함께(화면 언어 한국어 고정, 탭 기억 비우기)
} // 조건 종료

afterEach(() => // 테스트 종료 처리
{ // 처리 시작
    cleanup(); // DOM 정리
}); // 처리 종료
