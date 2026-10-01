export type TextPlayThemeId = "dark-fantasy" | "sci-fi" | "classic-novel"; // 테마 식별자
export type TextPlayResolutionId = "fit" | "1280x720" | "1600x900" | "1920x1080"; // 해상도 식별자
export type TextPlayAIProviderId = "mock" | "ollama" | "bundled"; // AI 공급자 식별자(bundled: 이 PC 내장 AI)
export type AppLanguage = "ko" | "en"; // 앱 언어(화면 글자·AI 답변)

export interface TextPlayPreferences // 게임 설정 구조
{ // 구조 시작
    schemaVersion: 2; // 설정 버전
    themeId: TextPlayThemeId; // 선택 테마
    resolutionId: TextPlayResolutionId; // 선택 해상도
    aiProviderId: TextPlayAIProviderId; // 선택 AI
    localModelId: string | null; // 선택 로컬 모델
    language: AppLanguage; // 앱 언어
} // 구조 종료

export const TEXT_PLAY_PREFERENCES_KEY = "mate.text-play.preferences.v2"; // 최신 저장소 키
export const LEGACY_TEXT_PLAY_PREFERENCES_KEY = "mate.text-play.preferences.v1"; // 이전 저장소 키

export const DEFAULT_TEXT_PLAY_PREFERENCES: TextPlayPreferences = // 기본 설정
{ // 객체 시작
    schemaVersion: 2, // 설정 버전
    themeId: "dark-fantasy", // 기본 테마
    resolutionId: "fit", // 기본 해상도
    aiProviderId: "mock", // 기본 AI
    localModelId: null, // 기본 로컬 모델
    language: "ko", // 기본 언어
}; // 객체 종료

const themeIds: TextPlayThemeId[] = ["dark-fantasy", "sci-fi", "classic-novel"]; // 테마 목록
const resolutionIds: TextPlayResolutionId[] = ["fit", "1280x720", "1600x900", "1920x1080"]; // 해상도 목록
export const APP_LANGUAGES: AppLanguage[] = ["ko", "en"]; // 지원 언어

function isRecord(value: unknown): value is Record<string, unknown> // 객체 판정기
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부 반환
} // 함수 종료

function isValidLocalModelId(value: unknown): value is string | null // 모델 식별자 판정기
{ // 함수 시작
    return value === null || (typeof value === "string" && value.trim().length > 0 && value.length <= 200); // 모델 식별자 여부 반환
} // 함수 종료

function isTextPlayPreferences(value: unknown): value is TextPlayPreferences // 설정 판정기
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && value.schemaVersion === 2 // 버전 확인
        && themeIds.includes(value.themeId as TextPlayThemeId) // 테마 확인
        && resolutionIds.includes(value.resolutionId as TextPlayResolutionId) // 해상도 확인
        && (value.aiProviderId === "mock" || value.aiProviderId === "ollama" || value.aiProviderId === "bundled") // AI 확인
        && isValidLocalModelId(value.localModelId) // 모델 확인
        && (value.aiProviderId !== "ollama" || value.localModelId !== null) // 올라마 모델 확인
        && APP_LANGUAGES.includes(value.language as AppLanguage); // 언어 확인
} // 함수 종료

function migrateLegacyPreferences(value: unknown): TextPlayPreferences | null // 이전 설정 변환기
{ // 함수 시작
    if (!isRecord(value) || value.schemaVersion !== 1 || value.aiProviderId !== "mock") // 이전 구조 확인
    { // 조건 시작
        return null; // 변환 거부
    } // 조건 종료
    if (!themeIds.includes(value.themeId as TextPlayThemeId) || !resolutionIds.includes(value.resolutionId as TextPlayResolutionId)) // 화면 설정 확인
    { // 조건 시작
        return null; // 변환 거부
    } // 조건 종료
    return { schemaVersion: 2, themeId: value.themeId as TextPlayThemeId, resolutionId: value.resolutionId as TextPlayResolutionId, aiProviderId: "mock", localModelId: null, language: "ko" }; // 변환 설정 반환
} // 함수 종료

function cloneDefaultPreferences(): TextPlayPreferences // 기본값 복사기
{ // 함수 시작
    return { ...DEFAULT_TEXT_PLAY_PREFERENCES }; // 기본값 복사 반환
} // 함수 종료

export function loadTextPlayPreferences(storage: Pick<Storage, "getItem">): TextPlayPreferences // 설정 불러오기
{ // 함수 시작
    try // 안전 읽기 시작
    { // 예외 처리 시작
        const serialized = storage.getItem(TEXT_PLAY_PREFERENCES_KEY); // 최신 저장 문자열 조회
        if (serialized !== null) // 최신 저장값 확인
        { // 조건 시작
            const decoded: unknown = JSON.parse(serialized); // 최신 저장값 해석
            const parsed: unknown = isRecord(decoded) && decoded.language === undefined ? { ...decoded, language: "ko" } : decoded; // 언어가 없던 예전 저장값은 한국어
            return isTextPlayPreferences(parsed) ? { ...parsed } : cloneDefaultPreferences(); // 최신 검증 결과 반환
        } // 조건 종료
        const legacySerialized = storage.getItem(LEGACY_TEXT_PLAY_PREFERENCES_KEY); // 이전 저장 문자열 조회
        if (legacySerialized === null) // 이전 저장값 확인
        { // 조건 시작
            return cloneDefaultPreferences(); // 기본값 반환
        } // 조건 종료
        const migrated = migrateLegacyPreferences(JSON.parse(legacySerialized)); // 이전 설정 변환
        return migrated ?? cloneDefaultPreferences(); // 이전 검증 결과 반환
    } // 예외 처리 종료
    catch // 읽기 실패 처리
    { // 오류 처리 시작
        return cloneDefaultPreferences(); // 기본값 반환
    } // 오류 처리 종료
} // 함수 종료

export function saveTextPlayPreferences(storage: Pick<Storage, "setItem">, preferences: TextPlayPreferences): void // 설정 저장
{ // 함수 시작
    storage.setItem(TEXT_PLAY_PREFERENCES_KEY, JSON.stringify(preferences)); // 직렬화 저장
} // 함수 종료
