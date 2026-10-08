// 일일 출석과 오늘의 미션 규칙: 화면·저장과 떨어진 순수 함수라 나중에 서버로 그대로 옮길 수 있다.
import type { AppState, AttendanceState, DailyMissionState, MissionId, RewardState, TokenRecord, TokenRecordSource } from "@chatbot/features/core/types"; // 상태 타입
import { addTokenRecord, TOKEN_RECORD_LIMIT } from "@chatbot/lib/story/token-ledger"; // 토큰 기록
import { getDailyUsage } from "@chatbot/lib/story/token-policy"; // 오늘 사용량
import { getDateKey } from "@chatbot/lib/time/date-key"; // 한국 시간 날짜 키
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { getWeeklyClaimable } from "@chatbot/features/rewards/weekly-model"; // 주간 미션 보상(서로 함수만 불러 쓰므로 순서 문제 없음)

export const ATTENDANCE_CYCLE = 7; // 도장판 칸 수
export const attendanceRewards: readonly number[] = [5, 5, 5, 5, 5, 5, 20]; // 1~7일차 보상(일주일 50토큰)
export const MISSION_BONUS = 5; // 오늘의 미션을 모두 채운 보너스
export { TOKEN_RECORD_LIMIT }; // 토큰 기록 보관 수(받음·사용이 같은 목록을 씀)

export interface MissionDefinition // 미션 정의
{ // 구조 시작
    id: MissionId; // 식별자
    title: string; // 이름
    description: string; // 설명
    target: number; // 목표 횟수
    reward: number; // 보상 토큰
    href: string; // 하러 가는 곳
    actionLabel: string; // 이동 버튼 이름
} // 구조 종료

export const dailyMissions: readonly MissionDefinition[] = // 오늘의 미션(매일 같은 세 가지)
[ // 목록 시작
    { id: "send-messages", title: "메시지 5번 보내기", description: "캐릭터나 스토리와 대화를 나눠요.", target: 5, reward: 3, href: "/", actionLabel: "대화하러 가기" }, // 메시지
    { id: "start-conversation", title: "새 대화 시작하기", description: "캐릭터나 스토리와 새 대화를 열고 첫 메시지를 보내요.", target: 1, reward: 3, href: "/explore", actionLabel: "둘러보기" }, // 새 대화
    { id: "favorite-work", title: "좋아요 또는 보관하기", description: "마음에 드는 캐릭터 상세에서 좋아요나 보관을 눌러요.", target: 1, reward: 2, href: "/explore", actionLabel: "둘러보기" }, // 좋아요·보관
]; // 목록 종료

export interface AttendanceView // 출석 화면 값
{ // 구조 시작
    checkedToday: boolean; // 오늘 출석 여부
    canCheck: boolean; // 지금 출석할 수 있는지
    stamped: number; // 이번 도장판에 찍힌 수
    nextDay: number; // 다음에 찍을 칸(1~7)
    nextReward: number; // 다음 칸 보상
    totalDays: number; // 누적 출석일
} // 구조 종료

export interface MissionView // 미션 화면 값
{ // 구조 시작
    definition: MissionDefinition; // 미션 정의
    progress: number; // 오늘 진행(목표까지만)
    completed: boolean; // 목표 달성
    claimed: boolean; // 보상 받음
    claimable: boolean; // 지금 받을 수 있음
} // 구조 종료

export interface BonusView // 보너스 화면 값
{ // 구조 시작
    done: number; // 달성한 미션 수
    total: number; // 전체 미션 수
    reward: number; // 보너스 토큰
    completed: boolean; // 모두 달성
    claimed: boolean; // 보너스 받음
    claimable: boolean; // 지금 받을 수 있음
} // 구조 종료

function toDayNumber(dateKey: string): number // 날짜 키 → 날짜 번호(날짜 차이 계산용)
{ // 함수 시작
    const [year, month, day] = dateKey.split("-").map(Number); // 연월일
    return Date.UTC(year, month - 1, day) / 86_400_000; // 날짜 번호 반환
} // 함수 종료

export function getAttendanceView(attendance: AttendanceState, now: Date): AttendanceView // 출석 상태 계산
{ // 함수 시작
    const reward = (day: number) => attendanceRewards[day - 1] ?? attendanceRewards[0]; // 칸별 보상
    if (attendance.lastDate === null) // 첫 출석 전
    { // 조건 시작
        return { checkedToday: false, canCheck: true, stamped: 0, nextDay: 1, nextReward: reward(1), totalDays: attendance.totalDays }; // 1일차 대기
    } // 조건 종료
    const gap = toDayNumber(getDateKey(now)) - toDayNumber(attendance.lastDate); // 마지막 출석과의 날짜 차이
    if (gap <= 0) // 오늘 이미 출석(시계를 뒤로 돌린 경우 포함)
    { // 조건 시작
        const nextDay = attendance.cycleDay >= ATTENDANCE_CYCLE ? 1 : attendance.cycleDay + 1; // 내일 찍을 칸
        return { checkedToday: true, canCheck: false, stamped: attendance.cycleDay, nextDay, nextReward: reward(nextDay), totalDays: attendance.totalDays }; // 출석 완료
    } // 조건 종료
    if (gap === 1 && attendance.cycleDay < ATTENDANCE_CYCLE) // 어제에 이어 출석
    { // 조건 시작
        return { checkedToday: false, canCheck: true, stamped: attendance.cycleDay, nextDay: attendance.cycleDay + 1, nextReward: reward(attendance.cycleDay + 1), totalDays: attendance.totalDays }; // 이어 찍기
    } // 조건 종료
    return { checkedToday: false, canCheck: true, stamped: 0, nextDay: 1, nextReward: reward(1), totalDays: attendance.totalDays }; // 하루 이상 빠졌거나 도장판을 다 채움 → 새 도장판
} // 함수 종료

export function getMissionState(missions: DailyMissionState, now: Date): DailyMissionState // 오늘 기준 미션 상태(날짜가 지났으면 빈 상태)
{ // 함수 시작
    const today = getDateKey(now); // 오늘
    if (missions.dateKey !== null && missions.dateKey >= today) // 오늘 기록(시계를 뒤로 돌린 경우에도 그대로)
    { // 조건 시작
        return missions; // 그대로
    } // 조건 종료
    return { dateKey: today, progress: {}, claimed: [], bonusClaimed: false }; // 새 날
} // 함수 종료

export function getMissionViews(missions: DailyMissionState, now: Date): MissionView[] // 미션 화면 값 계산
{ // 함수 시작
    const today = getMissionState(missions, now); // 오늘 상태
    return dailyMissions.map((definition) => // 미션 순회
    { // 계산 시작
        const progress = Math.min(definition.target, today.progress[definition.id] ?? 0); // 진행
        const completed = progress >= definition.target; // 달성
        const claimed = today.claimed.includes(definition.id); // 받음
        return { definition, progress, completed, claimed, claimable: completed && !claimed }; // 화면 값
    }); // 계산 종료
} // 함수 종료

export function getBonusView(missions: DailyMissionState, now: Date): BonusView // 보너스 화면 값 계산
{ // 함수 시작
    const today = getMissionState(missions, now); // 오늘 상태
    const done = getMissionViews(missions, now).filter((view) => view.completed).length; // 달성 수
    const completed = done === dailyMissions.length; // 모두 달성
    return { done, total: dailyMissions.length, reward: MISSION_BONUS, completed, claimed: today.bonusClaimed, claimable: completed && !today.bonusClaimed }; // 화면 값
} // 함수 종료

export function getClaimableCount(rewards: RewardState, now: Date): number // 지금 받을 수 있는 보상 수(출석 포함)
{ // 함수 시작
    return (getAttendanceView(rewards.attendance, now).canCheck ? 1 : 0) + getMissionViews(rewards.missions, now).filter((view) => view.claimable).length + (getBonusView(rewards.missions, now).claimable ? 1 : 0) + getWeeklyClaimable(rewards, now).count; // 합계(주간 미션 포함)
} // 함수 종료

export function getClaimableTokens(rewards: RewardState, now: Date): number // 지금 받을 수 있는 토큰(출석 포함)
{ // 함수 시작
    const attendance = getAttendanceView(rewards.attendance, now); // 출석
    const bonus = getBonusView(rewards.missions, now); // 보너스
    return (attendance.canCheck ? attendance.nextReward : 0) + getMissionViews(rewards.missions, now).filter((view) => view.claimable).reduce((sum, view) => sum + view.definition.reward, 0) + (bonus.claimable ? bonus.reward : 0) + getWeeklyClaimable(rewards, now).tokens; // 합계(주간 미션 포함)
} // 함수 종료

export function recordMissionProgress(rewards: RewardState, missionId: MissionId, amount: number, now: Date): { rewards: RewardState; completedNow: boolean } // 미션 진행 기록(목표에 닿는 순간만 완료 표시)
{ // 함수 시작
    const definition = dailyMissions.find((mission) => mission.id === missionId); // 미션 정의
    const today = getMissionState(rewards.missions, now); // 오늘 상태
    const before = Math.min(definition?.target ?? 0, today.progress[missionId] ?? 0); // 이전 진행
    if (definition === undefined || amount <= 0 || before >= definition.target) // 없는 미션·변화 없음·이미 달성
    { // 조건 시작
        return { rewards, completedNow: false }; // 변화 없음
    } // 조건 종료
    const after = Math.min(definition.target, before + Math.floor(amount)); // 목표까지만
    return { rewards: { ...rewards, missions: { ...today, progress: { ...today.progress, [missionId]: after } } }, completedNow: after >= definition.target }; // 기록 반환
} // 함수 종료

export function grantTokens(state: AppState, grant: { id: string; source: TokenRecordSource; label: string; amount: number; now: string }): AppState // 토큰 지급(지갑·받은 기록·받은 합계)
{ // 함수 시작
    const daily = getDailyUsage(state.wallet, new Date(grant.now)); // 날짜가 바뀌었으면 사용량 0부터
    const wallet = { ...state.wallet, balance: state.wallet.balance + grant.amount, dailyChatUsed: daily.chat, dailyImageUsed: daily.image, updatedAt: grant.now }; // 잔액 증가
    const record: TokenRecord = { id: grant.id, direction: "earn", source: grant.source, label: grant.label, amount: grant.amount, balance: wallet.balance, createdAt: grant.now }; // 받은 기록
    return { ...state, wallet, tokenRecords: addTokenRecord(state.tokenRecords, record), rewards: { ...state.rewards, totalEarned: state.rewards.totalEarned + grant.amount } }; // 지급 상태
} // 함수 종료

export function checkAttendance(state: AppState, now: string): AppState // 출석하기
{ // 함수 시작
    const view = getAttendanceView(state.rewards.attendance, new Date(now)); // 출석 상태
    if (!view.canCheck) // 오늘 이미 출석
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    const dateKey = getDateKey(new Date(now)); // 오늘
    const attended: AppState = { ...state, rewards: { ...state.rewards, attendance: { lastDate: dateKey, cycleDay: view.nextDay, totalDays: view.totalDays + 1 } } }; // 도장 찍기
    return grantTokens(attended, { id: `attendance-${dateKey}`, source: "attendance", label: t("출석 {0}일차", [view.nextDay]), amount: view.nextReward, now }); // 보상 지급
} // 함수 종료

export function claimMission(state: AppState, missionId: MissionId, now: string): AppState // 미션 보상 받기
{ // 함수 시작
    const view = getMissionViews(state.rewards.missions, new Date(now)).find((item) => item.definition.id === missionId); // 미션 상태
    if (view === undefined || !view.claimable) // 미완료·이미 받음
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    const today = getMissionState(state.rewards.missions, new Date(now)); // 오늘 상태
    const claimed: AppState = { ...state, rewards: { ...state.rewards, missions: { ...today, claimed: [...today.claimed, missionId] } } }; // 받음 표시
    return grantTokens(claimed, { id: `mission-${today.dateKey}-${missionId}`, source: "mission", label: t("미션: {0}", [view.definition.title]), amount: view.definition.reward, now }); // 보상 지급
} // 함수 종료

export function claimMissionBonus(state: AppState, now: string): AppState // 모두 완료 보너스 받기
{ // 함수 시작
    const bonus = getBonusView(state.rewards.missions, new Date(now)); // 보너스 상태
    if (!bonus.claimable) // 미완료·이미 받음
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    const today = getMissionState(state.rewards.missions, new Date(now)); // 오늘 상태
    const claimed: AppState = { ...state, rewards: { ...state.rewards, missions: { ...today, bonusClaimed: true } } }; // 받음 표시
    return grantTokens(claimed, { id: `mission-bonus-${today.dateKey}`, source: "mission-bonus", label: t("미션 모두 완료 보너스"), amount: bonus.reward, now }); // 보상 지급
} // 함수 종료
