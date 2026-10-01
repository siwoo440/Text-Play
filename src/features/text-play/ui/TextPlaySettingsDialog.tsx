"use client"; // 클라이언트 컴포넌트

import { useState, type ChangeEvent, type ReactElement } from "react"; // 리액트 상태와 입력 타입
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 훅
import type { AppLanguage, TextPlayAIProviderId, TextPlayResolutionId, TextPlayThemeId } from "@/features/text-play/preferences/text-play-preferences"; // 설정 타입
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자
import { TextPlayFrameDecoration, TextPlayIcon, type TextPlayIconName } from "@/features/text-play/ui/TextPlayIcons"; // 벡터 UI
import styles from "@/features/text-play/ui/TextPlaySettingsDialog.module.css"; // 설정 스타일
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자
import type { OllamaModel, RunningOllamaModel } from "@/lib/adapters/ollama-client"; // 올라마 모델 계약

interface TextPlaySettingsDialogProps // 설정 대화상자 속성
{ // 구조 시작
    open: boolean; // 열림 상태
    onClose(): void; // 닫기 처리
} // 구조 종료

interface ThemeOption // 테마 선택 구조(이름·설명은 언어별 글자)
{ // 구조 시작
    id: TextPlayThemeId; // 테마 식별자
    icon: TextPlayIconName; // 테마 아이콘
} // 구조 종료

const themeOptions: ThemeOption[] = // 테마 목록
[ // 목록 시작
    { id: "dark-fantasy", icon: "sanity" }, // 판타지 테마
    { id: "sci-fi", icon: "ai" }, // SF 테마
    { id: "classic-novel", icon: "heart" }, // 노벨 테마
]; // 목록 종료

export function TextPlaySettingsDialog({ open, onClose }: TextPlaySettingsDialogProps): ReactElement // 설정 대화상자
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 플랫폼 조회
    const { preferences, updatePreferences } = useTextPlayPreferences(); // 설정 조회
    const text = TEXT_PLAY_UI_TEXT[preferences.language].settings; // 언어별 설정 글자
    const [models, setModels] = useState<OllamaModel[]>([]); // 설치 모델 상태
    const [runningModels, setRunningModels] = useState<RunningOllamaModel[]>([]); // 실행 모델 상태
    const [modelStatus, setModelStatus] = useState<string | null>(null); // 모델 상태 문구
    const [isScanning, setIsScanning] = useState(false); // 모델 검색 상태
    const changeResolution = (event: ChangeEvent<HTMLSelectElement>) => // 해상도 변경
    { // 함수 시작
        const resolutionId = event.target.value as TextPlayResolutionId; // 선택 해상도
        updatePreferences({ resolutionId }); // 해상도 저장
        void platform.applyWindowResolution(resolutionId).catch(() => undefined); // 창 해상도 적용
    }; // 함수 종료
    const scanModels = async () => // 모델 검색 처리
    { // 함수 시작
        if (platform.localAI === undefined) // 로컬 통신 확인
        { // 조건 시작
            return; // 검색 중단
        } // 조건 종료
        setIsScanning(true); // 검색 상태 시작
        setModelStatus(text.checkingModels); // 검색 안내 반영
        try // 모델 조회 시도
        { // 시도 시작
            const [installed, running] = await Promise.all([platform.localAI.listModels(), platform.localAI.listRunningModels()]); // 모델 목록 동시 조회
            setModels(installed); // 설치 모델 반영
            setRunningModels(running); // 실행 모델 반영
            if (installed.length === 0) // 빈 모델 확인
            { // 조건 시작
                setModelStatus(text.noModels); // 빈 목록 안내
                return; // 처리 종료
            } // 조건 종료
            if (preferences.localModelId !== null && !installed.some((model) => model.name === preferences.localModelId)) // 선택 모델 삭제 확인
            { // 조건 시작
                setModelStatus(text.modelMissing); // 삭제 안내
                return; // 처리 종료
            } // 조건 종료
            setModelStatus(text.foundModels(installed.length)); // 검색 완료 안내
        } // 시도 종료
        catch // 조회 실패 처리
        { // 오류 시작
            setModels([]); // 설치 목록 초기화
            setRunningModels([]); // 실행 목록 초기화
            setModelStatus(text.ollamaOffline); // 연결 오류 안내
        } // 오류 종료
        finally // 검색 상태 정리
        { // 정리 시작
            setIsScanning(false); // 검색 상태 종료
        } // 정리 종료
    }; // 함수 종료
    const changeLocalModel = (event: ChangeEvent<HTMLSelectElement>) => // 로컬 모델 변경
    { // 함수 시작
        updatePreferences({ localModelId: event.target.value.length === 0 ? null : event.target.value }); // 선택 모델 저장
    }; // 함수 종료
    const changeAIProvider = (event: ChangeEvent<HTMLSelectElement>) => // 공급자 변경
    { // 함수 시작
        const aiProviderId = event.target.value as TextPlayAIProviderId; // 선택 공급자 변환
        if (aiProviderId === "ollama" && preferences.localModelId === null) // 모델 누락 확인
        { // 조건 시작
            return; // 올라마 선택 차단
        } // 조건 종료
        updatePreferences({ aiProviderId }); // 공급자 저장
    }; // 함수 종료
    const runningModel = runningModels.find((model) => model.name === preferences.localModelId); // 선택 실행 모델 조회
    const memoryStatus = runningModel === undefined ? null : text.vram((runningModel.sizeVram / 1_073_741_824).toFixed(1)); // 그래픽 메모리 문구
    return ( // 설정 반환
        <TextPlayDialog labelledBy="text-play-settings-title" describedBy="text-play-settings-description" open={open} onClose={onClose}> {/* 설정 대화상자 */}
            <header className={styles.header}> {/* 설정 머리말 */}
                <span>{text.eyebrow}</span> {/* 설정 표제 */}
                <h2 id="text-play-settings-title">{text.title}</h2> {/* 설정 제목 */}
                <p id="text-play-settings-description">{text.description}</p> {/* 설정 설명 */}
            </header> {/* 머리말 종료 */}
            <section className={styles.section} aria-labelledby="theme-settings-title"> {/* 테마 설정 */}
                <div className={styles.sectionTitle}><TextPlayIcon name="settings" /><div><h3 id="theme-settings-title">{text.themeTitle}</h3><p>{text.themeHint}</p></div></div> {/* 영역 제목 */}
                <div className={styles.themeGrid}> {/* 테마 목록 */}
                    {themeOptions.map((theme, index) => // 테마 순회
                        <label key={theme.id} className={styles.themeCard} data-selected={preferences.themeId === theme.id}> {/* 테마 카드 */}
                            <input type="radio" name="text-play-theme" value={theme.id} checked={preferences.themeId === theme.id} aria-label={text.themeLabel(text.themes[theme.id].label)} data-dialog-initial={index === 0 ? "true" : undefined} onChange={() => updatePreferences({ themeId: theme.id })} /> {/* 테마 입력 */}
                            <TextPlayFrameDecoration /> {/* 프레임 장식 */}
                            <TextPlayIcon name={theme.icon} size={24} /> {/* 테마 아이콘 */}
                            <strong>{text.themes[theme.id].label}</strong> {/* 테마 이름 */}
                            <span>{text.themes[theme.id].summary}</span> {/* 테마 설명 */}
                        </label> // 테마 카드 종료
                    )} {/* 테마 목록 종료 */}
                </div> {/* 테마 목록 종료 */}
            </section> {/* 테마 설정 종료 */}
            <div className={styles.settingGrid}> {/* 설정 격자 */}
                <section className={styles.section}> {/* 해상도 설정 */}
                    <div className={styles.sectionTitle}><TextPlayIcon name="status" /><div><h3>{text.windowTitle}</h3><p>{text.windowHint}</p></div></div> {/* 영역 제목 */}
                    <label className={styles.field}>{text.resolution}<select value={preferences.resolutionId} onChange={changeResolution}><option value="fit">{text.fit}</option><option value="1280x720">1280×720</option><option value="1600x900">1600×900</option><option value="1920x1080">1920×1080</option></select></label> {/* 해상도 선택 */}
                    <label className={styles.field}>언어 / Language<select value={preferences.language} onChange={(event) => updatePreferences({ language: event.target.value as AppLanguage })}><option value="ko">한국어</option><option value="en">English</option></select></label> {/* 앱 언어 선택(어느 언어로 보든 찾을 수 있게 두 언어 이름) */}
                </section> {/* 해상도 설정 종료 */}
                <section className={styles.section}> {/* AI 설정 */}
                    <div className={styles.sectionTitle}><TextPlayIcon name="ai" /><div><h3>{text.aiTitle}</h3><p>{text.aiHint}</p></div></div> {/* 영역 제목 */}
                    <label className={styles.field}>{text.chatbot}<select value={preferences.aiProviderId} onChange={changeAIProvider}><option value="mock">{text.temporaryAI}</option><option value="bundled" disabled={platform.localAI === undefined}>{text.bundledAI}</option><option value="ollama" disabled={preferences.localModelId === null}>{text.ollama}</option></select></label> {/* AI 선택 */}
                    {platform.localAI === undefined // 로컬 기능 확인
                        ? <p className={styles.status}>{text.webOnly}</p> // 웹 제한 안내
                        : <> {/* 로컬 설정 묶음 */}
                            <button className={styles.scanButton} type="button" onClick={() => void scanModels()} disabled={isScanning}>{isScanning ? text.scanning : text.scan}</button> {/* 모델 검색 */}
                            <label className={styles.field}>{text.localModel}<select value={preferences.localModelId ?? ""} onChange={changeLocalModel} disabled={models.length === 0}><option value="">{text.chooseModel}</option>{models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}</select></label> {/* 모델 선택 */}
                            {modelStatus === null ? null : <p className={styles.status} role="status">{modelStatus}</p>} {/* 모델 상태 */}
                            {memoryStatus === null ? null : <p className={styles.memoryStatus}>{memoryStatus}</p>} {/* 메모리 상태 */}
                        </>} {/* 로컬 설정 종료 */}
                </section> {/* AI 설정 종료 */}
            </div> {/* 설정 격자 종료 */}
        </TextPlayDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료
