"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"; // 리액트 도구
import { createPortal } from "react-dom"; // 문서 최상단 표시
import { checkAdultAge, createMockAdultVerification, type AdultAgeCheck } from "@chatbot/features/adult/adult-access"; // 성인 인증 판정
import type { AdultVerification } from "@chatbot/features/core/types"; // 인증 타입
import styles from "@chatbot/features/adult/AdultAccess.module.css"; // 성인 인증 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface AdultVerificationDialogProps // 인증 창 속성
{ // 구조 시작
    onCancel(): void; // 취소 처리
    onVerified(verification: AdultVerification): void; // 인증 완료 처리
} // 구조 종료

const ageErrors: Record<Exclude<AdultAgeCheck, { ok: true }>["reason"], string> = // 나이 확인 오류 문구
{ // 문구 시작
    "invalid-date": "생년월일을 올바르게 입력해 주세요.", // 날짜 오류
    "future-date": "오늘 이후 날짜는 생년월일로 입력할 수 없습니다.", // 미래 오류
    minor: "청소년 보호법에 따라 19세 미만은 성인 인증을 받을 수 없습니다.", // 미성년 오류
}; // 문구 종료

function toDateInputValue(date: Date): string // 날짜 입력 값 변환
{ // 함수 시작
    const pad = (value: number) => String(value).padStart(2, "0"); // 두 자리 변환
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; // 날짜 문자열 반환
} // 함수 종료

export function AdultVerificationDialog({ onCancel, onVerified }: AdultVerificationDialogProps) // 모의 성인 인증 창
{ // 함수 시작
    const dialogRef = useRef<HTMLElement>(null); // 대화상자 참조
    const [birthDate, setBirthDate] = useState(""); // 생년월일 입력
    const [consent, setConsent] = useState(false); // 이용 동의
    const [error, setError] = useState(""); // 오류 문구
    const [errorField, setErrorField] = useState<"birth" | "consent">("birth"); // 오류가 난 칸(문구의 글자로 가리면 영어 화면에서 틀림)
    const [today] = useState(() => toDateInputValue(new Date())); // 오늘 날짜
    useEffect(() => // 첫 입력 초점
    { // 효과 시작
        dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus(); // 생년월일 초점
    }, []); // 최초 실행
    const trapFocus = (event: KeyboardEvent<HTMLElement>) => // 초점 고정 처리
    { // 함수 시작
        if (event.key === "Escape") // 닫기 키 확인
        { // 조건 시작
            event.preventDefault(); // 기본 동작 차단
            event.stopPropagation(); // 패널 닫기 전파 차단
            onCancel(); // 창 닫기
            return; // 처리 종료
        } // 조건 종료
        if (event.key !== "Tab" || dialogRef.current === null) // 탭 이동 확인
        { // 조건 시작
            return; // 처리 생략
        } // 조건 종료
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("input, button")); // 초점 요소 수집
        const first = controls[0]; // 첫 요소
        const last = controls.at(-1); // 마지막 요소
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
    const submit = (event: FormEvent<HTMLFormElement>) => // 인증 제출
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        const now = new Date(); // 현재 시각
        const check = checkAdultAge(birthDate, now); // 나이 확인
        if (!check.ok) // 확인 실패 판정
        { // 조건 시작
            setError(t(ageErrors[check.reason])); // 오류 표시(화면 언어로)
            setErrorField("birth"); // 생년월일 칸의 오류
            return; // 인증 중단
        } // 조건 종료
        if (!consent) // 동의 누락 판정
        { // 조건 시작
            setError(t("19세 이상 이용 동의에 체크해 주세요.")); // 동의 오류
            setErrorField("consent"); // 동의 칸의 오류
            return; // 인증 중단
        } // 조건 종료
        setBirthDate(""); // 생년월일 즉시 비우기
        onVerified(createMockAdultVerification(now)); // 인증 완료 전달
    }; // 함수 종료
    return createPortal( // 문서 최상단 표시
        <div className={styles.backdrop}> {/* 대화상자 배경 */}
            <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="adult-verification-title" aria-describedby="adult-verification-description" onKeyDown={trapFocus}> {/* 인증 대화상자 */}
                <div className={styles.dialogHead}> {/* 머리말 */}
                    <span className={styles.ageMark} aria-hidden="true">19</span> {/* 등급 표시 */}
                    <div> {/* 제목 묶음 */}
                        <p className={styles.eyebrow}>ADULT VERIFICATION</p> {/* 영문 표제 */}
                        <h2 id="adult-verification-title">{t("성인 인증")}</h2> {/* 창 제목 */}
                    </div> {/* 제목 묶음 종료 */}
                    <button type="button" className={styles.close} aria-label={t("성인 인증 창 닫기")} onClick={onCancel}>×</button> {/* 닫기 버튼 */}
                </div> {/* 머리말 종료 */}
                <p id="adult-verification-description" className={styles.lead}>{t("19세 이용가 캐릭터와 대화를 보려면 성인 인증이 필요합니다.")}</p> {/* 창 설명 */}
                <div className={styles.mockNotice} role="note"><strong>{t("모의 인증")}</strong><span>{t("지금은 Mock 단계라 실제 본인확인을 하지 않습니다. 정식 서비스에서는 휴대폰 본인인증으로 바뀝니다.")}</span></div> {/* Mock 안내 */}
                <form className={styles.form} onSubmit={submit} noValidate> {/* 인증 폼 */}
                    <label className={styles.field}><span>{t("생년월일")}</span><input type="date" value={birthDate} min="1900-01-01" max={today} aria-invalid={error.length > 0 && errorField === "birth"} onChange={(event) => { setBirthDate(event.target.value); setError(""); }} /></label> {/* 생년월일 입력 */}
                    <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(""); }} /><span>{t("19세 이상이며, 19세 이용가 콘텐츠를 보는 데 동의합니다.")}</span></label> {/* 이용 동의 */}
                    <ul className={styles.facts}> {/* 인증 안내 */}
                        <li>{t("생년월일은 나이 확인에만 쓰고 저장하지 않습니다.")}</li> {/* 저장 안내 */}
                        <li>{t("인증은 1년 동안 유효하고, 만료되면 다시 인증해야 합니다.")}</li> {/* 유효 기간 */}
                        <li>{t("청소년 보호법 기준으로 19세가 되는 해의 1월 1일부터 인증할 수 있습니다.")}</li> {/* 나이 기준 */}
                    </ul> {/* 안내 종료 */}
                    {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 문구 */}
                    <div className={styles.actions}> {/* 동작 */}
                        <button type="button" className={styles.secondary} onClick={onCancel}>{t("취소")}</button> {/* 취소 버튼 */}
                        <button type="submit" className={styles.primary}>{t("인증하기")}</button> {/* 인증 버튼 */}
                    </div> {/* 동작 종료 */}
                </form> {/* 폼 종료 */}
            </section> {/* 대화상자 종료 */}
        </div>, // 배경 종료
        document.body, // 표시 위치
    ); // 반환 종료
} // 함수 종료
