"use client"; // 클라이언트 컴포넌트

import { useEffect } from "react"; // 리액트 효과
import { getAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정

export function resolveAuthLinkTarget(pathname: string, hash: string): string | null // 메일의 링크가 다른 화면으로 돌아왔을 때 보낼 화면(해당하지 않으면 없음)
{ // 함수 시작
    if (pathname.startsWith("/auth/")) // 이미 그 값을 받는 화면
    { // 조건 시작
        return null; // 그대로 둠
    } // 조건 종료
    const params = new URLSearchParams(hash.replace(/^#/, "")); // 주소 뒤에 붙어 온 값
    if (params.has("error") && params.has("error_code")) // 만료됐거나 이미 쓴 링크
    { // 조건 시작
        return "/auth/callback"; // 안내가 있는 화면으로
    } // 조건 종료
    if (!params.has("access_token") || !params.has("refresh_token")) // 출입증이 붙어 오지 않음(화면 안의 위치로 가는 주소 등)
    { // 조건 시작
        return null; // 건드리지 않음
    } // 조건 종료
    const type = params.get("type"); // 링크의 종류
    return type === "recovery" ? "/auth/reset" : type === "signup" ? "/auth/callback" : null; // 비밀번호 재설정·가입 확인만 받음
} // 함수 종료

export function AuthLinkForward({ live, navigate }: { live?: boolean; navigate?: (href: string) => void }) // 메일의 링크가 돌아올 주소로 등록되지 않아 다른 화면(주로 메인)으로 돌아왔을 때, 붙어 온 값과 함께 맞는 화면으로 보냄
{ // 함수 시작
    useEffect(() => // 화면이 열리면 한 번 확인
    { // 효과 시작
        if (!(live ?? getAccountServiceConfig().mode === "supabase")) // 연습용 로그인
        { // 조건 시작
            return; // 메일의 링크가 없음
        } // 조건 종료
        const target = resolveAuthLinkTarget(window.location.pathname, window.location.hash); // 보낼 화면
        if (target !== null) // 보낼 곳 있음
        { // 조건 시작
            (navigate ?? ((href: string) => window.location.replace(href)))(`${target}${window.location.hash}`); // 붙어 온 값과 함께 이동(방문 기록에 지금 주소를 남기지 않음)
        } // 조건 종료
    }, [live, navigate]); // 처음 한 번
    return null; // 화면 표시 없음
} // 함수 종료
