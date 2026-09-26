import type { CharacterDraft } from "@/features/core/types"; // 초안 타입

export interface CharacterValidationResult // 검증 결과
{ // 구조 시작
    valid: boolean; // 통과 여부
    errors: Partial<Record<keyof CharacterDraft, string>>; // 필드 오류
} // 구조 종료

const localCharacterImagePattern = /^\/images\/characters\/[a-z0-9-]+\.webp$/; // 로컬 이미지 규칙

export function normalizeCharacterDraft(draft: CharacterDraft): CharacterDraft // 초안 정규화
{ // 함수 시작
    return ( // 정규 초안 반환
    { // 초안 시작
        ...draft, // 기존 초안 복사
        name: draft.name.trim(), // 이름 정리
        summary: draft.summary.trim(), // 소개 정리
        description: draft.description.trim(), // 설명 정리
        personality: draft.personality.trim(), // 성격 정리
        greeting: draft.greeting.trim(), // 인사 정리
        worldSetting: draft.worldSetting.trim(), // 세계관 정리
        prompt: draft.prompt.trim(), // 프롬프트 정리
        tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))], // 태그 정리
    }); // 초안 종료
} // 함수 종료

export function validateCharacterDraft(draft: CharacterDraft): CharacterValidationResult // 초안 검증
{ // 함수 시작
    const normalized = normalizeCharacterDraft(draft); // 정규 초안
    const errors: Partial<Record<keyof CharacterDraft, string>> = {}; // 오류 목록
    if (normalized.name.length === 0) // 이름 누락 판정
    { // 조건 시작
        errors.name = "캐릭터 이름을 입력해 주세요."; // 이름 오류
    } // 조건 종료
    else if (normalized.name.length > 40) // 이름 길이 판정
    { // 조건 시작
        errors.name = "캐릭터 이름은 40자 이하여야 합니다."; // 이름 길이 오류
    } // 조건 종료
    if (normalized.summary.length === 0) // 소개 누락 판정
    { // 조건 시작
        errors.summary = "한 줄 소개를 입력해 주세요."; // 소개 오류
    } // 조건 종료
    else if (normalized.summary.length > 80) // 소개 길이 판정
    { // 조건 시작
        errors.summary = "한 줄 소개는 80자 이하여야 합니다."; // 소개 길이 오류
    } // 조건 종료
    if (normalized.personality.length === 0) // 성격 누락 판정
    { // 조건 시작
        errors.personality = "성격을 입력해 주세요."; // 성격 오류
    } // 조건 종료
    else if (normalized.personality.length > 500) // 성격 길이 판정
    { // 조건 시작
        errors.personality = "성격은 500자 이하여야 합니다."; // 성격 길이 오류
    } // 조건 종료
    if (normalized.greeting.length === 0) // 인사 누락 판정
    { // 조건 시작
        errors.greeting = "첫 인사를 입력해 주세요."; // 인사 오류
    } // 조건 종료
    else if (normalized.greeting.length > 1000) // 인사 길이 판정
    { // 조건 시작
        errors.greeting = "첫 인사는 1000자 이하여야 합니다."; // 인사 길이 오류
    } // 조건 종료
    if (normalized.description.length > 2000) // 설명 길이 판정
    { // 조건 시작
        errors.description = "상세 설명은 2000자 이하여야 합니다."; // 설명 오류
    } // 조건 종료
    if (normalized.worldSetting.length > 2000) // 세계관 길이 판정
    { // 조건 시작
        errors.worldSetting = "세계관은 2000자 이하여야 합니다."; // 세계관 오류
    } // 조건 종료
    if (normalized.prompt.length > 2000) // 프롬프트 길이 판정
    { // 조건 시작
        errors.prompt = "비공개 프롬프트는 2000자 이하여야 합니다."; // 프롬프트 오류
    } // 조건 종료
    if (normalized.tags.length > 8) // 태그 개수 판정
    { // 조건 시작
        errors.tags = "태그는 최대 8개까지 입력할 수 있습니다."; // 태그 개수 오류
    } // 조건 종료
    else if (normalized.tags.some((tag) => tag.length > 12)) // 태그 길이 판정
    { // 조건 시작
        errors.tags = "각 태그는 12자 이하여야 합니다."; // 태그 길이 오류
    } // 조건 종료
    if (!localCharacterImagePattern.test(normalized.coverImage)) // 이미지 경로 판정
    { // 조건 시작
        errors.coverImage = "프로젝트에 포함된 캐릭터 이미지를 선택해 주세요."; // 이미지 오류
    } // 조건 종료
    return { valid: Object.keys(errors).length === 0, errors }; // 검증 결과 반환
} // 함수 종료
