"use client"; // 클라이언트 컴포넌트

import { useCallback, useEffect, useRef, useState } from "react"; // 리액트 도구
import { DialogFrame } from "@chatbot/components/dialog/DialogFrame"; // 확인 대화상자 틀
import { getAuthAdapter, signOutAndLeave, type Navigate } from "@chatbot/features/account/account-actions"; // 계정 동작(다시 로그인)
import { setSyncStatus, useSyncStatus } from "@chatbot/features/account/sync-status"; // 맞추기 상태
import { useAccountSession } from "@chatbot/features/account/use-account-session"; // 계정 세션
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import styles from "@chatbot/features/account/AccountSync.module.css"; // 맞추기 화면 스타일
import { AccountSyncRunner } from "@chatbot/lib/account/account-sync"; // 맞추기 도구
import { getAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정
import type { AuthAdapter } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { getAppStorage } from "@chatbot/lib/account/scoped-storage"; // 로그인한 계정의 저장 칸
import { createPracticeSnapshotStore, type SnapshotStore } from "@chatbot/lib/account/snapshot-store"; // 서버 저장 계약
import { createSupabaseSnapshotStore } from "@chatbot/lib/account/supabase-account"; // 실제 서버 저장(Supabase)
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜 형식
import { LocalStorageGateway } from "@chatbot/lib/repositories/local-storage-gateway"; // 로컬 저장소(가져온 데이터 검사)

export const SYNC_DELAY_MS = 2500; // 바뀐 뒤 서버에 올리기까지 기다리는 시간(연달아 바뀌면 한 번만 올림)
const GUEST_STATE_KEY = "mateverse:v1:state"; // 손님 데이터 저장 키
const GUEST_OFFER_KEY = "mateverse:v1:guest-offer"; // 손님 데이터를 가져올지 물어볼 상태(계정 칸에 저장: pending·done)

export function getSnapshotStore(): SnapshotStore // 지금 쓰는 서버 저장 구현(계정 서비스를 켰으면 Supabase, 아니면 연습용)
{ // 함수 시작
    const config = getAccountServiceConfig(); // 계정 서비스 설정
    return config.mode === "supabase" ? createSupabaseSnapshotStore(config, { storage: window.localStorage }) : createPracticeSnapshotStore(window.localStorage); // 서버 저장 구현
} // 함수 종료

function hasGuestData(): boolean // 이 브라우저에 손님으로 쓰던 데이터가 있는지
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        return window.localStorage.getItem(GUEST_STATE_KEY) !== null; // 손님 데이터 유무
    } // 시도 종료
    catch // 저장소 접근 실패
    { // 실패 시작
        return false; // 없는 것으로 봄
    } // 실패 종료
} // 함수 종료

export function AccountSync({ store, delayMs = SYNC_DELAY_MS, auth, navigate }: { store?: SnapshotStore; delayMs?: number; auth?: AuthAdapter; navigate?: Navigate }) // 계정 데이터 맞추기(로그인했을 때만 동작: 서버에 올리고 받고, 겹치면 고르게 하고, 로그인이 끝나면 다시 로그인하게 함)
{ // 함수 시작
    const session = useAccountSession(); // 지금 로그인한 계정
    const { state, commitState, createBackup } = useAppStore(); // 앱 상태
    const status = useSyncStatus(); // 맞추기 상태
    const latest = useRef({ state, commitState, createBackup }); // 가장 최근 앱 상태와 저장 함수(맞추기 도구가 읽음)
    const runner = useRef<AccountSyncRunner | null>(null); // 맞추기 도구
    const busy = useRef(false); // 맞추는 중
    const again = useRef(false); // 맞추는 동안 또 바뀌어 한 번 더 맞춰야 함
    const [, setOfferTick] = useState(0); // 가져오기 물음의 상태가 바뀌었을 때 다시 그리기
    const [notice, setNotice] = useState(""); // 가져오기 결과 안내
    const [loginNoticeClosed, setLoginNoticeClosed] = useState(false); // 로그인이 끝났다는 안내를 닫았는지
    const [leaving, setLeaving] = useState(false); // 다시 로그인하러 가는 중
    const accountId = session?.accountId ?? null; // 계정 식별자
    useEffect(() => // 가장 최근 값 기억
    { // 효과 시작
        latest.current = { state, commitState, createBackup }; // 값 갱신
    }); // 그릴 때마다
    const run = useCallback(async (): Promise<void> => // 맞추기 실행(겹쳐 부르면 끝난 뒤 한 번 더)
    { // 함수 시작
        const active = runner.current; // 맞추기 도구
        if (active === null || active.hasConflict() || active.needsLogin()) // 로그인하지 않음·겹침을 아직 풀지 않음·로그인이 끝남
        { // 조건 시작
            return; // 생략(겹쳤을 때는 사람이 고를 때까지, 로그인이 끝났을 때는 다시 로그인할 때까지 자동으로 맞추지 않음)
        } // 조건 종료
        if (busy.current) // 이미 맞추는 중
        { // 조건 시작
            again.current = true; // 끝나면 한 번 더
            return; // 대기
        } // 조건 종료
        busy.current = true; // 시작
        try // 맞추기
        { // 시도 시작
            do // 그 사이 또 바뀌었으면 반복
            { // 반복 시작
                again.current = false; // 요청 지움
                await active.sync(); // 서버와 맞춤
            } // 반복 종료
            while (again.current); // 한 번 더 판정
        } // 시도 종료
        finally // 정리
        { // 정리 시작
            busy.current = false; // 끝
        } // 정리 종료
    }, []); // 처음 한 번
    useEffect(() => // 로그인하면 맞추기 시작
    { // 효과 시작
        if (accountId === null) // 손님
        { // 조건 시작
            return; // 맞추지 않음
        } // 조건 종료
        const storage = getAppStorage(); // 계정 칸
        const snapshots = store ?? getSnapshotStore(); // 서버 저장
        runner.current = new AccountSyncRunner(snapshots, accountId, { // 맞추기 도구
            storage, // 맞춤 기록 저장소
            read: () => JSON.stringify(latest.current.state), // 지금 앱 데이터
            apply: (raw, protect) => // 서버 저장본 적용
            { // 함수 시작
                try // 적용 시도
                { // 시도 시작
                    const prepared = new LocalStorageGateway(storage).prepareImport(raw); // 검사와 버전 변환
                    return (!protect || latest.current.createBackup("sync")) && latest.current.commitState(prepared.state); // 필요하면 이 기기 데이터를 백업한 뒤 적용
                } // 시도 종료
                catch // 쓸 수 없는 저장본
                { // 실패 시작
                    return false; // 이 기기 데이터를 그대로 둠
                } // 실패 종료
            }, // 함수 종료
        }, (next) => // 상태 알림
        { // 알림 시작
            if (next.created === true && hasGuestData() && storage.getItem(GUEST_OFFER_KEY) === null) // 새 계정이고 손님 데이터가 있음
            { // 조건 시작
                storage.setItem(GUEST_OFFER_KEY, "pending"); // 가져올지 물어보기
            } // 조건 종료
            setSyncStatus({ ...next, mode: snapshots.mode }); // 화면에 알림
        }); // 도구 생성 종료
        void run(); // 처음 맞춤
        const onFocus = () => void run(); // 창으로 돌아오면 다른 기기의 변경을 확인
        window.addEventListener("focus", onFocus); // 구독
        return () => // 정리
        { // 정리 시작
            window.removeEventListener("focus", onFocus); // 구독 해제
            runner.current = null; // 도구 해제
            setSyncStatus(null); // 상태 지움
        }; // 정리 종료
    }, [accountId, run, store]); // 계정이 바뀌면 다시
    useEffect(() => // 앱 데이터가 바뀌면 잠시 뒤 서버에 올림
    { // 효과 시작
        if (accountId === null) // 손님
        { // 조건 시작
            return; // 올리지 않음
        } // 조건 종료
        const timer = window.setTimeout(() => void run(), delayMs); // 잠시 뒤 맞춤
        return () => window.clearTimeout(timer); // 그 사이 또 바뀌면 다시 기다림
    }, [accountId, delayMs, run, state]); // 상태가 바뀔 때마다
    if (accountId === null) // 손님
    { // 조건 시작
        return null; // 아무것도 그리지 않음
    } // 조건 종료
    const storage = getAppStorage(); // 계정 칸
    const offerPending = storage.getItem(GUEST_OFFER_KEY) === "pending"; // 손님 데이터를 가져올지 물어보는 중
    const closeOffer = () => // 물음 닫기
    { // 함수 시작
        storage.setItem(GUEST_OFFER_KEY, "done"); // 다시 묻지 않음
        setOfferTick((value) => value + 1); // 다시 그림
    }; // 함수 종료
    const importGuest = () => // 손님 데이터를 이 계정으로 가져오기
    { // 함수 시작
        try // 가져오기 시도
        { // 시도 시작
            const raw = window.localStorage.getItem(GUEST_STATE_KEY); // 손님 데이터
            const prepared = raw === null ? null : new LocalStorageGateway(storage).prepareImport(raw); // 검사와 버전 변환
            if (prepared === null || !createBackup("import") || !commitState(prepared.state)) // 데이터 없음·백업 실패·저장 실패
            { // 조건 시작
                throw new Error("guest import failed"); // 실패 처리로
            } // 조건 종료
            setNotice(t("이 브라우저에서 쓰던 데이터를 이 계정으로 가져왔어요.")); // 성공 안내
        } // 시도 종료
        catch // 가져오기 실패
        { // 실패 시작
            setNotice(t("데이터를 가져오지 못했어요. 개인정보 및 보안의 데이터 관리에서 JSON 파일로 옮길 수 있어요.")); // 실패 안내
        } // 실패 종료
        closeOffer(); // 물음 닫기
    }; // 함수 종료
    const conflict = (status.phase === "conflict" || status.phase === "syncing") && status.remote !== undefined ? status.remote : null; // 겹친 서버 저장본(고른 쪽으로 맞추는 동안에도 창을 그대로 둠)
    const resolving = status.phase === "syncing"; // 고른 쪽으로 맞추는 중
    const resolve = (choice: "keep-local" | "take-remote") => // 겹침 풀기
    { // 함수 시작
        void runner.current?.resolve(choice); // 고른 쪽으로 맞춤
    }; // 함수 종료
    const loginAgain = () => // 다시 로그인하러 가기(이 기기에서는 로그아웃하고 로그인 화면으로. 계정 데이터는 이 기기에 남음)
    { // 함수 시작
        setLeaving(true); // 두 번 누르지 못하게
        void signOutAndLeave(auth ?? getAuthAdapter(), navigate, "/login"); // 로그아웃한 뒤 로그인 화면으로
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 맞추기 화면 요소 */}
            {status.phase !== "signed-out" || loginNoticeClosed ? null : ( // 로그인이 끝났는지 판정
                <aside className={styles.offer} role="status" aria-label={t("로그인 안내")}> {/* 로그인이 끝났다는 안내 */}
                    <strong>{t("로그인이 끝났어요")}</strong> {/* 제목 */}
                    <p>{t("바꾼 내용은 이 기기에는 계속 저장돼요. 다시 로그인하면 서버에도 이어서 저장하고 다른 기기에서도 볼 수 있어요.")}</p> {/* 설명 */}
                    <div><button type="button" className={styles.primary} disabled={leaving} onClick={loginAgain}>{t("다시 로그인")}</button><button type="button" className={styles.secondary} onClick={() => setLoginNoticeClosed(true)}>{t("나중에")}</button></div> {/* 선택 */}
                </aside> // 로그인 안내 종료
            )} {/* 로그인 안내 판정 종료 */}
            {!offerPending ? null : ( // 가져오기 물음 판정
                <aside className={styles.offer} role="status" aria-label={t("손님 데이터 가져오기")}> {/* 가져오기 물음 */}
                    <strong>{t("이 브라우저에서 쓰던 데이터를 가져올까요?")}</strong> {/* 제목 */}
                    <p>{t("로그인하기 전에 이 브라우저에서 만든 캐릭터와 대화, 토큰을 이 계정으로 복사해요. 가져오지 않으면 새 계정으로 시작해요.")}</p> {/* 설명 */}
                    <div><button type="button" className={styles.primary} onClick={importGuest}>{t("가져오기")}</button><button type="button" className={styles.secondary} onClick={closeOffer}>{t("새로 시작")}</button></div> {/* 선택 */}
                </aside> // 가져오기 물음 종료
            )} {/* 가져오기 물음 판정 종료 */}
            {notice.length === 0 ? null : <p className={styles.offer} role="status"><span>{notice}</span><button type="button" className={styles.secondary} onClick={() => setNotice("")}>{t("닫기")}</button></p>} {/* 가져오기 결과 */}
            {conflict === null ? null : ( // 겹침 판정
                <DialogFrame backdropClassName={styles.backdrop} className={styles.dialog} labelledBy="sync-conflict-title" onClose={() => undefined}> {/* 겹침 선택 창(둘 중 하나를 골라야 닫힘) */}
                    <span>SYNC</span> {/* 표시 */}
                    <h2 id="sync-conflict-title">{t("어느 쪽 데이터를 남길까요?")}</h2> {/* 제목 */}
                    <p>{t("이 계정의 데이터가 다른 기기에서도 바뀌었어요. 고르지 않은 쪽의 변경은 사라져요. 서버 데이터를 받으면 이 기기의 데이터는 백업해 둬요.")}</p> {/* 설명 */}
                    <p>{t("서버에 마지막으로 저장한 시각: {0}", [new Date(conflict.updatedAt).toLocaleString(localeTag())])}</p> {/* 서버 저장 시각 */}
                    <div><button type="button" disabled={resolving} onClick={() => resolve("keep-local")}>{t("이 기기 데이터 남기기")}</button><button type="button" disabled={resolving} onClick={() => resolve("take-remote")}>{t("서버 데이터 받기")}</button></div> {/* 선택(맞추는 동안에는 누르지 못함) */}
                </DialogFrame> // 겹침 선택 창 종료
            )} {/* 겹침 판정 종료 */}
        </> // 화면 요소 종료
    ); // 반환 종료
} // 함수 종료
