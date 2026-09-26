import { screen } from "@testing-library/react"; // 화면 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import Page from "@/app/page"; // 홈 화면 대상
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더

describe("홈 화면", () => // 홈 화면 묶음
{ // 묶음 시작
    it("탐색 제목을 표시한다", () => // 제목 검증
    { // 검증 시작
        renderWithApp(<Page />); // 홈 화면 렌더링
        expect(screen.getByRole("heading", { name: "오늘, 누구의 세계에 들어갈까요?" })).toBeInTheDocument(); // 제목 존재 확인
    }); // 검증 종료
}); // 묶음 종료
