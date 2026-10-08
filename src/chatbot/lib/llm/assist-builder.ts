// 보조 지시문: 답변 말고 실제 AI에 맡기는 작은 일(대화 요약, 스탯 판단)의 요청을 검사하고, 지시문을 만들고, 돌아온 답을 정리한다.
import type { ChatTierId, ContentRating } from "@chatbot/features/core/types"; // 도메인 타입
import type { BuiltPrompt } from "@chatbot/lib/llm/prompt-builder"; // 조립한 지시문 형식

export interface AssistLine // 대화 한 줄(말한 사람의 이름과 내용)
{ // 구조 시작
    name: string; // 말한 사람
    content: string; // 내용
} // 구조 종료

export interface SummaryRequest // 대화 요약 요청
{ // 구조 시작
    task: "summary"; // 맡길 일
    tier: ChatTierId; // 채팅 등급(이 등급의 모델이 요약함)
    contentRating: ContentRating; // 작품 이용 등급(19세 작품은 직접 돌리는 모델만)
    language: "ko" | "en"; // 요약 언어
    title: string; // 대화방 이름
    lines: AssistLine[]; // 요약할 대화(오래된 것부터)
} // 구조 종료

export interface AssistStat // 판단할 수치 하나
{ // 구조 시작
    name: string; // 수치 이름
    target: string | null; // 인물(공통이면 null)
    value: number; // 지금 값
    min: number; // 최솟값
    max: number; // 최댓값
    maxChange: number; // 한 번에 변할 수 있는 크기
} // 구조 종료

export interface StatsRequest // 스탯 판단 요청
{ // 구조 시작
    task: "stats"; // 맡길 일
    tier: ChatTierId; // 채팅 등급(이 등급의 모델이 판단함)
    contentRating: ContentRating; // 작품 이용 등급
    userName: string; // 사용자 이름
    speakerName: string; // 답한 쪽 이름
    stats: AssistStat[]; // 판단할 수치(이 순서대로 번호를 붙임)
    userMessage: string; // 이번 사용자 말
    reply: string; // 이번 답변
} // 구조 종료

export type AssistRequest = SummaryRequest | StatsRequest; // 보조 요청

export const ASSIST_LINE_LIMIT = 800; // 대화 한 줄의 최대 글자 수
export const ASSIST_LINES = 20; // 받는 대화 줄 수(넘으면 오래된 것부터 버림)
export const SUMMARY_LIMIT = 220; // 요약 최대 글자 수
export const ASSIST_TIMEOUT_MS = 30_000; // 보조 요청을 기다리는 시간(넘으면 브라우저가 연습용 규칙으로 넘어감)
export const ASSIST_STATS = 12; // 한 번에 판단하는 수치 수
const STAT_CHANGE_CAP = 1000; // 변화 한도의 상한(스탯 편집기의 한도와 같음)
const tierIds: readonly ChatTierId[] = ["open", "basic", "smart", "balance", "plus", "premium", "master"]; // 등급 목록

function isRecord(value: unknown): value is Record<string, unknown> // 객체 판정
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부
} // 함수 종료

function text(value: unknown, limit: number): string // 글자로 읽고 길이 자르기
{ // 함수 시작
    return typeof value === "string" ? value.trim().slice(0, limit) : ""; // 글자가 아니면 빈 글
} // 함수 종료

function readLines(value: unknown): AssistLine[] // 대화 줄 읽기(빈 줄 제외, 최근 것만)
{ // 함수 시작
    const lines = Array.isArray(value) ? value.flatMap((item) => isRecord(item) && text(item.name, 40).length > 0 && text(item.content, ASSIST_LINE_LIMIT).length > 0 ? [{ name: text(item.name, 40), content: text(item.content, ASSIST_LINE_LIMIT) }] : []) : []; // 읽은 줄
    return lines.slice(-ASSIST_LINES); // 최근 줄만
} // 함수 종료

function whole(value: unknown): number | null // 정수로 읽기(숫자가 아니면 없음)
{ // 함수 시작
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null; // 반올림한 정수
} // 함수 종료

function readStats(value: unknown): AssistStat[] // 판단할 수치 읽기(이름이 없거나 숫자가 아닌 것은 뺌)
{ // 함수 시작
    const stats = Array.isArray(value) ? value.flatMap((item) => // 수치 순회
    { // 변환 시작
        if (!isRecord(item)) // 객체 아님
        { // 조건 시작
            return []; // 제외
        } // 조건 종료
        const name = text(item.name, 30); // 수치 이름
        const numbers = [whole(item.value), whole(item.min), whole(item.max), whole(item.maxChange)]; // 값·범위·변화 한도
        if (name.length === 0 || numbers.some((number) => number === null)) // 이름 없음·숫자 아님
        { // 조건 시작
            return []; // 제외
        } // 조건 종료
        const [current, min, max, maxChange] = numbers as number[]; // 읽은 숫자
        return [{ name, target: text(item.target, 40) || null, value: current, min, max, maxChange: Math.min(Math.max(Math.abs(maxChange), 1), STAT_CHANGE_CAP) }]; // 정리한 수치(변화 한도는 1 이상)
    }) : []; // 변환 종료
    return stats.slice(0, ASSIST_STATS); // 한 번에 판단하는 수만큼
} // 함수 종료

export function parseAssistRequest(value: unknown): AssistRequest | null // 요청 검사와 정리(모양이 다르면 없음)
{ // 함수 시작
    if (!isRecord(value) || !tierIds.includes(value.tier as ChatTierId)) // 필수 모양
    { // 조건 시작
        return null; // 거부
    } // 조건 종료
    const tier = value.tier as ChatTierId; // 등급
    const contentRating: ContentRating = value.contentRating === "mature" ? "mature" : value.contentRating === "teen" ? "teen" : "all"; // 이용 등급(모르는 값은 전체 이용가)
    if (value.task === "summary") // 대화 요약
    { // 조건 시작
        const lines = readLines(value.lines); // 대화 줄
        return lines.length === 0 ? null : { task: "summary", tier, contentRating, language: value.language === "en" ? "en" : "ko", title: text(value.title, 120), lines }; // 요약할 대화가 없으면 거부
    } // 조건 종료
    if (value.task === "stats") // 스탯 판단
    { // 조건 시작
        const stats = readStats(value.stats); // 판단할 수치
        const reply = text(value.reply, 4000); // 이번 답변
        return stats.length === 0 || reply.length === 0 ? null : { task: "stats", tier, contentRating, userName: text(value.userName, 40) || "사용자", speakerName: text(value.speakerName, 40) || "상대", stats, userMessage: text(value.userMessage, 2000), reply }; // 수치나 답변이 없으면 거부
    } // 조건 종료
    return null; // 모르는 일
} // 함수 종료

export function buildSummaryPrompt(request: SummaryRequest): BuiltPrompt // 대화 요약 지시문
{ // 함수 시작
    const system = [ // 역할과 규칙
        "너는 롤플레이 대화를 기록하는 서기다. 아래 대화에서 일어난 일을 2~3문장, 150자 안팎으로 요약한다.", // 역할
        "- 누가 무엇을 했는지, 관계나 상황이 어떻게 달라졌는지 사실만 적는다.", // 내용
        "- 대화에 없는 내용을 지어내지 않는다. 느낌이나 평가를 덧붙이지 않는다.", // 지어내기 금지
        "- 과거형 평서문으로 쓴다. 머리말·따옴표·목록·줄바꿈 없이 요약 문장만 쓴다.", // 형식
        request.language === "en" ? "- Write the summary in English. Keep names as they are." : "- 요약은 한국어로 쓴다.", // 언어
    ].join("\n"); // 규칙 글
    const transcript = request.lines.map((line) => `${line.name}: ${line.content}`).join("\n"); // 대화 줄
    return { system, messages: [{ role: "user", content: `${request.title.length === 0 ? "" : `대화방: ${request.title}\n\n`}${transcript}\n\n위 대화를 요약해 줘.` }], maxTokens: 300 }; // 지시문 반환(요약은 짧게만 받음)
} // 함수 종료

export function cleanSummary(raw: string, limit = SUMMARY_LIMIT): string // 요약 정리(머리말·따옴표·줄바꿈 제거, 한도를 넘으면 문장 끝에서 자름)
{ // 함수 시작
    const flat = raw.replace(/\*\*/g, "").replace(/\s+/g, " ").trim().replace(/^(요약|summary)\s*[:：]\s*/i, "").replace(/^["“'‘]+|["”'’]+$/g, "").trim(); // 한 줄로 만들고 머리말과 양끝 따옴표 제거
    if (flat.length <= limit) // 한도 안
    { // 조건 시작
        return flat; // 그대로
    } // 조건 종료
    const cut = flat.slice(0, limit); // 한도까지
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("다."), cut.lastIndexOf("! "), cut.lastIndexOf("? ")); // 마지막 문장 끝
    return end < limit / 3 ? cut.trim() : cut.slice(0, cut[end] === "다" ? end + 2 : end + 1).trim(); // 문장 끝에서 자름(너무 앞이면 한도에서 자름)
} // 함수 종료

export function buildStatsPrompt(request: StatsRequest): BuiltPrompt // 스탯 판단 지시문
{ // 함수 시작
    const system = [ // 역할과 규칙
        "너는 롤플레이 대화의 수치를 판정한다. 방금 주고받은 말을 읽고, 각 수치가 이번에 얼마나 변하는지 정한다.", // 역할
        "- 변화는 정수이고 수치마다 적힌 허용 범위 안에서 정한다. 그 수치와 상관없는 대화면 0이다.", // 범위
        `- 수치는 '${request.userName}'의 이번 말과 행동을 '${request.speakerName}' 쪽에서 어떻게 받아들였는지로 정한다. 답변의 말투가 부드럽다는 이유로 올리지 않는다.`, // 누구의 무엇을 보고 정하는지
        `- 수치 이름의 뜻대로 판단한다. 예: 호감도·신뢰처럼 좋은 감정의 수치는 '${request.userName}'이 다정하게 대하거나 배려하면 오르고, 무례하게 굴거나 상처를 주면(답변이 참고 넘어가더라도) 내린다. 경계심·긴장처럼 나쁜 감정의 수치는 그 반대다.`, // 판단 기준
        `- 이름 앞에 인물이 적힌 수치는 그 인물이 '${request.userName}'에게 느끼는 것이다.`, // 인물별 수치
        "- 설명 없이 JSON 한 줄만 쓴다. 형식: {\"1\": 0, \"2\": 0} (번호는 수치 목록의 번호)", // 답 형식
    ].join("\n"); // 규칙 글
    const list = request.stats.map((stat, index) => `${index + 1}. ${stat.target === null ? "" : `${stat.target}의 `}${stat.name}: 지금 ${stat.value} (범위 ${stat.min}~${stat.max}, 이번 변화 -${stat.maxChange}~+${stat.maxChange})`).join("\n"); // 번호를 붙인 수치 목록
    const talk = `${request.userMessage.length === 0 ? "" : `${request.userName}: ${request.userMessage}\n`}${request.speakerName}: ${request.reply}`; // 이번 대화
    return { system, messages: [{ role: "user", content: `수치 목록\n${list}\n\n이번 대화\n${talk}\n\n각 수치의 변화를 JSON으로 답해 줘.` }], maxTokens: 120 + request.stats.length * 12 }; // 지시문 반환(짧은 답만 받음)
} // 함수 종료

export function parseStatDeltas(raw: string, stats: ReadonlyArray<Pick<AssistStat, "maxChange">>): number[] | null // 답에서 변화 읽기(번호 순서, 한도 안 정수. JSON을 찾지 못하면 없음)
{ // 함수 시작
    const found = raw.replace(/:\s*\+(?=\d)/g, ": ").match(/\{[^{}]*\}/); // 첫 JSON 묶음(더하기 표시는 떼고 찾음)
    if (found === null) // JSON 없음
    { // 조건 시작
        return null; // 읽지 못함
    } // 조건 종료
    let parsed: unknown = null; // 해석한 값
    try // 해석 시도
    { // 시도 시작
        parsed = JSON.parse(found[0]); // 해석
    } // 시도 종료
    catch // 깨진 JSON
    { // 실패 시작
        return null; // 읽지 못함
    } // 실패 종료
    if (!isRecord(parsed)) // 객체 아님
    { // 조건 시작
        return null; // 읽지 못함
    } // 조건 종료
    const record = parsed; // 번호별 변화
    return stats.map((stat, index) => // 번호 순서대로
    { // 변환 시작
        const value = Number(record[String(index + 1)]); // 그 번호의 변화(없거나 숫자가 아니면 NaN)
        return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), -stat.maxChange), stat.maxChange) : 0; // 한도 안 정수(읽지 못한 번호는 0)
    }); // 변환 종료
} // 함수 종료
