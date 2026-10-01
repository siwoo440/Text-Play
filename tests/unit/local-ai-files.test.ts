// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from "node:http"; // 시험용 HTTP 서버
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"; // 파일 시스템 도구
import type { AddressInfo } from "node:net"; // 서버 주소 형식
import { tmpdir } from "node:os"; // 임시 폴더 도구
import { join, resolve } from "node:path"; // 경로 도구
import { afterEach, describe, expect, it } from "vitest"; // 테스트 도구
import { downloadFile, findManifestModel, getHfResolveUrl, getHfTreeUrl, getLocalAiRoot, getModelFileName, getRuntimeDir, getSourceDir, gitBlobSha1File, sha256File, upsertManifestEntry } from "../../scripts/lib/local-ai-files.mjs"; // 로컬 AI 파일 도구

const HELLO_SHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"; // "hello" SHA-256
const BODY = Buffer.from("0123456789abcdefghij"); // 시험 파일 내용
const WRONG_SHA256 = "0".repeat(64); // 일부러 틀린 해시
let server: Server | null = null; // 실행 중 서버

function createTempDir(): string // 임시 폴더 생성
{ // 함수 시작
    return mkdtempSync(join(tmpdir(), "local-ai-files-")); // 폴더 반환
} // 함수 종료

async function startServer(options: { ignoreRange?: boolean } = {}): Promise<{ url: string; requests: IncomingMessage[] }> // 시험 서버 시작
{ // 함수 시작
    const requests: IncomingMessage[] = []; // 받은 요청 기록
    server = createServer((request, response) => // 요청 처리기
    { // 처리 시작
        requests.push(request); // 요청 기록
        const range = request.headers.range?.match(/^bytes=(\d+)-$/u); // 이어받기 범위
        if (range !== null && range !== undefined && options.ignoreRange !== true) // 범위 요청 확인
        { // 조건 시작
            const start = Number(range[1]); // 시작 위치
            response.writeHead(206, { "Content-Length": BODY.length - start, "Content-Range": `bytes ${start}-${BODY.length - 1}/${BODY.length}` }); // 부분 응답 머리
            response.end(BODY.subarray(start)); // 남은 내용 전송
            return; // 처리 종료
        } // 조건 종료
        response.writeHead(200, { "Content-Length": BODY.length }); // 전체 응답 머리
        response.end(BODY); // 전체 내용 전송
    }); // 처리기 종료
    await new Promise<void>((resolveListen) => server?.listen(0, "127.0.0.1", resolveListen)); // 임의 포트 대기
    const address = server.address() as AddressInfo; // 서버 주소
    return { url: `http://127.0.0.1:${address.port}/file.bin`, requests }; // 주소와 기록 반환
} // 함수 종료

afterEach(async () => // 서버 정리
{ // 정리 시작
    await new Promise<void>((resolveClose) => (server === null ? resolveClose() : server.close(() => resolveClose()))); // 서버 종료
    server = null; // 참조 제거
}); // 정리 종료

describe("로컬 AI 파일 경로와 주소", () => // 경로 묶음
{ // 묶음 시작
    it("허깅페이스 고정 리비전 주소를 만든다", () => // 주소 검증
    { // 테스트 시작
        expect(getHfResolveUrl("Qwen/Qwen3.5-4B", "851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a", "model.safetensors-00001-of-00002.safetensors")).toBe("https://huggingface.co/Qwen/Qwen3.5-4B/resolve/851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a/model.safetensors-00001-of-00002.safetensors"); // 파일 주소 확인
        expect(getHfTreeUrl("Qwen/Qwen3.5-4B", "851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a")).toBe("https://huggingface.co/api/models/Qwen/Qwen3.5-4B/tree/851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a"); // 목록 주소 확인
    }); // 테스트 종료

    it("작업 폴더 .local-ai 아래에 원본·실행 엔진·모델 경로를 정한다", () => // 경로 검증
    { // 테스트 시작
        expect(getLocalAiRoot()).toBe(resolve(".local-ai")); // 작업 폴더 확인
        expect(getSourceDir("R", "Qwen/Qwen3.5-4B", "abc")).toBe(join("R", "sources", "Qwen__Qwen3.5-4B", "abc")); // 원본 경로 확인
        expect(getRuntimeDir("R", "b11146", "vulkan")).toBe(join("R", "runtime", "b11146", "vulkan")); // 실행 엔진 경로 확인
        expect(getModelFileName("midm-2.0-mini", "Q4_K_M")).toBe("midm-2.0-mini-Q4_K_M.gguf"); // 모델 파일 이름 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("로컬 AI 파일 검사", () => // 해시 묶음
{ // 묶음 시작
    it("SHA-256과 git 블롭 SHA-1을 계산한다", async () => // 해시 계산 검증
    { // 테스트 시작
        const file = join(createTempDir(), "hello.txt"); // 시험 파일
        writeFileSync(file, "hello"); // 내용 기록
        expect(await sha256File(file)).toBe(HELLO_SHA256); // SHA-256 확인
        expect(await gitBlobSha1File(file)).toBe("b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0"); // git 블롭 해시 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("로컬 AI 파일 받기", () => // 다운로드 묶음
{ // 묶음 시작
    it("받은 뒤 해시가 맞으면 최종 파일로 옮긴다", async () => // 정상 받기 검증
    { // 테스트 시작
        const { url } = await startServer(); // 서버 시작
        const target = join(createTempDir(), "file.bin"); // 저장 위치
        const sha256 = await sha256File(writeTemp(BODY)); // 기대 해시 계산
        await downloadFile(url, target, { expectedSize: BODY.length, expectedSha256: sha256 }); // 받기 실행
        expect(readFileSync(target)).toEqual(BODY); // 내용 확인
        expect(existsSync(`${target}.part`)).toBe(false); // 임시 파일 정리 확인
    }); // 테스트 종료

    it("받다 만 파일이 있으면 남은 부분만 이어받는다", async () => // 이어받기 검증
    { // 테스트 시작
        const { url, requests } = await startServer(); // 서버 시작
        const target = join(createTempDir(), "file.bin"); // 저장 위치
        writeFileSync(`${target}.part`, BODY.subarray(0, 5)); // 받다 만 파일
        await downloadFile(url, target, { expectedSize: BODY.length, expectedSha256: await sha256File(writeTemp(BODY)) }); // 받기 실행
        expect(requests[0].headers.range).toBe("bytes=5-"); // 이어받기 요청 확인
        expect(readFileSync(target)).toEqual(BODY); // 내용 확인
    }); // 테스트 종료

    it("서버가 이어받기를 무시하면 처음부터 다시 받는다", async () => // 범위 무시 검증
    { // 테스트 시작
        const { url } = await startServer({ ignoreRange: true }); // 범위 무시 서버
        const target = join(createTempDir(), "file.bin"); // 저장 위치
        writeFileSync(`${target}.part`, BODY.subarray(0, 5)); // 받다 만 파일
        await downloadFile(url, target, { expectedSize: BODY.length }); // 받기 실행
        expect(readFileSync(target)).toEqual(BODY); // 중복 없는 내용 확인
    }); // 테스트 종료

    it("해시가 다르면 받은 파일을 지우고 실패한다", async () => // 해시 불일치 검증
    { // 테스트 시작
        const { url } = await startServer(); // 서버 시작
        const target = join(createTempDir(), "file.bin"); // 저장 위치
        await expect(downloadFile(url, target, { expectedSha256: WRONG_SHA256 })).rejects.toThrow("SHA-256"); // 실패 확인
        expect(existsSync(target)).toBe(false); // 최종 파일 없음 확인
        expect(existsSync(`${target}.part`)).toBe(false); // 임시 파일 삭제 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("로컬 모델 목록 파일", () => // 목록 묶음
{ // 묶음 시작
    it("같은 모델·양자화는 교체하고 이름순으로 정리한다", () => // 목록 갱신 검증
    { // 테스트 시작
        const first = { id: "qwen3.5-4b", quantization: "Q4_K_M", file: "qwen3.5-4b-Q4_K_M.gguf", size: 1, sha256: "a".repeat(64) }; // 첫 항목
        const second = { id: "midm-2.0-mini", quantization: "Q4_K_M", file: "midm-2.0-mini-Q4_K_M.gguf", size: 2, sha256: "b".repeat(64) }; // 둘째 항목
        const replaced = { ...first, size: 3 }; // 교체 항목
        const manifest = upsertManifestEntry(upsertManifestEntry(upsertManifestEntry({ models: [] }, first), second), replaced); // 목록 갱신
        expect(manifest.models.map((entry: { id: string; size: number }) => [entry.id, entry.size])).toEqual([["midm-2.0-mini", 2], ["qwen3.5-4b", 3]]); // 정리 결과 확인
        expect(findManifestModel(manifest, "qwen3.5-4b", "Q4_K_M")?.size).toBe(3); // 조회 확인
        expect(findManifestModel(manifest, "qwen3.5-9b", "Q4_K_M")).toBeNull(); // 없는 모델 확인
    }); // 테스트 종료
}); // 묶음 종료

function writeTemp(content: Buffer): string // 임시 파일 기록
{ // 함수 시작
    const file = join(createTempDir(), "expected.bin"); // 파일 경로
    writeFileSync(file, content); // 내용 기록
    return file; // 경로 반환
} // 함수 종료
