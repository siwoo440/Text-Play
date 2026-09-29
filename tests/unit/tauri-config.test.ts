import { readFileSync } from "node:fs"; // 파일 읽기 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

describe("Tauri Windows 설정", () => // Tauri 설정 묶음
{ // 묶음 시작
    it("NSIS와 외부 연결 차단 CSP를 사용한다", () => // 셸 설정 검증
    { // 테스트 시작
        const config = readFileSync("src-tauri/Tauri.toml", "utf8"); // 설정 읽기
        expect(config).toContain('targets = ["nsis"]'); // NSIS 확인
        expect(config).toContain("connect-src 'none'"); // 외부 연결 차단 확인
        expect(config).toContain('type = "downloadBootstrapper"'); // WebView2 설치 방식 확인
        expect(config).toContain('devtools = false'); // 배포 개발 도구 차단 확인
    }); // 테스트 종료

    it("창 해상도 변경에 필요한 최소 권한만 추가한다", () => // 최소 권한 검증
    { // 테스트 시작
        const capability = readFileSync("src-tauri/capabilities/default.toml", "utf8"); // 권한 설정 읽기
        expect(capability).toContain('"core:window:allow-set-size"'); // 크기 권한 확인
        expect(capability).toContain('"core:window:allow-center"'); // 중앙 권한 확인
        expect(capability).toContain('"core:window:allow-maximize"'); // 최대화 권한 확인
        expect(capability).toContain('"core:window:allow-unmaximize"'); // 최대화 해제 권한 확인
        expect(capability).not.toMatch(/(?:shell|fs|http|opener):/u); // 추가 권한 부재 확인
    }); // 테스트 종료

    it("TOML 설정 기능을 Rust 의존성에 활성화한다", () => // TOML 기능 검증
    { // 테스트 시작
        const manifest = readFileSync("src-tauri/Cargo.toml", "utf8"); // Rust 설정 읽기
        expect(manifest).toContain('features = ["config-toml"]'); // TOML 기능 확인
    }); // 테스트 종료
}); // 묶음 종료
