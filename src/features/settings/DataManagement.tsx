"use client"; // 클라이언트 컴포넌트

import { useEffect, useState, type ChangeEvent } from "react"; // 리액트 상태
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태
import { downloadJsonFile } from "@/features/settings/data-download"; // 파일 다운로드
import { ImportValidationError, LocalStorageGateway, type BackupSnapshot, type PreparedImport } from "@/lib/repositories/local-storage-gateway"; // 로컬 저장소
import styles from "@/features/settings/SettingsScreen.module.css"; // 설정 스타일

function readFile(file: File): Promise<string> // 파일 읽기 함수
{ // 함수 시작
    return new Promise((resolve, reject) => // 읽기 약속 생성
    { // 약속 시작
        const reader = new FileReader(); // 파일 읽기 도구
        reader.addEventListener("load", () => resolve(typeof reader.result === "string" ? reader.result : "")); // 읽기 완료 처리
        reader.addEventListener("error", () => reject(reader.error)); // 읽기 실패 처리
        reader.readAsText(file); // 텍스트 읽기 시작
    }); // 약속 종료
} // 함수 종료

function reasonLabel(reason: BackupSnapshot["reason"]): string // 백업 사유 변환
{ // 함수 시작
    const labels = { manual: "수동", import: "가져오기 전", reset: "초기화 전", restore: "복구 전", recovery: "자동 복구" }; // 사유 목록
    return labels[reason]; // 사유 이름 반환
} // 함수 종료

function createGateway(): LocalStorageGateway // 저장소 생성 함수
{ // 함수 시작
    return new LocalStorageGateway(window.localStorage); // 브라우저 저장소 반환
} // 함수 종료

export function DataManagement() // 데이터 관리 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [prepared, setPrepared] = useState<PreparedImport | null>(null); // 가져오기 준비 상태
    const [backups, setBackups] = useState<BackupSnapshot[]>([]); // 백업 목록
    const [status, setStatus] = useState(""); // 작업 상태
    const [error, setError] = useState(""); // 오류 상태
    const refreshBackups = () => setBackups(createGateway().listBackups()); // 백업 목록 갱신
    useEffect(() => // 백업 복원 효과
    { // 효과 시작
        let cancelled = false; // 취소 상태
        queueMicrotask(() => // 비동기 복원 예약
        { // 작업 시작
            if (!cancelled) // 취소 여부 확인
            { // 조건 시작
                setBackups(createGateway().listBackups()); // 저장 백업 반영
            } // 조건 종료
        }); // 작업 종료
        return () => // 효과 정리 함수
        { // 정리 시작
            cancelled = true; // 예약 취소
        }; // 정리 종료
    }, []); // 최초 실행
    const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => // 파일 선택 함수
    { // 함수 시작
        const file = event.target.files?.[0]; // 선택 파일 조회
        setPrepared(null); // 기존 준비 해제
        setStatus(""); // 기존 상태 해제
        setError(""); // 기존 오류 해제
        if (file === undefined) // 파일 부재 확인
        { // 조건 시작
            return; // 처리 중단
        } // 조건 종료
        try // 파일 검증 시도
        { // 시도 시작
            const raw = await readFile(file); // 파일 내용 읽기
            setPrepared(createGateway().prepareImport(raw)); // 가져오기 준비
        } // 시도 종료
        catch (caught) // 검증 실패 처리
        { // 실패 시작
            setError(caught instanceof ImportValidationError ? caught.message : "JSON 파일을 읽지 못했습니다."); // 오류 안내 반영
        } // 실패 종료
    }; // 함수 종료
    const confirmImport = () => // 가져오기 실행 함수
    { // 함수 시작
        if (prepared === null) // 준비 부재 확인
        { // 조건 시작
            return; // 처리 중단
        } // 조건 종료
        try // 가져오기 시도
        { // 시도 시작
            const state = createGateway().importPrepared(prepared); // 검증 상태 저장
            dispatch({ type: "replace-state", state }); // 앱 상태 교체
            setPrepared(null); // 준비 상태 해제
            setStatus("데이터를 가져왔습니다."); // 성공 안내 반영
            refreshBackups(); // 백업 목록 갱신
        } // 시도 종료
        catch // 가져오기 실패 처리
        { // 실패 시작
            setError("가져오기 전에 현재 데이터를 백업하지 못했습니다."); // 실패 안내 반영
        } // 실패 종료
    }; // 함수 종료
    const createBackup = () => // 수동 백업 함수
    { // 함수 시작
        try // 백업 시도
        { // 시도 시작
            createGateway().createBackup("manual"); // 현재 상태 백업
            refreshBackups(); // 백업 목록 갱신
            setStatus("로컬 백업을 만들었습니다."); // 성공 안내 반영
            setError(""); // 오류 해제
        } // 시도 종료
        catch // 백업 실패 처리
        { // 실패 시작
            setError("로컬 백업을 만들지 못했습니다."); // 실패 안내 반영
        } // 실패 종료
    }; // 함수 종료
    const exportData = () => // 전체 내보내기 함수
    { // 함수 시작
        if (!window.confirm("내보내기 파일에는 비공개 프롬프트와 대화 내용이 포함될 수 있습니다.")) // 개인정보 확인
        { // 조건 시작
            return; // 다운로드 취소
        } // 조건 종료
        downloadJsonFile("mateverse-data.json", createGateway().exportJson()); // 전체 데이터 다운로드
    }; // 함수 종료
    const exportBackups = () => // 복구 백업 내보내기 함수
    { // 함수 시작
        const content = createGateway().exportBackupJson(); // 백업 내용 조회
        if (content !== null) // 백업 존재 확인
        { // 조건 시작
            downloadJsonFile("mateverse-recovery-backups.json", content); // 백업 파일 다운로드
        } // 조건 종료
    }; // 함수 종료
    const resetData = () => // 초기화 함수
    { // 함수 시작
        if (!window.confirm(`캐릭터 ${state.characters.length}명, 대화 ${state.conversations.length}개, 메시지 ${state.messages.length}개를 백업한 뒤 초기화합니다.`)) // 사용자 확인
        { // 조건 시작
            return; // 초기화 취소
        } // 조건 종료
        try // 초기화 시도
        { // 시도 시작
            const nextState = createGateway().reset(); // 데이터 초기화
            dispatch({ type: "replace-state", state: nextState }); // 앱 상태 교체
            refreshBackups(); // 백업 목록 갱신
            setStatus("초기 상태로 되돌렸습니다."); // 성공 안내 반영
            setError(""); // 오류 해제
        } // 시도 종료
        catch // 초기화 실패 처리
        { // 실패 시작
            setError("현재 데이터 백업에 실패해 초기화를 중단했습니다."); // 실패 안내 반영
        } // 실패 종료
    }; // 함수 종료
    const restore = (id: string) => // 백업 복구 함수
    { // 함수 시작
        if (!window.confirm("선택한 백업으로 현재 데이터를 바꿉니다.")) // 사용자 확인
        { // 조건 시작
            return; // 복구 취소
        } // 조건 종료
        try // 복구 시도
        { // 시도 시작
            const nextState = createGateway().restoreBackup(id); // 백업 상태 복구
            dispatch({ type: "replace-state", state: nextState }); // 앱 상태 교체
            refreshBackups(); // 백업 목록 갱신
            setStatus("백업을 복구했습니다."); // 성공 안내 반영
            setError(""); // 오류 해제
        } // 시도 종료
        catch // 복구 실패 처리
        { // 실패 시작
            setError("현재 데이터 백업에 실패해 복구를 중단했습니다."); // 실패 안내 반영
        } // 실패 종료
    }; // 함수 종료
    return ( // 화면 반환
        <div className={styles.section}> {/* 데이터 영역 */}
            <h2>데이터 관리</h2> {/* 영역 제목 */}
            <p>모든 데이터는 현재 브라우저에 저장됩니다. 중요한 변경 전 JSON 파일이나 로컬 백업을 만들어 두세요.</p> {/* 영역 설명 */}
            <div className={styles.actionRow}> {/* 내보내기 동작 */}
                <button type="button" className={styles.primary} onClick={exportData}>JSON 내보내기</button> {/* 내보내기 버튼 */}
                <button type="button" className={styles.secondary} onClick={createBackup}>로컬 백업 만들기</button> {/* 백업 버튼 */}
                {backups.length === 0 ? null : <button type="button" className={styles.secondary} onClick={exportBackups}>복구 백업 내보내기</button>} {/* 복구 백업 버튼 */}
            </div> {/* 동작 종료 */}
            <label>JSON 파일 선택<input type="file" accept="application/json,.json" onChange={chooseFile} /></label> {/* 파일 선택 */}
            {prepared === null ? null : <div className={styles.preview}><strong>가져온 데이터 미리보기</strong><span>스키마 {prepared.summary.schemaVersion}</span><span>캐릭터 {prepared.summary.characterCount}명 · 대화 {prepared.summary.conversationCount}개 · 메시지 {prepared.summary.messageCount}개</span><button type="button" className={styles.primary} onClick={confirmImport}>가져오기 확인</button></div>} {/* 가져오기 미리보기 */}
            <div className={styles.backupList}> {/* 백업 목록 */}
                <h3>최근 로컬 백업</h3> {/* 백업 제목 */}
                {backups.length === 0 ? <p>아직 백업이 없습니다.</p> : backups.map((backup) => <article key={backup.id}><div><strong>{reasonLabel(backup.reason)} 백업</strong><span>{backup.createdAt === null ? "시각 정보 없음" : new Date(backup.createdAt).toLocaleString("ko-KR")}</span></div><button type="button" className={styles.secondary} onClick={() => restore(backup.id)}>복구</button></article>)} {/* 백업 항목 */}
            </div> {/* 백업 목록 종료 */}
            <button type="button" className={styles.danger} onClick={resetData}>모든 로컬 데이터 초기화</button> {/* 초기화 버튼 */}
            {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 성공 안내 */}
            {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 안내 */}
        </div> // 데이터 영역 종료
    ); // 반환 종료
} // 함수 종료
