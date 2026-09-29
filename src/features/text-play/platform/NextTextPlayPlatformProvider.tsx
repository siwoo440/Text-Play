"use client"; // 클라이언트 컴포넌트

import Image from "next/image"; // 최적화 이미지
import { useRouter } from "next/navigation"; // 경로 이동 도구
import { useMemo, type ReactElement, type ReactNode } from "react"; // 리액트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform, type TextPlayRoute } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약

interface NextTextPlayPlatformProviderProps // 웹 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 화면
} // 구조 종료

const ROUTE_PATHS = // 웹 경로 표
{ // 객체 시작
    home: "/text-play", // 홈 경로
    new: "/text-play/demo?mode=new", // 새 게임 경로
    resume: "/text-play/demo?mode=resume", // 이어하기 경로
    back: "/", // 탐색 복귀 경로
} as const satisfies Record<TextPlayRoute, string>; // 객체 종료

export function NextTextPlayPlatformProvider({ children }: NextTextPlayPlatformProviderProps): ReactElement // 웹 플랫폼 공급자
{ // 함수 시작
    const router = useRouter(); // 경로 이동기
    const platform = useMemo<TextPlayPlatform>(() => // 플랫폼 생성
    { // 함수 시작
        return ( // 플랫폼 반환
        { // 객체 시작
            applyWindowResolution: async () => undefined, // 웹 창 변경 생략
            navigate: (route) => router.push(ROUTE_PATHS[route]), // 웹 경로 이동
            renderSceneImage: (source) => <Image src={source} alt="" fill sizes="(max-width: 767px) 100vw, 34vw" priority />, // 장면 이미지 출력
        } // 객체 종료
        ); // 플랫폼 반환 종료
    }, [router]); // 이동기 의존
    return <TextPlayPlatformProvider value={platform}>{children}</TextPlayPlatformProvider>; // 공용 플랫폼 공급
} // 함수 종료
