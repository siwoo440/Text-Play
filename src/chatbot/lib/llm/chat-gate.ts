// 서버 통로의 문지기: 내 컴퓨터에서 온 요청은 혼자 쓰는 시험용으로 받고(1분에 정해진 횟수까지), 공개를 켰을 때는 로그인한 사람마다 1분·하루 한도를 따로 센다(누가 보냈는지는 chat-caller.ts가 가림).
export const CHAT_REQUESTS_PER_MINUTE = 20; // 1분에 받는 요청 수
export const CHAT_BODY_LIMIT = 400_000; // 요청 글자 수 한도

const WINDOW_MS = 60_000; // 세는 시간(1분)
let recent: number[] = []; // 최근 요청 시각

export function isLocalHost(host: string | null): boolean // 내 컴퓨터로 온 요청인지(localhost·127.0.0.1·[::1])
{ // 함수 시작
    const name = (host ?? "").toLowerCase().replace(/:\d+$/, ""); // 포트 제거
    return name === "localhost" || name === "127.0.0.1" || name === "[::1]" || name.endsWith(".localhost"); // 로컬 주소
} // 함수 종료

export function isChatAllowedFrom(host: string | null, env: Record<string, string | undefined> = process.env): boolean // 이 요청에 실제 AI를 써도 되는지
{ // 함수 시작
    return isLocalHost(host) || (env.CHAT_ALLOW_PUBLIC ?? "").trim() === "true"; // 내 컴퓨터이거나, 공개를 명시적으로 켠 경우
} // 함수 종료

export function takeChatSlot(now: number = Date.now()): boolean // 요청 한 번 받기(한도를 넘으면 거절)
{ // 함수 시작
    recent = recent.filter((time) => now - time < WINDOW_MS); // 1분이 지난 기록 지움
    if (recent.length >= CHAT_REQUESTS_PER_MINUTE) // 한도 도달
    { // 조건 시작
        return false; // 거절
    } // 조건 종료
    recent.push(now); // 기록
    return true; // 받음
} // 함수 종료

export function resetChatSlots(): void // 기록 비우기(테스트용)
{ // 함수 시작
    recent = []; // 비움
} // 함수 종료

// 아래는 로그인한 사람마다 따로 세는 한도다(공개 주소에서 실제 AI를 열 때 씀). 기록은 서버의 메모리에만 두어 서버를 다시 켜면 처음부터 세고, 서버가 여러 대면 대마다 따로 센다.
export const DEFAULT_USER_REQUESTS_PER_MINUTE = 20; // 한 사람이 1분에 보낼 수 있는 요청 수(메시지 한 번에 답변과 스탯 판단 두 요청이 나감)
export const DEFAULT_USER_MESSAGES_PER_DAY = 300; // 한 사람이 하루에 보낼 수 있는 메시지 수
const SEOUL_OFFSET_MS = 9 * 3600 * 1000; // 서울 시각과 세계 표준시의 차이
const DAY_MS = 24 * 3600 * 1000; // 하루

export interface UsageLimits // 사용량 한도
{ // 구조 시작
    perMinute: number; // 한 사람의 1분 요청 수(답변·요약·스탯 판단 모두)
    perDay: number; // 한 사람의 하루 메시지 수(답변 요청만)
    totalPerDay: number; // 모든 사람을 합친 하루 메시지 수(0이면 두지 않음. 예산을 지키는 마지막 안전장치)
} // 구조 종료

export type UsageKind = "message" | "assist"; // 요청 종류(message: 답변, assist: 요약·스탯 판단)
export type UsageResult = { ok: true } | { ok: false; reason: "minute" | "day"; retryAfterSeconds: number }; // 받았는지, 아니면 어느 한도에 걸렸고 몇 초 뒤에 다시 되는지

const users = new Map<string, { recent: number[]; messages: number }>(); // 사람별 기록(최근 요청 시각과 오늘 보낸 메시지 수)
let usageDay = ""; // 기록이 가리키는 날짜(서울)
let totalMessages = 0; // 오늘 모든 사람이 보낸 메시지 수

function positive(value: string | undefined, fallback: number): number // 1 이상의 정수로 읽기(아니면 기본값)
{ // 함수 시작
    const parsed = Number((value ?? "").trim()); // 숫자로
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback; // 올바른 값 또는 기본값
} // 함수 종료

export function readUsageLimits(env: Record<string, string | undefined> = process.env): UsageLimits // 한도 읽기(환경 변수로 정하고 없으면 기본값)
{ // 함수 시작
    return { perMinute: positive(env.CHAT_USER_REQUESTS_PER_MINUTE, DEFAULT_USER_REQUESTS_PER_MINUTE), perDay: positive(env.CHAT_USER_MESSAGES_PER_DAY, DEFAULT_USER_MESSAGES_PER_DAY), totalPerDay: positive(env.CHAT_TOTAL_MESSAGES_PER_DAY, 0) }; // 한도 반환
} // 함수 종료

export function getSeoulDayKey(now: number): string // 서울 날짜(하루 한도를 나누는 기준)
{ // 함수 시작
    return new Date(now + SEOUL_OFFSET_MS).toISOString().slice(0, 10); // 연-월-일
} // 함수 종료

function rollDay(now: number): void // 날짜가 바뀌었으면 하루 기록을 비움
{ // 함수 시작
    const day = getSeoulDayKey(now); // 오늘
    if (day !== usageDay) // 날짜가 바뀜
    { // 조건 시작
        usageDay = day; // 오늘로
        users.clear(); // 사람별 기록 비움
        totalMessages = 0; // 전체 기록 비움
    } // 조건 종료
} // 함수 종료

export function takeUserSlot(userId: string, kind: UsageKind, limits: UsageLimits, now: number = Date.now()): UsageResult // 한 사람의 요청 한 번 받기(한도를 넘으면 거절하고 세지 않음)
{ // 함수 시작
    rollDay(now); // 날짜 확인
    const record = users.get(userId) ?? { recent: [], messages: 0 }; // 이 사람의 기록
    record.recent = record.recent.filter((time) => now - time < WINDOW_MS); // 1분이 지난 기록 지움
    users.set(userId, record); // 기록 보관
    if (kind === "message" && record.messages >= limits.perDay) // 하루 한도 도달
    { // 조건 시작
        return { ok: false, reason: "day", retryAfterSeconds: Math.ceil((DAY_MS - ((now + SEOUL_OFFSET_MS) % DAY_MS)) / 1000) }; // 서울 자정에 다시
    } // 조건 종료
    if (record.recent.length >= limits.perMinute) // 1분 한도 도달
    { // 조건 시작
        return { ok: false, reason: "minute", retryAfterSeconds: 60 }; // 1분 뒤 다시
    } // 조건 종료
    record.recent.push(now); // 요청 기록
    record.messages += kind === "message" ? 1 : 0; // 메시지 수
    return { ok: true }; // 받음
} // 함수 종료

export function isTotalFull(limit: number, now: number = Date.now()): boolean // 모든 사람을 합친 하루 한도가 찼는지(한도가 없으면 차지 않음)
{ // 함수 시작
    rollDay(now); // 날짜 확인
    return limit > 0 && totalMessages >= limit; // 가득 참
} // 함수 종료

export function takeTotalSlot(limit: number, now: number = Date.now()): boolean // 전체 한도에서 메시지 한 번 받기(한도가 없으면 세지 않고 받음)
{ // 함수 시작
    if (limit <= 0) // 전체 한도를 두지 않음
    { // 조건 시작
        return true; // 받음
    } // 조건 종료
    if (isTotalFull(limit, now)) // 가득 참
    { // 조건 시작
        return false; // 거절
    } // 조건 종료
    totalMessages += 1; // 기록
    return true; // 받음
} // 함수 종료

export function resetUserSlots(): void // 사람별·전체 기록 비우기(테스트용)
{ // 함수 시작
    users.clear(); // 사람별 기록 비움
    totalMessages = 0; // 전체 기록 비움
    usageDay = ""; // 날짜 비움
} // 함수 종료
