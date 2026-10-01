import { describe, expect, it } from "vitest"; // 테스트 도구
import { LLAMA_CPP_RELEASE, LLAMA_RUNTIME_ASSETS, LOCAL_MODEL_SOURCES, getRuntimeAssetUrl } from "../../scripts/local-ai/local-ai-pins.mjs"; // 고정 버전 목록

const SHA256 = /^[0-9a-f]{64}$/u; // SHA-256 형식
const COMMIT = /^[0-9a-f]{40}$/u; // 커밋 형식

describe("내장 로컬 AI 고정 버전", () => // 고정 버전 묶음
{ // 묶음 시작
    it("llama.cpp 안정판 v0.5.0과 같은 빌드 b11146을 고정한다", () => // 실행 엔진 버전 검증
    { // 테스트 시작
        expect(LLAMA_CPP_RELEASE).toEqual({ tag: "b11146", version: "v0.5.0", commit: "7fe450e19305b828c199d602c23a8337aaa1f03b" }); // 버전 확인
    }); // 테스트 종료

    it("Windows Vulkan·CPU 빌드만 SHA-256과 함께 고정한다", () => // 실행 엔진 파일 검증
    { // 테스트 시작
        expect(LLAMA_RUNTIME_ASSETS.map((asset) => asset.variant)).toEqual(["vulkan", "cpu"]); // 빌드 종류 확인
        for (const asset of LLAMA_RUNTIME_ASSETS) // 파일 순회
        { // 순회 시작
            expect(asset.file).toBe(`llama-b11146-bin-win-${asset.variant}-x64.zip`); // 파일 이름 확인
            expect(asset.sha256).toMatch(SHA256); // 해시 형식 확인
            expect(asset.size).toBeGreaterThan(1_000_000); // 크기 확인
            expect(getRuntimeAssetUrl(asset)).toBe(`https://github.com/ggml-org/llama.cpp/releases/download/b11146/${asset.file}`); // 주소 확인
        } // 순회 종료
    }); // 테스트 종료

    it("가벼움·가벼움 대체·표준·고성능 공식 가중치를 리비전까지 고정한다", () => // 모델 원본 검증
    { // 테스트 시작
        expect(LOCAL_MODEL_SOURCES.map((model) => [model.id, model.role, model.repo])).toEqual( // 모델 목록 확인
        [ // 기대 목록 시작
            ["midm-2.0-mini", "light", "K-intelligence/Midm-2.0-Mini-Instruct"], // 가벼움
            ["qwen3.5-2b", "light-alternative", "Qwen/Qwen3.5-2B"], // 가벼움 대체
            ["qwen3.5-4b", "standard", "Qwen/Qwen3.5-4B"], // 표준
            ["qwen3.5-9b", "high", "Qwen/Qwen3.5-9B"], // 고성능
        ]); // 기대 목록 종료
        for (const model of LOCAL_MODEL_SOURCES) // 모델 순회
        { // 순회 시작
            expect(model.revision).toMatch(COMMIT); // 리비전 형식 확인
            expect(["MIT", "Apache-2.0"]).toContain(model.license); // 상업 사용 가능 라이선스 확인
            expect(model.quantizations.length).toBeGreaterThan(0); // 양자화 목록 확인
            expect(model.quantizations.every((quantization) => ["Q4_K_M", "Q5_K_M", "Q8_0"].includes(quantization))).toBe(true); // 지원 양자화 확인
            expect(model.contextLength).toBeGreaterThanOrEqual(32768); // 문맥 길이 확인
            expect(model.generation.temperature).toBeGreaterThan(0); // 온도 확인
            expect(model.generation.top_p).toBeGreaterThan(0); // top-p 확인
            expect(model.generation.top_k).toBeGreaterThan(0); // top-k 확인
        } // 순회 종료
    }); // 테스트 종료

    it("가벼운 모델은 Q4_K_M과 Q5_K_M을 비교하고 Qwen은 생각 출력을 끈다", () => // 모델별 설정 검증
    { // 테스트 시작
        const light = LOCAL_MODEL_SOURCES.find((model) => model.id === "midm-2.0-mini"); // 가벼운 모델
        expect(light?.quantizations).toEqual(["Q4_K_M", "Q5_K_M"]); // 비교 양자화 확인
        expect(light?.chatTemplateKwargs).toBeNull(); // 템플릿 인자 없음 확인
        expect(light?.generation).toEqual({ temperature: 0.8, top_p: 0.75, top_k: 20 }); // 공식 생성 설정 확인
        for (const model of LOCAL_MODEL_SOURCES.filter((candidate) => candidate.id.startsWith("qwen"))) // Qwen 순회
        { // 순회 시작
            expect(model.chatTemplateKwargs).toEqual({ enable_thinking: false }); // 생각 출력 끔 확인
            expect(model.generation).toEqual({ temperature: 0.7, top_p: 0.8, top_k: 20, min_p: 0, presence_penalty: 1.5 }); // 공식 비생각 설정 확인
        } // 순회 종료
    }); // 테스트 종료
}); // 묶음 종료
