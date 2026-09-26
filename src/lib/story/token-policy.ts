import type { TokenWallet } from "@/features/core/types"; // 지갑 타입

export type TokenAction = "chat" | "advanced-chat" | "auto-image" | "manual-image" | "regenerate-image"; // 토큰 동작

export interface SpendResult // 차감 결과
{ // 구조 시작
    ok: boolean; // 성공 여부
    wallet: TokenWallet; // 결과 지갑
    cost: number; // 차감 비용
} // 구조 종료

const costs: Record<TokenAction, number> = // 비용표
{ // 비용표 시작
    chat: 1, // 일반 대화
    "advanced-chat": 3, // 고급 대화
    "auto-image": 15, // 자동 이미지
    "manual-image": 20, // 수동 이미지
    "regenerate-image": 20, // 이미지 재생성
}; // 비용표 종료

export function trySpend(wallet: TokenWallet, action: TokenAction, now = new Date().toISOString()): SpendResult // 토큰 차감
{ // 함수 시작
    const cost = costs[action]; // 비용 조회
    if (wallet.balance < cost) // 잔액 부족
    { // 조건 시작
        return { ok: false, wallet, cost }; // 실패 반환
    } // 조건 종료
    const imageAction = action === "auto-image" || action === "manual-image" || action === "regenerate-image"; // 이미지 판정
    return ( // 성공 반환
    { // 결과 시작
        ok: true, // 성공 표시
        cost, // 비용 반환
        wallet: // 새 지갑
        { // 지갑 시작
            ...wallet, // 기존 값
            balance: wallet.balance - cost, // 잔액 차감
            totalUsed: wallet.totalUsed + cost, // 누적 사용량
            dailyChatUsed: wallet.dailyChatUsed + (imageAction ? 0 : cost), // 대화 사용량
            dailyImageUsed: wallet.dailyImageUsed + (imageAction ? 1 : 0), // 이미지 사용량
            updatedAt: now, // 수정 시각
        }, // 지갑 종료
    }); // 결과 종료
} // 함수 종료
