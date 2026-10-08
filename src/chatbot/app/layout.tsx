import type { Metadata } from "next"; // 메타데이터 타입
import type { ReactNode } from "react"; // 자식 요소 타입
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 공통 앱 셸
import { AppProvider } from "@chatbot/features/core/AppProvider"; // 앱 상태 공급자
import { THEME_STORAGE_KEY } from "@chatbot/lib/theme/stored-theme"; // 테마 저장 키
import "./globals.css"; // 전역 스타일

const themeScript = `try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark'){document.documentElement.dataset.theme='dark'}}catch(e){}`; // 첫 화면 깜빡임 방지(저장된 다크 모드를 그리기 전에 적용)

export const metadata: Metadata = // 기본 메타데이터(페이지가 따로 정하지 않으면 이 값)
{ // 메타데이터 시작
    title: "Mate Verse", // 기본 탭 제목
    description: "캐릭터와 일대일로 대화하고 여러 인물과 스토리를 이어 가는 AI 캐릭터 채팅 서비스", // 기본 설명
}; // 메타데이터 종료

export interface RootLayoutProps // 레이아웃 속성
{ // 속성 시작
    children: ReactNode; // 화면 내용
} // 속성 종료

export default function RootLayout( // 루트 레이아웃 함수
{ children }: RootLayoutProps) // 레이아웃 속성
{ // 함수 시작
    return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>; // 공통 셸 문서 반환(테마는 그리기 전에 적용)
} // 함수 종료
