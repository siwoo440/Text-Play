import type { StatusSnapshot, StatusTemplate } from "@chatbot/features/core/types"; // 도메인 타입
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 판정
import { getDateParts } from "@chatbot/lib/time/date-key"; // 서울 날짜

export interface StatusPerson // 상태창 인물
{ // 구조 시작
    name: string; // 표시 이름
    offset: number; // 스토리 인물별 호감도 차이(캐릭터 모드는 0)
} // 구조 종료

export interface StatusContext // 상태창 계산 입력
{ // 구조 시작
    template: StatusTemplate; // 상태창 형식
    people: StatusPerson[]; // 인물
    previous: StatusSnapshot | null; // 직전 턴 상태창
    turn: number; // 이번 턴 번호
    relationshipLevel: number; // 이번 턴 관계 수치
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
    sf: ["관측선 조종실", "궤도 정거장 라운지", "격납고", "통신실"], // SF
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

function clampLevel(value: number): number // 호감도 범위
{ // 함수 시작
    return Math.max(0, Math.min(100, Math.round(value))); // 0~100
} // 함수 종료

export function formatStoryTime(startedAt: string, turn: number): string // 작품 속 시간(시작 요일 20:00부터 턴마다 6분)
{ // 함수 시작
    const start = new Date(startedAt); // 시작 시각
    const startDay = Number.isNaN(start.getTime()) ? 5 : new Date(Date.UTC(getDateParts(start).year, getDateParts(start).month - 1, getDateParts(start).day)).getUTCDay(); // 서울 기준 요일
    const minutes = 20 * 60 + turn * 6; // 경과 분
    const day = (startDay + Math.floor(minutes / 1440)) % 7; // 요일
    const inDay = minutes % 1440; // 하루 안 분
    return `${weekdays[day]} ${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`; // 시간 표시
} // 함수 종료

export function composeStatus(context: StatusContext): StatusSnapshot // 한 턴의 상태창 만들기(Mock, 같은 입력이면 같은 결과)
{ // 함수 시작
    const { template, turn, seed } = context; // 입력 분해
    const pool = locationPools[getGenreKey(context.tags)] ?? locationPools.etc; // 장소 묶음
    const location = template.location ? pool[(Math.floor(Math.max(turn - 1, 0) / 4) + hash(seed)) % pool.length] : null; // 4턴마다 장소 이동
    const time = template.time ? formatStoryTime(context.startedAt, turn) : null; // 작품 속 시간
    const lead = context.people[0]?.name ?? "상대"; // 대표 인물
    const tip = template.tip ? `${lead}의 ${tips[hash(`${seed}|${turn}`) % tips.length]}`.replace(`${lead}의 지금은`, "지금은").replace(`${lead}의 잠시`, "잠시").replace(`${lead}의 약속`, "약속") : null; // 진행 팁
    const affection = template.affection ? context.people.map((person) => // 호감도
    { // 변환 시작
        const value = clampLevel(context.relationshipLevel + person.offset); // 이번 값
        const before = context.previous?.affection.find((item) => item.name === person.name)?.value ?? value; // 직전 값
        return { name: person.name, value, delta: value - before }; // 값과 변화
    }) : []; // 호감도 종료
    const thoughts = template.thought ? context.people.map((person) => // 속마음
    { // 변환 시작
        const lines = thoughtPools[emotionGroup(context.emotion)]; // 감정별 문장
        return { name: person.name, text: lines[hash(`${person.name}|${turn}|${seed}`) % lines.length] }; // 속마음 반환
    }) : []; // 속마음 종료
    const custom = template.customLabels.filter((label) => label.trim().length > 0).map((label) => ({ label, value: customValues[hash(`${label}|${turn}`) % customValues.length] })); // 직접 항목
    return { turn, location, time, tip, affection, thoughts, custom }; // 상태창 반환
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
        lines.push(`[💡팁: ${status.tip}]`); // 팁 줄
    } // 조건 종료
    for (const item of status.affection) // 호감도 순회
    { // 순회 시작
        const thought = status.thoughts.find((entry) => entry.name === item.name); // 같은 인물 속마음
        lines.push(`[${item.name} ❤️${item.value}/100(${item.delta >= 0 ? "+" : ""}${item.delta})]${thought === undefined ? "" : ` "${thought.text}"`}`); // 인물 줄
    } // 순회 종료
    for (const thought of status.thoughts.filter((entry) => !status.affection.some((item) => item.name === entry.name))) // 호감도 없는 속마음
    { // 순회 시작
        lines.push(`[${thought.name}] "${thought.text}"`); // 속마음 줄
    } // 순회 종료
    for (const item of status.custom) // 직접 항목 순회
    { // 순회 시작
        lines.push(`[${item.label}: ${item.value}]`); // 직접 항목 줄
    } // 순회 종료
    return lines.join("\n"); // 문구 반환
} // 함수 종료
