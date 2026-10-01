import { DESKTOP_UI_TEXT } from "@/desktop/desktop-ui-text"; // 언어별 틀 글자
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어
import type { TextPlaySlotId } from "@/features/text-play/core/types"; // 저장 슬롯 계약

export interface DesktopLocation // 데스크톱 화면 위치
{ // 구조 시작
    pathname: string; // 화면 경로
    search: string; // 검색어 문자열
    hash: string; // 화면 안 위치
} // 구조 종료

export type DesktopSettingsSection = "profile" | "tokens" | "display" | "notifications" | "privacy"; // 설정 화면 종류

export type DesktopRouteMatch = // 화면 경로 결과
    | { kind: "home" } // 메인
    | { kind: "explore"; tag: string | null } // 탐색
    | { kind: "character"; id: string } // 캐릭터 상세
    | { kind: "character-new" } // 캐릭터 만들기
    | { kind: "character-edit"; id: string } // 캐릭터 수정
    | { kind: "chat"; characterId: string; conversationId: string | undefined; versionId: string | undefined } // 대화
    | { kind: "library" } // 보관함
    | { kind: "settings"; section: DesktopSettingsSection } // 설정
    | { kind: "support" } // 고객 지원
    | { kind: "ai-models" } // 내장 AI 모델
    | { kind: "story-home" } // 스토리 모드 홈
    | { kind: "story-new" } // 새 스토리 만들기
    | { kind: "story"; id: string } // 스토리 상세
    | { kind: "story-chat"; id: string; conversationId: string | undefined; versionId: string | undefined } // 스토리 대화
    | { kind: "story-edit"; id: string } // 스토리 수정
    | { kind: "text-play-home" } // Text-Play 홈
    | { kind: "text-play-play"; resumeSlot: TextPlaySlotId | null } // Text-Play 플레이
    | { kind: "redirect"; to: string } // 주소 이동
    | { kind: "not-found" }; // 찾을 수 없음

const resumeSlots: TextPlaySlotId[] = ["auto", "manual-1", "manual-2", "manual-3", "manual-4", "manual-5", "manual-6"]; // 이어하기 가능 슬롯

const redirects: Record<string, string> = // ChatBot 주소 이동 규칙
{ // 객체 시작
    "/settings": "/settings/profile", // 설정 첫 화면
    "/text-play/download": "/text-play", // 통합 전 다운로드 주소
}; // 객체 종료

export function parseDesktopHash(hash: string): DesktopLocation // 해시 주소 해석
{ // 함수 시작
    const value = hash.startsWith("#") ? hash.slice(1) : hash; // 앞 기호 제거
    if (value.length === 0) // 빈 주소 확인
    { // 조건 시작
        return { pathname: "/", search: "", hash: "" }; // 메인 위치 반환
    } // 조건 종료
    return resolveDesktopHref(value, { pathname: "/", search: "", hash: "" }); // 경로 해석 결과 반환
} // 함수 종료

export function toDesktopHash(location: DesktopLocation): string // 해시 주소 생성
{ // 함수 시작
    return `#${location.pathname}${location.search}${location.hash}`; // 해시 주소 반환
} // 함수 종료

export function resolveDesktopHref(href: string, current: DesktopLocation): DesktopLocation // 링크 주소 해석
{ // 함수 시작
    if (href.startsWith("#")) // 같은 화면 위치 확인
    { // 조건 시작
        return { ...current, hash: href }; // 위치만 변경
    } // 조건 종료
    const hashIndex = href.indexOf("#"); // 위치 구분 위치
    const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex); // 위치 앞 문자열
    const hash = hashIndex === -1 ? "" : href.slice(hashIndex); // 위치 문자열
    const searchIndex = beforeHash.indexOf("?"); // 검색어 구분 위치
    const pathname = searchIndex === -1 ? beforeHash : beforeHash.slice(0, searchIndex); // 경로 문자열
    const search = searchIndex === -1 ? "" : beforeHash.slice(searchIndex); // 검색어 문자열
    if (pathname.length === 0) // 검색어만 있는 주소 확인
    { // 조건 시작
        return { pathname: current.pathname, search, hash }; // 현재 경로 유지
    } // 조건 종료
    return { pathname: pathname.startsWith("/") ? pathname : `/${pathname}`, search, hash }; // 위치 반환
} // 함수 종료

function decodeSegment(segment: string): string // 경로 조각 해석
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        return decodeURIComponent(segment); // 해석 결과 반환
    } // 시도 종료
    catch // 잘못된 인코딩 처리
    { // 오류 시작
        return segment; // 원래 조각 반환
    } // 오류 종료
} // 함수 종료

export function matchDesktopRoute(location: DesktopLocation): DesktopRouteMatch // 화면 경로 찾기
{ // 함수 시작
    const pathname = location.pathname.length > 1 ? location.pathname.replace(/\/+$/u, "") : location.pathname; // 끝 빗금 정리
    if (redirects[pathname] !== undefined) // 이동 규칙 확인
    { // 조건 시작
        return { kind: "redirect", to: redirects[pathname] }; // 이동 결과 반환
    } // 조건 종료
    const query = new URLSearchParams(location.search); // 검색어 해석
    const segments = pathname.split("/").filter((segment) => segment.length > 0).map(decodeSegment); // 경로 조각
    const [first, second, third] = segments; // 앞 조각 분리
    if (segments.length === 0) // 메인 확인
    { // 조건 시작
        return { kind: "home" }; // 메인 반환
    } // 조건 종료
    if (first === "explore" && segments.length === 1) // 탐색 확인
    { // 조건 시작
        const tag = query.get("tag")?.trim() ?? ""; // 태그 정리
        return { kind: "explore", tag: tag.length > 0 ? tag : null }; // 탐색 반환
    } // 조건 종료
    if (first === "characters" && second === "new" && segments.length === 2) // 만들기 확인
    { // 조건 시작
        return { kind: "character-new" }; // 만들기 반환
    } // 조건 종료
    if (first === "characters" && second !== undefined && segments.length === 2) // 상세 확인
    { // 조건 시작
        return { kind: "character", id: second }; // 상세 반환
    } // 조건 종료
    if (first === "characters" && second !== undefined && third === "edit" && segments.length === 3) // 수정 확인
    { // 조건 시작
        return { kind: "character-edit", id: second }; // 수정 반환
    } // 조건 종료
    if (first === "chat" && second !== undefined && segments.length === 2) // 대화 확인
    { // 조건 시작
        return { kind: "chat", characterId: second, conversationId: query.get("conversation") ?? undefined, versionId: query.get("version") ?? undefined }; // 대화 반환
    } // 조건 종료
    if (first === "library" && segments.length === 1) // 보관함 확인
    { // 조건 시작
        return { kind: "library" }; // 보관함 반환
    } // 조건 종료
    if (first === "settings" && second !== undefined && segments.length === 2 && second in DESKTOP_UI_TEXT.ko.settingsSections) // 설정 확인
    { // 조건 시작
        return { kind: "settings", section: second as DesktopSettingsSection }; // 설정 반환
    } // 조건 종료
    if (first === "support" && segments.length === 1) // 지원 확인
    { // 조건 시작
        return { kind: "support" }; // 지원 반환
    } // 조건 종료
    if (first === "stories" && segments.length === 1) // 스토리 홈 확인
    { // 조건 시작
        return { kind: "story-home" }; // 스토리 홈 반환
    } // 조건 종료
    if (first === "stories" && second === "new" && segments.length === 2) // 새 스토리 확인
    { // 조건 시작
        return { kind: "story-new" }; // 새 스토리 반환
    } // 조건 종료
    if (first === "stories" && second !== undefined && segments.length === 2) // 스토리 상세 확인
    { // 조건 시작
        return { kind: "story", id: second }; // 스토리 상세 반환
    } // 조건 종료
    if (first === "stories" && second !== undefined && segments[2] === "chat" && segments.length === 3) // 스토리 대화 확인
    { // 조건 시작
        return { kind: "story-chat", id: second, conversationId: query.get("conversation") ?? undefined, versionId: query.get("version") ?? undefined }; // 스토리 대화 반환
    } // 조건 종료
    if (first === "stories" && second !== undefined && segments[2] === "edit" && segments.length === 3) // 스토리 수정 확인
    { // 조건 시작
        return { kind: "story-edit", id: second }; // 스토리 수정 반환
    } // 조건 종료
    if (first === "ai-models" && segments.length === 1) // AI 모델 확인
    { // 조건 시작
        return { kind: "ai-models" }; // AI 모델 반환
    } // 조건 종료
    if (first === "text-play" && segments.length === 1) // Text-Play 홈 확인
    { // 조건 시작
        return { kind: "text-play-home" }; // 홈 반환
    } // 조건 종료
    if (first === "text-play" && second === "play" && segments.length === 2) // Text-Play 플레이 확인
    { // 조건 시작
        if (query.get("mode") !== "resume") // 새 게임 확인
        { // 조건 시작
            return { kind: "text-play-play", resumeSlot: null }; // 새 게임 반환
        } // 조건 종료
        const slot = resumeSlots.find((candidate) => candidate === query.get("slot")) ?? "auto"; // 이어할 슬롯(기본 자동 저장)
        return { kind: "text-play-play", resumeSlot: slot }; // 이어하기 반환
    } // 조건 종료
    return { kind: "not-found" }; // 찾을 수 없음 반환
} // 함수 종료

export function getDesktopRouteTitle(match: DesktopRouteMatch, language: AppLanguage = "ko"): string // 화면 제목(고른 언어)
{ // 함수 시작
    const text = DESKTOP_UI_TEXT[language]; // 언어별 틀 글자
    return match.kind === "settings" ? text.settingsTitle(text.settingsSections[match.section]) : text.routeTitles[match.kind]; // 설정은 세부 화면 이름을 붙임
} // 함수 종료
