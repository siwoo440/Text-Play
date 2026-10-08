"use client"; // 클라이언트 컴포넌트

import { NumberField } from "@chatbot/features/character/StatEditor"; // 정수 입력
import { createEvent, EVENT_LIMIT, EVENT_NAME_LIMIT, EVENT_NAME_TOKEN, EVENT_NARRATION_LIMIT, EVENT_TITLE_LIMIT, eventConditions, eventSceneOptions } from "@chatbot/features/chat/event-model"; // 이벤트 규칙
import type { StatDefinition, StoryEvent, StoryEventCondition } from "@chatbot/features/core/types"; // 이벤트 타입
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function EventEditor({ events, stats, disabled, onChange }: { events: StoryEvent[]; stats: StatDefinition[]; disabled: boolean; onChange(events: StoryEvent[]): void }) // 스탯 조건 이벤트 편집(조건 → 내레이션·특별 장면·칭호·엔딩·알림)
{ // 함수 시작
    const update = (index: number, patch: Partial<StoryEvent>) => onChange(events.map((event, position) => position === index ? { ...event, ...patch } : event)); // 이벤트 고치기
    const changeCondition = (index: number, event: StoryEvent, condition: StoryEventCondition) => // 조건 종류 바꾸기
    { // 함수 시작
        if (condition === "turn") // 턴 조건으로
        { // 조건 시작
            update(index, { condition, statId: null, value: event.condition === "turn" ? event.value : 5 }); // 스탯 비우고 5턴부터
            return; // 처리 끝
        } // 조건 종료
        const stat = stats.find((item) => item.id === event.statId) ?? stats[0]; // 조건 스탯(없으면 첫 스탯)
        update(index, { condition, statId: stat?.id ?? null, value: event.condition === "turn" && stat !== undefined ? Math.round((stat.min + stat.max) / 2) : event.value }); // 스탯 조건으로
    }; // 함수 종료
    return ( // 편집 반환
        <div className={styles.statEditor}> {/* 이벤트 편집 */}
            <p className={styles.hint}>{t("스탯이나 턴이 조건에 처음 맞는 턴에 한 번 일어나요. 스토리에서는 인물마다 따로 일어나고, 내레이션의")} {EVENT_NAME_TOKEN}{t("은 그 인물 이름으로 바뀌어요. 특별 장면 그림은 토큰 없이 그 응답 아래에 보여요.")}</p> {/* 안내 */}
            {events.length === 0 ? null : ( // 목록 판정
                <ol className={styles.statList} aria-label={t("이벤트 목록")}> {/* 이벤트 목록 */}
                    {events.map((event, index) => // 이벤트 순회
                    { // 순회 시작
                        const label = event.name.trim().length === 0 ? t("이벤트 {0}", [index + 1]) : event.name.trim(); // 표시 이름
                        const customScene = event.scene !== null && !eventSceneOptions.some((option) => option.path === event.scene); // 목록에 없는 그림
                        return ( // 카드 반환
                            <li key={event.id}> {/* 이벤트 */}
                                <fieldset className={styles.statCard} disabled={disabled}> {/* 이벤트 카드 */}
                                    <legend>{label}</legend> {/* 제목 */}
                                    <label>{t("이벤트 이름")}<input value={event.name} maxLength={EVENT_NAME_LIMIT + 1} placeholder={t("예: 마음을 연 순간")} onChange={(change) => update(index, { name: change.target.value })} /></label> {/* 이름 */}
                                    <div className={styles.inlineFields}> {/* 조건 */}
                                        <label className={styles.grow}>{t("조건")}<select value={event.condition} onChange={(change) => changeCondition(index, event, change.target.value as StoryEventCondition)}>{eventConditions.filter((condition) => condition.id === "turn" || stats.length > 0).map((condition) => <option key={condition.id} value={condition.id}>{t(condition.label)}</option>)}</select></label> {/* 조건 종류 */}
                                        {event.condition === "turn" ? null : <label>{t("조건 스탯")}<select value={event.statId ?? ""} onChange={(change) => update(index, { statId: change.target.value })}>{stats.map((stat) => <option key={stat.id} value={stat.id}>{stat.icon.length === 0 ? "" : `${stat.icon} `}{stat.name.trim().length === 0 ? t("이름 없는 스탯") : stat.name}</option>)}</select></label>} {/* 조건 스탯 */}
                                        <NumberField className={styles.narrow} label={event.condition === "turn" ? t("턴") : t("기준 값")} value={event.value} onChange={(value) => update(index, { value })} /> {/* 기준 값 */}
                                    </div> {/* 조건 종료 */}
                                    <label>{t("내레이션")}<textarea value={event.narration} rows={2} maxLength={EVENT_NARRATION_LIMIT + 1} placeholder={t("예: {0}이(가) 처음으로 속마음을 털어놓는다.", [EVENT_NAME_TOKEN])} onChange={(change) => update(index, { narration: change.target.value })} /></label> {/* 내레이션 */}
                                    <div className={styles.inlineFields}> {/* 그림·칭호 */}
                                        <label className={styles.grow}>{t("특별 장면 그림")}<select value={event.scene ?? ""} onChange={(change) => update(index, { scene: change.target.value.length === 0 ? null : change.target.value })}><option value="">{t("없음")}</option>{eventSceneOptions.map((option) => <option key={option.path} value={option.path}>{t(option.label)}</option>)}{customScene ? <option value={event.scene ?? ""}>{t("지금 그림 유지")}</option> : null}</select></label> {/* 특별 장면 */}
                                        <label>{t("칭호")}<input value={event.title} maxLength={EVENT_TITLE_LIMIT + 1} placeholder={t("예: 말벗")} onChange={(change) => update(index, { title: change.target.value })} /></label> {/* 칭호 */}
                                    </div> {/* 그림·칭호 종료 */}
                                    <div className={styles.checkGrid}> {/* 엔딩·알림 */}
                                        <label><input type="checkbox" checked={event.ending} onChange={(change) => update(index, { ending: change.target.checked })} />{t("엔딩으로 표시")}</label> {/* 엔딩 */}
                                        <label><input type="checkbox" checked={event.notify} onChange={(change) => update(index, { notify: change.target.checked })} />{t("알림함에 알리기")}</label> {/* 알림 */}
                                    </div> {/* 엔딩·알림 종료 */}
                                    <button type="button" className={styles.dangerButton} onClick={() => onChange(events.filter((_item, position) => position !== index))}>{event.name.trim().length === 0 ? label : t("{0} 이벤트", [label])} {t("삭제")}</button> {/* 삭제(이름이 없으면 ‘이벤트 N 삭제’) */}
                                </fieldset> {/* 카드 종료 */}
                            </li> // 이벤트 종료
                        ); // 카드 반환 종료
                    })} {/* 순회 종료 */}
                </ol> // 목록 종료
            )} {/* 목록 판정 종료 */}
            <button type="button" className={styles.smallButton} disabled={disabled || events.length >= EVENT_LIMIT} onClick={() => onChange([...events, createEvent(events.length, stats)])}>{t("＋ 이벤트 추가 (")}{events.length}/{EVENT_LIMIT})</button> {/* 추가 */}
        </div> // 편집 종료
    ); // 반환 종료
} // 함수 종료
