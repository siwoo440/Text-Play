// 저장 데이터 검사: 앱 상태와 이전 버전 상태가 올바른 모양인지 판정한다(읽기 전용, 저장소·버전 변환과 분리).
import { isConversationVersionGraphValid } from "@chatbot/features/conversation/conversation-versioning"; // 버전 그래프 검증
import type { AdultVerification, AppSettings, AppState, Character, CharacterMemory, CharacterReport, Conversation, ConversationStartSettings, ConversationVersion, GeneratedImage, Message, Story, StoryCastMember, TokenWallet, UserProfile } from "@chatbot/features/core/types"; // 도메인 타입
import { EVENT_LIMIT } from "@chatbot/features/chat/event-model"; // 이벤트 개수 한도
import { EXAMPLE_LIMIT, LORE_LIMIT } from "@chatbot/features/chat/lore-model"; // 설정집·예시 대화 개수 한도
import { STAT_LIMIT } from "@chatbot/features/chat/stat-model"; // 스탯 개수 한도
import { isGeneratedImageSource } from "@chatbot/features/images/image-model"; // 생성 이미지 형식
import { INVITE_QUALIFY_MESSAGES, isInviteCode } from "@chatbot/features/rewards/referral-model"; // 초대 코드 형식
import { STORY_CAST_LIMIT } from "@chatbot/features/story/story-model"; // 등장인물 최대 수
import { languageSettings } from "@chatbot/lib/i18n"; // 언어 설정 목록

export const platformModes = ["auto", "mobile", "tablet", "desktop"] as const; // 플랫폼 목록
export const resolutionModes = ["auto", "compact", "comfortable", "wide"] as const; // 해상도 목록
export const layoutIds = ["M1", "M2", "M3", "T1", "T2", "T3", "D1", "D2", "D3"] as const; // 레이아웃 목록
export const memberships = ["free", "plus", "creator"] as const; // 멤버십 목록
export const visibilities = ["private", "unlisted", "public"] as const; // 공개 범위 목록
export const publicationStatuses = ["draft", "published"] as const; // 발행 상태 목록
export const relationshipStages = ["첫 만남", "아는 사이", "가까운 사이", "특별한 사이"] as const; // 관계 단계 목록
export const messageRoles = ["user", "assistant", "system"] as const; // 메시지 역할 목록
export const legacyMemoryCategories = ["summary", "event", "preference"] as const; // 버전 11 이하 기억 분류
export const memoryCategoriesV12 = ["long", "short", "relation", "goal"] as const; // 버전 12 기억 분류(장기·단기·관계도·목표)
export const memoryCategories = [...legacyMemoryCategories, ...memoryCategoriesV12] as const; // 모든 기억 분류
export const chatTierIds = ["open", "basic", "smart", "balance", "plus", "premium", "master"] as const; // 채팅 모델 등급
export const lengthMultipliers = [1, 1.5, 3, 5]; // 답변 길이 배수
export const thinkingDepths = ["off", "basic", "deep", "deeper"] as const; // 생각 깊이
export const writingStyles = ["default", "romance", "hardboiled", "comic", "literary"] as const; // 문체
export const chatFonts = ["default", "nanum-myeongjo", "gowun-batang", "noto-serif"] as const; // 채팅 글꼴
export const chatFontSizes = ["small", "medium", "large"] as const; // 채팅 글자 크기
export const colorThemes = ["light", "dark"] as const; // 색 테마(버전 12는 채팅 테마)
export const statModes = ["rule", "ai", "both"] as const; // 스탯 정하는 방법
export const statScopes = ["each", "shared"] as const; // 스탯 적용 대상
export const conversationFilters = ["all", "character", "story"] as const; // 대화 종류 탭
export const notificationKinds = ["notice", "image", "memory", "reward", "event"] as const; // 알림 종류
export const storyEventConditions = ["stat-min", "stat-max", "turn"] as const; // 이벤트 조건 종류
export const tokenRecordSources = ["attendance", "mission", "mission-bonus", "invite-welcome", "invite-friend", "chat", "scene-image", "studio-image"] as const; // 토큰 기록 출처
export const reportReasons = ["incorrect-rating", "harmful-content", "copyright", "spam", "other"] as const; // 신고 사유 목록
export const contentRatings = ["all", "teen", "mature"] as const; // 이용 등급 목록
export const adultVerificationMethods = ["mock"] as const; // 성인 인증 방식 목록
export const conversationSorts = ["recent", "relationship", "turns", "title"] as const; // 대화방 정렬 목록
export const conversationModes = ["character", "story"] as const; // 대화 종류 목록
export const imageStyles = ["anime", "illustration", "watercolor", "cinematic"] as const; // 그림체 목록
export const imageAspects = ["portrait", "square", "landscape"] as const; // 비율 목록
export const imageExposures = ["none", "covered", "uncovered"] as const; // 가림 처리 목록

export function isRecord(value: unknown): value is Record<string, unknown> // 객체 판정 함수
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부 반환
} // 함수 종료

export function isString(value: unknown): value is string // 문자열 판정 함수
{ // 함수 시작
    return typeof value === "string"; // 문자열 여부 반환
} // 함수 종료

export function isFiniteNumber(value: unknown): value is number // 숫자 판정 함수
{ // 함수 시작
    return typeof value === "number" && Number.isFinite(value); // 유효 숫자 반환
} // 함수 종료

export function isBoolean(value: unknown): value is boolean // 논리값 판정 함수
{ // 함수 시작
    return typeof value === "boolean"; // 논리값 여부 반환
} // 함수 종료

export function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T // 목록 판정 함수
{ // 함수 시작
    return isString(value) && values.includes(value as T); // 목록 포함 여부 반환
} // 함수 종료

export function isStringArray(value: unknown): value is string[] // 문자열 목록 판정 함수
{ // 함수 시작
    return Array.isArray(value) && value.every(isString); // 문자열 목록 여부 반환
} // 함수 종료

export function isUserProfile(value: unknown): value is UserProfile // 사용자 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.nickname) // 이름 확인
        && isString(value.avatar) // 이미지 확인
        && isOneOf(value.membership, memberships) // 멤버십 확인
        && isString(value.createdAt); // 가입 시각 확인
} // 함수 종료

export function isAdultVerification(value: unknown): value is AdultVerification // 성인 인증 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isOneOf(value.method, adultVerificationMethods) // 인증 방식 확인
        && isString(value.verifiedAt) // 인증 시각 확인
        && isString(value.expiresAt); // 만료 시각 확인
} // 함수 종료

export function isCharacter(value: unknown): value is Character // 캐릭터 판정 함수
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

export function isConversationStartSettings(value: unknown): value is ConversationStartSettings // 시작 설정 판정 함수
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

export function isConversation(value: unknown): value is Conversation // 대화 판정 함수
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

export function isVersionSixConversation(value: unknown): boolean // 버전 6 대화 판정 함수
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

export function isVersionFiveConversation(value: unknown): boolean // 버전 5 대화 판정 함수
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

export function isLegacyConversation(value: unknown): boolean // 이전 대화 판정 함수
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

export function isMessage(value: unknown): value is Message // 메시지 판정 함수
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
        && (value.bookmarked === undefined || isBoolean(value.bookmarked)) // 책갈피 확인(선택 항목)
        && isString(value.createdAt); // 생성 시각 확인
} // 함수 종료

export function isLegacyMessage(value: unknown): boolean // 이전 메시지 판정 함수
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

export function isConversationVersion(value: unknown): value is ConversationVersion // 대화 버전 판정 함수
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

export function isCharacterMemory(value: unknown): value is CharacterMemory // 기억 판정 함수
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

export function isCharacterReport(value: unknown): value is CharacterReport // 신고 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) // 식별자 확인
        && isString(value.characterId) // 캐릭터 식별자 확인
        && isOneOf(value.reason, reportReasons) // 신고 사유 확인
        && isString(value.createdAt); // 생성 시각 확인
} // 함수 종료

export function isTokenWallet(value: unknown): value is TokenWallet // 지갑 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isFiniteNumber(value.balance) // 잔액 확인
        && isFiniteNumber(value.totalUsed) // 누적 사용량 확인
        && isFiniteNumber(value.dailyChatUsed) // 대화 사용량 확인
        && isFiniteNumber(value.dailyImageUsed) // 이미지 사용량 확인
        && isString(value.updatedAt); // 수정 시각 확인
} // 함수 종료

export function isAppSettings(value: unknown): value is AppSettings // 설정 판정 함수
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
        && isFiniteNumber(value.dailyNotificationLimit) // 알림 제한 확인
        && (value.language === undefined || isOneOf(value.language, languageSettings)); // 언어 설정 확인(선택 항목, 없으면 자동)
} // 함수 종료

export function hasAppStateData(value: unknown, conversationValidator: (item: unknown) => boolean = isConversation, messageValidator: (item: unknown) => boolean = isMessage): value is Record<string, unknown> // 앱 상태 내용 판정 함수
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

export type SchemaEightFields = "profile" | "characters" | "settings"; // 스키마 8 변경 필드
export type VersionEightState = Omit<AppState, "schemaVersion" | "pinnedConversationIds" | "settings"> & { schemaVersion: 8; settings: Omit<AppSettings, "conversationSort"> }; // 버전 8 상태 타입
export type VersionSevenState = Omit<AppState, "schemaVersion" | "pinnedConversationIds" | SchemaEightFields> & { schemaVersion: 7; profile: Omit<UserProfile, "adultVerification">; characters: Array<Omit<Character, "contentRating">>; settings: Omit<AppSettings, "matureContentEnabled" | "conversationSort"> }; // 버전 7 상태 타입
export type SchemaSevenFields = "schemaVersion" | "conversations" | "conversationVersions" | "messages" | "memories" | "likedCharacterIds" | "followedCreatorIds" | "localReports"; // 스키마 7 필드 묶음
export type VersionSixConversation = Omit<Conversation, "currentVersionId"> & { relationshipLevel: number; relationshipStage: ConversationVersion["relationshipStage"]; emotion: string; currentScene: string; lastMessage: string }; // 버전 6 대화 타입
export type LegacyConversation = Omit<VersionSixConversation, "archivedAt" | "startSettings"> & { archivedAt?: string | null }; // 이전 대화 타입
export type VersionFiveConversation = Omit<VersionSixConversation, "startSettings">; // 버전 5 대화 타입
export type LegacyMessage = Omit<Message, "versionId" | "sourceMessageId">; // 이전 메시지 타입
export type VersionTwoState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 2; conversations: LegacyConversation[]; messages: LegacyMessage[] }; // 버전 2 상태 타입
export type VersionThreeState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 3; conversations: LegacyConversation[]; messages: LegacyMessage[] }; // 버전 3 상태 타입
export type VersionFourState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 4; conversations: LegacyConversation[]; messages: LegacyMessage[] }; // 버전 4 상태 타입
export type VersionFiveState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 5; conversations: VersionFiveConversation[]; messages: LegacyMessage[] }; // 버전 5 상태 타입
export type VersionSixState = Omit<AppState, SchemaSevenFields> & { schemaVersion: 6; conversations: VersionSixConversation[]; messages: LegacyMessage[]; memories: CharacterMemory[]; likedCharacterIds: string[]; followedCreatorIds: string[]; localReports: CharacterReport[] }; // 버전 6 상태 타입

export function hasSchemaEightFields(value: Record<string, unknown>): boolean // 스키마 8 필드 판정 함수
{ // 함수 시작
    const profile = value.profile as Record<string, unknown>; // 사용자 정보
    const settings = value.settings as Record<string, unknown>; // 설정 정보
    return (profile.adultVerification === null || isAdultVerification(profile.adultVerification)) // 성인 인증 확인
        && isBoolean(settings.matureContentEnabled) // 19세 표시 설정 확인
        && (value.characters as Array<Record<string, unknown>>).every((character) => isOneOf(character.contentRating, contentRatings)); // 이용 등급 확인
} // 함수 종료

export function hasSchemaNineFields(value: Record<string, unknown>): boolean // 스키마 9 필드 판정 함수
{ // 함수 시작
    const settings = value.settings as Record<string, unknown>; // 설정 정보
    return isStringArray(value.pinnedConversationIds) // 고정 대화 확인
        && isOneOf(settings.conversationSort, conversationSorts); // 대화방 정렬 확인
} // 함수 종료

export function isStoryCastMember(value: unknown): value is StoryCastMember // 등장인물 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.characterId) // 캐릭터 확인
        && isString(value.displayName) && value.displayName.trim().length > 0 // 이야기 속 이름 확인
        && isString(value.role) // 역할 확인
        && isString(value.firstLine); // 첫 대사 확인
} // 함수 종료

export function isGeneratedImage(value: unknown): value is GeneratedImage // 생성 이미지 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) && value.id.length > 0 // 식별자 확인
        && isString(value.prompt) // 설명 확인
        && isOneOf(value.style, imageStyles) // 그림체 확인
        && isOneOf(value.aspect, imageAspects) // 비율 확인
        && (value.referenceCharacterId === null || isString(value.referenceCharacterId)) // 참고 캐릭터 확인
        && isOneOf(value.contentRating, ["all", "teen", "mature"] as const) // 등급 확인
        && isOneOf(value.exposure, imageExposures) // 가림 처리 확인
        && (value.contentRating === "mature" ? value.exposure !== "none" : value.exposure === "none") // 19세만 가림 처리 값
        && isString(value.src) && isGeneratedImageSource(value.src) // 이미지 형식 확인
        && typeof value.favorite === "boolean" // 즐겨찾기 확인
        && isString(value.createdAt); // 생성 시각 확인
} // 함수 종료

export function isStatDefinition(value: unknown): boolean // 스탯 정의 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isString(value.id) && value.id.length > 0 && isString(value.name) && isString(value.icon) // 식별자·이름·아이콘
        && [value.initial, value.min, value.max, value.perTurn, value.aiMaxChange].every(isFiniteNumber) && (value.min as number) < (value.max as number) // 숫자·범위
        && isOneOf(value.mode, statModes) && isOneOf(value.scope, statScopes) // 방법·대상
        && Array.isArray(value.rules) && value.rules.every((rule) => isRecord(rule) && isString(rule.keyword) && isFiniteNumber(rule.delta)); // 낱말 규칙
} // 함수 종료

export function isStatValue(value: unknown): boolean // 스탯 값 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.statId) && isString(value.name) && isString(value.icon) && (value.target === null || isString(value.target)) && [value.value, value.delta, value.min, value.max].every(isFiniteNumber); // 값 확인
} // 함수 종료

export function hasStatusTemplateBase(value: unknown): value is Record<string, unknown> // 상태창 형식 공통 판정 함수
{ // 함수 시작
    return isRecord(value) && isBoolean(value.enabled) && isBoolean(value.location) && isBoolean(value.time) && isBoolean(value.tip) && isBoolean(value.thought) && isStringArray(value.customLabels) && value.customLabels.length <= 2; // 공통 항목 확인
} // 함수 종료

export function isVersionThirteenStatusTemplate(value: unknown): value is Record<string, unknown> // 버전 13 상태창 형식 판정 함수(스탯)
{ // 함수 시작
    return hasStatusTemplateBase(value) && Array.isArray(value.stats) && value.stats.length <= STAT_LIMIT && value.stats.every(isStatDefinition) && hasUniqueIds(value.stats); // 스탯 확인
} // 함수 종료

export function isStatusTemplate(value: unknown): boolean // 상태창 형식 판정 함수(버전 14: 스탯 + 관계 스탯 지정)
{ // 함수 시작
    return isVersionThirteenStatusTemplate(value) && (value.relationStatId === null || (value.stats as Array<Record<string, unknown>>).some((stat) => stat.id === value.relationStatId && stat.scope === "each")); // 관계 스탯은 인물마다 따로인 스탯만
} // 함수 종료

export function isVersionTwelveStatusTemplate(value: unknown): boolean // 버전 12 상태창 형식 판정 함수(호감도 켜기)
{ // 함수 시작
    return hasStatusTemplateBase(value) && isBoolean(value.affection); // 호감도 확인
} // 함수 종료

export function isWorkUpdate(value: unknown): boolean // 업데이트 기록 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && isString(value.version) && isString(value.date) && isString(value.note); // 기록 확인
} // 함수 종료

export function hasWorkFields(value: unknown, templateValidator: (template: unknown) => boolean = isStatusTemplate): boolean // 작품 추가 필드 판정 함수(플레이 가이드·상태창·업데이트)
{ // 함수 시작
    return isRecord(value) && isString(value.playGuide) && templateValidator(value.statusTemplate) && Array.isArray(value.updates) && value.updates.every(isWorkUpdate); // 필드 확인
} // 함수 종료

export function isTierOption(value: unknown): boolean // 등급별 답변 설정 판정 함수
{ // 함수 시작
    return isRecord(value) && lengthMultipliers.includes(value.length as number) && isOneOf(value.thinking, thinkingDepths); // 길이·생각 확인
} // 함수 종료

export function isConversationSettings(value: unknown): boolean // 대화방 설정 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isOneOf(value.tier, chatTierIds) // 등급 확인
        && isRecord(value.tierOptions) && Object.entries(value.tierOptions).every(([tier, option]) => isOneOf(tier, chatTierIds) && isTierOption(option)) // 등급별 설정 확인(없는 등급은 기본값으로 읽음)
        && (value.personaId === null || isString(value.personaId)) // 대화 프로필 확인
        && isString(value.userNote) && value.userNote.length <= 2000 // 유저 노트 확인
        && isBoolean(value.userNoteExtended) // 확장 확인
        && isOneOf(value.writingStyle, writingStyles) // 문체 확인
        && isBoolean(value.preventImpersonation); // 사칭 방지 확인
} // 함수 종료

export function hasStatusSnapshotBase(value: unknown): value is Record<string, unknown> // 상태창 값 공통 판정 함수
{ // 함수 시작
    return isRecord(value) // 객체 확인
        && isFiniteNumber(value.turn) // 턴 확인
        && (value.location === null || isString(value.location)) // 장소 확인
        && (value.time === null || isString(value.time)) // 시간 확인
        && (value.tip === null || isString(value.tip)) // 팁 확인
        && Array.isArray(value.thoughts) && value.thoughts.every((item) => isRecord(item) && isString(item.name) && isString(item.text)) // 속마음 확인
        && Array.isArray(value.custom) && value.custom.every((item) => isRecord(item) && isString(item.label) && isString(item.value)); // 직접 항목 확인
} // 함수 종료

function hasEventResult(value: Record<string, unknown>): boolean // 이벤트 결과 필드 판정 함수
{ // 함수 시작
    return isString(value.name) && isString(value.narration) && (value.scene === null || isString(value.scene)) && isString(value.title) && isBoolean(value.ending) && isBoolean(value.notify); // 결과 필드 반환
} // 함수 종료

export function isStoryEvent(value: unknown): boolean // 스탯 조건 이벤트 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && value.id.length > 0 && isOneOf(value.condition, storyEventConditions) && (value.statId === null || isString(value.statId)) && isFiniteNumber(value.value) && hasEventResult(value); // 이벤트 반환
} // 함수 종료

export function isTriggeredEvent(value: unknown): boolean // 일어난 이벤트 기록 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.eventId) && (value.target === null || isString(value.target)) && hasEventResult(value); // 기록 반환
} // 함수 종료

export function hasWorkEvents(value: unknown): boolean // 작품의 이벤트 판정 함수(개수, 식별자 중복, 조건 스탯이 작품에 있는지)
{ // 함수 시작
    if (!isRecord(value) || !Array.isArray(value.events) || value.events.length > EVENT_LIMIT || !value.events.every(isStoryEvent) || !hasUniqueIds(value.events) || !isRecord(value.statusTemplate) || !Array.isArray(value.statusTemplate.stats)) // 모양 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    const statIds = new Set((value.statusTemplate.stats as Array<{ id: string }>).map((stat) => stat.id)); // 작품의 스탯
    return (value.events as Array<{ condition: string; statId: string | null }>).every((event) => event.condition === "turn" || (event.statId !== null && statIds.has(event.statId))); // 조건 스탯 확인
} // 함수 종료

export function isLoreEntry(value: unknown): boolean // 설정집 항목 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && value.id.length > 0 && isString(value.title) && isStringArray(value.keywords) && isString(value.content); // 항목 반환
} // 함수 종료

export function isExampleDialogue(value: unknown): boolean // 예시 대화 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && value.id.length > 0 && isString(value.user) && isString(value.reply); // 예시 반환
} // 함수 종료

export function hasWorkLore(value: unknown): boolean // 작품의 설정집·예시 대화 판정 함수(개수, 식별자 중복)
{ // 함수 시작
    return isRecord(value) && Array.isArray(value.lorebook) && value.lorebook.length <= LORE_LIMIT && value.lorebook.every(isLoreEntry) && hasUniqueIds(value.lorebook) && Array.isArray(value.examples) && value.examples.length <= EXAMPLE_LIMIT && value.examples.every(isExampleDialogue) && hasUniqueIds(value.examples); // 판정 반환
} // 함수 종료

export function isStatusSnapshot(value: unknown): boolean // 상태창 값 판정 함수(버전 13: 스탯)
{ // 함수 시작
    return hasStatusSnapshotBase(value) && Array.isArray(value.stats) && value.stats.every(isStatValue) && (value.events === undefined || (Array.isArray(value.events) && value.events.every(isTriggeredEvent))); // 스탯 값·이벤트 기록 확인
} // 함수 종료

export function isVersionTwelveStatusSnapshot(value: unknown): boolean // 버전 12 상태창 값 판정 함수(호감도)
{ // 함수 시작
    return hasStatusSnapshotBase(value) && Array.isArray(value.affection) && value.affection.every((item) => isRecord(item) && isString(item.name) && isFiniteNumber(item.value) && isFiniteNumber(item.delta)); // 호감도 확인
} // 함수 종료

export function isPersona(value: unknown): boolean // 대화 프로필 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && value.id.length > 0 && isString(value.name) && value.name.trim().length > 0 && isString(value.description) && isString(value.createdAt) && isString(value.updatedAt); // 프로필 확인
} // 함수 종료

export function isConversationFolder(value: unknown): boolean // 대화 폴더 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && value.id.length > 0 && isString(value.name) && value.name.trim().length > 0 && isString(value.createdAt); // 폴더 확인
} // 함수 종료

export function isAppNotification(value: unknown): boolean // 알림 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && isOneOf(value.kind, notificationKinds) && isString(value.title) && isString(value.body) && (value.href === null || isString(value.href)) && isBoolean(value.read) && isString(value.createdAt); // 알림 확인
} // 함수 종료

export function hasUniqueIds(items: unknown[]): boolean // 식별자 중복 판정 함수
{ // 함수 시작
    return new Set(items.map((item) => (item as { id: string }).id)).size === items.length; // 중복 없음
} // 함수 종료

export function hasSchemaTwelveFields(value: Record<string, unknown>, schemaVersion: 12 | 13 | 14 = 14): boolean // 스키마 12·13·14 필드 판정 함수(13은 스탯·색 테마, 14는 관계 스탯 지정)
{ // 함수 시작
    const settings = value.settings as Record<string, unknown>; // 설정
    const templateValidator = schemaVersion === 14 ? isStatusTemplate : schemaVersion === 13 ? isVersionThirteenStatusTemplate : isVersionTwelveStatusTemplate; // 버전별 상태창 형식
    const snapshotValidator = schemaVersion === 12 ? isVersionTwelveStatusSnapshot : isStatusSnapshot; // 버전별 상태창 값
    if (!(value.characters as unknown[]).every((item) => hasWorkFields(item, templateValidator)) || !(value.stories as unknown[]).every((item) => hasWorkFields(item, templateValidator))) // 작품 필드 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    if (!Array.isArray(value.personas) || value.personas.length === 0 || !value.personas.every(isPersona) || !hasUniqueIds(value.personas)) // 대화 프로필 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    if (!Array.isArray(value.conversationFolders) || !value.conversationFolders.every(isConversationFolder) || !hasUniqueIds(value.conversationFolders)) // 폴더 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    if (!Array.isArray(value.notifications) || !value.notifications.every(isAppNotification)) // 알림 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    const folderIds = new Set((value.conversationFolders as Array<{ id: string }>).map((folder) => folder.id)); // 폴더 식별자
    const conversationsValid = (value.conversations as Array<Record<string, unknown>>).every((conversation) => isConversationSettings(conversation.settings) && (conversation.folderId === null || (isString(conversation.folderId) && folderIds.has(conversation.folderId)))); // 대화 설정·폴더 확인
    const messagesValid = (value.messages as Array<Record<string, unknown>>).every((message) => (message.status === undefined || message.status === null || snapshotValidator(message.status)) && (message.sceneImage === undefined || message.sceneImage === null || isString(message.sceneImage))); // 메시지 상태창·이미지 확인
    const memoriesValid = (value.memories as Array<Record<string, unknown>>).every((memory) => isOneOf(memory.category, memoryCategoriesV12)); // 새 기억 분류 확인
    const settingsValid = isOneOf(settings.conversationFilter, conversationFilters) && isOneOf(settings.chatFont, chatFonts) && isOneOf(settings.chatFontSize, chatFontSizes) && (schemaVersion === 12 ? isOneOf(settings.chatTheme, colorThemes) : isOneOf(settings.theme, colorThemes) && isBoolean(settings.chatPanelOpen)) && isBoolean(settings.showSceneImages) && isBoolean(settings.statusPanelOpen); // 새 설정 확인
    return conversationsValid && messagesValid && memoriesValid && settingsValid; // 결과 반환
} // 함수 종료

export function hasSchemaElevenFields(value: Record<string, unknown>): boolean // 스키마 11 필드 판정 함수
{ // 함수 시작
    return Array.isArray(value.images) && value.images.every(isGeneratedImage) && new Set((value.images as GeneratedImage[]).map((image) => image.id)).size === value.images.length; // 생성 이미지 목록 확인
} // 함수 종료

export function isStory(value: unknown): value is Story // 스토리 판정 함수
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

export function hasSchemaTenFields(value: Record<string, unknown>): boolean // 스키마 10 필드 판정 함수
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

function isCount(value: unknown): value is number // 0 이상 정수 판정 함수
{ // 함수 시작
    return isFiniteNumber(value) && Number.isInteger(value) && value >= 0; // 횟수 반환
} // 함수 종료

function isDateKey(value: unknown): boolean // 날짜 키(연-월-일) 판정 함수
{ // 함수 시작
    return isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value); // 날짜 키 반환
} // 함수 종료

export function isRewardState(value: unknown): boolean // 출석·미션 판정 함수
{ // 함수 시작
    if (!isRecord(value) || !isRecord(value.attendance) || !isRecord(value.missions) || !isCount(value.totalEarned)) // 묶음 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    const { attendance, missions } = value; // 출석·미션
    const attendanceValid = (attendance.lastDate === null || isDateKey(attendance.lastDate)) && isCount(attendance.cycleDay) && attendance.cycleDay <= 7 && isCount(attendance.totalDays); // 출석 확인
    const missionsValid = (missions.dateKey === null || isDateKey(missions.dateKey)) && isRecord(missions.progress) && Object.values(missions.progress).every(isCount) && isStringArray(missions.claimed) && isBoolean(missions.bonusClaimed); // 미션 확인
    const weekly = value.weekly; // 주간 미션(선택 항목)
    const weeklyValid = weekly === undefined || (isRecord(weekly) && (weekly.weekKey === null || isDateKey(weekly.weekKey)) && isRecord(weekly.progress) && Object.values(weekly.progress).every(isCount) && isStringArray(weekly.claimed)); // 주간 미션 확인
    return attendanceValid && missionsValid && weeklyValid; // 판정 반환
} // 함수 종료

export function isTokenRecord(value: unknown): boolean // 토큰 기록 판정 함수
{ // 함수 시작
    return isRecord(value) && isString(value.id) && value.id.length > 0 && isOneOf(value.direction, ["earn", "spend"]) && isOneOf(value.source, tokenRecordSources) && isString(value.label) && (value.work === undefined || isString(value.work)) && isCount(value.amount) && isFiniteNumber(value.balance) && isString(value.createdAt); // 기록 반환
} // 함수 종료

export function hasSchemaFifteenFields(value: Record<string, unknown>): boolean // 스키마 15 필드 판정 함수(출석·미션, 토큰 기록)
{ // 함수 시작
    return isRewardState(value.rewards) && Array.isArray(value.tokenRecords) && value.tokenRecords.every(isTokenRecord) && hasUniqueIds(value.tokenRecords); // 판정 반환
} // 함수 종료

export function isReferralState(value: unknown): boolean // 친구 초대 판정 함수
{ // 함수 시작
    if (!isRecord(value) || !Array.isArray(value.friends)) // 묶음 확인
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    const codeValid = value.code === null || (isString(value.code) && isInviteCode(value.code)); // 내 코드
    const redeemedValid = value.redeemedCode === null || (isString(value.redeemedCode) && isInviteCode(value.redeemedCode) && value.redeemedCode !== value.code); // 받은 코드(내 코드와 다름)
    const timesValid = (value.createdAt === null || isString(value.createdAt)) && (value.redeemedAt === null || isString(value.redeemedAt)); // 시각
    const friendsValid = value.friends.every((friend) => isRecord(friend) && isString(friend.id) && friend.id.length > 0 && isString(friend.nickname) && isString(friend.qualifiedAt) && (friend.rewardedAt === null || isString(friend.rewardedAt))) && hasUniqueIds(value.friends); // 친구 기록
    return codeValid && redeemedValid && timesValid && friendsValid && isCount(value.qualifyingMessages) && value.qualifyingMessages <= INVITE_QUALIFY_MESSAGES; // 판정 반환
} // 함수 종료

export function isAppState(value: unknown): value is AppState // 앱 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 18) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 14) && hasSchemaFifteenFields(value) && isReferralState(value.referral) && (value.characters as unknown[]).every(hasWorkEvents) && (value.stories as unknown[]).every(hasWorkEvents) && (value.characters as unknown[]).every(hasWorkLore) && (value.stories as unknown[]).every(hasWorkLore); // 버전 18 상태 반환
} // 함수 종료

export function isVersionSeventeenState(value: unknown): value is Record<string, unknown> // 버전 17 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 17) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 14) && hasSchemaFifteenFields(value) && isReferralState(value.referral) && (value.characters as unknown[]).every(hasWorkEvents) && (value.stories as unknown[]).every(hasWorkEvents); // 버전 17 상태 반환
} // 함수 종료

export function isVersionSixteenState(value: unknown): value is Record<string, unknown> // 버전 16 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 16) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 14) && hasSchemaFifteenFields(value) && isReferralState(value.referral); // 버전 16 상태 반환
} // 함수 종료

export function isVersionFifteenState(value: unknown): value is Record<string, unknown> // 버전 15 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 15) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 14) && hasSchemaFifteenFields(value); // 버전 15 상태 반환
} // 함수 종료

export function isVersionFourteenState(value: unknown): value is Record<string, unknown> // 버전 14 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 14) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 14); // 버전 14 상태 반환
} // 함수 종료

export function isVersionThirteenState(value: unknown): value is Record<string, unknown> // 버전 13 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 13) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 13); // 버전 13 상태 반환
} // 함수 종료

export function isVersionTwelveState(value: unknown): value is Record<string, unknown> // 버전 12 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 12) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value) && hasSchemaTwelveFields(value, 12); // 버전 12 상태 반환
} // 함수 종료

export function isVersionElevenState(value: unknown): value is Record<string, unknown> // 버전 11 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 11) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value) && hasSchemaElevenFields(value); // 버전 11 상태 반환
} // 함수 종료

export function isVersionTenState(value: unknown): value is Record<string, unknown> // 버전 10 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 10) && hasSchemaEightFields(value) && hasSchemaNineFields(value) && hasSchemaTenFields(value); // 버전 10 상태 반환
} // 함수 종료

export function isVersionNineState(value: unknown): value is Record<string, unknown> // 버전 9 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 9) && hasSchemaEightFields(value) && hasSchemaNineFields(value); // 버전 9 상태 반환
} // 함수 종료

export function isVersionEightState(value: unknown): value is VersionEightState // 버전 8 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 8) && hasSchemaEightFields(value); // 버전 8 상태 반환
} // 함수 종료

export function isVersionSevenState(value: unknown): value is VersionSevenState // 버전 7 상태 판정 함수
{ // 함수 시작
    return hasVersionedGraph(value, 7); // 버전 7 상태 반환
} // 함수 종료

export function hasVersionedGraph(value: unknown, schemaVersion: 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18): value is Record<string, unknown> // 버전 7 이후 공통 구조 판정 함수
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

export function isVersionSixState(value: unknown): value is VersionSixState // 버전 6 상태 판정 함수
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

export function isVersionFiveState(value: unknown): value is VersionFiveState // 버전 5 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isVersionFiveConversation, isLegacyMessage) && value.schemaVersion === 5; // 버전 5 상태 반환
} // 함수 종료

export function isVersionTwoState(value: unknown): value is VersionTwoState // 버전 2 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation, isLegacyMessage) && value.schemaVersion === 2; // 버전 2 상태 반환
} // 함수 종료

export function isVersionThreeState(value: unknown): value is VersionThreeState // 버전 3 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation, isLegacyMessage) && value.schemaVersion === 3; // 버전 3 상태 반환
} // 함수 종료

export function isVersionFourState(value: unknown): value is VersionFourState // 버전 4 상태 판정 함수
{ // 함수 시작
    return hasAppStateData(value, isLegacyConversation, isLegacyMessage) && value.schemaVersion === 4; // 버전 4 상태 반환
} // 함수 종료
