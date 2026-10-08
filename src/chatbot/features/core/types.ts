import type { LanguageSetting } from "@chatbot/lib/i18n"; // 언어 설정
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
export type ChatTierId = "open" | "basic" | "smart" | "balance" | "plus" | "premium" | "master"; // 채팅 모델 등급(오픈: 내 컴퓨터의 공개 모델, 베이직·스마트: Gemini, 밸런스: GPT, 플러스·프리미엄·마스터: Claude)
export type LengthMultiplier = 1 | 1.5 | 3 | 5; // 답변 최대 길이 배수
export type ThinkingDepth = "off" | "basic" | "deep" | "deeper"; // 생각 깊이
export type WritingStyle = "default" | "romance" | "hardboiled" | "comic" | "literary"; // 문체
export type ChatFont = "default" | "nanum-myeongjo" | "gowun-batang" | "noto-serif"; // 채팅 글꼴
export type ChatFontSize = "small" | "medium" | "large"; // 채팅 글자 크기
export type ColorTheme = "light" | "dark"; // 사이트 색 테마(밝게·어둡게)
export type ConversationFilter = "all" | "character" | "story"; // 왼쪽 창 대화 종류 탭
export type NotificationKind = "notice" | "image" | "memory" | "reward" | "event"; // 알림 종류(reward: 출석·미션 보상, event: 스탯 조건 이벤트)
export type StoryEventCondition = "stat-min" | "stat-max" | "turn"; // 이벤트 조건(스탯 이상·스탯 이하·턴)
export type MissionId = "send-messages" | "start-conversation" | "favorite-work"; // 오늘의 미션 식별자
export type WeeklyMissionId = "weekly-messages" | "weekly-attendance" | "weekly-conversations"; // 주간 미션 식별자
export type TokenRecordSource = "attendance" | "mission" | "mission-bonus" | "invite-welcome" | "invite-friend" | "chat" | "scene-image" | "studio-image"; // 토큰 기록 출처(받음: 출석·미션·친구 초대, 사용: 대화·장면 이미지·이미지 스튜디오)
export type StatMode = "rule" | "ai" | "both"; // 스탯 수치를 정하는 방법(규칙·AI 판단·둘 다)
export type StatScope = "each" | "shared"; // 스탯 적용 대상(인물마다 따로·하나만)

export interface StatRule // 스탯 낱말 규칙
{ // 구조 시작
    keyword: string; // 사용자 메시지에 들어 있으면
    delta: number; // 이만큼 바뀜
} // 구조 종료

export interface StatDefinition // 제작자가 정한 스탯
{ // 구조 시작
    id: string; // 스탯 식별자
    name: string; // 이름(예: 호감도)
    icon: string; // 아이콘(예: ❤️)
    initial: number; // 초기값
    min: number; // 최솟값
    max: number; // 최댓값
    mode: StatMode; // 정하는 방법
    perTurn: number; // 규칙: 매 턴 변화
    rules: StatRule[]; // 규칙: 낱말 규칙
    aiMaxChange: number; // AI: 한 턴 최대 변화
    scope: StatScope; // 적용 대상
} // 구조 종료

export interface StatValue // 한 턴의 스탯 값
{ // 구조 시작
    statId: string; // 스탯 식별자
    name: string; // 이름(그 턴 기준)
    icon: string; // 아이콘
    target: string | null; // 인물 이름(하나만 적용이면 null)
    value: number; // 값
    delta: number; // 직전 턴 대비 변화
    min: number; // 최솟값
    max: number; // 최댓값
} // 구조 종료

export interface TierOption // 등급별 답변 설정
{ // 구조 시작
    length: LengthMultiplier; // 답변 최대 길이 배수
    thinking: ThinkingDepth; // 생각 깊이(1.5배 이상에서만)
} // 구조 종료

export interface ConversationSettings // 대화방별 설정
{ // 구조 시작
    tier: ChatTierId; // 채팅 모델 등급
    tierOptions: Partial<Record<ChatTierId, TierOption>>; // 등급별 답변 길이·생각 깊이(없는 등급은 기본값, 예전 데이터에는 세 등급만 있음)
    personaId: string | null; // 대화 프로필(null이면 기본 프로필)
    userNote: string; // 유저 노트
    userNoteExtended: boolean; // 유저 노트 2000자 확장
    writingStyle: WritingStyle; // 문체
    preventImpersonation: boolean; // 유저 사칭 방지
} // 구조 종료

export interface StoryEvent // 제작자가 정한 스탯 조건 이벤트
{ // 구조 시작
    id: string; // 이벤트 식별자
    name: string; // 이벤트 이름
    condition: StoryEventCondition; // 조건 종류
    statId: string | null; // 조건 스탯(턴 조건이면 없음)
    value: number; // 기준 값(스탯 값 또는 턴 번호)
    narration: string; // 내레이션({이름}은 인물 이름으로 바뀜)
    scene: string | null; // 특별 장면 그림(응답 아래에 표시, 토큰 없음)
    title: string; // 칭호
    ending: boolean; // 엔딩 표시(대화는 계속할 수 있음)
    notify: boolean; // 알림함에 알리기
} // 구조 종료

export interface TriggeredEvent // 한 턴에 일어난 이벤트(그 응답의 상태창에 기록)
{ // 구조 시작
    eventId: string; // 이벤트 식별자
    name: string; // 이벤트 이름
    target: string | null; // 조건을 채운 인물(공통 스탯·턴 조건이면 없음)
    narration: string; // 내레이션(이름을 넣은 문장)
    scene: string | null; // 특별 장면 그림
    title: string; // 칭호
    ending: boolean; // 엔딩 표시
    notify: boolean; // 알림함에 알리기
} // 구조 종료

export interface LoreEntry // 키워드 설정집 항목(대화에 키워드가 나오면 AI에게만 넘기는 배경 설정)
{ // 구조 시작
    id: string; // 항목 식별자
    title: string; // 설정 이름
    keywords: string[]; // 키워드(최근 대화에 나오면 이 설정을 넘김)
    content: string; // 설정 내용
} // 구조 종료

export interface ExampleDialogue // 예시 대화(말투를 보여 주는 한 쌍)
{ // 구조 시작
    id: string; // 예시 식별자
    user: string; // 사용자 말
    reply: string; // 작품의 답
} // 구조 종료

export interface StatusTemplate // 상태창 형식
{ // 구조 시작
    enabled: boolean; // 상태창 사용
    location: boolean; // 장소
    time: boolean; // 작품 속 시간
    tip: boolean; // 진행 팁
    thought: boolean; // 속마음
    customLabels: string[]; // 직접 정한 항목(최대 2개)
    stats: StatDefinition[]; // 제작자가 정한 스탯(최대 6개)
    relationStatId: string | null; // 관계 스탯(관계 단계·왼쪽 카드 막대·정렬이 이 스탯 값을 씀, 없으면 예전 관계 수치)
} // 구조 종료

export interface StatusSnapshot // 한 턴의 상태창 값
{ // 구조 시작
    turn: number; // 턴 번호
    location: string | null; // 장소
    time: string | null; // 작품 속 시간
    tip: string | null; // 진행 팁
    stats: StatValue[]; // 스탯 값과 변화
    thoughts: Array<{ name: string; text: string }>; // 인물별 속마음
    custom: Array<{ label: string; value: string }>; // 직접 정한 항목 값
    events?: TriggeredEvent[]; // 이 턴에 일어난 이벤트(없으면 생략)
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
    events: StoryEvent[]; // 스탯 조건 이벤트
    lorebook: LoreEntry[]; // 키워드 설정집
    examples: ExampleDialogue[]; // 예시 대화
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
    events: StoryEvent[]; // 스탯 조건 이벤트
    lorebook: LoreEntry[]; // 키워드 설정집
    examples: ExampleDialogue[]; // 예시 대화
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
    events: StoryEvent[]; // 스탯 조건 이벤트
    lorebook: LoreEntry[]; // 키워드 설정집
    examples: ExampleDialogue[]; // 예시 대화
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
    bookmarked?: boolean; // 책갈피한 답변(없으면 생략)
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

export interface AttendanceState // 출석 상태
{ // 구조 시작
    lastDate: string | null; // 마지막 출석 날짜(한국 시간 연-월-일)
    cycleDay: number; // 이번 도장판에서 찍은 칸(0~7)
    totalDays: number; // 누적 출석일
} // 구조 종료

export interface DailyMissionState // 오늘의 미션 상태
{ // 구조 시작
    dateKey: string | null; // 기록한 날짜(바뀌면 처음부터)
    progress: Record<string, number>; // 미션별 진행(없으면 0)
    claimed: string[]; // 보상을 받은 미션
    bonusClaimed: boolean; // 모두 완료 보너스 받음
} // 구조 종료

export interface WeeklyMissionState // 주간 미션 상태
{ // 구조 시작
    weekKey: string | null; // 기록한 주의 월요일(한국 시간 연-월-일, 바뀌면 처음부터)
    progress: Record<string, number>; // 미션별 진행(없으면 0)
    claimed: string[]; // 보상을 받은 미션
} // 구조 종료

export interface RewardState // 출석·미션 상태
{ // 구조 시작
    attendance: AttendanceState; // 출석
    missions: DailyMissionState; // 오늘의 미션
    weekly?: WeeklyMissionState; // 주간 미션(없으면 이번 주를 빈 상태로 봄)
    totalEarned: number; // 지금까지 받은 토큰
} // 구조 종료

export interface InvitedFriend // 내 초대로 들어와 조건을 채운 친구
{ // 구조 시작
    id: string; // 친구 식별자(서버가 정함)
    nickname: string; // 표시 이름
    qualifiedAt: string; // 조건(메시지 5번)을 채운 시각
    rewardedAt: string | null; // 보상을 받은 시각(한 달 한도를 넘으면 없음)
} // 구조 종료

export interface ReferralState // 친구 초대 상태
{ // 구조 시작
    code: string | null; // 내 초대 코드(만들기 전에는 없음)
    createdAt: string | null; // 코드를 만든 시각
    redeemedCode: string | null; // 내가 입력한 친구의 초대 코드(한 번만)
    redeemedAt: string | null; // 환영 보너스를 받은 시각
    qualifyingMessages: number; // 초대받은 뒤 보낸 메시지(0~5, 초대해 준 친구의 보상 조건)
    friends: InvitedFriend[]; // 초대한 친구(최근 순)
} // 구조 종료

export interface TokenRecord // 토큰 기록(받음·사용, 최근 순)
{ // 구조 시작
    id: string; // 기록 식별자
    direction: "earn" | "spend"; // 받음·사용
    source: TokenRecordSource; // 출처
    label: string; // 표시 이름
    work?: string; // 쓴 곳(작품 이름·이미지 설명, 받은 기록에는 없음)
    amount: number; // 토큰 수
    balance: number; // 기록 뒤 잔액
    createdAt: string; // 기록 시각
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
    theme: ColorTheme; // 사이트 색 테마(헤더 다크 모드 스위치)
    showSceneImages: boolean; // 대화 속 상황 이미지 보기
    statusPanelOpen: boolean; // 고정 상태창 펼침
    chatPanelOpen: boolean; // 채팅방 설정 패널 펼침(넓은 화면)
    language?: LanguageSetting; // 화면 언어(없으면 자동: 브라우저 언어를 따름)
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
    schemaVersion: 18; // 스키마 버전
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
    rewards: RewardState; // 출석·미션
    referral: ReferralState; // 친구 초대
    tokenRecords: TokenRecord[]; // 토큰 기록(최근 순)
    settings: AppSettings; // 사용자 설정
    bookmarkedCharacterIds: string[]; // 보관 캐릭터
    memories: CharacterMemory[]; // 장기 기억 목록
    likedCharacterIds: string[]; // 좋아요 캐릭터
    followedCreatorIds: string[]; // 팔로우 제작자
    localReports: CharacterReport[]; // 로컬 신고 목록
    pinnedConversationIds: string[]; // 고정 대화방(최근 고정 순)
    selectedConversationId: string | null; // 선택 대화방
} // 구조 종료
