import { describe, expect, it } from "vitest"; // 테스트 도구
import type { UserConfig } from "vite"; // Vite 설정 타입

describe("데스크톱 빌드 설정", () => // 빌드 설정 묶음
{ // 묶음 시작
    it("데스크톱 빌드는 상대 자산과 전용 출력 폴더를 사용한다", async () => // 빌드 설정 검증
    { // 테스트 시작
        const configModule = await import("../../vite.desktop.config"); // 설정 모듈 조회
        const config = configModule.default as UserConfig; // 설정 객체 변환
        expect(config.base).toBe("./"); // 상대 경로 확인
        expect(config.build?.outDir).toContain("desktop-dist"); // 출력 폴더 확인
        expect(config.root).toContain("desktop"); // 전용 HTML 루트 확인
    }); // 테스트 종료
}); // 묶음 종료
