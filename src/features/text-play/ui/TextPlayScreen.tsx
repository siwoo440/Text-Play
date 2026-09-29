"use client"; // 클라이언트 컴포넌트

import { useMemo, useRef, useState, type FormEvent } from "react"; // 리액트 도구
import { getAvailableChoices } from "@/features/text-play/core/engine"; // 선택지 조회기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { useTextPlaySession } from "@/features/text-play/session/TextPlayProvider"; // 세션 훅
import { ChoiceList } from "@/features/text-play/ui/ChoiceList"; // 선택지 목록
import { SaveManager } from "@/features/text-play/ui/SaveManager"; // 저장 관리자
import { StatusPanel } from "@/features/text-play/ui/StatusPanel"; // 상태 패널
import { StoryLog } from "@/features/text-play/ui/StoryLog"; // 이야기 기록
import styles from "@/features/text-play/ui/TextPlayScreen.module.css"; // 화면 스타일

export function TextPlayScreen() // Text-Play 플레이 화면
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 실행 플랫폼 조회
    const { state, llmLabel, storageWarning, selectChoice, sendFreeInput, toggleStatePanel } = useTextPlaySession(); // 세션 조회
    const [input, setInput] = useState(""); // 자유 입력 상태
    const abortRef = useRef<AbortController | null>(null); // 중지 제어기
    const scene = useMemo(() => DEMO_TEXT_PLAY_PACKAGE.scenes.find((candidate) => candidate.id === state.game.sceneId) ?? DEMO_TEXT_PLAY_PACKAGE.scenes[0], [state.game.sceneId]); // 현재 장면 조회
    const choices = useMemo(() => getAvailableChoices(DEMO_TEXT_PLAY_PACKAGE, state.game), [state.game]); // 현재 선택지 조회
    const startRequest = (value: string) => // 자유 입력 요청 시작
    { // 함수 시작
        const controller = new AbortController(); // 중지 제어기 생성
        abortRef.current = controller; // 중지 제어기 저장
        void sendFreeInput(value, controller.signal); // 자유 입력 전송
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
        <main className={styles.page}> {/* 플레이 화면 */}
            <header className={styles.topbar}> {/* 상태 표시줄 */}
                <div><span>TEXT-PLAY</span><strong>{DEMO_TEXT_PLAY_PACKAGE.title}</strong><span className={styles.aiMode} aria-label="AI 연결">{llmLabel}</span></div> {/* 작품 정보 */}
                <div><span>체력 {state.game.stats.hp}</span><span>정신력 {state.game.stats.sanity}</span><span>골드 {state.game.stats.gold}</span></div> {/* 능력치 정보 */}
                <div><button type="button" onClick={() => platform.navigate("home")}>홈</button><button type="button" aria-label={state.isStatePanelOpen ? "상태 패널 닫기" : "상태 패널 열기"} aria-expanded={state.isStatePanelOpen} aria-controls="text-play-state-panel" onClick={toggleStatePanel}>상태</button></div> {/* 화면 동작 */}
            </header> {/* 상태 표시줄 종료 */}
            {storageWarning === null ? null : <p className={styles.storageWarning} role="alert">{storageWarning}</p>} {/* 저장 경고 */}
            <div className={styles.layout}> {/* 본문 배치 */}
                <section className={styles.scene} aria-labelledby="scene-title"> {/* 장면 영역 */}
                    <div className={styles.sceneImage}>{scene.imagePath === null ? null : platform.renderSceneImage(scene.imagePath)}</div> {/* 장면 이미지 */}
                    <div><p>{scene.locationId}</p><h1 id="scene-title">{scene.title}</h1></div> {/* 장면 제목 */}
                </section> {/* 장면 영역 종료 */}
                <section className={styles.story}> {/* 이야기 영역 */}
                    <StoryLog entries={state.game.log} streamedText={state.streamedText} /> {/* 이야기 기록 */}
                    <ChoiceList choices={choices} disabled={state.isStreaming} onSelect={(choiceId) => void selectChoice(choiceId)} /> {/* 선택지 */}
                    <form onSubmit={submit}> {/* 자유 입력 폼 */}
                        <label htmlFor="text-play-input">행동 직접 입력</label> {/* 입력 표제 */}
                        <div><input id="text-play-input" value={input} disabled={state.isStreaming} onChange={(event) => setInput(event.target.value)} placeholder="예: 벽의 문양을 자세히 살핀다" /><button type="submit" disabled={state.isStreaming}>전송</button>{state.isStreaming ? <button type="button" onClick={() => abortRef.current?.abort()}>응답 중지</button> : null}</div> {/* 입력 제어 */}
                    </form> {/* 자유 입력 폼 종료 */}
                    <section className={styles.notice} role="region" aria-label="시스템 안내" aria-live="polite"><span>{state.error ?? state.saveNotice ?? "선택하거나 행동을 입력해 이야기를 진행하세요."}</span>{state.error !== null && state.pendingInput.length > 0 && !state.isStreaming ? <button type="button" onClick={() => startRequest(state.pendingInput)}>같은 입력 다시 시도</button> : null}</section> {/* 시스템 안내 */}
                </section> {/* 이야기 영역 종료 */}
                <div className={styles.side}> {/* 상태 보조 영역 */}
                    <StatusPanel state={state.game} open={state.isStatePanelOpen} /> {/* 상태 패널 */}
                    <SaveManager /> {/* 저장 관리자 */}
                </div> {/* 상태 보조 영역 종료 */}
            </div> {/* 본문 배치 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
