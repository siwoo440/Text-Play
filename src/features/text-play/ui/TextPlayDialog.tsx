"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, type MouseEvent, type ReactElement, type ReactNode } from "react"; // 리액트 대화상자 도구
import { createPortal } from "react-dom"; // 포털 생성기
import styles from "@/features/text-play/ui/TextPlayDialog.module.css"; // 대화상자 스타일

interface TextPlayDialogProps // 대화상자 속성
{ // 구조 시작
    labelledBy: string; // 제목 식별자
    describedBy?: string; // 설명 식별자
    open: boolean; // 열림 상태
    onClose(): void; // 닫기 처리
    children: ReactNode; // 대화상자 내용
} // 구조 종료

const FOCUSABLE_SELECTOR = "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"; // 초점 요소 선택자

export function TextPlayDialog({ labelledBy, describedBy, open, onClose, children }: TextPlayDialogProps): ReactElement | null // 공통 대화상자
{ // 함수 시작
    const panelRef = useRef<HTMLDivElement | null>(null); // 패널 참조
    const backdropRef = useRef<HTMLDivElement | null>(null); // 배경 참조
    useEffect(() => // 대화상자 효과
    { // 효과 시작
        if (!open) // 닫힘 확인
        { // 조건 시작
            return; // 효과 생략
        } // 조건 종료
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; // 이전 초점 저장
        const previousOverflow = document.body.style.overflow; // 이전 넘침 저장
        const backgroundElements = [...document.body.children].filter((element) => element !== backdropRef.current); // 배경 요소 조회
        const previousInertStates = backgroundElements.map((element) => element.hasAttribute("inert")); // 기존 비활성 상태
        const handleKeyDown = (event: KeyboardEvent) => // 키 입력 처리
        { // 함수 시작
            if (event.key === "Escape") // 닫기 키 확인
            { // 조건 시작
                onClose(); // 대화상자 닫기
                return; // 처리 종료
            } // 조건 종료
            if (event.key !== "Tab" || panelRef.current === null) // 순환 키 확인
            { // 조건 시작
                return; // 처리 생략
            } // 조건 종료
            const focusableElements = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]; // 활성 요소 목록
            if (focusableElements.length === 0) // 활성 요소 확인
            { // 조건 시작
                event.preventDefault(); // 기본 이동 차단
                panelRef.current.focus(); // 패널 초점 유지
                return; // 처리 종료
            } // 조건 종료
            const firstElement = focusableElements[0]; // 첫 활성 요소
            const lastElement = focusableElements.at(-1) ?? firstElement; // 마지막 활성 요소
            const activeElement = document.activeElement; // 현재 초점 요소
            if (event.shiftKey && (activeElement === firstElement || !panelRef.current.contains(activeElement))) // 이전 순환 확인
            { // 조건 시작
                event.preventDefault(); // 기본 이동 차단
                lastElement.focus(); // 마지막 요소 이동
                return; // 처리 종료
            } // 조건 종료
            if (!event.shiftKey && activeElement === lastElement) // 다음 순환 확인
            { // 조건 시작
                event.preventDefault(); // 기본 이동 차단
                firstElement.focus(); // 첫 요소 이동
            } // 조건 종료
        }; // 함수 종료
        document.body.style.overflow = "hidden"; // 배경 스크롤 차단
        backgroundElements.forEach((element) => element.setAttribute("inert", "")); // 배경 조작 차단
        document.addEventListener("keydown", handleKeyDown); // 키 입력 연결
        const initialFocus = panelRef.current?.querySelector<HTMLElement>("[data-dialog-initial]:not(:disabled)") ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panelRef.current; // 초기 초점 조회
        initialFocus?.focus(); // 초기 초점 이동
        return () => // 효과 정리
        { // 정리 시작
            document.body.style.overflow = previousOverflow; // 배경 스크롤 복원
            backgroundElements.forEach((element, index) => // 배경 요소 순회
            { // 순회 시작
                if (!previousInertStates[index]) // 기존 활성 확인
                { // 조건 시작
                    element.removeAttribute("inert"); // 배경 조작 복원
                } // 조건 종료
            }); // 순회 종료
            document.removeEventListener("keydown", handleKeyDown); // 키 입력 해제
            previousFocus?.focus(); // 이전 초점 복원
        }; // 정리 종료
    }, [onClose, open]); // 열림 상태 의존
    if (!open) // 닫힘 확인
    { // 조건 시작
        return null; // 미출력 반환
    } // 조건 종료
    const closeBackdrop = (event: MouseEvent<HTMLDivElement>) => // 배경 클릭 처리
    { // 함수 시작
        if (event.target === event.currentTarget) // 직접 배경 확인
        { // 조건 시작
            onClose(); // 대화상자 닫기
        } // 조건 종료
    }; // 함수 종료
    return createPortal( // 대화상자 포털 반환
        <div ref={backdropRef} className={styles.backdrop} role="presentation" onMouseDown={closeBackdrop}> {/* 대화상자 배경 */}
            <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}> {/* 대화상자 패널 */}
                <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>×</button> {/* 닫기 버튼 */}
                {children} {/* 대화상자 내용 */}
            </div> {/* 패널 종료 */}
        </div>, // 배경 종료
        document.body, // 포털 대상
    ); // 포털 반환 종료
} // 함수 종료
