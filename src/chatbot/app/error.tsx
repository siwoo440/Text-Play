"use client"; // 오류 경계는 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect } from "react"; // 리액트 효과
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면

interface ErrorPageProps // 오류 화면 속성
{ // 구조 시작
    error: Error & { digest?: string }; // 발생 오류
    retry(): void; // 다시 시도
} // 구조 종료

export default function ErrorPage({ error, retry }: ErrorPageProps) // 화면 오류 경계
{ // 함수 시작
    useEffect(() => // 오류 기록 효과
    { // 효과 시작
        console.error(error); // 개발 도구 기록
    }, [error]); // 오류 변경 의존
    return ( // 화면 반환
        <StatusScreen tone="error" label="ERROR" title="화면을 표시하지 못했습니다" description="일시적인 문제로 이 화면을 그리지 못했습니다. 브라우저에 저장된 캐릭터와 대화는 그대로 남아 있습니다."> {/* 오류 화면 */}
            <button type="button" onClick={() => retry()}>다시 시도</button> {/* 재시도 버튼 */}
            <Link href="/">메인으로 이동</Link> {/* 메인 링크 */}
        </StatusScreen> // 오류 화면 종료
    ); // 반환 종료
} // 함수 종료
