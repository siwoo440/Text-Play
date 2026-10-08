"use client"; // 클라이언트 컴포넌트

import { useEffect, useState } from "react"; // 리액트 도구
import { collectTitles, findEnding, getStatHistory } from "@chatbot/features/chat/event-model"; // 칭호·엔딩·그래프 자료
import { formatStatDelta, formatStatValue } from "@chatbot/features/chat/stat-model"; // 스탯 표시
import { StatTrend } from "@chatbot/features/chat/StatTrend"; // 턴별 스탯 그래프
import { formatStatusText, getStatusRows } from "@chatbot/features/chat/status-model"; // 복사 문구·인물 줄
import type { Message, StatusSnapshot, StatValue } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface StatusPanelProps // 고정 상태창 속성
{ // 구조 시작
    messages: Message[]; // 현재 대화 버전 메시지
    open: boolean; // 펼침
    onToggle(): void; // 접기·펼치기
    initialStats?: StatValue[]; // 첫 응답 전에 보여 줄 스탯 초기값
} // 구조 종료

function StatChip({ item }: { item: StatValue }) // 스탯 한 칸
{ // 함수 시작
    return <span className={styles.statChip} data-stat={item.statId}>{item.icon.length === 0 ? null : <span aria-hidden="true">{item.icon} </span>}{t(item.name)} <b>{formatStatValue(item)}</b>{item.delta === 0 ? null : <span className={styles.statusDelta} data-sign={item.delta > 0 ? "up" : "down"}>({formatStatDelta(item.delta)})</span>}</span>; // 이름·값·변화
} // 함수 종료

export function StatusPanel({ messages, open, onToggle, initialStats = [] }: StatusPanelProps) // 턴마다 갱신되는 고정 INFO 창(이전 턴 넘겨 보기)
{ // 함수 시작
    const statuses = messages.flatMap((message) => message.role === "assistant" && message.status !== undefined && message.status !== null ? [message.status] : []); // 턴별 상태창
    const [selected, setSelected] = useState<number | null>(null); // 고른 위치(null이면 최신)
    const [copied, setCopied] = useState(false); // 복사 안내
    const [chartOpen, setChartOpen] = useState(false); // 턴별 그래프 펼침
    const index = selected === null || selected >= statuses.length ? statuses.length - 1 : selected; // 보여 줄 위치
    const status: StatusSnapshot | undefined = statuses[index]; // 보여 줄 상태창
    const shown = statuses.slice(0, index + 1); // 보고 있는 턴까지의 상태창
    const lines = getStatHistory(shown); // 턴별 스탯 값
    const titles = collectTitles(shown); // 지금까지 얻은 칭호
    const ending = findEnding(shown); // 도달한 엔딩
    const move = (step: number) => // 턴 이동
    { // 함수 시작
        const next = Math.min(statuses.length - 1, Math.max(0, index + step)); // 범위 안 위치
        setSelected(next === statuses.length - 1 ? null : next); // 최신이면 따라가기
        setCopied(false); // 복사 안내 해제
    }; // 함수 종료
    useEffect(() => // 단축키(Alt+←·→ 턴 이동, Alt+I 접기)
    { // 효과 시작
        const handleKey = (event: KeyboardEvent) => // 키 처리
        { // 처리 시작
            if (!event.altKey || event.ctrlKey || event.metaKey) // Alt 조합 아님
            { // 조건 시작
                return; // 처리 생략
            } // 조건 종료
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") // 턴 이동 판정
            { // 조건 시작
                if (!open || statuses.length < 2) // 상태창이 접혀 있거나 넘겨 볼 턴이 없음
                { // 조건 시작
                    return; // 브라우저의 뒤로·앞으로 가기를 막지 않음
                } // 조건 종료
                event.preventDefault(); // 기본 동작 차단
                const step = event.key === "ArrowLeft" ? -1 : 1; // 방향
                setSelected((current) => // 위치 갱신
                { // 갱신 시작
                    const from = current === null || current >= statuses.length ? statuses.length - 1 : current; // 현재 위치
                    const next = Math.min(statuses.length - 1, Math.max(0, from + step)); // 다음 위치
                    return next === statuses.length - 1 ? null : next; // 최신이면 따라가기
                }); // 갱신 종료
            } // 조건 종료
            else if (event.key.toLowerCase() === "i") // 접기 판정
            { // 조건 시작
                event.preventDefault(); // 기본 동작 차단
                onToggle(); // 접기·펼치기
            } // 조건 종료
        }; // 처리 종료
        window.addEventListener("keydown", handleKey); // 구독
        return () => window.removeEventListener("keydown", handleKey); // 해제
    }, [onToggle, open, statuses.length]); // 의존
    const copy = async () => // 복사
    { // 함수 시작
        if (status === undefined) // 상태창 없음
        { // 조건 시작
            return; // 복사 생략
        } // 조건 종료
        try // 복사 시도
        { // 시도 시작
            await navigator.clipboard.writeText(formatStatusText(status)); // 클립보드 복사
            setCopied(true); // 안내
        } // 시도 종료
        catch // 복사 실패
        { // 실패 시작
            setCopied(false); // 안내 없음
        } // 실패 종료
    }; // 함수 종료
    return ( // 상태창 반환
        <section className={styles.statusPanel} aria-label={t("상태창")} data-open={open ? "true" : undefined}> {/* 고정 상태창 */}
            <header className={styles.statusHead}> {/* 머리 줄 */}
                <button type="button" className={styles.statusToggle} aria-expanded={open} onClick={onToggle}><span aria-hidden="true">{open ? "▾" : "▸"}</span> INFO</button> {/* 접기·펼치기 */}
                {statuses.length === 0 ? null : ( // 턴 이동 판정
                    <div className={styles.statusNav}> {/* 턴 이동 */}
                        <button type="button" aria-label={t("이전 턴 상태창")} disabled={index <= 0} onClick={() => move(-1)}>‹</button> {/* 이전 */}
                        <span aria-live="polite">{status?.turn ?? 0}{t("턴 ·")} {index + 1}/{statuses.length}</span> {/* 위치 */}
                        <button type="button" aria-label={t("다음 턴 상태창")} disabled={index >= statuses.length - 1} onClick={() => move(1)}>›</button> {/* 다음 */}
                        {index < statuses.length - 1 ? <button type="button" className={styles.statusLatest} onClick={() => { setSelected(null); setCopied(false); }}>{t("최신")}</button> : null} {/* 최신으로 */}
                        {lines.length === 0 ? null : <button type="button" aria-expanded={chartOpen} aria-controls="status-trend" onClick={() => setChartOpen(!chartOpen)}>{t("그래프")}</button>} {/* 턴별 스탯 그래프 */}
                        <button type="button" className={styles.statusCopy} aria-label={t("상태창 복사")} onClick={copy}>{copied ? t("복사됨") : t("복사")}</button> {/* 복사 */}
                    </div> // 이동 종료
                )} {/* 이동 판정 종료 */}
            </header> {/* 머리 줄 종료 */}
            {!open ? null : status === undefined ? <div className={styles.statusEmpty}><p>{t("첫 응답부터 매 턴 상태창이 여기 고정돼 갱신돼요.")}</p>{initialStats.length === 0 ? null : <p className={styles.statusStats} aria-label={t("시작 스탯")}>{initialStats.map((item) => <StatChip key={`${item.statId}-${item.target ?? ""}`} item={{ ...item, name: item.target === null ? item.name : `${item.target} ${item.name}` }} />)}</p>}</div> : ( // 내용 판정
                <div className={styles.statusBody} data-latest={index === statuses.length - 1 ? "true" : undefined}> {/* 내용 */}
                    {status.location === null && status.time === null ? null : <p className={styles.statusLine}>{status.location === null ? null : <span>📍 {status.location}</span>}{status.time === null ? null : <span>⏳ {status.time}</span>}</p>} {/* 장소·시간 */}
                    {status.tip === null ? null : <p className={styles.statusTip}>{t("💡 팁:")} {status.tip}</p>} {/* 팁 */}
                    {getStatusRows(status).map((row) => <p key={row.name} className={styles.statusPerson}><strong>{row.name}</strong>{row.stats.map((item) => <StatChip key={item.statId} item={item} />)}{row.thought === null ? null : <q>{row.thought}</q>}</p>)} {/* 인물별 스탯·속마음 */}
                    {status.stats.some((item) => item.target === null) ? <p className={styles.statusPerson}><strong>{t("공통")}</strong>{status.stats.filter((item) => item.target === null).map((item) => <StatChip key={item.statId} item={item} />)}</p> : null} {/* 공통 스탯 */}
                    {status.custom.map((item) => <p key={item.label} className={styles.statusCustom}><span>{t(item.label)}</span>{item.value}</p>)} {/* 직접 항목 */}
                    {titles.length === 0 ? null : <p className={styles.statusTitles} aria-label={t("칭호")}><span aria-hidden="true">🏅</span>{titles.map((item) => <span key={`${item.title}-${item.target ?? ""}`} className={styles.titleChip}>{item.target === null ? item.title : `${item.target} · ${item.title}`}</span>)}</p>} {/* 이벤트로 얻은 칭호 */}
                    {ending === null ? null : <p className={styles.statusEnding}>{t("🎬 엔딩 도달:")} {ending.name}{ending.target === null ? "" : ` (${ending.target})`} {t("· 이야기는 계속 이어 갈 수 있어요.")}</p>} {/* 엔딩 표시 */}
                </div> // 내용 종료
            )} {/* 내용 판정 종료 */}
            {open && chartOpen && lines.length > 0 ? <div id="status-trend"><StatTrend lines={lines} /></div> : null} {/* 턴별 스탯 그래프 */}
        </section> // 상태창 종료
    ); // 반환 종료
} // 함수 종료
