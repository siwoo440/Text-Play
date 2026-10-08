"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react"; // 리액트 도구

const FOCUSABLE = "input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [href]"; // 초점을 받을 수 있는 요소

interface DialogFrameProps // 대화상자 틀 속성
{ // 구조 시작
    backdropClassName: string; // 배경 모양
    className: string; // 대화상자 모양
    labelledBy: string; // 제목 요소 식별자
    onClose(): void; // 닫기(Esc)
    children: ReactNode; // 내용
} // 구조 종료

export function DialogFrame({ backdropClassName, className, labelledBy, onClose, children }: DialogFrameProps) // 확인 대화상자 틀(열면 첫 버튼에 초점, Tab은 안에서만 돌고, Esc로 닫고, 닫으면 연 버튼으로 복귀)
{ // 함수 시작
    const dialogRef = useRef<HTMLElement>(null); // 대화상자 영역
    useEffect(() => // 열 때 초점·닫을 때 복귀
    { // 효과 시작
        const opener = document.activeElement as HTMLElement | null; // 연 버튼
        (dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? dialogRef.current)?.focus(); // 첫 조작 요소(취소)로 초점
        return () => opener?.focus?.(); // 연 버튼으로 복귀(지워졌으면 아무 일도 없음)
    }, []); // 처음 한 번
    const handleKey = (event: KeyboardEvent<HTMLElement>) => // 키 처리
    { // 함수 시작
        if (event.key === "Escape") // 닫기 판정
        { // 조건 시작
            event.preventDefault(); // 옆 패널까지 닫히지 않게 표시
            onClose(); // 닫기
            return; // 처리 종료
        } // 조건 종료
        if (event.key !== "Tab" || dialogRef.current === null) // 탭 이동 아님
        { // 조건 시작
            return; // 처리 종료
        } // 조건 종료
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)); // 조작 요소
        const first = focusable[0]; // 처음
        const last = focusable.at(-1); // 마지막
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) // 처음에서 뒤로
        { // 조건 시작
            event.preventDefault(); // 기본 이동 차단
            last?.focus(); // 마지막으로
        } // 조건 종료
        else if (!event.shiftKey && document.activeElement === last) // 마지막에서 앞으로
        { // 조건 시작
            event.preventDefault(); // 기본 이동 차단
            first?.focus(); // 처음으로
        } // 조건 종료
    }; // 함수 종료
    return ( // 대화상자 반환
        <div className={backdropClassName}> {/* 배경 */}
            <section ref={dialogRef} className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onKeyDown={handleKey}>{children}</section> {/* 대화상자 */}
        </div> // 배경 종료
    ); // 반환 종료
} // 함수 종료
