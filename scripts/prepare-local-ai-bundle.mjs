import { execFileSync } from "node:child_process"; // 고정 실행 엔진 준비
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"; // 설치 자산 도구
import { join } from "node:path"; // 경로 결합
import { getLocalAiRoot, getRepositoryRoot, getRuntimeDir } from "./lib/local-ai-files.mjs"; // 작업 경로
import { LLAMA_CPP_RELEASE } from "./local-ai/local-ai-pins.mjs"; // 고정 엔진 정보

execFileSync(process.execPath, [join(getRepositoryRoot(), "scripts/fetch-llama-runtime.mjs")], { stdio: "inherit", windowsHide: true }); // 해시 검사된 두 실행 방식 준비
const resources = join(getRepositoryRoot(), "src-tauri/resources"); // 설치 자산 루트
const bundled = join(resources, "llama-runtime"); // 앱의 실행 엔진 탐색 위치
const licenses = join(resources, "licenses"); // 설치 고지 위치
mkdirSync(licenses, { recursive: true }); // 고지 폴더 생성
copyFileSync(join(resources, "model-catalog.json"), join(licenses, "model-catalog.json")); // 설치한 모델 배포 계약 보관
for (const variant of ["vulkan", "cpu"]) // 두 실행 방식
{ // 순회 시작
    const source = getRuntimeDir(getLocalAiRoot(), LLAMA_CPP_RELEASE.tag, variant); // 검증된 압축 해제 위치
    const target = join(bundled, variant); // 실제 설치 위치
    mkdirSync(target, { recursive: true }); // 실행 방식 폴더
    for (const file of readdirSync(source)) // 실행 파일과 의존 DLL 선택
    { // 파일 순회 시작
        if (file === "llama-server.exe" || file.endsWith(".dll")) // 서버 실행에 필요한 자산
        { // 조건 시작
            copyFileSync(join(source, file), join(target, file)); // 서버와 의존 파일 복사
        } // 조건 종료
        if (file.startsWith("LICENSE")) // 압축 파일의 저작권 고지
        { // 조건 시작
            copyFileSync(join(source, file), join(licenses, file)); // 원문 고지 보존
        } // 조건 종료
    } // 파일 순회 종료
    if (!existsSync(join(target, "llama-server.exe")) || !existsSync(join(target, "llama-server-impl.dll"))) // 필수 실행 자산 확인
    { // 조건 시작
        throw new Error(`실행 엔진 설치 자산 누락: ${variant}`); // 불완전한 설치 차단
    } // 조건 종료
} // 순회 종료
for (const file of ["llama-cpp-MIT.txt", "midm-MIT.txt", "Apache-2.0.txt", "MODEL-SOURCES.md"]) // 저장소에서 보관하는 고지
{ // 고지 순회 시작
    if (!existsSync(join(licenses, file)) || readFileSync(join(licenses, file), "utf8").trim().length === 0) // 고지 존재 확인
    { // 조건 시작
        throw new Error(`라이선스 자산 누락: ${file}`); // 고지 없는 배포 차단
    } // 조건 종료
} // 고지 순회 종료
writeFileSync(join(bundled, "version.json"), `${JSON.stringify(LLAMA_CPP_RELEASE, null, 2)}\n`); // 설치 엔진 버전 기록
console.log(`[bundle-ai] ${LLAMA_CPP_RELEASE.tag} Vulkan·CPU 서버와 라이선스 준비 완료`); // 준비 결과
