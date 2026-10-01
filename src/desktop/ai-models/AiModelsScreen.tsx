"use client"; // 클라이언트 컴포넌트

import { useCallback, useEffect, useState, type ReactElement } from "react"; // 리액트 도구
import { describeHardware, describeRuntime, FITNESS_LABELS, formatGigabytes, formatProgress, ROLE_LABELS, toModelErrorMessage } from "@/desktop/ai-models/ai-model-view"; // 표시 도구
import styles from "@/desktop/ai-models/AiModelsScreen.module.css"; // 화면 스타일
import type { ModelStoreClient, ModelView, RuntimeStatus, StoreView } from "@/desktop/ai-models/model-store-client"; // 보관함 계약

interface AiModelsScreenProps // 화면 속성
{ // 구조 시작
    client: ModelStoreClient; // 모델 보관함 통신기
} // 구조 종료

interface DownloadProgress // 받는 중 상태
{ // 구조 시작
    receivedBytes: number; // 받은 크기
    totalBytes: number; // 전체 크기
    bytesPerSecond: number; // 속도
    verifying: boolean; // 검사 중
} // 구조 종료

export function AiModelsScreen({ client }: AiModelsScreenProps): ReactElement // AI 모델 화면
{ // 함수 시작
    const [store, setStore] = useState<StoreView | null>(null); // 보관함 정보
    const [runtime, setRuntime] = useState<RuntimeStatus | null>(null); // 엔진 상태
    const [loadFailed, setLoadFailed] = useState(false); // 불러오기 실패
    const [progress, setProgress] = useState<Record<string, DownloadProgress>>({}); // 받는 중 모델
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null); // 삭제 확인 중 모델
    const [notice, setNotice] = useState<string | null>(null); // 안내 문구
    const load = useCallback(() => Promise.all([client.getStore(), client.getRuntimeStatus()]), [client]); // 보관함·엔진 조회
    const refresh = async () => // 정보 다시 읽기
    { // 함수 시작
        try // 조회 시도
        { // 시도 시작
            const [nextStore, nextRuntime] = await load(); // 조회
            setStore(nextStore); // 보관함 반영
            setRuntime(nextRuntime); // 엔진 반영
            setLoadFailed(false); // 실패 해제
        } // 시도 종료
        catch // 조회 실패
        { // 실패 시작
            setLoadFailed(true); // 실패 표시
        } // 실패 종료
    }; // 함수 종료
    useEffect(() => // 처음 불러오기
    { // 효과 시작
        let cancelled = false; // 취소 상태
        load().then(([nextStore, nextRuntime]) => // 조회 성공
        { // 처리 시작
            if (!cancelled) // 취소 확인
            { // 조건 시작
                setStore(nextStore); // 보관함 반영
                setRuntime(nextRuntime); // 엔진 반영
            } // 조건 종료
        }, () => // 조회 실패
        { // 처리 시작
            if (!cancelled) // 취소 확인
            { // 조건 시작
                setLoadFailed(true); // 실패 표시
            } // 조건 종료
        }); // 처리 종료
        return () => // 정리
        { // 정리 시작
            cancelled = true; // 늦은 결과 무시
        }; // 정리 종료
    }, [load]); // 조회 함수 의존
    const updateProgress = (modelId: string, next: Partial<DownloadProgress>) => // 진행 상태 갱신
    { // 함수 시작
        setProgress((current) => ({ ...current, [modelId]: { ...(current[modelId] ?? { receivedBytes: 0, totalBytes: 0, bytesPerSecond: 0, verifying: false }), ...next } })); // 모델 진행 상태 반영
    }; // 함수 종료
    const download = async (model: ModelView) => // 모델 받기
    { // 함수 시작
        setNotice(null); // 안내 지우기
        updateProgress(model.id, { receivedBytes: model.downloadedBytes, totalBytes: model.sizeBytes, bytesPerSecond: 0, verifying: false }); // 시작 상태
        try // 받기 시도
        { // 시도 시작
            await client.download(model.id, (event) => // 진행 사건 처리
            { // 처리 시작
                if (event.type === "progress") // 진행률 확인
                { // 조건 시작
                    updateProgress(model.id, { receivedBytes: event.receivedBytes, totalBytes: event.totalBytes, bytesPerSecond: event.bytesPerSecond }); // 진행률 반영
                } // 조건 종료
                else if (event.type === "verifying") // 검사 확인
                { // 조건 시작
                    updateProgress(model.id, { verifying: true }); // 검사 중 반영
                } // 조건 종료
            }); // 처리 종료
            setNotice(`${model.label} 다운로드를 마쳤습니다. 사용하기를 누르면 내장 AI가 이 모델로 대답합니다.`); // 완료 안내
        } // 시도 종료
        catch (error) // 받기 실패
        { // 실패 시작
            setNotice(toModelErrorMessage(error)); // 실패 안내
        } // 실패 종료
        finally // 정리
        { // 정리 시작
            setProgress((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== model.id))); // 진행 상태 제거
            await refresh(); // 정보 다시 읽기
        } // 정리 종료
    }; // 함수 종료
    const runAction = async (action: () => Promise<void>, done: string) => // 선택·삭제·끄기 공통 처리
    { // 함수 시작
        setNotice(null); // 안내 지우기
        try // 실행 시도
        { // 시도 시작
            await action(); // 동작 실행
            setNotice(done); // 완료 안내
        } // 시도 종료
        catch (error) // 실행 실패
        { // 실패 시작
            setNotice(toModelErrorMessage(error)); // 실패 안내
        } // 실패 종료
        setConfirmingDelete(null); // 삭제 확인 닫기
        await refresh(); // 정보 다시 읽기
    }; // 함수 종료
    const renderActions = (model: ModelView): ReactElement => // 모델 카드 버튼
    { // 함수 시작
        const current = progress[model.id]; // 받는 중 상태
        if (current !== undefined) // 받는 중 확인
        { // 조건 시작
            const shown = formatProgress(current.receivedBytes, current.totalBytes || model.sizeBytes, current.bytesPerSecond); // 진행률 표시
            return ( // 진행률 반환
                <div className={styles.progress}> {/* 진행률 묶음 */}
                    <div className={styles.progressTrack} role="progressbar" aria-label={`${model.label} 다운로드 진행률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown.percent}><span style={{ width: `${shown.percent}%` }} /></div> {/* 진행 막대 */}
                    <p>{current.verifying ? "받은 파일을 검사하고 있습니다" : shown.text}</p> {/* 진행 문구 */}
                    <button type="button" className={styles.secondary} onClick={() => void client.cancel(model.id)}>취소</button> {/* 취소 */}
                </div> // 진행률 종료
            ); // 반환 종료
        } // 조건 종료
        if (model.status === "installed") // 설치 확인
        { // 조건 시작
            return ( // 설치된 모델 버튼
                <div className={styles.actions}> {/* 버튼 묶음 */}
                    {model.active ? null : <button type="button" className={styles.primary} onClick={() => void runAction(() => client.select(model.id), `${model.label}을(를) 내장 AI 모델로 정했습니다.`)}>사용하기</button>} {/* 사용하기 */}
                    {confirmingDelete === model.id // 삭제 확인 중 확인
                        ? <><span className={styles.confirm}>정말 삭제할까요?</span><button type="button" className={styles.danger} onClick={() => void runAction(() => client.remove(model.id), `${model.label}을(를) 삭제했습니다.`)}>삭제 확인</button><button type="button" className={styles.secondary} onClick={() => setConfirmingDelete(null)}>그만두기</button></> // 삭제 확인
                        : <button type="button" className={styles.secondary} onClick={() => setConfirmingDelete(model.id)}>삭제</button>} {/* 삭제 */}
                </div> // 버튼 묶음 종료
            ); // 반환 종료
        } // 조건 종료
        if (!model.available) // 받기 정보 확인
        { // 조건 시작
            return <div className={styles.actions}><button type="button" className={styles.primary} disabled>준비 중</button></div>; // 준비 중
        } // 조건 종료
        if (!model.hasRoom) // 공간 확인
        { // 조건 시작
            return <div className={styles.actions}><button type="button" className={styles.primary} disabled>공간 부족</button></div>; // 공간 부족
        } // 조건 종료
        if (model.status === "downloading") // 다른 곳에서 받는 중 확인
        { // 조건 시작
            return <div className={styles.actions}><button type="button" className={styles.primary} disabled>받는 중</button></div>; // 받는 중
        } // 조건 종료
        const label = model.downloadedBytes > 0 ? "이어받기" : model.fitness === "insufficient" ? "그래도 다운로드" : "다운로드"; // 받기 버튼 이름
        return <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => void download(model)}>{label}</button></div>; // 받기 버튼
    }; // 함수 종료
    return ( // 화면 반환
        <main className={styles.page}> {/* 화면 */}
            <header className={styles.header}> {/* 머리말 */}
                <span>내장 AI</span> {/* 작은 제목 */}
                <h1>AI 모델</h1> {/* 제목 */}
                <p>이 PC에서 인터넷 없이 Text-Play 응답을 만드는 AI 모델을 받고 고릅니다. 대화 내용은 PC 밖으로 나가지 않습니다.</p> {/* 설명 */}
            </header> {/* 머리말 종료 */}
            {loadFailed ? <p className={styles.alert} role="alert">AI 모델 정보를 불러오지 못했습니다. Windows 실행 프로그램에서 사용할 수 있습니다.</p> : null} {/* 불러오기 실패 */}
            {store === null || runtime === null // 정보 확인
                ? (loadFailed ? null : <p className={styles.loading}>AI 모델 정보를 불러오고 있습니다.</p>) // 불러오는 중
                : <> {/* 정보 묶음 */}
                    <div className={styles.summary}> {/* 요약 */}
                        <section aria-labelledby="ai-models-pc"> {/* PC 사양 */}
                            <h2 id="ai-models-pc">이 PC</h2> {/* 제목 */}
                            <p>{describeHardware(store.hardware, store.freeDiskBytes)}</p> {/* 사양 */}
                        </section> {/* PC 사양 종료 */}
                        <section aria-labelledby="ai-models-engine"> {/* 엔진 상태 */}
                            <h2 id="ai-models-engine">실행 엔진</h2> {/* 제목 */}
                            <p>{describeRuntime(runtime)}</p> {/* 상태 */}
                            {runtime.state === "ready" ? <button type="button" className={styles.secondary} onClick={() => void runAction(() => client.stopRuntime(), "실행 엔진을 껐습니다.")}>엔진 끄기</button> : null} {/* 끄기 */}
                        </section> {/* 엔진 상태 종료 */}
                    </div> {/* 요약 종료 */}
                    {notice === null ? null : <p className={styles.notice} role="status">{notice}</p>} {/* 안내 */}
                    <div className={styles.cards}> {/* 모델 카드 목록 */}
                        {store.models.map((model) => // 모델 순회
                            <article key={model.id} className={styles.card} data-role={model.role} data-active={model.active} aria-labelledby={`ai-model-${model.id}`}> {/* 모델 카드 */}
                                <span className={styles.role}>{ROLE_LABELS[model.role]}</span> {/* 역할 */}
                                <h2 id={`ai-model-${model.id}`}>{model.label}</h2> {/* 이름 */}
                                <p className={styles.meta}>{`${formatGigabytes(model.sizeBytes, !model.available)} · ${model.license}`}</p> {/* 크기·라이선스 */}
                                <p className={styles.fitness} data-fitness={model.fitness}>{`이 PC: ${FITNESS_LABELS[model.fitness]}`}</p> {/* 적합도 */}
                                {model.fitness === "insufficient" ? <p className={styles.warning}>이 PC 사양으로는 부족할 수 있습니다.</p> : null} {/* 부족 경고 */}
                                {model.active ? <span className={styles.active}>사용 중</span> : null} {/* 사용 중 */}
                                {renderActions(model)} {/* 버튼 */}
                            </article> // 카드 종료
                        )} {/* 순회 종료 */}
                    </div> {/* 카드 목록 종료 */}
                    <p className={styles.tip}>Text-Play 플레이 화면 오른쪽 위 AI 선택에서 &lsquo;내장 AI(이 PC)&rsquo;를 고르면 사용 중 모델이 대답합니다. 모델을 받기 전에는 임시 인공지능을 쓰면 됩니다.</p> {/* 사용 안내 */}
                </>} {/* 정보 묶음 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
