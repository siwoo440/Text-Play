import type { TokenWallet } from "@chatbot/features/core/types"; // 지갑 타입

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

export const tokenCosts: Readonly<Record<TokenAction, number>> = costs; // 공개 비용표

export const tokenActionLabels: Readonly<Record<TokenAction, { label: string; description: string }>> = // 비용 항목 설명
{ // 설명 시작
    chat: { label: "일반 대화", description: "메시지 보내기, 다시 생성, 메시지 수정 후 응답" }, // 일반 대화 설명
    "advanced-chat": { label: "고급 대화", description: "더 긴 문맥을 쓰는 대화(준비 중)" }, // 고급 대화 설명
    "auto-image": { label: "자동 장면 이미지", description: "응답과 함께 장면이 바뀔 때 생성" }, // 자동 이미지 설명
    "manual-image": { label: "직접 장면 이미지", description: "장면 생성 버튼으로 직접 요청" }, // 직접 이미지 설명
    "regenerate-image": { label: "이미지 다시 생성", description: "장면 이미지를 새로 요청(준비 중)" }, // 재생성 설명
}; // 설명 종료

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
