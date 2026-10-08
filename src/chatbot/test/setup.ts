import "@testing-library/jest-dom/vitest"; // DOM 단언 확장
import { cleanup } from "@testing-library/react"; // 렌더 정리 도구
import { afterEach } from "vitest"; // 테스트 종료 훅
import { setActiveLocale } from "@chatbot/lib/i18n"; // 화면 언어

Object.defineProperty(window.navigator, "language", { configurable: true, value: "ko-KR" }); // 테스트 화면 언어를 한국어로 고정(자동 언어는 브라우저 언어를 따름)

afterEach(() => // 테스트 종료 처리
{ // 처리 시작
    cleanup(); // DOM 정리
    window.sessionStorage.clear(); // 탭에 기억한 값(메인 조건 등)이 다음 테스트에 남지 않게 비움
    window.localStorage.removeItem("mateverse:v1:usage-time"); // 오늘 이용 시간도 다음 테스트에 남지 않게 지움
    setActiveLocale("ko"); // 영어로 바꾼 테스트가 다음 테스트에 남지 않게 한국어로 되돌림
}); // 처리 종료
