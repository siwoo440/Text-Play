import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { renderToString } from "react-dom/server"; // 서버 렌더 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { ResilientTextPlaySaveRepository, TEXT_PLAY_MEMORY_STORAGE_WARNING } from "@/features/text-play/storage/browser-save-repository"; // 복구 저장소
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 홈 화면
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처

function createPlatform(navigate = vi.fn()): TextPlayPlatform // 테스트 플랫폼 생성기
{ // 함수 시작
    return { applyWindowResolution: async () => undefined, navigate, renderSceneImage: () => null }; // 테스트 플랫폼 반환
} // 함수 종료

describe("Text-Play 홈", () => // 홈 검증 묶음
{ // 묶음 시작
    it("오늘의 작품과 새 게임 동작을 제공한다", async () => // 진입점 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        render(<TextPlayPlatformProvider value={createPlatform(navigate)}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 홈 렌더
        expect(screen.getByRole("heading", { name: "달빛 숲의 기록" })).toBeInTheDocument(); // 작품 제목 확인
        await user.click(screen.getByRole("button", { name: "새 게임" })); // 새 게임 선택
        expect(navigate).toHaveBeenCalledWith("new"); // 새 게임 이동 확인
    }); // 테스트 종료

    it("자동 저장이 있으면 진행 요약과 이어하기 경로를 표시한다", async () => // 이어하기 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const session = createPreparedTextPlaySessionState(); // 세션 생성
        session.game.sceneId = "moonlit-hall"; // 저장 장면 지정
        session.game.locationId = "moonlit-hall"; // 저장 위치 지정
        session.game.playTimeSeconds = 125; // 플레이 시간 지정
        await repository.save("auto", session.game, "폐허 회랑"); // 자동 슬롯 저장
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        render(<TextPlayPlatformProvider value={createPlatform(navigate)}><TextPlayHome repository={repository} /></TextPlayPlatformProvider>); // 홈 렌더
        await user.click(await screen.findByRole("button", { name: "이어하기" })); // 이어하기 선택
        expect(navigate).toHaveBeenCalledWith("resume"); // 이어하기 이동 확인
        expect(screen.getByText("이어하기 · 폐허 회랑 · 2분 5초")).toBeInTheDocument(); // 장면 제목 진행 요약 확인
    }); // 테스트 종료

    it("IndexedDB 실패 시 메모리 저장 경고를 표시한다", async () => // 대체 저장 경고 검증
    { // 테스트 시작
        const failingRepository = // 실패 저장소 생성
        { // 저장소 시작
            list: async () => [], // 빈 목록
            load: async () => // 읽기 실패 함수
            { // 함수 시작
                throw new Error("indexeddb-failed"); // 읽기 실패
            }, // 함수 종료
            save: async () => undefined, // 저장 성공
            remove: async () => undefined, // 삭제 성공
        }; // 저장소 종료
        const repository = new ResilientTextPlaySaveRepository(failingRepository); // 복구 저장소 생성
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={repository} /></TextPlayPlatformProvider>); // 홈 렌더
        expect(await screen.findByRole("alert")).toHaveTextContent(TEXT_PLAY_MEMORY_STORAGE_WARNING); // 대체 경고 확인
    }); // 테스트 종료

    it("서버 첫 렌더에는 저장 경고를 넣지 않고 화면 표시 후에 경고를 보여 준다", async () => // 화면 불일치 방지 검증
    { // 테스트 시작
        const repository = // 경고 저장소 생성
        { // 저장소 시작
            list: async () => [], // 빈 목록
            load: async () => null, // 빈 슬롯
            save: async () => undefined, // 저장 성공
            remove: async () => undefined, // 삭제 성공
            getStorageWarning: () => TEXT_PLAY_MEMORY_STORAGE_WARNING, // 메모리 저장 경고
        }; // 저장소 종료
        const html = renderToString(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={repository} /></TextPlayPlatformProvider>); // 서버 렌더
        expect(html).not.toContain(TEXT_PLAY_MEMORY_STORAGE_WARNING); // 서버 경고 부재 확인
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={repository} /></TextPlayPlatformProvider>); // 브라우저 렌더
        expect(await screen.findByRole("alert")).toHaveTextContent(TEXT_PLAY_MEMORY_STORAGE_WARNING); // 표시 후 경고 확인
    }); // 테스트 종료

    it("실행 프로그램용 헤더와 랭킹·전체 작품 목록을 보여 준다", () => // 메인 구성 검증
    { // 테스트 시작
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} showHeader /></TextPlayPlatformProvider>); // 메인 렌더
        expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument(); // 헤더 메뉴 확인
        expect(screen.getByRole("heading", { name: "오늘, 어떤 이야기를 플레이할까요?" })).toBeInTheDocument(); // 페이지 제목 확인
        expect(screen.getByRole("heading", { name: "인기 랭킹" })).toBeInTheDocument(); // 랭킹 확인
        expect(screen.getByRole("heading", { name: "전체 작품" })).toBeInTheDocument(); // 전체 목록 확인
        expect(screen.getAllByText("준비 중").length).toBeGreaterThan(5); // Mock 작품 확인
    }); // 테스트 종료

    it("장르와 검색어로 작품을 거르고 빈 결과를 안내한다", async () => // 필터 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 메인 렌더
        await user.click(screen.getByRole("button", { name: "SF" })); // SF 장르 선택
        expect(screen.getByRole("button", { name: "SF" })).toHaveAttribute("aria-pressed", "true"); // 장르 선택 확인
        expect(screen.getByRole("heading", { name: "작품 탐색 결과" })).toBeInTheDocument(); // 결과 제목 확인
        await user.type(screen.getByRole("searchbox", { name: "작품과 등장인물 검색" }), "존재하지 않는 작품"); // 검색어 입력
        expect(screen.getByRole("status")).toHaveTextContent("조건에 맞는 작품이 없습니다."); // 빈 결과 확인
    }); // 테스트 종료

    it("준비 중인 작품을 누르면 상세 창에서 플레이할 수 없다고 안내한다", async () => // 상세 창 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 메인 렌더
        await user.click(screen.getAllByRole("button", { name: /^황혼 우체국 - / })[0]); // Mock 작품 선택
        const dialog = screen.getByRole("dialog", { name: "황혼 우체국" }); // 상세 창 조회
        expect(within(dialog).getByRole("button", { name: "준비 중인 작품입니다" })).toBeDisabled(); // 준비 중 버튼 확인
        expect(within(dialog).getByText(/주인공 애린/)).toBeInTheDocument(); // 주인공 확인
    }); // 테스트 종료
}); // 묶음 종료
