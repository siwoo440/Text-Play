export type ProviderMode = "mock"; // 공급자 모드
export type MessageRole = "user" | "assistant" | "system"; // 메시지 역할
export type PlatformMode = "auto" | "mobile" | "tablet" | "desktop"; // 플랫폼 모드
export type ResolutionMode = "auto" | "compact" | "comfortable" | "wide"; // 해상도 모드
export type LayoutId = "M1" | "M2" | "M3" | "T1" | "T2" | "T3" | "D1" | "D2" | "D3"; // 레이아웃 식별자
export type CharacterVisibility = "private" | "unlisted" | "public"; // 공개 범위
export type PublicationStatus = "draft" | "published"; // 발행 상태
export type Membership = "free" | "plus" | "creator"; // 멤버십 종류
export type RelationshipStage = "첫 만남" | "아는 사이" | "가까운 사이" | "특별한 사이"; // 관계 단계

export interface UserProfile // 사용자 프로필 구조
{ // 구조 시작
    id: string; // 사용자 식별자
    nickname: string; // 사용자 이름
    avatar: string; // 사용자 이미지
    membership: Membership; // 멤버십 상태
    createdAt: string; // 가입 시각
} // 구조 종료

export interface Character // 캐릭터 구조
{ // 구조 시작
    id: string; // 캐릭터 식별자
    creatorId: string; // 제작자 식별자
    creatorName: string; // 제작자 이름
    name: string; // 캐릭터 이름
    summary: string; // 한 줄 소개
    description: string; // 상세 설명
    personality: string; // 성격 설명
    greeting: string; // 첫 인사
    worldSetting: string; // 세계관 설명
    prompt: string; // 제작자 프롬프트
    tags: string[]; // 검색 태그
    coverImage: string; // 대표 이미지
    visibility: CharacterVisibility; // 공개 범위
    publicationStatus: PublicationStatus; // 발행 상태
    popularity: number; // 대화 지표
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface CharacterDraft // 캐릭터 초안 구조
{ // 구조 시작
    name: string; // 캐릭터 이름
    summary: string; // 한 줄 소개
    description: string; // 상세 설명
    personality: string; // 성격 설명
    greeting: string; // 첫 인사
    worldSetting: string; // 세계관 설명
    prompt: string; // 제작자 프롬프트
    tags: string[]; // 검색 태그
    coverImage: string; // 대표 이미지
    visibility: CharacterVisibility; // 공개 범위
} // 구조 종료

export interface Conversation // 대화방 구조
{ // 구조 시작
    id: string; // 대화방 식별자
    characterId: string; // 캐릭터 식별자
    userId: string; // 사용자 식별자
    title: string; // 대화방 이름
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
    currentScene: string; // 현재 장면
    lastMessage: string; // 마지막 메시지
    archivedAt: string | null; // 보관 시각
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface Message // 메시지 구조
{ // 구조 시작
    id: string; // 메시지 식별자
    conversationId: string; // 대화방 식별자
    role: MessageRole; // 메시지 역할
    content: string; // 메시지 내용
    emotion: string | null; // 감정 정보
    sceneEvent: string | null; // 장면 사건
    createdAt: string; // 생성 시각
} // 구조 종료

export interface TokenWallet // 토큰 지갑 구조
{ // 구조 시작
    balance: number; // 현재 잔액
    totalUsed: number; // 누적 사용량
    dailyChatUsed: number; // 일일 대화 사용량
    dailyImageUsed: number; // 일일 이미지 사용량
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface AppSettings // 앱 설정 구조
{ // 구조 시작
    platformMode: PlatformMode; // 플랫폼 선택
    layoutId: LayoutId | null; // 레이아웃 선택
    resolutionMode: ResolutionMode; // 해상도 선택
    leftPanelOpen: boolean; // 왼쪽 패널 상태
    rightPanelOpen: boolean; // 오른쪽 패널 상태
    proactiveMessageEnabled: boolean; // 선제 메시지 허용
    notificationStartTime: string; // 알림 시작 시각
    notificationEndTime: string; // 알림 종료 시각
    dailyNotificationLimit: number; // 일일 알림 제한
} // 구조 종료

export interface AppState // 앱 상태 구조
{ // 구조 시작
    schemaVersion: 5; // 스키마 버전
    providerMode: ProviderMode; // 공급자 설정
    profile: UserProfile; // 사용자 프로필
    characters: Character[]; // 캐릭터 목록
    conversations: Conversation[]; // 대화방 목록
    messages: Message[]; // 메시지 목록
    wallet: TokenWallet; // 토큰 지갑
    settings: AppSettings; // 사용자 설정
    bookmarkedCharacterIds: string[]; // 보관 캐릭터
    selectedConversationId: string | null; // 선택 대화방
} // 구조 종료
