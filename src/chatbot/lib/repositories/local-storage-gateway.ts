import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 함수
import { isConversationVersionGraphValid } from "@chatbot/features/conversation/conversation-versioning"; // 버전 그래프 검증
import type { AdultVerification, AppSettings, AppState, Character, CharacterMemory, CharacterReport, Conversation, ConversationStartSettings, ConversationVersion, Message, Story, StoryCastMember, TokenWallet, UserProfile } from "@chatbot/features/core/types"; // 도메인 타입
import { STORY_CAST_LIMIT } from "@chatbot/features/story/story-model"; // 등장인물 최대 수
import { mockCharacters } from "@chatbot/mocks/fixtures"; // 기본 캐릭터 목록
import { mockStories } from "@chatbot/mocks/story-fixtures"; // 예시 스토리

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
const memoryCategories = ["summary", "event", "preference"] as const; // 기억 분류 목록
const reportReasons = ["incorrect-rating", "harmful-content", "copyright", "spam", "other"] as const; // 신고 사유 목록
const contentRatings = ["all", "teen", "mature"] as const; // 이용 등급 목록
const adultVerificationMethods = ["mock"] as const; // 성인 인증 방식 목록
const conversationSorts = ["recent", "relationship", "turns", "title"] as const; // 대화방 정렬 목록
const backupReasons = ["manual", "import", "reset", "restore", "recovery", "message-delete", "version-delete", "conversation-delete", "character-delete", "story-delete"] as const; // 백업 사유 목록
const conversationModes = ["character", "story"] as const; // 대화 종류 목록

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
        super("브라우저 저장공간에 데이터를 기록하지 못했습니다.", { cause }); // 오류 내용 설정
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

function isAdultVerification(value: unknown): value is AdultVerification // 성인 인증 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isOneOf(value.method, adultVerificationMethods) // 인증 방식 확인
        && isString(value.verifiedAt) // 인증 시각 확인
        && isString(value.expiresAt); // 만료 시각 확인
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

function isConversationStartSettings(value: unknown): value is ConversationStartSettings // 시작 설정 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.profileId) // 프로필 식별자 확인
        && isString(value.presetId) // 프리셋 식별자 확인
        && isOneOf(value.relationshipStage, relationshipStages) // 관계 단계 확인
        && isFiniteNumber(value.relationshipLevel) // 관계 수치 확인
        && isString(value.emotion) // 감정 확인
        && isString(value.scene) // 장면 확인
        && isString(value.greeting); // 첫 대사 확인
} // 함수 종료

function isConversation(value: unknown): value is Conversation // 대화 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isString(value.userId) // 사용자 식별자 확인
        && isString(value.title) // 제목 확인
        && isConversationStartSettings(value.startSettings) // 시작 설정 확인
        && isString(value.currentVersionId) // 현재 버전 확인
        && (value.archivedAt === null || isString(value.archivedAt)) // 보관 시각 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isVersionSixConversation(value: unknown): boolean // 버전 6 대화 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isString(value.userId) // 사용자 식별자 확인
        && isString(value.title) // 제목 확인
        && isConversationStartSettings(value.startSettings) // 시작 설정 확인
        && isFiniteNumber(value.relationshipLevel) // 관계 수치 확인
        && isOneOf(value.relationshipStage, relationshipStages) // 관계 단계 확인
        && isString(value.emotion) // 감정 확인
        && isString(value.currentScene) // 장면 확인
        && isString(value.lastMessage) // 최근 메시지 확인
        && (value.archivedAt === null || isString(value.archivedAt)) // 보관 시각 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isVersionFiveConversation(value: unknown): boolean // 버전 5 대화 판정 함수
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
        && isString(value.versionId) // 버전 식별자 확인
        && (value.sourceMessageId === null || isString(value.sourceMessageId)) // 원본 메시지 확인
        && isOneOf(value.role, messageRoles) // 역할 확인
        && isString(value.content) // 내용 확인
        && (value.emotion === null || isString(value.emotion)) // 감정 확인
        && (value.sceneEvent === null || isString(value.sceneEvent)) // 장면 사건 확인
        && isString(value.createdAt); // 생성 시각 확인
} // 함수 종료

function isLegacyMessage(value: unknown): boolean // 이전 메시지 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.conversationId) // 대화 식별자 확인
        && isOneOf(value.role, messageRoles) // 역할 확인
        && isString(value.content) // 내용 확인
        && (value.emotion === null || isString(value.emotion)) // 감정 확인
        && (value.sceneEvent === null || isString(value.sceneEvent)) // 장면 사건 확인
        && (value.scenePath === undefined || value.scenePath === null || isString(value.scenePath)) // 장면 경로 확인
        && isString(value.createdAt); // 생성 시각 확인
} // 함수 종료

function isConversationVersion(value: unknown): value is ConversationVersion // 대화 버전 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.conversationId) // 대화방 식별자 확인
        && (value.parentVersionId === null || isString(value.parentVersionId)) // 부모 버전 확인
        && (value.forkRootVersionId === null || isString(value.forkRootVersionId)) // 분기 원본 확인
        && (value.forkedFromMessageId === null || isString(value.forkedFromMessageId)) // 분기 메시지 확인
        && isFiniteNumber(value.ordinal) // 버전 순번 확인
        && isFiniteNumber(value.relationshipLevel) // 관계 수치 확인
        && isOneOf(value.relationshipStage, relationshipStages) // 관계 단계 확인
        && isString(value.emotion) // 감정 확인
        && isString(value.currentScene) // 장면 확인
        && isString(value.lastMessage) // 최근 메시지 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isCharacterMemory(value: unknown): value is CharacterMemory // 기억 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isString(value.conversationId) // 대화방 식별자 확인
        && isOneOf(value.category, memoryCategories) // 기억 분류 확인
        && isString(value.content) // 기억 내용 확인
        && isStringArray(value.sourceMessageIds) // 근거 메시지 확인
        && isBoolean(value.editedByUser) // 사용자 편집 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function isCharacterReport(value: unknown): value is CharacterReport // 신고 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isOneOf(value.reason, reportReasons) // 신고 사유 확인
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

function hasAppStateData(value: unknown, conversationValidator: (item: unknown) => boolean = isConversation, messageValidator: (item: unknown) => boolean = isMessage): value is Record<string, unknown> // 앱 상태 내용 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && value.providerMode === "mock" // 공급자 확인
        && isUserProfile(value.profile) // 사용자 확인
        && Array.isArray(value.characters) // 캐릭터 목록 확인
        && value.characters.every(isCharacter) // 캐릭터 항목 확인
        && Array.isArray(value.conversations) // 대화 목록 확인
        && value.conversations.every(conversationValidator) // 대화 항목 확인
        && Array.isArray(value.messages) // 메시지 목록 확인
        && value.messages.every(messageValidator) // 메시지 항목 확인
        && isTokenWallet(value.wallet) // 지갑 확인
        && isAppSettings(value.settings) // 설정 확인
        && isStringArray(value.bookmarkedCharacterIds) // 보관 목록 확인
        && (value.selectedConversationId === null || isString(value.selectedConversationId)); // 선택 대화 확인
} // 함수 종료

type SchemaEightFields = "profile" | "characters" | "settings"; // 스키마 8 변경 필드
type VersionEightState = Omit<AppState, "schemaVersion" | "pinnedConversationIds" | "settings"> & { schemaVersion: 8; settings: Omit<AppSettings, "conversationSort"> }; // 버전 8 상태 타입
type VersionSevenState = Omit<AppState, "schemaVersion" | "pinnedConversationIds" | SchemaEightFields> & { schemaVersion: 7; profile: Omit<UserProfile, "adultVerification">; characters: Array<Omit<Character, "contentRating">>; settings: Omit<AppSettings, "matureContentEnabled" | "conversationSort"> }; // 버전 7 상태 타입
type SchemaSevenFields = "schemaVersion" | "conversations" | "conversationVersions" | "messages" | "memories" | "likedCharacterIds" | "followedCreatorIds" | "localReports"; // 스키마 7 필드 묶음
type VersionSixConversation = Omit<Conversation, "currentVersionId"> & { relationshipLevel: number; relationshipStage: ConversationVersion["relationshipStage"]; emotion: string; currentScene: string; lastMessage: string }; // 버전 6 대화 타입
type LegacyConversation = Omit<VersionSixConversation, "archivedAt" | "startSettings"> & { archivedAt?: string | null }; // 이전 대화 타입
type VersionFiveConversation = Omit<VersionSixConversation, "startSettings">; // 버전 5 대화 타입
type LegacyMessage = Omit<Message, "versionId" | "sourceMessageId">; // 이전 메시지 타입
type VersionTwoState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 2; conversations: LegacyConversation[]; messages: LegacyMessage[] }; // 버전 2 상태 타입
type VersionThreeState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 3; conversations: LegacyConversation[]; messages: LegacyMessage[] }; // 버전 3 상태 타입
type VersionFourState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 4; conversations: LegacyConversation[]; messages: LegacyMessage[] }; // 버전 4 상태 타입
type VersionFiveState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 5; conversations: VersionFiveConversation[]; messages: LegacyMessage[] }; // 버전 5 상태 타입
type VersionSixState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 6; conversations: VersionSixConversation[]; messages: LegacyMessage[]; memories: CharacterMemory[]; likedCharacterIds: string[]; followedCreatorIds: string[]; localReports: CharacterReport[] }; // 버전 6 상태 타입

function hasSchemaEightFields(value: Record<string, unknown>): boolean // 스키마 8 필드 판정 함수
{ // 함수 시작
    const profile = value.profile as Record<string, unknown>; // 사용자 정보
    const settings = value.settings as Record<string, unknown>; // 설정 정보
    return (profile.adultVerification === null || isAdultVerification(profile.adultVerification)) // 성인 인증 확인
        && isBoolean(settings.matureContentEnabled) // 19세 표시 설정 확인
        && (value.characters as Array<Record<string, unknown>>).every((character) => isOneOf(character.contentRating, contentRatings)); // 이용 등급 확인
} // 함수 종료

function hasSchemaNineFields(value: Record<string, unknown>): boolean // 스키마 9 필드 판정 함수
{ // 함수 시작
    const settings = value.settings as Record<string, unknown>; // 설정 정보
    return isStringArray(value.pinnedConversationIds) // 고정 대화 확인
        && isOneOf(settings.conversationSort, conversationSorts); // 대화방 정렬 확인
} // 함수 종료

function isStoryCastMember(value: unknown): value is StoryCastMember // 등장인물 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.characterId) // 캐릭터 확인
        && isString(value.displayName) && value.displayName.trim().length > 0 // 이야기 속 이름 확인
        && isString(value.role) // 역할 확인
        && isString(value.firstLine); // 첫 대사 확인
} // 함수 종료

function isStory(value: unknown): value is Story // 스토리 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.creatorId) // 제작자 확인
        && isString(value.creatorName) // 제작자 이름 확인
        && isString(value.title) // 제목 확인
        && isString(value.summary) // 소개 확인
        && isString(value.synopsis) // 줄거리 확인
        && isString(value.opening) // 시작 장면 확인
        && isString(value.userRole) // 사용자 역할 확인
        && Array.isArray(value.cast) && value.cast.length >= 1 && value.cast.length <= STORY_CAST_LIMIT && value.cast.every(isStoryCastMember) // 등장인물 확인
        && isStringArray(value.tags) // 태그 확인
        && isString(value.coverImage) // 대표 이미지 확인
        && isOneOf(value.visibility, visibilities) // 공개 범위 확인
        && isOneOf(value.contentRating, contentRatings) // 이용 등급 확인
        && isOneOf(value.publicationStatus, publicationStatuses) // 발행 상태 확인
        && isFiniteNumber(value.popularity) // 이용 지표 확인
        && isString(value.createdAt) // 생성 시각 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

function hasSchemaTenFields(value: Record<string, unknown>): boolean // 스키마 10 필드 판정 함수
{ // 함수 시작
    if (!Array.isArray(value.stories) || !value.stories.every(isStory)) // 스토리 목록 확인
    { // 조건 시작
        return false; // 상태 거부
    } // 조건 종료
    const storyIds = new Set((value.stories as Story[]).map((story) => story.id)); // 스토리 식별자
    return (value.conversations as Array<Record<string, unknown>>).every((conversation) => // 대화 순회
    { // 판정 시작
        if (!isOneOf(conversation.mode, conversationModes) || !Array.isArray(conversation.storyCast) || !conversation.storyCast.every(isStoryCastMember)) // 공통 필드 확인
        { // 조건 시작
            return false; // 대화 거부
        } // 조건 종료
        return conversation.mode === "story" // 종류별 확인
            ? isString(conversation.storyId) && storyIds.has(conversation.storyId) && conversation.storyCast.length >= 1 // 스토리 대화는 있는 스토리와 등장인물 필요
            : conversation.storyId === null && conversation.storyCast.length === 0; // 캐릭터 대화는 스토리 없음
    }); // 판정 종료
} // 함수 종료

export function isAppState(value: unknown): value is AppState // 앱 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 10) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value); // 버전 10 상태 반환
} // 함수 종료

function isVersionNineState(value: unknown): value is Record<string, unknown> // 버전 9 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 9) && hasSchemaEightFields(value) && hasSchemaNineFields(value); // 버전 9 상태 반환
} // 함수 종료

function isVersionEightState(value: unknown): value is VersionEightState // 버전 8 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 8) && hasSchemaEightFields(value); // 버전 8 상태 반환
} // 함수 종료

function isVersionSevenState(value: unknown): value is VersionSevenState // 버전 7 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 7); // 버전 7 상태 반환
} // 함수 종료

function hasVersionedGraph(value: unknown, schemaVersion: 7 | 8 | 9 | 10): value is Record<string, unknown> // 버전 7 이후 공통 구조 판정 함수
{ // 함수 시작
    if (!hasAppStateData(value) // 공통 상태 확인
        || value.schemaVersion !== schemaVersion // 버전 확인
        || !Array.isArray(value.memories) // 기억 목록 확인
        || !value.memories.every(isCharacterMemory) // 기억 항목 확인
        || !isStringArray(value.likedCharacterIds) // 좋아요 목록 확인
        || !isStringArray(value.followedCreatorIds) // 팔로우 목록 확인
        || !Array.isArray(value.localReports) // 신고 목록 확인
        || !value.localReports.every(isCharacterReport)) // 신고 항목 확인
    { // 잘못된 상태 시작
        return false; // 상태 거부
    } // 잘못된 상태 종료
    if (!Array.isArray(value.conversationVersions) || !value.conversationVersions.every(isConversationVersion)) // 버전 목록 확인
    { // 잘못된 버전 시작
        return false; // 상태 거부
    } // 잘못된 버전 종료
    const characterIds = new Set((value.characters as Character[]).map((character) => character.id)); // 캐릭터 식별자 집합
    const conversations = value.conversations as Conversation[]; // 대화 목록 지정
    const versions = value.conversationVersions as ConversationVersion[]; // 버전 목록 지정
    const messages = value.messages as Message[]; // 메시지 목록 지정
    const conversationIds = new Set(conversations.map((conversation) => conversation.id)); // 대화 식별자 집합
    const versionsById = new Map(versions.map((version) => [version.id, version])); // 버전 식별자 색인
    const validConversations = conversations.every((conversation) => // 대화 연결 확인
    { // 판정 시작
        const currentVersion = versionsById.get(conversation.currentVersionId); // 현재 버전 조회
        return characterIds.has(conversation.characterId) && currentVersion?.conversationId === conversation.id; // 연결 여부 반환
    }); // 판정 종료
    const validVersions = versions.every((version) => conversationIds.has(version.conversationId)); // 버전 연결 확인
    const validMessages = messages.every((message) => versionsById.get(message.versionId)?.conversationId === message.conversationId && conversationIds.has(message.conversationId)); // 메시지 연결 확인
    return validConversations && validVersions && validMessages && isConversationVersionGraphValid({ conversations, conversationVersions: versions, messages }); // 전체 연결 반환
} // 함수 종료

function isVersionSixState(value: unknown): value is VersionSixState // 버전 6 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isVersionSixConversation, isLegacyMessage) // 공통 상태 확인
        && value.schemaVersion === 6 // 버전 6 확인
        && Array.isArray(value.memories) // 기억 목록 확인
        && value.memories.every(isCharacterMemory) // 기억 항목 확인
        && isStringArray(value.likedCharacterIds) // 좋아요 목록 확인
        && isStringArray(value.followedCreatorIds) // 팔로우 목록 확인
        && Array.isArray(value.localReports) // 신고 목록 확인
        && value.localReports.every(isCharacterReport); // 신고 항목 확인
} // 함수 종료

function isVersionFiveState(value: unknown): value is VersionFiveState // 버전 5 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isVersionFiveConversation, isLegacyMessage) && value.schemaVersion === 5; // 버전 5 상태 반환
} // 함수 종료

function isVersionTwoState(value: unknown): value is VersionTwoState // 버전 2 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation, isLegacyMessage) && value.schemaVersion === 2; // 버전 2 상태 반환
} // 함수 종료

function isVersionThreeState(value: unknown): value is VersionThreeState // 버전 3 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation, isLegacyMessage) && value.schemaVersion === 3; // 버전 3 상태 반환
} // 함수 종료

function isVersionFourState(value: unknown): value is VersionFourState // 버전 4 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation, isLegacyMessage) && value.schemaVersion === 4; // 버전 4 상태 반환
} // 함수 종료

export function migrateVersionSix(value: Record<string, unknown>): AppState | null // 버전 6 변환 함수
{ // 함수 시작
    if (!isVersionSixState(value)) // 버전 6 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const characterIds = new Set(value.characters.map((character) => character.id)); // 캐릭터 식별자 집합
    if (value.conversations.some((conversation) => !characterIds.has(conversation.characterId) || !value.messages.some((message) => message.conversationId === conversation.id))) // 연결 손상 판정
    { // 손상 상태 시작
        return null; // 비파괴 거부
    } // 손상 상태 종료
    const versionIds = new Map(value.conversations.map((conversation) => [conversation.id, `${conversation.id}-version-1`])); // 최초 버전 식별자 색인
    const conversations: Array<Omit<Conversation, "mode" | "storyId" | "storyCast">> = value.conversations.map((conversation) => // 대화 버전 연결(버전 7 형식)
    { // 변환 시작
        return { id: conversation.id, characterId: conversation.characterId, userId: conversation.userId, title: conversation.title, startSettings: conversation.startSettings, currentVersionId: versionIds.get(conversation.id) as string, archivedAt: conversation.archivedAt, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt }; // 공통 대화 반환
    }); // 변환 종료
    const conversationVersions: ConversationVersion[] = value.conversations.map((conversation) => // 최초 버전 생성
    { // 변환 시작
        return { id: versionIds.get(conversation.id) as string, conversationId: conversation.id, parentVersionId: null, forkRootVersionId: null, forkedFromMessageId: null, ordinal: 1, relationshipLevel: conversation.relationshipLevel, relationshipStage: conversation.relationshipStage, emotion: conversation.emotion, currentScene: conversation.currentScene, lastMessage: conversation.lastMessage, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt }; // 버전 반환
    }); // 변환 종료
    const messages: Message[] = value.messages.map((message) => ({ ...message, versionId: versionIds.get(message.conversationId) as string, sourceMessageId: null })); // 메시지 버전 연결
    if (messages.some((message) => message.versionId === undefined)) // 메시지 연결 손상 판정
    { // 손상 상태 시작
        return null; // 비파괴 거부
    } // 손상 상태 종료
    const candidate: unknown = { ...value, schemaVersion: 7, conversations, conversationVersions, messages }; // 버전 7 후보
    return isVersionSevenState(candidate) ? migrateVersionSeven(candidate) : null; // 연속 변환 반환
} // 함수 종료

export function migrateVersionSeven(value: Record<string, unknown>): AppState | null // 버전 7 변환 함수
{ // 함수 시작
    if (!isVersionSevenState(value)) // 버전 7 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const defaultRatings = new Map(mockCharacters.map((character) => [character.id, character.contentRating])); // 기본 등급 색인
    const characters = value.characters.map((character) => // 캐릭터 등급 추가
    { // 변환 시작
        const stored = (character as Record<string, unknown>).contentRating; // 기존 등급 조회
        return { ...character, contentRating: isOneOf(stored, contentRatings) ? stored : defaultRatings.get(character.id) ?? "all" }; // 등급 적용
    }); // 변환 종료
    const profile = { ...value.profile, adultVerification: null }; // 성인 인증 전 상태
    const settings = { ...value.settings, matureContentEnabled: false }; // 19세 콘텐츠 숨김
    const candidate: unknown = { ...value, schemaVersion: 8, profile, characters, settings }; // 버전 8 후보
    return isVersionEightState(candidate) ? migrateVersionEight(candidate) : null; // 연속 변환 반환
} // 함수 종료

export function migrateVersionEight(value: Record<string, unknown>): AppState | null // 버전 8 변환 함수
{ // 함수 시작
    if (!isVersionEightState(value)) // 버전 8 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const settings = { ...value.settings, conversationSort: "recent" }; // 최근 대화순 정렬
    const candidate: unknown = { ...value, schemaVersion: 9, pinnedConversationIds: [], settings }; // 버전 9 후보
    return isVersionNineState(candidate) ? migrateVersionNine(candidate) : null; // 연속 변환 반환
} // 함수 종료

export function migrateVersionNine(value: Record<string, unknown>): AppState | null // 버전 9 변환 함수
{ // 함수 시작
    if (!isVersionNineState(value)) // 버전 9 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const conversations = (value.conversations as Array<Record<string, unknown>>).map((conversation) => ({ ...conversation, mode: "character", storyId: null, storyCast: [] })); // 기존 대화는 캐릭터 모드
    const characterIds = new Set((value.characters as Character[]).map((character) => character.id)); // 남아 있는 캐릭터
    const stories = structuredClone(mockStories).filter((story) => story.cast.every((member) => characterIds.has(member.characterId))); // 등장인물이 모두 있는 예시 스토리
    const candidate: unknown = { ...value, schemaVersion: 10, conversations, stories }; // 버전 10 후보
    return isAppState(candidate) ? candidate : null; // 유효 변환 반환
} // 함수 종료

export function migrateVersionFive(value: Record<string, unknown>): AppState | null // 버전 5 변환 함수
{ // 함수 시작
    if (!isVersionFiveState(value)) // 버전 5 유효성 판정
    { // 잘못된 상태 시작
        return null; // 변환 중단
    } // 잘못된 상태 종료
    const charactersById = new Map(value.characters.map((character) => [character.id, character])); // 캐릭터 색인
    const conversations = value.conversations.map((conversation) => // 대화 변환
    { // 변환 시작
        const greeting = charactersById.get(conversation.characterId)?.greeting ?? conversation.lastMessage; // 첫 대사 선택
        const startSettings: ConversationStartSettings = // 시작 설정 생성
        { // 설정 시작
            profileId: conversation.userId, // 사용자 프로필 유지
            presetId: "legacy-default", // 이전 프리셋 표시
            relationshipStage: conversation.relationshipStage, // 관계 단계 유지
            relationshipLevel: conversation.relationshipLevel, // 관계 수치 유지
            emotion: conversation.emotion, // 감정 유지
            scene: conversation.currentScene, // 장면 유지
            greeting, // 첫 대사 유지
        }; // 설정 종료
        return { ...conversation, startSettings }; // 시작 설정 추가
    }); // 변환 종료
    const candidate: unknown = { ...value, schemaVersion: 6, conversations, memories: [], likedCharacterIds: [], followedCreatorIds: [], localReports: [] }; // 버전 6 후보
    return isRecord(candidate) ? migrateVersionSix(candidate) : null; // 연속 변환 반환
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
    return isRecord(candidate) ? migrateVersionFive(candidate) : null; // 연속 변환 반환
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
        return migrateVersionFour(parsed); // 버전 6 변환
    } // 버전 4 종료
    if (parsed.schemaVersion === 5) // 버전 5 판정
    { // 버전 5 시작
        return migrateVersionFive(parsed); // 버전 7 변환
    } // 버전 5 종료
    if (parsed.schemaVersion === 6) // 버전 6 판정
    { // 버전 6 시작
        return migrateVersionSix(parsed); // 버전 8 변환
    } // 버전 6 종료
    if (parsed.schemaVersion === 7) // 버전 7 판정
    { // 버전 7 시작
        return migrateVersionSeven(parsed); // 버전 10 변환
    } // 버전 7 종료
    if (parsed.schemaVersion === 8) // 버전 8 판정
    { // 버전 8 시작
        return migrateVersionEight(parsed); // 버전 10 변환
    } // 버전 8 종료
    if (parsed.schemaVersion === 9) // 버전 9 판정
    { // 버전 9 시작
        return migrateVersionNine(parsed); // 버전 10 변환
    } // 버전 9 종료
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
    if (isRecord(parsed) && isFiniteNumber(parsed.schemaVersion) && parsed.schemaVersion > 10) // 미래 버전 판정
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
    writeStoredBackups(storage, [...backups.slice(0, 2), entry]); // 복구 백업 저장
} // 함수 종료

function rejectStoredState(raw: string, storage: Storage): LoadResult // 저장 상태 거부 함수
{ // 함수 시작
    preserveCorruptedData(raw, storage); // 원본 백업
    return { state: createInitialState(), recovered: true, warning: "저장 데이터가 올바르지 않아 원본을 유지했습니다. 백업 내보내기로 확인해 주세요." }; // 비파괴 결과 반환
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

    public createBackupFromState(state: AppState, reason: BackupReason, now = new Date().toISOString()): BackupSnapshot // 전달 상태 백업
    { // 함수 시작
        if (!isAppState(state)) // 상태 유효성 판정
        { // 잘못된 상태 시작
            throw new TypeError("유효한 앱 상태만 백업할 수 있습니다."); // 상태 오류 발생
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
