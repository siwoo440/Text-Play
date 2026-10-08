"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { chatTiers, USER_NOTE_EXTENDED_COST, USER_NOTE_LIMIT } from "@chatbot/features/chat/chat-tiers"; // 채팅 등급 비용
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import { TokenHistory } from "@chatbot/features/settings/TokenHistory"; // 이용 기록
import { getDailyUsage, tokenActionLabels, tokenCosts, type TokenAction } from "@chatbot/lib/story/token-policy"; // 토큰 비용표
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

const costOrder: TokenAction[] = ["manual-image", "studio-image"]; // 이미지 비용 표시 순서(대화는 채팅 등급 비용을 보여 줌. 쓰이지 않는 「고급 대화」·「이미지 다시 생성」은 표에서 뺌)

function formatDateTime(value: string): string // 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 시각 반환
} // 함수 종료

export function TokenSettings() // 토큰 이용 내역 화면
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    const wallet = state.wallet; // 토큰 지갑
    const daily = getDailyUsage(wallet, new Date()); // 오늘 사용량(날짜가 바뀌면 0)
    return ( // 화면 반환
        <> {/* 토큰 화면 */}
            <SettingsPageHeader kicker="ACCOUNT · TOKENS" title={t("토큰 이용 내역")} description={t("토큰 잔액과 항목별 비용, 어디에 얼마를 받고 썼는지 확인합니다.")} /> {/* 페이지 머리말 */}
            <section className={styles.statGrid} aria-label={t("토큰 요약")}> {/* 토큰 요약 */}
                <div className={styles.stat}><span>{t("보유 토큰")}</span><strong>{wallet.balance.toLocaleString()}</strong><small>{t("마지막 변경")} {formatDateTime(wallet.updatedAt)}</small></div> {/* 잔액 */}
                <div className={styles.stat}><span>{t("오늘 사용")}</span><strong>{daily.chat.toLocaleString()}</strong><small>{t("대화 토큰 · 이미지")} {daily.image}{t("회")}</small></div> {/* 오늘 사용량 */}
                <div className={styles.stat}><span>{t("누적 사용")}</span><strong>{wallet.totalUsed.toLocaleString()}</strong><small>{t("지금까지 사용한 토큰")}</small></div> {/* 누적 사용량 */}
            </section> {/* 토큰 요약 종료 */}
            <section className={styles.card} aria-labelledby="token-cost-title"> {/* 비용표 */}
                <h2 id="token-cost-title">{t("항목별 비용")}</h2> {/* 비용표 제목 */}
                {/* 비용 표: 표 안 공백 텍스트는 하이드레이션 오류를 만들어 줄 끝 주석을 두지 않음 */}
                <table className={styles.table} aria-label={t("항목별 비용")}><thead><tr><th scope="col">{t("항목")}</th><th scope="col">{t("비용")}</th></tr></thead><tbody>{chatTiers.map((tier) => <tr key={tier.id}><td><strong>{t(tier.label)}</strong><small>{t("메시지 보내기, 다시 생성, 메시지 수정 후 응답")} {t("· 기본 길이 기준")}</small></td><td><span className={styles.cost}>{tier.baseCost} {t("토큰")}</span></td></tr>)}{costOrder.map((action) => <tr key={action}><td><strong>{t(tokenActionLabels[action].label)}</strong><small>{t(tokenActionLabels[action].description)}</small></td><td><span className={styles.cost}>{tokenCosts[action]} {t("토큰")}</span></td></tr>)}</tbody></table>
                <p>{t("답변 길이를 늘리면 등급마다 정해진 만큼 더 들고, 유저 노트를 {0}자 넘게 적으면 메시지당 {1}토큰이 더 들어요. 지금 대화의 비용은 입력창 옆 등급 버튼에서 볼 수 있어요.", [USER_NOTE_LIMIT, USER_NOTE_EXTENDED_COST])}</p> {/* 추가 비용 안내 */}
                <p>{t("응답을 중간에 멈춰도 요청 1회로 계산되고, 재시도와 다시 생성은 각각 새 요청으로 계산됩니다.")}</p> {/* 계산 규칙 */}
            </section> {/* 비용표 종료 */}
            <TokenHistory records={state.tokenRecords} /> {/* 최근 7일 그래프와 이용 기록 */}
            <section className={styles.card} aria-labelledby="token-reward-title"> {/* 받은 토큰 */}
                <h2 id="token-reward-title">{t("토큰 받기")}</h2> {/* 제목 */}
                <p>{t("출석과 미션, 친구 초대로 지금까지")} {state.rewards.totalEarned.toLocaleString()}{t("토큰을 받았어요.")} <Link href={"/rewards" as Route}>{t("출석과 미션 열기")}</Link></p> {/* 받은 토큰 안내 */}
            </section> {/* 받은 토큰 종료 */}
            <section className={styles.card} aria-labelledby="token-charge-title"> {/* 충전 */}
                <h2 id="token-charge-title">{t("토큰 충전")}</h2> {/* 충전 제목 */}
                <p>{t("실제 결제가 연결되기 전이라 토큰을 충전할 수 없습니다.")}</p> {/* 충전 안내 */}
                <button type="button" className={styles.primary} disabled>{t("충전 준비 중")}</button> {/* 충전 버튼 */}
            </section> {/* 충전 종료 */}
        </> // 토큰 화면 종료
    ); // 반환 종료
} // 함수 종료
