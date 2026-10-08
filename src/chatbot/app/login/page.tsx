import type { Metadata } from "next"; // 메타데이터 타입
import { LoginScreen } from "@chatbot/features/account/LoginScreen"; // 로그인 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "로그인 | Mate Verse", // 페이지 제목
    description: "계정으로 로그인해 캐릭터와 대화를 계정별로 나눠 쓰는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function LoginPage() // 로그인 페이지
{ // 함수 시작
    return <LoginScreen />; // 화면 반환
} // 함수 종료
