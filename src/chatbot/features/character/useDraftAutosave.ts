"use client"; // 클라이언트 훅

import { useEffect, useState } from "react"; // 리액트 도구
import { clearDraft, loadDraft, saveDraft, type StoredDraft } from "@chatbot/features/character/draft-storage"; // 초안 보관
import { getAppStorage } from "@chatbot/lib/account/scoped-storage"; // 로그인한 계정의 저장 칸

export const DRAFT_AUTOSAVE_DELAY = 700; // 입력이 멈춘 뒤 보관까지 기다리는 시간(ms)

export interface DraftAutosave<T> // 자동 저장 상태
{ // 구조 시작
    stored: StoredDraft<T> | null; // 예전에 보관해 둔 초안(이어 쓸지 묻는 동안만 있음)
    savedAt: string | null; // 이번에 마지막으로 보관한 시각
    restore(): T | null; // 보관한 초안을 꺼내 이어 쓰기
    discard(): void; // 보관한 초안 지우기
    clear(): void; // 저장을 마친 뒤 보관분 지우기
} // 구조 종료

export function useDraftAutosave<T extends object>(key: string, draft: T, dirty: boolean, base: T): DraftAutosave<T> // 작성 중 자동 저장(입력이 멈추면 보관, 저장하면 지움. 로그인했으면 그 계정의 칸에 둠)
{ // 함수 시작
    const [stored, setStored] = useState<StoredDraft<T> | null>(() => typeof window === "undefined" ? null : loadDraft(getAppStorage(), key, base)); // 예전 보관분(로그인한 계정의 칸)
    const [savedAt, setSavedAt] = useState<string | null>(null); // 이번 보관 시각
    useEffect(() => // 입력이 멈추면 보관
    { // 효과 시작
        if (!dirty || stored !== null) // 변경 없음·이어 쓸지 아직 안 정함
        { // 조건 시작
            return; // 보관 생략
        } // 조건 종료
        const timer = window.setTimeout(() => // 잠시 뒤 보관
        { // 보관 시작
            const now = new Date().toISOString(); // 보관 시각
            if (saveDraft(getAppStorage(), key, draft, now)) // 보관 성공
            { // 조건 시작
                setSavedAt(now); // 시각 표시
            } // 조건 종료
        }, DRAFT_AUTOSAVE_DELAY); // 대기 시간
        return () => window.clearTimeout(timer); // 입력이 이어지면 다시 기다림
    }, [dirty, draft, key, stored]); // 초안 변경 의존
    return ( // 상태 반환
    { // 상태 시작
        stored, // 예전 보관분
        savedAt, // 이번 보관 시각
        restore: () => // 이어 쓰기
        { // 함수 시작
            const value = stored?.draft ?? null; // 보관 초안
            setStored(null); // 묻기 끝
            return value; // 초안 반환
        }, // 함수 종료
        discard: () => // 지우기
        { // 함수 시작
            clearDraft(getAppStorage(), key); // 보관분 삭제
            setStored(null); // 묻기 끝
        }, // 함수 종료
        clear: () => // 저장 뒤 정리
        { // 함수 시작
            clearDraft(getAppStorage(), key); // 보관분 삭제
            setSavedAt(null); // 시각 지움
        }, // 함수 종료
    }); // 상태 종료
} // 함수 종료
