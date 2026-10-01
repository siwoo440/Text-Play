import { describe, expect, it } from "vitest"; // 테스트 도구
import { getDesktopRouteTitle, matchDesktopRoute, parseDesktopHash, resolveDesktopHref, toDesktopHash, type DesktopLocation } from "@/desktop/router/desktop-routes"; // 데스크톱 경로 도구

function at(pathname: string, search = ""): DesktopLocation // 위치 생성 도우미
{ // 함수 시작
    return { pathname, search, hash: "" }; // 위치 반환
} // 함수 종료

describe("데스크톱 주소 해석", () => // 주소 해석 묶음
{ // 묶음 시작
    it("해시 주소를 경로·검색어·위치로 나눈다", () => // 해시 분해 검증
    { // 테스트 시작
        expect(parseDesktopHash("")).toEqual(at("/")); // 빈 주소 확인
        expect(parseDesktopHash("#")).toEqual(at("/")); // 빈 해시 확인
        expect(parseDesktopHash("#/chat/rian?conversation=c1&version=v2#bottom")).toEqual({ pathname: "/chat/rian", search: "?conversation=c1&version=v2", hash: "#bottom" }); // 전체 주소 확인
    }); // 테스트 종료

    it("위치를 해시 주소로 바꾼다", () => // 해시 생성 검증
    { // 테스트 시작
        expect(toDesktopHash({ pathname: "/explore", search: "?tag=힐링", hash: "" })).toBe("#/explore?tag=힐링"); // 검색어 포함 확인
        expect(toDesktopHash({ pathname: "/settings/profile", search: "", hash: "#adult" })).toBe("#/settings/profile#adult"); // 위치 포함 확인
    }); // 테스트 종료

    it("현재 위치를 기준으로 링크 주소를 해석한다", () => // 링크 해석 검증
    { // 테스트 시작
        const current = at("/settings/privacy"); // 현재 위치
        expect(resolveDesktopHref("/settings/profile#adult", current)).toEqual({ pathname: "/settings/profile", search: "", hash: "#adult" }); // 다른 경로 확인
        expect(resolveDesktopHref("#data", current)).toEqual({ pathname: "/settings/privacy", search: "", hash: "#data" }); // 같은 화면 위치 확인
        expect(resolveDesktopHref("/chat/rian?conversation=c1", current)).toEqual({ pathname: "/chat/rian", search: "?conversation=c1", hash: "" }); // 검색어 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("데스크톱 화면 경로", () => // 화면 경로 묶음
{ // 묶음 시작
    it("ChatBot 화면 경로를 찾는다", () => // ChatBot 경로 검증
    { // 테스트 시작
        expect(matchDesktopRoute(at("/"))).toEqual({ kind: "home" }); // 메인 확인
        expect(matchDesktopRoute(at("/explore"))).toEqual({ kind: "explore", tag: null }); // 탐색 확인
        expect(matchDesktopRoute(at("/explore", "?tag=%ED%9E%90%EB%A7%81"))).toEqual({ kind: "explore", tag: "힐링" }); // 태그 탐색 확인
        expect(matchDesktopRoute(at("/characters/new"))).toEqual({ kind: "character-new" }); // 만들기 확인
        expect(matchDesktopRoute(at("/characters/rian"))).toEqual({ kind: "character", id: "rian" }); // 상세 확인
        expect(matchDesktopRoute(at("/characters/rian/edit"))).toEqual({ kind: "character-edit", id: "rian" }); // 수정 확인
        expect(matchDesktopRoute(at("/chat/rian", "?conversation=c1&version=v2"))).toEqual({ kind: "chat", characterId: "rian", conversationId: "c1", versionId: "v2" }); // 대화 확인
        expect(matchDesktopRoute(at("/chat/rian"))).toEqual({ kind: "chat", characterId: "rian", conversationId: undefined, versionId: undefined }); // 새 대화 확인
        expect(matchDesktopRoute(at("/library"))).toEqual({ kind: "library" }); // 보관함 확인
        expect(matchDesktopRoute(at("/settings/tokens"))).toEqual({ kind: "settings", section: "tokens" }); // 설정 확인
        expect(matchDesktopRoute(at("/support"))).toEqual({ kind: "support" }); // 지원 확인
    }); // 테스트 종료

    it("ChatBot 주소 이동 규칙을 그대로 따른다", () => // 이동 규칙 검증
    { // 테스트 시작
        expect(matchDesktopRoute(at("/settings"))).toEqual({ kind: "redirect", to: "/settings/profile" }); // 설정 첫 화면 확인
        expect(matchDesktopRoute(at("/text-play/download"))).toEqual({ kind: "redirect", to: "/text-play" }); // 이전 다운로드 주소 확인
    }); // 테스트 종료

    it("Text-Play 홈과 플레이 화면을 찾는다", () => // Text-Play 경로 검증
    { // 테스트 시작
        expect(matchDesktopRoute(at("/text-play"))).toEqual({ kind: "text-play-home" }); // 홈 확인
        expect(matchDesktopRoute(at("/text-play/play", "?mode=new"))).toEqual({ kind: "text-play-play", resumeSlot: null }); // 새 게임 확인
        expect(matchDesktopRoute(at("/text-play/play", "?mode=resume"))).toEqual({ kind: "text-play-play", resumeSlot: "auto" }); // 이어하기 확인
        expect(matchDesktopRoute(at("/text-play/play", "?mode=resume&slot=manual-2"))).toEqual({ kind: "text-play-play", resumeSlot: "manual-2" }); // 수동 슬롯 이어하기 확인
        expect(matchDesktopRoute(at("/text-play/play", "?mode=resume&slot=unknown"))).toEqual({ kind: "text-play-play", resumeSlot: "auto" }); // 잘못된 슬롯 확인
        expect(matchDesktopRoute(at("/text-play/play", "?mode=new&slot=manual-2"))).toEqual({ kind: "text-play-play", resumeSlot: null }); // 새 게임 슬롯 무시 확인
    }); // 테스트 종료

    it("없는 경로는 찾을 수 없음으로 처리한다", () => // 없는 경로 검증
    { // 테스트 시작
        expect(matchDesktopRoute(at("/unknown"))).toEqual({ kind: "not-found" }); // 없는 경로 확인
        expect(matchDesktopRoute(at("/settings/unknown"))).toEqual({ kind: "not-found" }); // 없는 설정 확인
        expect(matchDesktopRoute(at("/characters/rian/extra"))).toEqual({ kind: "not-found" }); // 깊은 경로 확인
    }); // 테스트 종료

    it("화면 제목을 정한다", () => // 화면 제목 검증
    { // 테스트 시작
        expect(getDesktopRouteTitle({ kind: "home" })).toBe("메인"); // 메인 제목 확인
        expect(getDesktopRouteTitle({ kind: "explore", tag: null })).toBe("탐색"); // 탐색 제목 확인
        expect(getDesktopRouteTitle({ kind: "settings", section: "privacy" })).toBe("설정 · 개인정보 및 보안"); // 설정 제목 확인
        expect(getDesktopRouteTitle({ kind: "text-play-home" })).toBe("Text-Play"); // Text-Play 제목 확인
    }); // 테스트 종료
}); // 묶음 종료
