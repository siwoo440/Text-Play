"use client"; // 클라이언트 컴포넌트

import { useState, type ReactElement, type ReactNode } from "react"; // 리액트 상태 도구
import type { TextPlaySlotId } from "@/features/text-play/core/types"; // 저장 슬롯 계약
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 공용 세션 공급자
import { createLLMAdapter } from "@/lib/adapters/create-llm-adapter"; // 웹 AI 생성기

interface NextTextPlaySessionProviderProps // 웹 세션 속성
{ // 구조 시작
    children: ReactNode; // 하위 화면
    resumeSlot: TextPlaySlotId | null; // 시작 복원 슬롯
} // 구조 종료

export function NextTextPlaySessionProvider({ children, resumeSlot }: NextTextPlaySessionProviderProps): ReactElement // 웹 세션 공급자
{ // 함수 시작
    const [selection] = useState(createLLMAdapter); // 웹 AI 선택
    return <TextPlayProvider llm={selection.adapter} llmLabel={selection.label} resumeSlot={resumeSlot}>{children}</TextPlayProvider>; // 공용 세션 공급
} // 함수 종료
