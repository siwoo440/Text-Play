"use client"; // 클라이언트 컴포넌트

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react"; // 리액트 도구
import { appReducer, type AppAction } from "@/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import type { AppState } from "@/features/core/types"; // 상태 타입
import { LocalStorageGateway } from "@/lib/repositories/local-storage-gateway"; // 로컬 저장소

export interface StateRepository // 상태 저장 계약
{ // 구조 시작
    load(): AppState; // 상태 읽기
    save(state: AppState): void; // 상태 저장
} // 구조 종료

interface AppStore // 앱 저장소
{ // 구조 시작
    state: AppState; // 현재 상태
    dispatch: Dispatch<AppAction>; // 동작 전달
    storageError: string | null; // 저장 오류
} // 구조 종료

interface AppProviderProps // 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 요소
    initialState?: AppState; // 테스트 초기 상태
    repository?: StateRepository; // 저장소 주입
} // 구조 종료

const AppContext = createContext<AppStore | null>(null); // 앱 문맥

export function AppProvider({ children, initialState = createInitialState(), repository }: AppProviderProps) // 앱 공급자
{ // 함수 시작
    const [state, dispatch] = useReducer(appReducer, initialState); // 상태 리듀서
    const [storageError, setStorageError] = useState<string | null>(null); // 저장 오류 상태
    const hydrated = useRef(false); // 복원 완료 표시
    useEffect(() => // 최초 복원 효과
    { // 효과 시작
        let cancelled = false; // 취소 표시
        hydrated.current = false; // 저장 대기
        const activeRepository = repository ?? // 저장소 선택
        { // 기본 저장소 시작
            load: () => new LocalStorageGateway(window.localStorage).load().state, // 브라우저 읽기
            save: (nextState: AppState) => new LocalStorageGateway(window.localStorage).save(nextState), // 브라우저 저장
        }; // 기본 저장소 종료
        const restoredState = activeRepository.load(); // 저장 상태 읽기
        queueMicrotask(() => // 비동기 복원 예약
        { // 작업 시작
            if (cancelled) // 취소 판정
            { // 조건 시작
                return; // 복원 생략
            } // 조건 종료
            dispatch({ type: "replace-state", state: restoredState }); // 저장 상태 복원
            hydrated.current = true; // 복원 완료
        }); // 작업 종료
        return () => // 효과 정리
        { // 정리 시작
            cancelled = true; // 예약 취소
        }; // 정리 종료
    }, [repository]); // 저장소 변경 의존
    useEffect(() => // 상태 저장 효과
    { // 효과 시작
        if (!hydrated.current) // 복원 전 판정
        { // 조건 시작
            return; // 저장 생략
        } // 조건 종료
        try // 저장 시도
        { // 조건 시작
            if (repository !== undefined) // 주입 저장소 확인
            { // 조건 시작
                repository.save(state); // 주입 저장소 저장
            } // 조건 종료
            else // 기본 저장소 선택
            { // 조건 시작
                new LocalStorageGateway(window.localStorage).save(state); // 브라우저 저장
            } // 조건 종료
            queueMicrotask(() => setStorageError(null)); // 오류 해제 예약
        } // 시도 종료
        catch // 저장 실패 처리
        { // 오류 시작
            queueMicrotask(() => setStorageError("저장하지 못했습니다. 브라우저 저장공간을 확인해 주세요.")); // 오류 안내 예약
        } // 오류 종료
    }, [repository, state]); // 상태 변경 의존
    const value = useMemo(() => ({ state, dispatch, storageError }), [state, storageError]); // 문맥 값
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>; // 공급자 반환
} // 함수 종료

export function useAppStore(): AppStore // 앱 저장소 훅
{ // 함수 시작
    const store = useContext(AppContext); // 문맥 조회
    if (store === null) // 공급자 부재 판정
    { // 조건 시작
        throw new Error("useAppStore는 AppProvider 안에서 사용해야 합니다."); // 사용 오류
    } // 조건 종료
    return store; // 저장소 반환
} // 함수 종료
