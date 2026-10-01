"use client"; // 클라이언트 컴포넌트

import { useState, type ChangeEvent, type ReactElement } from "react"; // 리액트 상태와 입력 타입
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 훅
import type { AppLanguage, TextPlayAIProviderId, TextPlayResolutionId, TextPlayThemeId } from "@/features/text-play/preferences/text-play-preferences"; // 설정 타입
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자
import { TextPlayFrameDecoration, TextPlayIcon, type TextPlayIconName } from "@/features/text-play/ui/TextPlayIcons"; // 벡터 UI
import styles from "@/features/text-play/ui/TextPlaySettingsDialog.module.css"; // 설정 스타일
import type { OllamaModel, RunningOllamaModel } from "@/lib/adapters/ollama-client"; // 올라마 모델 계약

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
        setModelStatus("설치된 모델을 확인하고 있습니다."); // 검색 안내 반영
        try // 모델 조회 시도
        { // 시도 시작
            const [installed, running] = await Promise.all([platform.localAI.listModels(), platform.localAI.listRunningModels()]); // 모델 목록 동시 조회
            setModels(installed); // 설치 모델 반영
            setRunningModels(running); // 실행 모델 반영
            if (installed.length === 0) // 빈 모델 확인
            { // 조건 시작
                setModelStatus("설치된 올라마 모델이 없습니다."); // 빈 목록 안내
                return; // 처리 종료
            } // 조건 종료
            if (preferences.localModelId !== null && !installed.some((model) => model.name === preferences.localModelId)) // 선택 모델 삭제 확인
            { // 조건 시작
                setModelStatus("선택한 모델이 설치되어 있지 않습니다."); // 삭제 안내
                return; // 처리 종료
            } // 조건 종료
            setModelStatus(`${installed.length}개 모델을 찾았습니다.`); // 검색 완료 안내
        } // 시도 종료
        catch // 조회 실패 처리
        { // 오류 시작
            setModels([]); // 설치 목록 초기화
            setRunningModels([]); // 실행 목록 초기화
            setModelStatus("올라마가 실행 중인지 확인해 주세요."); // 연결 오류 안내
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
    const memoryStatus = runningModel === undefined ? null : `그래픽 메모리 ${(runningModel.sizeVram / 1_073_741_824).toFixed(1)}GB 사용 중`; // 그래픽 메모리 문구
    return ( // 설정 반환
        <TextPlayDialog labelledBy="text-play-settings-title" describedBy="text-play-settings-description" open={open} onClose={onClose}> {/* 설정 대화상자 */}
            <header className={styles.header}> {/* 설정 머리말 */}
                <span>화면 및 인공지능</span> {/* 설정 표제 */}
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
                    <label className={styles.field}>언어 / Language<select value={preferences.language} onChange={(event) => updatePreferences({ language: event.target.value as AppLanguage })}><option value="ko">한국어</option><option value="en">English</option></select></label> {/* 앱 언어 선택(어느 언어로 보든 찾을 수 있게 두 언어 이름) */}
                </section> {/* 해상도 설정 종료 */}
                <section className={styles.section}> {/* AI 설정 */}
                    <div className={styles.sectionTitle}><TextPlayIcon name="ai" /><div><h3>인공지능 공급자</h3><p>임시 응답, 이 PC의 내장 AI, PC에 설치된 올라마 모델 중에서 선택합니다.</p></div></div> {/* 영역 제목 */}
                    <label className={styles.field}>사용할 챗봇<select value={preferences.aiProviderId} onChange={changeAIProvider}><option value="mock">임시 인공지능</option><option value="bundled" disabled={platform.localAI === undefined}>내장 AI(이 PC)</option><option value="ollama" disabled={preferences.localModelId === null}>올라마 로컬 모델</option></select></label> {/* AI 선택 */}
                    {platform.localAI === undefined // 로컬 기능 확인
                        ? <p className={styles.status}>로컬 모델은 Windows 실행 프로그램에서 사용할 수 있습니다.</p> // 웹 제한 안내
                        : <> {/* 로컬 설정 묶음 */}
                            <button className={styles.scanButton} type="button" onClick={() => void scanModels()} disabled={isScanning}>{isScanning ? "검색 중" : "설치 모델 검색"}</button> {/* 모델 검색 */}
                            <label className={styles.field}>로컬 모델<select value={preferences.localModelId ?? ""} onChange={changeLocalModel} disabled={models.length === 0}><option value="">모델을 선택하세요</option>{models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}</select></label> {/* 모델 선택 */}
                            {modelStatus === null ? null : <p className={styles.status} role="status">{modelStatus}</p>} {/* 모델 상태 */}
                            {memoryStatus === null ? null : <p className={styles.memoryStatus}>{memoryStatus}</p>} {/* 메모리 상태 */}
                        </>} {/* 로컬 설정 종료 */}
                </section> {/* AI 설정 종료 */}
            </div> {/* 설정 격자 종료 */}
        </TextPlayDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료
