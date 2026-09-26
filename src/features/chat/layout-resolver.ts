import type { LayoutId, PlatformMode } from "@/features/core/types"; // 레이아웃 타입

export interface LayoutInput // 추천 입력
{ // 구조 시작
    width: number; // 화면 너비
    height: number; // 화면 높이
    platformMode: PlatformMode; // 플랫폼 선택
    layoutId: LayoutId | null; // 사용자 선택
} // 구조 종료

export function recommendLayout(input: LayoutInput): LayoutId // 레이아웃 추천
{ // 함수 시작
    if (input.layoutId !== null) // 사용자 선택 확인
    { // 조건 시작
        return input.layoutId; // 사용자 선택 반환
    } // 조건 종료
    const platform = input.platformMode === "auto" // 자동 플랫폼 판정
        ? input.width <= 760 ? "mobile" : input.width <= 1180 ? "tablet" : "desktop" // 너비 기반 판정
        : input.platformMode; // 강제 플랫폼 적용
    if (platform === "mobile") // 모바일 판정
    { // 조건 시작
        return input.width > input.height ? "M3" : "M1"; // 방향별 반환
    } // 조건 종료
    if (platform === "tablet") // 태블릿 판정
    { // 조건 시작
        return input.width > input.height ? "T1" : "T2"; // 방향별 반환
    } // 조건 종료
    if (input.width >= 1600) // 넓은 화면 판정
    { // 조건 시작
        return "D2"; // 삼열 반환
    } // 조건 종료
    if (input.width / input.height > 1.9) // 초광폭 판정
    { // 조건 시작
        return "D3"; // 시네마틱 반환
    } // 조건 종료
    return "D1"; // 기본 모니터 반환
} // 함수 종료
