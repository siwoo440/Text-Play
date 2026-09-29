import { StrictMode } from "react"; // 엄격 모드
import { createRoot } from "react-dom/client"; // 리액트 마운트 도구
import "@/app/globals.css"; // 공용 전역 스타일
import { DesktopApp } from "@/desktop/DesktopApp"; // 데스크톱 앱
import "@/desktop/desktop.css"; // 데스크톱 보정 스타일

const rootElement = document.getElementById("root"); // 마운트 요소 조회
if (rootElement === null) // 마운트 요소 확인
{ // 조건 시작
    throw new Error("데스크톱 마운트 요소가 없습니다."); // 마운트 오류
} // 조건 종료

createRoot(rootElement).render( // 리액트 화면 마운트
    <StrictMode> {/* 엄격 모드 시작 */}
        <DesktopApp /> {/* 데스크톱 앱 출력 */}
    </StrictMode>, // 엄격 모드 종료
); // 마운트 종료
