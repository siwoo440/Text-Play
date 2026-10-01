"use client"; // 클라이언트 모듈

import { useMemo } from "react"; // 리액트 도구
import { useDesktopLocation, useDesktopRouterActions } from "@/desktop/router/DesktopRouter"; // 데스크톱 경로 도구

export interface DesktopAppRouter // Next 경로 이동 도구 호환 계약
{ // 구조 시작
    push(href: string, options?: { scroll?: boolean }): void; // 기록 추가 이동
    replace(href: string, options?: { scroll?: boolean }): void; // 기록 교체 이동
    back(): void; // 뒤로 이동
    forward(): void; // 앞으로 이동
    refresh(): void; // 화면 새로고침(데스크톱에서는 상태가 즉시 반영되어 동작 없음)
    prefetch(href: string): void; // 미리 불러오기(데스크톱에서는 동작 없음)
} // 구조 종료

export function useRouter(): DesktopAppRouter // 경로 이동 도구
{ // 함수 시작
    const actions = useDesktopRouterActions(); // 데스크톱 이동 동작
    return useMemo<DesktopAppRouter>(() => // 고정 도구 생성
    ({ // 객체 시작
        push: (href) => actions.push(href), // 기록 추가
        replace: (href) => actions.replace(href), // 기록 교체
        back: () => actions.back(), // 뒤로 이동
        forward: () => actions.forward(), // 앞으로 이동
        refresh: () => undefined, // 새로고침 생략
        prefetch: () => undefined, // 미리 불러오기 생략
    }), [actions]); // 동작 의존
} // 함수 종료

export function usePathname(): string // 현재 경로
{ // 함수 시작
    return useDesktopLocation().pathname; // 경로 반환
} // 함수 종료

export function useSearchParams(): URLSearchParams // 현재 검색어
{ // 함수 시작
    const { search } = useDesktopLocation(); // 검색어 문자열
    return useMemo(() => new URLSearchParams(search), [search]); // 검색어 객체 반환
} // 함수 종료
