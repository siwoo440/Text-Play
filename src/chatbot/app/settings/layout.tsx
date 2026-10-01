import type { ReactNode } from "react"; // 자식 요소 타입
import { SettingsShell } from "@chatbot/features/settings/SettingsShell"; // 설정 공통 틀

export default function SettingsLayout({ children }: { children: ReactNode }) // 설정 레이아웃
{ // 함수 시작
    return <SettingsShell>{children}</SettingsShell>; // 공통 틀 반환
} // 함수 종료
