import type { Metadata } from "next"; // 메타데이터 타입
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // 캐릭터 편집기

export const metadata: Metadata = { title: "새 캐릭터 만들기 | Mate Verse" }; // 페이지 제목

interface NewCharacterPageProps // 페이지 속성
{ // 구조 시작
    searchParams: Promise<{ image?: string }>; // 이미지 스튜디오에서 넘어온 이미지
} // 구조 종료

export default async function NewCharacterPage({ searchParams }: NewCharacterPageProps) // 제작 페이지
{ // 함수 시작
    const { image } = await searchParams; // 넘어온 이미지 식별자
    return <CharacterEditor key={image ?? "new"} initialImageId={image} />; // 제작 화면 반환
} // 함수 종료
