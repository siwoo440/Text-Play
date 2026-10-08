import { afterEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { getErrorScreenPalette, readStoredTheme, THEME_STORAGE_KEY } from "@chatbot/lib/theme/stored-theme"; // 저장 테마

function luminance(hex: string): number // 상대 밝기
{ // 함수 시작
    const channel = (index: number) => { const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255; return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }; // 채널 변환
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5); // 밝기 반환
} // 함수 종료

function contrast(first: string, second: string): number // 대비
{ // 함수 시작
    const [light, dark] = [luminance(first), luminance(second)].sort((left, right) => right - left); // 밝은 쪽·어두운 쪽
    return (light + 0.05) / (dark + 0.05); // 대비 반환
} // 함수 종료

describe("저장된 테마", () => // 테마 묶음
{ // 묶음 시작
    afterEach(() => // 정리
    { // 정리 시작
        localStorage.clear(); // 저장 지우기
        vi.restoreAllMocks(); // 대역 복원
    }); // 정리 종료

    it("저장된 값이 dark일 때만 다크로 읽고, 없거나 읽지 못하면 밝게 본다", () => // 읽기 검증
    { // 검증 시작
        expect(readStoredTheme()).toBe("light"); // 저장 없음
        localStorage.setItem(THEME_STORAGE_KEY, "dark"); // 다크 저장
        expect(readStoredTheme()).toBe("dark"); // 다크
        localStorage.setItem(THEME_STORAGE_KEY, "이상한 값"); // 알 수 없는 값
        expect(readStoredTheme()).toBe("light"); // 밝게
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("차단"); }); // 저장소 차단
        expect(readStoredTheme()).toBe("light"); // 읽기 실패도 밝게
    }); // 검증 종료

    it("비상 오류 화면 색은 밝게·어둡게 모두 글자가 잘 읽힌다", () => // 색 검증
    { // 검증 시작
        for (const theme of ["light", "dark"] as const) // 테마 순회
        { // 순회 시작
            const palette = getErrorScreenPalette(theme); // 색
            expect(contrast(palette.ink, palette.surface)).toBeGreaterThanOrEqual(7); // 제목
            expect(contrast(palette.muted, palette.surface)).toBeGreaterThanOrEqual(4.5); // 설명
            expect(contrast(palette.actionInk, palette.actionSurface)).toBeGreaterThanOrEqual(4.5); // 보조 버튼
            expect(contrast(palette.primaryInk, palette.primary)).toBeGreaterThanOrEqual(4.5); // 주 버튼
        } // 순회 종료
        expect(getErrorScreenPalette("dark").canvas).not.toBe(getErrorScreenPalette("light").canvas); // 바탕이 다름
        expect(getErrorScreenPalette("dark").scheme).toBe("dark"); // 입력 요소 색
    }); // 검증 종료
}); // 묶음 종료
