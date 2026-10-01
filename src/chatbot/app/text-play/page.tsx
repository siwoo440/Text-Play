import type { Metadata } from "next"; // 메타데이터 타입
import { TextPlayScreen } from "@chatbot/features/text-play/TextPlayScreen"; // Text-Play 통합 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "MATE Text-Play 다운로드 | Mate Verse", // 페이지 제목
    description: "Windows용 텍스트 게임 프로그램 MATE Text-Play의 소개, 플레이 흐름, 주요 기능, 배포 상태와 설치 순서", // 페이지 설명
}; // 메타데이터 종료

export default function TextPlayPage() // Text-Play 페이지
{ // 함수 시작
    return <TextPlayScreen />; // 통합 화면 반환
} // 함수 종료
