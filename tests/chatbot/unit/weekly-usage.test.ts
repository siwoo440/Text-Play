import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { getClaimableCount, getClaimableTokens } from "@chatbot/features/rewards/reward-model"; // 받을 보상
import { trackRewardProgress } from "@chatbot/features/rewards/reward-tracker"; // 미션 진행 추적
import { claimWeeklyMission, getWeekDaysLeft, getWeekKey, getWeeklyState, getWeeklyViews, recordWeeklyProgress, weeklyMissions } from "@chatbot/features/rewards/weekly-model"; // 주간 미션
import { createUsageRecord, getTodayUsageMs, parseUsageRecord, rollUsageDay, startUsageSegment, tickUsage } from "@chatbot/features/safety/usage-time"; // 이용 시간
import { isAppState } from "@chatbot/lib/repositories/state-validation"; // 상태 검사

const monday = new Date("2026-10-05T10:00:00+09:00"); // 월요일 오전(한국 시간)
const sunday = new Date("2026-10-04T23:30:00+09:00"); // 일요일 밤(전 주의 마지막 날)
const minute = 60_000; // 1분

describe("주간 미션", () => // 주간 미션 묶음
{ // 묶음 시작
    it("한 주는 한국 시간 월요일에 시작하고, 남은 날을 오늘 포함으로 센다", () => // 주 계산 검증
    { // 검증 시작
        expect(getWeekKey(monday)).toBe("2026-10-05"); // 월요일은 그날
        expect(getWeekKey(sunday)).toBe("2026-09-28"); // 일요일은 전 주 월요일
        expect(getWeekKey(new Date("2026-10-04T15:30:00.000Z"))).toBe("2026-10-05"); // 세계 표준시로는 일요일이어도 한국은 월요일
        expect(getWeekDaysLeft(monday)).toBe(7); // 월요일 7일
        expect(getWeekDaysLeft(sunday)).toBe(1); // 일요일 1일
    }); // 검증 종료

    it("진행은 목표까지만 세고, 달성하면 받을 수 있으며, 주가 바뀌면 처음부터 시작한다", () => // 진행·보상 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(getWeeklyViews(state.rewards, monday).map((view) => [view.progress, view.claimable])).toEqual([[0, false], [0, false], [0, false]]); // 기록이 없으면 빈 상태
        const first = recordWeeklyProgress(state.rewards, "weekly-conversations", 2, monday); // 새 대화 2번
        expect(first.completedNow).toBe(false); // 아직
        const second = recordWeeklyProgress(first.rewards, "weekly-conversations", 5, monday); // 넘치게
        expect(second.completedNow).toBe(true); // 방금 달성
        expect(second.rewards.weekly).toEqual({ weekKey: "2026-10-05", progress: { "weekly-conversations": 3 }, claimed: [] }); // 목표까지만
        expect(recordWeeklyProgress(second.rewards, "weekly-conversations", 1, monday).completedNow).toBe(false); // 이미 달성하면 다시 알리지 않음
        const ready: AppState = { ...state, rewards: second.rewards }; // 받을 수 있는 상태
        expect(getClaimableCount(ready.rewards, monday)).toBe(getClaimableCount(state.rewards, monday) + 1); // 받을 보상 수에 포함
        expect(getClaimableTokens(ready.rewards, monday)).toBe(getClaimableTokens(state.rewards, monday) + 10); // 받을 토큰에 포함
        const claimed = claimWeeklyMission(ready, "weekly-conversations", monday.toISOString()); // 보상 받기
        expect(claimed.wallet.balance).toBe(state.wallet.balance + 10); // 10토큰
        expect(claimed.tokenRecords[0]).toMatchObject({ id: "weekly-mission-2026-10-05-weekly-conversations", direction: "earn", source: "mission", label: "주간 미션: 새 대화 3번 시작하기", amount: 10 }); // 받은 기록
        expect(claimWeeklyMission(claimed, "weekly-conversations", monday.toISOString())).toBe(claimed); // 두 번 받지 못함
        expect(claimWeeklyMission(state, "weekly-messages", monday.toISOString())).toBe(state); // 달성 전에는 받지 못함
        expect(isAppState(claimed)).toBe(true); // 저장 검사 통과
        expect(isAppState({ ...claimed, rewards: { ...claimed.rewards, weekly: { weekKey: "next", progress: {}, claimed: [] } } })).toBe(false); // 잘못된 주 값은 거부
        const nextWeek = new Date("2026-10-12T00:00:00+09:00"); // 다음 주 월요일
        expect(getWeeklyState(claimed.rewards, nextWeek)).toEqual({ weekKey: "2026-10-12", progress: {}, claimed: [] }); // 처음부터
        expect(weeklyMissions.reduce((sum, mission) => sum + mission.reward, 0)).toBe(30); // 한 주에 모두 받으면 30토큰
    }); // 검증 종료

    it("출석하면 주간 출석이 오르고, 리듀서 동작으로 보상을 받는다", () => // 추적·동작 검증
    { // 검증 시작
        let state = createInitialState(); // 초기 상태
        for (const day of ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]) // 월~금 출석
        { // 순회 시작
            const now = `${day}T09:00:00+09:00`; // 그날 오전
            const action = { type: "check-attendance" as const, now }; // 출석 동작
            state = trackRewardProgress(state, appReducer(state, action), action, now); // 출석과 진행 반영
            const again = trackRewardProgress(state, appReducer(state, action), action, now); // 같은 날 다시
            expect(again).toBe(state); // 하루에 한 번만
        } // 순회 종료
        const friday = new Date("2026-10-09T10:00:00+09:00"); // 금요일
        expect(getWeeklyViews(state.rewards, friday).find((view) => view.definition.id === "weekly-attendance")).toMatchObject({ progress: 5, claimable: true }); // 5일 달성
        expect(state.notifications[0]).toMatchObject({ id: "reward-weekly-2026-10-05-weekly-attendance", title: "주간 미션 완료" }); // 달성 알림
        const before = state.wallet.balance; // 받기 전 잔액
        state = appReducer(state, { type: "claim-weekly-mission", missionId: "weekly-attendance", now: friday.toISOString() }); // 보상 받기
        expect(state.wallet.balance).toBe(before + 10); // 10토큰
    }); // 검증 종료
}); // 묶음 종료

describe("오늘 이용 시간", () => // 이용 시간 묶음
{ // 묶음 시작
    it("같은 날에는 이어서 세고 한국 시간으로 날짜가 바뀌면 0부터 다시 센다", () => // 하루 누적 검증
    { // 검증 시작
        const evening = new Date("2026-10-04T23:50:00+09:00").getTime(); // 밤 11시 50분
        let record = startUsageSegment(createUsageRecord(), evening, true); // 측정 시작
        expect(record.dateKey).toBe("2026-10-04"); // 오늘 날짜
        record = tickUsage(record, evening + minute, true); // 1분
        record = tickUsage(record, evening + 2 * minute, true); // 2분
        expect(record.activeMs).toBe(2 * minute); // 이어서 셈
        const stored = parseUsageRecord(JSON.stringify({ ...record, lastTickAt: null })); // 저장했다 읽기(다른 탭)
        expect(tickUsage(startUsageSegment(stored, evening + 3 * minute, true), evening + 4 * minute, true).activeMs).toBe(3 * minute); // 다른 탭에서도 이어서 셈
        const midnight = new Date("2026-10-05T00:00:30+09:00").getTime(); // 자정 넘김
        const rolled = tickUsage({ ...record, lastTickAt: midnight - minute }, midnight, true); // 날짜가 바뀐 뒤 측정
        expect(rolled.dateKey).toBe("2026-10-05"); // 새 날짜
        expect(rolled.activeMs).toBe(minute); // 새 날은 방금 1분만
        expect(rolled.nextReminderAtMs).toBe(60 * minute); // 알림 시점도 처음으로
        expect(getTodayUsageMs(record, midnight)).toBe(0); // 어제 기록은 오늘 0
        expect(getTodayUsageMs(record, evening + 5 * minute)).toBe(2 * minute); // 같은 날이면 그대로
    }); // 검증 종료

    it("날짜가 없는 예전 기록은 오늘의 새 기록으로 본다", () => // 예전 기록 검증
    { // 검증 시작
        const old = parseUsageRecord(JSON.stringify({ activeMs: 50 * minute, lastTickAt: 1, nextReminderAtMs: 60 * minute })); // 탭마다 세던 예전 기록
        expect(old.dateKey).toBeNull(); // 날짜 없음
        expect(rollUsageDay(old, new Date("2026-10-04T12:00:00+09:00").getTime())).toMatchObject({ dateKey: "2026-10-04", activeMs: 0 }); // 오늘 0부터
        expect(parseUsageRecord("{broken")).toEqual(createUsageRecord()); // 깨진 기록은 새 기록
    }); // 검증 종료
}); // 묶음 종료
