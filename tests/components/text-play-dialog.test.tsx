import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자

describe("Text-Play 공통 대화상자", () => // 대화상자 묶음
{ // 묶음 시작
    it("배경을 비활성화하고 초점을 대화상자 안에서 순환한다", async () => // 초점 격리 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        const onClose = vi.fn(); // 닫기 기록기
        const { container } = render(<div><button type="button">배경 버튼</button><TextPlayDialog labelledBy="dialog-title" open onClose={onClose}><h2 id="dialog-title">검증 모달</h2><button type="button" data-dialog-initial>첫 동작</button><button type="button">마지막 동작</button></TextPlayDialog></div>); // 대화상자 렌더
        expect(container).toHaveAttribute("inert"); // 배경 비활성 확인
        expect(screen.getByRole("button", { name: "첫 동작" })).toHaveFocus(); // 초기 초점 확인
        screen.getByRole("button", { name: "마지막 동작" }).focus(); // 마지막 초점 이동
        await user.tab(); // 다음 초점 이동
        expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus(); // 첫 요소 순환 확인
        await user.tab({ shift: true }); // 이전 초점 이동
        expect(screen.getByRole("button", { name: "마지막 동작" })).toHaveFocus(); // 마지막 요소 순환 확인
    }); // 테스트 종료
}); // 묶음 종료
