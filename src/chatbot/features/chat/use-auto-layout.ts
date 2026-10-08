"use client"; // 클라이언트 훅

import { useSyncExternalStore } from "react"; // 바깥 값 구독 도구
import { recommendLayout } from "@chatbot/features/chat/layout-resolver"; // 레이아웃 추천
import type { LayoutId, PlatformMode } from "@chatbot/features/core/types"; // 레이아웃 타입

const SERVER_WIDTH = 1440; // 서버에서 그릴 때 가정하는 너비
const SERVER_HEIGHT = 900; // 서버에서 그릴 때 가정하는 높이

export function subscribeResize(callback: () => void): () => void // 창 크기 변화 구독
{ // 함수 시작
    window.addEventListener("resize", callback); // 구독
    return () => window.removeEventListener("resize", callback); // 해제
} // 함수 종료

export function useAutoLayout(platformMode: PlatformMode): LayoutId // 지금 창 크기에 맞는 자동 배치(창 크기가 바뀌어 배치가 달라지면 바로 다시 그림)
{ // 함수 시작
    return useSyncExternalStore( // 창 크기 구독
        subscribeResize, // 크기 변화 알림
        () => recommendLayout({ width: window.innerWidth, height: window.innerHeight, platformMode, layoutId: null }), // 지금 창에 맞는 배치(배치 이름이 같으면 다시 그리지 않음)
        () => recommendLayout({ width: SERVER_WIDTH, height: SERVER_HEIGHT, platformMode, layoutId: null }), // 서버는 일반 모니터 기준
    ); // 구독 종료
} // 함수 종료
