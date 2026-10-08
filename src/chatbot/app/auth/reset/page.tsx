import type { Metadata } from "next"; // 메타데이터 타입
import { PasswordResetScreen } from "@chatbot/features/account/PasswordResetScreen"; // 비밀번호 다시 정하기 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "비밀번호 다시 정하기 | Mate Verse", // 페이지 제목
    description: "메일로 받은 링크로 들어와 새 비밀번호를 정하는 화면", // 페이지 설명
}; // 메타데이터 종료

export default function PasswordResetPage() // 비밀번호 다시 정하기 페이지
{ // 함수 시작
    return <PasswordResetScreen />; // 화면 반환
} // 함수 종료
