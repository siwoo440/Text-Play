export interface JsonDownload // 다운로드 정보 구조
{ // 구조 시작
    filename: string; // 파일 이름
    blob: Blob; // 파일 내용
} // 구조 종료

export function createJsonDownload(filename: string, content: string): JsonDownload // 다운로드 생성 함수
{ // 함수 시작
    return { filename, blob: new Blob([content], { type: "application/json;charset=utf-8" }) }; // 다운로드 정보 반환
} // 함수 종료

export function downloadJsonFile(filename: string, content: string): void // 파일 다운로드 함수
{ // 함수 시작
    const download = createJsonDownload(filename, content); // 다운로드 생성
    const url = URL.createObjectURL(download.blob); // 임시 주소 생성
    const anchor = document.createElement("a"); // 링크 요소 생성
    anchor.href = url; // 링크 주소 지정
    anchor.download = download.filename; // 파일 이름 지정
    anchor.click(); // 다운로드 실행
    URL.revokeObjectURL(url); // 임시 주소 해제
} // 함수 종료
