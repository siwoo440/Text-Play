"use client"; // 클라이언트 컴포넌트

import { useMemo, useRef, useState, type FormEvent } from "react"; // 리액트 도구
import { getAvailableChoices } from "@/features/text-play/core/engine"; // 선택지 조회기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { createSpeakerNamer, createTextTranslator, localizeTextPlayPackage } from "@/features/text-play/data/localize-package"; // 작품 언어판
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { useAppLanguage, useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 훅
import type { TextPlayAIProviderId } from "@/features/text-play/preferences/text-play-preferences"; // AI 공급자 식별자
import { useTextPlaySession } from "@/features/text-play/session/TextPlayProvider"; // 세션 훅
import { ChoiceList } from "@/features/text-play/ui/ChoiceList"; // 선택지 목록
import { SaveManager, type SaveManagerMode } from "@/features/text-play/ui/SaveManager"; // 저장 관리자
import { StatusPanel } from "@/features/text-play/ui/StatusPanel"; // 상태 패널
import { StoryLog } from "@/features/text-play/ui/StoryLog"; // 이야기 기록
import { TextPlayFrameDecoration, TextPlayIcon } from "@/features/text-play/ui/TextPlayIcons"; // 벡터 UI
import { TextPlaySettingsDialog } from "@/features/text-play/ui/TextPlaySettingsDialog"; // 설정 대화상자
import { buildTextPlayRecommendations, type TextPlayRecommendation } from "@/features/text-play/ui/text-play-recommendations"; // 추천 답안 생성기
import { buildTextPlayStoryPages } from "@/features/text-play/ui/text-play-story-pages"; // 이야기 페이지 생성기
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자
import { TEXT_PLAY_MEMORY_STORAGE_WARNING } from "@/features/text-play/storage/browser-save-repository"; // 메모리 저장 경고
import styles from "@/features/text-play/ui/TextPlayScreen.module.css"; // 화면 스타일

export function TextPlayScreen() // Text-Play 플레이 화면
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 실행 플랫폼 조회
    const { preferences, updatePreferences } = useTextPlayPreferences(); // 게임 설정 조회
    const { state, llmLabel, storageWarning, selectChoice, sendFreeInput, toggleStatePanel } = useTextPlaySession(); // 세션 조회
    const language = useAppLanguage(); // 고른 언어
    const text = TEXT_PLAY_UI_TEXT[language]; // 언어별 화면 글자
    const work = useMemo(() => localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, language), [language]); // 고른 언어의 작품
    const translate = useMemo(() => createTextTranslator(DEMO_TEXT_PLAY_PACKAGE, language), [language]); // 저장된 원문 기록 바꾸기
    const nameSpeaker = useMemo(() => createSpeakerNamer(DEMO_TEXT_PLAY_PACKAGE, language), [language]); // 발화자 이름 바꾸기
    const [input, setInput] = useState(""); // 자유 입력 상태
    const [activeDialog, setActiveDialog] = useState<SaveManagerMode | "settings" | null>(null); // 활성 대화상자 상태
    const abortRef = useRef<AbortController | null>(null); // 중지 제어기
    const storyPages = useMemo(() => buildTextPlayStoryPages(state.game.log, DEMO_TEXT_PLAY_PACKAGE, state.game.sceneId), [state.game.log, state.game.sceneId]); // 이야기 페이지 생성
    const [turnNavigation, setTurnNavigation] = useState({ gameUpdatedAt: state.game.updatedAt, turnsBack: 0 }); // 턴 탐색 상태
    const turnsBack = turnNavigation.gameUpdatedAt === state.game.updatedAt ? turnNavigation.turnsBack : 0; // 현재 게임 이동량
    const safeTurnsBack = Math.min(turnsBack, storyPages.length - 1); // 유효 이동량 계산
    const viewedTurnIndex = storyPages.length - 1 - safeTurnsBack; // 열람 턴 계산
    const viewedPage = storyPages[viewedTurnIndex]; // 현재 페이지 조회
    const scene = useMemo(() => work.scenes.find((candidate) => candidate.id === viewedPage.sceneId) ?? work.scenes[0], [viewedPage.sceneId, work]); // 열람 장면 조회
    const locationName = work.glossary?.locations[scene.locationId] ?? scene.locationId; // 장소 표시 이름
    const viewedEntries = useMemo(() => viewedPage.entries.map((entry) => ({ ...entry, content: entry.kind === "dialogue" ? entry.content : translate(entry.content), speaker: entry.speaker === null ? null : nameSpeaker(entry.speaker) })), [nameSpeaker, translate, viewedPage.entries]); // 고른 언어로 보이는 기록
    const recommendations = useMemo(() => buildTextPlayRecommendations(getAvailableChoices(work, state.game), text.choices.freeActions), [state.game, text, work]); // 현재 추천 답안 생성
    const [expandedTurn, setExpandedTurn] = useState<string | null>(null); // 추천 펼침 턴 상태
    const recommendationsExpanded = expandedTurn === state.game.updatedAt; // 현재 턴 펼침 여부
    const startRequest = (value: string) => // 자유 입력 요청 시작
    { // 함수 시작
        const controller = new AbortController(); // 중지 제어기 생성
        abortRef.current = controller; // 중지 제어기 저장
        void sendFreeInput(value, controller.signal); // 자유 입력 전송
    }; // 함수 종료
    const selectRecommendation = (recommendation: TextPlayRecommendation) => // 추천 답안 선택
    { // 함수 시작
        if (recommendation.kind === "choice") // 작품 선택지 확인
        { // 조건 시작
            void selectChoice(recommendation.id); // 선택지 진행
            return; // 처리 종료
        } // 조건 종료
        startRequest(recommendation.label); // 자유 행동 전송
    }; // 함수 종료
    const submit = (event: FormEvent<HTMLFormElement>) => // 자유 입력 제출
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        const value = input.trim(); // 입력 정리
        if (value.length === 0 || state.isStreaming) // 전송 가능 확인
        { // 조건 시작
            return; // 전송 생략
        } // 조건 종료
        setInput(""); // 입력 초기화
        startRequest(value); // 자유 입력 요청
    }; // 함수 종료
    return ( // 화면 반환
        <main className={styles.page} data-text-play-root data-theme={preferences.themeId} data-resolution={preferences.resolutionId}> {/* 플레이 화면 */}
            <header className={styles.topbar}> {/* 상태 표시줄 */}
                <button type="button" className={styles.storyTitle} aria-label={text.screen.backToMain(work.title)} onClick={() => platform.navigate("home")}> {/* 작품 제목 버튼 */}
                    <span>TEXT-PLAY</span> {/* 작품 표제 */}
                    <strong>{work.title}</strong> {/* 작품 제목 */}
                </button> {/* 제목 버튼 종료 */}
                <button type="button" className={styles.stats} aria-label={state.isStatePanelOpen ? text.screen.closeStatus : text.screen.openStatus} aria-expanded={state.isStatePanelOpen} aria-controls="text-play-state-panel" onClick={toggleStatePanel}> {/* 능력치 버튼 */}
                    <span><TextPlayIcon name="heart" size={17} /><small>{text.screen.hp}</small><strong>{state.game.stats.hp}</strong></span> {/* 체력 정보 */}
                    <span><TextPlayIcon name="sanity" size={17} /><small>{text.screen.sanity}</small><strong>{state.game.stats.sanity}</strong></span> {/* 정신력 정보 */}
                    <span><TextPlayIcon name="gold" size={17} /><small>{text.screen.gold}</small><strong>{state.game.stats.gold}</strong></span> {/* 골드 정보 */}
                </button> {/* 능력치 버튼 종료 */}
                <div className={styles.actions}> {/* 상단 동작 */}
                    <button type="button" aria-label={text.screen.openSave} onClick={() => setActiveDialog("save")}><TextPlayIcon name="save" /><span>{text.screen.save}</span></button> {/* 저장 버튼 */}
                    <button type="button" aria-label={text.screen.openLoad} onClick={() => setActiveDialog("load")}><TextPlayIcon name="load" /><span>{text.screen.load}</span></button> {/* 불러오기 버튼 */}
                    <label className={styles.aiSelect}> {/* AI 선택 */}
                        <TextPlayIcon name="ai" /> {/* AI 아이콘 */}
                        <span aria-label={text.screen.aiConnection}>{llmLabel}</span> {/* AI 상태 */}
                        <select aria-label={text.screen.chooseAI} value={preferences.aiProviderId} onChange={(event) => event.target.value === "ollama" && preferences.localModelId === null ? setActiveDialog("settings") : updatePreferences({ aiProviderId: event.target.value as TextPlayAIProviderId })}> {/* AI 목록 */}
                            <option value="mock">{text.screen.temporaryAI}</option> {/* 임시 인공지능 */}
                            <option value="bundled" disabled={platform.localAI === undefined}>{text.screen.bundledAI}</option> {/* 내장 AI(Windows 실행 프로그램 전용) */}
                            <option value="ollama" disabled={platform.localAI === undefined || preferences.localModelId === null}>{preferences.localModelId === null ? text.screen.ollamaMissing : text.screen.ollamaModel(preferences.localModelId)}</option> {/* 로컬 인공지능 */}
                        </select> {/* AI 목록 종료 */}
                    </label> {/* AI 선택 종료 */}
                    <button type="button" aria-label={text.screen.openSettings} onClick={() => setActiveDialog("settings")}><TextPlayIcon name="settings" /><span>{text.screen.settings}</span></button> {/* 설정 버튼 */}
                </div> {/* 상단 동작 종료 */}
            </header> {/* 상태 표시줄 종료 */}
            {storageWarning === null ? null : <p className={styles.storageWarning} role="alert">{storageWarning === TEXT_PLAY_MEMORY_STORAGE_WARNING ? text.screen.memoryStorageWarning : storageWarning}</p>} {/* 저장 경고 */}
            <div className={styles.workspace}> {/* 게임 작업 영역 */}
                <section className={styles.stage} aria-label={text.screen.sceneStage}> {/* 장면 무대 */}
                    <div className={styles.sceneImage}>{scene.imagePath === null ? null : platform.renderSceneImage(scene.imagePath)}</div> {/* 장면 이미지 */}
                    <div className={styles.sceneShade} aria-hidden="true" /> {/* 이미지 음영 */}
                    <div className={styles.sceneCaption}> {/* 장면 표제 */}
                        {locationName === scene.title ? null : <p>{locationName}</p>} {/* 장소 이름(장면 제목과 같으면 생략) */}
                        <h1 id="scene-title">{scene.title}</h1> {/* 장면 제목 */}
                    </div> {/* 장면 표제 종료 */}
                    <section className={styles.storyBox} aria-label={text.screen.storyDialogue}> {/* 스토리 상자 */}
                        <div className={styles.frameDecoration}><TextPlayFrameDecoration /></div> {/* 벡터 프레임 */}
                        <div className={styles.turnBadges}> {/* 턴 배지 모음 */}
                            <span aria-label={`${text.screen.currentTurn} ${viewedTurnIndex + 1}`}><small>{text.screen.currentTurn}</small><strong>{viewedTurnIndex + 1}</strong></span> {/* 현재 턴 배지 */}
                            <span aria-label={`${text.screen.totalTurns} ${storyPages.length}`}><small>{text.screen.totalTurns}</small><strong>{storyPages.length}</strong></span> {/* 전체 턴 배지 */}
                        </div> {/* 턴 배지 종료 */}
                        <button type="button" className={`${styles.turnArrow} ${styles.turnArrowPrevious}`} aria-label={text.screen.previousTurn} disabled={viewedTurnIndex === 0} onClick={() => setTurnNavigation({ gameUpdatedAt: state.game.updatedAt, turnsBack: Math.min(storyPages.length - 1, safeTurnsBack + 1) })}>‹</button> {/* 이전 턴 버튼 */}
                        <StoryLog entries={viewedEntries} streamedText={viewedTurnIndex === storyPages.length - 1 ? state.streamedText : ""} isStreaming={viewedTurnIndex === storyPages.length - 1 && state.isStreaming} /> {/* 현재 이야기 */}
                        <button type="button" className={`${styles.turnArrow} ${styles.turnArrowNext}`} aria-label={text.screen.nextTurn} disabled={viewedTurnIndex === storyPages.length - 1} onClick={() => setTurnNavigation({ gameUpdatedAt: state.game.updatedAt, turnsBack: Math.max(0, safeTurnsBack - 1) })}>›</button> {/* 다음 턴 버튼 */}
                        <nav className={styles.turnDots} aria-label={text.screen.turnList}> {/* 턴 위치 목록 */}
                            {storyPages.map((_page, index) => <button key={index} type="button" aria-label={text.screen.showTurn(index + 1)} aria-current={index === viewedTurnIndex ? "step" : undefined} onClick={() => setTurnNavigation({ gameUpdatedAt: state.game.updatedAt, turnsBack: storyPages.length - 1 - index })}><span aria-hidden="true">{index === viewedTurnIndex ? "●" : "○"}</span></button>)} {/* 턴 위치 버튼 */}
                        </nav> {/* 턴 위치 목록 종료 */}
                    </section> {/* 스토리 상자 종료 */}
                </section> {/* 장면 무대 종료 */}
                <aside className={styles.commandDock} aria-label={text.screen.commands}> {/* 명령 도크 */}
                    <div className={styles.recommendations}> {/* 추천 영역 */}
                        <ChoiceList recommendations={recommendations} expanded={recommendationsExpanded} disabled={state.isStreaming} onToggle={() => setExpandedTurn(recommendationsExpanded ? null : state.game.updatedAt)} onSelect={selectRecommendation} /> {/* 추천 답안 */}
                    </div> {/* 추천 영역 종료 */}
                    <div className={styles.inputPanel}> {/* 직접 입력 영역 */}
                        <form onSubmit={submit}> {/* 자유 입력 폼 */}
                            <label htmlFor="text-play-input">{text.screen.typeAction}</label> {/* 입력 표제 */}
                            <textarea id="text-play-input" value={input} disabled={state.isStreaming} onChange={(event) => setInput(event.target.value)} placeholder={text.screen.placeholder} rows={3} /> {/* 자유 입력 */}
                            <div className={styles.inputActions}> {/* 입력 동작 */}
                                <button type="submit" disabled={state.isStreaming}><TextPlayIcon name="send" size={17} />{text.screen.send}</button> {/* 전송 버튼 */}
                                {state.isStreaming ? <button type="button" onClick={() => abortRef.current?.abort()}><TextPlayIcon name="stop" size={16} />{text.screen.stop}</button> : null} {/* 중지 버튼 */}
                            </div> {/* 입력 동작 종료 */}
                        </form> {/* 자유 입력 폼 종료 */}
                        <section className={styles.notice} role="region" aria-label={text.screen.systemNotice} aria-live="polite"><span>{state.error ?? state.saveNotice ?? text.screen.idleNotice}</span>{state.error !== null && state.pendingInput.length > 0 && !state.isStreaming ? <button type="button" onClick={() => startRequest(state.pendingInput)}>{text.screen.retry}</button> : null}</section> {/* 시스템 안내 */}
                    </div> {/* 직접 입력 영역 종료 */}
                </aside> {/* 명령 도크 종료 */}
            </div> {/* 작업 영역 종료 */}
            {state.isStatePanelOpen ? <div className={styles.stateLayer}><button type="button" className={styles.stateScrim} aria-label={text.screen.closeStatus} onClick={toggleStatePanel} /><div className={styles.statePopover}><StatusPanel state={state.game} open /></div></div> : null} {/* 상태 팝업 */}
            <SaveManager mode={activeDialog === "load" ? "load" : "save"} open={activeDialog === "save" || activeDialog === "load"} onClose={() => setActiveDialog(null)} /> {/* 저장 관리자 */}
            <TextPlaySettingsDialog open={activeDialog === "settings"} onClose={() => setActiveDialog(null)} /> {/* 화면 설정 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
