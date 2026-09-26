import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면

interface TextPlayDemoPageProps // 샘플 경로 속성
{ // 함수 시작
    searchParams: Promise<{ mode?: string }>; // 주소 검색 값
} // 속성 종료

export default async function TextPlayDemoPage({ searchParams }: TextPlayDemoPageProps) // 샘플 플레이 경로
{ // 함수 시작
    const parameters = await searchParams; // 검색 값 해석
    const resumeSlot = parameters.mode === "resume" ? "auto" : null; // 복원 슬롯 선택
    return <TextPlayProvider resumeSlot={resumeSlot}><TextPlayScreen /></TextPlayProvider>; // 플레이 화면 반환
} // 함수 종료
