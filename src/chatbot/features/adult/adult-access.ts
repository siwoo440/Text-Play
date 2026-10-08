import type { AdultVerification, AppSettings, Character, ContentRating, UserProfile } from "@chatbot/features/core/types"; // 도메인 타입
import { localeTag } from "@chatbot/lib/i18n"; // 날짜와 숫자 형식

export const adultAge = 19; // 성인 기준 나이
export const contentRatingLabels: Record<ContentRating, string> = { all: "전체 이용가", teen: "15세 이용가", mature: "19세 이용가" }; // 등급 문구

export type AdultAgeCheck = // 나이 확인 결과
    | { ok: true } // 성인 확인
    | { ok: false; reason: "invalid-date" | "future-date" | "minor" }; // 확인 실패

interface AccessState // 접근 판정 상태
{ // 구조 시작
    profile: Pick<UserProfile, "adultVerification">; // 인증 정보
    settings: Pick<AppSettings, "matureContentEnabled">; // 표시 설정
} // 구조 종료

export function checkAdultAge(birthDate: string, now: Date): AdultAgeCheck // 청소년 보호법 기준 나이 확인
{ // 함수 시작
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate); // 날짜 형식 분리
    if (match === null) // 형식 오류 판정
    { // 조건 시작
        return { ok: false, reason: "invalid-date" }; // 형식 오류 반환
    } // 조건 종료
    const [year, month, day] = match.slice(1).map(Number); // 연월일 숫자
    const date = new Date(Date.UTC(year, month - 1, day)); // 날짜 생성
    if (year < 1900 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) // 없는 날짜 판정
    { // 조건 시작
        return { ok: false, reason: "invalid-date" }; // 날짜 오류 반환
    } // 조건 종료
    if (date.getTime() > now.getTime()) // 미래 날짜 판정
    { // 조건 시작
        return { ok: false, reason: "future-date" }; // 미래 오류 반환
    } // 조건 종료
    return now.getFullYear() - year >= adultAge ? { ok: true } : { ok: false, reason: "minor" }; // 19세가 되는 해부터 성인
} // 함수 종료

export function createMockAdultVerification(now: Date): AdultVerification // 모의 인증 생성
{ // 함수 시작
    const expiresAt = new Date(now.getTime()); // 만료 시각 복사
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 유효
    return { method: "mock", verifiedAt: now.toISOString(), expiresAt: expiresAt.toISOString() }; // 인증 정보 반환
} // 함수 종료

export function isAdultVerified(profile: Pick<UserProfile, "adultVerification">, now: Date): boolean // 유효 인증 판정
{ // 함수 시작
    const verification = profile.adultVerification; // 인증 정보
    return verification !== null && new Date(verification.expiresAt).getTime() > now.getTime(); // 만료 전 인증 반환
} // 함수 종료

export function isAdultVerificationExpired(profile: Pick<UserProfile, "adultVerification">, now: Date): boolean // 만료 인증 판정
{ // 함수 시작
    return profile.adultVerification !== null && !isAdultVerified(profile, now); // 만료 여부 반환
} // 함수 종료

export function canViewMatureContent(state: AccessState, now: Date): boolean // 19세 이상 콘텐츠 접근 판정
{ // 함수 시작
    return state.settings.matureContentEnabled && isAdultVerified(state.profile, now); // 인증과 스위치 모두 확인
} // 함수 종료

export function isMatureCharacter(character: Pick<Character, "contentRating">): boolean // 19세 캐릭터 판정
{ // 함수 시작
    return character.contentRating === "mature"; // 등급 확인
} // 함수 종료

export function isCharacterLocked(character: Pick<Character, "contentRating">, state: AccessState, now: Date): boolean // 잠금 캐릭터 판정
{ // 함수 시작
    return isMatureCharacter(character) && !canViewMatureContent(state, now); // 잠금 여부 반환
} // 함수 종료

export function getDiscoverableCharacters(characters: readonly Character[], showMature: boolean): Character[] // 추천 가능한 공개 캐릭터
{ // 함수 시작
    return characters.filter((character) => character.publicationStatus === "published" && character.visibility === "public" && (showMature || !isMatureCharacter(character))); // 공개·등급 필터
} // 함수 종료

export function formatVerificationDate(value: string): string // 인증 날짜 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: "long", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 날짜 반환
} // 함수 종료
