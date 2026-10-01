import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어

export type LocalizedText<T> = Record<AppLanguage, T>; // 언어별 화면 글자 묶음

export function defineText<T>(ko: T, en: NoInfer<T>): LocalizedText<T> // 한국어 묶음과 같은 모양의 영어 묶음(빠진 글자는 타입 검사로 잡음)
{ // 함수 시작
    return { ko, en }; // 언어별 묶음 반환
} // 함수 종료

export function dateLocale(language: AppLanguage): string // 날짜 표시 지역
{ // 함수 시작
    return language === "en" ? "en-US" : "ko-KR"; // 언어별 지역 반환
} // 함수 종료
