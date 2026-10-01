import { screen } from "@testing-library/react"; // 화면 조회 도구
import type { UserEvent } from "@testing-library/user-event"; // 사용자 동작 계약

export async function chooseTextPlayRecommendation(user: UserEvent, label: string): Promise<void> // 추천 답안 선택 도우미
{ // 함수 시작
    const toggle = screen.getByRole("button", { name: "AI 추천 답안" }); // 펼침 버튼 조회
    if (toggle.getAttribute("aria-expanded") !== "true") // 접힘 상태 확인
    { // 조건 시작
        await user.click(toggle); // 추천 펼치기
    } // 조건 종료
    await user.click(screen.getByRole("button", { name: label })); // 답안 선택
} // 함수 종료
