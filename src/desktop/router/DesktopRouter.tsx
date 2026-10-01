"use client"; // 클라이언트 컴포넌트

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react"; // 리액트 도구
import { parseDesktopHash, resolveDesktopHref, toDesktopHash, type DesktopLocation } from "@/desktop/router/desktop-routes"; // 주소 해석 도구

export interface DesktopRouterActions // 화면 이동 동작
{ // 구조 시작
    push(href: string): void; // 기록 추가 이동
    replace(href: string): void; // 기록 교체 이동
    back(): void; // 뒤로 이동
    forward(): void; // 앞으로 이동
} // 구조 종료

function readLocation(): DesktopLocation // 현재 창 위치 읽기
{ // 함수 시작
    return parseDesktopHash(window.location.hash); // 해시 위치 반환
} // 함수 종료

function writeLocation(href: string, mode: "push" | "replace"): DesktopLocation // 창 위치 기록
{ // 함수 시작
    const next = resolveDesktopHref(href, readLocation()); // 다음 위치 해석
    const hash = toDesktopHash(next); // 해시 주소 생성
    if (mode === "push" && window.location.hash !== hash) // 새 기록 필요 확인
    { // 조건 시작
        window.history.pushState(null, "", hash); // 기록 추가
    } // 조건 종료
    else // 기록 교체 처리
    { // 조건 시작
        window.history.replaceState(null, "", hash); // 기록 교체
    } // 조건 종료
    return next; // 다음 위치 반환
} // 함수 종료

const windowActions: DesktopRouterActions = // 공급자 없는 기본 동작
{ // 객체 시작
    push: (href) => void writeLocation(href, "push"), // 기록 추가
    replace: (href) => void writeLocation(href, "replace"), // 기록 교체
    back: () => window.history.back(), // 뒤로 이동
    forward: () => window.history.forward(), // 앞으로 이동
}; // 객체 종료

const LocationContext = createContext<DesktopLocation | null>(null); // 현재 위치 문맥
const ActionsContext = createContext<DesktopRouterActions>(windowActions); // 이동 동작 문맥

function scrollToLocation(location: DesktopLocation, pathnameChanged: boolean): void // 이동 후 화면 위치 맞춤
{ // 함수 시작
    if (location.hash.length > 1) // 화면 안 위치 확인
    { // 조건 시작
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); // 대상 요소 조회
        if (target !== null && typeof target.scrollIntoView === "function") // 이동 가능 확인
        { // 조건 시작
            target.scrollIntoView({ block: "start" }); // 대상 위치 이동
            return; // 처리 종료
        } // 조건 종료
    } // 조건 종료
    if (pathnameChanged) // 다른 화면 이동 확인
    { // 조건 시작
        document.documentElement.scrollTop = 0; // 문서 맨 위 이동
    } // 조건 종료
} // 함수 종료

export function DesktopRouterProvider({ children }: { children: ReactNode }): ReactElement // 데스크톱 경로 공급자
{ // 함수 시작
    const [location, setLocation] = useState<DesktopLocation>(readLocation); // 현재 위치 상태
    const previousPathname = useRef(location.pathname); // 이전 화면 경로
    const actions = useMemo<DesktopRouterActions>(() => // 이동 동작 생성
    ({ // 객체 시작
        push: (href) => setLocation(writeLocation(href, "push")), // 기록 추가 후 반영
        replace: (href) => setLocation(writeLocation(href, "replace")), // 기록 교체 후 반영
        back: () => window.history.back(), // 뒤로 이동
        forward: () => window.history.forward(), // 앞으로 이동
    }), []); // 한 번만 생성
    useEffect(() => // 창 기록 변경 구독
    { // 효과 시작
        const sync = () => setLocation(readLocation()); // 창 위치 반영
        window.addEventListener("hashchange", sync); // 해시 변경 구독
        window.addEventListener("popstate", sync); // 기록 이동 구독
        return () => // 구독 해제
        { // 해제 시작
            window.removeEventListener("hashchange", sync); // 해시 구독 해제
            window.removeEventListener("popstate", sync); // 기록 구독 해제
        }; // 해제 종료
    }, []); // 최초 구독
    useEffect(() => // 이동 후 화면 위치 맞춤
    { // 효과 시작
        scrollToLocation(location, previousPathname.current !== location.pathname); // 위치 맞춤
        previousPathname.current = location.pathname; // 이전 경로 갱신
    }, [location]); // 위치 변경 의존
    return ( // 공급자 반환
        <ActionsContext.Provider value={actions}> {/* 이동 동작 공급 */}
            <LocationContext.Provider value={location}>{children}</LocationContext.Provider> {/* 현재 위치 공급 */}
        </ActionsContext.Provider> // 공급 종료
    ); // 반환 종료
} // 함수 종료

export function useDesktopLocation(): DesktopLocation // 현재 위치 조회
{ // 함수 시작
    return useContext(LocationContext) ?? readLocation(); // 공급자 위치나 창 위치 반환
} // 함수 종료

export function useDesktopRouterActions(): DesktopRouterActions // 이동 동작 조회
{ // 함수 시작
    return useContext(ActionsContext); // 이동 동작 반환
} // 함수 종료
