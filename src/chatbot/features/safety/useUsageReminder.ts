"use client"; // 클라이언트 훅

import { useCallback, useEffect, useRef, useState } from "react"; // 리액트 도구
import { acknowledgeReminder, isReminderDue, parseUsageRecord, startUsageSegment, tickUsage, type UsageRecord } from "@chatbot/features/safety/usage-time"; // 이용 시간 계산

const storageKey = "mateverse:v1:usage-time"; // 탭별 이용 시간 저장 키
const tickIntervalMs = 30_000; // 측정 간격(30초)

function readRecord(): UsageRecord // 저장 기록 읽기
{ // 함수 시작
    try // 저장소 접근 시도
    { // 시도 시작
        return parseUsageRecord(window.sessionStorage.getItem(storageKey)); // 기록 해석
    } // 시도 종료
    catch // 저장소 차단 처리
    { // 실패 시작
        return parseUsageRecord(null); // 새 기록 반환
    } // 실패 종료
} // 함수 종료

function writeRecord(record: UsageRecord): void // 기록 저장
{ // 함수 시작
    try // 저장 시도
    { // 시도 시작
        window.sessionStorage.setItem(storageKey, JSON.stringify(record)); // 탭 저장소 기록
    } // 시도 종료
    catch // 저장 실패 처리
    { // 실패 시작
        return; // 저장 생략(알림 기능만 영향)
    } // 실패 종료
} // 함수 종료

function isVisible(): boolean // 화면 표시 여부
{ // 함수 시작
    return document.visibilityState !== "hidden"; // 숨김이 아니면 이용 중
} // 함수 종료

export function useUsageReminder(): { due: boolean; activeMs: number; acknowledge(): void } // 이용 시간 알림 훅
{ // 함수 시작
    const [due, setDue] = useState(false); // 알림 표시 여부
    const [activeMs, setActiveMs] = useState(0); // 알림 시점 이용 시간
    const recordRef = useRef<UsageRecord | null>(null); // 현재 기록
    useEffect(() => // 측정 효과
    { // 효과 시작
        recordRef.current = startUsageSegment(readRecord(), Date.now(), isVisible()); // 측정 시작
        const tick = () => // 측정 처리
        { // 처리 시작
            const record = tickUsage(recordRef.current ?? readRecord(), Date.now(), isVisible()); // 이용 시간 갱신
            recordRef.current = record; // 기록 보관
            writeRecord(record); // 기록 저장
            if (isReminderDue(record)) // 알림 시점 판정
            { // 조건 시작
                setActiveMs(record.activeMs); // 이용 시간 기록
                setDue(true); // 알림 표시
            } // 조건 종료
        }; // 처리 종료
        const timer = window.setInterval(tick, tickIntervalMs); // 주기 측정
        document.addEventListener("visibilitychange", tick); // 표시 전환 측정
        return () => // 정리 함수
        { // 정리 시작
            window.clearInterval(timer); // 주기 측정 해제
            document.removeEventListener("visibilitychange", tick); // 전환 측정 해제
        }; // 정리 종료
    }, []); // 최초 실행
    const acknowledge = useCallback(() => // 알림 확인 함수
    { // 함수 시작
        const record = acknowledgeReminder(recordRef.current ?? readRecord()); // 다음 시점 설정
        recordRef.current = record; // 기록 보관
        writeRecord(record); // 기록 저장
        setDue(false); // 알림 닫기
    }, []); // 고정 함수
    return { due, activeMs, acknowledge }; // 훅 결과 반환
} // 함수 종료
