"use client"; // 클라이언트 컴포넌트

import { useEffect, type ReactElement } from "react"; // 리액트 효과 도구
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 훅

export function TextPlayWindowResolutionSync(): ReactElement | null // 창 해상도 동기화기
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 실행 플랫폼 조회
    const { preferences, ready } = useTextPlayPreferences(); // 게임 설정 조회
    useEffect(() => // 저장 해상도 적용
    { // 효과 시작
        if (!ready) // 설정 준비 확인
        { // 조건 시작
            return; // 적용 대기
        } // 조건 종료
        void platform.applyWindowResolution(preferences.resolutionId).catch(() => undefined); // 창 크기 반영
    }, [platform, preferences.resolutionId, ready]); // 해상도 의존
    return null; // 화면 미출력
} // 함수 종료
