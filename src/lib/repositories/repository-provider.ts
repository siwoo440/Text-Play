import type { AppState, Character, Conversation, Message } from "@/features/core/types"; // 도메인 타입
import { LocalStorageGateway } from "@/lib/repositories/local-storage-gateway"; // 로컬 게이트웨이
import type { CharacterRepository, ConversationRepository, SettingsRepository, TokenRepository } from "@/lib/repositories/repositories"; // 저장소 계약

export interface LocalRepositoryProvider // 로컬 공급자 구조
{ // 구조 시작
    gateway: LocalStorageGateway; // 공유 게이트웨이
    characters: CharacterRepository; // 캐릭터 저장소
    conversations: ConversationRepository; // 대화 저장소
    settings: SettingsRepository; // 설정 저장소
    tokens: TokenRepository; // 토큰 저장소
} // 구조 종료

function replaceById<T extends { id: string }>(items: T[], nextItem: T): T[] // 식별자 교체 함수
{ // 함수 시작
    const index = items.findIndex((item) => item.id === nextItem.id); // 기존 위치 탐색
    if (index === -1) // 새 항목 판정
    { // 새 항목 시작
        return [...items, structuredClone(nextItem)]; // 추가 목록 반환
    } // 새 항목 종료
    const nextItems = [...items]; // 목록 복사
    nextItems[index] = structuredClone(nextItem); // 기존 항목 교체
    return nextItems; // 교체 목록 반환
} // 함수 종료

export function createLocalRepositoryProvider(storage: Storage): LocalRepositoryProvider // 로컬 공급자 생성 함수
{ // 함수 시작
    const gateway = new LocalStorageGateway(storage); // 공유 게이트웨이 생성
    function updateState(update: (state: AppState) => void): void // 상태 갱신 함수
    { // 함수 시작
        const state = gateway.load().state; // 현재 상태 읽기
        update(state); // 상태 변경
        gateway.save(state); // 변경 상태 저장
    } // 함수 종료
    const characters: CharacterRepository = // 캐릭터 저장소
    { // 저장소 시작
        list(): Character[] // 전체 조회 함수
        { // 함수 시작
            return gateway.load().state.characters; // 캐릭터 목록 반환
        }, // 함수 종료
        findById(id: string): Character | null // 단일 조회 함수
        { // 함수 시작
            return gateway.load().state.characters.find((character) => character.id === id) ?? null; // 캐릭터 반환
        }, // 함수 종료
        save(character: Character): void // 저장 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.characters = replaceById(state.characters, character); // 캐릭터 반영
            }); // 변경 종료
        }, // 함수 종료
        remove(id: string): void // 삭제 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.characters = state.characters.filter((character) => character.id !== id); // 캐릭터 제거
            }); // 변경 종료
        }, // 함수 종료
    }; // 저장소 종료
    const conversations: ConversationRepository = // 대화 저장소
    { // 저장소 시작
        list(): Conversation[] // 전체 조회 함수
        { // 함수 시작
            return gateway.load().state.conversations; // 대화 목록 반환
        }, // 함수 종료
        findById(id: string): Conversation | null // 단일 조회 함수
        { // 함수 시작
            return gateway.load().state.conversations.find((conversation) => conversation.id === id) ?? null; // 대화 반환
        }, // 함수 종료
        listMessages(conversationId: string): Message[] // 메시지 조회 함수
        { // 함수 시작
            return gateway.load().state.messages.filter((message) => message.conversationId === conversationId); // 메시지 목록 반환
        }, // 함수 종료
        saveConversation(conversation: Conversation): void // 대화 저장 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.conversations = replaceById(state.conversations, conversation); // 대화 반영
            }); // 변경 종료
        }, // 함수 종료
        saveMessage(message: Message): void // 메시지 저장 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.messages = replaceById(state.messages, message); // 메시지 반영
            }); // 변경 종료
        }, // 함수 종료
        remove(id: string): void // 대화 삭제 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.conversations = state.conversations.filter((conversation) => conversation.id !== id); // 대화 제거
                state.messages = state.messages.filter((message) => message.conversationId !== id); // 메시지 제거
                state.selectedConversationId = state.selectedConversationId === id ? null : state.selectedConversationId; // 선택 상태 정리
            }); // 변경 종료
        }, // 함수 종료
    }; // 저장소 종료
    const settings: SettingsRepository = // 설정 저장소
    { // 저장소 시작
        get() // 설정 조회 함수
        { // 함수 시작
            return gateway.load().state.settings; // 설정 반환
        }, // 함수 종료
        save(nextSettings) // 설정 저장 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.settings = structuredClone(nextSettings); // 설정 반영
            }); // 변경 종료
        }, // 함수 종료
    }; // 저장소 종료
    const tokens: TokenRepository = // 토큰 저장소
    { // 저장소 시작
        get() // 토큰 조회 함수
        { // 함수 시작
            return gateway.load().state.wallet; // 지갑 반환
        }, // 함수 종료
        save(wallet) // 토큰 저장 함수
        { // 함수 시작
            updateState((state) => // 상태 변경
            { // 변경 시작
                state.wallet = structuredClone(wallet); // 지갑 반영
            }); // 변경 종료
        }, // 함수 종료
    }; // 저장소 종료
    return { gateway, characters, conversations, settings, tokens }; // 공급자 반환
} // 함수 종료
