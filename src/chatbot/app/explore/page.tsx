import type { Metadata } from "next"; // 메타데이터 타입
import { ExploreScreen } from "@chatbot/features/explore/ExploreScreen"; // 탐색 화면

export const metadata: Metadata = // 페이지 메타데이터
{ // 메타데이터 시작
    title: "탐색 | Mate Verse", // 페이지 제목
    description: "태그 검색과 장르별 추천 작품, 주목할 제작자, 인기 태그로 새로운 캐릭터를 찾아보는 탐색 화면", // 페이지 설명
}; // 메타데이터 종료

interface ExplorePageProps // 페이지 속성
{ // 구조 시작
    searchParams: Promise<{ tag?: string | string[] }>; // 검색 매개변수
} // 구조 종료

export default async function ExplorePage({ searchParams }: ExplorePageProps) // 탐색 페이지
{ // 함수 시작
    const { tag } = await searchParams; // 태그 매개변수 조회
    const initialTag = typeof tag === "string" && tag.trim().length > 0 ? tag.trim() : null; // 초기 태그 정리
    return <ExploreScreen key={initialTag ?? "all"} initialTag={initialTag} />; // 탐색 화면 반환
} // 함수 종료
