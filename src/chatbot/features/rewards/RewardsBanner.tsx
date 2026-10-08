"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { ATTENDANCE_CYCLE, getAttendanceView, getBonusView, getClaimableTokens } from "@chatbot/features/rewards/reward-model"; // 출석·미션 규칙
import styles from "@chatbot/features/rewards/RewardsScreen.module.css"; // 보상 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function RewardsBanner() // 메인 화면의 출석·미션 카드
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const today = new Date(); // 지금
    const attendance = getAttendanceView(state.rewards.attendance, today); // 출석 상태
    const bonus = getBonusView(state.rewards.missions, today); // 미션 상태
    const waiting = getClaimableTokens(state.rewards, today); // 지금 받을 수 있는 토큰
    return ( // 카드 반환
        <Link href={"/rewards" as Route} className={styles.banner} data-ready={waiting > 0 ? "true" : undefined}> {/* 보상 페이지 링크 */}
            <span className={styles.bannerIcon} aria-hidden="true">🎁</span> {/* 선물 */}
            <span className={styles.bannerCopy}> {/* 글 */}
                <strong>{attendance.canCheck ? t("오늘의 출석 도장을 찍어 보세요") : t("오늘 출석 완료")}</strong> {/* 제목 */}
                <small>{t("출석")} {attendance.stamped}/{ATTENDANCE_CYCLE} {t("· 미션")} {bonus.done}/{bonus.total}{waiting > 0 ? t(" · 지금 {0}토큰을 받을 수 있어요", [waiting]) : ""}</small> {/* 진행 */}
            </span> {/* 글 종료 */}
            <span className={styles.bannerAction}>{waiting > 0 ? t("보상 받기") : t("출석과 미션")} ›</span> {/* 동작 */}
        </Link> // 링크 종료
    ); // 반환 종료
} // 함수 종료
