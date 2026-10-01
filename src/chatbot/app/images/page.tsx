import type { Metadata } from "next"; // 메타데이터 타입
import { ImageStudio } from "@chatbot/features/images/ImageStudio"; // 이미지 스튜디오

export const metadata: Metadata = { title: "이미지 스튜디오 | Mate Verse", description: "장면을 글로 설명해 이미지를 만들고 작품에 활용합니다." }; // 페이지 정보

export default function ImagesPage() // 이미지 스튜디오 페이지
{ // 함수 시작
    return <ImageStudio />; // 스튜디오 반환
} // 함수 종료
