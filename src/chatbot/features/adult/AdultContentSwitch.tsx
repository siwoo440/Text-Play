"use client"; // 클라이언트 컴포넌트

import { useAdultAccess } from "@chatbot/features/adult/useAdultAccess"; // 성인 콘텐츠 접근
import styles from "@chatbot/features/adult/AdultAccess.module.css"; // 성인 인증 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function AdultContentSwitch() // 헤더 19+ 스위치
{ // 함수 시작
    const access = useAdultAccess(); // 접근 도구
    const hint = access.enabled ? t("19세 이용가 콘텐츠를 표시하는 중입니다.") : access.verified ? t("19세 이용가 콘텐츠가 숨겨져 있습니다.") : t("성인 인증 후 19세 이용가 콘텐츠를 켤 수 있습니다."); // 상태 설명
    return ( // 스위치 반환
        <div className={styles.switchArea}> {/* 스위치 영역 */}
            <button type="button" role="switch" className={styles.switch} data-state={access.enabled ? "on" : "off"} aria-checked={access.enabled} aria-label={t("19+ 콘텐츠 보기")} title={hint} onClick={access.enabled ? access.disable : access.enable}> {/* 19+ 스위치 */}
                <span className={styles.switchLabel} aria-hidden="true">19+</span> {/* 스위치 이름 */}
                <span className={styles.switchTrack} aria-hidden="true"><span className={styles.switchThumb} /></span> {/* 스위치 막대 */}
            </button> {/* 스위치 종료 */}
            {access.dialog} {/* 성인 인증 창 */}
        </div> // 영역 종료
    ); // 반환 종료
} // 함수 종료
