import type { ReactNode } from "react"; // 자식 요소 타입
import { AppShell } from "@/components/app-shell/AppShell"; // 공통 앱 셸
import { AppProvider } from "@/features/core/AppProvider"; // 앱 상태 공급자
import "./globals.css"; // 전역 스타일

export interface RootLayoutProps // 레이아웃 속성
{ // 속성 시작
    children: ReactNode; // 화면 내용
} // 속성 종료

export default function RootLayout( // 루트 레이아웃 함수
{ children }: RootLayoutProps) // 레이아웃 속성
{ // 함수 시작
    return <html lang="ko"><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>; // 공통 셸 문서 반환
} // 함수 종료
