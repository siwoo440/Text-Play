"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import type { WorkExtrasErrors } from "@chatbot/features/character/work-extras"; // 추가 필드 오류
import { cleanKeywords, createExample, createLoreEntry, EXAMPLE_LIMIT, EXAMPLE_REPLY_LIMIT, EXAMPLE_USER_LIMIT, LORE_ACTIVE_LIMIT, LORE_CONTENT_LIMIT, LORE_KEYWORD_LIMIT, LORE_LIMIT, LORE_SCAN_MESSAGES, LORE_TITLE_LIMIT } from "@chatbot/features/chat/lore-model"; // 설정집·예시 대화 규칙
import type { WorkExtras } from "@chatbot/features/core/defaults"; // 작품 추가 필드
import type { ExampleDialogue, LoreEntry } from "@chatbot/features/core/types"; // 설정집 타입
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

function LoreCard({ entry, index, onChange, onRemove }: { entry: LoreEntry; index: number; onChange(patch: Partial<LoreEntry>): void; onRemove(): void }) // 설정 한 개(다 채운 설정은 접어서 시작)
{ // 함수 시작
    const [open, setOpen] = useState(() => entry.title.trim().length === 0 || entry.content.trim().length === 0); // 덜 채운 설정은 펼쳐서 시작
    const title = entry.title.trim(); // 설정 이름
    const label = title.length === 0 ? t("설정 {0}", [index + 1]) : title; // 표시 이름
    const keywords = cleanKeywords(entry.keywords); // 정리한 키워드
    return ( // 카드 반환
        <li> {/* 설정 */}
            <fieldset className={styles.statCard}> {/* 설정 카드 */}
                <legend>{label}</legend> {/* 제목 */}
                {open ? ( // 펼침 판정
                    <> {/* 입력 묶음 */}
                        <div className={styles.inlineFields}> {/* 이름·키워드 */}
                            <label>{t("설정 이름")}<input value={entry.title} maxLength={LORE_TITLE_LIMIT + 1} placeholder={t("예: 달빛 도서관")} onChange={(event) => onChange({ title: event.target.value })} /></label> {/* 이름 */}
                            <label className={styles.grow}>{t("키워드")}<input value={entry.keywords.join(",")} placeholder={t("쉼표로 구분 · 예: 도서관, 금서")} onChange={(event) => onChange({ keywords: event.target.value.split(",") })} /></label> {/* 키워드 */}
                        </div> {/* 이름·키워드 종료 */}
                        <label className={styles.loreField}>{t("설정 내용")}<textarea value={entry.content} rows={3} maxLength={LORE_CONTENT_LIMIT + 1} placeholder={t("예: 달빛 도서관은 자정에만 문이 열리고, 금서 구역은 사서만 들어갈 수 있다.")} onChange={(event) => onChange({ content: event.target.value })} /></label> {/* 내용 */}
                    </> // 입력 묶음 종료
                ) : <p className={styles.hint}>{t("키워드:")} {keywords.length === 0 ? t("없음") : keywords.join(", ")}</p>} {/* 접었을 때 요약 */}
                <div className={styles.cardActions}> {/* 카드 동작 */}
                    <span className={styles.loreCount}>{t("내용")} {entry.content.trim().length}/{LORE_CONTENT_LIMIT}{t("자")}</span> {/* 글자 수 */}
                    <button type="button" className={styles.smallButton} aria-expanded={open} aria-label={`${label} ${open ? t("접기") : t("펼치기")}`} onClick={() => setOpen(!open)}>{open ? t("접기") : t("펼치기")}</button> {/* 접기·펼치기(읽어 주는 이름에는 설정 이름을 붙임) */}
                    <button type="button" className={styles.dangerButton} aria-label={t("{0} 삭제", [title.length === 0 ? label : t("{0} 설정", [label])])} onClick={onRemove}>{t("삭제")}</button> {/* 삭제(읽어 주는 이름은 ‘○○ 설정 삭제’, 이름이 없으면 ‘설정 N 삭제’) */}
                </div> {/* 카드 동작 종료 */}
            </fieldset> {/* 카드 종료 */}
        </li> // 설정 종료
    ); // 반환 종료
} // 함수 종료

export function LoreEditor({ lorebook, onChange }: { lorebook: LoreEntry[]; onChange(lorebook: LoreEntry[]): void }) // 키워드 설정집 편집(키워드가 대화에 나오면 그 설정만 AI에게 넘김)
{ // 함수 시작
    return ( // 편집 반환
        <div className={styles.statEditor}> {/* 설정집 편집 */}
            <p className={styles.hint}>{t("세계관의 장소·인물·규칙처럼 필요할 때만 꺼내 쓸 설정을 적어 두세요. 최근 대화")} {LORE_SCAN_MESSAGES}{t("개 안에 키워드가 나오면 그 설정만 AI에게 알려 줘요(한 번에")} {LORE_ACTIVE_LIMIT}{t("개까지). 사용자에게는 보이지 않아요. 키워드는 설정마다")} {LORE_KEYWORD_LIMIT}{t("개까지 적을 수 있어요.")}</p> {/* 안내 */}
            {lorebook.length === 0 ? null : ( // 목록 판정
                <ol className={styles.statList} aria-label={t("설정집 목록")}> {/* 설정 목록 */}
                    {lorebook.map((entry, index) => <LoreCard key={entry.id} entry={entry} index={index} onChange={(patch) => onChange(lorebook.map((item) => item.id === entry.id ? { ...item, ...patch } : item))} onRemove={() => onChange(lorebook.filter((item) => item.id !== entry.id))} />)} {/* 설정 순회 */}
                </ol> // 목록 종료
            )} {/* 목록 판정 종료 */}
            <button type="button" className={styles.smallButton} disabled={lorebook.length >= LORE_LIMIT} onClick={() => onChange([...lorebook, createLoreEntry()])}>{t("＋ 설정 추가 (")}{lorebook.length}/{LORE_LIMIT})</button> {/* 추가 */}
        </div> // 편집 종료
    ); // 반환 종료
} // 함수 종료

export function ExampleEditor({ examples, replyLabel, onChange }: { examples: ExampleDialogue[]; replyLabel: string; onChange(examples: ExampleDialogue[]): void }) // 예시 대화 편집(말투를 보여 주는 짧은 대화)
{ // 함수 시작
    const update = (id: string, patch: Partial<ExampleDialogue>) => onChange(examples.map((example) => example.id === id ? { ...example, ...patch } : example)); // 예시 고치기
    return ( // 편집 반환
        <div className={styles.statEditor}> {/* 예시 대화 편집 */}
            <p className={styles.hint}>{t("말투와 분위기를 보여 주는 짧은 대화를 적어 주세요. AI가 이 말투를 참고해서 답해요. 사용자에게는 보이지 않아요.")}</p> {/* 안내 */}
            {examples.length === 0 ? null : ( // 목록 판정
                <ol className={styles.statList} aria-label={t("예시 대화 목록")}> {/* 예시 목록 */}
                    {examples.map((example, index) => ( // 예시 순회
                        <li key={example.id}> {/* 예시 */}
                            <fieldset className={styles.statCard}> {/* 예시 카드 */}
                                <legend>{t("예시")} {index + 1}</legend> {/* 제목 */}
                                <label className={styles.loreField}>{t("사용자 말")}<textarea value={example.user} rows={2} maxLength={EXAMPLE_USER_LIMIT + 1} placeholder={t("예: 오늘 뭐 하고 있었어?")} onChange={(event) => update(example.id, { user: event.target.value })} /></label> {/* 사용자 말 */}
                                <label className={styles.loreField}>{replyLabel}<textarea value={example.reply} rows={3} maxLength={EXAMPLE_REPLY_LIMIT + 1} placeholder={t("예: 책을 정리하고 있었어. 네가 올 줄 알고 자리를 비워 뒀지.")} onChange={(event) => update(example.id, { reply: event.target.value })} /></label> {/* 답 */}
                                <div className={styles.cardActions}> {/* 카드 동작 */}
                                    <span className={styles.loreCount}>{t("답")} {example.reply.trim().length}/{EXAMPLE_REPLY_LIMIT}{t("자")}</span> {/* 글자 수 */}
                                    <button type="button" className={styles.dangerButton} onClick={() => onChange(examples.filter((item) => item.id !== example.id))}>{t("예시")} {index + 1} {t("삭제")}</button> {/* 삭제 */}
                                </div> {/* 카드 동작 종료 */}
                            </fieldset> {/* 카드 종료 */}
                        </li> // 예시 종료
                    ))} {/* 순회 종료 */}
                </ol> // 목록 종료
            )} {/* 목록 판정 종료 */}
            <button type="button" className={styles.smallButton} disabled={examples.length >= EXAMPLE_LIMIT} onClick={() => onChange([...examples, createExample()])}>{t("＋ 예시 추가 (")}{examples.length}/{EXAMPLE_LIMIT})</button> {/* 추가 */}
        </div> // 편집 종료
    ); // 반환 종료
} // 함수 종료

export function WorkLoreFields({ value, errors, replyLabel, onChange }: { value: Pick<WorkExtras, "lorebook" | "examples">; errors: WorkExtrasErrors; replyLabel: string; onChange(patch: Partial<Pick<WorkExtras, "lorebook" | "examples">>): void }) // 키워드 설정집·예시 대화 입력
{ // 함수 시작
    return ( // 입력 반환
        <> {/* 묶음 */}
            <fieldset className={styles.optionGroup}> {/* 키워드 설정집 */}
                <legend>{t("키워드 설정집")}</legend> {/* 제목 */}
                <LoreEditor lorebook={value.lorebook} onChange={(lorebook) => onChange({ lorebook })} /> {/* 설정집 편집 */}
            </fieldset> {/* 설정집 종료 */}
            {errors.lorebook === undefined ? null : <span role="alert" className={styles.error}>{errors.lorebook}</span>} {/* 설정집 오류 */}
            <fieldset className={styles.optionGroup}> {/* 예시 대화 */}
                <legend>{t("예시 대화")}</legend> {/* 제목 */}
                <ExampleEditor examples={value.examples} replyLabel={replyLabel} onChange={(examples) => onChange({ examples })} /> {/* 예시 편집 */}
            </fieldset> {/* 예시 종료 */}
            {errors.examples === undefined ? null : <span role="alert" className={styles.error}>{errors.examples}</span>} {/* 예시 오류 */}
        </> // 묶음 종료
    ); // 반환 종료
} // 함수 종료
