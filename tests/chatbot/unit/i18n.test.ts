import { describe, expect, it } from "vitest"; // 테스트 도구
import { collectKeys } from "../scripts/i18n-keys"; // 번역할 화면 글자 모으기
import { en } from "@chatbot/lib/i18n/en"; // 영어 사전
import { getActiveLocale, localeTag, resolveLocale, setActiveLocale, t } from "@chatbot/lib/i18n"; // 번역 도구

const translatedFolders = [""]; // 영어 번역을 마친 폴더(빈 글자는 전체: 모든 화면 글자가 사전에 있어야 함)

describe("화면 언어 정하기", () => // 언어 묶음
{ // 묶음 시작
    it("직접 고른 언어가 먼저이고, 자동이면 브라우저 언어가 한국어일 때만 한국어다", () => // 언어 판정
    { // 검증 시작
        expect(resolveLocale("ko", "en-US")).toBe("ko"); // 고른 언어 우선
        expect(resolveLocale("en", "ko-KR")).toBe("en"); // 고른 언어 우선
        expect(resolveLocale("auto", "ko-KR")).toBe("ko"); // 한국어 브라우저
        expect(resolveLocale("auto", "ko")).toBe("ko"); // 지역 표시 없는 한국어
        expect(resolveLocale("auto", "en-US")).toBe("en"); // 영어 브라우저
        expect(resolveLocale("auto", "ja-JP")).toBe("en"); // 그 밖의 언어는 영어
        expect(resolveLocale(undefined, "fr-FR")).toBe("en"); // 설정이 없으면 자동
        expect(resolveLocale(undefined, undefined)).toBe("ko"); // 브라우저 언어를 모르면 한국어
    }); // 검증 종료

    it("한국어일 때는 글자를 그대로 두고, 영어일 때만 사전으로 바꾼다", () => // 번역
    { // 검증 시작
        expect(getActiveLocale()).toBe("ko"); // 기본은 한국어
        expect(t("취소")).toBe("취소"); // 그대로
        expect(t("‘{0}’ 폴더를 만들었습니다.", ["여행"])).toBe("‘여행’ 폴더를 만들었습니다."); // 자리 채우기
        expect(localeTag()).toBe("ko-KR"); // 날짜·숫자 형식
        setActiveLocale("en"); // 영어로
        expect(t("취소")).toBe("Cancel"); // 사전 번역
        expect(t("‘{0}’ 폴더를 만들었습니다.", ["Trip"])).toBe("Created the ‘Trip’ folder."); // 번역한 틀에 자리 채우기
        expect(t("‘{0}’ 대화를 ‘{1}’ 폴더로 옮겼습니다.", ["A", "B"])).toBe("Moved ‘A’ to the ‘B’ folder."); // 자리 여러 개
        expect(t("{0} 메뉴", ["보관함"])).toBe("Library menu"); // 넘긴 값이 사전에 있는 글자면 그것도 번역
        expect(t("{0} 메뉴", [3])).toBe("3 menu"); // 숫자는 그대로
        expect(t("사전에 없는 글자")).toBe("사전에 없는 글자"); // 없으면 한국어 그대로
        expect(t("개")).toBe(""); // 영어에서 쓰지 않는 단위는 빈 글자
        expect(localeTag()).toBe("en-US"); // 날짜·숫자 형식
        expect(t(42)).toBe(42); // 글자가 아니면 그대로
        expect(t(null)).toBeNull(); // 빈 값도 그대로
    }); // 검증 종료
}); // 묶음 종료

describe("영어 사전", () => // 사전 묶음
{ // 묶음 시작
    it("번역에 쓰는 자리 표시({0}·{1})는 한국어 글자에 있는 것만 쓴다", () => // 자리 표시 검사
    { // 검증 시작
        const broken = Object.entries(en).filter(([key, value]) => (value.match(/\{\d+\}/g) ?? []).some((slot) => !key.includes(slot))); // 한국어에 없는 자리를 쓰는 번역
        expect(broken).toEqual([]); // 없음
    }); // 검증 종료

    it("번역을 마친 폴더의 화면 글자는 모두 영어 사전에 있다", () => // 빠진 번역 검사
    { // 검증 시작
        const missing = [...collectKeys()].filter(([text, file]) => translatedFolders.some((folder) => file.startsWith(folder)) && !Object.hasOwn(en, text)).map(([text, file]) => `${file}: ${text}`); // 사전에 없는 글자
        expect(missing).toEqual([]); // 없음
    }, 60_000); // 소스 전체를 읽어 넉넉히 기다림
}); // 묶음 종료
