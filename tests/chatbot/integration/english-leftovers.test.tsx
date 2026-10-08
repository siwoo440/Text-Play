import { render, screen, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AdultVerificationDialog } from "@chatbot/features/adult/AdultVerificationDialog"; // 성인 인증 창
import { ShortcutsDialog } from "@chatbot/features/chat/ChatSettingsDialogs"; // 단축키 창
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { ImageStudio } from "@chatbot/features/images/ImageStudio"; // 이미지 스튜디오
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함
import { InviteSection } from "@chatbot/features/rewards/InviteSection"; // 친구 초대
import { PrivacySettings } from "@chatbot/features/settings/PrivacySettings"; // 개인정보 및 보안
import { TokenHistory } from "@chatbot/features/settings/TokenHistory"; // 토큰 이용 내역
import { setActiveLocale } from "@chatbot/lib/i18n"; // 화면 언어
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
    usePathname: () => "/", // 현재 경로 대역
    useSearchParams: () => new URLSearchParams(), // 주소 값 대역
})); // 대체 종료

const hangul = /[가-힣]/; // 한글 판정

function english(): AppState // 화면 언어를 영어로 고른 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.settings.language = "en"; // 영어 화면
    return state; // 영어 상태
} // 함수 종료

describe("영어 화면에 남아 있던 한국어", () => // 번역 누락 묶음
{ // 묶음 시작
    it("성인 인증 창의 나이 확인 오류가 영어로 나오고, 어느 칸의 오류인지는 글자가 아니라 종류로 가린다", async () => // 성인 인증 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<AdultVerificationDialog onCancel={() => undefined} onVerified={() => undefined} />, english()); // 영어 화면
        const birth = screen.getByLabelText("Date of birth"); // 생년월일
        await user.click(screen.getByRole("button", { name: "Verify" })); // 빈 채로 인증
        expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid date of birth."); // 날짜 오류
        expect(birth).toHaveAttribute("aria-invalid", "true"); // 생년월일 칸의 오류
        await user.type(birth, "2015-01-01"); // 미성년
        await user.click(screen.getByRole("button", { name: "Verify" })); // 인증
        expect(screen.getByRole("alert")).toHaveTextContent("Under the Youth Protection Act, people under 19 can't complete adult verification."); // 미성년 오류
        await user.clear(birth); // 지우기
        await user.type(birth, "1990-01-01"); // 성인
        await user.click(screen.getByRole("button", { name: "Verify" })); // 동의 없이 인증
        expect(screen.getByRole("alert")).toHaveTextContent("Please check the 19+ consent box."); // 동의 오류
        expect(birth).toHaveAttribute("aria-invalid", "false"); // 생년월일 칸의 오류가 아님
    }); // 검증 종료

    it("초대 코드 오류가 영어로 나온다", async () => // 초대 코드 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<InviteSection />, english()); // 영어 화면
        await user.type(screen.getByLabelText("Friend's invite code"), "abc{Enter}"); // 틀린 코드
        const alert = screen.getByRole("alert"); // 오류 안내
        expect(alert).toHaveTextContent("An invite code is eight letters and numbers. Please check it again."); // 형식 오류
        expect(alert.textContent ?? "").not.toMatch(hangul); // 한글 없음
    }); // 검증 종료

    it("키보드 단축키 설명이 영어로 나오고, 단축키 창을 여는 Ctrl + /도 목록에 있다", () => // 단축키 검증
    { // 검증 시작
        setActiveLocale("en"); // 영어 화면
        render(<ShortcutsDialog onClose={() => undefined} />); // 단축키 창
        const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" }); // 대화상자
        expect(within(dialog).getByText("Send message")).toBeInTheDocument(); // 설명 번역
        expect(within(dialog).getByText("Ctrl + /")).toBeInTheDocument(); // 단축키 창 열기
        expect(within(dialog).getByText("See keyboard shortcuts")).toBeInTheDocument(); // 그 설명
        expect(dialog.textContent ?? "").not.toMatch(hangul); // 한글 없음
    }); // 검증 종료

    it("토큰 이용 내역의 출처와 신고 기록의 사유가 영어로 나온다", () => // 출처·사유 검증
    { // 검증 시작
        const state = english(); // 영어 상태
        const now = new Date().toISOString(); // 지금
        state.localReports = [{ id: "report-1", characterId: "rian", reason: "spam", createdAt: now }]; // 신고 한 건
        renderWithApp(<><TokenHistory records={[{ id: "record-1", direction: "earn", source: "attendance", label: "출석 보상", amount: 10, balance: 1250, createdAt: now }]} /><PrivacySettings /></>, state); // 두 화면
        expect(screen.getByText(/^Check-in · /)).toBeInTheDocument(); // 출처 번역
        expect(screen.getByText(/^Spam or repeated content · /)).toBeInTheDocument(); // 사유 번역
    }); // 검증 종료

    it("이미지 스튜디오의 이용 등급 선택지가 영어로 나온다", () => // 이용 등급 검증
    { // 검증 시작
        renderWithApp(<ImageStudio />, english()); // 영어 화면
        const options = within(screen.getByLabelText("Rating")).getAllByRole("option").map((option) => option.textContent); // 선택지
        expect(options[0]).toBe("All ages"); // 전체 이용가
        expect(options.join("")).not.toMatch(hangul); // 한글 없음
    }); // 검증 종료

    it("보관함의 삭제 버튼은 이름표의 한국어가 아니라 표시 값으로 위험 동작 색을 받는다", async () => // 삭제 버튼 표시 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<LibraryScreen />, english()); // 영어 화면
        await user.click(screen.getAllByRole("tab")[4]); // 진행 중인 대화 탭
        const buttons = screen.getAllByRole("button", { name: /^Delete / }); // 삭제 버튼
        expect(buttons.length).toBeGreaterThan(0); // 버튼 있음
        for (const button of buttons) // 버튼 순회
        { // 순회 시작
            expect(button).toHaveAttribute("data-danger", "true"); // 위험 동작 표시
        } // 순회 종료
    }); // 검증 종료
}); // 묶음 종료
