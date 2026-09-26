import type { AppSettings, AppState, Character, Conversation, Message, PublicationStatus, UserProfile } from "@/features/core/types"; // 상태 타입
import { trySpend, type TokenAction } from "@/lib/story/token-policy"; // 토큰 정책

export type AppAction = // 앱 동작
    | { type: "toggle-left-panel"; exclusive?: boolean } // 왼쪽 패널 전환
    | { type: "toggle-right-panel"; exclusive?: boolean } // 오른쪽 패널 전환
    | { type: "close-panels" } // 전체 패널 닫기
    | { type: "update-settings"; settings: Partial<AppSettings> } // 설정 변경
    | { type: "update-profile"; profile: Pick<UserProfile, "nickname" | "avatar"> } // 프로필 변경
    | { type: "add-message"; message: Message } // 메시지 추가
    | { type: "upsert-conversation"; conversation: Conversation } // 대화방 저장
    | { type: "upsert-character"; character: Character } // 캐릭터 저장
    | { type: "delete-character"; characterId: string } // 캐릭터 삭제
    | { type: "toggle-bookmark"; characterId: string } // 보관 전환
    | { type: "set-publication-status"; characterId: string; status: PublicationStatus } // 발행 상태 변경
    | { type: "select-conversation"; conversationId: string | null } // 대화 선택
    | { type: "rename-conversation"; conversationId: string; title: string } // 대화 이름 변경
    | { type: "archive-conversation"; conversationId: string; archivedAt: string } // 대화 보관
    | { type: "restore-conversation"; conversationId: string } // 대화 복구
    | { type: "delete-conversation"; conversationId: string } // 대화 삭제
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
            const conversationIds = state.conversations.filter((conversation) => conversation.characterId === action.characterId).map((conversation) => conversation.id); // 연결 대화 식별자
            return ( // 삭제 상태 반환
            { // 상태 시작
                ...state, // 기존 상태 복사
                characters: state.characters.filter((character) => character.id !== action.characterId), // 캐릭터 제거
                conversations: state.conversations.filter((conversation) => conversation.characterId !== action.characterId), // 연결 대화 제거
                messages: state.messages.filter((message) => !conversationIds.includes(message.conversationId)), // 연결 메시지 제거
                bookmarkedCharacterIds: state.bookmarkedCharacterIds.filter((id) => id !== action.characterId), // 보관 상태 제거
                selectedConversationId: state.selectedConversationId !== null && conversationIds.includes(state.selectedConversationId) ? null : state.selectedConversationId, // 선택 대화 정리
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
        case "set-publication-status": // 발행 상태 변경
            return { ...state, characters: state.characters.map((character) => character.id === action.characterId ? { ...character, publicationStatus: action.status } : character) }; // 발행 상태 반환
        case "select-conversation": // 대화 선택
            return { ...state, selectedConversationId: action.conversationId }; // 선택 상태 반환
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
            return { ...state, conversations: state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, archivedAt: action.archivedAt } : conversation) }; // 보관 상태 반환
        case "restore-conversation": // 대화 복구
            return { ...state, conversations: state.conversations.map((conversation) => conversation.id === action.conversationId ? { ...conversation, archivedAt: null } : conversation) }; // 복구 상태 반환
        case "delete-conversation": // 대화 삭제
            return { ...state, conversations: state.conversations.filter((conversation) => conversation.id !== action.conversationId), messages: state.messages.filter((message) => message.conversationId !== action.conversationId), selectedConversationId: state.selectedConversationId === action.conversationId ? null : state.selectedConversationId }; // 삭제 상태 반환
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
