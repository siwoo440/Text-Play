// 주간 미션: 월요일 0시(한국 시간)에 새로 시작하는 큰 목표 세 가지. 오늘의 미션과 같은 방식으로 진행을 세고 보상을 직접 받는다.
import type { AppState, RewardState, WeeklyMissionId, WeeklyMissionState } from "@chatbot/features/core/types"; // 상태 타입
import { grantTokens } from "@chatbot/features/rewards/reward-model"; // 토큰 지급
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { getDateParts } from "@chatbot/lib/time/date-key"; // 한국 시간 날짜

export interface WeeklyMissionDefinition // 주간 미션 정의
{ // 구조 시작
    id: WeeklyMissionId; // 식별자
    title: string; // 이름
    description: string; // 설명
    target: number; // 목표 횟수
    reward: number; // 보상 토큰
    href: string; // 하러 가는 곳
    actionLabel: string; // 이동 버튼 이름
} // 구조 종료

export interface WeeklyMissionView // 주간 미션 화면 값
{ // 구조 시작
    definition: WeeklyMissionDefinition; // 정의
    progress: number; // 진행(목표까지만)
    completed: boolean; // 달성
    claimed: boolean; // 받음
    claimable: boolean; // 지금 받을 수 있음
} // 구조 종료

export const weeklyMissions: readonly WeeklyMissionDefinition[] = // 주간 미션(매주 같은 세 가지, 다 받으면 30토큰)
[ // 목록 시작
    { id: "weekly-messages", title: "메시지 30번 보내기", description: "이번 주에 캐릭터나 스토리와 대화를 나눠요.", target: 30, reward: 10, href: "/", actionLabel: "대화하러 가기" }, // 메시지
    { id: "weekly-attendance", title: "5일 출석하기", description: "이번 주에 출석 도장을 다섯 번 찍어요.", target: 5, reward: 10, href: "/rewards", actionLabel: "출석하러 가기" }, // 출석
    { id: "weekly-conversations", title: "새 대화 3번 시작하기", description: "이번 주에 새 대화를 세 번 열고 첫 메시지를 보내요.", target: 3, reward: 10, href: "/explore", actionLabel: "둘러보기" }, // 새 대화
]; // 목록 종료

function toKey(date: Date): string // 날짜 키(연-월-일)
{ // 함수 시작
    return date.toISOString().slice(0, 10); // 키 반환
} // 함수 종료

export function getWeekKey(now: Date): string // 이번 주 월요일의 날짜 키(한국 시간)
{ // 함수 시작
    const { year, month, day } = getDateParts(now); // 오늘(한국 시간)
    const today = new Date(Date.UTC(year, month - 1, day)); // 오늘 0시
    const sinceMonday = (today.getUTCDay() + 6) % 7; // 월요일부터 지난 날 수(월 0 … 일 6)
    return toKey(new Date(Date.UTC(year, month - 1, day - sinceMonday))); // 월요일 반환
} // 함수 종료

export function getWeekDaysLeft(now: Date): number // 이번 주가 끝날 때까지 남은 날 수(오늘 포함, 월 7 … 일 1)
{ // 함수 시작
    const { year, month, day } = getDateParts(now); // 오늘(한국 시간)
    return 7 - (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7; // 남은 날
} // 함수 종료

export function getWeeklyState(rewards: Pick<RewardState, "weekly">, now: Date): WeeklyMissionState // 이번 주 기준 상태(주가 바뀌었거나 기록이 없으면 빈 상태)
{ // 함수 시작
    const weekKey = getWeekKey(now); // 이번 주
    const weekly = rewards.weekly; // 저장된 상태
    return weekly !== undefined && weekly.weekKey !== null && weekly.weekKey >= weekKey ? weekly : { weekKey, progress: {}, claimed: [] }; // 이번 주 기록(시계를 뒤로 돌려도 그대로) 또는 새 주
} // 함수 종료

export function getWeeklyViews(rewards: Pick<RewardState, "weekly">, now: Date): WeeklyMissionView[] // 주간 미션 화면 값 계산
{ // 함수 시작
    const week = getWeeklyState(rewards, now); // 이번 주 상태
    return weeklyMissions.map((definition) => // 미션 순회
    { // 계산 시작
        const progress = Math.min(definition.target, week.progress[definition.id] ?? 0); // 진행
        const completed = progress >= definition.target; // 달성
        const claimed = week.claimed.includes(definition.id); // 받음
        return { definition, progress, completed, claimed, claimable: completed && !claimed }; // 화면 값
    }); // 계산 종료
} // 함수 종료

export function recordWeeklyProgress(rewards: RewardState, missionId: WeeklyMissionId, amount: number, now: Date): { rewards: RewardState; completedNow: boolean } // 주간 미션 진행 기록(목표에 닿는 순간만 완료 표시)
{ // 함수 시작
    const definition = weeklyMissions.find((mission) => mission.id === missionId); // 미션 정의
    const week = getWeeklyState(rewards, now); // 이번 주 상태
    const before = Math.min(definition?.target ?? 0, week.progress[missionId] ?? 0); // 이전 진행
    if (definition === undefined || amount <= 0 || before >= definition.target) // 없는 미션·변화 없음·이미 달성
    { // 조건 시작
        return { rewards, completedNow: false }; // 변화 없음
    } // 조건 종료
    const after = Math.min(definition.target, before + Math.floor(amount)); // 목표까지만
    return { rewards: { ...rewards, weekly: { ...week, progress: { ...week.progress, [missionId]: after } } }, completedNow: after >= definition.target }; // 기록 반환
} // 함수 종료

export function claimWeeklyMission(state: AppState, missionId: WeeklyMissionId, now: string): AppState // 주간 미션 보상 받기
{ // 함수 시작
    const view = getWeeklyViews(state.rewards, new Date(now)).find((item) => item.definition.id === missionId); // 미션 상태
    if (view === undefined || !view.claimable) // 미완료·이미 받음
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    const week = getWeeklyState(state.rewards, new Date(now)); // 이번 주 상태
    const claimed: AppState = { ...state, rewards: { ...state.rewards, weekly: { ...week, claimed: [...week.claimed, missionId] } } }; // 받음 표시
    return grantTokens(claimed, { id: `weekly-mission-${week.weekKey}-${missionId}`, source: "mission", label: t("주간 미션: {0}", [view.definition.title]), amount: view.definition.reward, now }); // 보상 지급(받은 기록의 출처는 미션)
} // 함수 종료

export function getWeeklyClaimable(rewards: Pick<RewardState, "weekly">, now: Date): { count: number; tokens: number } // 지금 받을 수 있는 주간 보상
{ // 함수 시작
    const ready = getWeeklyViews(rewards, now).filter((view) => view.claimable); // 받을 미션
    return { count: ready.length, tokens: ready.reduce((sum, view) => sum + view.definition.reward, 0) }; // 수와 토큰
} // 함수 종료
