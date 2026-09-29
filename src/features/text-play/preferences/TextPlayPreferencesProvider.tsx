"use client"; // 클라이언트 컴포넌트

import { createContext, useCallback, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react"; // 리액트 문맥 도구
import { DEFAULT_TEXT_PLAY_PREFERENCES, loadTextPlayPreferences, saveTextPlayPreferences, type TextPlayPreferences } from "@/features/text-play/preferences/text-play-preferences"; // 설정 저장 도구

interface TextPlayPreferencesContextValue // 설정 문맥 구조
{ // 구조 시작
    preferences: TextPlayPreferences; // 현재 설정
    ready: boolean; // 브라우저 설정 준비 상태
    updatePreferences(values: Partial<Omit<TextPlayPreferences, "schemaVersion">>): void; // 설정 변경기
} // 구조 종료

interface TextPlayPreferencesProviderProps // 설정 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 화면
} // 구조 종료

const TextPlayPreferencesContext = createContext<TextPlayPreferencesContextValue | null>(null); // 설정 문맥

function readBrowserPreferences(): TextPlayPreferences // 브라우저 설정 읽기
{ // 함수 시작
    if (typeof window === "undefined") // 서버 환경 확인
    { // 조건 시작
        return { ...DEFAULT_TEXT_PLAY_PREFERENCES }; // 서버 기본값 반환
    } // 조건 종료
    try // 브라우저 저장소 접근
    { // 시도 시작
        return loadTextPlayPreferences(window.localStorage); // 로컬 설정 반환
    } // 시도 종료
    catch // 저장소 접근 실패
    { // 오류 시작
        return { ...DEFAULT_TEXT_PLAY_PREFERENCES }; // 안전 기본값 반환
    } // 오류 종료
} // 함수 종료

export function TextPlayPreferencesProvider({ children }: TextPlayPreferencesProviderProps): ReactElement // 설정 공급자
{ // 함수 시작
    const [preferences, setPreferences] = useState<TextPlayPreferences>({ ...DEFAULT_TEXT_PLAY_PREFERENCES }); // 설정 상태
    const [ready, setReady] = useState(false); // 준비 상태
    useEffect(() => // 브라우저 설정 읽기
    { // 효과 시작
        let active = true; // 효과 활성 상태
        queueMicrotask(() => // 비동기 설정 반영
        { // 작업 시작
            if (!active) // 효과 활성 확인
            { // 조건 시작
                return; // 반영 생략
            } // 조건 종료
            setPreferences(readBrowserPreferences()); // 저장 설정 반영
            setReady(true); // 준비 완료 표시
        }); // 작업 종료
        return () => // 효과 정리
        { // 정리 시작
            active = false; // 후속 반영 차단
        }; // 정리 종료
    }, []); // 최초 실행
    const updatePreferences = useCallback((values: Partial<Omit<TextPlayPreferences, "schemaVersion">>) => // 설정 변경
    { // 함수 시작
        setPreferences((current) => // 현재 설정 갱신
        { // 갱신 시작
            const next = { ...current, ...values, schemaVersion: 2 as const }; // 다음 설정 생성
            try // 저장 시도
            { // 예외 처리 시작
                if (typeof window !== "undefined") // 브라우저 환경 확인
                { // 조건 시작
                    saveTextPlayPreferences(window.localStorage, next); // 설정 저장
                } // 조건 종료
            } // 예외 처리 종료
            catch // 저장 실패 처리
            { // 오류 처리 시작
                return next; // 메모리 설정 유지
            } // 오류 처리 종료
            return next; // 저장 설정 반환
        }); // 상태 갱신 종료
    }, []); // 고정 변경기
    return <TextPlayPreferencesContext.Provider value={{ preferences, ready, updatePreferences }}>{children}</TextPlayPreferencesContext.Provider>; // 문맥 공급
} // 함수 종료

export function useTextPlayPreferences(): TextPlayPreferencesContextValue // 설정 문맥 조회
{ // 함수 시작
    const context = useContext(TextPlayPreferencesContext); // 문맥 조회
    if (context === null) // 공급자 확인
    { // 조건 시작
        throw new Error("TextPlayPreferencesProvider가 필요합니다."); // 공급자 오류
    } // 조건 종료
    return context; // 설정 문맥 반환
} // 함수 종료
