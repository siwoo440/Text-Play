import { describe, expect, it } from "vitest"; // 테스트 도구
import { canViewMatureContent, checkAdultAge, createMockAdultVerification, getDiscoverableCharacters, isAdultVerificationExpired, isAdultVerified, isCharacterLocked } from "@chatbot/features/adult/adult-access"; // 성인 인증 판정
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태

const now = new Date("2026-10-01T09:00:00+09:00"); // 기준 시각

describe("성인 인증 판정", () => // 판정 묶음
{ // 묶음 시작
    it("청소년 보호법 기준으로 19세가 되는 해부터 성인으로 판정한다", () => // 나이 기준 검증
    { // 검증 시작
        expect(checkAdultAge("2007-12-31", now)).toEqual({ ok: true }); // 올해 19세가 되는 출생
        expect(checkAdultAge("1990-01-01", now)).toEqual({ ok: true }); // 충분한 성인
        expect(checkAdultAge("2008-01-01", now)).toEqual({ ok: false, reason: "minor" }); // 올해 18세
        expect(checkAdultAge("2026-02-30", now)).toEqual({ ok: false, reason: "invalid-date" }); // 없는 날짜
        expect(checkAdultAge("abc", now)).toEqual({ ok: false, reason: "invalid-date" }); // 잘못된 형식
        expect(checkAdultAge("1899-12-31", now)).toEqual({ ok: false, reason: "invalid-date" }); // 범위 밖 날짜
        expect(checkAdultAge("2027-01-01", now)).toEqual({ ok: false, reason: "future-date" }); // 미래 날짜
    }); // 검증 종료

    it("모의 인증은 1년 동안 유효하고 만료되면 접근을 막는다", () => // 유효 기간 검증
    { // 검증 시작
        const verification = createMockAdultVerification(now); // 인증 생성
        const profile = { adultVerification: verification }; // 인증 프로필
        expect(verification.method).toBe("mock"); // 인증 방식 확인
        expect(new Date(verification.expiresAt).getFullYear()).toBe(2027); // 1년 뒤 만료
        expect(isAdultVerified(profile, new Date("2027-09-30T00:00:00+09:00"))).toBe(true); // 만료 전 유효
        expect(isAdultVerified(profile, new Date("2027-10-02T00:00:00+09:00"))).toBe(false); // 만료 후 무효
        expect(isAdultVerificationExpired(profile, new Date("2027-10-02T00:00:00+09:00"))).toBe(true); // 만료 표시
        expect(isAdultVerificationExpired({ adultVerification: null }, now)).toBe(false); // 인증 전은 만료 아님
    }); // 검증 종료

    it("인증과 19+ 스위치가 모두 켜져야 19세 캐릭터를 보여 준다", () => // 접근 조건 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const mature = state.characters.filter((character) => character.contentRating === "mature"); // 19세 캐릭터
        expect(mature.map((character) => character.id)).toEqual(["rank-017", "rank-020", "rank-030", "rank-056", "rank-060", "rank-062"]); // 예시 캐릭터 확인
        expect(canViewMatureContent(state, now)).toBe(false); // 기본 숨김
        expect(getDiscoverableCharacters(state.characters, false)).toHaveLength(94); // 숨김 목록 수
        expect(getDiscoverableCharacters(state.characters, true)).toHaveLength(100); // 전체 목록 수
        const switchedOnly = { ...state, settings: { ...state.settings, matureContentEnabled: true } }; // 인증 없는 켜짐
        expect(canViewMatureContent(switchedOnly, now)).toBe(false); // 인증 없이는 숨김
        expect(isCharacterLocked(mature[0], switchedOnly, now)).toBe(true); // 잠금 유지
        const verified = { ...switchedOnly, profile: { ...state.profile, adultVerification: createMockAdultVerification(now) } }; // 인증 완료 상태
        expect(canViewMatureContent(verified, now)).toBe(true); // 표시 허용
        expect(isCharacterLocked(mature[0], verified, now)).toBe(false); // 잠금 해제
    }); // 검증 종료
}); // 묶음 종료

describe("성인 인증 리듀서", () => // 리듀서 묶음
{ // 묶음 시작
    it("인증 없이 19+를 켜는 요청은 무시하고 인증 뒤에는 켜고 끌 수 있다", () => // 상태 전환 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const ignored = appReducer(state, { type: "set-mature-content", enabled: true, now: now.toISOString() }); // 인증 없는 켜기
        expect(ignored.settings.matureContentEnabled).toBe(false); // 무시 확인
        const verified = appReducer(state, { type: "verify-adult", verification: createMockAdultVerification(now), enableMatureContent: true }); // 인증 후 켜기
        expect(verified.profile.adultVerification?.method).toBe("mock"); // 인증 저장 확인
        expect(verified.settings.matureContentEnabled).toBe(true); // 켜짐 확인
        const off = appReducer(verified, { type: "set-mature-content", enabled: false, now: now.toISOString() }); // 끄기
        expect(off.settings.matureContentEnabled).toBe(false); // 꺼짐 확인
        const verifiedOnly = appReducer(state, { type: "verify-adult", verification: createMockAdultVerification(now), enableMatureContent: false }); // 인증만 완료
        expect(verifiedOnly.settings.matureContentEnabled).toBe(false); // 스위치 유지 확인
    }); // 검증 종료

    it("인증을 해제하면 19+ 표시도 함께 끈다", () => // 해제 검증
    { // 검증 시작
        const verified = appReducer(createInitialState(), { type: "verify-adult", verification: createMockAdultVerification(now), enableMatureContent: true }); // 인증 상태
        const revoked = appReducer(verified, { type: "revoke-adult-verification" }); // 인증 해제
        expect(revoked.profile.adultVerification).toBeNull(); // 인증 제거 확인
        expect(revoked.settings.matureContentEnabled).toBe(false); // 표시 끔 확인
    }); // 검증 종료
}); // 묶음 종료
