import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, MissionId } from "@chatbot/features/core/types"; // 상태 타입
import { attendanceRewards, dailyMissions, getAttendanceView, getBonusView, getClaimableCount, getClaimableTokens, getMissionViews, MISSION_BONUS, recordMissionProgress, TOKEN_RECORD_LIMIT } from "@chatbot/features/rewards/reward-model"; // 출석·미션 규칙

const at = (day: number, time = "12:00:00") => `2026-10-${String(day).padStart(2, "0")}T${time}+09:00`; // 한국 시간 시각
const attend = (state: AppState, now: string) => appReducer(state, { type: "check-attendance", now }); // 출석
const progress = (state: AppState, missionId: MissionId, amount: number, now: string): AppState => ({ ...state, rewards: recordMissionProgress(state.rewards, missionId, amount, new Date(now)).rewards }); // 미션 진행 기록
const completeAll = (state: AppState, now: string) => dailyMissions.reduce((current, mission) => progress(current, mission.id, mission.target, now), state); // 오늘의 미션 모두 채우기

describe("출석", () => // 출석 묶음
{ // 묶음 시작
    it("첫 출석은 1일차 보상을 주고 잔액·도장·받은 기록에 남긴다", () => // 첫 출석
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(getAttendanceView(state.rewards.attendance, new Date(at(3)))).toMatchObject({ checkedToday: false, canCheck: true, stamped: 0, nextDay: 1, nextReward: 5 }); // 출석 전
        const next = attend(state, at(3)); // 출석
        expect(next.wallet.balance).toBe(state.wallet.balance + 5); // 5토큰
        expect(next.rewards.attendance).toEqual({ lastDate: "2026-10-03", cycleDay: 1, totalDays: 1 }); // 도장 1개
        expect(next.rewards.totalEarned).toBe(5); // 받은 합계
        expect(next.tokenRecords[0]).toMatchObject({ id: "attendance-2026-10-03", direction: "earn", source: "attendance", label: "출석 1일차", amount: 5, balance: state.wallet.balance + 5 }); // 받은 기록
        expect(getAttendanceView(next.rewards.attendance, new Date(at(3, "18:00:00")))).toMatchObject({ checkedToday: true, canCheck: false, stamped: 1 }); // 오늘 출석 완료
    }); // 검증 종료

    it("같은 날에는 한 번만 받는다", () => // 중복 방지
    { // 검증 시작
        const once = attend(createInitialState(), at(3, "09:00:00")); // 아침 출석
        const twice = attend(once, at(3, "23:00:00")); // 밤에 다시
        expect(twice).toBe(once); // 변화 없음
    }); // 검증 종료

    it("7일을 이어서 채우면 7일차에 20토큰을 받고 다음 날은 새 도장판 1일차가 된다", () => // 연속 출석
    { // 검증 시작
        let state = createInitialState(); // 초기 상태
        const start = state.wallet.balance; // 시작 잔액
        for (let day = 1; day <= 7; day += 1) // 7일
        { // 반복 시작
            state = attend(state, at(day)); // 출석
        } // 반복 종료
        expect(attendanceRewards).toEqual([5, 5, 5, 5, 5, 5, 20]); // 보상표
        expect(state.wallet.balance).toBe(start + 50); // 일주일 50토큰
        expect(state.rewards.attendance).toEqual({ lastDate: "2026-10-07", cycleDay: 7, totalDays: 7 }); // 7일차
        expect(state.tokenRecords[0]).toMatchObject({ label: "출석 7일차", amount: 20 }); // 7일차 기록
        expect(getAttendanceView(state.rewards.attendance, new Date(at(7, "20:00:00")))).toMatchObject({ checkedToday: true, stamped: 7 }); // 꽉 찬 도장판
        expect(getAttendanceView(state.rewards.attendance, new Date(at(8)))).toMatchObject({ checkedToday: false, stamped: 0, nextDay: 1, nextReward: 5 }); // 새 도장판
        state = attend(state, at(8)); // 8일째
        expect(state.rewards.attendance).toEqual({ lastDate: "2026-10-08", cycleDay: 1, totalDays: 8 }); // 다시 1일차
    }); // 검증 종료

    it("하루라도 빠지면 1일차부터 다시 시작한다", () => // 끊김
    { // 검증 시작
        let state = attend(attend(createInitialState(), at(1)), at(2)); // 이틀 연속
        expect(getAttendanceView(state.rewards.attendance, new Date(at(3)))).toMatchObject({ stamped: 2, nextDay: 3 }); // 이어 가는 중
        expect(getAttendanceView(state.rewards.attendance, new Date(at(4)))).toMatchObject({ stamped: 0, nextDay: 1, canCheck: true }); // 하루 빠짐
        state = attend(state, at(4)); // 4일에 출석
        expect(state.rewards.attendance).toEqual({ lastDate: "2026-10-04", cycleDay: 1, totalDays: 3 }); // 1일차부터, 누적은 3일
    }); // 검증 종료

    it("하루는 한국 시간 자정에 바뀐다", () => // 날짜 기준
    { // 검증 시작
        const late = attend(createInitialState(), at(3, "23:59:00")); // 3일 밤
        const early = attend(late, at(4, "00:01:00")); // 4일 새벽
        expect(early.rewards.attendance).toEqual({ lastDate: "2026-10-04", cycleDay: 2, totalDays: 2 }); // 2일차
    }); // 검증 종료

    it("기기 시계를 뒤로 돌려도 다시 받을 수 없다", () => // 시계 되돌리기
    { // 검증 시작
        const state = attend(createInitialState(), at(5)); // 5일 출석
        expect(getAttendanceView(state.rewards.attendance, new Date(at(4))).canCheck).toBe(false); // 4일로 돌려도 불가
        expect(attend(state, at(4))).toBe(state); // 변화 없음
    }); // 검증 종료

    it("토큰을 받아도 오늘 사용량은 날짜에 맞게 유지된다", () => // 사용량 정합
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.wallet = { ...state.wallet, dailyChatUsed: 9, dailyImageUsed: 2, updatedAt: "2026-10-02T03:00:00.000Z" }; // 2일에 쓴 기록
        const same = attend(state, at(2, "20:00:00")); // 같은 날 출석
        expect(same.wallet).toMatchObject({ dailyChatUsed: 9, dailyImageUsed: 2, totalUsed: state.wallet.totalUsed }); // 사용량 유지
        const nextDay = attend(state, at(3)); // 다음 날 출석
        expect(nextDay.wallet).toMatchObject({ dailyChatUsed: 0, dailyImageUsed: 0 }); // 새 날은 0부터
    }); // 검증 종료
}); // 묶음 종료

describe("오늘의 미션", () => // 미션 묶음
{ // 묶음 시작
    it("미션은 메시지 5번·새 대화·좋아요 또는 보관 세 가지다", () => // 미션 목록
    { // 검증 시작
        expect(dailyMissions.map((mission) => [mission.id, mission.target, mission.reward])).toEqual([["send-messages", 5, 3], ["start-conversation", 1, 3], ["favorite-work", 1, 2]]); // 목표와 보상
        expect(MISSION_BONUS).toBe(5); // 모두 완료 보너스
    }); // 검증 종료

    it("진행은 목표까지만 쌓이고 목표에 닿는 순간만 완료로 알린다", () => // 진행 기록
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const first = recordMissionProgress(state.rewards, "send-messages", 3, new Date(at(3))); // 3번
        expect(first.completedNow).toBe(false); // 아직
        const second = recordMissionProgress(first.rewards, "send-messages", 4, new Date(at(3))); // 4번 더
        expect(second.completedNow).toBe(true); // 방금 완료
        expect(second.rewards.missions).toMatchObject({ dateKey: "2026-10-03", progress: { "send-messages": 5 } }); // 목표까지만
        const third = recordMissionProgress(second.rewards, "send-messages", 1, new Date(at(3))); // 더 보냄
        expect(third.completedNow).toBe(false); // 다시 알리지 않음
        expect(third.rewards).toBe(second.rewards); // 변화 없음
    }); // 검증 종료

    it("목표를 채운 미션만 한 번 받을 수 있다", () => // 받기
    { // 검증 시작
        let state = progress(createInitialState(), "send-messages", 4, at(3)); // 4번
        const start = state.wallet.balance; // 시작 잔액
        expect(appReducer(state, { type: "claim-mission", missionId: "send-messages", now: at(3) })).toBe(state); // 미완료는 거절
        state = progress(state, "send-messages", 1, at(3)); // 5번
        expect(getMissionViews(state.rewards.missions, new Date(at(3)))[0]).toMatchObject({ progress: 5, completed: true, claimed: false, claimable: true }); // 받을 수 있음
        const claimed = appReducer(state, { type: "claim-mission", missionId: "send-messages", now: at(3) }); // 받기
        expect(claimed.wallet.balance).toBe(start + 3); // 3토큰
        expect(claimed.tokenRecords[0]).toMatchObject({ id: "mission-2026-10-03-send-messages", source: "mission", label: "미션: 메시지 5번 보내기", amount: 3 }); // 받은 기록
        expect(getMissionViews(claimed.rewards.missions, new Date(at(3)))[0]).toMatchObject({ claimed: true, claimable: false }); // 받음
        expect(appReducer(claimed, { type: "claim-mission", missionId: "send-messages", now: at(3) })).toBe(claimed); // 두 번은 안 됨
    }); // 검증 종료

    it("세 미션을 모두 채워야 보너스를 한 번 받을 수 있다", () => // 보너스
    { // 검증 시작
        let state = progress(progress(createInitialState(), "send-messages", 5, at(3)), "start-conversation", 1, at(3)); // 둘만 완료
        expect(getBonusView(state.rewards.missions, new Date(at(3)))).toMatchObject({ done: 2, total: 3, claimable: false }); // 아직
        expect(appReducer(state, { type: "claim-mission-bonus", now: at(3) })).toBe(state); // 거절
        state = progress(state, "favorite-work", 1, at(3)); // 셋째 완료
        const start = state.wallet.balance; // 시작 잔액
        const claimed = appReducer(state, { type: "claim-mission-bonus", now: at(3) }); // 보너스 받기
        expect(claimed.wallet.balance).toBe(start + 5); // 5토큰
        expect(claimed.tokenRecords[0]).toMatchObject({ id: "mission-bonus-2026-10-03", source: "mission-bonus", amount: 5 }); // 받은 기록
        expect(appReducer(claimed, { type: "claim-mission-bonus", now: at(3) })).toBe(claimed); // 두 번은 안 됨
    }); // 검증 종료

    it("날짜가 바뀌면 진행과 받은 표시가 초기화되고 못 받은 보상은 사라진다", () => // 자정 초기화
    { // 검증 시작
        const state = completeAll(createInitialState(), at(3)); // 3일에 모두 완료(받지 않음)
        expect(getClaimableCount(state.rewards, new Date(at(3)))).toBe(5); // 출석 1 + 미션 3 + 보너스 1
        expect(getClaimableTokens(state.rewards, new Date(at(3)))).toBe(5 + 3 + 3 + 2 + 5); // 받을 수 있는 토큰
        expect(getMissionViews(state.rewards.missions, new Date(at(4))).every((view) => view.progress === 0 && !view.claimable)).toBe(true); // 4일에는 0부터
        expect(appReducer(state, { type: "claim-mission", missionId: "send-messages", now: at(4) })).toBe(state); // 어제 보상은 받을 수 없음
        const next = progress(state, "favorite-work", 1, at(4)); // 4일에 새로 진행
        expect(next.rewards.missions).toEqual({ dateKey: "2026-10-04", progress: { "favorite-work": 1 }, claimed: [], bonusClaimed: false }); // 새 날 기록
    }); // 검증 종료

    it("토큰 기록은 한도(최근 300개)까지만 남긴다", () => // 기록 한도
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.tokenRecords = Array.from({ length: TOKEN_RECORD_LIMIT }, (_item, index) => ({ id: `old-${index}`, direction: "earn" as const, source: "attendance" as const, label: "예전 기록", amount: 5, balance: 100, createdAt: "2026-09-01T00:00:00.000Z" })); // 꽉 찬 기록
        const next = attend(state, at(3)); // 출석
        expect(next.tokenRecords).toHaveLength(TOKEN_RECORD_LIMIT); // 한도 유지
        expect(next.tokenRecords[0].id).toBe("attendance-2026-10-03"); // 최신이 맨 앞
        expect(next.tokenRecords.some((record) => record.id === `old-${TOKEN_RECORD_LIMIT - 1}`)).toBe(false); // 가장 오래된 기록 제거
    }); // 검증 종료
}); // 묶음 종료
