// 친구 초대 규칙: 초대 코드·링크, 초대받은 사람 환영 보너스, 초대한 사람 보상(친구 확인은 로그인·서버가 생기면 연결).
import type { AppState, InvitedFriend, ReferralState } from "@chatbot/features/core/types"; // 상태 타입
import { grantTokens } from "@chatbot/features/rewards/reward-model"; // 토큰 지급
import { getDateKey } from "@chatbot/lib/time/date-key"; // 한국 시간 날짜 키
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export const INVITE_CODE_LENGTH = 8; // 초대 코드 길이
export const INVITE_WELCOME_REWARD = 30; // 초대받은 사람 환영 보너스
export const INVITE_FRIEND_REWARD = 30; // 초대한 사람이 친구 한 명마다 받는 보상
export const INVITE_MONTHLY_LIMIT = 10; // 한 달에 보상받을 수 있는 친구 수
export const INVITE_QUALIFY_MESSAGES = 5; // 친구가 보내야 하는 메시지 수(가짜 초대 방지)
export const INVITE_FRIEND_LIMIT = 200; // 보관할 친구 기록 수

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 글자(I·O·0·1)를 뺀 32자
const codePattern = new RegExp(`^[${alphabet}]{${INVITE_CODE_LENGTH}}$`); // 코드 형식

export type InviteRedeemCheck = "ok" | "invalid" | "own" | "used"; // 초대 코드 입력 판정

export interface InviteConfirmation // 조건을 채운 친구(서버가 알려 줄 값)
{ // 구조 시작
    id: string; // 친구 식별자
    nickname: string; // 표시 이름
    qualifiedAt: string; // 조건을 채운 시각
} // 구조 종료

export interface InviteSummary // 초대 요약
{ // 구조 시작
    friendCount: number; // 초대한 친구 수
    rewardedThisMonth: number; // 이번 달 보상받은 친구 수
    monthlyLimit: number; // 한 달 한도
    remaining: number; // 이번 달 남은 수
} // 구조 종료

function secureRandom(): number // 0 이상 1 미만 난수(가능하면 암호용 난수)
{ // 함수 시작
    if (typeof globalThis.crypto?.getRandomValues !== "function") // 암호용 난수 없음
    { // 조건 시작
        return Math.random(); // 일반 난수
    } // 조건 종료
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32; // 암호용 난수
} // 함수 종료

export function generateInviteCode(random: () => number = secureRandom): string // 초대 코드 만들기
{ // 함수 시작
    return Array.from({ length: INVITE_CODE_LENGTH }, () => alphabet[Math.min(alphabet.length - 1, Math.floor(random() * alphabet.length))]).join(""); // 여덟 글자
} // 함수 종료

export function normalizeInviteCode(value: string): string // 입력한 코드 다듬기(공백·줄표 제거, 대문자)
{ // 함수 시작
    return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); // 글자와 숫자만
} // 함수 종료

export function isInviteCode(value: string): boolean // 초대 코드 형식 판정
{ // 함수 시작
    return codePattern.test(value); // 형식 반환
} // 함수 종료

export function formatInviteCode(code: string): string // 보기 좋게 네 글자씩
{ // 함수 시작
    return `${code.slice(0, 4)}-${code.slice(4)}`; // 줄표로 나눔
} // 함수 종료

export function buildInviteLink(origin: string, code: string): string // 초대 링크
{ // 함수 시작
    return `${origin}/invite/${code}`; // 링크 반환
} // 함수 종료

export function checkInviteRedeem(referral: ReferralState, input: string): InviteRedeemCheck // 초대 코드를 넣을 수 있는지 판정
{ // 함수 시작
    const code = normalizeInviteCode(input); // 다듬은 코드
    if (!isInviteCode(code)) // 형식 오류
    { // 조건 시작
        return "invalid"; // 잘못된 코드
    } // 조건 종료
    if (referral.code === code) // 내 코드(보너스를 이미 받았어도 내 초대 링크로 알아봄)
    { // 조건 시작
        return "own"; // 내 코드는 불가
    } // 조건 종료
    return referral.redeemedCode !== null ? "used" : "ok"; // 환영 보너스는 한 번만
} // 함수 종료

export function createInviteCode(state: AppState, code: string, now: string): AppState // 내 초대 코드 만들기(한 번만)
{ // 함수 시작
    if (state.referral.code !== null || !isInviteCode(code) || state.referral.redeemedCode === code) // 이미 있음·형식 오류·받은 코드와 같음
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    return { ...state, referral: { ...state.referral, code, createdAt: now } }; // 코드 저장
} // 함수 종료

export function redeemInviteCode(state: AppState, input: string, now: string): AppState // 친구의 초대 코드로 환영 보너스 받기
{ // 함수 시작
    if (checkInviteRedeem(state.referral, input) !== "ok") // 받을 수 없음
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    const redeemed: AppState = { ...state, referral: { ...state.referral, redeemedCode: normalizeInviteCode(input), redeemedAt: now, qualifyingMessages: 0 } }; // 받은 코드 기록
    return grantTokens(redeemed, { id: "invite-welcome", source: "invite-welcome", label: t("친구 초대 환영 보너스"), amount: INVITE_WELCOME_REWARD, now }); // 보너스 지급
} // 함수 종료

export function recordInviteeMessages(referral: ReferralState, amount: number): ReferralState // 초대받은 뒤 보낸 메시지 세기(초대해 준 친구의 보상 조건)
{ // 함수 시작
    if (referral.redeemedCode === null || amount <= 0 || referral.qualifyingMessages >= INVITE_QUALIFY_MESSAGES) // 초대받지 않음·변화 없음·이미 채움
    { // 조건 시작
        return referral; // 그대로
    } // 조건 종료
    return { ...referral, qualifyingMessages: Math.min(INVITE_QUALIFY_MESSAGES, referral.qualifyingMessages + Math.floor(amount)) }; // 다섯 번까지만
} // 함수 종료

function countRewardedInMonth(friends: InvitedFriend[], monthKey: string): number // 그 달에 보상받은 친구 수
{ // 함수 시작
    return friends.filter((friend) => friend.rewardedAt !== null && getDateKey(new Date(friend.rewardedAt)).startsWith(monthKey)).length; // 개수 반환
} // 함수 종료

export function getInviteSummary(referral: ReferralState, now: Date): InviteSummary // 초대 요약 계산
{ // 함수 시작
    const rewardedThisMonth = countRewardedInMonth(referral.friends, getDateKey(now).slice(0, 7)); // 이번 달 보상
    return { friendCount: referral.friends.length, rewardedThisMonth, monthlyLimit: INVITE_MONTHLY_LIMIT, remaining: Math.max(0, INVITE_MONTHLY_LIMIT - rewardedThisMonth) }; // 요약 반환
} // 함수 종료

export function applyInviteConfirmations(state: AppState, confirmations: InviteConfirmation[], now: string): AppState // 조건을 채운 친구 반영(친구마다 한 번, 한 달 한도)
{ // 함수 시작
    if (state.referral.code === null) // 내 초대 코드 없음
    { // 조건 시작
        return state; // 변화 없음
    } // 조건 종료
    const monthKey = getDateKey(new Date(now)).slice(0, 7); // 이번 달
    let next = state; // 누적 상태
    for (const confirmation of confirmations) // 친구 순회
    { // 순회 시작
        if (confirmation.id.length === 0 || next.referral.friends.some((friend) => friend.id === confirmation.id)) // 빈 식별자·이미 반영
        { // 조건 시작
            continue; // 다음 친구
        } // 조건 종료
        const rewarded = countRewardedInMonth(next.referral.friends, monthKey) < INVITE_MONTHLY_LIMIT; // 이번 달 한도 안
        const friend: InvitedFriend = { id: confirmation.id, nickname: confirmation.nickname.trim().slice(0, 20) || t("친구"), qualifiedAt: confirmation.qualifiedAt, rewardedAt: rewarded ? now : null }; // 친구 기록
        next = { ...next, referral: { ...next.referral, friends: [friend, ...next.referral.friends].slice(0, INVITE_FRIEND_LIMIT) } }; // 최근 순 기록
        if (rewarded) // 보상 지급
        { // 조건 시작
            next = grantTokens(next, { id: `invite-friend-${friend.id}`, source: "invite-friend", label: t("친구 초대: {0}", [friend.nickname]), amount: INVITE_FRIEND_REWARD, now }); // 30토큰
        } // 조건 종료
    } // 순회 종료
    return next; // 반영 상태
} // 함수 종료
