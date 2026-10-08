"use client"; // 클라이언트 컴포넌트

import { useState, type ReactNode } from "react"; // 리액트 도구
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export interface EditorStepDefinition // 편집 단계 정의
{ // 구조 시작
    id: string; // 단계 식별자
    label: string; // 단계 이름
    hint: string; // 단계 설명
    fields: readonly string[]; // 이 단계에 있는 입력(오류가 난 단계를 찾을 때 씀)
} // 구조 종료

export interface EditorStepController // 편집 단계 조작
{ // 구조 시작
    mode: "steps" | "all"; // 단계별로 보기·전체 펼쳐 보기
    current: string; // 지금 단계
    isVisible(id: string): boolean; // 그 단계를 보여 줄지
    select(id: string): void; // 단계 고르기
    toggleMode(): void; // 보기 방식 바꾸기
    next(): void; // 다음 단계
    previous(): void; // 이전 단계
    showErrors(errors: Record<string, unknown>): void; // 오류가 난 첫 단계로 이동
} // 구조 종료

export function useEditorSteps(steps: readonly EditorStepDefinition[], startExpanded: boolean): EditorStepController // 편집 단계 상태(새로 만들 때는 단계별, 수정할 때는 전체 보기로 시작)
{ // 함수 시작
    const [mode, setMode] = useState<"steps" | "all">(startExpanded ? "all" : "steps"); // 보기 방식
    const [current, setCurrent] = useState(steps[0]?.id ?? ""); // 지금 단계
    const index = Math.max(0, steps.findIndex((step) => step.id === current)); // 지금 위치
    const select = (id: string) => // 단계 고르기
    { // 함수 시작
        setCurrent(id); // 단계 이동
        if (mode === "all") // 전체 보기에서는 그 자리로 이동
        { // 조건 시작
            document.getElementById(`editor-step-${id}`)?.scrollIntoView?.({ block: "start" }); // 화면 이동(지원할 때만)
        } // 조건 종료
    }; // 함수 종료
    return ( // 조작 반환
    { // 조작 시작
        mode, // 보기 방식
        current, // 지금 단계
        isVisible: (id) => mode === "all" || id === current, // 보임 판정
        select, // 단계 고르기
        toggleMode: () => setMode(mode === "all" ? "steps" : "all"), // 보기 방식 바꾸기
        next: () => setCurrent(steps[Math.min(steps.length - 1, index + 1)]?.id ?? current), // 다음 단계
        previous: () => setCurrent(steps[Math.max(0, index - 1)]?.id ?? current), // 이전 단계
        showErrors: (errors) => // 오류가 난 첫 단계로 이동
        { // 함수 시작
            const target = steps.find((step) => step.fields.some((field) => errors[field] !== undefined)); // 오류 단계
            if (target !== undefined) // 오류 단계 있음
            { // 조건 시작
                setCurrent(target.id); // 그 단계로
            } // 조건 종료
        }, // 함수 종료
    }); // 조작 종료
} // 함수 종료

export function EditorStepNav({ steps, controller, errors }: { steps: readonly EditorStepDefinition[]; controller: EditorStepController; errors: Record<string, unknown> }) // 단계 이동 줄과 보기 방식 전환
{ // 함수 시작
    return ( // 이동 줄 반환
        <nav className={styles.stepNav} aria-label={t("편집 단계")}> {/* 편집 단계 */}
            <ol> {/* 단계 목록 */}
                {steps.map((step, index) => // 단계 순회
                { // 순회 시작
                    const hasError = step.fields.some((field) => errors[field] !== undefined); // 확인할 입력 여부
                    return <li key={step.id}><button type="button" aria-current={controller.mode === "steps" && controller.current === step.id ? "step" : undefined} data-error={hasError ? "true" : undefined} onClick={() => controller.select(step.id)}><span aria-hidden="true">{index + 1}</span>{t(step.label)}{hasError ? <span className="sr-only">{t(", 확인할 입력 있음")}</span> : null}</button></li>; // 단계 버튼
                })} {/* 순회 종료 */}
            </ol> {/* 목록 종료 */}
            <button type="button" className={styles.stepMode} aria-pressed={controller.mode === "all"} onClick={controller.toggleMode}>{controller.mode === "all" ? t("단계별로 보기") : t("전체 펼쳐 보기")}</button> {/* 보기 방식 */}
        </nav> // 편집 단계 종료
    ); // 반환 종료
} // 함수 종료

export function EditorStepSection({ steps, step, controller, children }: { steps: readonly EditorStepDefinition[]; step: EditorStepDefinition; controller: EditorStepController; children: ReactNode }) // 한 단계의 입력 묶음
{ // 함수 시작
    const index = steps.findIndex((item) => item.id === step.id); // 단계 위치
    return ( // 묶음 반환
        <section className={styles.step} id={`editor-step-${step.id}`} aria-labelledby={`editor-step-${step.id}-title`} hidden={!controller.isVisible(step.id)}> {/* 단계 */}
            <div className={styles.stepHead}><h2 id={`editor-step-${step.id}-title`}><span>{index + 1}/{steps.length}</span>{t(step.label)}</h2><p>{t(step.hint)}</p></div> {/* 단계 제목과 설명 */}
            {children} {/* 입력 */}
            {controller.mode !== "steps" ? null : ( // 단계 이동 판정
                <div className={styles.stepActions}> {/* 단계 이동 */}
                    {index === 0 ? <span /> : <button type="button" className={styles.smallButton} onClick={controller.previous}>{t("‹ 이전 단계")}</button>} {/* 이전 */}
                    {index >= steps.length - 1 ? <span className={styles.hint}>{t("마지막 단계예요. 아래에서 저장해 주세요.")}</span> : <button type="button" className={styles.smallButton} data-next="true" onClick={controller.next}>{t("다음 단계 ›")}</button>} {/* 다음 */}
                </div> // 단계 이동 종료
            )} {/* 판정 종료 */}
        </section> // 단계 종료
    ); // 반환 종료
} // 함수 종료
