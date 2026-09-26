import { describe, expect, it } from "vitest"; // 테스트 도구
import { createJsonDownload } from "@/features/settings/data-download"; // 다운로드 생성 함수

describe("JSON 다운로드", () => // 다운로드 묶음
{ // 묶음 시작
    it("JSON 파일 다운로드 정보를 생성한다", () => // 다운로드 검증
    { // 테스트 시작
        const result = createJsonDownload("mateverse-backup.json", "{\"ok\":true}"); // 다운로드 생성
        expect(result.filename).toBe("mateverse-backup.json"); // 파일명 확인
        expect(result.blob.type).toBe("application/json;charset=utf-8"); // 형식 확인
    }); // 테스트 종료
}); // 묶음 종료
