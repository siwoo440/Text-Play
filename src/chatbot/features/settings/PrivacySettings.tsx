"use client"; // 클라이언트 컴포넌트

import { DataManagement } from "@chatbot/features/settings/DataManagement"; // 데이터 관리
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일

export function PrivacySettings() // 개인정보 및 보안 화면
{ // 함수 시작
    return ( // 화면 반환
        <> {/* 개인정보 화면 */}
            <SettingsPageHeader kicker="SUPPORT · PRIVACY" title="개인정보 및 보안" description="내 데이터가 어디에 저장되는지 확인하고, 내보내기·백업·복구·초기화로 직접 관리합니다." /> {/* 페이지 머리말 */}
            <section className={styles.card} aria-labelledby="privacy-storage-title"> {/* 저장 위치 */}
                <h2 id="privacy-storage-title">저장 위치와 전송</h2> {/* 저장 제목 */}
                <dl className={styles.infoGrid}> {/* 저장 정보 */}
                    <div><dt>저장 위치</dt><dd>이 브라우저의 로컬 저장공간(localStorage)</dd></div> {/* 저장 위치 */}
                    <div><dt>외부 전송</dt><dd>없음 · 로컬 Mock 모드</dd></div> {/* 외부 전송 */}
                    <div><dt>계정</dt><dd>로그인 연동 전 · 로컬 프로필만 사용</dd></div> {/* 계정 상태 */}
                </dl> {/* 저장 정보 종료 */}
                <p>브라우저 데이터를 지우면 캐릭터와 대화도 함께 지워집니다. 중요한 변경 전에는 아래에서 JSON으로 내보내거나 로컬 백업을 만들어 두세요.</p> {/* 주의 안내 */}
            </section> {/* 저장 위치 종료 */}
            <div id="data"> {/* 데이터 관리 앵커 */}
                <DataManagement /> {/* 데이터 관리 */}
            </div> {/* 데이터 관리 앵커 종료 */}
            <section className={styles.card} aria-labelledby="privacy-policy-title"> {/* 정책 문서 */}
                <h2 id="privacy-policy-title">정책 문서</h2> {/* 정책 제목 */}
                <p className={styles.note}>개인정보처리방침과 이용약관은 서비스 운영 정책이 확정된 뒤 이곳에 게시됩니다.</p> {/* 준비 안내 */}
            </section> {/* 정책 문서 종료 */}
        </> // 개인정보 화면 종료
    ); // 반환 종료
} // 함수 종료
