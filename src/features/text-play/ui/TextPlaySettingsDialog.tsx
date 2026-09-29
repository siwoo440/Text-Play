"use client"; // 클라이언트 컴포넌트

import type { ChangeEvent, ReactElement } from "react"; // 리액트 입력 타입
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 훅
import type { TextPlayResolutionId, TextPlayThemeId } from "@/features/text-play/preferences/text-play-preferences"; // 설정 타입
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자
import { TextPlayFrameDecoration, TextPlayIcon, type TextPlayIconName } from "@/features/text-play/ui/TextPlayIcons"; // 벡터 UI
import styles from "@/features/text-play/ui/TextPlaySettingsDialog.module.css"; // 설정 스타일

interface TextPlaySettingsDialogProps // 설정 대화상자 속성
{ // 구조 시작
    open: boolean; // 열림 상태
    onClose(): void; // 닫기 처리
} // 구조 종료

interface ThemeOption // 테마 선택 구조
{ // 구조 시작
    id: TextPlayThemeId; // 테마 식별자
    label: string; // 테마 이름
    summary: string; // 테마 설명
    icon: TextPlayIconName; // 테마 아이콘
} // 구조 종료

const themeOptions: ThemeOption[] = // 테마 목록
[ // 목록 시작
    { id: "dark-fantasy", label: "다크 판타지 글래스", summary: "보랏빛 유리와 금속성 룬", icon: "sanity" }, // 판타지 테마
    { id: "sci-fi", label: "미니멀 SF HUD", summary: "청록 신호선과 각진 프레임", icon: "ai" }, // SF 테마
    { id: "classic-novel", label: "클래식 비주얼 노벨", summary: "따뜻한 장식과 부드러운 대화창", icon: "heart" }, // 노벨 테마
]; // 목록 종료

export function TextPlaySettingsDialog({ open, onClose }: TextPlaySettingsDialogProps): ReactElement // 설정 대화상자
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 플랫폼 조회
    const { preferences, updatePreferences } = useTextPlayPreferences(); // 설정 조회
    const changeResolution = (event: ChangeEvent<HTMLSelectElement>) => // 해상도 변경
    { // 함수 시작
        const resolutionId = event.target.value as TextPlayResolutionId; // 선택 해상도
        updatePreferences({ resolutionId }); // 해상도 저장
        void platform.applyWindowResolution(resolutionId).catch(() => undefined); // 창 해상도 적용
    }; // 함수 종료
    return ( // 설정 반환
        <TextPlayDialog labelledBy="text-play-settings-title" describedBy="text-play-settings-description" open={open} onClose={onClose}> {/* 설정 대화상자 */}
            <header className={styles.header}> {/* 설정 머리말 */}
                <span>DISPLAY &amp; AI</span> {/* 영문 표제 */}
                <h2 id="text-play-settings-title">게임 화면 설정</h2> {/* 설정 제목 */}
                <p id="text-play-settings-description">화면 분위기와 EXE 창 크기를 선택합니다.</p> {/* 설정 설명 */}
            </header> {/* 머리말 종료 */}
            <section className={styles.section} aria-labelledby="theme-settings-title"> {/* 테마 설정 */}
                <div className={styles.sectionTitle}><TextPlayIcon name="settings" /><div><h3 id="theme-settings-title">UI 테마</h3><p>선택 즉시 플레이 화면에 적용됩니다.</p></div></div> {/* 영역 제목 */}
                <div className={styles.themeGrid}> {/* 테마 목록 */}
                    {themeOptions.map((theme, index) => // 테마 순회
                        <label key={theme.id} className={styles.themeCard} data-selected={preferences.themeId === theme.id}> {/* 테마 카드 */}
                            <input type="radio" name="text-play-theme" value={theme.id} checked={preferences.themeId === theme.id} aria-label={`${theme.label} 테마`} data-dialog-initial={index === 0 ? "true" : undefined} onChange={() => updatePreferences({ themeId: theme.id })} /> {/* 테마 입력 */}
                            <TextPlayFrameDecoration /> {/* 프레임 장식 */}
                            <TextPlayIcon name={theme.icon} size={24} /> {/* 테마 아이콘 */}
                            <strong>{theme.label}</strong> {/* 테마 이름 */}
                            <span>{theme.summary}</span> {/* 테마 설명 */}
                        </label> // 테마 카드 종료
                    )} {/* 테마 목록 종료 */}
                </div> {/* 테마 목록 종료 */}
            </section> {/* 테마 설정 종료 */}
            <div className={styles.settingGrid}> {/* 설정 격자 */}
                <section className={styles.section}> {/* 해상도 설정 */}
                    <div className={styles.sectionTitle}><TextPlayIcon name="status" /><div><h3>창 크기</h3><p>EXE에서 실제 창 크기를 변경합니다.</p></div></div> {/* 영역 제목 */}
                    <label className={styles.field}>창 해상도<select value={preferences.resolutionId} onChange={changeResolution}><option value="fit">화면 맞춤</option><option value="1280x720">1280×720</option><option value="1600x900">1600×900</option><option value="1920x1080">1920×1080</option></select></label> {/* 해상도 선택 */}
                </section> {/* 해상도 설정 종료 */}
                <section className={styles.section}> {/* AI 설정 */}
                    <div className={styles.sectionTitle}><TextPlayIcon name="ai" /><div><h3>AI 공급자</h3><p>이번 버전은 Mock AI만 실행합니다.</p></div></div> {/* 영역 제목 */}
                    <label className={styles.field}>사용할 챗봇<select value={preferences.aiProviderId} onChange={() => undefined}><option value="mock">Mock AI · 사용 가능</option><option value="local-gpu" disabled>로컬 GPU 모델 · 연결 준비 중</option></select></label> {/* AI 선택 */}
                </section> {/* AI 설정 종료 */}
            </div> {/* 설정 격자 종료 */}
        </TextPlayDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료
