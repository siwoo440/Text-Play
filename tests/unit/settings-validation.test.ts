import { describe, expect, it } from "vitest"; // 테스트 도구
import { validateNotificationSettings, validateProfileSettings } from "@/features/settings/settings-validation"; // 설정 검증 함수

describe("설정 입력 검증", () => // 검증 묶음
{ // 묶음 시작
    it("공백 닉네임과 역전된 알림 시간을 거부한다", () => // 설정 검증
    { // 테스트 시작
        expect(validateProfileSettings({ nickname: "   ", avatar: "🌙" })).toEqual({ nickname: "닉네임을 입력해 주세요." }); // 닉네임 오류 확인
        expect(validateNotificationSettings({ startTime: "22:00", endTime: "09:00", dailyLimit: 3 })).toEqual({ endTime: "종료 시각은 시작 시각보다 늦어야 합니다." }); // 시간 오류 확인
    }); // 테스트 종료

    it("닉네임 길이와 알림 횟수 범위를 검증한다", () => // 범위 검증
    { // 테스트 시작
        expect(validateProfileSettings({ nickname: "가".repeat(21), avatar: "🌙" })).toEqual({ nickname: "닉네임은 20자 이하로 입력해 주세요." }); // 이름 길이 확인
        expect(validateNotificationSettings({ startTime: "09:00", endTime: "22:00", dailyLimit: 11 })).toEqual({ dailyLimit: "일일 알림은 0~10회로 설정해 주세요." }); // 횟수 범위 확인
    }); // 테스트 종료
}); // 묶음 종료
