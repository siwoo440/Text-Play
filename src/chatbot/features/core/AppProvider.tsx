"use client"; // 클라이언트 컴포넌트

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react"; // 리액트 도구
import { appReducer, type AppAction } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { isStorageQuotaError, LocalStorageGateway, type BackupReason, type LoadResult } from "@chatbot/lib/repositories/local-storage-gateway"; // 로컬 저장소

export interface StateRepository // 상태 저장 계약
{ // 구조 시작
    load(): AppState; // 상태 읽기
    save(state: AppState): void; // 상태 저장
    createBackup?(state: AppState, reason: BackupReason): void; // 상태 백업
} // 구조 종료

export interface StorageNotice // 저장소 안내
{ // 구조 시작
    tone: "info" | "warning"; // 안내 종류
    message: string; // 안내 문구
} // 구조 종료

interface AppStore // 앱 저장소
{ // 구조 시작
    state: AppState; // 현재 상태
    dispatch: Dispatch<AppAction>; // 동작 전달
    storageError: string | null; // 저장 오류
    storageNotice: StorageNotice | null; // 저장소 안내
    dismissStorageNotice(): void; // 안내 닫기
    createBackup(reason: BackupReason): boolean; // 현재 상태 백업
    commitState(nextState: AppState): boolean; // 원자적 상태 저장
} // 구조 종료

interface AppProviderProps // 공급자 속성
{ // 구조 시작
    children: ReactNode; // 하위 요소
    initialState?: AppState; // 테스트 초기 상태
    repository?: StateRepository; // 저장소 주입
} // 구조 종료

const AppContext = createContext<AppStore | null>(null); // 앱 문맥
const quotaGuide = "개인정보 및 보안의 데이터 관리에서 JSON으로 내보낸 뒤 오래된 대화를 정리해 주세요."; // 용량 정리 안내
const blockedMessage = "저장된 데이터를 읽지 못해 기본 상태로 시작했습니다. 기존 데이터를 보호하기 위해 이번 방문의 변경 내용은 저장하지 않습니다."; // 저장 차단 안내

function describeStorageFailure(error: unknown, quotaMessage: string, fallback: string): string // 저장 실패 문구
{ // 함수 시작
    return isStorageQuotaError(error) ? `${quotaMessage} ${quotaGuide}` : fallback; // 원인별 문구 반환
} // 함수 종료

export function AppProvider({ children, initialState = createInitialState(), repository }: AppProviderProps) // 앱 공급자
{ // 함수 시작
    const [state, dispatch] = useReducer(appReducer, initialState); // 상태 리듀서
    const [storageError, setStorageError] = useState<string | null>(null); // 저장 오류 상태
    const [storageNotice, setStorageNotice] = useState<StorageNotice | null>(null); // 저장소 안내 상태
    const [restored, setRestored] = useState(repository !== undefined); // 저장 복원 상태
    const hydrated = useRef(false); // 복원 완료 표시
    const persistenceBlocked = useRef(false); // 저장 차단 표시
    useEffect(() => // 최초 복원 효과
    { // 효과 시작
        let cancelled = false; // 취소 표시
        hydrated.current = false; // 저장 대기
        let outcome: LoadResult | null = null; // 읽기 결과
        try // 읽기 시도
        { // 시도 시작
            outcome = repository !== undefined ? { state: repository.load(), recovered: false, warning: null } : new LocalStorageGateway(window.localStorage).load(); // 저장 상태 읽기
        } // 시도 종료
        catch // 읽기 실패 처리
        { // 실패 시작
            outcome = null; // 실패 표시
        } // 실패 종료
        queueMicrotask(() => // 비동기 복원 예약
        { // 작업 시작
            if (cancelled) // 취소 판정
            { // 조건 시작
                return; // 복원 생략
            } // 조건 종료
            if (outcome === null) // 읽기 실패 판정
            { // 조건 시작
                persistenceBlocked.current = true; // 기존 데이터 덮어쓰기 차단
                setStorageError(blockedMessage); // 차단 안내
            } // 조건 종료
            else // 읽기 성공 처리
            { // 성공 시작
                persistenceBlocked.current = false; // 저장 허용
                dispatch({ type: "replace-state", state: outcome.state }); // 저장 상태 복원
                setStorageNotice(outcome.warning === null ? null : { tone: outcome.recovered ? "warning" : "info", message: outcome.warning }); // 복구·변환 안내
            } // 성공 종료
            hydrated.current = true; // 복원 완료
            setRestored(true); // 화면 복원 완료
        }); // 작업 종료
        return () => // 효과 정리
        { // 정리 시작
            cancelled = true; // 예약 취소
        }; // 정리 종료
    }, [repository]); // 저장소 변경 의존
    useEffect(() => // 상태 저장 효과
    { // 효과 시작
        if (!hydrated.current || persistenceBlocked.current) // 복원 전·차단 판정
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
        catch (error: unknown) // 저장 실패 처리
        { // 오류 시작
            const message = describeStorageFailure(error, "브라우저 저장공간이 가득 차 최근 변경 내용을 저장하지 못했습니다.", "저장하지 못했습니다. 브라우저 저장공간을 확인해 주세요."); // 원인별 안내
            queueMicrotask(() => setStorageError(message)); // 오류 안내 예약
        } // 오류 종료
    }, [repository, state]); // 상태 변경 의존
    const createBackup = useCallback((reason: BackupReason): boolean => // 상태 백업 함수
    { // 함수 시작
        if (persistenceBlocked.current) // 저장 차단 판정
        { // 차단 시작
            setStorageError(blockedMessage); // 차단 안내
            return false; // 백업 실패 반환
        } // 차단 종료
        try // 백업 시도
        { // 시도 시작
            if (repository?.createBackup !== undefined) // 주입 백업 확인
            { // 주입 백업 시작
                repository.createBackup(state, reason); // 주입 상태 백업
            } // 주입 백업 종료
            else // 기본 백업 선택
            { // 기본 백업 시작
                new LocalStorageGateway(window.localStorage).createBackupFromState(state, reason); // 브라우저 상태 백업
            } // 기본 백업 종료
            setStorageError(null); // 백업 오류 해제
            return true; // 백업 성공 반환
        } // 시도 종료
        catch (error: unknown) // 백업 오류 처리
        { // 오류 시작
            setStorageError(describeStorageFailure(error, "브라우저 저장공간이 가득 차 백업하지 못했습니다. 삭제를 중단했습니다.", "백업하지 못했습니다. 삭제를 중단했습니다.")); // 백업 오류 안내
            return false; // 백업 실패 반환
        } // 오류 종료
    }, [repository, state]); // 함수 종료
    const commitState = useCallback((nextState: AppState): boolean => // 원자적 상태 저장 함수
    { // 함수 시작
        if (persistenceBlocked.current) // 저장 차단 판정
        { // 차단 시작
            setStorageError(blockedMessage); // 차단 안내
            return false; // 저장 실패 반환
        } // 차단 종료
        try // 저장 시도
        { // 시도 시작
            if (repository !== undefined) // 주입 저장소 판정
            { // 조건 시작
                repository.save(nextState); // 주입 저장 실행
            } // 조건 종료
            else // 기본 저장소 선택
            { // 기본 시작
                new LocalStorageGateway(window.localStorage).save(nextState); // 브라우저 저장 실행
            } // 기본 종료
            hydrated.current = false; // 중복 저장 보류
            dispatch({ type: "replace-state", state: nextState }); // 메모리 상태 확정
            queueMicrotask(() => // 저장 상태 정리 예약
            { // 작업 시작
                hydrated.current = true; // 자동 저장 재개
                setStorageError(null); // 저장 오류 해제
            }); // 작업 종료
            return true; // 저장 성공 반환
        } // 시도 종료
        catch (error: unknown) // 저장 실패 처리
        { // 실패 시작
            setStorageError(describeStorageFailure(error, "브라우저 저장공간이 가득 차 변경 내용을 적용하지 않았습니다.", "저장하지 못해 변경 내용을 적용하지 않았습니다.")); // 저장 오류 안내
            return false; // 저장 실패 반환
        } // 실패 종료
    }, [repository]); // 함수 종료
    const dismissStorageNotice = useCallback(() => setStorageNotice(null), []); // 안내 닫기 함수
    const value = useMemo(() => ({ state, dispatch, storageError, storageNotice, dismissStorageNotice, createBackup, commitState }), [commitState, createBackup, dismissStorageNotice, state, storageError, storageNotice]); // 문맥 값
    return <AppContext.Provider value={value}>{restored ? children : <p role="status">로컬 대화를 불러오는 중입니다.</p>}</AppContext.Provider>; // 공급자 반환
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
