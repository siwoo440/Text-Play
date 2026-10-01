export type SettingsGroupTone = "account" | "preferences" | "support"; // 메뉴 묶음 색

export interface SettingsNavigationItem // 메뉴 항목
{ // 구조 시작
    href: string; // 이동 주소
    label: string; // 메뉴 이름
    description: string; // 메뉴 설명
} // 구조 종료

export interface SettingsNavigationGroup // 메뉴 묶음
{ // 구조 시작
    id: SettingsGroupTone; // 묶음 식별자
    label: string; // 묶음 이름
    items: SettingsNavigationItem[]; // 묶음 항목
} // 구조 종료

export const settingsNavigation: SettingsNavigationGroup[] = // 오른쪽 패널·설정 공통 메뉴
[ // 목록 시작
    { // 계정 묶음 시작
        id: "account", // 계정 식별자
        label: "계정", // 계정 이름
        items: // 계정 항목
        [ // 항목 시작
            { href: "/settings/profile", label: "프로필 관리", description: "닉네임과 프로필 표시" }, // 프로필 항목
            { href: "/library", label: "내 캐릭터와 작품", description: "보관함에서 만든 캐릭터와 대화 관리" }, // 작품 항목
            { href: "/settings/tokens", label: "토큰 이용 내역", description: "잔액과 사용 비용" }, // 토큰 항목
        ], // 항목 종료
    }, // 계정 묶음 종료
    { // 설정 묶음 시작
        id: "preferences", // 설정 식별자
        label: "설정", // 설정 이름
        items: // 설정 항목
        [ // 항목 시작
            { href: "/settings/display", label: "화면 레이아웃", description: "기기 모드와 채팅 배치" }, // 화면 항목
            { href: "/settings/notifications", label: "알림과 선제 메시지", description: "허용 시간과 하루 횟수" }, // 알림 항목
        ], // 항목 종료
    }, // 설정 묶음 종료
    { // 지원 묶음 시작
        id: "support", // 지원 식별자
        label: "지원", // 지원 이름
        items: // 지원 항목
        [ // 항목 시작
            { href: "/settings/privacy", label: "개인정보 및 보안", description: "저장 위치와 데이터 관리" }, // 보안 항목
            { href: "/support", label: "고객 지원", description: "자주 묻는 질문과 앱 정보" }, // 지원 항목
        ], // 항목 종료
    }, // 지원 묶음 종료
]; // 목록 종료

export function findSettingsGroup(pathname: string): SettingsGroupTone // 현재 묶음 조회
{ // 함수 시작
    return settingsNavigation.find((group) => group.items.some((item) => pathname.startsWith(item.href)))?.id ?? "account"; // 묶음 반환
} // 함수 종료
