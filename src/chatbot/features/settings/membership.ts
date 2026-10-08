// 멤버십 비교표: 결제가 연결되기 전의 안내용 예정안이다. 가격과 수치는 정해지지 않아 적지 않는다(정해지면 이 파일만 고친다).
import type { Membership } from "@chatbot/features/core/types"; // 멤버십 종류

export interface MembershipPlan // 멤버십 한 종류
{ // 구조 시작
    id: Membership; // 종류
    label: string; // 표시 이름
    summary: string; // 한 줄 소개
} // 구조 종료

export interface MembershipRow // 비교 항목 한 줄
{ // 구조 시작
    label: string; // 항목 이름
    values: Record<Membership, string>; // 종류별 내용
} // 구조 종료

export const membershipPlans: readonly MembershipPlan[] = [ // 멤버십 종류(표의 열 순서)
    { id: "free", label: "FREE", summary: "가볍게 즐기는 분" }, // 무료
    { id: "plus", label: "PLUS", summary: "매일 대화하는 분" }, // 플러스
    { id: "creator", label: "CREATOR", summary: "작품을 만드는 분" }, // 제작자
]; // 목록 종료

export const membershipRows: readonly MembershipRow[] = [ // 비교 항목
    { label: "캐릭터·스토리 대화", values: { free: "이용 가능", plus: "이용 가능", creator: "이용 가능" } }, // 대화
    { label: "작품 만들기", values: { free: "이용 가능", plus: "이용 가능", creator: "이용 가능" } }, // 제작
    { label: "출석·미션 토큰", values: { free: "기본 지급", plus: "추가 지급 예정", creator: "추가 지급 예정" } }, // 보상
    { label: "상위 대화 모델", values: { free: "토큰으로 이용", plus: "할인 예정", creator: "할인 예정" } }, // 모델 등급
    { label: "이미지 만들기", values: { free: "토큰으로 이용", plus: "매달 무료 횟수 예정", creator: "매달 무료 횟수 예정" } }, // 이미지
    { label: "제작자 통계", values: { free: "없음", plus: "없음", creator: "제공 예정" } }, // 통계
    { label: "가격", values: { free: "무료", plus: "정해지지 않음", creator: "정해지지 않음" } }, // 가격
]; // 목록 종료
