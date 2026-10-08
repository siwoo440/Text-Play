"use client"; // 클라이언트 훅

import { useSyncExternalStore } from "react"; // 바깥 저장소 구독
import { getAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정
import { ACCOUNT_SESSION_EVENT, ACCOUNT_SESSION_KEY, readActiveSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션

let cachedRaw: string | null | undefined; // 마지막으로 읽은 글(같으면 같은 객체를 돌려줘 다시 그리지 않게 함)
let cachedSession: AccountSession | null = null; // 마지막으로 읽은 세션

function readRaw(): string | null // 저장된 세션 글 읽기(저장소를 못 읽으면 없음)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        return window.localStorage.getItem(ACCOUNT_SESSION_KEY); // 저장된 글
    } // 시도 종료
    catch // 저장소 접근 실패
    { // 실패 시작
        return null; // 없음
    } // 실패 종료
} // 함수 종료

function getSnapshot(): AccountSession | null // 지금 세션(글이 바뀌었을 때만 새로 해석)
{ // 함수 시작
    const raw = readRaw(); // 저장된 글
    if (raw !== cachedRaw) // 바뀜
    { // 조건 시작
        cachedRaw = raw; // 글 기억
        cachedSession = readActiveSession(window.localStorage, getAccountServiceConfig().mode === "supabase"); // 세션 해석(지금 방식에 맞는 것만)
    } // 조건 종료
    return cachedSession; // 세션 반환
} // 함수 종료

function subscribe(onChange: () => void): () => void // 세션 변화 구독(같은 탭의 이벤트와 다른 탭의 저장 변화)
{ // 함수 시작
    window.addEventListener(ACCOUNT_SESSION_EVENT, onChange); // 같은 탭
    window.addEventListener("storage", onChange); // 다른 탭
    return () => // 구독 해제
    { // 해제 시작
        window.removeEventListener(ACCOUNT_SESSION_EVENT, onChange); // 같은 탭 해제
        window.removeEventListener("storage", onChange); // 다른 탭 해제
    }; // 해제 종료
} // 함수 종료

export function useAccountSession(): AccountSession | null // 지금 로그인한 계정(로그인하지 않았거나 서버에서 그릴 때는 없음)
{ // 함수 시작
    return useSyncExternalStore(subscribe, getSnapshot, () => null); // 세션 구독
} // 함수 종료
