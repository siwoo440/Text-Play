"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태
import type { LayoutId, PlatformMode, ResolutionMode } from "@/features/core/types"; // 설정 타입
import { DataManagement } from "@/features/settings/DataManagement"; // 데이터 관리
import { validateNotificationSettings, validateProfileSettings, type NotificationSettingsErrors, type ProfileSettingsErrors } from "@/features/settings/settings-validation"; // 설정 검증
import styles from "@/features/settings/SettingsScreen.module.css"; // 설정 스타일

type SettingsTab = "profile" | "display" | "notifications" | "data" | "privacy"; // 설정 탭 종류

const tabs: Array<{ id: SettingsTab; label: string }> = // 설정 탭 목록
[ // 목록 시작
    { id: "profile", label: "프로필" }, // 프로필 탭
    { id: "display", label: "화면" }, // 화면 탭
    { id: "notifications", label: "알림" }, // 알림 탭
    { id: "data", label: "데이터 관리" }, // 데이터 탭
    { id: "privacy", label: "개인정보" }, // 개인정보 탭
]; // 목록 종료

export function SettingsScreen() // 설정 화면
{ // 함수 시작
    const { state, dispatch, storageError } = useAppStore(); // 앱 상태 조회
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile"); // 선택 탭 상태
    const [profileDraft, setProfileDraft] = useState({ nickname: state.profile.nickname, avatar: state.profile.avatar }); // 프로필 초안
    const [notificationDraft, setNotificationDraft] = useState({ startTime: state.settings.notificationStartTime, endTime: state.settings.notificationEndTime, dailyLimit: state.settings.dailyNotificationLimit }); // 알림 초안
    const [profileErrors, setProfileErrors] = useState<ProfileSettingsErrors>({}); // 프로필 오류
    const [notificationErrors, setNotificationErrors] = useState<NotificationSettingsErrors>({}); // 알림 오류
    const [status, setStatus] = useState(""); // 저장 상태
    const saveProfile = () => // 프로필 저장 함수
    { // 함수 시작
        const errors = validateProfileSettings(profileDraft); // 프로필 검증
        setProfileErrors(errors); // 오류 반영
        if (Object.keys(errors).length > 0) // 오류 존재 확인
        { // 조건 시작
            setStatus(""); // 성공 상태 해제
            return; // 저장 중단
        } // 조건 종료
        dispatch({ type: "update-profile", profile: { nickname: profileDraft.nickname.trim(), avatar: profileDraft.avatar.trim() } }); // 프로필 변경
        setStatus("저장했습니다."); // 성공 상태 반영
    }; // 함수 종료
    const saveNotifications = () => // 알림 저장 함수
    { // 함수 시작
        const errors = validateNotificationSettings(notificationDraft); // 알림 검증
        setNotificationErrors(errors); // 오류 반영
        if (Object.keys(errors).length > 0) // 오류 존재 확인
        { // 조건 시작
            setStatus(""); // 성공 상태 해제
            return; // 저장 중단
        } // 조건 종료
        dispatch({ type: "update-settings", settings: { notificationStartTime: notificationDraft.startTime, notificationEndTime: notificationDraft.endTime, dailyNotificationLimit: notificationDraft.dailyLimit } }); // 알림 변경
        setStatus("저장했습니다."); // 성공 상태 반영
    }; // 함수 종료
    return ( // 화면 반환
        <main className={styles.page}> {/* 설정 본문 */}
            <header className={styles.header}> {/* 설정 머리말 */}
                <span>LOCAL PREFERENCES</span> {/* 영문 표제 */}
                <h1>내 환경 설정</h1> {/* 화면 제목 */}
                <p>프로필과 화면, 알림, 로컬 데이터를 한곳에서 관리합니다.</p> {/* 화면 설명 */}
            </header> {/* 머리말 종료 */}
            <div className={styles.layout}> {/* 설정 배치 */}
                <nav className={styles.tabs} role="tablist" aria-label="설정 분류"> {/* 탭 목록 */}
                    {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-label={tab.label} aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)} {/* 탭 버튼 */}
                </nav> {/* 탭 종료 */}
                <section className={styles.panel} role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label}> {/* 선택 내용 */}
                    {activeTab === "profile" ? <ProfilePanel draft={profileDraft} errors={profileErrors} onChange={setProfileDraft} onSave={saveProfile} /> : null} {/* 프로필 내용 */}
                    {activeTab === "display" ? <DisplayPanel platform={state.settings.platformMode} resolution={state.settings.resolutionMode} layout={state.settings.layoutId} onPlatform={(platformMode) => dispatch({ type: "update-settings", settings: { platformMode } })} onResolution={(resolutionMode) => dispatch({ type: "update-settings", settings: { resolutionMode } })} onLayout={(layoutId) => dispatch({ type: "update-settings", settings: { layoutId } })} /> : null} {/* 화면 내용 */}
                    {activeTab === "notifications" ? <NotificationPanel draft={notificationDraft} errors={notificationErrors} enabled={state.settings.proactiveMessageEnabled} onChange={setNotificationDraft} onEnabled={(proactiveMessageEnabled) => dispatch({ type: "update-settings", settings: { proactiveMessageEnabled } })} onSave={saveNotifications} /> : null} {/* 알림 내용 */}
                    {activeTab === "data" ? <DataManagement /> : null} {/* 데이터 관리 */}
                    {activeTab === "privacy" ? <div className={styles.section}><h2>개인정보</h2><p>현재 데이터는 이 브라우저의 로컬 저장공간에만 보관됩니다.</p></div> : null} {/* 개인정보 안내 */}
                    {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 성공 상태 */}
                    {storageError === null ? null : <p className={styles.error} role="alert">{storageError}</p>} {/* 저장 오류 */}
                </section> {/* 내용 종료 */}
            </div> {/* 배치 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function ProfilePanel({ draft, errors, onChange, onSave }: { draft: { nickname: string; avatar: string }; errors: ProfileSettingsErrors; onChange(value: { nickname: string; avatar: string }): void; onSave(): void }) // 프로필 영역
{ // 함수 시작
    return <div className={styles.section}><h2>프로필</h2><label>닉네임<input value={draft.nickname} onChange={(event) => onChange({ ...draft, nickname: event.target.value })} maxLength={21} /></label>{errors.nickname === undefined ? null : <p className={styles.error}>{errors.nickname}</p>}<label>프로필 이미지<input value={draft.avatar} onChange={(event) => onChange({ ...draft, avatar: event.target.value })} maxLength={8} /></label>{errors.avatar === undefined ? null : <p className={styles.error}>{errors.avatar}</p>}<button type="button" className={styles.primary} onClick={onSave}>프로필 저장</button></div>; // 프로필 반환
} // 함수 종료

function DisplayPanel({ platform, resolution, layout, onPlatform, onResolution, onLayout }: { platform: PlatformMode; resolution: ResolutionMode; layout: LayoutId | null; onPlatform(value: PlatformMode): void; onResolution(value: ResolutionMode): void; onLayout(value: LayoutId | null): void }) // 화면 영역
{ // 함수 시작
    return <div className={styles.section}><h2>화면</h2><label>플랫폼 모드<select value={platform} onChange={(event) => onPlatform(event.target.value as PlatformMode)}><option value="auto">자동</option><option value="mobile">모바일</option><option value="tablet">태블릿</option><option value="desktop">데스크톱</option></select></label><label>해상도 모드<select value={resolution} onChange={(event) => onResolution(event.target.value as ResolutionMode)}><option value="auto">자동</option><option value="compact">간결</option><option value="comfortable">편안함</option><option value="wide">넓게</option></select></label><label>레이아웃<select value={layout ?? ""} onChange={(event) => onLayout(event.target.value === "" ? null : event.target.value as LayoutId)}><option value="">자동</option><option value="M1">M1</option><option value="M2">M2</option><option value="M3">M3</option><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option><option value="D1">D1</option><option value="D2">D2</option><option value="D3">D3</option></select></label></div>; // 화면 반환
} // 함수 종료

function NotificationPanel({ draft, errors, enabled, onChange, onEnabled, onSave }: { draft: { startTime: string; endTime: string; dailyLimit: number }; errors: NotificationSettingsErrors; enabled: boolean; onChange(value: { startTime: string; endTime: string; dailyLimit: number }): void; onEnabled(value: boolean): void; onSave(): void }) // 알림 영역
{ // 함수 시작
    return <div className={styles.section}><h2>알림</h2><label className={styles.check}><input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} />선제 메시지 허용</label><label>시작 시각<input type="time" value={draft.startTime} onChange={(event) => onChange({ ...draft, startTime: event.target.value })} /></label>{errors.startTime === undefined ? null : <p className={styles.error}>{errors.startTime}</p>}<label>종료 시각<input type="time" value={draft.endTime} onChange={(event) => onChange({ ...draft, endTime: event.target.value })} /></label>{errors.endTime === undefined ? null : <p className={styles.error}>{errors.endTime}</p>}<label>일일 알림 횟수<input type="number" min="0" max="10" value={draft.dailyLimit} onChange={(event) => onChange({ ...draft, dailyLimit: Number(event.target.value) })} /></label>{errors.dailyLimit === undefined ? null : <p className={styles.error}>{errors.dailyLimit}</p>}<button type="button" className={styles.primary} onClick={onSave}>알림 저장</button></div>; // 알림 반환
} // 함수 종료
