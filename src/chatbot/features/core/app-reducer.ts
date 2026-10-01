import { removeMessageFromVersion, removeVersionTree } from "@chatbot/features/conversation/conversation-versioning"; // 버전 변경 함수
import { CONVERSATION_PIN_LIMIT } from "@chatbot/features/conversation/conversation-list-model"; // 고정 한도
import { isAdultVerified } from "@chatbot/features/adult/adult-access"; // 성인 인증 판정
import type { AdultVerification, AppSettings, AppState, Character, CharacterReport, Conversation, ConversationVersion, Message, PublicationStatus, Story, UserProfile } from "@chatbot/features/core/types"; // 상태 타입
import { trySpend, type TokenAction } from "@chatbot/lib/story/token-policy"; // 토큰 정책

export type AppAction = // 앱 동작
    | { type: "toggle-left-panel"; exclusive?: boolean } // 왼쪽 패널 전환
    | { type: "toggle-right-panel"; exclusive?: boolean } // 오른쪽 패널 전환
    | { type: "close-panels" } // 전체 패널 닫기
    | { type: "update-settings"; settings: Partial<AppSettings> } // 설정 변경
    | { type: "update-profile"; profile: Pick<UserProfile, "nickname" | "avatar"> } // 프로필 변경
    | { type: "verify-adult"; verification: AdultVerification; enableMatureContent: boolean } // 성인 인증 완료
    | { type: "revoke-adult-verification" } // 성인 인증 해제
    | { type: "set-mature-content"; enabled: boolean; now: string } // 19세 콘텐츠 표시 전환
    | { type: "add-message"; message: Message } // 메시지 추가
    | { type: "upsert-conversation"; conversation: Conversation } // 대화방 저장
    | { type: "upsert-character"; character: Character } // 캐릭터 저장
    | { type: "delete-character"; characterId: string } // 캐릭터 삭제
    | { type: "upsert-story"; story: Story } // 스토리 저장
    | { type: "delete-story"; storyId: string } // 스토리 삭제
    | { type: "toggle-bookmark"; characterId: string } // 보관 전환
    | { type: "toggle-character-like"; characterId: string } // 좋아요 전환
    | { type: "toggle-creator-follow"; creatorId: string } // 제작자 팔로우 전환
    | { type: "add-character-report"; report: CharacterReport } // 캐릭터 신고 추가
    | { type: "set-publication-status"; characterId: string; status: PublicationStatus } // 발행 상태 변경
    | { type: "select-conversation"; conversationId: string | null } // 대화 선택
    | { type: "select-conversation-version"; conversationId: string; versionId: string } // 대화 버전 선택
    | { type: "apply-conversation-version"; conversationId: string; version: ConversationVersion; messages: Message[] } // 대화 버전 적용
    | { type: "delete-conversation-version"; conversationId: string; versionId: string } // 대화 버전 삭제
    | { type: "delete-version-message"; versionId: string; messageId: string } // 버전 메시지 삭제
    | { type: "rename-conversation"; conversationId: string; title: string } // 대화 이름 변경
    | { type: "archive-conversation"; conversationId: string; archivedAt: string } // 대화 보관
    | { type: "restore-conversation"; conversationId: string } // 대화 복구
    | { type: "delete-conversation"; conversationId: string } // 대화 삭제
    | { type: "toggle-conversation-pin"; conversationId: string } // 대화 고정 전환
    | { type: "merge-chat-state"; conversationId: string; state: AppState; allowCreate: boolean } // 채팅 화면 상태 병합
    | { type: "spend-token"; action: TokenAction } // 토큰 차감
    | { type: "replace-state"; state: AppState }; // 상태 복원

export function appReducer(state: AppState, action: AppAction): AppState // 앱 리듀서
{ // 함수 시작
    switch (action.type) // 동작 분기
    { // 분기 시작
        case "toggle-left-panel": // 왼쪽 전환
            return { ...state, settings: { ...state.settings, leftPanelOpen: !state.settings.leftPanelOpen, rightPanelOpen: action.exclusive ? false : state.settings.rightPanelOpen } }; // 왼쪽 상태 반환
        case "toggle-right-panel": // 오른쪽 전환
            return { ...state, settings: { ...state.settings, rightPanelOpen: !state.settings.rightPanelOpen, leftPanelOpen: action.exclusive ? false : state.settings.leftPanelOpen } }; // 오른쪽 상태 반환
        case "close-panels": // 전체 닫기
            return { ...state, settings: { ...state.settings, leftPanelOpen: false, rightPanelOpen: false } }; // 닫힌 상태 반환
        case "update-settings": // 설정 변경
            return { ...state, settings: { ...state.settings, ...action.settings } }; // 병합 상태 반환
        case "update-profile": // 프로필 변경
            return { ...state, profile: { ...state.profile, ...action.profile } }; // 프로필 상태 반환
        case "verify-adult": // 성인 인증 완료
            return { ...state, profile: { ...state.profile, adultVerification: structuredClone(action.verification) }, settings: { ...state.settings, matureContentEnabled: action.enableMatureContent || state.settings.matureContentEnabled } }; // 인증 상태 반환
        case "revoke-adult-verification": // 성인 인증 해제
            return { ...state, profile: { ...state.profile, adultVerification: null }, settings: { ...state.settings, matureContentEnabled: false } }; // 해제 상태 반환
        case "set-mature-content": // 19세 콘텐츠 표시 전환
            if (action.enabled && !isAdultVerified(state.profile, new Date(action.now))) // 인증 없는 켜기 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            return { ...state, settings: { ...state.settings, matureContentEnabled: action.enabled } }; // 표시 상태 반환
        case "add-message": // 메시지 추가
            return { ...state, messages: [...state.messages, action.message] }; // 메시지 상태 반환
        case "upsert-conversation": // 대화방 저장
        { // 저장 범위 시작
            const exists = state.conversations.some((conversation) => conversation.id === action.conversation.id); // 기존 대화 확인
            const conversations = exists ? state.conversations.map((conversation) => conversation.id === action.conversation.id ? action.conversation : conversation) : [...state.conversations, action.conversation]; // 대화 목록 생성
            return { ...state, conversations }; // 대화 상태 반환
        } // 저장 범위 종료
        case "upsert-character": // 캐릭터 저장
        { // 저장 범위 시작
            const exists = state.characters.some((character) => character.id === action.character.id); // 기존 캐릭터 확인
            const characters = exists ? state.characters.map((character) => character.id === action.character.id ? action.character : character) : [...state.characters, action.character]; // 캐릭터 목록 생성
            return { ...state, characters }; // 캐릭터 상태 반환
        } // 저장 범위 종료
        case "delete-character": // 캐릭터 삭제
        { // 삭제 범위 시작
            const deletedCharacter = state.characters.find((character) => character.id === action.characterId); // 삭제 캐릭터 조회
            const remainingCharacterIds = new Set(state.characters.filter((character) => character.id !== action.characterId).map((character) => character.id)); // 남는 캐릭터
            const trimmedStories = state.stories.map((story) => story.cast.some((member) => member.characterId === action.characterId) ? { ...story, cast: story.cast.filter((member) => member.characterId !== action.characterId) } : story); // 등장인물에서 제외
            const removedStoryIds = new Set(trimmedStories.filter((story) => story.cast.length === 0).map((story) => story.id)); // 인물이 남지 않은 스토리
            const keptConversations = state.conversations.flatMap((conversation) => // 남길 대화 계산
            { // 계산 시작
                if (conversation.mode !== "story") // 캐릭터 대화 판정
                { // 조건 시작
                    return conversation.characterId === action.characterId ? [] : [conversation]; // 연결 대화 제거
                } // 조건 종료
                if (conversation.storyId !== null && removedStoryIds.has(conversation.storyId)) // 삭제 스토리 대화 판정
                { // 조건 시작
                    return []; // 함께 제거
                } // 조건 종료
                if (conversation.characterId !== action.characterId) // 다른 첫 인물 판정
                { // 조건 시작
                    return [conversation]; // 그대로 유지
                } // 조건 종료
                const nextLead = conversation.storyCast.find((member) => member.characterId !== action.characterId && remainingCharacterIds.has(member.characterId)); // 다음 첫 인물
                return nextLead === undefined ? [] : [{ ...conversation, characterId: nextLead.characterId }]; // 첫 인물 교체
            }); // 계산 종료
            const keptIds = new Set(keptConversations.map((conversation) => conversation.id)); // 남는 대화 식별자
            const conversationIds = state.conversations.filter((conversation) => !keptIds.has(conversation.id)).map((conversation) => conversation.id); // 제거 대화 식별자
            const creatorStillExists = deletedCharacter !== undefined && state.characters.some((character) => character.id !== action.characterId && character.creatorId === deletedCharacter.creatorId); // 같은 제작자 잔존 확인
            return ( // 삭제 상태 반환
            { // 상태 시작
                ...state, // 기존 상태 복사
                characters: state.characters.filter((character) => character.id !== action.characterId), // 캐릭터 제거
                stories: trimmedStories.filter((story) => !removedStoryIds.has(story.id)), // 빈 스토리 제거
                conversations: keptConversations, // 연결 대화 제거
                conversationVersions: state.conversationVersions.filter((version) => !conversationIds.includes(version.conversationId)), // 연결 버전 제거
                messages: state.messages.filter((message) => !conversationIds.includes(message.conversationId)), // 연결 메시지 제거
                bookmarkedCharacterIds: state.bookmarkedCharacterIds.filter((id) => id !== action.characterId), // 보관 상태 제거
                likedCharacterIds: state.likedCharacterIds.filter((id) => id !== action.characterId), // 좋아요 상태 제거
                followedCreatorIds: deletedCharacter === undefined || creatorStillExists ? state.followedCreatorIds : state.followedCreatorIds.filter((id) => id !== deletedCharacter.creatorId), // 고아 팔로우 제거
                localReports: state.localReports.filter((report) => report.characterId !== action.characterId), // 신고 상태 제거
                memories: state.memories.filter((memory) => memory.characterId !== action.characterId && !conversationIds.includes(memory.conversationId)), // 기억 상태 제거
                pinnedConversationIds: state.pinnedConversationIds.filter((id) => !conversationIds.includes(id)), // 고정 상태 제거
                selectedConversationId: state.selectedConversationId !== null && conversationIds.includes(state.selectedConversationId) ? null : state.selectedConversationId, // 선택 대화 정리
            }); // 상태 종료
        } // 삭제 범위 종료
        case "upsert-story": // 스토리 저장
        { // 저장 범위 시작
            const exists = state.stories.some((story) => story.id === action.story.id); // 기존 스토리 확인
            const stories = exists ? state.stories.map((story) => story.id === action.story.id ? structuredClone(action.story) : story) : [...state.stories, structuredClone(action.story)]; // 스토리 목록 생성
            return { ...state, stories }; // 스토리 상태 반환
        } // 저장 범위 종료
        case "delete-story": // 스토리 삭제
        { // 삭제 범위 시작
            const conversationIds = state.conversations.filter((conversation) => conversation.mode === "story" && conversation.storyId === action.storyId).map((conversation) => conversation.id); // 연결 대화
            return ( // 삭제 상태 반환
            { // 상태 시작
                ...state, // 기존 상태 복사
                stories: state.stories.filter((story) => story.id !== action.storyId), // 스토리 제거
                conversations: state.conversations.filter((conversation) => !conversationIds.includes(conversation.id)), // 연결 대화 제거
                conversationVersions: state.conversationVersions.filter((version) => !conversationIds.includes(version.conversationId)), // 연결 버전 제거
                messages: state.messages.filter((message) => !conversationIds.includes(message.conversationId)), // 연결 메시지 제거
                memories: state.memories.filter((memory) => !conversationIds.includes(memory.conversationId)), // 연결 기억 제거
                pinnedConversationIds: state.pinnedConversationIds.filter((id) => !conversationIds.includes(id)), // 고정 정리
                selectedConversationId: state.selectedConversationId !== null && conversationIds.includes(state.selectedConversationId) ? null : state.selectedConversationId, // 선택 정리
            }); // 상태 종료
        } // 삭제 범위 종료
        case "toggle-bookmark": // 보관 전환
        { // 전환 범위 시작
            const exists = state.characters.some((character) => character.id === action.characterId); // 캐릭터 존재 확인
            if (!exists) // 캐릭터 부재 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            const bookmarked = state.bookmarkedCharacterIds.includes(action.characterId); // 기존 보관 확인
            const bookmarkedCharacterIds = bookmarked ? state.bookmarkedCharacterIds.filter((id) => id !== action.characterId) : [...state.bookmarkedCharacterIds, action.characterId]; // 다음 보관 목록
            return { ...state, bookmarkedCharacterIds }; // 보관 상태 반환
        } // 전환 범위 종료
        case "toggle-character-like": // 좋아요 전환
        { // 전환 범위 시작
            const exists = state.characters.some((character) => character.id === action.characterId); // 캐릭터 존재 확인
            if (!exists) // 캐릭터 부재 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            const liked = state.likedCharacterIds.includes(action.characterId); // 기존 좋아요 확인
            const likedCharacterIds = liked ? state.likedCharacterIds.filter((id) => id !== action.characterId) : [...state.likedCharacterIds, action.characterId]; // 다음 좋아요 목록
            return { ...state, likedCharacterIds }; // 좋아요 상태 반환
        } // 전환 범위 종료
        case "toggle-creator-follow": // 제작자 팔로우 전환
        { // 전환 범위 시작
            const exists = state.characters.some((character) => character.creatorId === action.creatorId); // 제작자 존재 확인
            if (!exists) // 제작자 부재 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            const followed = state.followedCreatorIds.includes(action.creatorId); // 기존 팔로우 확인
            const followedCreatorIds = followed ? state.followedCreatorIds.filter((id) => id !== action.creatorId) : [...state.followedCreatorIds, action.creatorId]; // 다음 팔로우 목록
            return { ...state, followedCreatorIds }; // 팔로우 상태 반환
        } // 전환 범위 종료
        case "add-character-report": // 캐릭터 신고 추가
        { // 추가 범위 시작
            const characterExists = state.characters.some((character) => character.id === action.report.characterId); // 캐릭터 존재 확인
            const reportExists = state.localReports.some((report) => report.id === action.report.id); // 신고 중복 확인
            if (!characterExists || reportExists) // 추가 제외 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            return { ...state, localReports: [...state.localReports, action.report] }; // 신고 상태 반환
        } // 추가 범위 종료
        case "set-publication-status": // 발행 상태 변경
            return { ...state, characters: state.characters.map((character) => character.id === action.characterId ? { ...character, publicationStatus: action.status } : character) }; // 발행 상태 반환
        case "select-conversation": // 대화 선택
            return { ...state, selectedConversationId: action.conversationId }; // 선택 상태 반환
        case "select-conversation-version": // 대화 버전 선택
        { // 선택 범위 시작
            const valid = state.conversationVersions.some((version) => version.id === action.versionId && version.conversationId === action.conversationId); // 버전 연결 확인
            return valid ? { ...state, conversations: state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, currentVersionId: action.versionId } : conversation) } : state; // 선택 상태 반환
        } // 선택 범위 종료
        case "apply-conversation-version": // 대화 버전 적용
        { // 적용 범위 시작
            const validConversation = state.conversations.some((conversation) => conversation.id === action.conversationId); // 대화 존재 확인
            const validPayload = action.version.conversationId === action.conversationId && action.messages.every((message) => message.conversationId === action.conversationId && message.versionId === action.version.id); // 버전 연결 확인
            if (!validConversation || !validPayload) // 잘못된 입력 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            const conversationVersions = [...state.conversationVersions.filter((version) => version.id !== action.version.id), structuredClone(action.version)]; // 버전 목록 생성
            const messages = [...state.messages.filter((message) => message.versionId !== action.version.id), ...structuredClone(action.messages)]; // 메시지 목록 생성
            const conversations = state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, currentVersionId: action.version.id, updatedAt: action.version.updatedAt } : conversation); // 대화 선택 갱신
            return { ...state, conversations, conversationVersions, messages }; // 적용 상태 반환
        } // 적용 범위 종료
        case "delete-conversation-version": // 대화 버전 삭제
        { // 삭제 범위 시작
            try // 삭제 시도
            { // 시도 시작
                return removeVersionTree(state, action.conversationId, action.versionId).state; // 삭제 상태 반환
            } // 시도 종료
            catch // 삭제 오류 처리
            { // 오류 시작
                return state; // 기존 상태 반환
            } // 오류 종료
        } // 삭제 범위 종료
        case "delete-version-message": // 버전 메시지 삭제
            return removeMessageFromVersion(state, action.versionId, action.messageId); // 메시지 삭제 상태 반환
        case "rename-conversation": // 대화 이름 변경
        { // 변경 범위 시작
            const title = action.title.trim(); // 이름 공백 정리
            if (title.length === 0 || title.length > 60) // 이름 범위 확인
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            return { ...state, conversations: state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, title } : conversation) }; // 이름 상태 반환
        } // 변경 범위 종료
        case "archive-conversation": // 대화 보관
            return { ...state, conversations: state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, archivedAt: action.archivedAt } : conversation), pinnedConversationIds: state.pinnedConversationIds.filter((id) => id !== action.conversationId) }; // 보관 상태 반환(고정 해제)
        case "restore-conversation": // 대화 복구
            return { ...state, conversations: state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, archivedAt: null } : conversation) }; // 복구 상태 반환
        case "delete-conversation": // 대화 삭제
            return { ...state, conversations: state.conversations.filter((conversation) => conversation.id !== action.conversationId), conversationVersions: state.conversationVersions.filter((version) => version.conversationId !== action.conversationId), messages: state.messages.filter((message) => message.conversationId !== action.conversationId), pinnedConversationIds: state.pinnedConversationIds.filter((id) => id !== action.conversationId), selectedConversationId: state.selectedConversationId === action.conversationId ? null : state.selectedConversationId }; // 삭제 상태 반환
        case "toggle-conversation-pin": // 대화 고정 전환
        { // 고정 범위 시작
            if (state.pinnedConversationIds.includes(action.conversationId)) // 고정 해제 판정
            { // 조건 시작
                return { ...state, pinnedConversationIds: state.pinnedConversationIds.filter((id) => id !== action.conversationId) }; // 해제 상태 반환
            } // 조건 종료
            const target = state.conversations.find((conversation) => conversation.id === action.conversationId); // 대상 대화 조회
            const activePinCount = state.pinnedConversationIds.filter((id) => state.conversations.some((conversation) => conversation.id === id && conversation.archivedAt === null)).length; // 유효 고정 수
            if (target === undefined || target.archivedAt !== null || activePinCount >= CONVERSATION_PIN_LIMIT) // 고정 불가 판정
            { // 조건 시작
                return state; // 기존 상태 반환
            } // 조건 종료
            return { ...state, pinnedConversationIds: [action.conversationId, ...state.pinnedConversationIds] }; // 최근 고정 우선 반환
        } // 고정 범위 종료
        case "merge-chat-state": // 채팅 화면 상태 병합
        { // 병합 범위 시작
            const chat = structuredClone(action.state); // 채팅 상태 복사
            const chatConversation = chat.conversations.find((conversation) => conversation.id === action.conversationId); // 채팅 대화 조회
            const existing = state.conversations.find((conversation) => conversation.id === action.conversationId); // 전역 대화 조회
            if (chatConversation === undefined || (existing === undefined && !action.allowCreate)) // 다른 곳에서 지운 대화 판정
            { // 조건 시작
                return state; // 되살리지 않음
            } // 조건 종료
            const conversation = existing === undefined ? chatConversation : { ...chatConversation, title: existing.title, archivedAt: existing.archivedAt }; // 왼쪽 창의 이름·보관 유지
            const conversations = existing === undefined ? [...state.conversations, conversation] : state.conversations.map((item) => item.id === conversation.id ? conversation : item); // 대화 목록 생성
            const conversationVersions = [...state.conversationVersions.filter((version) => version.conversationId !== action.conversationId), ...chat.conversationVersions.filter((version) => version.conversationId === action.conversationId)]; // 채팅 대화 버전 교체
            const messages = [...state.messages.filter((message) => message.conversationId !== action.conversationId), ...chat.messages.filter((message) => message.conversationId === action.conversationId)]; // 채팅 대화 메시지 교체
            return { ...state, conversations, conversationVersions, messages, wallet: chat.wallet, selectedConversationId: chat.selectedConversationId }; // 채팅 소유 필드만 반영
        } // 병합 범위 종료
        case "spend-token": // 토큰 차감
        { // 차감 범위 시작
            const result = trySpend(state.wallet, action.action); // 차감 실행
            return result.ok ? { ...state, wallet: result.wallet } : state; // 원자적 결과 반환
        } // 차감 범위 종료
        case "replace-state": // 상태 교체
            return structuredClone(action.state); // 복원 상태 반환
        default: // 기본 분기
            return state; // 기존 상태 반환
    } // 분기 종료
} // 함수 종료
