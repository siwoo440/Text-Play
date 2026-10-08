import { computeStats, formatStatDelta, formatStatValue, type StatBaseline, type StatChange } from "@chatbot/features/chat/stat-model"; // 스탯 계산
import type { Conversation, StatusSnapshot, StatusTemplate, StatValue } from "@chatbot/features/core/types"; // 도메인 타입
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 판정
import { getDateParts } from "@chatbot/lib/time/date-key"; // 서울 날짜
import { getActiveLocale, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·화면 언어

export interface StatusContext // 상태창 계산 입력
{ // 구조 시작
    template: StatusTemplate; // 상태창 형식
    people: string[]; // 인물 이름
    previous: StatusSnapshot | null; // 직전 턴 상태창
    turn: number; // 이번 턴 번호
    userMessage: string; // 이번 사용자 메시지(낱말 규칙)
    aiChanges: StatChange[]; // AI가 정한 스탯 변화
    baselines?: StatBaseline[]; // 직전 상태창에 값이 없을 때의 시작 값(관계 스탯 이어받기)
    emotion: string; // 이번 턴 감정
    tags: string[]; // 작품 태그
    startedAt: string; // 대화 시작 시각(요일 기준)
    seed: string; // 결정 키(대화 식별자)
} // 구조 종료

const locationPools: Record<string, string[]> = // 장르별 장소
{ // 장소 시작
    healing: ["햇살 드는 카페 창가", "골목 공원 벤치", "온실 정원", "강가 산책로"], // 힐링
    fantasy: ["달빛 서고", "마법 정원", "오래된 탑 계단", "별빛 광장"], // 판타지
    modern: ["퇴근길 골목", "옥상 정원", "편의점 앞 벤치", "작은 작업실"], // 현대
    romance: ["노을 진 다리", "작은 레스토랑", "강변 벤치", "불 켜진 창가"], // 로맨스
    mystery: ["불 꺼진 기록실", "지하 창고", "비 내리는 골목", "닫힌 전시실"], // 미스터리
    sf: ["관측선 조종실", "궤도 정거장 라운지", "격납고", "통신실"], // SF(공상 과학)
    etc: ["조용한 거리", "작은 방", "창가 자리", "낯선 복도"], // 기타
}; // 장소 종료
const tips = ["표정을 살피며 천천히 다가가 보세요.", "지금은 질문보다 공감이 좋아요.", "주변 사물을 활용해 분위기를 바꿔 보세요.", "숨기는 이야기가 있어요. 조심스럽게 물어보세요.", "잠시 침묵을 지켜도 괜찮아요.", "약속을 하나 제안해 보세요."]; // 진행 팁
const thoughtPools: Record<string, string[]> = // 감정별 속마음
{ // 속마음 시작
    positive: ["…생각보다 편하네, 이 사람.", "조금만 더 이야기하고 싶은데.", "왜 자꾸 웃음이 나지?"], // 긍정
    tense: ["들키면 안 되는데…", "지금 말해도 될까.", "손이 조금 떨린다."], // 긴장
    calm: ["이 시간이 오래갔으면.", "괜히 마음이 놓인다.", "오늘은 왠지 다르다."], // 평온
}; // 속마음 종료
const customValues = ["변화 없음", "조금 올랐다", "크게 흔들렸다", "단서를 하나 찾았다"]; // 직접 항목 값
const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]; // 요일 이름

function hash(text: string): number // 결정 해시
{ // 함수 시작
    return [...text].reduce((total, character) => (total * 31 + (character.codePointAt(0) ?? 0)) >>> 0, 7); // 해시 반환
} // 함수 종료

function emotionGroup(emotion: string): "positive" | "tense" | "calm" // 감정 묶음
{ // 함수 시작
    if (/설렘|기쁨|기대|관심|호기심|즐거/.test(emotion)) // 긍정 판정
    { // 조건 시작
        return "positive"; // 긍정
    } // 조건 종료
    return /긴장|불안|경계|당황|슬픔/.test(emotion) ? "tense" : "calm"; // 긴장·평온
} // 함수 종료

export function getStatusPeople(conversation: Pick<Conversation, "mode" | "storyCast">, characterDisplayName: string): string[] // 상태창 인물(스토리는 등장인물, 캐릭터 대화는 한 명)
{ // 함수 시작
    return conversation.mode === "story" ? conversation.storyCast.map((member) => member.displayName) : [characterDisplayName]; // 인물 이름
} // 함수 종료

export function formatStoryTime(startedAt: string, turn: number): string // 작품 속 시간(시작 요일 20:00부터 턴마다 6분)
{ // 함수 시작
    const start = new Date(startedAt); // 시작 시각
    const startDay = Number.isNaN(start.getTime()) ? 5 : new Date(Date.UTC(getDateParts(start).year, getDateParts(start).month - 1, getDateParts(start).day)).getUTCDay(); // 서울 기준 요일
    const minutes = 20 * 60 + turn * 6; // 경과 분
    const day = (startDay + Math.floor(minutes / 1440)) % 7; // 요일
    const inDay = minutes % 1440; // 하루 안 분
    return `${t(weekdays[day])} ${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`; // 시간 표시(요일은 화면 언어로)
} // 함수 종료

export function composeStatus(context: StatusContext): StatusSnapshot // 한 턴의 상태창 만들기(Mock, 같은 입력이면 같은 결과)
{ // 함수 시작
    const { template, turn, seed } = context; // 입력 분해
    const pool = locationPools[getGenreKey(context.tags)] ?? locationPools.etc; // 장소 묶음
    const location = template.location ? t(pool[(Math.floor(Math.max(turn - 1, 0) / 4) + hash(seed)) % pool.length]) : null; // 4턴마다 장소 이동(화면 언어로)
    const time = template.time ? formatStoryTime(context.startedAt, turn) : null; // 작품 속 시간
    const lead = context.people[0] ?? "상대"; // 대표 인물
    const rawTip = tips[hash(`${seed}|${turn}`) % tips.length]; // 이번 턴 팁
    const tip = !template.tip ? null : getActiveLocale() === "en" ? t(rawTip) : `${lead}의 ${rawTip}`.replace(`${lead}의 지금은`, "지금은").replace(`${lead}의 잠시`, "잠시").replace(`${lead}의 약속`, "약속"); // 진행 팁(한국어는 인물 이름을 붙임)
    const stats = computeStats({ stats: template.stats, people: context.people, previous: context.previous, userMessage: context.userMessage, aiChanges: context.aiChanges, baselines: context.baselines }); // 스탯(규칙 + AI)
    const thoughts = template.thought ? context.people.map((person) => // 속마음
    { // 변환 시작
        const lines = thoughtPools[emotionGroup(context.emotion)]; // 감정별 문장
        return { name: person, text: t(lines[hash(`${person}|${turn}|${seed}`) % lines.length]) }; // 속마음 반환(화면 언어로)
    }) : []; // 속마음 종료
    const custom = template.customLabels.filter((label) => label.trim().length > 0).map((label) => ({ label, value: t(customValues[hash(`${label}|${turn}`) % customValues.length]) })); // 직접 항목(화면 언어로)
    return { turn, location, time, tip, stats, thoughts, custom }; // 상태창 반환
} // 함수 종료

export function formatStatusText(status: StatusSnapshot): string // 복사용 문구
{ // 함수 시작
    const lines: string[] = []; // 줄 목록
    const head = [status.location === null ? null : `📍${status.location}`, status.time === null ? null : `⏳${status.time}`].filter((item): item is string => item !== null); // 장소·시간
    if (head.length > 0) // 머리 줄 판정
    { // 조건 시작
        lines.push(`[${head.join(" | ")}]`); // 머리 줄
    } // 조건 종료
    if (status.tip !== null) // 팁 판정
    { // 조건 시작
        lines.push(t("[💡팁: {0}]", [status.tip])); // 팁 줄
    } // 조건 종료
    const chip = (item: StatValue) => `${item.icon}${item.name} ${formatStatValue(item)}(${formatStatDelta(item.delta)})`; // 스탯 글자
    for (const person of getStatusRows(status)) // 인물 순회
    { // 순회 시작
        lines.push(`[${person.name}${person.stats.length === 0 ? "" : ` ${person.stats.map(chip).join(" ")}`}]${person.thought === null ? "" : ` "${person.thought}"`}`); // 인물 줄
    } // 순회 종료
    const shared = status.stats.filter((item) => item.target === null); // 공통 스탯
    if (shared.length > 0) // 공통 판정
    { // 조건 시작
        lines.push(t("[공통 {0}]", [shared.map(chip).join(" ")])); // 공통 줄
    } // 조건 종료
    for (const item of status.custom) // 직접 항목 순회
    { // 순회 시작
        lines.push(`[${item.label}: ${item.value}]`); // 직접 항목 줄
    } // 순회 종료
    return lines.join("\n"); // 문구 반환
} // 함수 종료

export interface StatusRow // 상태창 인물 줄
{ // 구조 시작
    name: string; // 인물 이름
    stats: StatValue[]; // 그 인물의 스탯
    thought: string | null; // 속마음
} // 구조 종료

export function getStatusRows(status: Pick<StatusSnapshot, "stats" | "thoughts">): StatusRow[] // 인물별 스탯·속마음 묶기(나온 순서 유지)
{ // 함수 시작
    const names = [...new Set([...status.stats.flatMap((item) => item.target === null ? [] : [item.target]), ...status.thoughts.map((item) => item.name)])]; // 인물 이름
    return names.map((name) => ({ name, stats: status.stats.filter((item) => item.target === name), thought: status.thoughts.find((item) => item.name === name)?.text ?? null })); // 인물 줄
} // 함수 종료
