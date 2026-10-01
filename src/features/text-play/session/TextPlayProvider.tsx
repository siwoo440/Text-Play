"use client"; // 클라이언트 컴포넌트

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react"; // 리액트 도구
import { createTextPlayState, selectTextPlayChoice } from "@/features/text-play/core/engine"; // 게임 엔진
import type { TextPlaySaveSlot, TextPlaySlotId } from "@/features/text-play/core/types"; // 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 앱 언어
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어
import { SESSION_MESSAGES } from "@/features/text-play/session/session-messages"; // 언어별 세션 안내
import { createTextPlayController } from "@/features/text-play/session/text-play-controller"; // 세션 제어기
import { textPlayReducer, type TextPlaySessionState } from "@/features/text-play/session/text-play-reducer"; // 세션 리듀서
import { createBrowserTextPlaySaveRepository } from "@/features/text-play/storage/browser-save-repository"; // 브라우저 저장소 생성기
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import type { LLMAdapter } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // 기본 Mock 어댑터

interface TextPlayStore // Text-Play 저장소 구조
{ // 구조 시작
    state: TextPlaySessionState; // 세션 상태
    slots: TextPlaySaveSlot[]; // 저장 슬롯 목록
    corruptSlotIds: TextPlaySlotId[]; // 손상 슬롯 목록
    llmLabel: string; // LLM 연결 표시
    storageWarning: string | null; // 저장 방식 경고
    selectChoice(choiceId: string): Promise<void>; // 선택지 처리
    sendFreeInput(input: string, signal: AbortSignal): Promise<void>; // 자유 입력 처리
    save(slotId: TextPlaySlotId): Promise<void>; // 수동 저장
    load(slotId: TextPlaySlotId): Promise<void>; // 저장 복원
    remove(slotId: TextPlaySlotId): Promise<void>; // 저장 삭제
    toggleStatePanel(): void; // 상태 패널 전환
} // 구조 종료

interface TextPlayProviderProps // 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 요소
    initialState?: TextPlaySessionState; // 초기 세션
    repository?: TextPlaySaveRepository; // 저장소 주입
    llm?: LLMAdapter; // LLM 주입
    llmLabel?: string; // LLM 표시 문구
    resumeSlot?: TextPlaySlotId | null; // 시작 복원 슬롯
    language?: AppLanguage; // AI 답변·안내 언어(없으면 설정의 언어)
} // 구조 종료

const TextPlayContext = createContext<TextPlayStore | null>(null); // Text-Play 문맥

export function TextPlayProvider({ children, initialState, repository, llm, llmLabel, resumeSlot = null, language: languageOverride }: TextPlayProviderProps) // Text-Play 공급자
{ // 함수 시작
    const appLanguage = useAppLanguage(); // 설정에서 고른 언어
    const language = languageOverride ?? appLanguage; // 실제 사용할 언어
    const messages = SESSION_MESSAGES[language]; // 고른 언어의 안내
    const messagesRef = useRef(messages); // 저장·불러오기 안내 참조(언어가 바뀌어도 동작 함수는 그대로)
    useEffect(() => // 안내 참조 동기화 효과
    { // 효과 시작
        messagesRef.current = messages; // 최신 안내 반영
    }, [messages]); // 안내 의존
    const initial = initialState ?? { game: createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, new Date().toISOString()), streamedText: "", pendingInput: "", isStreaming: false, error: null, saveNotice: null, isStatePanelOpen: false }; // 초기 세션 생성
    const [state, dispatch] = useReducer(textPlayReducer, initial); // 세션 리듀서 연결
    const stateRef = useRef(state); // 최신 상태 참조
    useEffect(() => // 상태 참조 동기화 효과
    { // 효과 시작
        stateRef.current = state; // 최신 상태 갱신
    }, [state]); // 상태 의존
    const [activeRepository] = useState<TextPlaySaveRepository>(() => repository ?? createBrowserTextPlaySaveRepository()); // 활성 저장소
    const repositoryRef = useRef<TextPlaySaveRepository>(activeRepository); // 저장소 참조
    const [storageWarning, setStorageWarning] = useState<string | null>(null); // 화면 표시 후 반영할 저장 경고
    const [defaultLLM] = useState<LLMAdapter>(() => new MockLLMAdapter()); // 기본 임시 인공지능
    const activeLLM = llm ?? defaultLLM; // 현재 인공지능 선택
    const activeLLMLabel = llm === undefined ? messages.temporaryAI : llmLabel ?? messages.customAI; // 현재 연결 문구
    const llmRef = useRef<LLMAdapter>(activeLLM); // LLM 참조
    useEffect(() => // LLM 참조 동기화 효과
    { // 효과 시작
        llmRef.current = activeLLM; // 현재 LLM 반영
    }, [activeLLM]); // LLM 의존
    const [slots, setSlots] = useState<TextPlaySaveSlot[]>([]); // 저장 슬롯 상태
    const [corruptSlotIds, setCorruptSlotIds] = useState<TextPlaySlotId[]>([]); // 손상 슬롯 상태
    const syncStorageWarning = useCallback(() => // 저장 경고 동기화
    { // 함수 시작
        setStorageWarning(repositoryRef.current.getStorageWarning?.() ?? null); // 저장 경고 반영
    }, []); // 고정 콜백
    const refreshSlots = useCallback(async () => // 저장 슬롯 갱신
    { // 함수 시작
        try // 목록 조회 시도
        { // 시도 시작
            const nextSlots = await repositoryRef.current.list(DEMO_TEXT_PLAY_PACKAGE.id); // 저장 슬롯 조회
            setSlots(nextSlots); // 저장 슬롯 반영
            setCorruptSlotIds(repositoryRef.current.getCorruptSlotIds?.(DEMO_TEXT_PLAY_PACKAGE.id) ?? []); // 손상 슬롯 반영
        } // 시도 종료
        catch // 목록 조회 실패 처리
        { // 오류 시작
            setSlots([]); // 빈 슬롯 반영
            setCorruptSlotIds([]); // 손상 슬롯 초기화
        } // 오류 종료
        finally // 저장 방식 반영
        { // 정리 시작
            syncStorageWarning(); // 저장 경고 갱신
        } // 정리 종료
    }, [syncStorageWarning]); // 경고 동기화 의존
    useEffect(() => // 최초 슬롯 조회 효과
    { // 효과 시작
        void refreshSlots(); // 저장 슬롯 조회
    }, [refreshSlots]); // 조회 함수 의존
    const sendFreeInput = useCallback(async (input: string, signal: AbortSignal) => // 자유 입력 처리
    { // 함수 시작
        const controller = createTextPlayController({ llm: llmRef.current, repository: repositoryRef.current, getState: () => stateRef.current, dispatch, now: () => new Date().toISOString(), language }); // 제어기 생성(고른 언어로 답변)
        await controller.sendFreeInput(input, signal); // 자유 입력 실행
        await refreshSlots(); // 자동 저장 목록 갱신
    }, [language, refreshSlots]); // 언어·슬롯 갱신 의존
    const selectChoice = useCallback(async (choiceId: string) => // 선택지 처리
    { // 함수 시작
        const result = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, stateRef.current.game, choiceId, new Date().toISOString()); // 선택지 적용
        if (!result.ok) // 적용 실패 확인
        { // 조건 시작
            dispatch({ type: "ai-failed", message: messagesRef.current.choiceFailed }); // 오류 전달
            return; // 처리 종료
        } // 조건 종료
        dispatch({ type: "game-changed", game: result.state }); // 게임 상태 반영
        try // 자동 저장 시도
        { // 시도 시작
            await repositoryRef.current.save("auto", result.state, result.state.sceneId); // 자동 저장 실행
            syncStorageWarning(); // 저장 경고 갱신
            dispatch({ type: "save-notice", message: messagesRef.current.autoSaved }); // 저장 성공 안내
            await refreshSlots(); // 자동 저장 목록 갱신
        } // 시도 종료
        catch // 저장 실패 처리
        { // 오류 시작
            syncStorageWarning(); // 저장 경고 갱신
            dispatch({ type: "save-notice", message: messagesRef.current.saveFailed }); // 저장 실패 안내
        } // 오류 종료
    }, [refreshSlots, syncStorageWarning]); // 슬롯 갱신 의존
    const save = useCallback(async (slotId: TextPlaySlotId) => // 수동 저장 처리
    { // 함수 시작
        try // 저장 시도
        { // 시도 시작
            await repositoryRef.current.save(slotId, stateRef.current.game, stateRef.current.game.sceneId); // 슬롯 저장
            syncStorageWarning(); // 저장 경고 갱신
            dispatch({ type: "save-notice", message: messagesRef.current.saved }); // 저장 안내
            await refreshSlots(); // 수동 저장 목록 갱신
        } // 시도 종료
        catch // 저장 실패 처리
        { // 오류 시작
            syncStorageWarning(); // 저장 경고 갱신
            dispatch({ type: "save-notice", message: messagesRef.current.saveFailed }); // 저장 실패 안내
        } // 오류 종료
    }, [refreshSlots, syncStorageWarning]); // 슬롯 갱신 의존
    const load = useCallback(async (slotId: TextPlaySlotId) => // 복원 처리
    { // 함수 시작
        const slot = await repositoryRef.current.load(DEMO_TEXT_PLAY_PACKAGE.id, slotId); // 슬롯 조회
        syncStorageWarning(); // 저장 경고 갱신
        if (slot !== null) // 슬롯 존재 확인
        { // 조건 시작
            dispatch({ type: "game-restored", game: slot.state }); // 게임 복원
            dispatch({ type: "save-notice", message: messagesRef.current.loaded }); // 복원 안내
        } // 조건 종료
    }, [syncStorageWarning]); // 경고 동기화 의존
    useEffect(() => // 시작 복원 효과
    { // 효과 시작
        if (resumeSlot !== null) // 복원 슬롯 확인
        { // 조건 시작
            void load(resumeSlot); // 시작 저장 복원
        } // 조건 종료
    }, [load, resumeSlot]); // 복원 의존
    const remove = useCallback(async (slotId: TextPlaySlotId) => // 삭제 처리
    { // 함수 시작
        await repositoryRef.current.remove(DEMO_TEXT_PLAY_PACKAGE.id, slotId); // 슬롯 삭제
        syncStorageWarning(); // 저장 경고 갱신
        dispatch({ type: "save-notice", message: messagesRef.current.removed }); // 삭제 안내
        await refreshSlots(); // 저장 슬롯 목록 갱신
    }, [refreshSlots, syncStorageWarning]); // 슬롯 갱신 의존
    const value = useMemo<TextPlayStore>(() => ({ state, slots, corruptSlotIds, llmLabel: activeLLMLabel, storageWarning, selectChoice, sendFreeInput, save, load, remove, toggleStatePanel: () => dispatch({ type: "toggle-state-panel" }) }), [activeLLMLabel, corruptSlotIds, load, remove, save, selectChoice, sendFreeInput, slots, state, storageWarning]); // 문맥 값 생성
    return <TextPlayContext.Provider value={value}>{children}</TextPlayContext.Provider>; // 공급자 반환
} // 함수 종료

export function useTextPlaySession(): TextPlayStore // Text-Play 세션 훅
{ // 함수 시작
    const store = useContext(TextPlayContext); // 문맥 조회
    if (store === null) // 공급자 존재 확인
    { // 조건 시작
        throw new Error("useTextPlaySession은 TextPlayProvider 안에서 사용해야 합니다."); // 사용 오류
    } // 조건 종료
    return store; // 저장소 반환
} // 함수 종료
