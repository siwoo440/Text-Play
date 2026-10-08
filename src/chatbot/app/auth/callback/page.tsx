import type { Metadata } from "next"; // 메타데이터 타입
import { AuthCallbackScreen } from "@chatbot/features/account/AuthCallbackScreen"; // 간편 로그인에서 돌아오는 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "로그인 | Mate Verse", // 페이지 제목
    description: "간편 로그인을 마치고 돌아오는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function AuthCallbackPage() // 간편 로그인에서 돌아오는 페이지
{ // 함수 시작
    return <AuthCallbackScreen />; // 화면 반환
} // 함수 종료
