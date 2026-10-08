import type { Metadata } from "next"; // 메타데이터 타입
import { InviteLanding } from "@chatbot/features/rewards/InviteLanding"; // 초대 링크 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "친구 초대 | Mate Verse", // 페이지 제목
    description: "친구의 초대로 Mate Verse를 시작하고 환영 토큰을 받는 화면", // 페이지 설명
    robots: { index: false }, // 사람마다 다른 주소라 검색에서 제외
}; // 메타데이터 종료

interface InvitePageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ code: string }>; // 동적 경로
} // 구조 종료

export default async function InvitePage({ params }: InvitePageProps) // 초대 링크 페이지
{ // 함수 시작
    const { code } = await params; // 초대 코드
    return <InviteLanding code={code} />; // 초대 화면 반환
} // 함수 종료
