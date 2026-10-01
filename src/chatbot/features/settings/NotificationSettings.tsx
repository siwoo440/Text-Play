"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import { validateNotificationSettings, type NotificationSettingsErrors } from "@chatbot/features/settings/settings-validation"; // 알림 검증
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일

export function NotificationSettings() // 알림과 선제 메시지 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [draft, setDraft] = useState({ startTime: state.settings.notificationStartTime, endTime: state.settings.notificationEndTime, dailyLimit: state.settings.dailyNotificationLimit }); // 알림 초안
    const [errors, setErrors] = useState<NotificationSettingsErrors>({}); // 입력 오류
    const [status, setStatus] = useState(""); // 저장 상태
    const save = () => // 알림 저장 함수
    { // 함수 시작
        const nextErrors = validateNotificationSettings(draft); // 입력 검증
        setErrors(nextErrors); // 오류 반영
        if (Object.keys(nextErrors).length > 0) // 오류 존재 확인
        { // 조건 시작
            setStatus(""); // 성공 상태 해제
            return; // 저장 중단
        } // 조건 종료
        dispatch({ type: "update-settings", settings: { notificationStartTime: draft.startTime, notificationEndTime: draft.endTime, dailyNotificationLimit: draft.dailyLimit } }); // 알림 변경
        setStatus("저장했습니다."); // 성공 상태 반영
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 알림 화면 */}
            <SettingsPageHeader kicker="PREFERENCES · NOTIFICATIONS" title="알림과 선제 메시지" description="캐릭터가 먼저 말을 거는 선제 메시지를 허용할지, 언제·몇 번까지 받을지 정합니다." /> {/* 페이지 머리말 */}
            <section className={styles.section} aria-labelledby="proactive-title"> {/* 선제 메시지 영역 */}
                <h2 id="proactive-title">선제 메시지</h2> {/* 영역 제목 */}
                <label className={styles.check}><input type="checkbox" checked={state.settings.proactiveMessageEnabled} onChange={(event) => dispatch({ type: "update-settings", settings: { proactiveMessageEnabled: event.target.checked } })} />선제 메시지 허용</label> {/* 허용 선택 */}
                <p className={styles.note}>지금은 로컬 Mock 모드라 실제로 메시지를 보내지 않고 설정만 저장합니다. 브라우저 알림은 발송 서버가 연결된 뒤 제공됩니다.</p> {/* 현재 제약 */}
            </section> {/* 선제 메시지 영역 종료 */}
            <section className={styles.section} aria-labelledby="notification-time-title"> {/* 허용 시간 영역 */}
                <h2 id="notification-time-title">허용 시간과 횟수</h2> {/* 영역 제목 */}
                <label>시작 시각<input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label> {/* 시작 시각 */}
                {errors.startTime === undefined ? null : <p className={styles.error}>{errors.startTime}</p>} {/* 시작 오류 */}
                <label>종료 시각<input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></label> {/* 종료 시각 */}
                {errors.endTime === undefined ? null : <p className={styles.error}>{errors.endTime}</p>} {/* 종료 오류 */}
                <label>일일 알림 횟수<input type="number" min="0" max="10" value={draft.dailyLimit} onChange={(event) => setDraft({ ...draft, dailyLimit: Number(event.target.value) })} /></label> {/* 하루 횟수 */}
                {errors.dailyLimit === undefined ? null : <p className={styles.error}>{errors.dailyLimit}</p>} {/* 횟수 오류 */}
                <button type="button" className={styles.primary} onClick={save}>알림 저장</button> {/* 저장 버튼 */}
                {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 저장 안내 */}
            </section> {/* 허용 시간 영역 종료 */}
        </> // 알림 화면 종료
    ); // 반환 종료
} // 함수 종료
