"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 안내 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { checkInviteRedeem, formatInviteCode, INVITE_FRIEND_REWARD, INVITE_QUALIFY_MESSAGES, INVITE_WELCOME_REWARD, normalizeInviteCode } from "@chatbot/features/rewards/referral-model"; // 친구 초대 규칙
import { t, tc } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function InviteLanding({ code: rawCode }: { code: string }) // 초대 링크로 들어온 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const code = normalizeInviteCode(rawCode); // 다듬은 코드
    const check = checkInviteRedeem(state.referral, code); // 받을 수 있는지
    if (check === "invalid") // 잘못된 링크
    { // 조건 시작
        return ( // 안내 반환
            <StatusScreen tone="not-found" label="INVITATION" title={t("초대 링크를 확인해 주세요")} description={t("초대 코드가 올바르지 않아요. 친구에게 링크를 다시 받아 주세요.")}> {/* 잘못된 링크 */}
                <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 */}
                <Link href={"/rewards#invite" as Route}>{t("초대 코드 직접 넣기")}</Link> {/* 직접 입력 */}
            </StatusScreen> // 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (check === "own") // 내 초대 링크
    { // 조건 시작
        return ( // 안내 반환
            <StatusScreen tone="invite" label="MY INVITATION" title={t("내 초대 링크예요")} description={t("이 링크를 친구에게 보내 주세요. 친구가 들어오면 {0}토큰을 받고, 메시지를 {1}번 보내면 나도 {2}토큰을 받아요.", [INVITE_WELCOME_REWARD, INVITE_QUALIFY_MESSAGES, INVITE_FRIEND_REWARD])}> {/* 내 링크 */}
                <Link href={"/rewards#invite" as Route}>{t("친구 초대 열기")}</Link> {/* 친구 초대 */}
                <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 */}
            </StatusScreen> // 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (check === "used") // 이미 받음
    { // 조건 시작
        const same = state.referral.redeemedCode === code; // 이 링크로 받은 경우
        return ( // 안내 반환
            <StatusScreen tone="invite" label="WELCOME BONUS" title={same ? t("초대 보너스를 받았어요") : t("이미 초대 보너스를 받았어요")} description={same ? t("{0}토큰이 들어와 지금 {1}토큰이 있어요. 메시지를 {2}번 보내면 초대해 준 친구도 보상을 받아요.", [INVITE_WELCOME_REWARD, state.wallet.balance.toLocaleString(), INVITE_QUALIFY_MESSAGES]) : t("초대 보너스는 한 번만 받을 수 있어요. 대신 내 초대 링크를 만들어 친구를 초대해 보세요.")}> {/* 받은 뒤 */}
                <Link href="/">{t("대화 시작하기")}</Link> {/* 메인 */}
                <Link href={"/rewards" as Route}>{t("출석과 미션 보기")}</Link> {/* 보상 페이지 */}
            </StatusScreen> // 안내 종료
        ); // 반환 종료
    } // 조건 종료
    return ( // 초대 화면 반환
        <StatusScreen tone="invite" label="INVITATION" title={t("친구가 Mate Verse에 초대했어요")} description={t("초대 코드 {0} · 지금 받으면 {1}토큰으로 캐릭터와 이야기를 시작할 수 있어요.", [formatInviteCode(code), INVITE_WELCOME_REWARD])}> {/* 초대 */}
            <button type="button" onClick={() => dispatch({ type: "redeem-invite-code", code, now: new Date().toISOString() })}>{t("초대 받고")} {INVITE_WELCOME_REWARD}{tc("amount", "토큰 받기")}</button> {/* 받기 */}
            <Link href="/">{t("먼저 둘러볼게요")}</Link> {/* 메인 */}
        </StatusScreen> // 초대 종료
    ); // 반환 종료
} // 함수 종료
