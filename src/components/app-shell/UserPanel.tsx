import type { AppSettings, TokenWallet, UserProfile } from "@/features/core/types"; // 사용자 타입

interface UserPanelProps // 패널 속성
{ // 구조 시작
    profile: UserProfile; // 사용자 프로필
    wallet: TokenWallet; // 토큰 지갑
    settings: AppSettings; // 앱 설정
    open: boolean; // 열림 상태
} // 구조 종료

export function UserPanel({ profile, wallet, settings, open }: UserPanelProps) // 사용자 패널
{ // 함수 시작
    return ( // 패널 반환
        <aside id="user-panel" className="user-panel" role="complementary" aria-label="사용자 정보와 설정" aria-hidden={!open}> {/* 사용자 패널 */}
            <section className="user-panel-profile" aria-label="프로필 요약"> {/* 프로필 영역 */}
                <div className="profile-avatar" aria-hidden="true" /> {/* 빈 초상화 */}
                <div className="user-panel-profile-copy"> {/* 프로필 문구 */}
                    <span className="user-panel-eyebrow">MY PROFILE</span> {/* 프로필 표제 */}
                    <h2>{profile.nickname}</h2> {/* 사용자 이름 */}
                    <span className="user-panel-membership">{profile.membership.toUpperCase()} 멤버십</span> {/* 멤버십 배지 */}
                </div> {/* 프로필 문구 종료 */}
            </section> {/* 프로필 영역 종료 */}
            <section className="user-panel-wallet" aria-label="토큰 정보"> {/* 토큰 영역 */}
                <div className="user-panel-wallet-primary"> {/* 토큰 잔액 */}
                    <span className="user-panel-wallet-label">보유 토큰</span> {/* 잔액 표제 */}
                    <strong>{wallet.balance.toLocaleString()}</strong> {/* 잔액 값 */}
                </div> {/* 토큰 잔액 종료 */}
                <div className="user-panel-wallet-secondary"> {/* 이미지 사용량 */}
                    <span className="user-panel-wallet-label">오늘 이미지</span> {/* 이미지 표제 */}
                    <strong>{wallet.dailyImageUsed}회</strong> {/* 이미지 값 */}
                </div> {/* 이미지 사용량 종료 */}
            </section> {/* 토큰 영역 종료 */}
            <nav className="user-panel-menu" aria-label="사용자 메뉴"> {/* 사용자 메뉴 */}
                <section className="user-panel-group" aria-labelledby="user-account-title"> {/* 계정 영역 */}
                    <h3 id="user-account-title" className="user-panel-group-title">계정</h3> {/* 계정 표제 */}
                    <div className="user-panel-link-list"> {/* 계정 링크 목록 */}
                        <a href="/settings"><span>프로필 관리</span><span aria-hidden="true">›</span></a> {/* 프로필 링크 */}
                        <a href="/library"><span>내 캐릭터와 작품</span><span aria-hidden="true">›</span></a> {/* 작품 링크 */}
                        <a href="/settings"><span>토큰 이용 내역</span><span aria-hidden="true">›</span></a> {/* 토큰 링크 */}
                    </div> {/* 계정 링크 종료 */}
                </section> {/* 계정 영역 종료 */}
                <section className="user-panel-group" aria-labelledby="user-settings-title"> {/* 설정 영역 */}
                    <h3 id="user-settings-title" className="user-panel-group-title">설정</h3> {/* 설정 표제 */}
                    <div className="user-panel-link-list"> {/* 설정 링크 목록 */}
                        <a href="/settings"><span>화면 레이아웃</span><span>{settings.layoutId ?? "자동"}</span></a> {/* 레이아웃 링크 */}
                        <a href="/settings"><span>알림과 선제 메시지</span><span aria-hidden="true">›</span></a> {/* 알림 링크 */}
                    </div> {/* 설정 링크 종료 */}
                </section> {/* 설정 영역 종료 */}
                <section className="user-panel-group" aria-labelledby="user-support-title"> {/* 지원 영역 */}
                    <h3 id="user-support-title" className="user-panel-group-title">지원</h3> {/* 지원 표제 */}
                    <div className="user-panel-link-list"> {/* 지원 링크 목록 */}
                        <a href="/settings"><span>개인정보 및 보안</span><span aria-hidden="true">›</span></a> {/* 보안 링크 */}
                        <a href="/settings"><span>고객 지원</span><span aria-hidden="true">›</span></a> {/* 지원 링크 */}
                    </div> {/* 지원 링크 종료 */}
                </section> {/* 지원 영역 종료 */}
            </nav> {/* 메뉴 종료 */}
            <button className="user-panel-logout" type="button" onClick={() => window.confirm("로컬 세션에서 로그아웃하시겠습니까?")}>로그아웃</button> {/* 로그아웃 버튼 */}
        </aside> // 패널 종료
    ); // 반환 종료
} // 함수 종료
