// 화면 글자 번역: 한국어 글자를 그대로 열쇠로 쓰고, 영어일 때만 사전에서 바꿔 준다(사전에 없으면 한국어 그대로).
import { en } from "@chatbot/lib/i18n/en"; // 영어 사전

export type Locale = "ko" | "en"; // 화면 언어
export type LanguageSetting = "auto" | Locale; // 언어 설정(자동은 브라우저 언어를 따름)

export const languageSettings: readonly LanguageSetting[] = ["auto", "ko", "en"]; // 고를 수 있는 언어 설정
export const localeTags: Record<Locale, string> = { ko: "ko-KR", en: "en-US" }; // 날짜·숫자 형식에 쓰는 언어 표시

let activeLocale: Locale = "ko"; // 지금 화면 언어(화면을 그리기 전에 한 번 정함)

export function resolveLocale(setting: LanguageSetting | undefined, browserLanguage: string | undefined): Locale // 설정과 브라우저 언어로 화면 언어 정하기
{ // 함수 시작
    if (setting === "ko" || setting === "en") // 직접 고른 언어
    { // 조건 시작
        return setting; // 고른 언어
    } // 조건 종료
    return browserLanguage === undefined || browserLanguage.toLowerCase().startsWith("ko") ? "ko" : "en"; // 브라우저가 한국어면 한국어, 아니면 영어
} // 함수 종료

export function setActiveLocale(locale: Locale): void // 화면 언어 바꾸기
{ // 함수 시작
    activeLocale = locale; // 언어 기록
} // 함수 종료

export function getActiveLocale(): Locale // 지금 화면 언어
{ // 함수 시작
    return activeLocale; // 언어 반환
} // 함수 종료

export function localeTag(): string // 날짜·숫자 형식에 넘길 언어 표시
{ // 함수 시작
    return localeTags[activeLocale]; // 표시 반환
} // 함수 종료

function lookup(text: string): string // 사전에서 찾기(없으면 그대로)
{ // 함수 시작
    return activeLocale === "en" && Object.hasOwn(en, text) ? en[text] : text; // 영어일 때만 바꿈
} // 함수 종료

export function tc(context: string, value: string): string // 같은 한국어가 자리에 따라 다른 영어가 될 때 쓰는 번역(사전 열쇠는 "글자|자리", 없으면 보통 번역)
{ // 함수 시작
    const key = `${value}|${context}`; // 자리를 붙인 열쇠
    return activeLocale === "en" && Object.hasOwn(en, key) ? en[key] : lookup(value); // 자리에 맞는 문구 우선
} // 함수 종료

export function translateTo(locale: Locale, text: string): string // 정한 언어로 바꾸기(화면 언어와 상관없이, 사전에 없으면 그대로)
{ // 함수 시작
    return locale === "en" && Object.hasOwn(en, text) ? en[text] : text; // 영어일 때만 바꿈
} // 함수 종료

export function t(value: string, params?: readonly unknown[]): string; // 글자 번역
export function t<T>(value: T, params?: readonly unknown[]): T; // 글자가 아니면 그대로
export function t(value: unknown, params?: readonly unknown[]): unknown // 화면 글자 번역({0}·{1} 자리에는 넘긴 값을 넣고, 넘긴 값이 사전에 있는 글자면 그것도 바꿈)
{ // 함수 시작
    if (typeof value !== "string") // 글자가 아님
    { // 조건 시작
        return value; // 그대로
    } // 조건 종료
    const template = lookup(value); // 번역한 틀
    return params === undefined ? template : template.replace(/\{(\d+)\}/g, (match, index: string) => // 자리 채우기
    { // 채우기 시작
        const param = params[Number(index)]; // 넘긴 값
        return param === undefined ? match : typeof param === "string" ? lookup(param) : String(param); // 글자는 번역, 나머지는 그대로
    }); // 채우기 종료
} // 함수 종료
