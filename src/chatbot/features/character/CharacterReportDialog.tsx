"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, type KeyboardEvent } from "react"; // 리액트 도구
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import { reportReasonOptions } from "@chatbot/features/character/report-reasons"; // 신고 사유 목록
import type { ReportReason } from "@chatbot/features/core/types"; // 신고 사유 타입
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

const reasons = reportReasonOptions; // 신고 사유 목록(설정의 신고 기록과 같은 이름)

interface CharacterReportDialogProps // 신고 창 속성
{ // 구조 시작
    characterName: string; // 캐릭터 이름
    reason: ReportReason; // 선택 사유
    onReasonChange(reason: ReportReason): void; // 사유 변경 처리
    onCancel(): void; // 취소 처리
    onSubmit(): void; // 저장 처리
} // 구조 종료

export function CharacterReportDialog({ characterName, reason, onReasonChange, onCancel, onSubmit }: CharacterReportDialogProps) // 캐릭터 신고 창
{ // 함수 시작
    const dialogRef = useRef<HTMLElement>(null); // 대화상자 참조
    useEffect(() => // 대화상자 초점 설정
    { // 효과 시작
        dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus(); // 첫 사유 초점
    }, []); // 최초 실행
    const trapFocus = (event: KeyboardEvent<HTMLElement>) => // 초점 고정 처리
    { // 함수 시작
        if (event.key === "Escape") // 닫기 키 확인
        { // 조건 시작
            event.preventDefault(); // 기본 동작 차단
            onCancel(); // 대화상자 닫기
            return; // 처리 종료
        } // 조건 종료
        if (event.key !== "Tab" || dialogRef.current === null) // 탭 이동 확인
        { // 조건 시작
            return; // 처리 생략
        } // 조건 종료
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("input, button")); // 초점 요소 수집
        const first = controls[0]; // 첫 요소 조회
        const last = controls.at(-1); // 마지막 요소 조회
        if (first === undefined || last === undefined) // 요소 부재 확인
        { // 조건 시작
            return; // 처리 생략
        } // 조건 종료
        if (event.shiftKey && document.activeElement === first) // 역방향 끝 확인
        { // 조건 시작
            event.preventDefault(); // 기본 이동 차단
            last.focus(); // 마지막 요소 이동
        } // 조건 종료
        else if (!event.shiftKey && document.activeElement === last) // 정방향 끝 확인
        { // 조건 시작
            event.preventDefault(); // 기본 이동 차단
            first.focus(); // 첫 요소 이동
        } // 조건 종료
    }; // 함수 종료
    return ( // 신고 창 반환
        <div className={styles.dialogBackdrop}> {/* 대화상자 배경 */}
            <section ref={dialogRef} className={styles.reportDialog} role="dialog" aria-modal="true" aria-labelledby="report-title" onKeyDown={trapFocus}> {/* 신고 대화상자 */}
                <div className={styles.reportHeader}> {/* 신고 머리말 */}
                    <div><span className={styles.eyebrow}>REPORT</span><h2 id="report-title">{t("캐릭터 신고")}</h2></div> {/* 신고 제목 */}
                    <button type="button" aria-label={t("신고 창 닫기")} onClick={onCancel}>×</button> {/* 닫기 버튼 */}
                </div> {/* 머리말 종료 */}
                <p><strong>{characterName}</strong>{t("에서 확인한 문제를 선택해 주세요. 신고 내용은 이 브라우저에만 저장됩니다.")}</p> {/* 신고 안내 */}
                <fieldset className={styles.reportReasons}> {/* 신고 사유 목록 */}
                    <legend>{t("신고 사유")}</legend> {/* 사유 표제 */}
                    {reasons.map((item) => ( // 사유 순회
                        <label key={item.id}> {/* 사유 항목 */}
                            <input type="radio" name="report-reason" value={item.id} aria-label={t(item.label)} checked={reason === item.id} onChange={() => onReasonChange(item.id)} /> {/* 사유 선택 */}
                            <span><strong>{t(item.label)}</strong><small>{t(item.description)}</small></span> {/* 사유 설명 */}
                        </label> // 사유 항목 종료
                    ))} {/* 순회 종료 */}
                </fieldset> {/* 사유 목록 종료 */}
                <div className={styles.reportActions}> {/* 신고 동작 */}
                    <button type="button" onClick={onCancel}>{t("취소")}</button> {/* 취소 버튼 */}
                    <button type="button" onClick={onSubmit}>{t("신고 접수")}</button> {/* 접수 버튼 */}
                </div> {/* 동작 종료 */}
            </section> {/* 대화상자 종료 */}
        </div> // 배경 종료
    ); // 반환 종료
} // 함수 종료
