import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import type { AppSettings, TokenWallet, UserProfile } from "@chatbot/features/core/types"; // 사용자 타입
import { isAdultVerified } from "@chatbot/features/adult/adult-access"; // 성인 인증 판정
import { settingsNavigation } from "@chatbot/features/settings/settings-navigation"; // 공통 메뉴 정의
import { getDailyUsage } from "@chatbot/lib/story/token-policy"; // 오늘 사용량

interface UserPanelProps // 패널 속성
{ // 구조 시작
    profile: UserProfile; // 사용자 프로필
    wallet: TokenWallet; // 토큰 지갑
    settings: AppSettings; // 앱 설정
    open: boolean; // 열림 상태
    onNavigate(): void; // 내부 이동 처리
} // 구조 종료

export function UserPanel({ profile, wallet, settings, open, onNavigate }: UserPanelProps) // 사용자 패널
{ // 함수 시작
    const adultVerified = isAdultVerified(profile, new Date()); // 성인 인증 상태
    return ( // 패널 반환
        <aside id="user-panel" className="user-panel" role="complementary" aria-label="사용자 정보와 설정" aria-hidden={!open}> {/* 사용자 패널 */}
            <section className="user-panel-profile" aria-label="프로필 요약"> {/* 프로필 영역 */}
                <div className="profile-avatar" aria-hidden="true" /> {/* 빈 초상화 */}
                <div className="user-panel-profile-copy"> {/* 프로필 문구 */}
                    <span className="user-panel-eyebrow">MY PROFILE</span> {/* 프로필 표제 */}
                    <h2>{profile.nickname}</h2> {/* 사용자 이름 */}
                    <div className="user-panel-badges"> {/* 프로필 배지 묶음 */}
                        <span className="user-panel-membership">{profile.membership.toUpperCase()} 멤버십</span> {/* 멤버십 배지 */}
                        <Link href={"/settings/profile#adult" as Route} className="user-panel-membership user-panel-adult" data-state={adultVerified ? "on" : "off"} aria-label={`성인 인증 ${adultVerified ? "ON" : "OFF"}, 성인 인증 관리 열기`} onClick={onNavigate}>성인 인증 {adultVerified ? "ON" : "OFF"}</Link> {/* 성인 인증 배지 */}
                    </div> {/* 배지 묶음 종료 */}
                </div> {/* 프로필 문구 종료 */}
            </section> {/* 프로필 영역 종료 */}
            <section className="user-panel-wallet" aria-label="토큰 정보"> {/* 토큰 영역 */}
                <div className="user-panel-wallet-primary"> {/* 토큰 잔액 */}
                    <span className="user-panel-wallet-label">보유 토큰</span> {/* 잔액 표제 */}
                    <strong>{wallet.balance.toLocaleString()}</strong> {/* 잔액 값 */}
                </div> {/* 토큰 잔액 종료 */}
                <div className="user-panel-wallet-secondary"> {/* 이미지 사용량 */}
                    <span className="user-panel-wallet-label">오늘 이미지</span> {/* 이미지 표제 */}
                    <strong>{getDailyUsage(wallet, new Date()).image}회</strong> {/* 이미지 값(날짜가 바뀌면 0) */}
                </div> {/* 이미지 사용량 종료 */}
            </section> {/* 토큰 영역 종료 */}
            <nav className="user-panel-menu" aria-label="사용자 메뉴"> {/* 사용자 메뉴 */}
                {settingsNavigation.map((group) => ( // 메뉴 묶음 순회
                    <section key={group.id} className="user-panel-group" aria-labelledby={`user-${group.id}-title`}> {/* 메뉴 묶음 */}
                        <h3 id={`user-${group.id}-title`} className="user-panel-group-title">{group.label}</h3> {/* 묶음 표제 */}
                        <div className="user-panel-link-list"> {/* 링크 목록 */}
                            {group.items.map((item) => <Link key={item.href} href={item.href as Route} onClick={onNavigate}><span>{item.label}</span>{item.href === "/settings/display" ? <span>{settings.layoutId ?? "자동"}</span> : <span aria-hidden="true">›</span>}</Link>)} {/* 메뉴 링크 */}
                        </div> {/* 링크 목록 종료 */}
                    </section> // 메뉴 묶음 종료
                ))} {/* 묶음 순회 종료 */}
            </nav> {/* 메뉴 종료 */}
            <button className="user-panel-logout" type="button" onClick={() => window.confirm("로컬 세션에서 로그아웃하시겠습니까?")}>로그아웃</button> {/* 로그아웃 버튼 */}
        </aside> // 패널 종료
    ); // 반환 종료
} // 함수 종료
