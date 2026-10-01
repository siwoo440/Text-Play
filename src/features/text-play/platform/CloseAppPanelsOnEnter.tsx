"use client"; // 클라이언트 컴포넌트

import { useEffect } from "react"; // 리액트 도구
import { useAppStore } from "@/features/core/AppProvider"; // 앱 저장소

export function CloseAppPanelsOnEnter(): null // 진입 시 앱 패널 닫기
{ // 함수 시작
    const { dispatch, restored } = useAppStore(); // 앱 상태 변경기와 복원 여부
    useEffect(() => // 진입 효과
    { // 효과 시작
        if (restored) // 저장 상태 복원 이후 확인
        { // 조건 시작
            dispatch({ type: "close-panels" }); // 게임 화면을 가리는 패널 닫기
        } // 조건 종료
    }, [dispatch, restored]); // 복원 완료 의존
    return null; // 화면 출력 없음
} // 함수 종료
