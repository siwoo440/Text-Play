"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import type { TokenRecord } from "@chatbot/features/core/types"; // 토큰 기록 타입
import { filterTokenRecords, filterTokenRecordsByPeriod, groupTokenRecords, summarizeTokenDays, TOKEN_RECORD_LIMIT, tokenSourceLabels, type TokenDaySummary, type TokenPeriod, type TokenPeriodId, type TokenRecordFilter } from "@chatbot/lib/story/token-ledger"; // 토큰 기록 규칙
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

const PAGE_SIZE = 50; // 한 번에 보여 줄 기록 수
const WIDTH = 560; // 그래프 너비
const HEIGHT = 190; // 그래프 높이
const MARGIN = { top: 18, right: 8, bottom: 38, left: 34 }; // 그래프 여백
const BAR = 14; // 막대 굵기
const GAP = 2; // 두 막대 사이
const filters: Array<{ id: TokenRecordFilter; label: string }> = [{ id: "all", label: "전체" }, { id: "earn", label: "받음" }, { id: "spend", label: "사용" }]; // 필터
const periods: Array<{ id: TokenPeriodId; label: string }> = [{ id: "all", label: "전체 기간" }, { id: "today", label: "오늘" }, { id: "week", label: "최근 7일" }, { id: "month", label: "최근 30일" }, { id: "custom", label: "직접 고르기" }]; // 기간

function formatTime(value: string): string // 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 시각 반환
} // 함수 종료

function niceMax(value: number): number // 세로축 최댓값(보기 좋은 수)
{ // 함수 시작
    const step = value <= 20 ? 10 : value <= 50 ? 25 : value <= 100 ? 50 : 100; // 눈금 간격
    return Math.max(step * 2, Math.ceil(value / step) * step); // 최댓값 반환
} // 함수 종료

function barPath(x: number, y: number, width: number, height: number): string // 위쪽만 둥근 막대(바닥은 기준선에 붙음)
{ // 함수 시작
    const radius = Math.min(4, height, width / 2); // 둥근 정도
    return `M${x} ${y + height}V${y + radius}Q${x} ${y} ${x + radius} ${y}H${x + width - radius}Q${x + width} ${y} ${x + width} ${y + radius}V${y + height}Z`; // 막대 경로
} // 함수 종료

function TokenWeekChart({ days }: { days: TokenDaySummary[] }) // 최근 7일 받은·쓴 토큰(날마다 막대 둘, 색 + 범례 + 표로 구분)
{ // 함수 시작
    const max = niceMax(Math.max(...days.map((day) => Math.max(day.earned, day.spent)), 1)); // 세로축 최댓값
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right; // 그림 너비
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom; // 그림 높이
    const band = plotWidth / days.length; // 하루 폭
    const y = (value: number) => MARGIN.top + plotHeight - (value / max) * plotHeight; // 세로 위치
    const last = days.at(-1); // 오늘
    return ( // 그래프 반환
        <figure className={styles.tokenChart}> {/* 그래프 */}
            <ul className={styles.tokenLegend} aria-label={t("범례")}><li><span data-series="earn" aria-hidden="true" />{t("받음")}</li><li><span data-series="spend" aria-hidden="true" />{t("사용")}</li></ul> {/* 범례 */}
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t("최근 {0}일 토큰: {1}", [days.length, days.map((day) => t("{0} 받음 {1} 사용 {2}", [day.fullLabel, day.earned, day.spent])).join(", ")])}> {/* 막대 그래프 */}
                {[0, max / 2, max].map((tick) => <g key={tick}><line className={styles.chartGrid} x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} /><text className={styles.chartAxis} x={MARGIN.left - 6} y={y(tick) + 4} textAnchor="end">{tick}</text></g>)} {/* 눈금선과 값 */}
                {days.map((day, index) => // 날짜 순회
                { // 순회 시작
                    const center = MARGIN.left + band * index + band / 2; // 가운데
                    const earnHeight = (day.earned / max) * plotHeight; // 받은 막대 높이
                    const spendHeight = (day.spent / max) * plotHeight; // 쓴 막대 높이
                    return ( // 하루 반환
                        <g key={day.dateKey}> {/* 하루 */}
                            {day.earned === 0 ? null : <path className={styles.barEarn} d={barPath(center - GAP / 2 - BAR, y(day.earned), BAR, earnHeight)} />} {/* 받은 막대 */}
                            {day.spent === 0 ? null : <path className={styles.barSpend} d={barPath(center + GAP / 2, y(day.spent), BAR, spendHeight)} />} {/* 쓴 막대 */}
                            {day !== last ? null : <>{day.earned === 0 ? null : <text className={styles.chartValue} x={center - GAP} y={y(day.earned) - 5} textAnchor="end">{day.earned}</text>}{day.spent === 0 ? null : <text className={styles.chartValue} x={center + GAP} y={y(day.spent) - 5} textAnchor="start">{day.spent}</text>}</>} {/* 오늘 값만 숫자로(두 숫자가 겹치지 않게 가운데에서 바깥으로) */}
                            <text className={styles.chartAxis} x={center} y={HEIGHT - MARGIN.bottom + 16} textAnchor="middle">{t(day.label)}</text> {/* 날짜 */}
                            <text className={styles.chartAxis} x={center} y={HEIGHT - MARGIN.bottom + 30} textAnchor="middle">{day.weekday}</text> {/* 요일 */}
                            <rect className={styles.chartHit} x={MARGIN.left + band * index} y={MARGIN.top} width={band} height={plotHeight}><title>{t("{0} · 받음 {1} · 사용 {2}", [day.fullLabel, day.earned, day.spent])}</title></rect> {/* 올리면 그날 값 */}
                        </g> // 하루 종료
                    ); // 반환 종료
                })} {/* 순회 종료 */}
            </svg> {/* 그래프 종료 */}
            <details className={styles.chartTable}> {/* 표로 보기 */}
                <summary>{t("표로 보기")}</summary> {/* 펼침 */}
                {/* 표 안 공백 텍스트는 하이드레이션 오류를 만들어 줄 끝 주석을 두지 않음 */}
                <table className={styles.table} aria-label={t("최근 7일 토큰")}><thead><tr><th scope="col">{t("날짜")}</th><th scope="col">{t("받음")}</th><th scope="col">{t("사용")}</th></tr></thead><tbody>{days.map((day) => <tr key={day.dateKey}><th scope="row">{day.fullLabel}</th><td>{day.earned}</td><td>{day.spent}</td></tr>)}</tbody></table>
            </details> {/* 표 종료 */}
        </figure> // 그래프 종료
    ); // 반환 종료
} // 함수 종료

export function TokenHistory({ records }: { records: TokenRecord[] }) // 토큰 이용 기록(최근 7일 그래프 + 날짜별 목록)
{ // 함수 시작
    const [filter, setFilter] = useState<TokenRecordFilter>("all"); // 기록 종류
    const [visible, setVisible] = useState(PAGE_SIZE); // 보여 줄 기록 수
    const days = summarizeTokenDays(records, new Date()); // 최근 7일 합계
    const [period, setPeriod] = useState<TokenPeriod>({ id: "all", from: "", to: "" }); // 고른 기간
    const inPeriod = filterTokenRecordsByPeriod(records, period, new Date()); // 기간에 든 기록
    const periodEarned = inPeriod.reduce((sum, record) => sum + (record.direction === "earn" ? record.amount : 0), 0); // 기간에 받은 합계
    const periodSpent = inPeriod.reduce((sum, record) => sum + (record.direction === "spend" ? record.amount : 0), 0); // 기간에 쓴 합계
    const changePeriod = (next: TokenPeriod) => // 기간 바꾸기
    { // 함수 시작
        setPeriod(next); // 기간 반영
        setVisible(PAGE_SIZE); // 처음부터 다시 보여 줌
    }; // 함수 종료
    const filtered = filterTokenRecords(inPeriod, filter); // 고른 종류
    const groups = groupTokenRecords(filtered.slice(0, visible)); // 날짜별 묶음
    const weekEarned = days.reduce((sum, day) => sum + day.earned, 0); // 7일 받은 합계
    const weekSpent = days.reduce((sum, day) => sum + day.spent, 0); // 7일 쓴 합계
    return ( // 영역 반환
        <> {/* 이용 기록 */}
            <section className={styles.card} aria-labelledby="token-week-title"> {/* 최근 7일 */}
                <h2 id="token-week-title">{t("최근 7일")}</h2> {/* 제목 */}
                <p>{t("최근 7일 동안")} {weekEarned.toLocaleString()}{t("토큰을 받고")} {weekSpent.toLocaleString()}{t("토큰을 썼어요.")}</p> {/* 요약 */}
                <TokenWeekChart days={days} /> {/* 그래프 */}
            </section> {/* 최근 7일 종료 */}
            <section className={styles.card} aria-labelledby="token-history-title"> {/* 이용 기록 */}
                <h2 id="token-history-title">{t("이용 기록")}</h2> {/* 제목 */}
                <p>{t("받은 토큰과 쓴 토큰을 최근")} {TOKEN_RECORD_LIMIT}{t("건까지 남겨요. 오늘 사용량은 한국 시간 기준으로 날짜가 바뀌면 0부터 다시 셉니다.")}</p> {/* 설명 */}
                <div className={styles.periodRow}> {/* 기간 고르기 */}
                    <label className={styles.field}>{t("기간")}<select value={period.id} onChange={(event) => changePeriod({ ...period, id: event.target.value as TokenPeriodId })}>{periods.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label> {/* 기간 종류 */}
                    {period.id !== "custom" ? null : <label className={styles.field}>{t("시작 날짜")}<input type="date" value={period.from} onChange={(event) => changePeriod({ ...period, from: event.target.value })} /></label>} {/* 시작 날짜 */}
                    {period.id !== "custom" ? null : <label className={styles.field}>{t("끝 날짜")}<input type="date" value={period.to} onChange={(event) => changePeriod({ ...period, to: event.target.value })} /></label>} {/* 끝 날짜 */}
                </div> {/* 기간 종료 */}
                {period.id === "all" ? null : <p className={styles.resultCount} role="status" aria-label={t("기간 합계")}>{t("이 기간에 받음 +{0} · 사용 −{1} · 기록 {2}건", [periodEarned, periodSpent, inPeriod.length])}</p>} {/* 기간 합계 */}
                <div className={styles.filterRow} role="group" aria-label={t("기록 종류")}> {/* 필터 */}
                    {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setVisible(PAGE_SIZE); }}>{t(item.label)} {filterTokenRecords(inPeriod, item.id).length}</button>)} {/* 필터 버튼 */}
                </div> {/* 필터 종료 */}
                {groups.length === 0 ? <p className={styles.note}>{records.length === 0 ? t("아직 기록이 없어요. 대화를 하거나 출석·미션 보상을 받으면 여기에 남아요.") : t("이 기간에는 기록이 없어요. 기간을 넓히거나 종류를 바꿔 보세요.")}</p> : groups.map((group) => ( // 묶음 순회
                    <section key={group.dateKey} className={styles.recordGroup} aria-label={t(group.label)}> {/* 날짜 묶음 */}
                        <h3>{t(group.label)}<small>{t("받음 +")}{group.earned} {t("· 사용 −")}{group.spent}</small></h3> {/* 날짜와 합계 */}
                        <ol className={styles.recordList}> {/* 기록 목록 */}
                            {group.records.map((record) => <li key={record.id} data-direction={record.direction}><div><strong>{t(record.label)}</strong><small>{record.work ?? t(tokenSourceLabels[record.source])} · {formatTime(record.createdAt)} {t("· 잔액")} {record.balance.toLocaleString()}</small></div><b>{record.direction === "earn" ? "+" : "−"}{record.amount}</b></li>)} {/* 기록 */}
                        </ol> {/* 목록 종료 */}
                    </section> // 묶음 종료
                ))} {/* 순회 종료 */}
                {visible < filtered.length ? <button type="button" className={styles.secondary} onClick={() => setVisible(visible + PAGE_SIZE)}>{t("기록 더 보기 (")}{filtered.length - visible}{t("건 남음)")}</button> : null} {/* 더 보기 */}
            </section> {/* 이용 기록 종료 */}
        </> // 이용 기록 종료
    ); // 반환 종료
} // 함수 종료
