import { describe, expect, it } from "vitest"; // 테스트 도구
import { normalizeCharacterDraft, validateCharacterDraft } from "@/features/character/character-validation"; // 검증 대상
import { validCharacterDraft } from "@/mocks/fixtures"; // 정상 초안

describe("캐릭터 입력 검증", () => // 검증 묶음
{ // 묶음 시작
    it("필수값과 길이 오류를 한 번에 반환한다", () => // 다중 오류 검증
    { // 검증 시작
        const result = validateCharacterDraft({ ...validCharacterDraft, name: " ", summary: "가".repeat(81), personality: "", greeting: "" }); // 잘못된 입력 검증
        expect(result.errors).toEqual( // 오류 목록 확인
        { // 예상 시작
            name: "캐릭터 이름을 입력해 주세요.", // 이름 오류
            summary: "한 줄 소개는 80자 이하여야 합니다.", // 소개 오류
            personality: "성격을 입력해 주세요.", // 성격 오류
            greeting: "첫 인사를 입력해 주세요.", // 인사 오류
            coverImage: "프로젝트에 포함된 캐릭터 이미지를 선택해 주세요.", // 이미지 오류
        }); // 예상 종료
    }); // 검증 종료

    it("태그 공백과 중복을 제거한다", () => // 태그 정규화 검증
    { // 검증 시작
        const normalized = normalizeCharacterDraft({ ...validCharacterDraft, tags: [" 힐링 ", "힐링", " 여행 "] }); // 초안 정규화
        expect(normalized.tags).toEqual(["힐링", "여행"]); // 정규 태그 확인
    }); // 검증 종료

    it("태그 개수와 각 태그 길이를 제한한다", () => // 태그 경계 검증
    { // 검증 시작
        const tooMany = Array.from({ length: 9 }, (_, index) => `태그${index}`); // 초과 태그 준비
        const countResult = validateCharacterDraft({ ...validCharacterDraft, tags: tooMany }); // 개수 검증
        const lengthResult = validateCharacterDraft({ ...validCharacterDraft, tags: ["가".repeat(13)] }); // 길이 검증
        expect(countResult.errors.tags).toBe("태그는 최대 8개까지 입력할 수 있습니다."); // 개수 오류 확인
        expect(lengthResult.errors.tags).toBe("각 태그는 12자 이하여야 합니다."); // 길이 오류 확인
    }); // 검증 종료

    it("정상 입력과 허용된 로컬 이미지를 통과시킨다", () => // 정상 입력 검증
    { // 검증 시작
        const result = validateCharacterDraft({ ...validCharacterDraft, coverImage: "/images/characters/rian.webp" }); // 정상 초안 검증
        expect(result).toEqual({ valid: true, errors: {} }); // 통과 결과 확인
    }); // 검증 종료
}); // 묶음 종료
