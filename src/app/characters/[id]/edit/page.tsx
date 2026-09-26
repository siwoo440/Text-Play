import { CharacterEditor } from "@/features/character/CharacterEditor"; // 캐릭터 편집기

interface EditCharacterPageProps // 페이지 속성
{ // 구조 시작
    params: Promise<{ id: string }>; // 동적 경로
} // 구조 종료

export default async function EditCharacterPage({ params }: EditCharacterPageProps) // 수정 페이지
{ // 함수 시작
    const { id } = await params; // 캐릭터 식별자
    return <CharacterEditor characterId={id} />; // 수정 화면 반환
} // 함수 종료
