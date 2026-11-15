// @vitest-environment node
import { existsSync, readFileSync } from "node:fs"; // 배포 계약과 개발 경로 읽기
import { spawnSync } from "node:child_process"; // 준비 도구 실행
import { describe, expect, it } from "vitest"; // 검사 도구

describe("내장 AI 실제 배포 계약", () => // 다운로드 준비 검증
{ // 묶음 시작
    it("세 모델 모두 고정 리비전·해시·정확한 크기로 받을 수 있다", () => // 빈 다운로드 회귀 방지
    { // 검사 시작
        const catalog = JSON.parse(readFileSync("src-tauri/resources/model-catalog.json", "utf8")); // 실제 배포 목록
        expect(catalog.models).toHaveLength(3); // 세 사양 유지
        for (const model of catalog.models) // 모델별 계약
        { // 순회 시작
            expect(model.download, model.id).toBeTruthy(); // 준비된 받기 정보
            expect(model.download.url, model.id).toMatch(/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[a-f0-9]{40}\/[^?]+\.gguf$/u); // 변경되지 않는 파일 주소
            expect(model.download.sha256, model.id).toMatch(/^[a-f0-9]{64}$/u); // 파일 무결성 계약
            expect(model.sizeBytes, model.id).toBeGreaterThan(1_000_000_000); // 대용량 실제 모델
            expect(model.source?.baseModel, model.id).toMatch(/^https:\/\/huggingface\.co\//u); // 원본 모델 출처
            expect(model.source?.publisher, model.id).toBeTruthy(); // GGUF 배포자 표시
        } // 순회 종료
    }); // 검사 종료

    it("새 설치 파일에 실행 엔진과 라이선스 자산을 포함한다", () => // 새 PC 실행 회귀 방지
    { // 검사 시작
        const config = readFileSync("src-tauri/Tauri.toml", "utf8"); // 실제 설치 설정
        expect(config).toContain("local-ai:bundle"); // 빌드 전 실행 엔진 준비
        expect(config).toContain('beforeDevCommand = "pnpm local-ai:bundle && pnpm desktop:dev"'); // 개발 실행도 엔진 준비
        expect(config).toContain('"resources/llama-runtime/" = "llama-runtime/"'); // 실행 엔진 설치 위치
        expect(config).toContain('"resources/licenses/" = "licenses/"'); // 모델과 엔진 고지 포함
    }); // 검사 종료

    it("실제 다운로드 없이 고른 모델의 고정 준비 계획을 확인한다", () => // 준비 도구 계약
    { // 검사 시작
        const run = spawnSync(process.execPath, ["scripts/fetch-local-models.mjs", "--models", "midm-2.0-mini", "--dry-run"], { encoding: "utf8" }); // 로컬 계획 실행
        expect(run.status, run.stderr).toBe(0); // 정상 계획
        expect(run.stdout).toContain("152690816d5f03763fa32869c651c99a6d7c300f"); // 고정 배포 리비전
        expect(run.stdout).not.toContain("Qwen3.5-9B"); // 선택한 모델만 준비
    }); // 검사 종료

    it("잘못된 모델 이름을 다운로드 전에 거부한다", () => // 입력 오류 계약
    { // 검사 시작
        const run = spawnSync(process.execPath, ["scripts/fetch-local-models.mjs", "--models", "unknown", "--dry-run"], { encoding: "utf8" }); // 잘못된 계획
        expect(run.status).toBe(2); // 명확한 입력 오류
        expect(run.stderr).toContain("알 수 없는 모델"); // 쉬운 오류 안내
    }); // 검사 종료

    it("새 복제본에도 개발·Rust 검증에 필요한 리소스 폴더를 남긴다", () => // 독립 검토의 새 복제본 회귀
    { // 검사 시작
        const marker = "src-tauri/resources/llama-runtime/.gitkeep"; // 바이너리 없는 개발용 경로
        expect(existsSync(marker)).toBe(true); // 새 복제본의 경로 보존
        expect(spawnSync("git", ["check-ignore", "-q", marker]).status).toBe(1); // 경로 표시 파일은 Git에 포함
    }); // 검사 종료
}); // 묶음 종료
