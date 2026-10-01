"use client"; // 클라이언트 컴포넌트

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react"; // 리액트 도구
import styles from "@chatbot/features/chat/ChatDialog.module.css"; // 대화상자 스타일

interface ChatDialogProps // 대화상자 속성
{ // 구조 시작
    title: string; // 제목
    description?: string; // 제목 아래 설명
    onClose(): void; // 닫기
    footer?: ReactNode; // 아래 버튼
    children: ReactNode; // 내용
    wide?: boolean; // 넓은 대화상자
} // 구조 종료

export function ChatDialog({ title, description, onClose, footer, children, wide = false }: ChatDialogProps) // 채팅 설정 대화상자
{ // 함수 시작
    const titleId = useId(); // 제목 식별자
    const panelRef = useRef<HTMLElement>(null); // 대화상자 영역
    useEffect(() => // 열 때 초점·닫을 때 복귀
    { // 효과 시작
        const opener = document.activeElement as HTMLElement | null; // 연 버튼
        const first = panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-dialog-close]), [href]"); // 첫 조작 요소
        (first ?? panelRef.current)?.focus(); // 초점 이동
        return () => opener?.focus?.(); // 연 버튼으로 복귀
    }, []); // 처음 한 번
    const handleKey = (event: KeyboardEvent<HTMLElement>) => // 키 처리
    { // 함수 시작
        if (event.key === "Escape") // 닫기 판정
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            onClose(); // 닫기
            return; // 처리 종료
        } // 조건 종료
        if (event.key !== "Tab" || panelRef.current === null) // 탭 이동 아님
        { // 조건 시작
            return; // 처리 종료
        } // 조건 종료
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [href]")); // 조작 요소
        const first = focusable[0]; // 처음
        const last = focusable.at(-1); // 마지막
        if (event.shiftKey && document.activeElement === first) // 처음에서 뒤로
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
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) { onClose(); } }}> {/* 배경(누르면 닫기) */}
            <section ref={panelRef} className={styles.dialog} data-wide={wide ? "true" : undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={handleKey}> {/* 대화상자 */}
                <header className={styles.header}> {/* 머리말 */}
                    <h2 id={titleId}>{title}</h2> {/* 제목 */}
                    <button type="button" className={styles.close} data-dialog-close="" aria-label={`${title} 닫기`} onClick={onClose}>×</button> {/* 닫기 */}
                </header> {/* 머리말 종료 */}
                {description === undefined ? null : <p className={styles.description}>{description}</p>} {/* 설명 */}
                <div className={styles.body}>{children}</div> {/* 내용 */}
                {footer === undefined ? null : <footer className={styles.footer}>{footer}</footer>} {/* 아래 버튼 */}
            </section> {/* 대화상자 종료 */}
        </div> // 배경 종료
    ); // 반환 종료
} // 함수 종료
