import { canViewMatureContent, isMatureCharacter } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { getConversationSummary, type ConversationSummary } from "@chatbot/features/conversation/conversation-versioning"; // 대화 요약 조회
import type { AppState, Character, Conversation, ConversationFilter, ConversationFolder, ConversationSort, StatusSnapshot, Story } from "@chatbot/features/core/types"; // 도메인 타입
import { isMatureStory } from "@chatbot/features/story/story-model"; // 19세 스토리 판정
import { getDateParts, getDayNumber } from "@chatbot/lib/time/date-key"; // 시간대 기준 날짜

export const CONVERSATION_PIN_LIMIT = 5; // 대화방 고정 최대 개수

export const conversationSortOptions: ReadonlyArray<{ id: ConversationSort; label: string }> = // 정렬 선택지
[ // 목록 시작
    { id: "recent", label: "최근 대화순" }, // 최근순
    { id: "relationship", label: "관계 높은 순" }, // 관계순
    { id: "turns", label: "턴 많은 순" }, // 턴순
    { id: "title", label: "이름순" }, // 이름순
]; // 목록 종료

export const conversationFilterOptions: ReadonlyArray<{ id: ConversationFilter; label: string }> = // 대화 종류 탭
[ // 목록 시작
    { id: "all", label: "전체" }, // 전체
    { id: "character", label: "캐릭터" }, // 캐릭터 대화
    { id: "story", label: "스토리" }, // 스토리 대화
]; // 목록 종료

export interface ConversationListItem // 대화방 목록 항목
{ // 구조 시작
    conversation: Conversation; // 대화방
    character: Character; // 대화 캐릭터(스토리는 대표 등장인물)
    story: Story | null; // 스토리 대화의 스토리(캐릭터 대화는 null)
    summary: ConversationSummary; // 현재 버전 요약
    lastActivityAt: string; // 마지막 활동 시각
    turnCount: number; // 진행한 턴 수(현재 버전의 사용자 메시지 수)
    locked: boolean; // 19+ 잠금 여부
    pinned: boolean; // 고정 여부
    latestStatus: StatusSnapshot | null; // 현재 버전의 마지막 상태창
} // 구조 종료

export interface ConversationListGroup // 대화방 묶음
{ // 구조 시작
    id: string; // 묶음 식별자
    label: string; // 묶음 이름
    items: ConversationListItem[]; // 묶음 항목
    folderId?: string; // 폴더 묶음이면 폴더 식별자
} // 구조 종료

const choseongList = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]; // 초성 목록
const choseongSet = new Set(choseongList); // 초성 판정 집합
const hangulBase = 0xac00; // 한글 음절 시작
const hangulCount = 11172; // 한글 음절 수
const syllablesPerInitial = 588; // 초성당 음절 수

export function getCalendarDayDifference(iso: string, now: Date): number // 서울 기준 날짜 차이
{ // 함수 시작
    return getDayNumber(now) - getDayNumber(new Date(iso)); // 날짜 차이 반환
} // 함수 종료

export function formatConversationTime(iso: string, now: Date): string // 짧은 상대 시간 표시
{ // 함수 시작
    const time = new Date(iso); // 대상 시각
    if (Number.isNaN(time.getTime())) // 잘못된 시각 판정
    { // 조건 시작
        return ""; // 빈 표시 반환
    } // 조건 종료
    const minutes = Math.floor((now.getTime() - time.getTime()) / 60_000); // 경과 분
    if (minutes < 1) // 1분 미만 판정
    { // 조건 시작
        return "방금 전"; // 방금 표시
    } // 조건 종료
    if (minutes < 60) // 1시간 미만 판정
    { // 조건 시작
        return `${minutes}분 전`; // 분 표시
    } // 조건 종료
    const days = getCalendarDayDifference(iso, now); // 날짜 차이
    if (days <= 0) // 같은 날 판정
    { // 조건 시작
        return `${Math.floor(minutes / 60)}시간 전`; // 시간 표시
    } // 조건 종료
    if (days === 1) // 어제 판정
    { // 조건 시작
        return "어제"; // 어제 표시
    } // 조건 종료
    if (days < 7) // 일주일 안 판정
    { // 조건 시작
        return `${days}일 전`; // 일 표시
    } // 조건 종료
    const target = getDateParts(time); // 대상 날짜
    return target.year === getDateParts(now).year ? `${target.month}월 ${target.day}일` : `${target.year}. ${target.month}. ${target.day}.`; // 날짜 표시
} // 함수 종료

function getInitial(character: string): string // 음절 초성 조회
{ // 함수 시작
    const offset = character.charCodeAt(0) - hangulBase; // 음절 위치
    return offset >= 0 && offset < hangulCount ? choseongList[Math.floor(offset / syllablesPerInitial)] : character; // 초성 반환
} // 함수 종료

function normalizeSearchText(text: string): string[] // 검색 문자열 정리
{ // 함수 시작
    return Array.from(text.normalize("NFC").toLowerCase().replace(/\s+/g, "")); // 공백 제거 문자 목록
} // 함수 종료

export function matchesKoreanText(text: string, query: string): boolean // 한글 초성 포함 검색
{ // 함수 시작
    const pattern = normalizeSearchText(query); // 검색어 문자
    if (pattern.length === 0) // 빈 검색어 판정
    { // 조건 시작
        return true; // 전체 일치
    } // 조건 종료
    const target = normalizeSearchText(text); // 대상 문자
    for (let start = 0; start + pattern.length <= target.length; start += 1) // 시작 위치 순회
    { // 순회 시작
        const matched = pattern.every((letter, index) => letter === target[start + index] || (choseongSet.has(letter) && getInitial(target[start + index]) === letter)); // 문자 또는 초성 일치
        if (matched) // 일치 판정
        { // 조건 시작
            return true; // 일치 반환
        } // 조건 종료
    } // 순회 종료
    return false; // 불일치 반환
} // 함수 종료

export function matchesConversationQuery(item: ConversationListItem, query: string): boolean // 대화방 검색 판정
{ // 함수 시작
    const storyFields = item.story === null ? [] : [item.story.title, ...item.conversation.storyCast.map((member) => member.displayName)]; // 스토리 제목·등장인물 이름
    const fields = [item.conversation.title, item.character.name, ...storyFields, ...(item.locked ? [] : [item.summary.lastMessage])]; // 검색 대상(잠금 시 메시지 제외)
    return fields.some((field) => matchesKoreanText(field, query)); // 일치 여부 반환
} // 함수 종료

export function buildConversationListItems(state: AppState, now: Date): ConversationListItem[] // 진행 중인 대화방 항목 생성
{ // 함수 시작
    const showMature = canViewMatureContent(state, now); // 19세 콘텐츠 표시 여부
    const pinned = new Set(state.pinnedConversationIds); // 고정 집합
    const turnCounts = new Map<string, number>(); // 버전별 턴 수
    const statuses = new Map<string, StatusSnapshot>(); // 버전별 마지막 상태창
    for (const message of state.messages) // 메시지 순회
    { // 순회 시작
        if (message.role === "user") // 사용자 메시지 판정
        { // 조건 시작
            turnCounts.set(message.versionId, (turnCounts.get(message.versionId) ?? 0) + 1); // 턴 수 증가
        } // 조건 종료
        const status = message.status; // 상태창
        if (status !== undefined && status !== null && status.turn >= (statuses.get(message.versionId)?.turn ?? 0)) // 더 늦은 턴 판정
        { // 조건 시작
            statuses.set(message.versionId, status); // 마지막 상태 저장
        } // 조건 종료
    } // 순회 종료
    return state.conversations.flatMap((conversation) => // 대화방 변환
    { // 변환 시작
        const character = state.characters.find((item) => item.id === conversation.characterId); // 캐릭터 조회
        const summary = getConversationSummary(state, conversation.id); // 현재 버전 요약
        const story = conversation.mode === "story" ? state.stories.find((item) => item.id === conversation.storyId) ?? null : null; // 스토리 조회
        if (conversation.archivedAt !== null || character === undefined || summary === null || (conversation.mode === "story" && story === null)) // 보관·손상 판정
        { // 조건 시작
            return []; // 항목 제외
        } // 조건 종료
        const lastActivityAt = summary.updatedAt.localeCompare(conversation.updatedAt) > 0 ? summary.updatedAt : conversation.updatedAt; // 더 최근 시각
        const mature = story === null ? isMatureCharacter(character) : isMatureStory(story); // 19세 판정(스토리는 스토리 등급 기준)
        return [{ conversation, character, story, summary, lastActivityAt, turnCount: turnCounts.get(summary.versionId) ?? 0, locked: mature && !showMature, pinned: pinned.has(conversation.id), latestStatus: statuses.get(summary.versionId) ?? null }]; // 항목 반환
    }); // 변환 종료
} // 함수 종료

function compareRecent(left: ConversationListItem, right: ConversationListItem): number // 최근순 비교
{ // 함수 시작
    return right.lastActivityAt.localeCompare(left.lastActivityAt) || left.conversation.id.localeCompare(right.conversation.id); // 최근 우선
} // 함수 종료

export function sortConversationItems(items: readonly ConversationListItem[], sort: ConversationSort): ConversationListItem[] // 대화방 정렬
{ // 함수 시작
    return [...items].sort((left, right) => // 복사 정렬
    { // 비교 시작
        if (sort === "relationship") // 관계순 판정
        { // 조건 시작
            return right.summary.relationshipLevel - left.summary.relationshipLevel || compareRecent(left, right); // 관계 높은 순
        } // 조건 종료
        if (sort === "turns") // 턴순 판정
        { // 조건 시작
            return right.turnCount - left.turnCount || compareRecent(left, right); // 턴 많은 순
        } // 조건 종료
        if (sort === "title") // 이름순 판정
        { // 조건 시작
            return left.conversation.title.localeCompare(right.conversation.title, "ko") || compareRecent(left, right); // 가나다순
        } // 조건 종료
        return compareRecent(left, right); // 최근순
    }); // 비교 종료
} // 함수 종료

export function filterConversationItems(items: readonly ConversationListItem[], filter: ConversationFilter): ConversationListItem[] // 전체·캐릭터·스토리 탭 거르기
{ // 함수 시작
    return filter === "all" ? [...items] : items.filter((item) => item.conversation.mode === filter); // 종류 일치
} // 함수 종료

export function formatConversationStatus(status: StatusSnapshot | null): string // 카드용 짧은 상태 줄(장소 · 시간)
{ // 함수 시작
    return status === null ? "" : [status.location, status.time].filter((part): part is string => part !== null && part.length > 0).join(" · "); // 있는 값만 잇기
} // 함수 종료

export function groupConversationItems(items: readonly ConversationListItem[], sort: ConversationSort, pinnedIds: readonly string[], now: Date, folders: readonly ConversationFolder[] = [], showEmptyFolders = false): ConversationListGroup[] // 대화방 묶음 생성(고정 → 폴더 → 날짜)
{ // 함수 시작
    const pinOrder = new Map(pinnedIds.map((id, index) => [id, index])); // 고정 순서
    const pinned = items.filter((item) => item.pinned).sort((left, right) => (pinOrder.get(left.conversation.id) ?? 0) - (pinOrder.get(right.conversation.id) ?? 0)); // 고정 항목
    const folderIds = new Set(folders.map((folder) => folder.id)); // 있는 폴더
    const inFolder = (item: ConversationListItem) => item.conversation.folderId !== null && folderIds.has(item.conversation.folderId); // 폴더 대화 판정
    const rest = sortConversationItems(items.filter((item) => !item.pinned && !inFolder(item)), sort); // 나머지 정렬
    const folderGroups = folders.map((folder): ConversationListGroup => ({ id: `folder-${folder.id}`, label: folder.name, folderId: folder.id, items: sortConversationItems(items.filter((item) => !item.pinned && item.conversation.folderId === folder.id), sort) })).filter((group) => showEmptyFolders || group.items.length > 0); // 폴더 묶음
    const groups: ConversationListGroup[] = [...(pinned.length === 0 ? [] : [{ id: "pinned", label: "고정됨", items: pinned }]), ...folderGroups]; // 고정·폴더 묶음
    if (sort !== "recent") // 최근순 외 판정
    { // 조건 시작
        return rest.length === 0 ? groups : [...groups, { id: "all", label: "전체 대화", items: rest }]; // 단일 묶음 반환
    } // 조건 종료
    const buckets: ConversationListGroup[] = [{ id: "today", label: "오늘", items: [] }, { id: "yesterday", label: "어제", items: [] }, { id: "week", label: "최근 7일", items: [] }, { id: "older", label: "이전", items: [] }]; // 날짜 묶음
    for (const item of rest) // 항목 순회
    { // 순회 시작
        const days = getCalendarDayDifference(item.lastActivityAt, now); // 날짜 차이
        const bucket = days <= 0 ? buckets[0] : days === 1 ? buckets[1] : days < 7 ? buckets[2] : buckets[3]; // 묶음 선택
        bucket.items.push(item); // 묶음 추가
    } // 순회 종료
    return [...groups, ...buckets.filter((bucket) => bucket.items.length > 0)]; // 빈 묶음 제외 반환
} // 함수 종료

export function autoOrganizeConversations(state: AppState, now: string): AppState // 같은 작품 대화 두 개 이상을 작품 이름 폴더로 묶기
{ // 함수 시작
    const groups = new Map<string, { name: string; ids: string[] }>(); // 작품별 대화
    for (const conversation of state.conversations) // 대화 순회
    { // 순회 시작
        if (conversation.archivedAt !== null || conversation.folderId !== null) // 보관·폴더 대화 제외
        { // 조건 시작
            continue; // 다음 대화
        } // 조건 종료
        const key = conversation.mode === "story" ? `story:${conversation.storyId}` : `character:${conversation.characterId}`; // 작품 키
        const name = conversation.mode === "story" ? state.stories.find((story) => story.id === conversation.storyId)?.title : state.characters.find((character) => character.id === conversation.characterId)?.name; // 작품 이름
        const group = groups.get(key) ?? { name: (name ?? conversation.title).slice(0, 30), ids: [] }; // 묶음
        group.ids.push(conversation.id); // 대화 추가
        groups.set(key, group); // 저장
    } // 순회 종료
    let folders = [...state.conversationFolders]; // 폴더 목록
    let conversations = state.conversations; // 대화 목록
    for (const [key, group] of groups) // 묶음 순회
    { // 순회 시작
        if (group.ids.length < 2) // 두 개 미만 판정
        { // 조건 시작
            continue; // 묶지 않음
        } // 조건 종료
        let folder = folders.find((item) => item.name === group.name); // 같은 이름 폴더 재사용
        if (folder === undefined) // 새 폴더 판정
        { // 조건 시작
            folder = { id: `folder-${key.replace(/[^a-z0-9-]/gi, "-")}-${Date.parse(now) || 0}`, name: group.name, createdAt: now }; // 새 폴더
            folders = [...folders, folder]; // 폴더 추가
        } // 조건 종료
        const folderId = folder.id; // 폴더 식별자
        conversations = conversations.map((conversation) => group.ids.includes(conversation.id) ? { ...conversation, folderId } : conversation); // 이동
    } // 순회 종료
    return { ...state, conversationFolders: folders, conversations }; // 정리 상태
} // 함수 종료
