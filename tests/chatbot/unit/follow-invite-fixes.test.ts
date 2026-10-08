import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { checkInviteRedeem } from "@chatbot/features/rewards/referral-model"; // 초대 코드 판정
import { getFollowedCreators } from "@chatbot/features/settings/settings-insights"; // 팔로우 목록

describe("제작자 팔로우 해제", () => // 팔로우 묶음
{ // 묶음 시작
    it("캐릭터가 하나도 남지 않은 제작자도 팔로우를 해제할 수 있다", () => // 해제 검증
    { // 검증 시작
        const state = { ...createInitialState(), followedCreatorIds: ["creator-gone", "creator-mateverse-story"] }; // 작품이 지워진 제작자와 스토리만 있는 제작자를 팔로우한 상태
        expect(getFollowedCreators(state).map((creator) => creator.creatorId)).toEqual(["creator-mateverse-story", "creator-gone"]); // 목록에는 둘 다 나옴
        const withoutGone = appReducer(state, { type: "toggle-creator-follow", creatorId: "creator-gone" }); // 작품이 지워진 제작자 해제
        expect(withoutGone.followedCreatorIds).toEqual(["creator-mateverse-story"]); // 목록에서 빠짐
        const withoutStory = appReducer(withoutGone, { type: "toggle-creator-follow", creatorId: "creator-mateverse-story" }); // 스토리만 있는 제작자 해제
        expect(withoutStory.followedCreatorIds).toEqual([]); // 목록에서 빠짐
    }); // 검증 종료

    it("스토리만 만든 제작자는 팔로우할 수 있고, 작품이 없는 제작자는 새로 팔로우하지 않는다", () => // 팔로우 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(appReducer(state, { type: "toggle-creator-follow", creatorId: "creator-mateverse-story" }).followedCreatorIds).toContain("creator-mateverse-story"); // 스토리 제작자 팔로우
        expect(appReducer(state, { type: "toggle-creator-follow", creatorId: "creator-nobody" }).followedCreatorIds).not.toContain("creator-nobody"); // 없는 제작자는 그대로
    }); // 검증 종료
}); // 묶음 종료

describe("내 초대 코드 판정", () => // 초대 묶음
{ // 묶음 시작
    it("환영 보너스를 이미 받았어도 내 초대 코드는 내 것으로 알아본다", () => // 내 코드 우선 검증
    { // 검증 시작
        const referral = { ...createInitialState().referral, code: "ABCD2345", createdAt: "2026-10-05T00:00:00.000Z", redeemedCode: "WXYZ6789", redeemedAt: "2026-10-05T01:00:00.000Z" }; // 코드를 만들었고 친구 코드로 보너스도 받은 상태
        expect(checkInviteRedeem(referral, "ABCD-2345")).toBe("own"); // 내 초대 링크
        expect(checkInviteRedeem(referral, "WXYZ6789")).toBe("used"); // 내가 받은 코드
        expect(checkInviteRedeem(referral, "QRST2345")).toBe("used"); // 다른 코드도 한 번만
        expect(checkInviteRedeem(referral, "abc")).toBe("invalid"); // 형식 오류
        expect(checkInviteRedeem({ ...referral, redeemedCode: null, redeemedAt: null }, "QRST2345")).toBe("ok"); // 받기 전에는 가능
    }); // 검증 종료
}); // 묶음 종료
