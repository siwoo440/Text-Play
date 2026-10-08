"use client"; // 클라이언트 컴포넌트

import { useEffect } from "react"; // 리액트 효과
import { useAppStore } from "@chatbot/features/core/AppProvider"; // ChatBot 앱 저장소
import { THEME_STORAGE_KEY } from "@chatbot/lib/theme/stored-theme"; // ChatBot 테마 저장 키

export function DesktopThemeSync(): null // 앱 테마(밝게·어둡게)를 문서에 적용(ChatBot 셸과 같은 방식, 사이드바 틀이 없는 플레이 화면에서도 동작하게 따로 둠)
{ // 함수 시작
    const theme = useAppStore().state.settings.theme; // 앱 테마
    useEffect(() => // 테마 적용과 다음 실행 첫 화면용 저장
    { // 효과 시작
        document.documentElement.dataset.theme = theme; // 문서 루트 표시
        try // 저장 시도
        { // 시도 시작
            window.localStorage.setItem(THEME_STORAGE_KEY, theme); // 테마 저장
        } // 시도 종료
        catch // 저장 실패 처리
        { // 실패 시작
            void theme; // 화면 적용만 유지
        } // 실패 종료
    }, [theme]); // 테마 의존
    return null; // 화면 없음
} // 함수 종료
