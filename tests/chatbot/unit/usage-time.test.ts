import { describe, expect, it } from "vitest"; // 테스트 도구
import { acknowledgeReminder, createUsageRecord, formatUsageDuration, isReminderDue, startUsageSegment, tickUsage, USAGE_REMINDER_INTERVAL_MS } from "@chatbot/features/safety/usage-time"; // 이용 시간 계산

const minute = 60_000; // 1분

describe("이용 시간 알림 계산", () => // 이용 시간 묶음
{ // 묶음 시작
    it("화면이 보이는 동안만 이용 시간을 더한다", () => // 보이는 시간 검증
    { // 검증 시작
        let record = startUsageSegment(createUsageRecord(), 0, true); // 측정 시작
        record = tickUsage(record, minute, true); // 1분 이용
        record = tickUsage(record, 2 * minute, false); // 숨김 전환
        record = tickUsage(record, 30 * minute, false); // 숨김 유지
        record = tickUsage(record, 31 * minute, true); // 다시 보임
        record = tickUsage(record, 32 * minute, true); // 1분 더 이용
        expect(record.activeMs).toBe(3 * minute); // 숨긴 시간 제외 확인
    }); // 검증 종료

    it("기기가 잠들어 생긴 긴 공백은 2분까지만 더한다", () => // 공백 제한 검증
    { // 검증 시작
        const record = tickUsage(startUsageSegment(createUsageRecord(), 0, true), 50 * minute, true); // 긴 공백
        expect(record.activeMs).toBe(2 * minute); // 공백 제한 확인
    }); // 검증 종료

    it("60분마다 알림을 띄우고 확인하면 다음 60분 뒤로 미룬다", () => // 알림 주기 검증
    { // 검증 시작
        let record = startUsageSegment(createUsageRecord(), 0, true); // 측정 시작
        for (let at = minute; at <= 59 * minute; at += minute) // 59분 이용
        { // 순회 시작
            record = tickUsage(record, at, true); // 1분씩 더함
        } // 순회 종료
        expect(isReminderDue(record)).toBe(false); // 59분 미표시 확인
        record = tickUsage(record, 60 * minute, true); // 60분 도달
        expect(isReminderDue(record)).toBe(true); // 알림 확인
        record = acknowledgeReminder(record); // 알림 확인 처리
        expect(isReminderDue(record)).toBe(false); // 알림 해제 확인
        expect(record.nextReminderAtMs).toBe(60 * minute + USAGE_REMINDER_INTERVAL_MS); // 다음 알림 시점 확인
    }); // 검증 종료

    it("이용 시간을 시간과 분으로 짧게 표시한다", () => // 표시 검증
    { // 검증 시작
        expect(formatUsageDuration(60 * minute)).toBe("1시간"); // 1시간
        expect(formatUsageDuration(90 * minute)).toBe("1시간 30분"); // 1시간 30분
        expect(formatUsageDuration(45 * minute)).toBe("45분"); // 45분
    }); // 검증 종료
}); // 묶음 종료
