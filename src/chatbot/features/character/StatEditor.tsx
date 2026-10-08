"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { createStat, STAT_ICON_LIMIT, STAT_KEYWORD_LIMIT, STAT_LIMIT, STAT_NAME_LIMIT, STAT_RULE_LIMIT, statModes, statScopes } from "@chatbot/features/chat/stat-model"; // 스탯 규칙
import type { StatDefinition, StatScope } from "@chatbot/features/core/types"; // 스탯 타입
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function NumberField({ label, value, onChange, className }: { label: string; value: number; onChange(value: number): void; className?: string }) // 정수 입력(빈 칸·빼기 기호를 입력하는 중에도 글자 유지)
{ // 함수 시작
    const [text, setText] = useState(Number.isFinite(value) ? String(value) : ""); // 입력 글자
    const [last, setLast] = useState(value); // 마지막으로 알린 값
    if (!Object.is(value, last)) // 바깥에서 값이 바뀜
    { // 조건 시작
        setLast(value); // 기록
        setText(Number.isFinite(value) ? String(value) : ""); // 글자 맞추기
    } // 조건 종료
    return ( // 입력 반환
        <label className={className}>{label}<input inputMode="text" pattern="-?[0-9]*" value={text} onChange={(event) => // 입력
        { // 처리 시작
            const next = event.target.value.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "").slice(0, 7); // 숫자와 앞의 빼기만
            const parsed = /^-?\d+$/.test(next) ? Number(next) : Number.NaN; // 정수 변환
            setText(next); // 글자 반영
            setLast(parsed); // 기록
            onChange(parsed); // 값 알림
        }} /></label> // 입력 종료
    ); // 반환 종료
} // 함수 종료

export function StatEditor({ stats, relationStatId, disabled, onChange, onRelationChange }: { stats: StatDefinition[]; relationStatId: string | null; disabled: boolean; onChange(stats: StatDefinition[]): void; onRelationChange(statId: string | null): void }) // 제작자 스탯 편집(초기값·범위·정하는 방법·낱말 규칙·적용 대상·관계 스탯 지정)
{ // 함수 시작
    const update = (index: number, patch: Partial<StatDefinition>) => onChange(stats.map((stat, position) => position === index ? { ...stat, ...patch } : stat)); // 스탯 고치기
    return ( // 편집 반환
        <div className={styles.statEditor}> {/* 스탯 편집 */}
            <p className={styles.hint}>{t("호감도·신뢰도·체력처럼 대화하며 바뀌는 수치를 정해요. 초기값에서 시작해 규칙이나 AI 판단으로 매 턴 바뀌고 상태창(INFO)에 보여요.")}</p> {/* 안내 */}
            {stats.length === 0 ? null : ( // 목록 판정
                <ol className={styles.statList} aria-label={t("스탯 목록")}> {/* 스탯 목록 */}
                    {stats.map((stat, index) => // 스탯 순회
                    { // 순회 시작
                        const label = stat.name.trim().length === 0 ? t("스탯 {0}", [index + 1]) : stat.name.trim(); // 표시 이름
                        return ( // 카드 반환
                            <li key={stat.id}> {/* 스탯 */}
                                <fieldset className={styles.statCard} disabled={disabled}> {/* 스탯 카드 */}
                                    <legend>{stat.icon.length === 0 ? "" : `${stat.icon} `}{label}</legend> {/* 제목 */}
                                    <div className={styles.inlineFields}> {/* 이름·아이콘 */}
                                        <label className={styles.grow}>{t("이름")}<input value={stat.name} maxLength={STAT_NAME_LIMIT + 1} placeholder={t("예: 호감도")} onChange={(event) => update(index, { name: event.target.value })} /></label> {/* 이름 */}
                                        <label className={styles.narrow}>{t("아이콘")}<input value={stat.icon} maxLength={STAT_ICON_LIMIT} placeholder="❤️" onChange={(event) => update(index, { icon: event.target.value })} /></label> {/* 아이콘 */}
                                    </div> {/* 이름·아이콘 종료 */}
                                    <div className={styles.numberFields}> {/* 숫자 */}
                                        <NumberField label={t("초기값")} value={stat.initial} onChange={(value) => update(index, { initial: value })} /> {/* 초기값 */}
                                        <NumberField label={t("최솟값")} value={stat.min} onChange={(value) => update(index, { min: value })} /> {/* 최솟값 */}
                                        <NumberField label={t("최댓값")} value={stat.max} onChange={(value) => update(index, { max: value })} /> {/* 최댓값 */}
                                    </div> {/* 숫자 종료 */}
                                    <fieldset className={styles.modeGroup}> {/* 정하는 방법 */}
                                        <legend>{t("수치를 정하는 방법")}</legend> {/* 제목 */}
                                        {statModes.map((mode) => <label key={mode.id} data-selected={stat.mode === mode.id ? "true" : undefined}><input type="radio" name={`stat-mode-${stat.id}`} checked={stat.mode === mode.id} onChange={() => update(index, { mode: mode.id })} /><span><strong>{t(mode.label)}</strong><small>{t(mode.description)}</small></span></label>)} {/* 방법 */}
                                    </fieldset> {/* 방법 종료 */}
                                    {stat.mode === "ai" ? null : ( // 규칙 판정
                                        <div className={styles.ruleBox} role="group" aria-label={t("{0} 규칙", [label])}> {/* 규칙 */}
                                            <div className={styles.numberFields}><NumberField label={t("매 턴 변화")} value={stat.perTurn} onChange={(value) => update(index, { perTurn: value })} /></div> {/* 매 턴 */}
                                            <p className={styles.ruleTitle}>{t("낱말 규칙")} <small>{t("내 메시지에 이 낱말이 있으면 수치가 바뀌어요")}</small></p> {/* 낱말 규칙 제목 */}
                                            {stat.rules.map((rule, ruleIndex) => ( // 규칙 순회
                                                <div key={ruleIndex} className={styles.inlineFields}> {/* 규칙 줄 */}
                                                    <label className={styles.grow}>{t("낱말")} {ruleIndex + 1}<input value={rule.keyword} maxLength={STAT_KEYWORD_LIMIT + 1} placeholder={t("예: 선물")} onChange={(event) => update(index, { rules: stat.rules.map((item, position) => position === ruleIndex ? { ...item, keyword: event.target.value } : item) })} /></label> {/* 낱말 */}
                                                    <NumberField className={styles.narrow} label={t("변화")} value={rule.delta} onChange={(value) => update(index, { rules: stat.rules.map((item, position) => position === ruleIndex ? { ...item, delta: value } : item) })} /> {/* 변화 */}
                                                    <button type="button" className={styles.smallButton} aria-label={t("{0} 낱말 규칙 {1} 삭제", [label, ruleIndex + 1])} onClick={() => update(index, { rules: stat.rules.filter((_item, position) => position !== ruleIndex) })}>{t("삭제")}</button> {/* 삭제 */}
                                                </div> // 규칙 줄 종료
                                            ))} {/* 규칙 순회 종료 */}
                                            <button type="button" className={styles.smallButton} disabled={stat.rules.length >= STAT_RULE_LIMIT} onClick={() => update(index, { rules: [...stat.rules, { keyword: "", delta: 1 }] })}>{t("＋ 낱말 규칙")}</button> {/* 규칙 추가 */}
                                        </div> // 규칙 종료
                                    )} {/* 규칙 판정 종료 */}
                                    <div className={styles.numberFields}> {/* AI·대상 */}
                                        {stat.mode === "rule" ? null : <NumberField label={t("AI 한 턴 최대 변화")} value={stat.aiMaxChange} onChange={(value) => update(index, { aiMaxChange: value })} />} {/* AI 한도 */}
                                        <label>{t("적용 대상")}<select value={stat.scope} onChange={(event) => update(index, { scope: event.target.value as StatScope })}>{statScopes.map((scope) => <option key={scope.id} value={scope.id}>{t(scope.label)}</option>)}</select></label> {/* 대상 */}
                                    </div> {/* AI·대상 종료 */}
                                    {stat.scope !== "each" ? null : <label className={styles.relationRow}><input type="checkbox" checked={relationStatId === stat.id} onChange={(event) => onRelationChange(event.target.checked ? stat.id : null)} /><span><strong>{t("관계 스탯으로 쓰기")}</strong><small>{t("관계 단계(첫 만남 → 아는 사이 → 가까운 사이 → 특별한 사이), 대화방 목록의 관계 막대와 정렬이 이 값을 따라요. 작품마다 하나만 고를 수 있어요.")}</small></span></label>} {/* 관계 스탯 지정(인물마다 따로인 스탯만) */}
                                    <button type="button" className={styles.dangerButton} onClick={() => onChange(stats.filter((_item, position) => position !== index))}>{label} {t("스탯 삭제")}</button> {/* 삭제 */}
                                </fieldset> {/* 카드 종료 */}
                            </li> // 스탯 종료
                        ); // 카드 반환 종료
                    })} {/* 순회 종료 */}
                </ol> // 목록 종료
            )} {/* 목록 판정 종료 */}
            <button type="button" className={styles.smallButton} disabled={disabled || stats.length >= STAT_LIMIT} onClick={() => onChange([...stats, createStat(stats.length)])}>{t("＋ 스탯 추가 (")}{stats.length}/{STAT_LIMIT})</button> {/* 추가 */}
        </div> // 편집 종료
    ); // 반환 종료
} // 함수 종료
