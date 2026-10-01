"use client"; // 클라이언트 컴포넌트

import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import { getDailyUsage, tokenActionLabels, tokenCosts, type TokenAction } from "@chatbot/lib/story/token-policy"; // 토큰 비용표
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일

const costOrder: TokenAction[] = ["chat", "advanced-chat", "auto-image", "manual-image", "regenerate-image", "studio-image"]; // 비용 표시 순서

function formatDateTime(value: string): string // 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 시각 반환
} // 함수 종료

export function TokenSettings() // 토큰 이용 내역 화면
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    const wallet = state.wallet; // 토큰 지갑
    const daily = getDailyUsage(wallet, new Date()); // 오늘 사용량(날짜가 바뀌면 0)
    return ( // 화면 반환
        <> {/* 토큰 화면 */}
            <SettingsPageHeader kicker="ACCOUNT · TOKENS" title="토큰 이용 내역" description="대화와 장면 이미지에 쓰이는 토큰의 잔액과 항목별 비용을 확인합니다." /> {/* 페이지 머리말 */}
            <section className={styles.statGrid} aria-label="토큰 요약"> {/* 토큰 요약 */}
                <div className={styles.stat}><span>보유 토큰</span><strong>{wallet.balance.toLocaleString()}</strong><small>마지막 변경 {formatDateTime(wallet.updatedAt)}</small></div> {/* 잔액 */}
                <div className={styles.stat}><span>오늘 사용</span><strong>{daily.chat.toLocaleString()}</strong><small>대화 토큰 · 이미지 {daily.image}회</small></div> {/* 오늘 사용량 */}
                <div className={styles.stat}><span>누적 사용</span><strong>{wallet.totalUsed.toLocaleString()}</strong><small>지금까지 사용한 토큰</small></div> {/* 누적 사용량 */}
            </section> {/* 토큰 요약 종료 */}
            <section className={styles.card} aria-labelledby="token-cost-title"> {/* 비용표 */}
                <h2 id="token-cost-title">항목별 비용</h2> {/* 비용표 제목 */}
                {/* 비용 표: 표 안 공백 텍스트는 하이드레이션 오류를 만들어 줄 끝 주석을 두지 않음 */}
                <table className={styles.table}><thead><tr><th scope="col">항목</th><th scope="col">비용</th></tr></thead><tbody>{costOrder.map((action) => <tr key={action}><td><strong>{tokenActionLabels[action].label}</strong><small>{tokenActionLabels[action].description}</small></td><td><span className={styles.cost}>{tokenCosts[action]} 토큰</span></td></tr>)}</tbody></table>
                <p>응답을 중간에 멈춰도 요청 1회로 계산되고, 재시도와 다시 생성은 각각 새 요청으로 계산됩니다.</p> {/* 계산 규칙 */}
            </section> {/* 비용표 종료 */}
            <section className={styles.card} aria-labelledby="token-history-title"> {/* 사용 내역 */}
                <h2 id="token-history-title">사용 내역</h2> {/* 사용 내역 제목 */}
                <p className={styles.note}>오늘 사용량은 한국 시간 기준으로 날짜가 바뀌면 0부터 다시 셉니다. 토큰을 어디에 썼는지 남기는 사용 내역은 준비 중이라, 지금은 잔액과 합계만 확인할 수 있습니다.</p> {/* 준비 안내 */}
            </section> {/* 사용 내역 종료 */}
            <section className={styles.card} aria-labelledby="token-charge-title"> {/* 충전 */}
                <h2 id="token-charge-title">토큰 충전</h2> {/* 충전 제목 */}
                <p>실제 결제가 연결되기 전이라 토큰을 충전할 수 없습니다.</p> {/* 충전 안내 */}
                <button type="button" className={styles.primary} disabled>충전 준비 중</button> {/* 충전 버튼 */}
            </section> {/* 충전 종료 */}
        </> // 토큰 화면 종료
    ); // 반환 종료
} // 함수 종료
