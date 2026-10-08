"use client"; // 클라이언트 훅

import { useSyncExternalStore } from "react"; // 바깥 저장소 구독
import type { SyncStatus } from "@chatbot/lib/account/account-sync"; // 맞추기 상태

export interface ShownSyncStatus extends SyncStatus // 화면에 보여 주는 맞추기 상태
{ // 구조 시작
    mode: "practice" | "live" | null; // 연습용 서버인지 실제 서버인지(로그인하지 않았으면 없음)
} // 구조 종료

const idle: ShownSyncStatus = { phase: "idle", syncedAt: null, mode: null }; // 맞추지 않는 상태
let current: ShownSyncStatus = idle; // 지금 상태
const listeners = new Set<() => void>(); // 지켜보는 화면

export function setSyncStatus(next: ShownSyncStatus | null): void // 상태 바꾸기(null이면 맞추지 않는 상태로)
{ // 함수 시작
    current = next ?? idle; // 상태 반영
    listeners.forEach((listener) => listener()); // 화면에 알림
} // 함수 종료

function subscribe(listener: () => void): () => void // 상태 구독
{ // 함수 시작
    listeners.add(listener); // 등록
    return () => { listeners.delete(listener); }; // 해제
} // 함수 종료

export function useSyncStatus(): ShownSyncStatus // 지금 맞추기 상태
{ // 함수 시작
    return useSyncExternalStore(subscribe, () => current, () => idle); // 상태 구독
} // 함수 종료

export function describeSyncStatus(status: ShownSyncStatus): string // 상태를 한 줄 글로(번역 전 한국어)
{ // 함수 시작
    if (status.phase === "saved") // 저장됨
    { // 조건 시작
        return status.mode === "practice" ? "연습용 서버에 저장됨(이 브라우저 안)" : "서버에 저장됨"; // 연습용은 이 브라우저 안이라는 것을 알림
    } // 조건 종료
    if (status.phase === "signed-out") // 로그인이 끝남
    { // 조건 시작
        return "로그인이 끝났어요. 다시 로그인하면 서버에 이어서 저장해요."; // 다시 로그인 안내
    } // 조건 종료
    return status.phase === "syncing" ? "저장하는 중…" : status.phase === "offline" ? "서버에 저장하지 못했어요. 이 기기에는 저장돼 있어요." : status.phase === "conflict" ? "다른 기기에서 바뀐 내용과 겹쳤어요." : ""; // 나머지 상태
} // 함수 종료
