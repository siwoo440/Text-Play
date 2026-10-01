"use client"; // 클라이언트 컴포넌트

import { useRef, useState, type ReactNode } from "react"; // 리액트 도구
import { canViewMatureContent, isAdultVerificationExpired, isAdultVerified } from "@chatbot/features/adult/adult-access"; // 성인 인증 판정
import { AdultVerificationDialog } from "@chatbot/features/adult/AdultVerificationDialog"; // 성인 인증 창
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소

export interface AdultAccess // 성인 콘텐츠 접근 도구
{ // 구조 시작
    verified: boolean; // 유효 인증 여부
    expired: boolean; // 만료 여부
    enabled: boolean; // 19세 콘텐츠 표시 여부
    enable(): void; // 켜기 요청
    disable(): void; // 끄기
    openVerification(): void; // 인증 창 열기
    revoke(): void; // 인증 해제
    dialog: ReactNode; // 인증 창 요소
} // 구조 종료

export function useAdultAccess({ enableOnVerify = true }: { enableOnVerify?: boolean } = {}): AdultAccess // 성인 콘텐츠 접근 훅
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const [dialogOpen, setDialogOpen] = useState(false); // 인증 창 상태
    const triggerRef = useRef<HTMLElement | null>(null); // 원래 초점 요소
    const now = new Date(); // 현재 시각
    const verified = isAdultVerified(state.profile, now); // 유효 인증 여부
    const openVerification = () => // 인증 창 열기
    { // 함수 시작
        triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; // 초점 요소 저장
        setDialogOpen(true); // 창 표시
    }; // 함수 종료
    const closeVerification = () => // 인증 창 닫기
    { // 함수 시작
        setDialogOpen(false); // 창 숨김
        queueMicrotask(() => triggerRef.current?.focus()); // 초점 복귀
    }; // 함수 종료
    const dialog = dialogOpen ? <AdultVerificationDialog onCancel={closeVerification} onVerified={(verification) => { dispatch({ type: "verify-adult", verification, enableMatureContent: enableOnVerify }); closeVerification(); }} /> : null; // 인증 창 요소
    return ( // 접근 도구 반환
    { // 도구 시작
        verified, // 인증 여부
        expired: isAdultVerificationExpired(state.profile, now), // 만료 여부
        enabled: canViewMatureContent(state, now), // 표시 여부
        enable: () => verified ? dispatch({ type: "set-mature-content", enabled: true, now: new Date().toISOString() }) : openVerification(), // 켜기 요청
        disable: () => dispatch({ type: "set-mature-content", enabled: false, now: new Date().toISOString() }), // 끄기
        openVerification, // 인증 창 열기
        revoke: () => dispatch({ type: "revoke-adult-verification" }), // 인증 해제
        dialog, // 인증 창
    }); // 도구 종료
} // 함수 종료
