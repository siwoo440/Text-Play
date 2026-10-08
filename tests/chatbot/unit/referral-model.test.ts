import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer, type AppAction } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, Message } from "@chatbot/features/core/types"; // 상태 타입
import { buildInviteLink, checkInviteRedeem, formatInviteCode, generateInviteCode, getInviteSummary, INVITE_FRIEND_REWARD, INVITE_MONTHLY_LIMIT, INVITE_QUALIFY_MESSAGES, INVITE_WELCOME_REWARD, isInviteCode, normalizeInviteCode } from "@chatbot/features/rewards/referral-model"; // 친구 초대 규칙
import { trackRewardProgress } from "@chatbot/features/rewards/reward-tracker"; // 진행 추적

const now = "2026-10-03T12:00:00+09:00"; // 기준 시각(한국 시간 10월 3일)
const myCode = "ABCD2345"; // 내 초대 코드
const friendCode = "WXYZ6789"; // 친구의 초대 코드
const withCode = () => appReducer(createInitialState(), { type: "create-invite-code", code: myCode, now }); // 초대 코드를 만든 상태
const confirm = (state: AppState, ids: string[], at = now) => appReducer(state, { type: "apply-invite-confirmations", friends: ids.map((id) => ({ id, nickname: `친구 ${id}`, qualifiedAt: at })), now: at }); // 친구 확인 반영

describe("초대 코드", () => // 코드 묶음
{ // 묶음 시작
    it("헷갈리는 글자(I·O·0·1) 없이 여덟 글자로 만든다", () => // 코드 생성
    { // 검증 시작
        const fixed = generateInviteCode(() => 0); // 항상 첫 글자
        expect(fixed).toBe("AAAAAAAA"); // 주입한 난수 사용
        for (let index = 0; index < 50; index += 1) // 여러 번
        { // 반복 시작
            expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/); // 허용 글자 여덟 개
        } // 반복 종료
    }); // 검증 종료

    it("입력한 코드를 대문자로 다듬고 형식을 확인하며 보기 좋게 나눠 보여 준다", () => // 다듬기
    { // 검증 시작
        expect(normalizeInviteCode(" abcd-2345 ")).toBe("ABCD2345"); // 공백·줄표 제거, 대문자
        expect(isInviteCode("ABCD2345")).toBe(true); // 올바른 코드
        expect(isInviteCode("ABCD234")).toBe(false); // 짧음
        expect(isInviteCode("ABCD234O")).toBe(false); // 헷갈리는 글자
        expect(formatInviteCode("ABCD2345")).toBe("ABCD-2345"); // 네 글자씩
        expect(buildInviteLink("https://mateverse.example", "ABCD2345")).toBe("https://mateverse.example/invite/ABCD2345"); // 초대 링크
    }); // 검증 종료

    it("내 초대 코드는 한 번만 만들어진다", () => // 코드 만들기
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(state.referral).toEqual({ code: null, createdAt: null, redeemedCode: null, redeemedAt: null, qualifyingMessages: 0, friends: [] }); // 처음 상태
        expect(appReducer(state, { type: "create-invite-code", code: "잘못된코드", now })).toBe(state); // 형식이 틀리면 무시
        const created = withCode(); // 만들기
        expect(created.referral).toMatchObject({ code: myCode, createdAt: now }); // 저장
        expect(appReducer(created, { type: "create-invite-code", code: friendCode, now })).toBe(created); // 다시 만들 수 없음
    }); // 검증 종료
}); // 묶음 종료

describe("초대받은 사람 보너스", () => // 초대받은 사람 묶음
{ // 묶음 시작
    it("친구의 코드를 넣으면 환영 보너스를 한 번 받는다", () => // 보너스
    { // 검증 시작
        const state = withCode(); // 내 코드가 있는 상태
        expect(checkInviteRedeem(state.referral, friendCode)).toBe("ok"); // 받을 수 있음
        const redeemed = appReducer(state, { type: "redeem-invite-code", code: "wxyz-6789", now }); // 소문자·줄표 입력
        expect(INVITE_WELCOME_REWARD).toBe(30); // 환영 보너스
        expect(redeemed.wallet.balance).toBe(state.wallet.balance + 30); // 30토큰
        expect(redeemed.referral).toMatchObject({ redeemedCode: friendCode, redeemedAt: now, qualifyingMessages: 0 }); // 받은 코드
        expect(redeemed.tokenRecords[0]).toMatchObject({ id: "invite-welcome", direction: "earn", source: "invite-welcome", label: "친구 초대 환영 보너스", amount: 30 }); // 받은 기록
        expect(redeemed.rewards.totalEarned).toBe(30); // 받은 합계
        expect(checkInviteRedeem(redeemed.referral, "QRST2345")).toBe("used"); // 두 번은 안 됨
        expect(appReducer(redeemed, { type: "redeem-invite-code", code: "QRST2345", now })).toBe(redeemed); // 변화 없음
    }); // 검증 종료

    it("형식이 틀린 코드와 내 코드는 받을 수 없다", () => // 거절
    { // 검증 시작
        const state = withCode(); // 내 코드가 있는 상태
        expect(checkInviteRedeem(state.referral, "12")).toBe("invalid"); // 형식 오류
        expect(checkInviteRedeem(state.referral, "abcd 2345")).toBe("own"); // 내 코드
        expect(appReducer(state, { type: "redeem-invite-code", code: "12", now })).toBe(state); // 변화 없음
        expect(appReducer(state, { type: "redeem-invite-code", code: myCode, now })).toBe(state); // 변화 없음
    }); // 검증 종료

    it("보너스를 받은 뒤 보낸 메시지를 다섯 번까지 세어 초대해 준 친구의 보상 조건으로 남긴다", () => // 조건 세기
    { // 검증 시작
        const message = (id: string): Message => ({ id, conversationId: "conversation-rian", versionId: "conversation-rian-version-1", sourceMessageId: null, role: "user", content: "안녕", emotion: null, sceneEvent: null, createdAt: now }); // 내 메시지
        const send = (state: AppState, ids: string[]) => // 채팅 저장
        { // 함수 시작
            const chat = structuredClone(state); // 채팅 상태
            chat.messages = [...chat.messages, ...ids.map(message)]; // 새 메시지
            const action: AppAction = { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: false }; // 병합
            return trackRewardProgress(state, appReducer(state, action), action, now); // 추적까지
        }; // 함수 종료
        const plain = send(createInitialState(), ["a1", "a2"]); // 초대받지 않은 사람
        expect(plain.referral.qualifyingMessages).toBe(0); // 세지 않음
        let state = appReducer(createInitialState(), { type: "redeem-invite-code", code: friendCode, now }); // 초대받음
        state = send(state, ["u1", "u2", "u3"]); // 3번
        expect(state.referral.qualifyingMessages).toBe(3); // 진행 3/5 확인
        state = send(state, ["u4", "u5", "u6", "u7"]); // 4번 더
        expect(INVITE_QUALIFY_MESSAGES).toBe(5); // 조건
        expect(state.referral.qualifyingMessages).toBe(5); // 5까지만
    }); // 검증 종료
}); // 묶음 종료

describe("초대한 사람 보상", () => // 초대한 사람 묶음
{ // 묶음 시작
    it("조건을 채운 친구 한 명마다 보상을 한 번 받는다", () => // 친구 보상
    { // 검증 시작
        const state = withCode(); // 내 코드가 있는 상태
        const once = confirm(state, ["f1", "f2"]); // 친구 2명 확인
        expect(INVITE_FRIEND_REWARD).toBe(30); // 친구 보상
        expect(once.wallet.balance).toBe(state.wallet.balance + 60); // 60토큰
        expect(once.referral.friends).toEqual([{ id: "f2", nickname: "친구 f2", qualifiedAt: now, rewardedAt: now }, { id: "f1", nickname: "친구 f1", qualifiedAt: now, rewardedAt: now }]); // 최근 순
        expect(once.tokenRecords.map((record) => record.id)).toEqual(["invite-friend-f2", "invite-friend-f1"]); // 받은 기록
        expect(once.tokenRecords[0]).toMatchObject({ source: "invite-friend", label: "친구 초대: 친구 f2", amount: 30 }); // 기록 내용
        const twice = confirm(once, ["f1", "f2"]); // 같은 친구 다시
        expect(twice).toBe(once); // 변화 없음
        expect(getInviteSummary(once.referral, new Date(now))).toEqual({ friendCount: 2, rewardedThisMonth: 2, monthlyLimit: 10, remaining: 8 }); // 요약
    }); // 검증 종료

    it("내 초대 코드가 없으면 친구 확인을 받지 않는다", () => // 코드 없음
    { // 검증 시작
        const state = createInitialState(); // 코드 없는 상태
        expect(confirm(state, ["f1"])).toBe(state); // 변화 없음
    }); // 검증 종료

    it("한 달에 열 명까지만 보상을 주고, 넘은 친구는 기록만 남기며 다음 달에는 다시 준다", () => // 월 한도
    { // 검증 시작
        const state = withCode(); // 내 코드가 있는 상태
        const ids = Array.from({ length: INVITE_MONTHLY_LIMIT + 2 }, (_item, index) => `f${index + 1}`); // 12명
        const october = confirm(state, ids); // 10월에 12명
        expect(october.wallet.balance).toBe(state.wallet.balance + INVITE_MONTHLY_LIMIT * 30); // 10명분
        expect(october.referral.friends).toHaveLength(12); // 12명 기록
        expect(october.referral.friends.filter((friend) => friend.rewardedAt === null).map((friend) => friend.id)).toEqual(["f12", "f11"]); // 넘은 2명은 보상 없음
        expect(getInviteSummary(october.referral, new Date(now))).toEqual({ friendCount: 12, rewardedThisMonth: 10, monthlyLimit: 10, remaining: 0 }); // 이번 달 한도 끝
        const november = confirm(october, ["g1"], "2026-11-01T09:00:00+09:00"); // 11월 친구
        expect(november.wallet.balance).toBe(october.wallet.balance + 30); // 다시 지급
        expect(getInviteSummary(november.referral, new Date("2026-11-01T09:00:00+09:00"))).toMatchObject({ friendCount: 13, rewardedThisMonth: 1, remaining: 9 }); // 새 달 요약
    }); // 검증 종료
}); // 묶음 종료
