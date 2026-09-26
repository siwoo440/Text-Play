import { screen } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 생성
import { DataManagement } from "@/features/settings/DataManagement"; // 데이터 관리 화면
import { LocalStorageGateway } from "@/lib/repositories/local-storage-gateway"; // 로컬 저장소
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더 도구

function ProfileProbe() // 프로필 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <span aria-label="현재 닉네임">{state.profile.nickname}</span>; // 이름 출력
} // 함수 종료

describe("데이터 관리", () => // 관리 묶음
{ // 묶음 시작
    beforeEach(() => // 환경 초기화
    { // 초기화 시작
        window.localStorage.clear(); // 저장공간 비우기
    }); // 초기화 종료

    it("잘못된 파일을 거부하고 현재 상태를 유지한다", async () => // 잘못된 가져오기 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        state.profile.nickname = "보존 이름"; // 확인 이름 설정
        new LocalStorageGateway(window.localStorage).save(state); // 현재 상태 저장
        renderWithApp(<><DataManagement /><ProfileProbe /></>, state); // 관리 화면 렌더
        const file = new File(["{잘못된 JSON"], "broken.json", { type: "application/json" }); // 잘못된 파일 생성
        await user.upload(screen.getByLabelText("JSON 파일 선택"), file); // 파일 선택
        expect(await screen.findByRole("alert")).toHaveTextContent("JSON"); // 오류 안내 확인
        expect(screen.getByLabelText("현재 닉네임")).toHaveTextContent("보존 이름"); // 현재 상태 유지
    }); // 테스트 종료

    it("검증한 파일을 확인 후 가져온다", async () => // 가져오기 확인 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 현재 상태 생성
        new LocalStorageGateway(window.localStorage).save(state); // 현재 상태 저장
        const imported = createInitialState(); // 가져올 상태 생성
        imported.profile.nickname = "가져온 이름"; // 가져올 이름 설정
        renderWithApp(<><DataManagement /><ProfileProbe /></>, state); // 관리 화면 렌더
        const file = new File([JSON.stringify(imported)], "valid.json", { type: "application/json" }); // 정상 파일 생성
        await user.upload(screen.getByLabelText("JSON 파일 선택"), file); // 파일 선택
        expect(await screen.findByText("가져온 데이터 미리보기")).toBeInTheDocument(); // 미리보기 확인
        await user.click(screen.getByRole("button", { name: "가져오기 확인" })); // 가져오기 실행
        expect(screen.getByLabelText("현재 닉네임")).toHaveTextContent("가져온 이름"); // 상태 교체 확인
    }); // 테스트 종료
}); // 묶음 종료
