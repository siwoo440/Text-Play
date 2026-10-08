import type { Metadata } from "next"; // 메타데이터 타입
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함 화면

export const metadata: Metadata = { title: "보관함 | Mate Verse" }; // 페이지 제목

export default function LibraryPage() // 보관함 페이지
{ // 함수 시작
    return <LibraryScreen />; // 보관함 반환
} // 함수 종료
