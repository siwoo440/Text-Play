import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 함수
import type { AppSettings, AppState, Character, Conversation, Message, TokenWallet, UserProfile } from "@/features/core/types"; // 도메인 타입
import { mockCharacters } from "@/mocks/fixtures"; // 기본 캐릭터 목록

const stateKey = "mateverse:v1:state"; // 상태 저장 키
const backupKey = "mateverse:v1:backup"; // 백업 저장 키
const backupHistoryKey = "mateverse:v1:backup-history"; // 백업 이력 키
const platformModes = ["auto", "mobile", "tablet", "desktop"] as const; // 플랫폼 목록
const resolutionModes = ["auto", "compact", "comfortable", "wide"] as const; // 해상도 목록
const layoutIds = ["M1", "M2", "M3", "T1", "T2", "T3", "D1", "D2", "D3"] as const; // 레이아웃 목록
const memberships = ["free", "plus", "creator"] as const; // 멤버십 목록
const visibilities = ["private", "unlisted", "public"] as const; // 공개 범위 목록
const publicationStatuses = ["draft", "published"] as const; // 발행 상태 목록
const relationshipStages = ["첫 만남", "아는 사이", "가까운 사이", "특별한 사이"] as const; // 관계 단계 목록
const messageRoles = ["user", "assistant", "system"] as const; // 메시지 역할 목록

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

export type BackupReason = "manual" | "import" | "reset" | "restore" | "recovery"; // 백업 사유

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
        super("브라우저 저장공간에 데이터를 기록하지 못했습니다.", { cause }); // 오류 내용 설정
        this.name = "StorageWriteError"; // 오류 이름 설정
    } // 생성자 종료
} // 클래스 종료

export class ImportValidationError extends Error // 가져오기 오류 클래스
{ // 클래스 시작
    public constructor(message: string, cause?: unknown) // 생성자
    { // 생성자 시작
        super(message, cause === undefined ? undefined : { cause }); // 오류 내용 설정
        this.name = "ImportValidationError"; // 오류 이름 설정
    } // 생성자 종료
} // 클래스 종료

function isRecord(value: unknown): value is Record<string, unknown> // 객체 판정 함수
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부 반환
} // 함수 종료

function isString(value: unknown): value is string // 문자열 판정 함수
{ // 함수 시작
    return typeof value === "string"; // 문자열 여부 반환
} // 함수 종료

function isFiniteNumber(value: unknown): value is number // 숫자 판정 함수
{ // 함수 시작
    return typeof value === "number" && Number.isFinite(value); // 유효 숫자 반환
} // 함수 종료

function isBoolean(value: unknown): value is boolean // 논리값 판정 함수
{ // 함수 시작
    return typeof value === "boolean"; // 논리값 여부 반환
} // 함수 종료

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T // 목록 판정 함수
{ // 함수 시작
    return isString(value) && values.includes(value as T); // 목록 포함 여부 반환
} // 함수 종료

function isStringArray(value: unknown): value is string[] // 문자열 목록 판정 함수
{ // 함수 시작
    return Array.isArray(value) && value.every(isString); // 문자열 목록 여부 반환
} // 함수 종료

function isUserProfile(value: unknown): value is UserProfile // 사용자 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.nickname) // 이름 확인
        && isString(value.avatar) // 이미지 확인
        && isOneOf(value.membership, memberships) // 멤버십 확인
        && isString(value.createdAt); // 가입 시각 확인
} // 함수 종료

function isCharacter(value: unknown): value is Character // 캐릭터 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.creatorId) // 제작자 식별자 확인
        && isString(value.creatorName) // 제작자 이름 확인
        && isString(value.name) // 이름 확인
        && isString(value.summary) // 소개 확인
        && isString(value.description) // 설명 확인
        && isString(value.personality) // 성격 확인
        && isString(value.greeting) // 첫 인사 확인
        && isString(value.worldSetting) // 세계관 확인
        && isString(value.prompt) // 프롬프트 확인
        && isStringArray(value.tags) // 태그 확인
        && isString(value.coverImage) // 이미지 확인
        && isOneOf(value.visibility, visibilities) // 공개 범위 확인
        && isOneOf(value.publicationStatus, publicationStatuses) // 발행 상태 확인
        && isFiniteNumber(value.popularity) // 인기도 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isConversation(value: unknown): value is Conversation // 대화 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isString(value.userId) // 사용자 식별자 확인
        && isString(value.title) // 제목 확인
        && isFiniteNumber(value.relationshipLevel) // 관계 수치 확인
        && isOneOf(value.relationshipStage, relationshipStages) // 관계 단계 확인
        && isString(value.emotion) // 감정 확인
        && isString(value.currentScene) // 장면 확인
        && isString(value.lastMessage) // 최근 메시지 확인
        && (value.archivedAt === null || isString(value.archivedAt)) // 보관 시각 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isLegacyConversation(value: unknown): boolean // 이전 대화 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isString(value.userId) // 사용자 식별자 확인
        && isString(value.title) // 제목 확인
        && isFiniteNumber(value.relationshipLevel) // 관계 수치 확인
        && isOneOf(value.relationshipStage, relationshipStages) // 관계 단계 확인
        && isString(value.emotion) // 감정 확인
        && isString(value.currentScene) // 장면 확인
        && isString(value.lastMessage) // 최근 메시지 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isMessage(value: unknown): value is Message // 메시지 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.conversationId) // 대화 식별자 확인
        && isOneOf(value.role, messageRoles) // 역할 확인
        && isString(value.content) // 내용 확인
        && (value.emotion === null || isString(value.emotion)) // 감정 확인
        && (value.sceneEvent === null || isString(value.sceneEvent)) // 장면 사건 확인
        && isString(value.createdAt); // 생성 시각 확인
} // 함수 종료

function isTokenWallet(value: unknown): value is TokenWallet // 지갑 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isFiniteNumber(value.balance) // 잔액 확인
        && isFiniteNumber(value.totalUsed) // 누적 사용량 확인
        && isFiniteNumber(value.dailyChatUsed) // 대화 사용량 확인
        && isFiniteNumber(value.dailyImageUsed) // 이미지 사용량 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isAppSettings(value: unknown): value is AppSettings // 설정 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isOneOf(value.platformMode, platformModes) // 플랫폼 확인
        && (value.layoutId === null || isOneOf(value.layoutId, layoutIds)) // 레이아웃 확인
        && isOneOf(value.resolutionMode, resolutionModes) // 해상도 확인
        && isBoolean(value.leftPanelOpen) // 왼쪽 패널 확인
        && isBoolean(value.rightPanelOpen) // 오른쪽 패널 확인
        && isBoolean(value.proactiveMessageEnabled) // 선제 메시지 확인
        && isString(value.notificationStartTime) // 시작 시각 확인
        && isString(value.notificationEndTime) // 종료 시각 확인
        && isFiniteNumber(value.dailyNotificationLimit); // 알림 제한 확인
} // 함수 종료

function hasAppStateData(value: unknown, conversationValidator: (item: unknown) => boolean = isConversation): value is Record<string, unknown> // 앱 상태 내용 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && value.providerMode === "mock" // 공급자 확인
        && isUserProfile(value.profile) // 사용자 확인
        && Array.isArray(value.characters) // 캐릭터 목록 확인
        && value.characters.every(isCharacter) // 캐릭터 항목 확인
        && Array.isArray(value.conversations) // 대화 목록 확인
        && value.conversations.every(conversationValidator) // 대화 항목 확인
        && Array.isArray(value.messages) // 메시지 목록 확인
        && value.messages.every(isMessage) // 메시지 항목 확인
        && isTokenWallet(value.wallet) // 지갑 확인
        && isAppSettings(value.settings) // 설정 확인
        && isStringArray(value.bookmarkedCharacterIds) // 보관 목록 확인
        && (value.selectedConversationId === null || isString(value.selectedConversationId)); // 선택 대화 확인
} // 함수 종료

type LegacyConversation = Omit<Conversation, "archivedAt"> & { archivedAt?: string | null }; // 이전 대화 타입
type VersionTwoState = Omit<AppState, "schemaVersion" | "conversations"> & { schemaVersion: 2; conversations: LegacyConversation[] }; // 버전 2 상태 타입
type VersionThreeState = Omit<AppState, "schemaVersion" | "conversations"> & { schemaVersion: 3; conversations: LegacyConversation[] }; // 버전 3 상태 타입
type VersionFourState = Omit<AppState, "schemaVersion" | "conversations"> & { schemaVersion: 4; conversations: LegacyConversation[] }; // 버전 4 상태 타입

function isAppState(value: unknown): value is AppState // 앱 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value) && value.schemaVersion === 5; // 버전 5 상태 반환
} // 함수 종료

function isVersionTwoState(value: unknown): value is VersionTwoState // 버전 2 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation) && value.schemaVersion === 2; // 버전 2 상태 반환
} // 함수 종료

function isVersionThreeState(value: unknown): value is VersionThreeState // 버전 3 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation) && value.schemaVersion === 3; // 버전 3 상태 반환
} // 함수 종료

function isVersionFourState(value: unknown): value is VersionFourState // 버전 4 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation) && value.schemaVersion === 4; // 버전 4 상태 반환
} // 함수 종료

function migrateVersionFour(value: Record<string, unknown>): AppState | null // 버전 4 변환 함수
{ // 함수 시작
    if (!isVersionFourState(value)) // 버전 4 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const conversations = value.conversations.map((conversation) => // 대화 변환
    { // 변환 시작
        return { ...conversation, archivedAt: isString(conversation.archivedAt) ? conversation.archivedAt : null }; // 보관 시각 추가
    }); // 변환 종료
    const candidate: unknown = { ...value, schemaVersion: 5, conversations }; // 버전 5 후보
    return isAppState(candidate) ? candidate : null; // 유효 변환 반환
} // 함수 종료

function migrateVersionThree(value: Record<string, unknown>): AppState | null // 버전 3 변환 함수
{ // 함수 시작
    if (!isVersionThreeState(value)) // 버전 3 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const defaultsById = new Map(mockCharacters.map((character) => [character.id, character])); // 기본 캐릭터 색인
    const refreshedCharacters = value.characters.map((character) => // 기존 캐릭터 갱신
    { // 갱신 시작
        const defaultCharacter = defaultsById.get(character.id); // 기본 캐릭터 조회
        if (defaultCharacter === undefined || !character.id.startsWith("rank-")) // 갱신 제외 판정
        { // 제외 시작
            return character; // 원본 유지
        } // 제외 종료
        return { ...character, coverImage: defaultCharacter.coverImage }; // 기본 이미지 갱신
    }); // 갱신 종료
    const existingIds = new Set(refreshedCharacters.map((character) => character.id)); // 기존 식별자 집합
    const missingCharacters = mockCharacters.filter((character) => !existingIds.has(character.id)); // 누락 캐릭터 목록
    const candidate: unknown = { ...value, schemaVersion: 4, characters: [...refreshedCharacters, ...missingCharacters] }; // 버전 4 후보
    return isRecord(candidate) ? migrateVersionFour(candidate) : null; // 연속 변환 반환
} // 함수 종료

function migrateVersionTwo(value: Record<string, unknown>): AppState | null // 버전 2 변환 함수
{ // 함수 시작
    if (!isVersionTwoState(value)) // 버전 2 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const existingIds = new Set(value.characters.map((character) => character.id)); // 기존 식별자 집합
    const missingCharacters = mockCharacters.filter((character) => !existingIds.has(character.id)); // 누락 캐릭터 목록
    const candidate: unknown = { ...value, schemaVersion: 3, characters: [...value.characters, ...missingCharacters] }; // 버전 3 후보
    return isRecord(candidate) ? migrateVersionThree(candidate) : null; // 연속 변환 반환
} // 함수 종료

function migrateVersionOne(value: Record<string, unknown>): AppState | null // 버전 1 변환 함수
{ // 함수 시작
    if (!Array.isArray(value.characters)) // 캐릭터 목록 판정
    { // 잘못된 목록 시작
        return null; // 변환 중단
    } // 잘못된 목록 종료
    const characters = value.characters.map((item) => // 캐릭터 변환
    { // 변환 시작
        if (!isRecord(item)) // 캐릭터 객체 판정
        { // 잘못된 캐릭터 시작
            return item; // 원본 반환
        } // 잘못된 캐릭터 종료
        const publicationStatus = isOneOf(item.publicationStatus, publicationStatuses) ? item.publicationStatus : "published"; // 발행 상태 선택
        return { ...item, publicationStatus }; // 변환 캐릭터 반환
    }); // 변환 종료
    const candidate: unknown = { ...value, schemaVersion: 2, characters, bookmarkedCharacterIds: [] }; // 버전 2 후보
    return isRecord(candidate) ? migrateVersionTwo(candidate) : null; // 연속 변환 반환
} // 함수 종료

function migrateVersionZero(value: Record<string, unknown>): AppState | null // 버전 0 변환 함수
{ // 함수 시작
    const defaults = createInitialState(); // 기본 상태 생성
    if (Object.hasOwn(value, "settings") && !isRecord(value.settings)) // 잘못된 설정 판정
    { // 잘못된 설정 시작
        return null; // 변환 중단
    } // 잘못된 설정 종료
    const legacySettings = isRecord(value.settings) ? value.settings : {}; // 이전 설정 선택
    const candidate: unknown = // 변환 후보
    { // 후보 시작
        ...value, // 이전 값 복사
        schemaVersion: 1, // 중간 버전 적용
        providerMode: "mock", // Mock 공급자 적용
        settings: // 설정 변환
        { // 설정 시작
            ...defaults.settings, // 새 기본값 적용
            ...legacySettings, // 이전 설정 유지
        }, // 설정 종료
    }; // 후보 종료
    return isRecord(candidate) ? migrateVersionOne(candidate) : null; // 연속 변환 반환
} // 함수 종료

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

function migrateParsedState(parsed: unknown): AppState | null // 분석 상태 변환 함수
{ // 함수 시작
    if (isAppState(parsed)) // 현재 상태 판정
    { // 현재 상태 시작
        return structuredClone(parsed); // 현재 상태 복사
    } // 현재 상태 종료
    if (!isRecord(parsed)) // 객체 부재 판정
    { // 객체 부재 시작
        return null; // 변환 중단
    } // 객체 부재 종료
    if (parsed.schemaVersion === 0) // 버전 0 판정
    { // 버전 0 시작
        return migrateVersionZero(parsed); // 버전 5 변환
    } // 버전 0 종료
    if (parsed.schemaVersion === 1) // 버전 1 판정
    { // 버전 1 시작
        return migrateVersionOne(parsed); // 버전 5 변환
    } // 버전 1 종료
    if (parsed.schemaVersion === 2) // 버전 2 판정
    { // 버전 2 시작
        return migrateVersionTwo(parsed); // 버전 5 변환
    } // 버전 2 종료
    if (parsed.schemaVersion === 3) // 버전 3 판정
    { // 버전 3 시작
        return migrateVersionThree(parsed); // 버전 5 변환
    } // 버전 3 종료
    if (parsed.schemaVersion === 4) // 버전 4 판정
    { // 버전 4 시작
        return migrateVersionFour(parsed); // 버전 5 변환
    } // 버전 4 종료
    return null; // 지원하지 않는 상태 반환
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
        throw new ImportValidationError("올바른 JSON 파일이 아닙니다.", error); // 분석 오류 변환
    } // 실패 종료
    if (isRecord(parsed) && isFiniteNumber(parsed.schemaVersion) && parsed.schemaVersion > 5) // 미래 버전 판정
    { // 미래 버전 시작
        throw new ImportValidationError("지원하지 않는 데이터 버전입니다."); // 미래 버전 오류
    } // 미래 버전 종료
    const state = migrateParsedState(parsed); // 상태 변환
    if (state === null) // 변환 실패 판정
    { // 변환 실패 시작
        throw new ImportValidationError("MATE:VERSE 상태 파일 형식이 아닙니다."); // 형식 오류
    } // 변환 실패 종료
    return state; // 검증 상태 반환
} // 함수 종료

function isBackupReason(value: unknown): value is BackupReason // 백업 사유 판정 함수
{ // 함수 시작
    return isOneOf(value, ["manual", "import", "reset", "restore", "recovery"] as const); // 사유 여부 반환
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
    const primary = storage.getItem(backupKey); // 대표 백업 조회
    if (primary !== null && !backups.some((backup) => backup.raw === primary)) // 대표 백업 누락 판정
    { // 대표 백업 누락 시작
        backups.push({ id: "legacy-primary", createdAt: null, reason: "recovery", summary: null, raw: primary }); // 대표 백업 추가
    } // 대표 백업 누락 종료
    return backups; // 백업 목록 반환
} // 함수 종료

function writeStoredBackups(storage: Storage, backups: StoredBackup[]): void // 백업 이력 쓰기 함수
{ // 함수 시작
    writeItem(storage, backupHistoryKey, JSON.stringify(backups.slice(0, 3))); // 최근 이력 저장
    if (backups[0] !== undefined && storage.getItem(backupKey) === null) // 대표 백업 부재 판정
    { // 최신 백업 시작
        writeItem(storage, backupKey, backups[0].raw); // 대표 백업 저장
    } // 최신 백업 종료
} // 함수 종료

function preserveCorruptedData(raw: string, storage: Storage): void // 손상 원본 보존 함수
{ // 함수 시작
    const backups = readStoredBackups(storage); // 기존 백업 수집
    if (backups.some((backup) => backup.raw === raw)) // 중복 원본 판정
    { // 중복 원본 시작
        return; // 중복 저장 생략
    } // 중복 원본 종료
    const entry: StoredBackup = { id: `recovery-${backups.length + 1}`, createdAt: null, reason: "recovery", summary: null, raw }; // 복구 백업 생성
    writeStoredBackups(storage, [...backups, entry]); // 복구 백업 저장
} // 함수 종료

function recoverState(raw: string, storage: Storage): LoadResult // 손상 복구 함수
{ // 함수 시작
    const state = createInitialState(); // 초기 상태 생성
    preserveCorruptedData(raw, storage); // 원본 백업
    writeItem(storage, stateKey, JSON.stringify(state)); // 초기 상태 저장
    return { state, recovered: true, warning: "손상된 저장 데이터를 백업하고 초기 상태로 복구했습니다." }; // 복구 결과 반환
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
    const migrated = migrateParsedState(parsed); // 상태 변환
    if (migrated !== null) // 변환 성공 판정
    { // 변환 성공 시작
        const changed = !isAppState(parsed); // 버전 변경 판정
        if (changed) // 저장 필요 판정
        { // 저장 필요 시작
            writeItem(storage, stateKey, JSON.stringify(migrated)); // 변환 상태 저장
        } // 저장 필요 종료
        return { state: migrated, recovered: false, warning: changed ? "저장 데이터를 최신 버전으로 업데이트했습니다." : null }; // 변환 결과 반환
    } // 변환 성공 종료
    return recoverState(raw, storage); // 잘못된 상태 복구
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
            throw new TypeError("유효한 앱 상태만 저장할 수 있습니다."); // 상태 오류 발생
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
            throw new ImportValidationError("검증된 상태만 가져올 수 있습니다."); // 상태 오류 발생
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
            throw new ImportValidationError("복구할 백업을 찾을 수 없습니다."); // 백업 오류 발생
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
