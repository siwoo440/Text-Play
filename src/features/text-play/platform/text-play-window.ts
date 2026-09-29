import type { TextPlayResolutionId } from "@/features/text-play/preferences/text-play-preferences"; // 해상도 타입

export interface TextPlayWindowSize // 창 크기 구조
{ // 구조 시작
    width: number; // 창 너비
    height: number; // 창 높이
} // 구조 종료

const fixedWindowSizes: Record<Exclude<TextPlayResolutionId, "fit">, TextPlayWindowSize> = // 고정 크기 목록
{ // 객체 시작
    "1280x720": { width: 1280, height: 720 }, // HD 크기
    "1600x900": { width: 1600, height: 900 }, // 중간 크기
    "1920x1080": { width: 1920, height: 1080 }, // FHD 크기
}; // 객체 종료

export function resolveWindowSize(resolutionId: TextPlayResolutionId, availableWidth: number, availableHeight: number): TextPlayWindowSize | "maximize" // 창 크기 계산
{ // 함수 시작
    if (resolutionId === "fit") // 화면 맞춤 확인
    { // 조건 시작
        return "maximize"; // 최대화 반환
    } // 조건 종료
    const requested = fixedWindowSizes[resolutionId]; // 요청 크기 조회
    return { width: Math.min(requested.width, availableWidth), height: Math.min(requested.height, availableHeight) }; // 제한 크기 반환
} // 함수 종료
