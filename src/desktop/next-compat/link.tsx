"use client"; // 클라이언트 컴포넌트

import type { AnchorHTMLAttributes, MouseEvent, ReactElement, Ref } from "react"; // 리액트 타입
import { useDesktopRouterActions } from "@/desktop/router/DesktopRouter"; // 데스크톱 이동 동작

type LinkHref = string | { pathname?: string; query?: Record<string, string | number | undefined>; hash?: string }; // 링크 주소 형식

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> // 링크 속성
{ // 구조 시작
    href: LinkHref; // 이동 주소
    replace?: boolean; // 기록 교체 여부
    scroll?: boolean; // 맨 위 이동 여부(Next 호환용)
    prefetch?: boolean | null; // 미리 불러오기(Next 호환용)
    ref?: Ref<HTMLAnchorElement>; // 요소 참조
} // 구조 종료

function formatHref(href: LinkHref): string // 주소 문자열 생성
{ // 함수 시작
    if (typeof href === "string") // 문자열 주소 확인
    { // 조건 시작
        return href; // 그대로 반환
    } // 조건 종료
    const query = new URLSearchParams(Object.entries(href.query ?? {}).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key, value]) => [key, String(value)])).toString(); // 검색어 생성
    return `${href.pathname ?? ""}${query.length > 0 ? `?${query}` : ""}${href.hash ?? ""}`; // 주소 결합
} // 함수 종료

function isExternal(url: string): boolean // 외부 주소 확인
{ // 함수 시작
    return /^[a-z][a-z\d+.-]*:/iu.test(url) || url.startsWith("//"); // 형식 지정 주소 판정
} // 함수 종료

export default function Link({ href, replace = false, scroll, prefetch, onClick, ref, ...rest }: LinkProps): ReactElement // 데스크톱 링크
{ // 함수 시작
    void scroll; // 호환 속성 표시
    void prefetch; // 호환 속성 표시
    const actions = useDesktopRouterActions(); // 이동 동작 조회
    const url = formatHref(href); // 주소 문자열
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => // 클릭 처리
    { // 함수 시작
        onClick?.(event); // 기존 클릭 처리
        if (event.defaultPrevented || isExternal(url)) // 처리 생략 확인
        { // 조건 시작
            return; // 기본 동작 유지
        } // 조건 종료
        event.preventDefault(); // 창 이동 차단
        if (replace) // 교체 이동 확인
        { // 조건 시작
            actions.replace(url); // 기록 교체
            return; // 처리 종료
        } // 조건 종료
        actions.push(url); // 기록 추가
    }; // 함수 종료
    return <a ref={ref} href={url} onClick={handleClick} {...rest} />; // 링크 반환
} // 함수 종료
