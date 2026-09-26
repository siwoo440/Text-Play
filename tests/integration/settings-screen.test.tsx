import { screen } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태 훅
import { SettingsScreen } from "@/features/settings/SettingsScreen"; // 설정 화면
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더 도구

function SettingsProbe() // 설정 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <span aria-label="설정 결과">{state.profile.nickname}:{state.settings.platformMode}</span>; // 상태 출력
} // 함수 종료

describe("설정 화면", () => // 화면 묶음
{ // 묶음 시작
    it("프로필을 저장하고 화면 설정을 즉시 반영한다", async () => // 설정 흐름 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<><SettingsScreen /><SettingsProbe /></>); // 설정 화면 렌더링
        const nickname = screen.getByLabelText("닉네임"); // 닉네임 입력 조회
        await user.clear(nickname); // 기존 이름 제거
        await user.type(nickname, "새 사용자"); // 새 이름 입력
        await user.click(screen.getByRole("button", { name: "프로필 저장" })); // 프로필 저장
        await user.click(screen.getByRole("tab", { name: "화면" })); // 화면 탭 선택
        await user.selectOptions(screen.getByLabelText("플랫폼 모드"), "tablet"); // 플랫폼 변경
        expect(screen.getByRole("status")).toHaveTextContent("저장했습니다."); // 성공 안내 확인
        expect(screen.getByLabelText("설정 결과")).toHaveTextContent("새 사용자:tablet"); // 상태 반영 확인
    }); // 테스트 종료

    it("잘못된 알림 시간은 저장하지 않는다", async () => // 알림 오류 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<SettingsScreen />); // 설정 화면 렌더링
        await user.click(screen.getByRole("tab", { name: "알림" })); // 알림 탭 선택
        await user.clear(screen.getByLabelText("시작 시각")); // 시작 시각 제거
        await user.type(screen.getByLabelText("시작 시각"), "22:00"); // 늦은 시작 입력
        await user.clear(screen.getByLabelText("종료 시각")); // 종료 시각 제거
        await user.type(screen.getByLabelText("종료 시각"), "09:00"); // 이른 종료 입력
        await user.click(screen.getByRole("button", { name: "알림 저장" })); // 알림 저장
        expect(screen.getByText("종료 시각은 시작 시각보다 늦어야 합니다.")).toBeInTheDocument(); // 오류 안내 확인
    }); // 테스트 종료
}); // 묶음 종료
