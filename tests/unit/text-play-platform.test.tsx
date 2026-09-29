import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, useTextPlayPlatform, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { resolveWindowSize } from "@/features/text-play/platform/text-play-window"; // 창 크기 계산기
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 홈 화면

function PlatformProbe() // 플랫폼 확인기
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 플랫폼 조회
    return <button type="button" onClick={() => platform.navigate("home")}>홈 이동</button>; // 이동 버튼 반환
} // 함수 종료

describe("Text-Play 플랫폼 계약", () => // 플랫폼 검증 묶음
{ // 묶음 시작
    it("고정 해상도를 사용 가능한 화면 안으로 제한한다", () => // 화면 제한 검증
    { // 테스트 시작
        expect(resolveWindowSize("1920x1080", 1366, 728)).toEqual({ width: 1366, height: 728 }); // 제한 크기 확인
        expect(resolveWindowSize("1280x720", 1920, 1080)).toEqual({ width: 1280, height: 720 }); // 요청 크기 확인
    }); // 테스트 종료

    it("화면 맞춤 해상도를 최대화 동작으로 해석한다", () => // 화면 맞춤 검증
    { // 테스트 시작
        expect(resolveWindowSize("fit", 1920, 1080)).toBe("maximize"); // 최대화 값 확인
    }); // 테스트 종료

    it("홈 동작을 플랫폼 이동 계약으로 전달한다", async () => // 이동 계약 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        const platform: TextPlayPlatform = { applyWindowResolution: async () => undefined, navigate, renderSceneImage: () => null }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 홈 렌더
        await user.click(screen.getByRole("button", { name: "새 게임" })); // 새 게임 선택
        expect(navigate).toHaveBeenCalledWith("new"); // 이동 값 확인
    }); // 테스트 종료

    it("공급자 안에서 플랫폼을 제공한다", async () => // 공급자 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        const platform: TextPlayPlatform = { applyWindowResolution: async () => undefined, navigate, renderSceneImage: () => null }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><PlatformProbe /></TextPlayPlatformProvider>); // 확인기 렌더
        await user.click(screen.getByRole("button", { name: "홈 이동" })); // 홈 이동 선택
        expect(navigate).toHaveBeenCalledWith("home"); // 홈 이동 확인
    }); // 테스트 종료

    it("공급자 밖에서는 명시적 오류를 발생시킨다", () => // 공급자 누락 검증
    { // 테스트 시작
        expect(() => render(<PlatformProbe />)).toThrow("TextPlayPlatformProvider가 필요합니다."); // 오류 문구 확인
    }); // 테스트 종료
}); // 묶음 종료
