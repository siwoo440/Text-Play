import { screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지 만들기
import { ImageStudio } from "@chatbot/features/images/ImageStudio"; // 이미지 스튜디오
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/library", // 현재 경로 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

vi.setConfig({ testTimeout: 20_000 }); // 화면이 큰 테스트라 넉넉히 기다림

describe("삭제 확인 창의 키보드 사용", () => // 대화상자 묶음
{ // 묶음 시작
    it("보관함의 대화 삭제 창은 취소에 초점을 두고 Tab이 안에서만 돌며 Esc로 닫으면 연 버튼으로 돌아간다", async () => // 보관함 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<LibraryScreen />); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭
        const opener = screen.getByRole("button", { name: "새벽 도서관의 리안 삭제" }); // 삭제 버튼
        await user.click(opener); // 창 열기
        const dialog = screen.getByRole("dialog", { name: "대화 삭제" }); // 삭제 창
        const cancel = within(dialog).getByRole("button", { name: "취소" }); // 취소
        const confirm = within(dialog).getByRole("button", { name: "대화 삭제 확인" }); // 확인
        expect(cancel).toHaveFocus(); // 안전한 버튼에 초점
        await user.tab(); // 다음
        expect(confirm).toHaveFocus(); // 확인으로
        await user.tab(); // 마지막에서 다음
        expect(cancel).toHaveFocus(); // 창 안에서 처음으로
        await user.tab({ shift: true }); // 처음에서 뒤로
        expect(confirm).toHaveFocus(); // 창 안에서 마지막으로
        await user.keyboard("{Escape}"); // Esc 키 누르기
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // 창 닫힘
        expect(opener).toHaveFocus(); // 연 버튼으로 복귀
        expect(screen.getByRole("tabpanel")).toHaveTextContent("새벽 도서관의 리안"); // 대화는 그대로
    }); // 테스트 종료

    it("내 이미지의 삭제 창도 같은 방식으로 움직인다", async () => // 이미지 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태
        state.images = [createGeneratedImage({ prompt: "숲속 정원", style: "watercolor", aspect: "square", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-01T00:00:00.000Z", "image-garden")]; // 이미지 한 장
        renderWithApp(<ImageStudio />, state); // 스튜디오 렌더
        const opener = screen.getByRole("button", { name: "숲속 정원 삭제" }); // 삭제 버튼
        await user.click(opener); // 창 열기
        const dialog = screen.getByRole("dialog", { name: "이미지 삭제" }); // 삭제 창
        expect(within(dialog).getByRole("button", { name: "취소" })).toHaveFocus(); // 취소에 초점
        await user.tab({ shift: true }); // 처음에서 뒤로
        expect(within(dialog).getByRole("button", { name: "이미지 삭제 확인" })).toHaveFocus(); // 창 안에서 마지막으로
        await user.keyboard("{Escape}"); // Esc 키 누르기
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // 창 닫힘
        expect(opener).toHaveFocus(); // 연 버튼으로 복귀
    }); // 테스트 종료
}); // 묶음 종료
