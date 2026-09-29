import { createHash } from "node:crypto"; // 해시 생성 도구
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"; // 파일 처리 도구
import { resolve } from "node:path"; // 절대 경로 도구

const repositoryRootPath = process.cwd(); // 저장소 루트 경로
const sourceInstallerPath = resolve(repositoryRootPath, "src-tauri", "target", "release", "bundle", "nsis", "MATE Text-Play Preview_0.1.0-preview.1_x64-setup.exe"); // NSIS 설치 파일 경로
const artifactDirectoryPath = resolve(repositoryRootPath, "artifacts"); // 배포 자산 폴더
const artifactFileName = "MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe"; // 고정 설치 파일명
const artifactPath = resolve(artifactDirectoryPath, artifactFileName); // 배포 설치 파일 경로
const checksumPath = `${artifactPath}.sha256`; // 체크섬 파일 경로

if (!existsSync(sourceInstallerPath)) // NSIS 설치 파일 확인
{ // 조건 시작
    throw new Error(`NSIS 설치 파일을 찾지 못했습니다: ${sourceInstallerPath}`); // 설치 파일 누락 오류
} // 조건 종료

mkdirSync(artifactDirectoryPath, // 배포 폴더 생성
{ // 설정 시작
    recursive: true, // 하위 폴더 허용
}); // 설정 종료
copyFileSync(sourceInstallerPath, artifactPath); // 설치 파일 복사
const artifactBytes = readFileSync(artifactPath); // 설치 파일 바이트
const checksum = createHash("sha256").update(artifactBytes).digest("hex"); // SHA256 해시 계산
writeFileSync(checksumPath, `${checksum}  ${artifactFileName}\n`, "ascii"); // 체크섬 파일 저장
const artifactInfo = statSync(artifactPath); // 설치 파일 정보
const artifactSizeMegabytes = Math.round((artifactInfo.size / (1024 * 1024)) * 100) / 100; // 설치 파일 크기

console.log(`[windows-preview] 파일: ${artifactFileName}`); // 파일명 출력
console.log(`[windows-preview] 크기: ${artifactSizeMegabytes} MB (${artifactInfo.size} bytes)`); // 파일 크기 출력
console.log(`[windows-preview] SHA-256: ${checksum}`); // 해시 출력
console.log(`ARTIFACT_PATH=${artifactPath}`); // 자동화 경로 출력
console.log(`CHECKSUM_PATH=${checksumPath}`); // 체크섬 경로 출력
