// 토큰 기록(받음·사용): 기록 추가, 종류 이름, 날짜별 묶기, 최근 며칠 합계. 화면·저장과 떨어진 순수 함수.
import type { TokenRecord, TokenRecordSource, TokenWallet } from "@chatbot/features/core/types"; // 도메인 타입
import { getDailyUsage, tokenCosts } from "@chatbot/lib/story/token-policy"; // 오늘 사용량·비용표
import { getDateKey, getDateParts } from "@chatbot/lib/time/date-key"; // 한국 시간 날짜
import { getActiveLocale } from "@chatbot/lib/i18n"; // 화면 언어

export const TOKEN_RECORD_LIMIT = 300; // 토큰 기록 보관 수(받음·사용 합쳐 최근 순)
export const TOKEN_SUMMARY_DAYS = 7; // 그래프에 보여 줄 날 수

export type TokenRecordFilter = "all" | "earn" | "spend"; // 기록 종류 필터

export const tokenSourceLabels: Readonly<Record<TokenRecordSource, string>> = // 출처 이름
{ // 이름 시작
    attendance: "출석", // 출석
    mission: "미션", // 미션
    "mission-bonus": "미션 보너스", // 미션 보너스
    "invite-welcome": "초대 환영", // 초대 환영
    "invite-friend": "친구 초대", // 친구 초대
    chat: "대화", // 대화
    "scene-image": "장면 이미지", // 장면 이미지
    "studio-image": "이미지 스튜디오", // 이미지 스튜디오
}; // 이름 종료

export interface TokenRecordGroup // 날짜별 기록 묶음
{ // 구조 시작
    dateKey: string; // 날짜 키
    label: string; // 날짜 이름(10월 3일 (토))
    records: TokenRecord[]; // 그날 기록(최근 순)
    earned: number; // 그날 받은 토큰
    spent: number; // 그날 쓴 토큰
} // 구조 종료

export interface TokenDaySummary // 하루 합계(그래프용)
{ // 구조 시작
    dateKey: string; // 날짜 키
    label: string; // 짧은 날짜(10/3)
    weekday: string; // 요일(토)
    fullLabel: string; // 날짜 이름(10월 3일 (토))
    earned: number; // 받은 토큰
    spent: number; // 쓴 토큰
} // 구조 종료

const weekdays = ["일", "월", "화", "수", "목", "금", "토"]; // 요일 이름

function describeDate(dateKey: string): { label: string; weekday: string; fullLabel: string } // 날짜 키 → 표시 이름
{ // 함수 시작
    const [year, month, day] = dateKey.split("-").map(Number); // 연월일
    const date = new Date(Date.UTC(year, month - 1, day)); // 그날
    if (getActiveLocale() === "en") // 영어 화면
    { // 조건 시작
        const weekdayName = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date); // 요일(Mon)
        return { label: `${month}/${day}`, weekday: weekdayName, fullLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" }).format(date) }; // 영어 이름 반환
    } // 조건 종료
    const weekday = weekdays[date.getUTCDay()]; // 요일
    return { label: `${month}/${day}`, weekday, fullLabel: `${month}월 ${day}일 (${weekday})` }; // 이름 반환
} // 함수 종료

export function addTokenRecord(records: readonly TokenRecord[], record: TokenRecord): TokenRecord[] // 기록 추가(최근 순, 같은 식별자는 교체, 한도 유지)
{ // 함수 시작
    return [record, ...records.filter((item) => item.id !== record.id)].slice(0, TOKEN_RECORD_LIMIT); // 기록 반환
} // 함수 종료

export function splitChatSpend(before: TokenWallet, after: TokenWallet, spent: number): { chat: number; image: number } // 채팅 화면이 쓴 토큰을 대화와 장면 이미지로 나누기
{ // 함수 시작
    const usage = getDailyUsage(before, new Date(after.updatedAt)); // 쓴 날 기준 이전 사용량(날짜가 바뀌었으면 0)
    const imageCount = Math.max(0, after.dailyImageUsed - usage.image); // 그 사이 만든 장면 이미지 수
    const image = Math.min(spent, imageCount * tokenCosts["manual-image"]); // 장면 이미지에 쓴 토큰
    return { chat: spent - image, image }; // 나눈 값 반환
} // 함수 종료

export function filterTokenRecords(records: readonly TokenRecord[], filter: TokenRecordFilter): TokenRecord[] // 종류별 기록
{ // 함수 시작
    return filter === "all" ? [...records] : records.filter((record) => record.direction === filter); // 필터 반환
} // 함수 종료

export type TokenPeriodId = "all" | "today" | "week" | "month" | "custom"; // 기간 종류

export interface TokenPeriod // 고른 기간
{ // 구조 시작
    id: TokenPeriodId; // 종류
    from: string; // 직접 고를 때의 시작 날짜(연-월-일, 비우면 제한 없음)
    to: string; // 직접 고를 때의 끝 날짜(연-월-일, 비우면 제한 없음)
} // 구조 종료

const periodDays: Partial<Record<TokenPeriodId, number>> = { today: 1, week: 7, month: 30 }; // 기간별 날 수(오늘 포함)

export function getTokenPeriodRange(period: TokenPeriod, now: Date): { from: string | null; to: string | null } // 기간의 시작·끝 날짜(한국 시간, 없으면 제한 없음)
{ // 함수 시작
    if (period.id === "all") // 전체 기간
    { // 조건 시작
        return { from: null, to: null }; // 제한 없음
    } // 조건 종료
    if (period.id === "custom") // 직접 고르기
    { // 조건 시작
        const from = period.from.length === 0 ? null : period.from; // 시작
        const to = period.to.length === 0 ? null : period.to; // 끝
        return from !== null && to !== null && from > to ? { from: to, to: from } : { from, to }; // 거꾸로 골랐으면 바꿔서 반환
    } // 조건 종료
    const { year, month, day } = getDateParts(now); // 오늘(한국 시간)
    const start = new Date(Date.UTC(year, month - 1, day - ((periodDays[period.id] ?? 1) - 1))); // 시작 날
    return { from: start.toISOString().slice(0, 10), to: getDateKey(now) }; // 범위 반환
} // 함수 종료

export function filterTokenRecordsByPeriod(records: readonly TokenRecord[], period: TokenPeriod, now: Date): TokenRecord[] // 기간에 든 기록
{ // 함수 시작
    const { from, to } = getTokenPeriodRange(period, now); // 범위
    return records.filter((record) => // 기록 순회
    { // 판정 시작
        const key = getDateKey(new Date(record.createdAt)); // 기록 날짜
        return (from === null || key >= from) && (to === null || key <= to); // 범위 안
    }); // 판정 종료
} // 함수 종료

export function groupTokenRecords(records: readonly TokenRecord[]): TokenRecordGroup[] // 날짜별로 묶기(한국 시간, 받은 순서 유지)
{ // 함수 시작
    const groups: TokenRecordGroup[] = []; // 묶음 목록
    for (const record of records) // 기록 순회
    { // 순회 시작
        const dateKey = getDateKey(new Date(record.createdAt)); // 기록 날짜
        let group = groups.find((item) => item.dateKey === dateKey); // 같은 날 묶음
        if (group === undefined) // 새 날짜
        { // 조건 시작
            group = { dateKey, label: describeDate(dateKey).fullLabel, records: [], earned: 0, spent: 0 }; // 묶음 생성
            groups.push(group); // 추가
        } // 조건 종료
        group.records.push(record); // 기록 추가
        group.earned += record.direction === "earn" ? record.amount : 0; // 받은 합계
        group.spent += record.direction === "spend" ? record.amount : 0; // 쓴 합계
    } // 순회 종료
    return groups; // 묶음 반환
} // 함수 종료

export function summarizeTokenDays(records: readonly TokenRecord[], now: Date, days = TOKEN_SUMMARY_DAYS): TokenDaySummary[] // 최근 며칠의 하루 합계(오래된 날부터, 기록 없는 날은 0)
{ // 함수 시작
    const { year, month, day } = getDateParts(now); // 오늘(한국 시간)
    const summaries: TokenDaySummary[] = Array.from({ length: days }, (_item, index) => // 날짜 목록
    { // 생성 시작
        const date = new Date(Date.UTC(year, month - 1, day - (days - 1 - index))); // 그날
        const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`; // 날짜 키
        return { dateKey, ...describeDate(dateKey), earned: 0, spent: 0 }; // 빈 합계
    }); // 생성 종료
    for (const record of records) // 기록 순회
    { // 순회 시작
        const summary = summaries.find((item) => item.dateKey === getDateKey(new Date(record.createdAt))); // 그날 합계
        if (summary !== undefined) // 범위 안
        { // 조건 시작
            summary.earned += record.direction === "earn" ? record.amount : 0; // 받은 합계
            summary.spent += record.direction === "spend" ? record.amount : 0; // 쓴 합계
        } // 조건 종료
    } // 순회 종료
    return summaries; // 합계 반환
} // 함수 종료
