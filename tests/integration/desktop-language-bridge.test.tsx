import { render, screen, waitFor, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { afterEach, beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { DesktopApp } from "@/desktop/DesktopApp"; // 데스크톱 앱
import { DEFAULT_TEXT_PLAY_PREFERENCES, saveTextPlayPreferences, TEXT_PLAY_PREFERENCES_KEY } from "@/features/text-play/preferences/text-play-preferences"; // Text-Play 설정 저장 도구
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소

function storedTextPlayLanguage(): unknown // 저장된 Text-Play 언어
{ // 함수 시작
    return (JSON.parse(window.localStorage.getItem(TEXT_PLAY_PREFERENCES_KEY) ?? "{}") as { language?: unknown }).language; // 언어 반환
} // 함수 종료

function setBrowserLanguage(language: string): void // 브라우저 언어 바꾸기(ChatBot의 자동 언어 기준)
{ // 함수 시작
    Object.defineProperty(window.navigator, "language", { configurable: true, value: language }); // 언어 지정
} // 함수 종료

describe("데스크톱 언어 연결", () => // 언어 연결 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 준비
    { // 준비 시작
        window.history.replaceState(null, "", "/"); // 주소 초기화
        window.localStorage.clear(); // 저장소 초기화
    }); // 준비 종료

    afterEach(() => // 테스트 정리
    { // 정리 시작
        setBrowserLanguage("ko-KR"); // 브라우저 언어 되돌리기
    }); // 정리 종료

    it("Text-Play 설정에서 English를 고르면 진행 중인 게임은 그대로 두고 ChatBot 화면까지 영어로 바꾼다", async () => // Text-Play → ChatBot
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        window.history.replaceState(null, "", "/#/text-play/play?mode=new"); // 새 게임으로 시작
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        await user.click(await screen.findByRole("button", { name: "AI 추천 답안" })); // 추천 펼치기
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 한 장면 진행
        expect(await screen.findByRole("heading", { name: "폐허 회랑" })).toBeInTheDocument(); // 진행 장면 확인
        await user.click(screen.getByRole("button", { name: "게임 설정 열기" })); // 설정 창 열기
        await user.selectOptions(screen.getByRole("combobox", { name: "언어 / Language" }), "en"); // 영어 고르기
        expect(await screen.findByRole("heading", { name: "Ruined Hall" })).toBeInTheDocument(); // 게임이 처음으로 돌아가지 않고 장면 그대로 영어 표시
        await waitFor(() => expect(document.documentElement.lang).toBe("en")); // 문서 언어 확인
        await user.keyboard("{Escape}"); // 설정 창 닫기
        await user.click(screen.getByRole("button", { name: "Back to main: Moonlit Forest Records" })); // Text-Play 메인으로
        expect(await screen.findByRole("complementary", { name: "Ongoing chats" })).toBeInTheDocument(); // ChatBot 대화방 목록 영어 확인
        expect(within(screen.getByRole("navigation", { name: "Main menu" })).getByRole("link", { name: "Explore" })).toBeInTheDocument(); // 사이드바 메뉴 영어 확인
    }); // 테스트 종료

    it("ChatBot 화면 레이아웃에서 English를 고르면 Text-Play 설정 언어와 사이드바도 영어가 된다", async () => // ChatBot → Text-Play
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        window.history.replaceState(null, "", "/#/settings/display"); // 화면 레이아웃으로 시작
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        await user.selectOptions(await screen.findByRole("combobox", { name: "화면 언어" }), "en"); // ChatBot 설정에서 영어 고르기
        await waitFor(() => expect(storedTextPlayLanguage()).toBe("en")); // Text-Play 설정 저장 확인
        expect(within(await screen.findByRole("navigation", { name: "Main menu" })).getByRole("link", { name: "Explore" })).toBeInTheDocument(); // 사이드바 메뉴 영어 확인
        await user.selectOptions(await screen.findByRole("combobox", { name: "Display language" }), "ko"); // 다시 한국어 고르기
        await waitFor(() => expect(storedTextPlayLanguage()).toBe("ko")); // Text-Play 설정 한국어 복귀 확인
        expect(within(await screen.findByRole("navigation", { name: "주요 메뉴" })).getByRole("link", { name: "탐색" })).toBeInTheDocument(); // 사이드바 메뉴 한국어 확인
    }); // 테스트 종료

    it("예전에 Text-Play에서 English를 골라 둔 채 시작하면 ChatBot 화면도 영어로 시작한다", async () => // 저장된 선택 반영
    { // 테스트 시작
        saveTextPlayPreferences(window.localStorage, { ...DEFAULT_TEXT_PLAY_PREFERENCES, language: "en" }); // 지난주에 고른 영어
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        expect(await screen.findByRole("complementary", { name: "Ongoing chats" })).toBeInTheDocument(); // ChatBot 대화방 목록 영어 확인
        expect(storedTextPlayLanguage()).toBe("en"); // Text-Play 선택 유지 확인
    }); // 테스트 종료

    it("언어를 고른 적이 없으면 브라우저 언어를 따르는 ChatBot의 자동 언어를 Text-Play도 따른다", async () => // 자동 언어
    { // 테스트 시작
        setBrowserLanguage("en-US"); // 영어 Windows
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        expect(within(await screen.findByRole("navigation", { name: "Main menu" })).getByRole("link", { name: "Explore" })).toBeInTheDocument(); // 사이드바 메뉴 영어 확인
        expect(await screen.findByRole("complementary", { name: "Ongoing chats" })).toBeInTheDocument(); // ChatBot 대화방 목록 영어 확인
    }); // 테스트 종료
}); // 묶음 종료
