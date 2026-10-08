import type { DesktopRouteMatch } from "@/desktop/router/desktop-routes"; // 화면 경로 결과

export type DesktopAreaId = "home" | "explore" | "library" | "images" | "text-play" | "settings" | "ai-models" | "support"; // 메뉴 영역 식별자

export interface DesktopArea // 사이드바 메뉴 영역
{ // 구조 시작
    id: DesktopAreaId; // 영역 식별자
    href: string; // 영역 첫 화면 주소
    label: string; // 메뉴 이름
    accent: string; // 메뉴 대표색 이름
    group: "primary" | "program"; // 사이드바 묶음
} // 구조 종료

export const desktopAreas: DesktopArea[] = // 사이드바 위에서 아래 순서(상단 바 화살표 이동 순서)
[ // 목록 시작
    { id: "home", href: "/", label: "메인", accent: "home", group: "primary" }, // 메인
    { id: "explore", href: "/explore", label: "탐색", accent: "explore", group: "primary" }, // 탐색
    { id: "library", href: "/library", label: "내 작품", accent: "library", group: "primary" }, // 보관함
    { id: "images", href: "/images", label: "이미지", accent: "images", group: "primary" }, // 이미지 스튜디오(ChatBot 머리 메뉴 순서)
    { id: "text-play", href: "/text-play", label: "Text-Play", accent: "textplay", group: "primary" }, // Text-Play
    { id: "settings", href: "/settings/profile", label: "설정", accent: "settings", group: "program" }, // 설정
    { id: "ai-models", href: "/ai-models", label: "AI 모델", accent: "settings", group: "program" }, // 내장 AI 모델
    { id: "support", href: "/support", label: "고객 지원", accent: "settings", group: "program" }, // 고객 지원
]; // 목록 종료

export function getDesktopAreaId(match: DesktopRouteMatch): DesktopAreaId | null // 화면의 소속 메뉴 영역
{ // 함수 시작
    switch (match.kind) // 경로 분기
    { // 분기 시작
        case "home": // 메인
        case "character": // 메인·탐색 카드에서 여는 상세
        case "chat": // 상세에서 시작하는 대화
        case "story-home": // 메인의 모드 전환으로 여는 스토리 홈
        case "story": // 스토리 상세
        case "story-chat": // 스토리 대화
            return "home"; // 메인 소속
        case "explore": // 탐색
            return "explore"; // 탐색 소속
        case "library": // 보관함
        case "character-new": // 내 캐릭터 만들기
        case "character-edit": // 내 캐릭터 수정
        case "story-new": // 내 스토리 만들기
        case "story-edit": // 내 스토리 수정
            return "library"; // 내 작품 소속
        case "text-play-home": // Text-Play 홈
        case "text-play-play": // Text-Play 플레이
            return "text-play"; // Text-Play 소속
        case "settings": // 설정 세부 화면
            return "settings"; // 설정 소속
        case "images": // 이미지 스튜디오
            return "images"; // 이미지 소속
        case "rewards": // 출석과 미션(설정 틀 안의 화면)
            return "settings"; // 설정 소속
        case "ai-models": // 내장 AI 모델
            return "ai-models"; // AI 모델 소속
        case "support": // 고객 지원
            return "support"; // 지원 소속
        case "login": // 로그인(사용자 패널에서 여는 화면)
        case "invite": // 친구 초대 링크
        case "auth-callback": // 간편 로그인 복귀
        case "auth-reset": // 비밀번호 다시 정하기
        case "redirect": // 주소 이동 중
        case "not-found": // 없는 화면
            return null; // 소속 없음
    } // 분기 종료
} // 함수 종료

export function getAdjacentDesktopAreas(areaId: DesktopAreaId | null): { previous: DesktopArea | null; next: DesktopArea | null } // 이전·다음 메뉴 영역
{ // 함수 시작
    const index = desktopAreas.findIndex((area) => area.id === areaId); // 현재 영역 위치
    if (index === -1) // 소속 없음 확인
    { // 조건 시작
        return { previous: null, next: null }; // 이동 없음
    } // 조건 종료
    return { previous: desktopAreas[index - 1] ?? null, next: desktopAreas[index + 1] ?? null }; // 처음·끝에서는 멈춤
} // 함수 종료
