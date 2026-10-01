import "@testing-library/jest-dom/vitest"; // DOM 단언 확장
import { cleanup } from "@testing-library/react"; // 렌더 정리 도구
import { afterEach } from "vitest"; // 테스트 종료 훅

afterEach(() => // 테스트 종료 처리
{ // 처리 시작
    cleanup(); // DOM 정리
}); // 처리 종료
