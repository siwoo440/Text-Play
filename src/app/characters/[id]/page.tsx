import { CharacterDetail } from "@/features/character/CharacterDetail"; // 캐릭터 상세

interface CharacterPageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ id: string }>; // 동적 경로
} // 구조 종료

export default async function CharacterPage({ params }: CharacterPageProps) // 상세 페이지
{ // 함수 시작
    const { id } = await params; // 경로 식별자
    return <CharacterDetail characterId={id} />; // 상세 화면 반환
} // 함수 종료
