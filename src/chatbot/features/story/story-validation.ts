import { contentRatingLabels } from "@chatbot/features/adult/adult-access"; // 등급 문구
import type { AppState, Character, CharacterVisibility, ContentRating, Story, StoryCastMember } from "@chatbot/features/core/types"; // 도메인 타입
import { deriveDisplayName, getRequiredStoryRating, STORY_CAST_LIMIT, STORY_NARRATOR_LABEL } from "@chatbot/features/story/story-model"; // 스토리 도구

export interface StoryDraft // 스토리 편집 초안
{ // 구조 시작
    title: string; // 제목
    summary: string; // 한 줄 소개
    synopsis: string; // 줄거리·세계관
    opening: string; // 시작 장면 내레이션
    userRole: string; // 사용자가 맡는 역할
    cast: StoryCastMember[]; // 등장인물
    tags: string[]; // 태그
    coverImage: string; // 표지 이미지
    visibility: CharacterVisibility; // 공개 범위
    contentRating: ContentRating; // 이용 등급
} // 구조 종료

export interface StoryValidationResult // 검증 결과
{ // 구조 시작
    valid: boolean; // 통과 여부
    errors: Partial<Record<keyof StoryDraft, string>>; // 필드 오류
} // 구조 종료

export const storyCoverOptions = ["/images/scenes/moon-library.svg", "/images/scenes/rainy-classroom.svg", "/images/scenes/dawn-letter.svg"]; // 고를 수 있는 표지
const ratingOrder: Record<ContentRating, number> = { all: 0, teen: 1, mature: 2 }; // 등급 순서

export function createEmptyStoryDraft(): StoryDraft // 빈 초안
{ // 함수 시작
    return { title: "", summary: "", synopsis: "", opening: "", userRole: "", cast: [], tags: [], coverImage: storyCoverOptions[0], visibility: "private", contentRating: "all" }; // 초안 반환
} // 함수 종료

export function toStoryDraft(story: Story): StoryDraft // 기존 스토리를 초안으로
{ // 함수 시작
    return { title: story.title, summary: story.summary, synopsis: story.synopsis, opening: story.opening, userRole: story.userRole, cast: story.cast.map((member) => ({ ...member })), tags: [...story.tags], coverImage: story.coverImage, visibility: story.visibility, contentRating: story.contentRating }; // 복사 초안 반환
} // 함수 종료

export function createStoryCastMember(character: Pick<Character, "id" | "name">): StoryCastMember // 새 등장인물
{ // 함수 시작
    return { characterId: character.id, displayName: deriveDisplayName(character.name), role: "", firstLine: "" }; // 기본 등장인물 반환
} // 함수 종료

export function getStoryCandidates(state: Pick<AppState, "characters" | "profile">, showMature: boolean): Character[] // 등장인물로 고를 수 있는 캐릭터
{ // 함수 시작
    return state.characters.filter((character) => (character.creatorId === state.profile.id || (character.visibility === "public" && character.publicationStatus === "published")) && (showMature || character.contentRating !== "mature")); // 내 캐릭터·공개 캐릭터
} // 함수 종료

export function normalizeStoryDraft(draft: StoryDraft): StoryDraft // 초안 정리
{ // 함수 시작
    return ( // 정리 초안 반환
    { // 초안 시작
        ...draft, // 기존 값
        title: draft.title.trim(), // 제목 정리
        summary: draft.summary.trim(), // 소개 정리
        synopsis: draft.synopsis.trim(), // 줄거리 정리
        opening: draft.opening.trim(), // 시작 장면 정리
        userRole: draft.userRole.trim(), // 역할 정리
        cast: draft.cast.map((member) => ({ ...member, displayName: member.displayName.trim(), role: member.role.trim(), firstLine: member.firstLine.trim() })), // 등장인물 정리
        tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))], // 태그 정리
    }); // 초안 종료
} // 함수 종료

function hasFinalConsonant(word: string): boolean // 마지막 글자 받침 여부
{ // 함수 시작
    const code = word.charCodeAt(word.length - 1) - 0xac00; // 마지막 음절 위치
    return code >= 0 && code < 11172 && code % 28 !== 0; // 받침 여부 반환
} // 함수 종료

function checkLength(errors: StoryValidationResult["errors"], key: keyof StoryDraft, value: string, limit: number, label: string, required: boolean) // 길이 확인
{ // 함수 시작
    if (required && value.length === 0) // 누락 판정
    { // 조건 시작
        errors[key] = `${label}${hasFinalConsonant(label) ? "을" : "를"} 입력해 주세요.`; // 누락 오류
    } // 조건 종료
    else if (value.length > limit) // 길이 초과 판정
    { // 조건 시작
        errors[key] = `${label}${hasFinalConsonant(label) ? "은" : "는"} ${limit}자 이하여야 합니다.`; // 길이 오류
    } // 조건 종료
} // 함수 종료

function validateCast(cast: readonly StoryCastMember[], characters: readonly Character[]): string | null // 등장인물 확인
{ // 함수 시작
    if (cast.length === 0) // 인물 없음 판정
    { // 조건 시작
        return "등장인물을 1명 이상 골라 주세요."; // 인물 없음 오류
    } // 조건 종료
    if (cast.length > STORY_CAST_LIMIT) // 인원 초과 판정
    { // 조건 시작
        return `등장인물은 최대 ${STORY_CAST_LIMIT}명까지 넣을 수 있습니다.`; // 인원 오류
    } // 조건 종료
    if (new Set(cast.map((member) => member.characterId)).size !== cast.length) // 같은 캐릭터 판정
    { // 조건 시작
        return "같은 캐릭터를 두 번 넣을 수 없습니다."; // 중복 캐릭터 오류
    } // 조건 종료
    if (cast.some((member) => !characters.some((character) => character.id === member.characterId))) // 사라진 캐릭터 판정
    { // 조건 시작
        return "등장인물 중 사라진 캐릭터가 있습니다. 다시 골라 주세요."; // 부재 오류
    } // 조건 종료
    for (const member of cast) // 인물 순회
    { // 순회 시작
        if (member.displayName.length === 0) // 빈 이름 판정
        { // 조건 시작
            return "등장인물의 이야기 속 이름을 입력해 주세요."; // 빈 이름 오류
        } // 조건 종료
        if (member.displayName.length > 12) // 이름 길이 판정
        { // 조건 시작
            return "이야기 속 이름은 12자 이하여야 합니다."; // 이름 길이 오류
        } // 조건 종료
        if (/[[\]@\n]/.test(member.displayName)) // 형식 문자 판정([이름] 대사·@지목과 겹침)
        { // 조건 시작
            return "이야기 속 이름에는 대괄호와 @를 쓸 수 없습니다."; // 형식 문자 오류
        } // 조건 종료
        if (member.displayName === STORY_NARRATOR_LABEL) // 내레이션 이름 판정
        { // 조건 시작
            return `‘${STORY_NARRATOR_LABEL}’은 등장인물 이름으로 쓸 수 없습니다.`; // 예약 이름 오류
        } // 조건 종료
        if (member.role.length > 120) // 역할 길이 판정
        { // 조건 시작
            return "등장인물 역할은 120자 이하여야 합니다."; // 역할 오류
        } // 조건 종료
        if (member.firstLine.length > 300) // 첫 대사 길이 판정
        { // 조건 시작
            return "첫 대사는 300자 이하여야 합니다."; // 첫 대사 오류
        } // 조건 종료
    } // 순회 종료
    if (new Set(cast.map((member) => member.displayName)).size !== cast.length) // 같은 이름 판정
    { // 조건 시작
        return "등장인물의 이야기 속 이름이 겹칩니다."; // 이름 중복 오류
    } // 조건 종료
    return null; // 통과
} // 함수 종료

export function getCastRequiredRating(cast: readonly StoryCastMember[], characters: readonly Character[]): ContentRating // 등장인물 기준 최소 등급
{ // 함수 시작
    return getRequiredStoryRating(cast.flatMap((member) => characters.filter((character) => character.id === member.characterId))); // 최소 등급 반환
} // 함수 종료

export function isRatingBelow(rating: ContentRating, required: ContentRating): boolean // 등급이 기준보다 낮은지
{ // 함수 시작
    return ratingOrder[rating] < ratingOrder[required]; // 비교 결과 반환
} // 함수 종료

export function validateStoryDraft(draft: StoryDraft, characters: readonly Character[]): StoryValidationResult // 초안 검증
{ // 함수 시작
    const normalized = normalizeStoryDraft(draft); // 정리 초안
    const errors: StoryValidationResult["errors"] = {}; // 오류 목록
    checkLength(errors, "title", normalized.title, 40, "스토리 제목", true); // 제목 확인
    checkLength(errors, "summary", normalized.summary, 80, "한 줄 소개", true); // 소개 확인
    checkLength(errors, "synopsis", normalized.synopsis, 2000, "줄거리", false); // 줄거리 확인
    checkLength(errors, "opening", normalized.opening, 1000, "시작 장면", true); // 시작 장면 확인
    checkLength(errors, "userRole", normalized.userRole, 200, "내 역할", false); // 역할 확인
    const castError = validateCast(normalized.cast, characters); // 등장인물 확인
    if (castError !== null) // 등장인물 오류 판정
    { // 조건 시작
        errors.cast = castError; // 등장인물 오류
    } // 조건 종료
    if (normalized.tags.length > 8) // 태그 개수 판정
    { // 조건 시작
        errors.tags = "태그는 최대 8개까지 입력할 수 있습니다."; // 태그 개수 오류
    } // 조건 종료
    else if (normalized.tags.some((tag) => tag.length > 12)) // 태그 길이 판정
    { // 조건 시작
        errors.tags = "각 태그는 12자 이하여야 합니다."; // 태그 길이 오류
    } // 조건 종료
    if (!storyCoverOptions.includes(normalized.coverImage)) // 표지 판정
    { // 조건 시작
        errors.coverImage = "준비된 표지 이미지를 골라 주세요."; // 표지 오류
    } // 조건 종료
    const required = getCastRequiredRating(normalized.cast, characters); // 최소 등급
    if (isRatingBelow(normalized.contentRating, required)) // 등급 부족 판정
    { // 조건 시작
        errors.contentRating = `등장인물 기준으로 ${contentRatingLabels[required]} 이상이어야 합니다.`; // 등급 오류
    } // 조건 종료
    return { valid: Object.keys(errors).length === 0, errors }; // 검증 결과 반환
} // 함수 종료
