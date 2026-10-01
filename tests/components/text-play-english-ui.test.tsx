import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { DEFAULT_TEXT_PLAY_PREFERENCES, saveTextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 설정 저장 도구
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 메인 화면
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

const HANGUL = /[가-힣]/u; // 한글 글자

function createPlatform(): TextPlayPlatform // 테스트 플랫폼 생성기
{ // 함수 시작
    return { applyWindowResolution: async () => undefined, navigate: vi.fn(), renderSceneImage: (source) => <span data-testid="scene-image">{source}</span> }; // 테스트 플랫폼 반환
} // 함수 종료

function renderEnglishScreen() // 영어 플레이 화면 렌더
{ // 함수 시작
    return render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()} language="en"><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
} // 함수 종료

function hangulLabels(root: HTMLElement): string[] // 한글이 남은 접근성 이름 목록
{ // 함수 시작
    return [...root.querySelectorAll("[aria-label], [placeholder]")].flatMap((element) => [element.getAttribute("aria-label") ?? "", element.getAttribute("placeholder") ?? ""]).filter((label) => HANGUL.test(label)); // 한글 이름 반환
} // 함수 종료

describe("Text-Play 영어 화면", () => // 영어 화면 검증 묶음
{ // 묶음 시작
    beforeEach(() => // 영어 설정 준비
    { // 준비 시작
        saveTextPlayPreferences(window.localStorage, { ...DEFAULT_TEXT_PLAY_PREFERENCES, language: "en" }); // 영어 설정 저장
    }); // 준비 종료

    afterEach(() => // 설정 정리
    { // 정리 시작
        window.localStorage.clear(); // 저장소 비우기
    }); // 정리 종료

    it("플레이 화면 글자와 작품 내용을 영어로 보여 준다", async () => // 영어 플레이 화면 검증
    { // 테스트 시작
        const { container } = renderEnglishScreen(); // 화면 렌더
        expect(await screen.findByRole("heading", { name: "Moonlit Forest Gate" })).toBeInTheDocument(); // 장면 제목 확인
        expect(screen.getByRole("button", { name: "Back to main: Moonlit Forest Records" })).toBeInTheDocument(); // 작품 제목 버튼 확인
        expect(screen.getByRole("textbox", { name: "Type an action" })).toBeInTheDocument(); // 자유 입력 확인
        expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(); // 전송 버튼 확인
        expect(screen.getByRole("button", { name: "AI suggestions" })).toBeInTheDocument(); // 추천 버튼 확인
        expect(screen.getByLabelText("AI connection")).toHaveTextContent("Temporary AI"); // AI 상태 확인
        expect(screen.getByText("Beyond the silver mist, an old lantern glimmers faintly.")).toBeInTheDocument(); // 저장된 한국어 첫 서술의 영어판 확인
        expect(container.textContent ?? "").not.toMatch(HANGUL); // 화면 글자에 한글 없음
        expect(hangulLabels(container)).toEqual([]); // 접근성 이름에 한글 없음
    }); // 테스트 종료

    it("선택지·턴 기록·안내도 영어로 보여 준다", async () => // 진행 흐름 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const { container } = renderEnglishScreen(); // 화면 렌더
        await user.click(await screen.findByRole("button", { name: "AI suggestions" })); // 추천 펼치기
        await user.click(within(screen.getByRole("list", { name: "AI suggestion list" })).getByRole("button", { name: "Take the moon lantern" })); // 영어 선택지 고르기
        expect(await screen.findByRole("heading", { name: "Ruined Hall" })).toBeInTheDocument(); // 다음 장면 제목 확인
        expect(screen.getByText("The lantern reveals patterns on the wall and a door leading to the sealed study.")).toBeInTheDocument(); // 장면 서술 확인
        expect(screen.getByLabelText("Current turn 2")).toBeInTheDocument(); // 현재 턴 확인
        expect(await screen.findByText("Auto-saved.")).toBeInTheDocument(); // 저장 안내 확인
        expect(container.textContent ?? "").not.toMatch(HANGUL); // 화면 글자에 한글 없음
    }); // 테스트 종료

    it("상태 패널·저장 창·설정 창을 영어로 보여 준다", async () => // 대화상자 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        renderEnglishScreen(); // 화면 렌더
        await user.click(await screen.findByRole("button", { name: "Open status panel" })); // 상태 패널 열기
        const panel = screen.getByRole("complementary", { name: "Game status" }); // 상태 패널 조회
        expect(panel.textContent ?? "").not.toMatch(HANGUL); // 상태 패널 한글 없음
        expect(within(panel).getByText("Relationship with Lyra")).toBeInTheDocument(); // 관계 표시 확인
        await user.click(screen.getAllByRole("button", { name: "Close status panel" })[0]); // 상태 패널 닫기
        await user.click(screen.getByRole("button", { name: "Open save slots" })); // 저장 창 열기
        const saveDialog = screen.getByRole("dialog", { name: "Save game" }); // 저장 창 조회
        expect(saveDialog.textContent ?? "").not.toMatch(HANGUL); // 저장 창 한글 없음
        await user.click(within(saveDialog).getByRole("button", { name: "Close" })); // 저장 창 닫기
        await user.click(screen.getByRole("button", { name: "Open game settings" })); // 설정 창 열기
        const settings = screen.getByRole("dialog", { name: "Game screen settings" }); // 설정 창 조회
        expect((settings.textContent ?? "").replace("언어 / Language", "").replace("한국어", "")).not.toMatch(HANGUL); // 두 언어로 쓴 언어 선택 말고는 한글 없음
    }); // 테스트 종료

    it("Text-Play 메인 화면 글자와 샘플 작품을 영어로 보여 준다", async () => // 영어 메인 검증
    { // 테스트 시작
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 메인 렌더
        expect(await screen.findByRole("heading", { level: 1, name: "Which story will you play today?" })).toBeInTheDocument(); // 제목 확인
        expect(screen.getByRole("heading", { name: "Moonlit Forest Records" })).toBeInTheDocument(); // 오늘의 작품 확인
        expect(screen.getByRole("button", { name: "New game" })).toBeInTheDocument(); // 새 게임 확인
        expect(within(screen.getByRole("group", { name: "Genres" })).getByRole("button", { name: "Fantasy" })).toBeInTheDocument(); // 장르 버튼 확인
        expect(screen.getByRole("searchbox", { name: "Search works and characters" })).toBeInTheDocument(); // 검색 확인
    }); // 테스트 종료

    it("플레이 중 언어를 바꾸면 화면만 바뀌고 저장을 다시 불러오지 않는다", async () => // 언어 전환 검증
    { // 테스트 시작
        window.localStorage.clear(); // 한국어로 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소
        await repository.save("auto", createPreparedTextPlaySessionState().game, "forest-gate"); // 자동 저장 준비
        const load = vi.spyOn(repository, "load"); // 불러오기 감시
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={repository} resumeSlot="auto"><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 이어하기 화면 렌더
        expect(await screen.findByText("저장한 게임을 불러왔습니다.")).toBeInTheDocument(); // 처음 불러오기 확인
        const loadsBefore = load.mock.calls.length; // 언어 바꾸기 전 불러오기 수
        await user.click(screen.getByRole("button", { name: "게임 설정 열기" })); // 설정 창 열기
        await user.selectOptions(screen.getByRole("combobox", { name: "언어 / Language" }), "en"); // 영어 고르기
        expect(await screen.findByRole("heading", { name: "Moonlit Forest Gate" })).toBeInTheDocument(); // 화면 영어 전환 확인
        expect(load.mock.calls.length).toBe(loadsBefore); // 저장을 다시 불러오지 않음
    }); // 테스트 종료
}); // 묶음 종료
