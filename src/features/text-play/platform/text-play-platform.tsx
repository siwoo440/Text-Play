"use client"; // 클라이언트 컴포넌트

import { createContext, useContext, type ReactElement, type ReactNode } from "react"; // 리액트 문맥 도구

export type TextPlayRoute = "home" | "new" | "resume" | "back"; // 화면 이동 종류

export interface TextPlayPlatform // 플랫폼 계약
{ // 구조 시작
    navigate(route: TextPlayRoute): void; // 화면 이동
    renderSceneImage(source: string): ReactNode; // 장면 이미지 출력
} // 구조 종료

interface TextPlayPlatformProviderProps // 공급자 속성
{ // 구조 시작
    value: TextPlayPlatform; // 플랫폼 값
    children: ReactNode; // 하위 화면
} // 구조 종료

const TextPlayPlatformContext = createContext<TextPlayPlatform | null>(null); // 플랫폼 문맥

export function TextPlayPlatformProvider({ value, children }: TextPlayPlatformProviderProps): ReactElement // 플랫폼 공급자
{ // 함수 시작
    return <TextPlayPlatformContext.Provider value={value}>{children}</TextPlayPlatformContext.Provider>; // 문맥 공급
} // 함수 종료

export function useTextPlayPlatform(): TextPlayPlatform // 플랫폼 조회 훅
{ // 함수 시작
    const platform = useContext(TextPlayPlatformContext); // 플랫폼 조회
    if (platform === null) // 공급자 확인
    { // 조건 시작
        throw new Error("TextPlayPlatformProvider가 필요합니다."); // 누락 오류
    } // 조건 종료
    return platform; // 플랫폼 반환
} // 함수 종료
