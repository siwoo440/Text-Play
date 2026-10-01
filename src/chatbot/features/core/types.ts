export type ProviderMode = "mock"; // 공급자 모드
export type MessageRole = "user" | "assistant" | "system"; // 메시지 역할
export type PlatformMode = "auto" | "mobile" | "tablet" | "desktop"; // 플랫폼 모드
export type ResolutionMode = "auto" | "compact" | "comfortable" | "wide"; // 해상도 모드
export type LayoutId = "M1" | "M2" | "M3" | "T1" | "T2" | "T3" | "D1" | "D2" | "D3"; // 레이아웃 식별자
export type CharacterVisibility = "private" | "unlisted" | "public"; // 공개 범위
export type PublicationStatus = "draft" | "published"; // 발행 상태
export type Membership = "free" | "plus" | "creator"; // 멤버십 종류
export type RelationshipStage = "첫 만남" | "아는 사이" | "가까운 사이" | "특별한 사이"; // 관계 단계
export type MemoryCategory = "long" | "short" | "relation" | "goal"; // 요약 메모리 분류(장기 기억·단기 기억·관계도·목표)
export type ReportReason = "incorrect-rating" | "harmful-content" | "copyright" | "spam" | "other"; // 신고 사유
export type AdultVerificationMethod = "mock"; // 성인 인증 방식
export type ConversationSort = "recent" | "relationship" | "turns" | "title"; // 대화방 정렬 기준
export type ChatTierId = "basic" | "plus" | "premium"; // 채팅 모델 등급
export type LengthMultiplier = 1 | 1.5 | 3 | 5; // 답변 최대 길이 배수
export type ThinkingDepth = "off" | "basic" | "deep" | "deeper"; // 생각 깊이
export type WritingStyle = "default" | "romance" | "hardboiled" | "comic" | "literary"; // 문체
export type ChatFont = "default" | "nanum-myeongjo" | "gowun-batang" | "noto-serif"; // 채팅 글꼴
export type ChatFontSize = "small" | "medium" | "large"; // 채팅 글자 크기
export type ChatTheme = "light" | "dark"; // 채팅 테마
export type ConversationFilter = "all" | "character" | "story"; // 왼쪽 창 대화 종류 탭
export type NotificationKind = "notice" | "image" | "memory"; // 알림 종류

export interface TierOption // 등급별 답변 설정
{ // 구조 시작
    length: LengthMultiplier; // 답변 최대 길이 배수
    thinking: ThinkingDepth; // 생각 깊이(1.5배 이상에서만)
} // 구조 종료

export interface ConversationSettings // 대화방별 설정
{ // 구조 시작
    tier: ChatTierId; // 채팅 모델 등급
    tierOptions: Record<ChatTierId, TierOption>; // 등급별 답변 길이·생각 깊이
    personaId: string | null; // 대화 프로필(null이면 기본 프로필)
    userNote: string; // 유저 노트
    userNoteExtended: boolean; // 유저 노트 2000자 확장
    writingStyle: WritingStyle; // 문체
    preventImpersonation: boolean; // 유저 사칭 방지
} // 구조 종료

export interface StatusTemplate // 상태창 형식
{ // 구조 시작
    enabled: boolean; // 상태창 사용
    location: boolean; // 장소
    time: boolean; // 작품 속 시간
    tip: boolean; // 진행 팁
    affection: boolean; // 호감도
    thought: boolean; // 속마음
    customLabels: string[]; // 직접 정한 항목(최대 2개)
} // 구조 종료

export interface StatusSnapshot // 한 턴의 상태창 값
{ // 구조 시작
    turn: number; // 턴 번호
    location: string | null; // 장소
    time: string | null; // 작품 속 시간
    tip: string | null; // 진행 팁
    affection: Array<{ name: string; value: number; delta: number }>; // 인물별 호감도와 변화
    thoughts: Array<{ name: string; text: string }>; // 인물별 속마음
    custom: Array<{ label: string; value: string }>; // 직접 정한 항목 값
} // 구조 종료

export interface WorkUpdate // 작품 업데이트 기록
{ // 구조 시작
    id: string; // 기록 식별자
    version: string; // 버전 이름
    date: string; // 날짜(YYYY-MM-DD)
    note: string; // 변경 내용
} // 구조 종료

export interface Persona // 대화 프로필(사용자 페르소나)
{ // 구조 시작
    id: string; // 프로필 식별자
    name: string; // 이름
    description: string; // 소개
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface ConversationFolder // 대화 폴더
{ // 구조 시작
    id: string; // 폴더 식별자
    name: string; // 폴더 이름
    createdAt: string; // 생성 시각
} // 구조 종료

export interface AppNotification // 알림
{ // 구조 시작
    id: string; // 알림 식별자
    kind: NotificationKind; // 알림 종류
    title: string; // 제목
    body: string; // 내용
    href: string | null; // 이동 주소
    read: boolean; // 읽음 여부
    createdAt: string; // 생성 시각
} // 구조 종료
export type ConversationMode = "character" | "story"; // 대화 종류(캐릭터 1명 대화 / 스토리 상황극)

export interface StoryCastMember // 스토리 등장인물
{ // 구조 시작
    characterId: string; // 연결 캐릭터 식별자
    displayName: string; // 이야기 속 이름(대사 앞 표시)
    role: string; // 이 이야기에서 맡은 역할
    firstLine: string; // 시작 장면 첫 대사(없으면 빈 문자열)
} // 구조 종료

export interface Story // 스토리(여러 인물 또는 한 명과 펼치는 상황극)
{ // 구조 시작
    id: string; // 스토리 식별자
    creatorId: string; // 제작자 식별자
    creatorName: string; // 제작자 이름
    title: string; // 제목
    summary: string; // 한 줄 소개
    synopsis: string; // 줄거리·세계관
    opening: string; // 시작 장면 내레이션
    userRole: string; // 사용자가 맡는 역할
    cast: StoryCastMember[]; // 등장인물(1~4명)
    tags: string[]; // 태그
    coverImage: string; // 대표 이미지
    visibility: CharacterVisibility; // 공개 범위
    contentRating: ContentRating; // 이용 등급
    publicationStatus: PublicationStatus; // 발행 상태
    popularity: number; // 이용 지표
    playGuide: string; // 플레이 가이드
    statusTemplate: StatusTemplate; // 상태창 형식
    updates: WorkUpdate[]; // 업데이트 기록
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface AdultVerification // 성인 인증 구조
{ // 구조 시작
    method: AdultVerificationMethod; // 인증 방식
    verifiedAt: string; // 인증 시각
    expiresAt: string; // 만료 시각
} // 구조 종료

export interface UserProfile // 사용자 프로필 구조
{ // 구조 시작
    id: string; // 사용자 식별자
    nickname: string; // 사용자 이름
    avatar: string; // 사용자 이미지
    membership: Membership; // 멤버십 상태
    adultVerification: AdultVerification | null; // 성인 인증 상태
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
    contentRating: ContentRating; // 이용 등급
    publicationStatus: PublicationStatus; // 발행 상태
    popularity: number; // 대화 지표
    playGuide: string; // 플레이 가이드
    statusTemplate: StatusTemplate; // 상태창 형식
    updates: WorkUpdate[]; // 업데이트 기록
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
    contentRating: ContentRating; // 이용 등급
    playGuide: string; // 플레이 가이드
    statusTemplate: StatusTemplate; // 상태창 형식
    updates: WorkUpdate[]; // 업데이트 기록
} // 구조 종료

export interface Conversation // 대화방 구조
{ // 구조 시작
    id: string; // 대화방 식별자
    characterId: string; // 캐릭터 식별자
    userId: string; // 사용자 식별자
    title: string; // 대화방 이름
    startSettings: ConversationStartSettings; // 시작 설정
    currentVersionId: string; // 현재 버전 식별자
    archivedAt: string | null; // 보관 시각
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
    mode: ConversationMode; // 대화 종류
    storyId: string | null; // 연결 스토리(캐릭터 모드는 null)
    storyCast: StoryCastMember[]; // 시작 시점 등장인물 묶음(캐릭터 모드는 빈 목록)
    settings: ConversationSettings; // 대화방별 설정
    folderId: string | null; // 대화 폴더
} // 구조 종료

export interface ConversationVersion // 대화 버전 구조
{ // 구조 시작
    id: string; // 버전 식별자
    conversationId: string; // 대화방 식별자
    parentVersionId: string | null; // 부모 버전 식별자
    forkRootVersionId: string | null; // 분기 원본 식별자
    forkedFromMessageId: string | null; // 분기 메시지 식별자
    ordinal: number; // 버전 순번
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
    currentScene: string; // 현재 장면
    lastMessage: string; // 마지막 메시지
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface ConversationStartSettings // 대화 시작 설정 구조
{ // 구조 시작
    profileId: string; // 프로필 식별자
    presetId: string; // 프리셋 식별자
    relationshipStage: RelationshipStage; // 시작 관계 단계
    relationshipLevel: number; // 시작 관계 수치
    emotion: string; // 시작 감정
    scene: string; // 시작 장면
    greeting: string; // 시작 대사
} // 구조 종료

export interface CharacterMemory // 캐릭터 기억 구조
{ // 구조 시작
    id: string; // 기억 식별자
    characterId: string; // 캐릭터 식별자
    conversationId: string; // 대화방 식별자
    category: MemoryCategory; // 기억 분류
    content: string; // 기억 내용
    sourceMessageIds: string[]; // 근거 메시지 식별자
    editedByUser: boolean; // 사용자 편집 여부
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료

export interface CharacterReport // 캐릭터 신고 구조
{ // 구조 시작
    id: string; // 신고 식별자
    characterId: string; // 캐릭터 식별자
    reason: ReportReason; // 신고 사유
    createdAt: string; // 생성 시각
} // 구조 종료

export type ContentRating = "all" | "teen" | "mature"; // 콘텐츠 등급

export interface CharacterStartPreset // 캐릭터 시작 프리셋 구조
{ // 구조 시작
    id: string; // 프리셋 식별자
    name: string; // 프리셋 이름
    description: string; // 프리셋 설명
    relationshipStage: RelationshipStage; // 시작 관계 단계
    relationshipLevel: number; // 시작 관계 수치
    emotion: string; // 시작 감정
    scene: string; // 시작 장면
    greeting: string; // 시작 대사
    prologueId: string; // 프롤로그 식별자
} // 구조 종료

export interface CharacterPrologue // 캐릭터 프롤로그 구조
{ // 구조 시작
    id: string; // 프롤로그 식별자
    title: string; // 프롤로그 제목
    description: string; // 장면 설명
    image: string; // 장면 이미지
    imageAlt: string; // 이미지 대체 문구
    greeting: string; // 첫 대사
} // 구조 종료

export interface CharacterReleaseNote // 캐릭터 업데이트 구조
{ // 구조 시작
    version: string; // 버전 번호
    date: string; // 배포 날짜
    title: string; // 업데이트 제목
    changes: string[]; // 변경 사항
} // 구조 종료

export interface CharacterSampleMetrics // 캐릭터 샘플 지표 구조
{ // 구조 시작
    conversations: number; // 대화 수
    bookmarks: number | null; // 보관 수
    ratings: number | null; // 평가 수
} // 구조 종료

export interface CharacterDetailProfile // 캐릭터 상세 프로필 구조
{ // 구조 시작
    characterId: string; // 캐릭터 식별자
    accentColor: string; // 강조 색상
    badges: string[]; // 캐릭터 배지
    contentRating: ContentRating; // 콘텐츠 등급
    contentWarnings: string[]; // 콘텐츠 주의 목록
    dialogueStyle: string; // 대화 스타일
    relationshipSetup: string; // 관계 설정
    startPresets: CharacterStartPreset[]; // 시작 프리셋 목록
    prologues: CharacterPrologue[]; // 프롤로그 목록
    releaseNotes: CharacterReleaseNote[]; // 업데이트 목록
    sampleMetrics: CharacterSampleMetrics; // 샘플 지표
    relatedCharacterIds: string[]; // 연관 캐릭터 식별자
} // 구조 종료

export interface Message // 메시지 구조
{ // 구조 시작
    id: string; // 메시지 식별자
    conversationId: string; // 대화방 식별자
    versionId: string; // 버전 식별자
    sourceMessageId: string | null; // 원본 메시지 식별자
    role: MessageRole; // 메시지 역할
    content: string; // 메시지 내용
    emotion: string | null; // 감정 정보
    sceneEvent: string | null; // 장면 사건
    scenePath?: string | null; // 장면 경로 기록
    status?: StatusSnapshot | null; // 이 응답 턴의 상태창
    sceneImage?: string | null; // 이 응답에 붙은 상황 이미지
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
    matureContentEnabled: boolean; // 19세 이상 콘텐츠 표시
    conversationSort: ConversationSort; // 왼쪽 대화방 정렬
    conversationFilter: ConversationFilter; // 왼쪽 대화방 종류 탭
    chatFont: ChatFont; // 채팅 글꼴
    chatFontSize: ChatFontSize; // 채팅 글자 크기
    chatTheme: ChatTheme; // 채팅 테마
    showSceneImages: boolean; // 대화 속 상황 이미지 보기
    statusPanelOpen: boolean; // 고정 상태창 펼침
} // 구조 종료

export type ImageStyle = "anime" | "illustration" | "watercolor" | "cinematic"; // 이미지 그림체
export type ImageAspect = "portrait" | "square" | "landscape"; // 이미지 비율
export type ImageExposure = "none" | "covered" | "uncovered"; // 19세 이미지 가림 처리(19세가 아니면 none)

export interface GeneratedImage // 이미지 스튜디오 생성 이미지
{ // 구조 시작
    id: string; // 이미지 식별자
    prompt: string; // 장면 설명
    style: ImageStyle; // 그림체
    aspect: ImageAspect; // 비율
    referenceCharacterId: string | null; // 참고 캐릭터
    contentRating: ContentRating; // 이용 등급
    exposure: ImageExposure; // 가림 처리
    src: string; // 이미지 주소(Mock은 SVG 데이터)
    favorite: boolean; // 즐겨찾기
    createdAt: string; // 생성 시각
} // 구조 종료

export interface AppState // 앱 상태 구조
{ // 구조 시작
    schemaVersion: 12; // 스키마 버전
    providerMode: ProviderMode; // 공급자 설정
    profile: UserProfile; // 사용자 프로필
    characters: Character[]; // 캐릭터 목록
    stories: Story[]; // 스토리 목록
    images: GeneratedImage[]; // 생성 이미지(최근 순)
    personas: Persona[]; // 대화 프로필(첫 항목이 기본)
    conversationFolders: ConversationFolder[]; // 대화 폴더
    notifications: AppNotification[]; // 알림(최근 순)
    conversations: Conversation[]; // 대화방 목록
    conversationVersions: ConversationVersion[]; // 대화 버전 목록
    messages: Message[]; // 메시지 목록
    wallet: TokenWallet; // 토큰 지갑
    settings: AppSettings; // 사용자 설정
    bookmarkedCharacterIds: string[]; // 보관 캐릭터
    memories: CharacterMemory[]; // 장기 기억 목록
    likedCharacterIds: string[]; // 좋아요 캐릭터
    followedCreatorIds: string[]; // 팔로우 제작자
    localReports: CharacterReport[]; // 로컬 신고 목록
    pinnedConversationIds: string[]; // 고정 대화방(최근 고정 순)
    selectedConversationId: string | null; // 선택 대화방
} // 구조 종료
