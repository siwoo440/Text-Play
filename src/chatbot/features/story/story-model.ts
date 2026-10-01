import { canViewMatureContent } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { createConversationHref, createUniqueConversationId, type ConversationRouteSelection, type ConversationStartResult } from "@chatbot/features/character/character-detail-model"; // 대화 주소·생성 도구
import type { AppState, Character, ContentRating, Conversation, ConversationVersion, Message, Story, StoryCastMember } from "@chatbot/features/core/types"; // 도메인 타입

export const STORY_CAST_LIMIT = 4; // 등장인물 최대 수
export const STORY_NARRATOR_LABEL = "내레이션"; // 내레이션 표시 이름
export const STORY_CONTINUE_TEXT = "(다음 장면으로)"; // 입력 없이 이야기를 진행하는 문구

export interface StorySegment // 스토리 응답 조각
{ // 구조 시작
    kind: "narration" | "character" | "unknown"; // 조각 종류
    label: string; // 표시 이름
    characterId: string | null; // 등장인물 캐릭터(내레이션·모르는 이름은 null)
    text: string; // 조각 내용
} // 구조 종료

export interface StoryCastEntry // 화면용 등장인물
{ // 구조 시작
    member: StoryCastMember; // 등장인물 정보
    character: Character | undefined; // 연결 캐릭터(삭제됐으면 없음)
} // 구조 종료

const ratingOrder: Record<ContentRating, number> = { all: 0, teen: 1, mature: 2 }; // 등급 순서
const linePattern = /^\[([^\]\n]{1,40})\]\s?(.*)$/; // [이름] 대사 형식

export function deriveDisplayName(name: string): string // 캐릭터 이름에서 짧은 이름 만들기
{ // 함수 시작
    const parts = name.split(/[\s,·]+/).filter((part) => part.length > 0); // 띄어쓰기·쉼표로 나누기
    return parts.at(-1) ?? name; // 마지막 낱말 반환
} // 함수 종료

export function formatStoryLine(label: string, text: string): string // 한 줄 대사 형식
{ // 함수 시작
    return `[${label}] ${text}`; // [이름] 대사 반환
} // 함수 종료

export function parseStoryMessage(content: string, cast: readonly StoryCastMember[]): StorySegment[] // 응답을 내레이션·인물 대사로 나누기
{ // 함수 시작
    const segments: StorySegment[] = []; // 조각 목록
    for (const rawLine of content.split("\n")) // 줄 순회
    { // 순회 시작
        const line = rawLine.trim(); // 줄 정리
        const match = linePattern.exec(line); // 이름 표시 확인
        if (match !== null) // 새 화자 판정
        { // 조건 시작
            const label = match[1].trim(); // 표시 이름
            const text = match[2].trim(); // 대사
            const member = cast.find((item) => item.displayName === label); // 등장인물 조회
            const kind = label === STORY_NARRATOR_LABEL ? "narration" : member === undefined ? "unknown" : "character"; // 조각 종류
            segments.push({ kind, label, characterId: member?.characterId ?? null, text }); // 조각 추가
            continue; // 다음 줄
        } // 조건 종료
        if (line.length === 0) // 빈 줄 판정
        { // 조건 시작
            continue; // 건너뛰기
        } // 조건 종료
        const last = segments.at(-1); // 직전 조각
        if (last === undefined) // 첫 줄 판정
        { // 조건 시작
            segments.push({ kind: "narration", label: STORY_NARRATOR_LABEL, characterId: null, text: line }); // 표시 없는 첫 줄은 내레이션
            continue; // 다음 줄
        } // 조건 종료
        last.text = last.text.length === 0 ? line : `${last.text}\n${line}`; // 직전 조각에 이어 붙이기
    } // 순회 종료
    return segments; // 조각 목록 반환
} // 함수 종료

export function summarizeStoryContent(content: string, cast: readonly StoryCastMember[]): string // 목록 미리보기 문구
{ // 함수 시작
    const segments = parseStoryMessage(content, cast); // 조각 나누기
    const lastLine = [...segments].reverse().find((segment) => segment.kind !== "narration"); // 마지막 인물 대사
    if (lastLine !== undefined) // 대사 존재 판정
    { // 조건 시작
        return `${lastLine.label}: ${lastLine.text}`; // 이름과 대사 반환
    } // 조건 종료
    return segments.at(-1)?.text ?? content; // 내레이션 반환
} // 함수 종료

export function createStoryOpening(story: Pick<Story, "opening" | "cast">): string // 시작 장면 응답 만들기
{ // 함수 시작
    const lines = [formatStoryLine(STORY_NARRATOR_LABEL, story.opening)]; // 내레이션
    for (const member of story.cast) // 등장인물 순회
    { // 순회 시작
        if (member.firstLine.trim().length > 0) // 첫 대사 판정
        { // 조건 시작
            lines.push(formatStoryLine(member.displayName, member.firstLine.trim())); // 첫 대사 추가
        } // 조건 종료
    } // 순회 종료
    return lines.join("\n"); // 시작 장면 반환
} // 함수 종료

export function addressText(member: StoryCastMember, text: string): string // 말 걸 상대 붙이기
{ // 함수 시작
    return `@${member.displayName} ${text}`; // @이름 문장 반환
} // 함수 종료

export function getMentionedCastMember(text: string, cast: readonly StoryCastMember[]): StoryCastMember | null // 지목한 인물 찾기
{ // 함수 시작
    const trimmed = text.trim(); // 문장 정리
    const candidates = [...cast].sort((left, right) => right.displayName.length - left.displayName.length); // 긴 이름 우선
    return candidates.find((member) => trimmed.startsWith(`@${member.displayName}`)) ?? null; // 지목 인물 반환
} // 함수 종료

export function getStoryCastEntries(state: Pick<AppState, "characters">, cast: readonly StoryCastMember[]): StoryCastEntry[] // 등장인물과 캐릭터 연결
{ // 함수 시작
    return cast.map((member) => ({ member, character: state.characters.find((character) => character.id === member.characterId) })); // 연결 목록 반환
} // 함수 종료

export function getRequiredStoryRating(characters: readonly Pick<Character, "contentRating">[]): ContentRating // 등장인물 기준 최소 등급
{ // 함수 시작
    return characters.reduce<ContentRating>((highest, character) => ratingOrder[character.contentRating] > ratingOrder[highest] ? character.contentRating : highest, "all"); // 가장 높은 등급 반환
} // 함수 종료

export function isMatureStory(story: Pick<Story, "contentRating">): boolean // 19세 스토리 판정
{ // 함수 시작
    return story.contentRating === "mature"; // 19세 여부 반환
} // 함수 종료

export function isStoryLocked(story: Pick<Story, "contentRating">, state: Parameters<typeof canViewMatureContent>[0], now: Date): boolean // 잠금 스토리 판정
{ // 함수 시작
    return isMatureStory(story) && !canViewMatureContent(state, now); // 잠금 여부 반환
} // 함수 종료

export function getDiscoverableStories(stories: readonly Story[], showMature: boolean): Story[] // 추천 가능한 공개 스토리
{ // 함수 시작
    return stories.filter((story) => story.visibility === "public" && story.publicationStatus === "published" && (showMature || !isMatureStory(story))); // 공개·등급 필터
} // 함수 종료

export function createStoryChatHref(storyId: string, conversationId: string, versionId: string): string // 스토리 대화 주소
{ // 함수 시작
    return `/stories/${encodeURIComponent(storyId)}/chat?conversation=${encodeURIComponent(conversationId)}&version=${encodeURIComponent(versionId)}`; // 쿼리 주소 반환
} // 함수 종료

export function createSessionHref(conversation: Pick<Conversation, "id" | "mode" | "storyId" | "characterId" | "currentVersionId">, versionId = conversation.currentVersionId): string // 대화 종류에 맞는 주소
{ // 함수 시작
    return conversation.mode === "story" && conversation.storyId !== null ? createStoryChatHref(conversation.storyId, conversation.id, versionId) : createConversationHref(conversation.characterId, conversation.id, versionId); // 주소 반환
} // 함수 종료

export function createStoryConversation(state: AppState, storyId: string, now = new Date().toISOString()): ConversationStartResult // 스토리 대화 시작
{ // 함수 시작
    const story = state.stories.find((item) => item.id === storyId); // 스토리 조회
    const lead = story?.cast[0]; // 첫 등장인물
    if (story === undefined || lead === undefined) // 스토리·등장인물 부재 판정
    { // 조건 시작
        throw new Error("시작할 스토리를 찾을 수 없습니다."); // 시작 오류
    } // 조건 종료
    const opening = createStoryOpening(story); // 시작 장면
    const conversationId = createUniqueConversationId(state, story.id, now); // 대화 식별자
    const versionId = `${conversationId}-version-1`; // 최초 버전 식별자
    const conversation: Conversation = // 새 스토리 대화
    { // 대화 시작
        id: conversationId, // 대화 식별자
        characterId: lead.characterId, // 첫 등장인물(장면·호환용)
        userId: state.profile.id, // 사용자 식별자
        title: story.title, // 대화 제목
        startSettings: { profileId: state.profile.id, presetId: "story-opening", relationshipStage: "첫 만남", relationshipLevel: 0, emotion: "설렘", scene: story.coverImage, greeting: opening }, // 시작 설정
        currentVersionId: versionId, // 현재 버전
        archivedAt: null, // 보관 시각
        createdAt: now, // 생성 시각
        updatedAt: now, // 수정 시각
        mode: "story", // 스토리 모드
        storyId: story.id, // 연결 스토리
        storyCast: structuredClone(story.cast), // 시작 시점 등장인물 복사
    }; // 대화 종료
    const version: ConversationVersion = { id: versionId, conversationId, parentVersionId: null, forkRootVersionId: null, forkedFromMessageId: null, ordinal: 1, relationshipLevel: 0, relationshipStage: "첫 만남", emotion: "설렘", currentScene: story.coverImage, lastMessage: opening, createdAt: now, updatedAt: now }; // 최초 버전
    const message: Message = { id: `${conversationId}-message-1`, conversationId, versionId, sourceMessageId: null, role: "assistant", content: opening, emotion: "설렘", sceneEvent: null, createdAt: now }; // 시작 장면 메시지
    const nextState: AppState = { ...state, conversations: [...state.conversations, conversation], conversationVersions: [...state.conversationVersions, version], messages: [...state.messages, message], selectedConversationId: conversationId }; // 다음 상태
    return { state: nextState, conversation, version, message, href: createStoryChatHref(story.id, conversationId, versionId) }; // 시작 결과 반환
} // 함수 종료

export function getLatestStoryConversation(conversations: readonly Conversation[], storyId: string): Conversation | null // 최근 스토리 대화
{ // 함수 시작
    const matches = conversations.filter((conversation) => conversation.mode === "story" && conversation.storyId === storyId && conversation.archivedAt === null); // 진행 중인 스토리 대화
    return [...matches].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))[0] ?? null; // 최신 대화 반환
} // 함수 종료

export function ensureConversationForStory(state: AppState, storyId: string, now = new Date().toISOString()): ConversationStartResult // 스토리 대화 준비(있으면 이어 하기)
{ // 함수 시작
    const selected = state.selectedConversationId === null ? undefined : state.conversations.find((conversation) => conversation.id === state.selectedConversationId && conversation.mode === "story" && conversation.storyId === storyId && conversation.archivedAt === null); // 선택 대화
    const existing = selected ?? getLatestStoryConversation(state.conversations, storyId); // 이어갈 대화
    if (existing === null || existing === undefined) // 새로 시작 판정
    { // 조건 시작
        return createStoryConversation(state, storyId, now); // 새 대화 반환
    } // 조건 종료
    const version = state.conversationVersions.find((item) => item.id === existing.currentVersionId); // 현재 버전
    if (version === undefined) // 버전 부재 판정
    { // 조건 시작
        throw new Error("현재 대화 버전을 찾을 수 없습니다."); // 버전 오류
    } // 조건 종료
    const message = state.messages.filter((item) => item.conversationId === existing.id && item.versionId === existing.currentVersionId).sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? { id: `${existing.id}-message-reference`, conversationId: existing.id, versionId: existing.currentVersionId, sourceMessageId: null, role: "assistant", content: version.lastMessage, emotion: version.emotion, sceneEvent: null, createdAt: version.updatedAt } as Message; // 최근 메시지
    return { state: { ...state, selectedConversationId: existing.id }, conversation: existing, version, message, href: createStoryChatHref(storyId, existing.id, version.id) }; // 이어하기 반환
} // 함수 종료

export function resolveStoryConversationRoute(state: AppState, storyId: string, conversationId?: string, versionId?: string): ConversationRouteSelection // 스토리 대화 주소 선택
{ // 함수 시작
    const storyConversations = state.conversations.filter((conversation) => conversation.mode === "story" && conversation.storyId === storyId && conversation.archivedAt === null); // 스토리 대화 목록
    const conversation = storyConversations.find((item) => item.id === conversationId) ?? getLatestStoryConversation(storyConversations, storyId) ?? undefined; // 안전 대화 선택
    if (conversation === undefined) // 대화 부재 판정
    { // 조건 시작
        throw new Error("대상 스토리의 대화를 찾을 수 없습니다."); // 대화 오류
    } // 조건 종료
    const versions = state.conversationVersions.filter((version) => version.conversationId === conversation.id); // 소속 버전
    const version = versions.find((item) => item.id === versionId) ?? versions.find((item) => item.id === conversation.currentVersionId) ?? [...versions].sort((left, right) => left.ordinal - right.ordinal || left.id.localeCompare(right.id))[0]; // 안전 버전 선택
    if (version === undefined) // 버전 부재 판정
    { // 조건 시작
        throw new Error("대상 대화의 버전을 찾을 수 없습니다."); // 버전 오류
    } // 조건 종료
    const canonicalHref = createStoryChatHref(storyId, conversation.id, version.id); // 정규 주소
    return { conversation, version, canonicalHref, recovered: conversationId !== conversation.id || versionId !== version.id }; // 선택 결과 반환
} // 함수 종료
