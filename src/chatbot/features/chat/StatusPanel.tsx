"use client"; // 클라이언트 컴포넌트

import { useEffect, useState } from "react"; // 리액트 도구
import { formatStatusText } from "@chatbot/features/chat/status-model"; // 복사 문구
import type { Message, StatusSnapshot } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일

interface StatusPanelProps // 고정 상태창 속성
{ // 구조 시작
    messages: Message[]; // 현재 대화 버전 메시지
    open: boolean; // 펼침
    onToggle(): void; // 접기·펼치기
} // 구조 종료

export function StatusPanel({ messages, open, onToggle }: StatusPanelProps) // 턴마다 갱신되는 고정 INFO 창(이전 턴 넘겨 보기)
{ // 함수 시작
    const statuses = messages.flatMap((message) => message.role === "assistant" && message.status !== undefined && message.status !== null ? [message.status] : []); // 턴별 상태창
    const [selected, setSelected] = useState<number | null>(null); // 고른 위치(null이면 최신)
    const [copied, setCopied] = useState(false); // 복사 안내
    const index = selected === null || selected >= statuses.length ? statuses.length - 1 : selected; // 보여 줄 위치
    const status: StatusSnapshot | undefined = statuses[index]; // 보여 줄 상태창
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
    }, [onToggle, statuses.length]); // 의존
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
        <section className={styles.statusPanel} aria-label="상태창" data-open={open ? "true" : undefined}> {/* 고정 상태창 */}
            <header className={styles.statusHead}> {/* 머리 줄 */}
                <button type="button" className={styles.statusToggle} aria-expanded={open} onClick={onToggle}><span aria-hidden="true">{open ? "▾" : "▸"}</span> INFO</button> {/* 접기·펼치기 */}
                {statuses.length === 0 ? null : ( // 턴 이동 판정
                    <div className={styles.statusNav}> {/* 턴 이동 */}
                        <button type="button" aria-label="이전 턴 상태창" disabled={index <= 0} onClick={() => move(-1)}>‹</button> {/* 이전 */}
                        <span aria-live="polite">{status?.turn ?? 0}턴 · {index + 1}/{statuses.length}</span> {/* 위치 */}
                        <button type="button" aria-label="다음 턴 상태창" disabled={index >= statuses.length - 1} onClick={() => move(1)}>›</button> {/* 다음 */}
                        {index < statuses.length - 1 ? <button type="button" className={styles.statusLatest} onClick={() => { setSelected(null); setCopied(false); }}>최신</button> : null} {/* 최신으로 */}
                        <button type="button" className={styles.statusCopy} aria-label="상태창 복사" onClick={copy}>{copied ? "복사됨" : "복사"}</button> {/* 복사 */}
                    </div> // 이동 종료
                )} {/* 이동 판정 종료 */}
            </header> {/* 머리 줄 종료 */}
            {!open ? null : status === undefined ? <p className={styles.statusEmpty}>첫 응답부터 매 턴 상태창이 여기 고정돼 갱신돼요.</p> : ( // 내용 판정
                <div className={styles.statusBody} data-latest={index === statuses.length - 1 ? "true" : undefined}> {/* 내용 */}
                    {status.location === null && status.time === null ? null : <p className={styles.statusLine}>{status.location === null ? null : <span>📍 {status.location}</span>}{status.time === null ? null : <span>⏳ {status.time}</span>}</p>} {/* 장소·시간 */}
                    {status.tip === null ? null : <p className={styles.statusTip}>💡 팁: {status.tip}</p>} {/* 팁 */}
                    {status.affection.map((item) => // 호감도 순회
                    { // 순회 시작
                        const thought = status.thoughts.find((entry) => entry.name === item.name); // 같은 인물 속마음
                        return <p key={item.name} className={styles.statusPerson}><strong>{item.name}</strong><span className={styles.statusHeart}>❤️ {item.value}/100</span><span className={styles.statusDelta} data-sign={item.delta > 0 ? "up" : item.delta < 0 ? "down" : "same"}>({item.delta > 0 ? "+" : ""}{item.delta})</span>{thought === undefined ? null : <q>{thought.text}</q>}</p>; // 인물 줄
                    })} {/* 호감도 종료 */}
                    {status.thoughts.filter((entry) => !status.affection.some((item) => item.name === entry.name)).map((entry) => <p key={entry.name} className={styles.statusPerson}><strong>{entry.name}</strong><q>{entry.text}</q></p>)} {/* 호감도 없는 속마음 */}
                    {status.custom.map((item) => <p key={item.label} className={styles.statusCustom}><span>{item.label}</span>{item.value}</p>)} {/* 직접 항목 */}
                </div> // 내용 종료
            )} {/* 내용 판정 종료 */}
        </section> // 상태창 종료
    ); // 반환 종료
} // 함수 종료
