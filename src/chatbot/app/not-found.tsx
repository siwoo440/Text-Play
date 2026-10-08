import type { Metadata } from "next"; // 메타데이터 타입
import { NotFoundScreen } from "@chatbot/components/feedback/NotFoundScreen"; // 찾을 수 없음 안내

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "페이지를 찾을 수 없습니다 | Mate Verse", // 페이지 제목
}; // 메타데이터 종료

export default function NotFound() // 찾을 수 없음 화면
{ // 함수 시작
    return <NotFoundScreen />; // 안내 화면 반환(화면 언어에 맞춰 브라우저에서 그림)
} // 함수 종료
