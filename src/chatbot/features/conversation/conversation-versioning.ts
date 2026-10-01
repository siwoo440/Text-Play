import type { AppState, ConversationVersion, Message, RelationshipStage } from "@chatbot/features/core/types"; // 도메인 타입

export interface ConversationSummary // 대화 요약 구조
{ // 구조 시작
    versionId: string; // 버전 식별자
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
    currentScene: string; // 현재 장면
    lastMessage: string; // 최근 메시지
    updatedAt: string; // 수정 시각
} // 구조 종료

export const CHAT_VERSION_LIMIT = 10; // 분기 버전 제한
export const CHAT_MESSAGE_MAX_LENGTH = 2000; // 메시지 길이 제한

export interface MessageVersionGroup // 메시지 버전 그룹 구조
{ // 구조 시작
    rootVersionId: string; // 원본 버전 식별자
    sourceMessageId: string; // 원본 메시지 식별자
    versionIds: string[]; // 그룹 버전 목록
    currentIndex: number; // 현재 버전 위치
} // 구조 종료

export interface VersionStateInput // 버전 진행 상태 구조
{ // 구조 시작
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
    currentScene: string; // 현재 장면
    lastMessage: string; // 최근 메시지
} // 구조 종료

export interface CreateVersionForkInput // 버전 분기 입력 구조
{ // 구조 시작
    conversationId: string; // 대화 식별자
    baseVersionId: string; // 기준 버전 식별자
    targetMessageId: string; // 수정 메시지 식별자
    content: string; // 수정 메시지 내용
    assistantMessage: Omit<Message, "conversationId" | "versionId" | "sourceMessageId">; // 응답 메시지
    versionState: VersionStateInput; // 완료 진행 상태
    now: string; // 생성 시각
} // 구조 종료

export interface VersionForkResult // 버전 분기 결과 구조
{ // 구조 시작
    state: AppState; // 변경 상태
    version: ConversationVersion; // 생성 버전
    messages: Message[]; // 생성 메시지
    group: MessageVersionGroup; // 전환 그룹
} // 구조 종료

export interface VersionDeletionResult // 버전 삭제 결과 구조
{ // 구조 시작
    state: AppState; // 변경 상태
    selectedVersionId: string; // 복귀 버전 식별자
    versionCount: number; // 삭제 버전 수
    messageCount: number; // 삭제 메시지 수
} // 구조 종료

export type ConversationVersionErrorCode = "version-limit" | "missing-version" | "missing-message" | "invalid-content" | "original-version"; // 버전 오류 코드

export class ConversationVersionError extends Error // 버전 오류 클래스
{ // 클래스 시작
    public constructor(public readonly code: ConversationVersionErrorCode) // 오류 생성자
    { // 생성자 시작
        super(code); // 오류 내용 설정
        this.name = "ConversationVersionError"; // 오류 이름 설정
    } // 생성자 종료
} // 클래스 종료

export function isConversationVersionGraphValid(state: Pick<AppState, "conversations" | "conversationVersions" | "messages">): boolean // 버전 그래프 검증
{ // 함수 시작
    const conversationIds = state.conversations.map((conversation) => conversation.id); // 대화 식별자 목록
    const versionIds = state.conversationVersions.map((version) => version.id); // 버전 식별자 목록
    const messageIds = state.messages.map((message) => message.id); // 메시지 식별자 목록
    if (new Set(conversationIds).size !== conversationIds.length || new Set(versionIds).size !== versionIds.length || new Set(messageIds).size !== messageIds.length) // 중복 식별자 판정
    { // 조건 시작
        return false; // 중복 거부
    } // 조건 종료
    const conversationIdSet = new Set(conversationIds); // 대화 식별자 집합
    const versionById = new Map(state.conversationVersions.map((version) => [version.id, version])); // 버전 색인
    const messageIdSet = new Set(messageIds); // 메시지 식별자 집합
    if (state.conversationVersions.some((version) => !conversationIdSet.has(version.conversationId)) || state.messages.some((message) => versionById.get(message.versionId)?.conversationId !== message.conversationId || !conversationIdSet.has(message.conversationId) || message.sourceMessageId !== null && !messageIdSet.has(message.sourceMessageId))) // 기본 연결 판정
    { // 조건 시작
        return false; // 연결 오류 반환
    } // 조건 종료
    for (const conversation of state.conversations) // 대화 순회
    { // 순회 시작
        const versions = state.conversationVersions.filter((version) => version.conversationId === conversation.id); // 대화 버전 목록
        const roots = versions.filter((version) => version.parentVersionId === null); // 루트 버전 목록
        if (roots.length !== 1 || versionById.get(conversation.currentVersionId)?.conversationId !== conversation.id) // 루트와 현재 버전 판정
        { // 조건 시작
            return false; // 대화 그래프 오류 반환
        } // 조건 종료
        const groupCounts = new Map<string, number>(); // 분기 그룹 개수
        for (const version of versions) // 버전 순회
        { // 버전 시작
            const versionMessages = state.messages.filter((message) => message.versionId === version.id); // 버전 메시지 목록
            if (versionMessages.length === 0 || !Number.isInteger(version.ordinal) || version.ordinal < 1) // 버전 기본 판정
            { // 조건 시작
                return false; // 버전 기본 오류 반환
            } // 조건 종료
            if (version.parentVersionId === null) // 루트 버전 판정
            { // 루트 시작
                if (version.forkRootVersionId !== null || version.forkedFromMessageId !== null) // 루트 분기 필드 판정
                { // 조건 시작
                    return false; // 루트 분기 오류 반환
                } // 조건 종료
                continue; // 다음 버전 이동
            } // 루트 종료
            if (version.forkRootVersionId === null || version.forkedFromMessageId === null) // 수정 버전 분기 필드 판정
            { // 조건 시작
                return false; // 수정 분기 오류 반환
            } // 조건 종료
            const parent = versionById.get(version.parentVersionId); // 부모 버전 조회
            const forkRoot = versionById.get(version.forkRootVersionId); // 분기 원본 조회
            if (parent?.conversationId !== conversation.id || forkRoot?.conversationId !== conversation.id) // 부모와 분기 원본 판정
            { // 조건 시작
                return false; // 외부 버전 연결 거부
            } // 조건 종료
            let ancestorId: string | null = version.parentVersionId; // 조상 탐색 시작
            const visited = new Set<string>(); // 조상 방문 집합
            let hasForkRootAncestor = false; // 분기 원본 조상 표시
            while (ancestorId !== null) // 조상 순회
            { // 반복 시작
                if (visited.has(ancestorId)) // 순환 판정
                { // 조건 시작
                    return false; // 순환 거부
                } // 조건 종료
                visited.add(ancestorId); // 조상 방문 기록
                if (ancestorId === version.forkRootVersionId) // 분기 원본 도달 판정
                { // 조건 시작
                    hasForkRootAncestor = true; // 분기 원본 확인
                } // 조건 종료
                ancestorId = versionById.get(ancestorId)?.parentVersionId ?? null; // 다음 조상 이동
            } // 반복 종료
            const matchesAnchor = (message: Message) => message.role === "user" && (message.id === version.forkedFromMessageId || message.sourceMessageId === version.forkedFromMessageId); // 분기 기준 판정
            const parentHasAnchor = state.messages.some((message) => message.versionId === parent.id && matchesAnchor(message)); // 부모 기준 메시지 확인
            const rootHasAnchor = state.messages.some((message) => message.versionId === forkRoot.id && matchesAnchor(message)); // 원본 기준 메시지 확인
            if (!hasForkRootAncestor || !parentHasAnchor || !rootHasAnchor) // 분기 기준 판정
            { // 조건 시작
                return false; // 분기 기준 오류 반환
            } // 조건 종료
            const groupKey = `${version.forkRootVersionId}:${version.forkedFromMessageId}`; // 분기 그룹 키
            groupCounts.set(groupKey, (groupCounts.get(groupKey) ?? 1) + 1); // 원본 포함 개수 증가
        } // 버전 종료
        if ([...groupCounts.values()].some((count) => count > CHAT_VERSION_LIMIT)) // 분기 제한 판정
        { // 조건 시작
            return false; // 분기 제한 오류 반환
        } // 조건 종료
    } // 순회 종료
    return true; // 그래프 검증 성공
} // 함수 종료

export function getConversationVersion(state: AppState, conversationId: string, requestedVersionId?: string | null): ConversationVersion | null // 대화 버전 조회
{ // 함수 시작
    const conversation = state.conversations.find((item) => item.id === conversationId); // 대화 조회
    if (conversation === undefined) // 대화 부재 판정
    { // 조건 시작
        return null; // 빈 버전 반환
    } // 조건 종료
    const versions = state.conversationVersions.filter((version) => version.conversationId === conversationId); // 연결 버전 목록
    const requested = requestedVersionId === null || requestedVersionId === undefined ? undefined : versions.find((version) => version.id === requestedVersionId); // 요청 버전 조회
    if (requested !== undefined) // 요청 버전 존재 판정
    { // 조건 시작
        return requested; // 요청 버전 반환
    } // 조건 종료
    const current = versions.find((version) => version.id === conversation.currentVersionId); // 현재 버전 조회
    if (current !== undefined) // 현재 버전 존재 판정
    { // 조건 시작
        return current; // 현재 버전 반환
    } // 조건 종료
    return versions.sort((left, right) => left.ordinal - right.ordinal || left.id.localeCompare(right.id))[0] ?? null; // 원본 버전 반환
} // 함수 종료

export function getVersionMessages(state: AppState, conversationId: string, versionId: string): Message[] // 버전 메시지 조회
{ // 함수 시작
    return state.messages.filter((message) => message.conversationId === conversationId && message.versionId === versionId).map((message) => ({ ...message })).sort((left, right) => left.createdAt.localeCompare(right.createdAt)); // 시간순 메시지 반환
} // 함수 종료

export function getConversationSummary(state: AppState, conversationId: string): ConversationSummary | null // 대화 요약 조회
{ // 함수 시작
    const version = getConversationVersion(state, conversationId); // 현재 버전 조회
    if (version === null) // 버전 부재 판정
    { // 조건 시작
        return null; // 빈 요약 반환
    } // 조건 종료
    return { versionId: version.id, relationshipLevel: version.relationshipLevel, relationshipStage: version.relationshipStage, emotion: version.emotion, currentScene: version.currentScene, lastMessage: version.lastMessage, updatedAt: version.updatedAt }; // 버전 요약 반환
} // 함수 종료

export function getMessageVersionGroup(state: AppState, versionId: string, messageId: string): MessageVersionGroup // 메시지 버전 그룹 조회
{ // 함수 시작
    const version = state.conversationVersions.find((item) => item.id === versionId); // 현재 버전 조회
    const message = state.messages.find((item) => item.id === messageId && item.versionId === versionId); // 현재 메시지 조회
    const sourceMessageId = message?.sourceMessageId ?? message?.id ?? messageId; // 원본 메시지 결정
    const rootVersionId = version?.forkedFromMessageId === sourceMessageId && version.forkRootVersionId !== null ? version.forkRootVersionId : versionId; // 그룹 원본 결정
    const versions = state.conversationVersions.filter((item) => item.id === rootVersionId || (item.forkRootVersionId === rootVersionId && item.forkedFromMessageId === sourceMessageId)).sort((left, right) => left.ordinal - right.ordinal || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)); // 그룹 버전 정렬
    const versionIds = versions.map((item) => item.id); // 버전 식별자 목록
    return { rootVersionId, sourceMessageId, versionIds, currentIndex: versionIds.indexOf(versionId) }; // 그룹 정보 반환
} // 함수 종료

function createVersionId(state: AppState, conversationId: string): string // 버전 식별자 생성
{ // 함수 시작
    const usedIds = new Set(state.conversationVersions.map((version) => version.id)); // 사용 식별자 집합
    let suffix = state.conversationVersions.filter((version) => version.conversationId === conversationId).length + 1; // 접미사 시작값
    while (usedIds.has(`${conversationId}-version-${suffix}`)) // 중복 식별자 판정
    { // 반복 시작
        suffix += 1; // 접미사 증가
    } // 반복 종료
    return `${conversationId}-version-${suffix}`; // 고유 식별자 반환
} // 함수 종료

export function createVersionFork(state: AppState, input: CreateVersionForkInput): VersionForkResult // 대화 버전 분기 생성
{ // 함수 시작
    const conversation = state.conversations.find((item) => item.id === input.conversationId); // 대상 대화 조회
    const baseVersion = state.conversationVersions.find((version) => version.id === input.baseVersionId && version.conversationId === input.conversationId); // 기준 버전 조회
    if (conversation === undefined || baseVersion === undefined) // 기준 데이터 부재 판정
    { // 조건 시작
        throw new ConversationVersionError("missing-version"); // 버전 오류 발생
    } // 조건 종료
    const baseMessages = getVersionMessages(state, input.conversationId, input.baseVersionId); // 기준 메시지 조회
    const targetIndex = baseMessages.findIndex((message) => message.id === input.targetMessageId && message.role === "user"); // 수정 위치 조회
    if (targetIndex < 0) // 수정 메시지 부재 판정
    { // 조건 시작
        throw new ConversationVersionError("missing-message"); // 메시지 오류 발생
    } // 조건 종료
    const content = input.content.trim(); // 수정 내용 정리
    if (content.length === 0 || content.length > CHAT_MESSAGE_MAX_LENGTH) // 수정 내용 범위 판정
    { // 조건 시작
        throw new ConversationVersionError("invalid-content"); // 입력 오류 발생
    } // 조건 종료
    const targetMessage = baseMessages[targetIndex]; // 수정 대상 조회
    const currentGroup = getMessageVersionGroup(state, input.baseVersionId, input.targetMessageId); // 현재 그룹 조회
    if (currentGroup.versionIds.length >= CHAT_VERSION_LIMIT) // 버전 제한 판정
    { // 조건 시작
        throw new ConversationVersionError("version-limit"); // 제한 오류 발생
    } // 조건 종료
    const versionId = createVersionId(state, input.conversationId); // 새 버전 식별자 생성
    const sourceMessageId = targetMessage.sourceMessageId ?? targetMessage.id; // 원본 메시지 식별자 결정
    const messages: Message[] = baseMessages.slice(0, targetIndex + 1).map((message, index) => // 메시지 스냅샷 생성
    { // 변환 시작
        return { ...message, id: `${versionId}-message-${index + 1}`, versionId, sourceMessageId: message.sourceMessageId ?? message.id, content: index === targetIndex ? content : message.content }; // 복제 메시지 반환
    }); // 변환 종료
    messages.push({ ...input.assistantMessage, conversationId: input.conversationId, versionId, sourceMessageId: null }); // 응답 메시지 추가
    const version: ConversationVersion = // 새 버전 생성
    { // 버전 시작
        id: versionId, // 버전 식별자
        conversationId: input.conversationId, // 대화 식별자
        parentVersionId: input.baseVersionId, // 부모 버전 식별자
        forkRootVersionId: currentGroup.rootVersionId, // 분기 원본 식별자
        forkedFromMessageId: sourceMessageId, // 분기 메시지 식별자
        ordinal: currentGroup.versionIds.length + 1, // 그룹 순번
        relationshipLevel: input.versionState.relationshipLevel, // 관계 수치
        relationshipStage: input.versionState.relationshipStage, // 관계 단계
        emotion: input.versionState.emotion, // 현재 감정
        currentScene: input.versionState.currentScene, // 현재 장면
        lastMessage: input.versionState.lastMessage, // 최근 메시지
        createdAt: input.now, // 생성 시각
        updatedAt: input.now, // 수정 시각
    }; // 버전 종료
    const nextState: AppState = { ...state, conversations: state.conversations.map((item) => item.id === input.conversationId ? { ...item, currentVersionId: versionId, updatedAt: input.now } : item), conversationVersions: [...state.conversationVersions, version], messages: [...state.messages, ...messages] }; // 변경 상태 생성
    return { state: nextState, version, messages, group: getMessageVersionGroup(nextState, versionId, messages[targetIndex].id) }; // 분기 결과 반환
} // 함수 종료

export function removeMessageFromVersion(state: AppState, versionId: string, messageId: string): AppState // 버전 메시지 삭제
{ // 함수 시작
    const version = state.conversationVersions.find((item) => item.id === versionId); // 대상 버전 조회
    const versionMessages = version === undefined ? [] : getVersionMessages(state, version.conversationId, versionId); // 버전 메시지 조회
    const targetIndex = versionMessages.findIndex((message) => message.id === messageId); // 대상 위치 조회
    if (version === undefined || targetIndex < 0) // 대상 부재 판정
    { // 조건 시작
        return state; // 기존 상태 반환
    } // 조건 종료
    const target = versionMessages[targetIndex]; // 대상 메시지 조회
    const removedMessages = target.role === "user" ? versionMessages.slice(targetIndex) : [target]; // 삭제 메시지 목록
    const removedSourceMessageIds = new Set(removedMessages.filter((message) => message.role === "user").map((message) => message.sourceMessageId ?? message.id)); // 삭제 사용자 원본 집합
    const removesForkAnchor = version.parentVersionId !== null && version.forkedFromMessageId !== null && removedSourceMessageIds.has(version.forkedFromMessageId); // 분기 기준 삭제 판정
    if (removesForkAnchor) // 분기 기준 삭제 처리
    { // 조건 시작
        return removeVersionTree(state, version.conversationId, version.id).state; // 분기 트리 삭제 반환
    } // 조건 종료
    const removedIds = new Set(removedMessages.map((message) => message.id)); // 삭제 식별자 집합
    if (removedIds.size >= versionMessages.length) // 마지막 메시지 삭제 판정
    { // 조건 시작
        return state; // 빈 버전 생성 차단
    } // 조건 종료
    const removedAssistantIds = new Set(removedMessages.filter((message) => message.role === "assistant").map((message) => message.id)); // 삭제 응답 식별자 집합
    const messages = state.messages.filter((message) => !removedIds.has(message.id)).map((message) => message.sourceMessageId !== null && removedAssistantIds.has(message.sourceMessageId) ? { ...message, sourceMessageId: null } : message); // 남은 메시지와 응답 참조 정리
    const remaining = versionMessages.filter((message) => !removedIds.has(message.id)); // 현재 버전 잔여 목록
    const lastMessage = remaining.at(-1)?.content ?? ""; // 최근 메시지 결정
    const conversationVersions = state.conversationVersions.map((item) => item.id === versionId ? { ...item, lastMessage } : item); // 버전 요약 갱신
    let nextState = { ...state, messages, conversationVersions }; // 기본 삭제 상태 생성
    const invalidChildren = state.conversationVersions.filter((item) => item.parentVersionId === versionId && item.forkedFromMessageId !== null && !remaining.some((message) => message.role === "user" && (message.id === item.forkedFromMessageId || message.sourceMessageId === item.forkedFromMessageId))); // 기준 소실 하위 분기 조회
    invalidChildren.forEach((child) => // 무효 하위 분기 순회
    { // 순회 시작
        if (nextState.conversationVersions.some((item) => item.id === child.id)) // 잔여 분기 판정
        { // 조건 시작
            nextState = removeVersionTree(nextState, version.conversationId, child.id).state; // 하위 분기 트리 제거
        } // 조건 종료
    }); // 순회 종료
    return nextState; // 삭제 상태 반환
} // 함수 종료

export function removeVersionTree(state: AppState, conversationId: string, versionId: string): VersionDeletionResult // 버전 트리 삭제
{ // 함수 시작
    const target = state.conversationVersions.find((version) => version.id === versionId && version.conversationId === conversationId); // 대상 버전 조회
    if (target === undefined) // 대상 부재 판정
    { // 조건 시작
        throw new ConversationVersionError("missing-version"); // 버전 오류 발생
    } // 조건 종료
    if (target.parentVersionId === null) // 원본 버전 판정
    { // 조건 시작
        throw new ConversationVersionError("original-version"); // 원본 삭제 오류 발생
    } // 조건 종료
    const removedIds = new Set<string>([versionId]); // 삭제 버전 집합
    let changed = true; // 탐색 변경 상태
    while (changed) // 하위 버전 탐색
    { // 반복 시작
        changed = false; // 변경 상태 초기화
        state.conversationVersions.forEach((version) => // 버전 순회
        { // 순회 시작
            if (version.parentVersionId !== null && removedIds.has(version.parentVersionId) && !removedIds.has(version.id)) // 하위 버전 판정
            { // 하위 버전 시작
                removedIds.add(version.id); // 삭제 집합 추가
                changed = true; // 변경 상태 설정
            } // 하위 버전 종료
        }); // 순회 종료
    } // 반복 종료
    const removedMessageCount = state.messages.filter((message) => removedIds.has(message.versionId)).length; // 삭제 메시지 수 계산
    const selectedVersionId = target.parentVersionId; // 복귀 버전 결정
    const conversationVersions = state.conversationVersions.filter((version) => !removedIds.has(version.id)); // 잔여 버전 목록
    const messages = state.messages.filter((message) => !removedIds.has(message.versionId)); // 잔여 메시지 목록
    const conversations = state.conversations.map((conversation) => conversation.id === conversationId && removedIds.has(conversation.currentVersionId) ? { ...conversation, currentVersionId: selectedVersionId } : conversation); // 선택 버전 복귀
    return { state: { ...state, conversations, conversationVersions, messages }, selectedVersionId, versionCount: removedIds.size, messageCount: removedMessageCount }; // 삭제 결과 반환
} // 함수 종료
