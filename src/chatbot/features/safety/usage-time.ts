import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { getDateKey } from "@chatbot/lib/time/date-key"; // 한국 시간 날짜

export const USAGE_REMINDER_INTERVAL_MS = 60 * 60_000; // 이용 시간 알림 간격(60분)
const MAX_TICK_GAP_MS = 2 * 60_000; // 한 번에 더할 최대 시간(잠든 기기 보정)

export interface UsageRecord // 이용 시간 기록(하루 단위, 한국 시간)
{ // 구조 시작
    dateKey: string | null; // 센 날짜(연-월-일, 바뀌면 0부터)
    activeMs: number; // 그날 화면을 보고 있던 누적 시간(이 브라우저의 모든 탭 합계)
    lastTickAt: number | null; // 마지막 측정 시각(숨김이면 null)
    nextReminderAtMs: number; // 다음 알림을 띄울 누적 시간
} // 구조 종료

export function createUsageRecord(): UsageRecord // 새 기록 생성
{ // 함수 시작
    return { dateKey: null, activeMs: 0, lastTickAt: null, nextReminderAtMs: USAGE_REMINDER_INTERVAL_MS }; // 빈 기록 반환
} // 함수 종료

export function rollUsageDay(record: UsageRecord, now: number): UsageRecord // 날짜(한국 시간)가 바뀌었으면 0부터 다시 세기
{ // 함수 시작
    const today = getDateKey(new Date(now)); // 오늘
    return record.dateKey === today ? record : { ...createUsageRecord(), dateKey: today, lastTickAt: record.lastTickAt }; // 같은 날이면 그대로, 아니면 새 날
} // 함수 종료

export function getTodayUsageMs(record: UsageRecord, now: number): number // 오늘 이용 시간(기록이 어제 것이면 0)
{ // 함수 시작
    return rollUsageDay(record, now).activeMs; // 오늘 누적
} // 함수 종료

export function startUsageSegment(record: UsageRecord, now: number, visible: boolean): UsageRecord // 측정 구간 시작(쌓인 공백은 더하지 않음)
{ // 함수 시작
    return { ...rollUsageDay(record, now), lastTickAt: visible ? now : null }; // 시작 시각 기록(날짜가 바뀌었으면 0부터)
} // 함수 종료

export function tickUsage(record: UsageRecord, now: number, visible: boolean): UsageRecord // 이용 시간 갱신
{ // 함수 시작
    const elapsed = record.lastTickAt === null ? 0 : Math.min(Math.max(now - record.lastTickAt, 0), MAX_TICK_GAP_MS); // 직전 측정 뒤 보이던 시간(숨김 중이었으면 0)
    const today = rollUsageDay(record, now); // 날짜가 바뀌었으면 0부터
    return { ...today, activeMs: today.activeMs + elapsed, lastTickAt: visible ? now : null }; // 갱신 기록 반환(지금 숨겨지면 다음 구간은 세지 않음)
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
        return t("{0}분", [minutes]); // 분 표시
    } // 조건 종료
    return minutes === 0 ? t("{0}시간", [hours]) : t("{0}시간 {1}분", [hours, minutes]); // 시간 표시
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
            return { dateKey: typeof record.dateKey === "string" ? record.dateKey : null, activeMs: record.activeMs, lastTickAt: null, nextReminderAtMs: record.nextReminderAtMs }; // 기록 반환(날짜가 없는 예전 기록은 새 날로 봄)
        } // 조건 종료
    } // 시도 종료
    catch // 해석 실패 처리
    { // 실패 시작
        return createUsageRecord(); // 새 기록 반환
    } // 실패 종료
    return createUsageRecord(); // 형식 오류 시 새 기록 반환
} // 함수 종료
