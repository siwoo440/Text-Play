import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 함수
import type { AppState } from "@chatbot/features/core/types"; // 도메인 타입
import { addMissingBuiltInStories, migrateParsedState, refreshBuiltInCreators } from "@chatbot/lib/repositories/state-migrations"; // 버전 변환
import { isAppState, isFiniteNumber, isOneOf, isRecord, isString } from "@chatbot/lib/repositories/state-validation"; // 데이터 검사
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export { addMissingBuiltInStories, migrateVersionEight, migrateVersionEleven, migrateVersionFifteen, migrateVersionFive, migrateVersionFourteen, migrateVersionNine, migrateVersionSeven, migrateVersionSix, migrateVersionSixteen, migrateVersionTen, migrateVersionThirteen, migrateVersionTwelve } from "@chatbot/lib/repositories/state-migrations"; // 기존 이름 유지(버전 변환)
export { isAppState } from "@chatbot/lib/repositories/state-validation"; // 기존 이름 유지(데이터 검사)

const stateKey = "mateverse:v1:state"; // 상태 저장 키
const backupKey = "mateverse:v1:backup"; // 예전 대표 백업 키(더 쓰지 않음. 남아 있으면 이력으로 옮기고 지움)
const BACKUP_LIMIT = 3; // 보통 백업 보관 개수(최근 순)
const RECOVERY_LIMIT = 2; // 손상 원본 보관 개수(보통 백업에 밀려 지워지지 않게 따로 셈)
const backupHistoryKey = "mateverse:v1:backup-history"; // 백업 이력 키
const backupReasons = ["manual", "import", "reset", "restore", "recovery", "message-delete", "version-delete", "conversation-delete", "character-delete", "story-delete", "image-delete", "sync"] as const; // 백업 사유 목록(sync: 서버 데이터를 받기 전)

export interface LoadResult // 읽기 결과 구조
{ // 구조 시작
    state: AppState; // 복원 상태
    recovered: boolean; // 복구 여부
    warning: string | null; // 경고 문구
} // 구조 종료

export interface DataSummary // 데이터 요약 구조
{ // 구조 시작
    schemaVersion: number; // 스키마 버전
    characterCount: number; // 캐릭터 수
    conversationCount: number; // 대화 수
    messageCount: number; // 메시지 수
    bookmarkCount: number; // 보관 수
} // 구조 종료

export interface PreparedImport // 가져오기 준비 구조
{ // 구조 시작
    state: AppState; // 검증 상태
    summary: DataSummary; // 데이터 요약
} // 구조 종료

export type BackupReason = typeof backupReasons[number]; // 백업 사유

export interface BackupSnapshot // 백업 구조
{ // 구조 시작
    id: string; // 백업 식별자
    createdAt: string | null; // 생성 시각
    reason: BackupReason; // 생성 사유
    summary: DataSummary | null; // 데이터 요약
} // 구조 종료

interface StoredBackup extends BackupSnapshot // 저장 백업 구조
{ // 구조 시작
    raw: string; // 원본 문자열
} // 구조 종료

export class StorageWriteError extends Error // 저장 오류 클래스
{ // 클래스 시작
    public constructor(cause: unknown) // 생성자
    { // 생성자 시작
        super(t("브라우저 저장공간에 데이터를 기록하지 못했습니다."), { cause }); // 오류 내용 설정
        this.name = "StorageWriteError"; // 오류 이름 설정
    } // 생성자 종료
} // 클래스 종료

const quotaErrorNames = new Set(["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"]); // 용량 초과 오류 이름

export function isStorageQuotaError(error: unknown): boolean // 저장공간 부족 판정
{ // 함수 시작
    const cause = error instanceof StorageWriteError ? error.cause : error; // 원인 오류 추출
    if (typeof cause !== "object" || cause === null) // 객체 오류 확인
    { // 조건 시작
        return false; // 판정 불가 반환
    } // 조건 종료
    const { name, code } = cause as { name?: unknown; code?: unknown }; // 오류 속성 조회
    return (typeof name === "string" && quotaErrorNames.has(name)) || code === 22 || code === 1014; // 브라우저별 용량 초과 반환
} // 함수 종료

export class ImportValidationError extends Error // 가져오기 오류 클래스
{ // 클래스 시작
    public constructor(message: string, cause?: unknown) // 생성자
    { // 생성자 시작
        super(message, cause === undefined ? undefined : { cause }); // 오류 내용 설정
        this.name = "ImportValidationError"; // 오류 이름 설정
    } // 생성자 종료
} // 클래스 종료

function writeItem(storage: Storage, key: string, value: string): void // 안전 저장 함수
{ // 함수 시작
    try // 저장 시도
    { // 시도 시작
        storage.setItem(key, value); // 항목 저장
    } // 시도 종료
    catch (error: unknown) // 저장 오류 처리
    { // 오류 시작
        throw new StorageWriteError(error); // 명시 오류 변환
    } // 오류 종료
} // 함수 종료

function summarizeState(state: AppState): DataSummary // 상태 요약 함수
{ // 함수 시작
    return ( // 요약 반환
    { // 요약 시작
        schemaVersion: state.schemaVersion, // 스키마 버전
        characterCount: state.characters.length, // 캐릭터 수
        conversationCount: state.conversations.length, // 대화 수
        messageCount: state.messages.length, // 메시지 수
        bookmarkCount: state.bookmarkedCharacterIds.length, // 보관 수
    }); // 요약 종료
} // 함수 종료

function parseImportState(raw: string): AppState // 가져오기 분석 함수
{ // 함수 시작
    let parsed: unknown; // 분석 결과
    try // JSON 분석 시도
    { // 시도 시작
        parsed = JSON.parse(raw); // JSON 분석
    } // 시도 종료
    catch (error: unknown) // 분석 실패 처리
    { // 실패 시작
        throw new ImportValidationError(t("올바른 JSON 파일이 아닙니다."), error); // 분석 오류 변환
    } // 실패 종료
    if (isRecord(parsed) && isFiniteNumber(parsed.schemaVersion) && parsed.schemaVersion > 18) // 미래 버전 판정
    { // 미래 버전 시작
        throw new ImportValidationError(t("지원하지 않는 데이터 버전입니다.")); // 미래 버전 오류
    } // 미래 버전 종료
    const state = migrateParsedState(parsed); // 상태 변환
    if (state === null) // 변환 실패 판정
    { // 변환 실패 시작
        throw new ImportValidationError(t("MATE:VERSE 상태 파일 형식이 아닙니다.")); // 형식 오류
    } // 변환 실패 종료
    return state; // 검증 상태 반환
} // 함수 종료

function isBackupReason(value: unknown): value is BackupReason // 백업 사유 판정 함수
{ // 함수 시작
    return isOneOf(value, backupReasons); // 사유 여부 반환
} // 함수 종료

function isStoredBackup(value: unknown): value is StoredBackup // 저장 백업 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && (value.createdAt === null || isString(value.createdAt)) // 생성 시각 확인
        && isBackupReason(value.reason) // 생성 사유 확인
        && isString(value.raw); // 원본 확인
} // 함수 종료

function readStoredBackups(storage: Storage): StoredBackup[] // 백업 이력 읽기 함수
{ // 함수 시작
    const rawHistory = storage.getItem(backupHistoryKey); // 백업 이력 조회
    let backups: StoredBackup[] = []; // 백업 목록 생성
    if (rawHistory !== null) // 이력 존재 판정
    { // 이력 존재 시작
        try // 이력 분석 시도
        { // 시도 시작
            const parsed: unknown = JSON.parse(rawHistory); // 이력 JSON 분석
            if (Array.isArray(parsed)) // 배열 판정
            { // 배열 시작
                backups = parsed.flatMap((item, index) => // 백업 변환
                { // 변환 시작
                    if (isString(item)) // 이전 문자열 판정
                    { // 이전 문자열 시작
                        return [{ id: `legacy-${index}`, createdAt: null, reason: "recovery" as const, summary: null, raw: item }]; // 이전 백업 변환
                    } // 이전 문자열 종료
                    return isStoredBackup(item) ? [{ ...item, summary: null }] : []; // 새 백업 반환
                }); // 변환 종료
            } // 배열 종료
        } // 시도 종료
        catch // 이력 분석 실패 처리
        { // 실패 시작
            backups = []; // 빈 이력 적용
        } // 실패 종료
    } // 이력 존재 종료
    const primary = storage.getItem(backupKey); // 예전 대표 백업 조회
    if (primary !== null && !backups.some((backup) => backup.raw === primary)) // 이력에 없는 예전 대표 백업
    { // 예전 대표 백업 시작
        backups.push({ id: "legacy-primary", createdAt: null, reason: isReadableState(primary) ? "manual" : "recovery", summary: null, raw: primary }); // 읽을 수 있으면 보통 백업, 아니면 손상 원본으로 목록 끝에 추가
    } // 예전 대표 백업 종료
    return backups; // 백업 목록 반환
} // 함수 종료

function isReadableState(raw: string): boolean // 지금 앱이 읽을 수 있는 저장 원본인지
{ // 함수 시작
    try // 분석 시도
    { // 시도 시작
        return migrateParsedState(JSON.parse(raw)) !== null; // 변환되면 읽을 수 있음
    } // 시도 종료
    catch // 분석 실패
    { // 실패 시작
        return false; // 읽을 수 없음
    } // 실패 종료
} // 함수 종료

function trimBackups(backups: StoredBackup[]): StoredBackup[] // 보관 한도 적용(보통 백업과 손상 원본을 따로 세고 순서는 유지)
{ // 함수 시작
    let normal = 0; // 남긴 보통 백업 수
    let recovery = 0; // 남긴 손상 원본 수
    return backups.filter((backup) => backup.reason === "recovery" ? recovery++ < RECOVERY_LIMIT : normal++ < BACKUP_LIMIT); // 종류별로 최근 것만
} // 함수 종료

function writeStoredBackups(storage: Storage, backups: StoredBackup[]): void // 백업 이력 쓰기 함수
{ // 함수 시작
    writeItem(storage, backupHistoryKey, JSON.stringify(trimBackups(backups))); // 한도 안의 이력 저장
    storage.removeItem(backupKey); // 예전 대표 백업은 이력으로 옮겼으니 지움(처음 한 번만 쓰이고 고쳐지지 않아 오래된 백업이 계속 남던 문제)
} // 함수 종료

function preserveCorruptedData(raw: string, storage: Storage): void // 손상 원본 보존 함수
{ // 함수 시작
    const backups = readStoredBackups(storage); // 기존 백업 수집
    if (backups.some((backup) => backup.raw === raw)) // 중복 원본 판정
    { // 중복 원본 시작
        return; // 중복 저장 생략
    } // 중복 원본 종료
    const now = new Date().toISOString(); // 보관 시각
    const entry: StoredBackup = { id: `recovery-${now}-${backups.length}`, createdAt: now, reason: "recovery", summary: null, raw }; // 복구 백업 생성
    writeStoredBackups(storage, [entry, ...backups]); // 복구 백업 저장(최근 순. 보통 백업과 따로 세어 밀려나지 않음)
} // 함수 종료

function rejectStoredState(raw: string, storage: Storage): LoadResult // 저장 상태 거부 함수
{ // 함수 시작
    preserveCorruptedData(raw, storage); // 원본 백업
    return { state: createInitialState(), recovered: true, warning: t("저장 데이터가 올바르지 않아 처음 상태로 시작합니다. 원본은 백업으로 보관했으니 개인정보 및 보안의 데이터 관리에서 복구 백업 내보내기로 확인해 주세요.") }; // 처음 상태 반환(이 함수는 원본을 건드리지 않지만, 앱이 곧 처음 상태를 저장하므로 그렇게 안내함)
} // 함수 종료

function recoverState(raw: string, storage: Storage): LoadResult // 손상 복구 함수
{ // 함수 시작
    const state = createInitialState(); // 초기 상태 생성
    preserveCorruptedData(raw, storage); // 원본 백업
    writeItem(storage, stateKey, JSON.stringify(state)); // 초기 상태 저장
    return { state, recovered: true, warning: t("손상된 저장 데이터를 백업하고 초기 상태로 복구했습니다.") }; // 복구 결과 반환
} // 함수 종료

function parseAndMigrate(raw: string, storage: Storage): LoadResult // 분석 변환 함수
{ // 함수 시작
    let parsed: unknown; // 분석 결과
    try // 분석 시도
    { // 시도 시작
        parsed = JSON.parse(raw); // JSON 분석
    } // 시도 종료
    catch // 분석 실패 처리
    { // 실패 시작
        return recoverState(raw, storage); // 손상 복구 반환
    } // 실패 종료
    const converted = migrateParsedState(parsed); // 상태 변환
    if (converted !== null) // 변환 성공 판정
    { // 변환 성공 시작
        const migrated = refreshBuiltInCreators(addMissingBuiltInStories(converted)); // 새로 추가된 기본 예시 스토리 보충, 기본 캐릭터 제작자 나누기
        const changed = !isAppState(parsed); // 버전 변경 판정
        if (changed || migrated !== converted) // 저장 필요 판정
        { // 저장 필요 시작
            writeItem(storage, stateKey, JSON.stringify(migrated)); // 변환 상태 저장
        } // 저장 필요 종료
        return { state: migrated, recovered: false, warning: changed ? t("저장 데이터를 최신 버전으로 업데이트했습니다.") : null }; // 변환 결과 반환
    } // 변환 성공 종료
    return rejectStoredState(raw, storage); // 잘못된 상태 비파괴 거부
} // 함수 종료

export class LocalStorageGateway // 로컬 저장소 클래스
{ // 클래스 시작
    public constructor(private readonly storage: Storage) // 저장소 주입
    { // 생성자 시작
    } // 생성자 종료

    public load(): LoadResult // 데이터 읽기
    { // 함수 시작
        const raw = this.storage.getItem(stateKey); // 저장 원본 조회
        if (raw === null) // 원본 부재 확인
        { // 조건 시작
            return { state: createInitialState(), recovered: false, warning: null }; // 초기 상태 반환
        } // 조건 종료
        return parseAndMigrate(raw, this.storage); // 복구 처리 반환
    } // 함수 종료

    public save(state: AppState): void // 데이터 저장
    { // 함수 시작
        if (!isAppState(state)) // 상태 검증
        { // 검증 실패 시작
            throw new TypeError(t("유효한 앱 상태만 저장할 수 있습니다.")); // 상태 오류 발생
        } // 검증 실패 종료
        writeItem(this.storage, stateKey, JSON.stringify(state)); // 상태 직렬화 저장
    } // 함수 종료

    public exportJson(): string // 데이터 내보내기
    { // 함수 시작
        return JSON.stringify(this.load().state, null, 2); // 들여쓴 JSON 반환
    } // 함수 종료

    public exportBackupJson(): string | null // 백업 내보내기
    { // 함수 시작
        const backups = readStoredBackups(this.storage).map((backup) => backup.raw); // 전체 백업 수집
        if (backups.length === 0) // 백업 부재 판정
        { // 백업 부재 시작
            return null; // 빈 결과 반환
        } // 백업 부재 종료
        return JSON.stringify({ schemaVersion: 1, backups }, null, 2); // 백업 JSON 반환
    } // 함수 종료

    public prepareImport(raw: string): PreparedImport // 가져오기 준비
    { // 함수 시작
        const state = parseImportState(raw); // 상태 분석
        return { state, summary: summarizeState(state) }; // 준비 결과 반환
    } // 함수 종료

    public importPrepared(prepared: PreparedImport): AppState // 준비 상태 가져오기
    { // 함수 시작
        if (!isAppState(prepared.state)) // 상태 유효성 판정
        { // 잘못된 상태 시작
            throw new ImportValidationError(t("검증된 상태만 가져올 수 있습니다.")); // 상태 오류 발생
        } // 잘못된 상태 종료
        this.createBackup("import"); // 현재 상태 백업
        const state = structuredClone(prepared.state); // 가져올 상태 복사
        this.save(state); // 가져온 상태 저장
        return state; // 가져온 상태 반환
    } // 함수 종료

    public createBackup(reason: BackupReason = "manual", now = new Date().toISOString()): BackupSnapshot // 현재 상태 백업
    { // 함수 시작
        const raw = this.storage.getItem(stateKey) ?? JSON.stringify(createInitialState()); // 현재 원본 조회
        const backups = readStoredBackups(this.storage); // 기존 백업 조회
        const entry: StoredBackup = // 새 백업
        { // 백업 시작
            id: `backup-${now}-${reason}-${backups.length}`, // 백업 식별자
            createdAt: now, // 생성 시각
            reason, // 생성 사유
            summary: null, // 저장 요약 제외
            raw, // 상태 원본
        }; // 백업 종료
        writeStoredBackups(this.storage, [entry, ...backups]); // 최근 백업 저장
        return { id: entry.id, createdAt: entry.createdAt, reason: entry.reason, summary: this.getBackupSummary(entry.raw) }; // 백업 정보 반환
    } // 함수 종료

    public createBackupFromState(state: AppState, reason: BackupReason, now = new Date().toISOString()): BackupSnapshot // 전달 상태 백업
    { // 함수 시작
        if (!isAppState(state)) // 상태 유효성 판정
        { // 잘못된 상태 시작
            throw new TypeError(t("유효한 앱 상태만 백업할 수 있습니다.")); // 상태 오류 발생
        } // 잘못된 상태 종료
        const raw = JSON.stringify(state); // 상태 원본 생성
        const backups = readStoredBackups(this.storage); // 기존 백업 조회
        const entry: StoredBackup = { id: `backup-${now}-${reason}-${backups.length}`, createdAt: now, reason, summary: null, raw }; // 새 백업 생성
        writeStoredBackups(this.storage, [entry, ...backups]); // 최근 백업 저장
        return { id: entry.id, createdAt: entry.createdAt, reason: entry.reason, summary: summarizeState(state) }; // 백업 정보 반환
    } // 함수 종료

    public listBackups(): BackupSnapshot[] // 백업 목록 조회
    { // 함수 시작
        return readStoredBackups(this.storage).map((backup) => // 백업 정보 변환
        { // 변환 시작
            return { id: backup.id, createdAt: backup.createdAt, reason: backup.reason, summary: this.getBackupSummary(backup.raw) }; // 백업 정보 반환
        }); // 변환 종료
    } // 함수 종료

    public restoreBackup(id: string): AppState // 백업 복구
    { // 함수 시작
        const backup = readStoredBackups(this.storage).find((item) => item.id === id); // 백업 조회
        if (backup === undefined) // 백업 부재 판정
        { // 백업 부재 시작
            throw new ImportValidationError(t("복구할 백업을 찾을 수 없습니다.")); // 백업 오류 발생
        } // 백업 부재 종료
        const prepared = this.prepareImport(backup.raw); // 백업 검증
        this.createBackup("restore"); // 현재 상태 백업
        this.save(prepared.state); // 백업 상태 저장
        return structuredClone(prepared.state); // 복구 상태 반환
    } // 함수 종료

    public reset(): AppState // 데이터 초기화
    { // 함수 시작
        this.createBackup("reset"); // 현재 상태 백업
        const state = createInitialState(); // 초기 상태 생성
        this.save(state); // 초기 상태 저장
        return state; // 초기 상태 반환
    } // 함수 종료

    private getBackupSummary(raw: string): DataSummary | null // 백업 요약 조회
    { // 함수 시작
        try // 요약 분석 시도
        { // 시도 시작
            return summarizeState(parseImportState(raw)); // 상태 요약 반환
        } // 시도 종료
        catch // 요약 분석 실패 처리
        { // 실패 시작
            return null; // 빈 요약 반환
        } // 실패 종료
    } // 함수 종료
} // 클래스 종료
