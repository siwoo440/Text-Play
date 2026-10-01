import { describe, expect, it } from "vitest"; // 테스트 도구
import { getDailyUsage, trySpend } from "@chatbot/lib/story/token-policy"; // 토큰 정책
import { getDateKey } from "@chatbot/lib/time/date-key"; // 날짜 키

describe("날짜 키", () => // 날짜 키 묶음
{ // 묶음 시작
    it("시간대 기준 날짜를 연-월-일로 만든다", () => // 날짜 키 검증
    { // 검증 시작
        const moment = new Date("2026-09-30T15:00:00.000Z"); // 서울 10월 1일 0시
        expect(getDateKey(moment)).toBe("2026-10-01"); // 서울 기본값 확인
        expect(getDateKey(moment, "America/Los_Angeles")).toBe("2026-09-30"); // 다른 시간대 확인
    }); // 검증 종료
}); // 묶음 종료

describe("가상 토큰 정책", () => // 정책 묶음
{ // 묶음 시작
    it("잔액 부족 시 지갑을 변경하지 않는다", () => // 부족 상태 검증
    { // 검증 시작
        const wallet = { balance: 0, totalUsed: 4, dailyChatUsed: 4, dailyImageUsed: 0, updatedAt: "2026-09-22T00:00:00.000Z" }; // 원본 지갑
        const result = trySpend(wallet, "manual-image"); // 차감 시도
        expect(result.ok).toBe(false); // 실패 결과
        expect(result.wallet).toBe(wallet); // 동일 지갑
        expect(result.cost).toBe(20); // 비용 확인
    }); // 검증 종료

    it("대화와 이미지 사용량을 구분해 기록한다", () => // 사용량 검증
    { // 검증 시작
        const wallet = { balance: 30, totalUsed: 0, dailyChatUsed: 0, dailyImageUsed: 0, updatedAt: "2026-09-22T00:00:00.000Z" }; // 원본 지갑
        const chat = trySpend(wallet, "chat", "2026-09-23T00:00:00.000Z"); // 대화 차감
        const image = trySpend(chat.wallet, "manual-image", "2026-09-23T00:01:00.000Z"); // 이미지 차감
        expect(image.wallet).toMatchObject({ balance: 9, totalUsed: 21, dailyChatUsed: 1, dailyImageUsed: 1 }); // 누적 결과
    }); // 검증 종료

    it("한국 날짜가 바뀌면 오늘 사용량을 0부터 다시 센다", () => // 날짜 초기화 검증
    { // 검증 시작
        const wallet = { balance: 100, totalUsed: 10, dailyChatUsed: 7, dailyImageUsed: 2, updatedAt: "2026-09-30T14:59:00.000Z" }; // 서울 9월 30일 23시 59분
        const sameDay = trySpend(wallet, "chat", "2026-09-30T14:59:30.000Z"); // 같은 날 차감
        const nextDay = trySpend(wallet, "chat", "2026-09-30T15:00:00.000Z"); // 다음 날 0시 차감
        expect(sameDay.wallet).toMatchObject({ dailyChatUsed: 8, dailyImageUsed: 2 }); // 같은 날 누적 확인
        expect(nextDay.wallet).toMatchObject({ balance: 99, totalUsed: 11, dailyChatUsed: 1, dailyImageUsed: 0 }); // 다음 날 초기화 확인
    }); // 검증 종료

    it("화면에 보이는 오늘 사용량도 날짜가 지나면 0이다", () => // 표시값 검증
    { // 검증 시작
        const wallet = { balance: 100, totalUsed: 10, dailyChatUsed: 7, dailyImageUsed: 2, updatedAt: "2026-09-30T14:00:00.000Z" }; // 서울 9월 30일 23시
        expect(getDailyUsage(wallet, new Date("2026-09-30T14:30:00.000Z"))).toEqual({ chat: 7, image: 2 }); // 같은 날 확인
        expect(getDailyUsage(wallet, new Date("2026-09-30T15:00:00.000Z"))).toEqual({ chat: 0, image: 0 }); // 다음 날 확인
    }); // 검증 종료
}); // 묶음 종료
