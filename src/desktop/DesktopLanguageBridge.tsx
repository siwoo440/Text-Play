"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef } from "react"; // 리액트 도구
import { useAppStore } from "@chatbot/features/core/AppProvider"; // ChatBot 앱 저장소
import { resolveLocale } from "@chatbot/lib/i18n"; // ChatBot 화면 언어 정하기
import { useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // Text-Play 설정
import { hasStoredTextPlayLanguage, type AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 언어 저장 확인

export function DesktopLanguageBridge(): null // Text-Play 설정 언어와 ChatBot 화면 언어를 하나로 맞추는 다리(화면 없음)
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // ChatBot 앱 상태
    const { preferences, ready, updatePreferences } = useTextPlayPreferences(); // Text-Play 설정
    const setting = state.settings.language; // ChatBot 언어 설정(자동·한국어·영어)
    const chatbotLocale = resolveLocale(setting, typeof navigator === "undefined" ? undefined : navigator.language); // ChatBot이 실제로 쓰는 화면 언어
    const previousTextPlay = useRef<AppLanguage | null>(null); // 직전에 본 Text-Play 언어(방금 바뀌었는지 판단)
    useEffect(() => // 두 언어 맞추기
    { // 효과 시작
        if (!ready) // Text-Play 설정을 읽기 전
        { // 조건 시작
            return; // 대기
        } // 조건 종료
        const previous = previousTextPlay.current; // 직전 Text-Play 언어
        previousTextPlay.current = preferences.language; // 지금 언어 기억
        if (preferences.language === chatbotLocale) // 이미 같음
        { // 조건 시작
            return; // 할 일 없음
        } // 조건 종료
        const textPlayChanged = previous !== null && previous !== preferences.language; // 사용자가 방금 Text-Play 설정 창에서 바꿈
        const chatbotChosen = setting === "ko" || setting === "en"; // ChatBot에서 직접 고른 언어가 있음
        if (textPlayChanged || (!chatbotChosen && hasStoredTextPlayLanguage(window.localStorage))) // Text-Play 선택이 최신이거나, ChatBot은 자동인데 Text-Play에서 고른 값이 있음
        { // 조건 시작
            dispatch({ type: "update-settings", settings: { language: preferences.language } }); // ChatBot 화면 언어를 Text-Play 선택으로
            return; // 처리 종료
        } // 조건 종료
        updatePreferences({ language: chatbotLocale }); // ChatBot에서 고른 언어(또는 자동 언어)를 Text-Play 설정으로
    }, [chatbotLocale, dispatch, preferences.language, ready, setting, updatePreferences]); // 두 언어 의존
    return null; // 화면 없음
} // 함수 종료
