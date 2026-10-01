import { CHAT_VERSION_LIMIT, isConversationVersionGraphValid } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 검증
import type { AppState, Conversation, ConversationVersion, Message } from "@chatbot/features/core/types"; // 대화 타입
import { isAppState } from "@chatbot/lib/repositories/local-storage-gateway"; // 앱 상태 검증

const relationshipStages = ["첫 만남", "아는 사이", "가까운 사이", "특별한 사이"] as const; // 관계 단계 목록

export interface ConversationExport // 대화 내보내기 구조
{ // 구조 시작
    schemaVersion: 2; // 내보내기 버전
    conversation: Conversation; // 대상 대화
    versions: ConversationVersion[]; // 대화 버전
    messages: Message[]; // 연결 메시지
    currentVersionId: string; // 현재 버전 식별자
} // 구조 종료

function isRecord(value: unknown): value is Record<string, unknown> // 객체 판정
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 여부 반환
} // 함수 종료

function hasString(record: Record<string, unknown>, key: string): boolean // 문자열 필드 판정
{ // 함수 시작
    return typeof record[key] === "string"; // 문자열 여부 반환
} // 함수 종료

function hasNonEmptyString(record: Record<string, unknown>, key: string): boolean // 필수 문자열 판정
{ // 함수 시작
    return typeof record[key] === "string" && record[key].trim().length > 0; // 필수 문자열 여부 반환
} // 함수 종료

function hasRelationshipLevel(record: Record<string, unknown>, key: string): boolean // 관계 수치 판정
{ // 함수 시작
    const value = record[key]; // 필드 값 조회
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100; // 유효 범위 반환
} // 함수 종료

function isStartSettings(value: unknown): boolean // 시작 설정 판정
{ // 함수 시작
    return isRecord(value) && hasNonEmptyString(value, "profileId") && hasNonEmptyString(value, "presetId") && relationshipStages.includes(value.relationshipStage as typeof relationshipStages[number]) && hasRelationshipLevel(value, "relationshipLevel") && hasNonEmptyString(value, "emotion") && hasNonEmptyString(value, "scene") && hasNonEmptyString(value, "greeting"); // 시작 설정 필드 확인
} // 함수 종료

function isConversation(value: unknown): value is Conversation // 대화 구조 판정
{ // 함수 시작
    return isRecord(value) && hasNonEmptyString(value, "id") && hasNonEmptyString(value, "characterId") && hasNonEmptyString(value, "userId") && hasNonEmptyString(value, "title") && hasNonEmptyString(value, "currentVersionId") && isStartSettings(value.startSettings) && (value.archivedAt === null || typeof value.archivedAt === "string") && hasNonEmptyString(value, "createdAt") && hasNonEmptyString(value, "updatedAt"); // 핵심 필드 확인
} // 함수 종료

function isVersion(value: unknown): value is ConversationVersion // 버전 구조 판정
{ // 함수 시작
    return isRecord(value) && hasNonEmptyString(value, "id") && hasNonEmptyString(value, "conversationId") && (value.parentVersionId === null || typeof value.parentVersionId === "string") && (value.forkRootVersionId === null || typeof value.forkRootVersionId === "string") && (value.forkedFromMessageId === null || typeof value.forkedFromMessageId === "string") && Number.isInteger(value.ordinal) && Number(value.ordinal) > 0 && hasRelationshipLevel(value, "relationshipLevel") && relationshipStages.includes(value.relationshipStage as typeof relationshipStages[number]) && hasNonEmptyString(value, "emotion") && hasNonEmptyString(value, "currentScene") && hasString(value, "lastMessage") && hasNonEmptyString(value, "createdAt") && hasNonEmptyString(value, "updatedAt"); // 핵심 필드 확인
} // 함수 종료

function isMessage(value: unknown): value is Message // 메시지 구조 판정
{ // 함수 시작
    return isRecord(value) && hasString(value, "id") && hasString(value, "conversationId") && hasString(value, "versionId") && (value.sourceMessageId === null || typeof value.sourceMessageId === "string") && (value.role === "user" || value.role === "assistant") && hasString(value, "content") && (value.emotion === null || typeof value.emotion === "string") && (value.sceneEvent === null || typeof value.sceneEvent === "string") && (value.scenePath === undefined || value.scenePath === null || typeof value.scenePath === "string") && hasString(value, "createdAt"); // 핵심 필드 확인
} // 함수 종료

function assertUnique(values: string[], label: string): void // 식별자 중복 검증
{ // 함수 시작
    if (new Set(values).size !== values.length) // 중복 여부 판정
    { // 조건 시작
        throw new Error(`${label} 식별자가 중복됩니다.`); // 중복 오류
    } // 조건 종료
} // 함수 종료

function assertNoParentCycle(versions: ConversationVersion[]): void // 부모 순환 검증
{ // 함수 시작
    const parentById = new Map(versions.map((version) => [version.id, version.parentVersionId])); // 부모 색인 생성
    versions.forEach((version) => // 버전 순회
    { // 순회 시작
        const visited = new Set<string>(); // 방문 목록 생성
        let currentId: string | null = version.id; // 현재 버전 설정
        while (currentId !== null) // 부모 순회
        { // 반복 시작
            if (visited.has(currentId)) // 재방문 판정
            { // 조건 시작
                throw new Error("대화 버전 부모 관계가 순환합니다."); // 순환 오류
            } // 조건 종료
            visited.add(currentId); // 방문 기록
            currentId = parentById.get(currentId) ?? null; // 다음 부모 이동
        } // 반복 종료
    }); // 순회 종료
} // 함수 종료

function validateConversationExport(value: unknown): asserts value is ConversationExport // 대화 파일 검증
{ // 함수 시작
    if (!isRecord(value) || value.schemaVersion !== 2 || !isConversation(value.conversation) || !Array.isArray(value.versions) || !value.versions.every(isVersion) || !Array.isArray(value.messages) || !value.messages.every(isMessage) || typeof value.currentVersionId !== "string") // 기본 구조 판정
    { // 조건 시작
        throw new Error("지원하지 않는 대화 파일입니다."); // 형식 오류
    } // 조건 종료
    const conversation = value.conversation; // 대화 참조
    const versions = value.versions; // 버전 참조
    const messages = value.messages; // 메시지 참조
    assertUnique(versions.map((version) => version.id), "버전"); // 버전 중복 검증
    assertUnique(messages.map((message) => message.id), "메시지"); // 메시지 중복 검증
    if (versions.length === 0 || versions.some((version) => version.conversationId !== conversation.id) || messages.some((message) => message.conversationId !== conversation.id)) // 대화 연결 판정
    { // 조건 시작
        throw new Error("대화 연결 정보가 올바르지 않습니다."); // 연결 오류
    } // 조건 종료
    const versionIds = new Set(versions.map((version) => version.id)); // 버전 식별자 집합
    if (!versionIds.has(value.currentVersionId) || conversation.currentVersionId !== value.currentVersionId) // 현재 버전 판정
    { // 조건 시작
        throw new Error("현재 대화 버전을 찾을 수 없습니다."); // 현재 버전 오류
    } // 조건 종료
    const roots = versions.filter((version) => version.parentVersionId === null); // 원본 버전 목록
    if (roots.length !== 1) // 원본 개수 판정
    { // 조건 시작
        throw new Error("원본 대화 버전은 하나여야 합니다."); // 원본 오류
    } // 조건 종료
    if (versions.some((version) => version.parentVersionId !== null && !versionIds.has(version.parentVersionId))) // 부모 존재 판정
    { // 조건 시작
        throw new Error("부모 대화 버전을 찾을 수 없습니다."); // 부모 오류
    } // 조건 종료
    if (versions.some((version) => version.parentVersionId === null ? version.forkRootVersionId !== null || version.forkedFromMessageId !== null : version.forkRootVersionId === null || version.forkedFromMessageId === null)) // 분기 필드 짝 판정
    { // 조건 시작
        throw new Error("대화 버전 분기 정보가 올바르지 않습니다."); // 분기 구조 오류
    } // 조건 종료
    assertNoParentCycle(versions); // 부모 순환 검증
    if (messages.some((message) => !versionIds.has(message.versionId)) || versions.some((version) => !messages.some((message) => message.versionId === version.id))) // 메시지 연결 판정
    { // 조건 시작
        throw new Error("대화 버전 메시지를 찾을 수 없습니다."); // 메시지 오류
    } // 조건 종료
    const messageReferences = new Set(messages.flatMap((message) => [message.id, ...(message.sourceMessageId === null ? [] : [message.sourceMessageId])])); // 메시지 참조 집합
    if (versions.some((version) => version.forkedFromMessageId !== null && !messageReferences.has(version.forkedFromMessageId))) // 분기 메시지 판정
    { // 조건 시작
        throw new Error("분기 메시지를 찾을 수 없습니다."); // 분기 오류
    } // 조건 종료
    const groupCounts = new Map<string, number>(); // 분기 그룹 개수
    versions.filter((version) => version.parentVersionId !== null).forEach((version) => // 수정 버전 순회
    { // 순회 시작
        const forkRootVersionId = version.forkRootVersionId!; // 분기 원본 식별자
        const forkedFromMessageId = version.forkedFromMessageId!; // 분기 메시지 식별자
        const forkRootMessages = messages.filter((message) => message.versionId === forkRootVersionId); // 분기 원본 메시지 목록
        let ancestorId = version.parentVersionId; // 부모 탐색 시작
        let hasForkRootAncestor = false; // 분기 원본 조상 표시
        while (ancestorId !== null) // 부모 계보 순회
        { // 반복 시작
            if (ancestorId === forkRootVersionId) // 분기 원본 도달 판정
            { // 조건 시작
                hasForkRootAncestor = true; // 분기 조상 확인
                break; // 계보 탐색 종료
            } // 조건 종료
            ancestorId = versions.find((candidate) => candidate.id === ancestorId)?.parentVersionId ?? null; // 다음 부모 이동
        } // 반복 종료
        if (!versionIds.has(forkRootVersionId) || !hasForkRootAncestor) // 분기 원본 판정
        { // 조건 시작
            throw new Error("분기 원본 버전을 찾을 수 없습니다."); // 분기 원본 오류
        } // 조건 종료
        if (!forkRootMessages.some((message) => message.id === forkedFromMessageId || message.sourceMessageId === forkedFromMessageId)) // 분기 기준 메시지 판정
        { // 조건 시작
            throw new Error("분기 원본 메시지를 찾을 수 없습니다."); // 분기 메시지 오류
        } // 조건 종료
        const key = `${forkRootVersionId}:${forkedFromMessageId}`; // 그룹 키 생성
        groupCounts.set(key, (groupCounts.get(key) ?? 1) + 1); // 원본 포함 개수 증가
    }); // 순회 종료
    if ([...groupCounts.values()].some((count) => count > CHAT_VERSION_LIMIT)) // 분기 제한 판정
    { // 조건 시작
        throw new Error("대화 버전 개수 제한을 초과했습니다."); // 제한 오류
    } // 조건 종료
    if (!isConversationVersionGraphValid({ conversations: [conversation], conversationVersions: versions, messages })) // 전체 버전 그래프 판정
    { // 조건 시작
        throw new Error("대화 버전 그래프가 올바르지 않습니다."); // 그래프 오류
    } // 조건 종료
} // 함수 종료

export function createConversationExport(state: AppState, conversationId: string): ConversationExport // 대화 내보내기 함수
{ // 함수 시작
    const conversation = state.conversations.find((item) => item.id === conversationId); // 대상 대화 조회
    if (conversation === undefined) // 대화 부재 판정
    { // 조건 시작
        throw new Error("내보낼 대화를 찾을 수 없습니다."); // 대화 오류
    } // 조건 종료
    const versions = state.conversationVersions.filter((version) => version.conversationId === conversation.id); // 연결 버전 조회
    const messages = state.messages.filter((message) => message.conversationId === conversation.id); // 연결 메시지 조회
    const exported: ConversationExport = { schemaVersion: 2, conversation: structuredClone(conversation), versions: structuredClone(versions), messages: structuredClone(messages), currentVersionId: conversation.currentVersionId }; // 내보내기 생성
    validateConversationExport(exported); // 생성 파일 검증
    return exported; // 내보내기 반환
} // 함수 종료

export function parseConversationExport(raw: string): ConversationExport // 대화 파일 해석
{ // 함수 시작
    const value: unknown = JSON.parse(raw); // JSON 해석
    validateConversationExport(value); // 파일 검증
    return structuredClone(value); // 검증 파일 반환
} // 함수 종료

function createImportedConversationId(state: AppState, sourceId: string): string // 가져오기 대화 식별자 생성
{ // 함수 시작
    const usedIds = new Set(state.conversations.map((conversation) => conversation.id)); // 기존 대화 식별자 집합
    let candidate = `${sourceId}-imported`; // 기본 후보 생성
    let suffix = 2; // 접미사 시작값
    while (usedIds.has(candidate)) // 충돌 반복
    { // 반복 시작
        candidate = `${sourceId}-imported-${suffix}`; // 다음 후보 생성
        suffix += 1; // 접미사 증가
    } // 반복 종료
    return candidate; // 고유 식별자 반환
} // 함수 종료

function normalizeConversationMode(conversation: Conversation): Conversation // 대화 종류 기본값 채우기(이전 파일 호환)
{ // 함수 시작
    const record = conversation as Partial<Conversation>; // 선택 필드 접근
    if (record.mode === "story") // 스토리 대화 판정
    { // 조건 시작
        return { ...conversation, storyId: record.storyId ?? null, storyCast: record.storyCast ?? [] }; // 스토리 필드 유지
    } // 조건 종료
    return { ...conversation, mode: "character", storyId: null, storyCast: [] }; // 캐릭터 대화로 정리
} // 함수 종료

export function mergeConversationExport(state: AppState, rawImport: ConversationExport): AppState // 대화 파일 병합
{ // 함수 시작
    validateConversationExport(rawImport); // 병합 전 검증
    const imported = { ...rawImport, conversation: normalizeConversationMode(rawImport.conversation) }; // 대화 종류 정리
    if (imported.conversation.mode === "story" && !state.stories.some((story) => story.id === imported.conversation.storyId)) // 스토리 부재 판정
    { // 조건 시작
        throw new Error("이 대화의 스토리가 이 브라우저에 없어 가져올 수 없습니다."); // 스토리 부재 오류
    } // 조건 종료
    const existingConversationIds = new Set(state.conversations.map((conversation) => conversation.id)); // 기존 대화 식별자 집합
    const existingVersionIds = new Set(state.conversationVersions.map((version) => version.id)); // 기존 버전 식별자 집합
    const existingMessageIds = new Set(state.messages.map((message) => message.id)); // 기존 메시지 식별자 집합
    const collision = existingConversationIds.has(imported.conversation.id) || imported.versions.some((version) => existingVersionIds.has(version.id)) || imported.messages.some((message) => existingMessageIds.has(message.id)); // 전체 충돌 판정
    if (!collision) // 충돌 없음 판정
    { // 조건 시작
        const candidate = { ...state, conversations: [...state.conversations, structuredClone(imported.conversation)], conversationVersions: [...state.conversationVersions, ...structuredClone(imported.versions)], messages: [...state.messages, ...structuredClone(imported.messages)], selectedConversationId: imported.conversation.id }; // 원본 식별자 후보
        if (!isAppState(candidate)) // 전체 상태 판정
        { // 조건 시작
            throw new Error("가져온 대화가 현재 앱 데이터와 연결되지 않습니다."); // 전체 상태 오류
        } // 조건 종료
        return candidate; // 원본 식별자 병합
    } // 조건 종료
    const conversationId = createImportedConversationId(state, imported.conversation.id); // 새 대화 식별자 생성
    const versionIds = new Map(imported.versions.map((version, index) => [version.id, `${conversationId}-version-${index + 1}`])); // 버전 식별자 대응표
    const messageIds = new Map(imported.messages.map((message, index) => [message.id, `${conversationId}-message-${index + 1}`])); // 메시지 식별자 대응표
    const versions = imported.versions.map((version) => ({ ...version, id: versionIds.get(version.id)!, conversationId, parentVersionId: version.parentVersionId === null ? null : versionIds.get(version.parentVersionId)!, forkRootVersionId: version.forkRootVersionId === null ? null : versionIds.get(version.forkRootVersionId)!, forkedFromMessageId: version.forkedFromMessageId === null ? null : messageIds.get(version.forkedFromMessageId) ?? version.forkedFromMessageId })); // 버전 재매핑
    const messages = imported.messages.map((message) => ({ ...message, id: messageIds.get(message.id)!, conversationId, versionId: versionIds.get(message.versionId)!, sourceMessageId: message.sourceMessageId === null ? null : messageIds.get(message.sourceMessageId) ?? message.sourceMessageId })); // 메시지 재매핑
    const conversation = { ...imported.conversation, id: conversationId, currentVersionId: versionIds.get(imported.currentVersionId)!, title: `${imported.conversation.title} · 가져옴` }; // 대화 재매핑
    const candidate = { ...state, conversations: [...state.conversations, conversation], conversationVersions: [...state.conversationVersions, ...versions], messages: [...state.messages, ...messages], selectedConversationId: conversationId }; // 재매핑 상태 후보
    if (!isAppState(candidate)) // 전체 상태 판정
    { // 조건 시작
        throw new Error("가져온 대화가 현재 앱 데이터와 연결되지 않습니다."); // 전체 상태 오류
    } // 조건 종료
    return candidate; // 재매핑 상태 반환
} // 함수 종료
