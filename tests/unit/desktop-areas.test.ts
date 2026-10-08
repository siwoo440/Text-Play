import { describe, expect, it } from "vitest"; // 테스트 도구
import { desktopAreas, getAdjacentDesktopAreas, getDesktopAreaId } from "@/desktop/router/desktop-areas"; // 데스크톱 메뉴 영역

describe("데스크톱 메뉴 영역", () => // 메뉴 영역 묶음
{ // 묶음 시작
    it("사이드바 위에서 아래 순서로 메뉴 영역을 둔다", () => // 영역 순서 검증
    { // 테스트 시작
        expect(desktopAreas.map((area) => area.label)).toEqual(["메인", "탐색", "내 작품", "이미지", "Text-Play", "설정", "AI 모델", "고객 지원"]); // 메뉴 순서 확인
        expect(desktopAreas.filter((area) => area.group === "program").map((area) => area.label)).toEqual(["설정", "AI 모델", "고객 지원"]); // 프로그램 메뉴 확인
    }); // 테스트 종료

    it("오른쪽은 다음 메뉴, 왼쪽은 이전 메뉴로 이동하고 처음과 끝에서는 멈춘다", () => // 이웃 영역 검증
    { // 테스트 시작
        expect(getAdjacentDesktopAreas("home")).toEqual({ previous: null, next: desktopAreas[1] }); // 메인 이웃 확인
        expect(getAdjacentDesktopAreas("explore").previous?.label).toBe("메인"); // 탐색 이전 확인
        expect(getAdjacentDesktopAreas("explore").next?.label).toBe("내 작품"); // 탐색 다음 확인
        expect(getAdjacentDesktopAreas("library").next?.label).toBe("이미지"); // 내 작품 다음은 이미지(ChatBot 머리 메뉴 순서)
        expect(getAdjacentDesktopAreas("images").next?.label).toBe("Text-Play"); // 이미지 다음 확인
        expect(getAdjacentDesktopAreas("text-play").next?.href).toBe("/settings/profile"); // Text-Play 다음 확인
        expect(getAdjacentDesktopAreas("settings").next?.href).toBe("/ai-models"); // 설정 다음 확인
        expect(getAdjacentDesktopAreas("support")).toEqual({ previous: desktopAreas[6], next: null }); // 마지막 이웃 확인
        expect(getAdjacentDesktopAreas("support").previous?.label).toBe("AI 모델"); // 지원 이전 확인
        expect(getAdjacentDesktopAreas(null)).toEqual({ previous: null, next: null }); // 영역 없음 확인
    }); // 테스트 종료

    it("메뉴에 없는 화면은 소속 메뉴 영역을 따른다", () => // 소속 영역 검증
    { // 테스트 시작
        expect(getDesktopAreaId({ kind: "home" })).toBe("home"); // 메인 확인
        expect(getDesktopAreaId({ kind: "character", id: "harin" })).toBe("home"); // 상세 소속 확인
        expect(getDesktopAreaId({ kind: "chat", characterId: "harin", conversationId: undefined, versionId: undefined })).toBe("home"); // 대화 소속 확인
        expect(getDesktopAreaId({ kind: "explore", tag: "힐링" })).toBe("explore"); // 탐색 확인
        expect(getDesktopAreaId({ kind: "character-new" })).toBe("library"); // 만들기 소속 확인
        expect(getDesktopAreaId({ kind: "character-edit", id: "harin" })).toBe("library"); // 수정 소속 확인
        expect(getDesktopAreaId({ kind: "text-play-home" })).toBe("text-play"); // Text-Play 확인
        expect(getDesktopAreaId({ kind: "settings", section: "tokens" })).toBe("settings"); // 설정 세부 확인
        expect(getDesktopAreaId({ kind: "support" })).toBe("support"); // 지원 확인
        expect(getDesktopAreaId({ kind: "images" })).toBe("images"); // 이미지 스튜디오 확인
        expect(getDesktopAreaId({ kind: "rewards" })).toBe("settings"); // 출석과 미션은 설정 소속(설정 틀 안의 화면)
        expect(getDesktopAreaId({ kind: "login" })).toBeNull(); // 로그인은 메뉴 소속 없음
        expect(getDesktopAreaId({ kind: "invite", code: "abc" })).toBeNull(); // 친구 초대는 메뉴 소속 없음
        expect(getDesktopAreaId({ kind: "ai-models" })).toBe("ai-models"); // AI 모델 확인
        expect(getDesktopAreaId({ kind: "story-home" })).toBe("home"); // 스토리 홈은 메인 소속(메인의 모드 전환)
        expect(getDesktopAreaId({ kind: "story", id: "a" })).toBe("home"); // 스토리 상세 소속 확인
        expect(getDesktopAreaId({ kind: "story-chat", id: "a", conversationId: undefined, versionId: undefined })).toBe("home"); // 스토리 대화 소속 확인
        expect(getDesktopAreaId({ kind: "story-new" })).toBe("library"); // 새 스토리는 내 작품 소속
        expect(getDesktopAreaId({ kind: "story-edit", id: "a" })).toBe("library"); // 스토리 수정 소속 확인
        expect(getDesktopAreaId({ kind: "not-found" })).toBeNull(); // 없는 화면 확인
    }); // 테스트 종료
}); // 묶음 종료
