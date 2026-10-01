import { existsSync, statSync } from "node:fs"; // 파일 검사 도구
import path from "node:path"; // 경로 도구
import { describe, expect, it } from "vitest"; // 테스트 도구

const characterIds = ["rian", "harin", "sera", "kyle", "noah", "miel", "yuna"] as const; // 주요 캐릭터 식별자

describe("캐릭터 상세 이미지 자산", () => // 이미지 자산 묶음
{ // 묶음 시작
    it.each(characterIds)("%s 프롤로그 이미지가 실제 파일로 존재한다", (characterId) => // 캐릭터별 자산 검증
    { // 검증 시작
        const assetPath = path.join(process.cwd(), "public", "images", "characters", "prologues", `${characterId}-prologue-v1.png`); // 이미지 절대 경로
        expect(existsSync(assetPath)).toBe(true); // 파일 존재 확인
        expect(existsSync(assetPath) ? statSync(assetPath).size : 0).toBeGreaterThan(0); // 파일 크기 확인
    }); // 검증 종료
}); // 묶음 종료
