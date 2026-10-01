// 내장 로컬 AI 작업 파일 도구: 작업 폴더 경로, 해시 계산, 이어받기 다운로드, 모델 목록 파일
import { createHash } from "node:crypto"; // 해시 도구
import { createReadStream, createWriteStream, existsSync, renameSync, rmSync, statSync } from "node:fs"; // 파일 시스템 도구
import { dirname, join, resolve } from "node:path"; // 경로 도구
import { Readable, Transform } from "node:stream"; // 스트림 도구
import { pipeline } from "node:stream/promises"; // 스트림 연결 도구
import { fileURLToPath } from "node:url"; // 주소 경로 변환

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."); // 저장소 최상위 폴더

export function getRepositoryRoot() // 저장소 최상위 폴더
{ // 함수 시작
    return REPOSITORY_ROOT; // 폴더 반환
} // 함수 종료

export function getLocalAiRoot() // 로컬 AI 작업 폴더(.gitignore 대상)
{ // 함수 시작
    return join(REPOSITORY_ROOT, ".local-ai"); // 작업 폴더 반환
} // 함수 종료

export function getHfResolveUrl(repo, revision, path) // 허깅페이스 고정 리비전 파일 주소
{ // 함수 시작
    return `https://huggingface.co/${repo}/resolve/${revision}/${path.split("/").map(encodeURIComponent).join("/")}`; // 파일 주소 반환
} // 함수 종료

export function getHfTreeUrl(repo, revision) // 허깅페이스 고정 리비전 파일 목록 주소
{ // 함수 시작
    return `https://huggingface.co/api/models/${repo}/tree/${revision}`; // 목록 주소 반환
} // 함수 종료

export function getSourceDir(root, repo, revision) // 공식 가중치 저장 폴더
{ // 함수 시작
    return join(root, "sources", repo.replace("/", "__"), revision); // 원본 폴더 반환
} // 함수 종료

export function getRuntimeDir(root, tag, variant) // 실행 엔진 풀 폴더
{ // 함수 시작
    return join(root, "runtime", tag, variant); // 실행 엔진 폴더 반환
} // 함수 종료

export function getModelFileName(modelId, quantization) // 모델 파일 이름
{ // 함수 시작
    return `${modelId}-${quantization}.gguf`; // 파일 이름 반환
} // 함수 종료

async function hashFile(path, algorithm, prefix) // 파일 해시 계산
{ // 함수 시작
    const hash = createHash(algorithm); // 해시 준비
    if (prefix !== undefined) // 머리 내용 확인
    { // 조건 시작
        hash.update(prefix); // 머리 내용 반영
    } // 조건 종료
    for await (const chunk of createReadStream(path)) // 파일 조각 순회
    { // 반복 시작
        hash.update(chunk); // 조각 반영
    } // 반복 종료
    return hash.digest("hex"); // 해시 반환
} // 함수 종료

export function sha256File(path) // 파일 SHA-256
{ // 함수 시작
    return hashFile(path, "sha256"); // SHA-256 반환
} // 함수 종료

export function gitBlobSha1File(path) // git 블롭 SHA-1(허깅페이스 일반 파일 식별자)
{ // 함수 시작
    return hashFile(path, "sha1", `blob ${statSync(path).size}\0`); // 블롭 해시 반환
} // 함수 종료

function createProgressCounter(onProgress, startBytes) // 받은 크기 알림 변환기
{ // 함수 시작
    let received = startBytes; // 누적 크기
    return new Transform( // 변환기 반환
    { // 설정 시작
        transform(chunk, _encoding, callback) // 조각 처리
        { // 처리 시작
            received += chunk.length; // 크기 누적
            onProgress?.(received); // 진행률 알림
            callback(null, chunk); // 조각 전달
        }, // 처리 종료
    }); // 설정 종료
} // 함수 종료

async function downloadOnce(url, part, expectedSize, onProgress) // 한 번 받기(이어받기 포함)
{ // 함수 시작
    let offset = existsSync(part) ? statSync(part).size : 0; // 이미 받은 크기
    if (expectedSize !== undefined && offset > expectedSize) // 크기 초과 확인
    { // 조건 시작
        rmSync(part); // 잘못된 임시 파일 삭제
        offset = 0; // 처음부터
    } // 조건 종료
    if (expectedSize !== undefined && offset === expectedSize) // 다 받은 상태 확인
    { // 조건 시작
        return; // 받기 생략
    } // 조건 종료
    const response = await fetch(url, { headers: offset > 0 ? { Range: `bytes=${offset}-` } : {}, redirect: "follow" }); // 요청 전송
    if (response.status !== 200 && response.status !== 206) // 응답 상태 확인
    { // 조건 시작
        throw new Error(`받기 실패 ${response.status}: ${url}`); // 상태 오류
    } // 조건 종료
    const resume = offset > 0 && response.status === 206; // 이어받기 여부
    await pipeline(Readable.fromWeb(response.body), createProgressCounter(onProgress, resume ? offset : 0), createWriteStream(part, { flags: resume ? "a" : "w" })); // 파일 기록
} // 함수 종료

export async function downloadFile(url, target, options = {}) // 이어받기·크기·SHA-256 검사 다운로드
{ // 함수 시작
    const { expectedSize, expectedSha256, onProgress, attempts = 5 } = options; // 받기 설정
    const part = `${target}.part`; // 임시 파일
    let lastError = null; // 마지막 오류
    for (let attempt = 1; attempt <= attempts; attempt += 1) // 재시도 순회
    { // 반복 시작
        try // 받기 시도
        { // 시도 시작
            await downloadOnce(url, part, expectedSize, onProgress); // 받기 실행
            lastError = null; // 오류 초기화
            break; // 성공 종료
        } // 시도 종료
        catch (error) // 받기 오류 처리
        { // 오류 시작
            lastError = error; // 오류 보관
        } // 오류 종료
    } // 반복 종료
    if (lastError !== null) // 최종 실패 확인
    { // 조건 시작
        throw lastError; // 오류 전달
    } // 조건 종료
    if (expectedSize !== undefined && statSync(part).size !== expectedSize) // 크기 확인
    { // 조건 시작
        rmSync(part); // 잘못된 파일 삭제
        throw new Error(`크기 불일치: ${target}`); // 크기 오류
    } // 조건 종료
    if (expectedSha256 !== undefined) // 해시 검사 확인
    { // 조건 시작
        const actual = await sha256File(part); // 실제 해시
        if (actual !== expectedSha256) // 해시 비교
        { // 조건 시작
            rmSync(part); // 잘못된 파일 삭제
            throw new Error(`SHA-256 불일치: ${target} (${actual})`); // 해시 오류
        } // 조건 종료
    } // 조건 종료
    renameSync(part, target); // 최종 파일로 이동
} // 함수 종료

function compareEntries(left, right) // 목록 정렬 기준
{ // 함수 시작
    return `${left.id}/${left.quantization}`.localeCompare(`${right.id}/${right.quantization}`); // 이름순 비교
} // 함수 종료

export function upsertManifestEntry(manifest, entry) // 모델 목록 항목 추가·교체
{ // 함수 시작
    const others = manifest.models.filter((model) => model.id !== entry.id || model.quantization !== entry.quantization); // 다른 항목
    return { ...manifest, models: [...others, entry].sort(compareEntries) }; // 정렬 목록 반환
} // 함수 종료

export function findManifestModel(manifest, id, quantization) // 모델 목록 항목 조회
{ // 함수 시작
    return manifest.models.find((model) => model.id === id && model.quantization === quantization) ?? null; // 일치 항목 반환
} // 함수 종료
