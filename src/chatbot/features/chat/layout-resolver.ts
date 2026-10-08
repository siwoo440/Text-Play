import type { LayoutId, PlatformMode } from "@chatbot/features/core/types"; // 레이아웃 타입

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

export type LayoutChoice = "drawer" | "narrow" | "wide"; // 사용자에게 보여 주는 배치(채팅방 설정 위치)

export const layoutChoices: ReadonlyArray<{ id: LayoutChoice; layoutId: LayoutId; label: string; description: string }> = // 배치 선택지(고르면 대표 레이아웃을 저장)
[ // 목록 시작
    { id: "drawer", layoutId: "M1", label: "서랍형", description: "대화를 넓게 보고, 채팅방 설정은 버튼을 눌러 서랍처럼 열어요." }, // 서랍
    { id: "narrow", layoutId: "D1", label: "옆 열 좁게", description: "채팅방 설정을 옆에 좁게 두고 대화 자리를 넉넉히 써요." }, // 좁은 열(220px)
    { id: "wide", layoutId: "D2", label: "옆 열 넓게", description: "채팅방 설정을 옆에 넓게 두어 상태창과 메뉴를 크게 봐요." }, // 넓은 열(320px)
]; // 목록 종료

export function toLayoutChoice(layoutId: LayoutId): LayoutChoice // 저장된 레이아웃이 어느 배치에 속하는지(M은 서랍, 280px 이상 열은 넓게)
{ // 함수 시작
    return layoutId.startsWith("M") ? "drawer" : layoutId === "T1" || layoutId === "D2" || layoutId === "D3" ? "wide" : "narrow"; // 배치 반환
} // 함수 종료
