import type { TextPlaySlotId } from "@/features/text-play/core/types"; // 저장 슬롯 계약

interface DesktopHomeRoute // 데스크톱 홈 화면
{ // 구조 시작
    screen: "home"; // 홈 화면 종류
} // 구조 종료

interface DesktopPlayRoute // 데스크톱 플레이 화면
{ // 구조 시작
    screen: "play"; // 플레이 화면 종류
    resumeSlot: TextPlaySlotId | null; // 시작 복원 슬롯
} // 구조 종료

interface DesktopStartNewAction // 새 게임 동작
{ // 구조 시작
    type: "start-new"; // 새 게임 종류
} // 구조 종료

interface DesktopResumeAction // 이어하기 동작
{ // 구조 시작
    type: "resume"; // 이어하기 종류
} // 구조 종료

interface DesktopShowHomeAction // 홈 복귀 동작
{ // 구조 시작
    type: "show-home"; // 홈 복귀 종류
} // 구조 종료

export type DesktopRoute = DesktopHomeRoute | DesktopPlayRoute; // 데스크톱 화면

export type DesktopRouteAction = DesktopStartNewAction | DesktopResumeAction | DesktopShowHomeAction; // 화면 전이 동작

export function reduceDesktopRoute(_route: DesktopRoute, action: DesktopRouteAction): DesktopRoute // 화면 전이 함수
{ // 함수 시작
    void _route; // 기존 화면 표시
    switch (action.type) // 동작 분기
    { // 분기 시작
        case "start-new": // 새 게임 분기
        { // 분기 내용 시작
            return { screen: "play", resumeSlot: null }; // 새 게임 화면 반환
        } // 분기 내용 종료
        case "resume": // 이어하기 분기
        { // 분기 내용 시작
            return { screen: "play", resumeSlot: "auto" }; // 이어하기 화면 반환
        } // 분기 내용 종료
        case "show-home": // 홈 복귀 분기
        { // 분기 내용 시작
            return { screen: "home" }; // 홈 화면 반환
        } // 분기 내용 종료
    } // 분기 종료
} // 함수 종료
