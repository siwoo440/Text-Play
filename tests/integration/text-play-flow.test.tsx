import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { chooseTextPlayRecommendation } from "@/test/text-play-recommendations"; // 추천 답안 선택 도우미
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 공급자
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면
import { createPreparedTextPlaySessionState, TEST_TEXT_PLAY_PLATFORM } from "@/test/text-play-fixtures"; // 세션 픽스처

describe("Text-Play 전체 플레이 흐름", () => // 플레이 흐름 묶음
{ // 묶음 시작
    it("선택지를 따라 진실 엔딩과 완료 퀘스트에 도달한다", async () => // 정상 엔딩 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 등불 선택
        await chooseTextPlayRecommendation(user, "봉인된 서재로 간다"); // 서재 선택
        await chooseTextPlayRecommendation(user, "기록을 해독한다"); // 기록 해독
        expect(screen.getByRole("heading", { name: "기록의 진실", level: 1 })).toBeInTheDocument(); // 엔딩 장면 제목 확인
        await user.click(screen.getByRole("button", { name: "상태 패널 열기" })); // 상태 패널 열기
        expect(screen.getByText("완료: 숲 아래의 목소리")).toBeInTheDocument(); // 완료 퀘스트 확인(표시 이름)
    }); // 테스트 종료

    it("엔딩에 도달하면 엔딩 제목·요약과 처음부터·메인으로 버튼을 보여 주고 직접 입력을 막는다", async () => // 엔딩 화면 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        expect(screen.queryByRole("region", { name: "엔딩" })).not.toBeInTheDocument(); // 진행 중에는 엔딩 화면 없음
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 등불 선택
        await chooseTextPlayRecommendation(user, "봉인된 서재로 간다"); // 서재 선택
        await chooseTextPlayRecommendation(user, "기록을 해독한다"); // 기록 해독
        const ending = screen.getByRole("region", { name: "엔딩" }); // 엔딩 화면 조회
        expect(within(ending).getByRole("heading", { name: "기록의 진실", level: 2 })).toBeInTheDocument(); // 엔딩 제목 확인
        expect(within(ending).getByText("숲 아래 목소리의 정체를 밝히고 리라의 기록을 복원했다.")).toBeInTheDocument(); // 엔딩 요약 확인
        expect(within(ending).getByText(/4턴/u)).toBeInTheDocument(); // 플레이 기록(턴 수) 확인
        expect(within(ending).getByRole("button", { name: "처음부터 다시 하기" })).toBeInTheDocument(); // 처음부터 버튼 확인
        expect(within(ending).getByRole("button", { name: "메인으로" })).toBeInTheDocument(); // 메인으로 버튼 확인
        expect(screen.queryByRole("textbox", { name: "행동 직접 입력" })).not.toBeInTheDocument(); // 직접 입력 막힘 확인
        expect(screen.queryByRole("button", { name: "전송" })).not.toBeInTheDocument(); // 전송 버튼 없음 확인
        expect(screen.queryByRole("button", { name: "AI 추천 답안" })).not.toBeInTheDocument(); // 추천 답안 없음 확인
        await user.click(screen.getByRole("button", { name: "이전 턴 보기" })); // 지난 턴 열람
        expect(screen.getByRole("heading", { name: "봉인된 서재", level: 1 })).toBeInTheDocument(); // 지난 장면 확인
        expect(screen.getByRole("region", { name: "엔딩" })).toBeInTheDocument(); // 지난 턴을 봐도 엔딩 화면 유지
    }); // 테스트 종료

    it("엔딩에서 처음부터 다시 하기를 누르면 첫 장면과 처음 상태로 돌아간다", async () => // 다시 시작 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        render(<TextPlayPlatformProvider value={TEST_TEXT_PLAY_PLATFORM}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 등불 선택
        await chooseTextPlayRecommendation(user, "벽의 문양을 조사한다"); // 문양 조사(정신력 감소)
        await chooseTextPlayRecommendation(user, "기록을 해독한다"); // 기록 해독
        await user.click(screen.getByRole("button", { name: "처음부터 다시 하기" })); // 다시 시작
        expect(screen.getByRole("heading", { name: "달빛 숲 입구", level: 1 })).toBeInTheDocument(); // 첫 장면 확인
        expect(screen.getByLabelText("전체 턴 1")).toHaveTextContent("1"); // 턴 기록 초기화 확인
        expect(screen.queryByRole("region", { name: "엔딩" })).not.toBeInTheDocument(); // 엔딩 화면 닫힘 확인
        expect(screen.getByRole("textbox", { name: "행동 직접 입력" })).toBeInTheDocument(); // 직접 입력 복귀 확인
        expect(screen.getByRole("button", { name: "상태 패널 열기" })).toHaveTextContent("80"); // 정신력 초기화 확인
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 새 게임 진행
        expect(screen.getByRole("heading", { name: "폐허 회랑", level: 1 })).toBeInTheDocument(); // 새 게임 진행 확인
    }); // 테스트 종료

    it("후퇴 엔딩에서 메인으로를 누르면 메인 화면으로 간다", async () => // 메인 이동 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 생성
        const navigate = vi.fn(); // 이동 기록 함수
        const platform: TextPlayPlatform = { ...TEST_TEXT_PLAY_PLATFORM, navigate }; // 이동을 기록하는 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        await chooseTextPlayRecommendation(user, "숲 밖으로 후퇴한다"); // 후퇴 선택
        const ending = screen.getByRole("region", { name: "엔딩" }); // 엔딩 화면 조회
        expect(within(ending).getByRole("heading", { name: "돌아가는 길", level: 2 })).toBeInTheDocument(); // 후퇴 엔딩 제목 확인
        expect(within(ending).getByText("달빛 숲의 입구에서 탐사를 포기하고 돌아왔다.")).toBeInTheDocument(); // 후퇴 엔딩 요약 확인
        await user.click(within(ending).getByRole("button", { name: "메인으로" })); // 메인으로 이동
        expect(navigate).toHaveBeenCalledWith("home"); // 메인 이동 확인
    }); // 테스트 종료
}); // 묶음 종료
