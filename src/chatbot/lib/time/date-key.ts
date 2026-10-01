export const DEFAULT_TIME_ZONE = "Asia/Seoul"; // 기본 시간대(서비스 기준)

export interface DateParts // 날짜 구성
{ // 구조 시작
    year: number; // 연도
    month: number; // 월(1~12)
    day: number; // 일
} // 구조 종료

const formatters = new Map<string, Intl.DateTimeFormat>(); // 시간대별 날짜 분해 도구

function getFormatter(timeZone: string): Intl.DateTimeFormat // 날짜 분해 도구 조회
{ // 함수 시작
    const cached = formatters.get(timeZone); // 기존 도구 조회
    if (cached !== undefined) // 재사용 판정
    { // 조건 시작
        return cached; // 기존 도구 반환
    } // 조건 종료
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" }); // 새 도구 생성
    formatters.set(timeZone, formatter); // 도구 저장
    return formatter; // 새 도구 반환
} // 함수 종료

export function getDateParts(date: Date, timeZone = DEFAULT_TIME_ZONE): DateParts // 시간대 기준 날짜 구성
{ // 함수 시작
    const parts = getFormatter(timeZone).formatToParts(date); // 날짜 분해
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0); // 부분 값 조회
    return { year: read("year"), month: read("month"), day: read("day") }; // 연월일 반환
} // 함수 종료

export function getDateKey(date: Date, timeZone = DEFAULT_TIME_ZONE): string // 시간대 기준 날짜 키(연-월-일)
{ // 함수 시작
    const { year, month, day } = getDateParts(date, timeZone); // 날짜 구성
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; // 날짜 키 반환
} // 함수 종료

export function getDayNumber(date: Date, timeZone = DEFAULT_TIME_ZONE): number // 시간대 기준 날짜 번호(날짜 차이 계산용)
{ // 함수 시작
    const { year, month, day } = getDateParts(date, timeZone); // 날짜 구성
    return Date.UTC(year, month - 1, day) / 86_400_000; // 날짜 번호 반환
} // 함수 종료
