import { describe, expect, it } from "vitest"; // 테스트 도구
import { trySpend } from "@/lib/story/token-policy"; // 토큰 정책

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
}); // 묶음 종료
