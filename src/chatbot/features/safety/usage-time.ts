export const USAGE_REMINDER_INTERVAL_MS = 60 * 60_000; // 이용 시간 알림 간격(60분)
const MAX_TICK_GAP_MS = 2 * 60_000; // 한 번에 더할 최대 시간(잠든 기기 보정)

export interface UsageRecord // 이용 시간 기록
{ // 구조 시작
    activeMs: number; // 화면을 보고 있던 누적 시간
    lastTickAt: number | null; // 마지막 측정 시각(숨김이면 null)
    nextReminderAtMs: number; // 다음 알림을 띄울 누적 시간
} // 구조 종료

export function createUsageRecord(): UsageRecord // 새 기록 생성
{ // 함수 시작
    return { activeMs: 0, lastTickAt: null, nextReminderAtMs: USAGE_REMINDER_INTERVAL_MS }; // 빈 기록 반환
} // 함수 종료

export function startUsageSegment(record: UsageRecord, now: number, visible: boolean): UsageRecord // 측정 구간 시작(쌓인 공백은 더하지 않음)
{ // 함수 시작
    return { ...record, lastTickAt: visible ? now : null }; // 시작 시각 기록
} // 함수 종료

export function tickUsage(record: UsageRecord, now: number, visible: boolean): UsageRecord // 이용 시간 갱신
{ // 함수 시작
    const elapsed = record.lastTickAt === null ? 0 : Math.min(Math.max(now - record.lastTickAt, 0), MAX_TICK_GAP_MS); // 직전 측정 뒤 보이던 시간(숨김 중이었으면 0)
    return { ...record, activeMs: record.activeMs + elapsed, lastTickAt: visible ? now : null }; // 갱신 기록 반환(지금 숨겨지면 다음 구간은 세지 않음)
} // 함수 종료

export function isReminderDue(record: UsageRecord): boolean // 알림 시점 판정
{ // 함수 시작
    return record.activeMs >= record.nextReminderAtMs; // 도달 여부 반환
} // 함수 종료

export function acknowledgeReminder(record: UsageRecord): UsageRecord // 알림 확인(다음 60분 뒤로)
{ // 함수 시작
    return { ...record, nextReminderAtMs: record.activeMs + USAGE_REMINDER_INTERVAL_MS }; // 다음 시점 반환
} // 함수 종료

export function formatUsageDuration(ms: number): string // 이용 시간 표시
{ // 함수 시작
    const totalMinutes = Math.floor(ms / 60_000); // 전체 분
    const hours = Math.floor(totalMinutes / 60); // 시간
    const minutes = totalMinutes % 60; // 남은 분
    if (hours === 0) // 1시간 미만 판정
    { // 조건 시작
        return `${minutes}분`; // 분 표시
    } // 조건 종료
    return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`; // 시간 표시
} // 함수 종료

export function parseUsageRecord(raw: string | null): UsageRecord // 저장 기록 해석
{ // 함수 시작
    if (raw === null) // 기록 부재 판정
    { // 조건 시작
        return createUsageRecord(); // 새 기록 반환
    } // 조건 종료
    try // 해석 시도
    { // 시도 시작
        const value: unknown = JSON.parse(raw); // JSON 해석
        if (typeof value === "object" && value !== null && typeof (value as UsageRecord).activeMs === "number" && typeof (value as UsageRecord).nextReminderAtMs === "number") // 형식 확인
        { // 조건 시작
            const record = value as UsageRecord; // 기록 지정
            return { activeMs: record.activeMs, lastTickAt: null, nextReminderAtMs: record.nextReminderAtMs }; // 기록 반환
        } // 조건 종료
    } // 시도 종료
    catch // 해석 실패 처리
    { // 실패 시작
        return createUsageRecord(); // 새 기록 반환
    } // 실패 종료
    return createUsageRecord(); // 형식 오류 시 새 기록 반환
} // 함수 종료
