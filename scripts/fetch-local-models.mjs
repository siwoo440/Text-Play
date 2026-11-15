import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"; // 모델 파일 도구
import { join } from "node:path"; // 경로 결합
import { parseArgs } from "node:util"; // 실행 옵션
import { downloadFile, getLocalAiRoot, getRepositoryRoot, sha256File, upsertManifestEntry } from "./lib/local-ai-files.mjs"; // 검증된 다운로드와 평가 목록
import { LLAMA_CPP_RELEASE } from "./local-ai/local-ai-pins.mjs"; // 평가 실행 엔진 버전

async function main() // 고정 GGUF 준비
{ // 함수 시작
    const options = parseArgs({ options: { models: { type: "string", default: "midm-2.0-mini" }, "dry-run": { type: "boolean", default: false } } }).values; // 선택 모델과 계획 보기
    const catalog = JSON.parse(readFileSync(join(getRepositoryRoot(), "src-tauri/resources/model-catalog.json"), "utf8")); // 앱과 같은 다운로드 계약
    const requested = [...new Set(options.models.split(","))]; // 중복 없는 모델 식별자
    const selected = requested.map((id) => // 모델 계획 생성
    { // 변환 시작
        const model = catalog.models.find((entry) => entry.id === id); // 목록에서 모델 확인
        if (model === undefined) // 등록 여부 확인
        { // 조건 시작
            throw new Error(`알 수 없는 모델: ${id}`); // 다운로드 전 입력 오류
        } // 조건 종료
        if (!model.download || !/^[a-f0-9]{64}$/u.test(model.download.sha256) || !/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[a-f0-9]{40}\/[^?]+\.gguf$/u.test(model.download.url) || !/^[a-zA-Z0-9._-]+\.gguf$/u.test(model.file)) // 고정 배포 계약 확인
        { // 조건 시작
            throw new Error(`고정 다운로드 정보가 없는 모델: ${id}`); // 불완전한 계약 거부
        } // 조건 종료
        return model; // 검사된 모델 반환
    }); // 변환 종료
    const directory = join(getLocalAiRoot(), "models"); // 개발용 모델 보관 위치
    for (const model of selected) // 준비 계획 출력
    { // 순회 시작
        console.log(`[models] ${model.id}: ${model.download.url} (${model.sizeBytes}바이트) → ${join(directory, model.file)}`); // 출처와 저장 위치
    } // 순회 종료
    if (options["dry-run"]) // 계획 전용 확인
    { // 조건 시작
        return; // 네트워크와 파일 변경 생략
    } // 조건 종료
    mkdirSync(directory, { recursive: true }); // 보관 폴더 생성
    for (const model of selected) // 실제 파일 준비
    { // 순회 시작
        const target = join(directory, model.file); // 대상 파일
        const valid = existsSync(target) && statSync(target).size === model.sizeBytes && await sha256File(target) === model.download.sha256; // 기존 파일 무결성
        if (!valid) // 수신 필요 확인
        { // 조건 시작
            let lastReport = 0; // 진행 안내 시각
            await downloadFile(model.download.url, target, // 이어받기와 해시 검사
            { // 다운로드 옵션 시작
                expectedSize: model.sizeBytes, // 고정 바이트 크기
                expectedSha256: model.download.sha256, // 고정 SHA256
                onProgress: (received) => // 진행 안내
                { // 안내 시작
                    if (Date.now() - lastReport >= 5_000) // 출력 간격 확인
                    { // 조건 시작
                        console.log(`[models] ${model.id}: ${(100 * received / model.sizeBytes).toFixed(1)}%`); // 현재 진행률
                        lastReport = Date.now(); // 안내 시각 갱신
                    } // 조건 종료
                }, // 안내 종료
            }); // 다운로드 옵션 종료
        } // 조건 종료
        const manifestPath = join(directory, "manifest.json"); // 기존 평가 도구의 입력
        const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { schemaVersion: 1, models: [] }; // 기존 변환 결과 보존
        const entry = { id: model.id, label: model.label, role: model.role, quantization: "Q4_K_M", file: model.file, size: model.sizeBytes, sha256: model.download.sha256, license: model.license, source: model.source, llamaCpp: LLAMA_CPP_RELEASE.tag, createdAt: new Date().toISOString() }; // 검증된 배포 결과
        writeFileSync(manifestPath, `${JSON.stringify(upsertManifestEntry(manifest, entry), null, 2)}\n`); // 평가 목록 기록
        console.log(`[models] ${model.id}: ${valid ? "기존 파일 검사" : "다운로드·해시 검사"} 완료`); // 준비 결과
    } // 순회 종료
} // 함수 종료

try // 실행과 오류 안내
{ // 실행 시작
    await main(); // 준비 실행
} // 실행 종료
catch (error) // 입력 또는 다운로드 오류
{ // 오류 시작
    console.error(`[models] ${error.message}`); // 쉬운 실패 안내
    process.exitCode = 2; // 실패 종료 코드
} // 오류 종료
