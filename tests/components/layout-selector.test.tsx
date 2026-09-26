import { screen } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it } from "vitest"; // 테스트 도구
import { LayoutSelector } from "@/features/chat/LayoutSelector"; // 레이아웃 선택
import { ChatScreen } from "@/features/chat/ChatScreen"; // 채팅 화면
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더

describe("레이아웃 선택기", () => // 선택기 묶음
{ // 묶음 시작
    it("아홉 레이아웃과 자동 추천을 표시하고 사용자 선택을 저장한다", async () => // 선택 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<LayoutSelector width={390} height={844} />); // 선택기 렌더
        const select = screen.getByRole("combobox", { name: "채팅 레이아웃" }); // 선택 상자
        expect(select).toHaveDisplayValue("자동 · M1"); // 자동 추천
        expect(screen.getAllByRole("option")).toHaveLength(10); // 자동 포함 열 옵션
        await user.selectOptions(select, "D3"); // 시네마틱 선택
        expect(select).toHaveValue("D3"); // 선택 반영
    }); // 검증 종료

    it("선택한 레이아웃을 채팅 화면에 즉시 적용한다", async () => // 화면 적용 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const { container } = renderWithApp(<ChatScreen characterId="rian" />); // 채팅 렌더
        const select = screen.getByRole("combobox", { name: "채팅 레이아웃" }); // 선택 상자
        await user.selectOptions(select, "D3"); // 시네마틱 선택
        expect(container.querySelector("main")).toHaveAttribute("data-layout", "D3"); // 화면 반영
    }); // 검증 종료
}); // 묶음 종료
