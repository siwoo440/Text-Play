import { readFileSync } from "node:fs"; // 파일 읽기 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

describe("Windows 미리보기 패키징", () => // 패키징 검증 묶음
{ // 묶음 시작
    it("검증 후 고정 이름 EXE와 SHA-256 파일을 만든다", () => // 스크립트 계약 검증
    { // 테스트 시작
        const script = readFileSync("scripts/build-windows-preview.ps1", "utf8"); // 스크립트 읽기
        const finalizer = readFileSync("scripts/finalize-windows-preview.mjs", "utf8"); // 후처리 읽기
        expect(script).toContain("pnpm test:run"); // 전체 테스트 확인
        expect(script).toContain("pnpm test:e2e:desktop"); // 데스크톱 E2E 확인
        expect(script).toContain("pnpm tauri:build"); // Tauri 빌드 확인
        expect(script).toContain("finalize-windows-preview.mjs"); // 후처리 실행 확인
        expect(finalizer).toContain("MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe"); // 고정 파일명 확인
        expect(finalizer).toContain('createHash("sha256")'); // 해시 생성 확인
    }); // 테스트 종료

    it("시험판 설치 제한과 검증 방법을 안내한다", () => // 배포 문서 계약 검증
    { // 테스트 시작
        const releaseNotes = readFileSync("docs/releases/v0.1.0-preview.1.md", "utf8"); // 배포 문서 읽기
        expect(releaseNotes).toContain("Windows 10·11 x64"); // 운영체제 확인
        expect(releaseNotes).toContain("Mock"); // Mock 제한 확인
        expect(releaseNotes).toContain("SmartScreen"); // 서명 경고 확인
        expect(releaseNotes).toContain("WebView2"); // 런타임 요구사항 확인
        expect(releaseNotes).toContain("SHA-256"); // 무결성 안내 확인
    }); // 테스트 종료
}); // 묶음 종료
