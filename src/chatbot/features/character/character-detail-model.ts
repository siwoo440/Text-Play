import { characterDetailProfiles } from "@chatbot/features/character/character-detail-data"; // 상세 프로필 데이터
import { createDefaultConversationSettings } from "@chatbot/features/core/defaults"; // 대화방 기본 설정
import { rankingContentWarnings } from "@chatbot/mocks/ranking-character-concepts"; // 랭킹 캐릭터 주의 목록
import type { AppState, Character, CharacterDetailProfile, CharacterReport, Conversation, ConversationVersion, Message, ReportReason } from "@chatbot/features/core/types"; // 도메인 타입
import { resolveStartRelation } from "@chatbot/features/chat/relation-model"; // 시작 관계

export interface ConversationStartResult // 대화 시작 결과
{ // 구조 시작
    state: AppState; // 결과 상태
    conversation: Conversation; // 생성 대화
    version: ConversationVersion; // 현재 버전
    message: Message; // 첫 메시지
    href: string; // 대화 이동 경로
} // 구조 종료

export interface ConversationRouteSelection // 대화 주소 선택 결과
{ // 구조 시작
    conversation: Conversation; // 선택 대화
    version: ConversationVersion; // 선택 버전
    canonicalHref: string; // 정규 주소
    recovered: boolean; // 복구 여부
} // 구조 종료

export function createConversationHref(characterId: string, conversationId: string, versionId: string): string // 대화 주소 생성
{ // 함수 시작
    return `/chat/${encodeURIComponent(characterId)}?conversation=${encodeURIComponent(conversationId)}&version=${encodeURIComponent(versionId)}`; // 쿼리 주소 반환
} // 함수 종료

export function resolveConversationRoute(state: AppState, characterId: string, conversationId?: string, versionId?: string): ConversationRouteSelection // 대화 주소 선택
{ // 함수 시작
    const characterConversations = state.conversations.filter((conversation) => conversation.mode === "character" && conversation.characterId === characterId && conversation.archivedAt === null); // 캐릭터 대화 목록(스토리 대화 제외)
    const requestedConversation = characterConversations.find((conversation) => conversation.id === conversationId); // 요청 대화 조회
    const fallbackConversation = [...characterConversations].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))[0]; // 최근 대화 조회
    const conversation = requestedConversation ?? fallbackConversation; // 안전 대화 선택
    if (conversation === undefined) // 대화 부재 판정
    { // 조건 시작
        throw new Error("대상 캐릭터의 대화를 찾을 수 없습니다."); // 대화 오류
    } // 조건 종료
    const conversationVersions = state.conversationVersions.filter((version) => version.conversationId === conversation.id); // 소속 버전 목록
    const requestedVersion = conversationVersions.find((version) => version.id === versionId); // 요청 버전 조회
    const currentVersion = conversationVersions.find((version) => version.id === conversation.currentVersionId); // 현재 버전 조회
    const originalVersion = [...conversationVersions].sort((left, right) => left.ordinal - right.ordinal || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))[0]; // 원본 버전 조회
    const version = requestedVersion ?? currentVersion ?? originalVersion; // 안전 버전 선택
    if (version === undefined) // 버전 부재 판정
    { // 조건 시작
        throw new Error("대상 대화의 버전을 찾을 수 없습니다."); // 버전 오류
    } // 조건 종료
    const canonicalHref = createConversationHref(characterId, conversation.id, version.id); // 정규 주소 생성
    const recovered = conversationId !== conversation.id || versionId !== version.id; // 복구 여부 계산
    return { conversation, version, canonicalHref, recovered }; // 선택 결과 반환
} // 함수 종료

function createFallbackProfile(character: Character): CharacterDetailProfile // 기본 상세 프로필 생성
{ // 함수 시작
    const prologueId = `${character.id}-default`; // 기본 프롤로그 식별자
    return ( // 프로필 반환
    { // 프로필 시작
        characterId: character.id, // 캐릭터 식별자
        accentColor: "#8ea4ff", // 기본 강조 색상
        badges: [...character.tags], // 기존 태그 배지
        contentRating: character.contentRating, // 캐릭터 이용 등급
        contentWarnings: [...(rankingContentWarnings[character.id] ?? [])], // 등록된 주의 목록
        dialogueStyle: character.summary, // 기존 소개 활용
        relationshipSetup: character.worldSetting, // 기존 세계관 활용
        startPresets: // 기본 프리셋 목록
        [ // 목록 시작
            { id: "default", name: "기본 설정", description: character.worldSetting, relationshipStage: "첫 만남", relationshipLevel: 0, emotion: "호기심", scene: character.coverImage, greeting: character.greeting, prologueId }, // 기본 프리셋
        ], // 목록 종료
        prologues: // 기본 프롤로그 목록
        [ // 목록 시작
            { id: prologueId, title: character.name, description: character.worldSetting, image: character.coverImage, imageAlt: `${character.name}의 시작 장면`, greeting: character.greeting }, // 기본 프롤로그
        ], // 목록 종료
        releaseNotes: [], // 미확인 업데이트 제외
        sampleMetrics: { conversations: character.popularity, bookmarks: null, ratings: null }, // 확인 가능 지표
        relatedCharacterIds: [], // 기본 연관 목록
    }); // 프로필 종료
} // 함수 종료

export function getCharacterDetailProfile(character: Character): CharacterDetailProfile // 상세 프로필 조회
{ // 함수 시작
    const profile = characterDetailProfiles[character.id]; // 정적 프로필 조회
    const detail = structuredClone(profile ?? createFallbackProfile(character)); // 독립 프로필 복사
    const written = [...(character.updates ?? [])].sort((left, right) => right.date.localeCompare(left.date)).map((update) => ({ version: update.version.replace(/^v/i, ""), date: update.date, title: "", changes: [update.note] })); // 제작자가 편집기에서 적은 기록(최근 순, 화면이 v를 붙이므로 앞의 V는 뺌)
    return { ...detail, releaseNotes: [...written, ...detail.releaseNotes], contentRating: character.contentRating }; // 적은 기록을 앞에, 저장된 이용 등급 우선
} // 함수 종료

function collectWorldKeywords(value: string): Set<string> // 세계관 키워드 수집
{ // 함수 시작
    const words = value.split(/[^가-힣a-zA-Z0-9]+/).filter((word) => word.length >= 2); // 의미 단어 분리
    return new Set(words); // 고유 단어 반환
} // 함수 종료

export function getRelatedCharacters(character: Character, allCharacters: Character[], limit = 8): Character[] // 연관 캐릭터 조회
{ // 함수 시작
    const sourceTags = new Set(character.tags); // 기준 태그 집합
    const sourceWords = collectWorldKeywords(character.worldSetting); // 기준 세계관 단어
    const curatedIds = getCharacterDetailProfile(character).relatedCharacterIds; // 기획 연관 목록
    const scored = allCharacters.filter((candidate) => candidate.id !== character.id && candidate.visibility === "public" && candidate.publicationStatus === "published").map((candidate) => // 공개 후보 점수화
    { // 점수화 시작
        const tagScore = candidate.tags.filter((tag) => sourceTags.has(tag)).length * 10; // 태그 일치 점수
        const worldScore = [...collectWorldKeywords(candidate.worldSetting)].filter((word) => sourceWords.has(word)).length; // 세계관 일치 점수
        const curatedIndex = curatedIds.indexOf(candidate.id); // 기획 순서 조회
        const curatedScore = curatedIndex < 0 ? 0 : 100 - curatedIndex; // 기획 우선 점수
        return { character: candidate, score: curatedScore + tagScore + worldScore }; // 점수 결과 반환
    }); // 점수화 종료
    return scored.sort((left, right) => right.score - left.score || right.character.popularity - left.character.popularity || left.character.id.localeCompare(right.character.id)).slice(0, Math.max(0, limit)).map((entry) => entry.character); // 정렬 목록 반환
} // 함수 종료

export function getLatestActiveConversation(conversations: Conversation[], characterId: string): Conversation | null // 최근 활성 대화 조회
{ // 함수 시작
    const matches = conversations.filter((conversation) => conversation.mode === "character" && conversation.characterId === characterId && conversation.archivedAt === null); // 활성 대화 목록(스토리 대화 제외)
    return matches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null; // 최신 대화 반환
} // 함수 종료

export function createCharacterReport(characterId: string, reason: ReportReason, now = new Date().toISOString()): CharacterReport // 캐릭터 신고 생성
{ // 함수 시작
    return { id: `report-${characterId}-${now}`, characterId, reason, createdAt: now }; // 신고 정보 반환
} // 함수 종료

export function createUniqueConversationId(state: AppState, sourceId: string, now: string): string // 고유 대화 식별자 생성(캐릭터 또는 스토리 기준)
{ // 함수 시작
    const baseId = `conversation-${sourceId}-${now}`; // 기본 식별자 생성
    const usedIds = new Set(state.conversations.map((conversation) => conversation.id)); // 사용 식별자 수집
    if (!usedIds.has(baseId)) // 기본 식별자 확인
    { // 조건 시작
        return baseId; // 기본 식별자 반환
    } // 조건 종료
    let suffix = 2; // 접미사 시작값
    while (usedIds.has(`${baseId}-${suffix}`)) // 충돌 반복 확인
    { // 반복 시작
        suffix += 1; // 접미사 증가
    } // 반복 종료
    return `${baseId}-${suffix}`; // 고유 식별자 반환
} // 함수 종료

export function createConversationFromPreset(state: AppState, characterId: string, presetId: string, now = new Date().toISOString(), personaId: string | null = null): ConversationStartResult // 프리셋 대화 생성(고른 대화 프로필을 함께 받음)
{ // 함수 시작
    const character = state.characters.find((item) => item.id === characterId); // 캐릭터 조회
    if (character === undefined) // 캐릭터 부재 확인
    { // 조건 시작
        throw new Error("존재하지 않는 캐릭터입니다."); // 경로 오류
    } // 조건 종료
    const profile = getCharacterDetailProfile(character); // 상세 프로필 조회
    const preset = profile.startPresets.find((item) => item.id === presetId) ?? profile.startPresets[0]; // 시작 프리셋 선택
    if (preset === undefined) // 프리셋 부재 확인
    { // 조건 시작
        throw new Error("대화 시작 설정을 찾을 수 없습니다."); // 설정 오류
    } // 조건 종료
    const prologue = profile.prologues.find((item) => item.id === preset.prologueId) ?? profile.prologues[0]; // 연결 프롤로그 조회
    const sceneImage = prologue?.image ?? character.coverImage; // 표시 이미지 선택
    const startRelation = resolveStartRelation(character.statusTemplate, { presetId: preset.id, relationshipLevel: preset.relationshipLevel, relationshipStage: preset.relationshipStage }); // 시작 관계(정해 둔 시작 설정 우선, 자동 설정은 관계 스탯 초기값)
    const conversationId = createUniqueConversationId(state, characterId, now); // 대화 식별자 생성
    const versionId = `${conversationId}-version-1`; // 최초 버전 식별자
    const chosenPersonaId = personaId !== null && personaId !== state.personas[0]?.id && state.personas.some((persona) => persona.id === personaId) ? personaId : null; // 고른 대화 프로필(기본 프로필이거나 없는 프로필이면 비워 기본을 따름)
    const conversation: Conversation = // 새 대화 정의
    { // 대화 시작
        id: conversationId, // 대화 식별자
        characterId, // 캐릭터 식별자
        userId: state.profile.id, // 사용자 식별자
        title: `${character.name} · ${preset.name}`, // 대화 제목
        startSettings: { profileId: state.profile.id, presetId: preset.id, relationshipStage: startRelation.relationshipStage, relationshipLevel: startRelation.relationshipLevel, emotion: preset.emotion, scene: sceneImage, greeting: preset.greeting }, // 시작 설정
        currentVersionId: versionId, // 현재 버전 식별자
        archivedAt: null, // 보관 시각
        createdAt: now, // 생성 시각
        updatedAt: now, // 수정 시각
        mode: "character", // 캐릭터 모드
        storyId: null, // 연결 스토리 없음
        storyCast: [], // 등장인물 묶음 없음
        settings: { ...createDefaultConversationSettings(), personaId: chosenPersonaId }, // 대화방 기본 설정 + 고른 대화 프로필
        folderId: null, // 폴더 없음
    }; // 대화 종료
    const version: ConversationVersion = { id: versionId, conversationId, parentVersionId: null, forkRootVersionId: null, forkedFromMessageId: null, ordinal: 1, relationshipLevel: startRelation.relationshipLevel, relationshipStage: startRelation.relationshipStage, emotion: preset.emotion, currentScene: sceneImage, lastMessage: preset.greeting, createdAt: now, updatedAt: now }; // 최초 버전 생성
    const message: Message = { id: `${conversationId}-message-1`, conversationId, versionId, sourceMessageId: null, role: "assistant", content: preset.greeting, emotion: preset.emotion, sceneEvent: null, createdAt: now }; // 첫 메시지 생성
    const nextState: AppState = { ...state, conversations: [...state.conversations, conversation], conversationVersions: [...state.conversationVersions, version], messages: [...state.messages, message], selectedConversationId: conversationId }; // 다음 상태 생성
    return { state: nextState, conversation, version, message, href: createConversationHref(characterId, conversation.id, version.id) }; // 생성 결과 반환
} // 함수 종료

export function ensureConversationForCharacter(state: AppState, characterId: string, now = new Date().toISOString()): ConversationStartResult // 대화 준비
{ // 함수 시작
    const selected = state.selectedConversationId === null ? undefined : state.conversations.find((conversation) => conversation.id === state.selectedConversationId && conversation.mode === "character" && conversation.characterId === characterId && conversation.archivedAt === null); // 선택 대화 조회(스토리·보관 대화 제외)
    const existing = selected ?? getLatestActiveConversation(state.conversations, characterId); // 이어갈 대화 선택
    if (existing !== null && existing !== undefined) // 기존 대화 확인
    { // 조건 시작
        const version = state.conversationVersions.find((item) => item.id === existing.currentVersionId); // 현재 버전 조회
        if (version === undefined) // 버전 부재 판정
        { // 조건 시작
            throw new Error("현재 대화 버전을 찾을 수 없습니다."); // 버전 오류
        } // 조건 종료
        const message = state.messages.filter((item) => item.conversationId === existing.id && item.versionId === existing.currentVersionId).sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? { id: `${existing.id}-message-reference`, conversationId: existing.id, versionId: existing.currentVersionId, sourceMessageId: null, role: "assistant", content: version.lastMessage, emotion: version.emotion, sceneEvent: null, createdAt: version.updatedAt } as Message; // 최근 메시지 조회
        return { state: { ...state, selectedConversationId: existing.id }, conversation: existing, version, message, href: createConversationHref(characterId, existing.id, version.id) }; // 기존 대화 반환
    } // 조건 종료
    const character = state.characters.find((item) => item.id === characterId); // 캐릭터 조회
    if (character === undefined) // 캐릭터 부재 확인
    { // 조건 시작
        throw new Error("존재하지 않는 캐릭터입니다."); // 경로 오류
    } // 조건 종료
    const profile = getCharacterDetailProfile(character); // 상세 프로필 조회
    return createConversationFromPreset(state, characterId, profile.startPresets[0]?.id ?? "default", now); // 기본 대화 생성
} // 함수 종료
