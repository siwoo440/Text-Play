export type TextPlayDistributionStatus = "preparing" | "beta" | "stable"; // 배포 상태 종류

export interface TextPlayRelease // 배포 정보 구조
{ // 구조 시작
    status: TextPlayDistributionStatus; // 배포 상태
    version: string | null; // 프로그램 버전
    channel: string | null; // 배포 채널
    downloadUrl: string | null; // 다운로드 주소
    fileName: string | null; // 설치 파일명
    fileType: string | null; // 설치 파일 형식
    fileSize: string | null; // 설치 파일 크기
    sha256: string | null; // 파일 해시
    signatureStatus: string | null; // 코드 서명 상태
    publishedAt: string | null; // 게시일
    supportedWindows: readonly string[]; // 지원 윈도우
    minimumRequirements: readonly string[]; // 최소 요구사항
} // 구조 종료

export const textPlayRelease: TextPlayRelease = // 현재 배포 정보
{ // 설정 시작
    status: "preparing", // 준비 상태
    version: null, // 버전 미확정
    channel: null, // 채널 미확정
    downloadUrl: null, // 주소 미확정
    fileName: null, // 파일명 미확정
    fileType: null, // 형식 미확정
    fileSize: null, // 크기 미확정
    sha256: null, // 해시 미확정
    signatureStatus: null, // 서명 미확정
    publishedAt: null, // 게시일 미확정
    supportedWindows: ["확인 필요"], // 지원 버전 미확정
    minimumRequirements: ["확인 필요"], // 요구사항 미확정
}; // 설정 종료

export function isValidDownloadUrl(downloadUrl: string | null): boolean // 주소 유효성 검사
{ // 함수 시작
    if (downloadUrl === null || downloadUrl.trim() === "") // 빈 주소 검사
    { // 조건 시작
        return false; // 비활성 반환
    } // 조건 종료
    const normalizedUrl = downloadUrl.trim(); // 공백 정리
    if (normalizedUrl.startsWith("/") && !normalizedUrl.startsWith("//")) // 내부 주소 검사
    { // 조건 시작
        return true; // 내부 주소 허용
    } // 조건 종료
    try // 외부 주소 검사
    { // 검사 시작
        const parsedUrl = new URL(normalizedUrl); // 주소 분석
        return parsedUrl.protocol === "https:"; // 보안 주소만 허용
    } // 검사 종료
    catch // 분석 실패 처리
    { // 실패 시작
        return false; // 잘못된 주소 거부
    } // 실패 종료
} // 함수 종료

export function isTextPlayDownloadAvailable(release: TextPlayRelease): boolean // 다운로드 가능 판정
{ // 함수 시작
    return isValidDownloadUrl(release.downloadUrl); // 주소 기준 반환
} // 함수 종료

export function displayReleaseValue(value: string | null): string // 배포 값 표시
{ // 함수 시작
    return value === null || value.trim() === "" ? "확인 필요" : value; // 미확정 대체
} // 함수 종료

export function getDistributionLabel(status: TextPlayDistributionStatus): string // 배포 상태 표시
{ // 함수 시작
    if (status === "stable") // 정식 상태 검사
    { // 조건 시작
        return "정식 배포"; // 정식 문구
    } // 조건 종료
    if (status === "beta") // 베타 상태 검사
    { // 조건 시작
        return "베타 배포"; // 베타 문구
    } // 조건 종료
    return "다운로드 준비 중"; // 준비 문구
} // 함수 종료
