import { describe, expect, it } from "vitest"; // 테스트 도구
import { isTextPlayDownloadAvailable, isValidDownloadUrl, textPlayRelease } from "@chatbot/features/text-play/release-config"; // 배포 설정 도구

describe("Text-Play 배포 설정", () => // 배포 설정 묶음
{ // 묶음 시작
    it("비어 있거나 위험한 다운로드 주소를 거부한다", () => // 잘못된 주소 검증
    { // 검증 시작
        expect(isValidDownloadUrl(null)).toBe(false); // 빈 주소 거부
        expect(isValidDownloadUrl("   ")).toBe(false); // 공백 주소 거부
        expect(isValidDownloadUrl("javascript:alert(1)")).toBe(false); // 스크립트 주소 거부
        expect(isValidDownloadUrl("ftp://example.com/text-play.exe")).toBe(false); // FTP 주소 거부
    }); // 검증 종료

    it("사이트 내부 주소와 HTTPS 주소를 허용한다", () => // 올바른 주소 검증
    { // 검증 시작
        expect(isValidDownloadUrl("/downloads/mate-text-play.exe")).toBe(true); // 내부 주소 허용
        expect(isValidDownloadUrl("https://example.com/mate-text-play.exe")).toBe(true); // 보안 주소 허용
    }); // 검증 종료

    it("현재 배포 정보에서는 다운로드를 비활성화한다", () => // 현재 상태 검증
    { // 검증 시작
        expect(textPlayRelease.downloadUrl).toBeNull(); // 현재 주소 확인
        expect(isTextPlayDownloadAvailable(textPlayRelease)).toBe(false); // 현재 비활성 확인
    }); // 검증 종료

    it("실제 다운로드 주소가 설정되면 다운로드를 활성화한다", () => // 활성 상태 검증
    { // 검증 시작
        const release = // 실제 주소 설정
        { // 설정 시작
            ...textPlayRelease, // 기본 배포 정보
            downloadUrl: "/downloads/mate-text-play.exe", // 다운로드 주소
        }; // 설정 종료
        expect(isTextPlayDownloadAvailable(release)).toBe(true); // 활성 상태 확인
    }); // 검증 종료
}); // 묶음 종료
