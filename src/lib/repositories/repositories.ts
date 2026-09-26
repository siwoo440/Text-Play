import type { AppSettings, Character, Conversation, Message, TokenWallet } from "@/features/core/types"; // 도메인 타입

export interface CharacterRepository // 캐릭터 저장소 계약
{ // 계약 시작
    list(): Character[]; // 전체 캐릭터 조회
    findById(id: string): Character | null; // 단일 캐릭터 조회
    save(character: Character): void; // 캐릭터 저장
    remove(id: string): void; // 캐릭터 삭제
} // 계약 종료

export interface ConversationRepository // 대화 저장소 계약
{ // 계약 시작
    list(): Conversation[]; // 전체 대화 조회
    findById(id: string): Conversation | null; // 단일 대화 조회
    listMessages(conversationId: string): Message[]; // 대화 메시지 조회
    saveConversation(conversation: Conversation): void; // 대화 저장
    saveMessage(message: Message): void; // 메시지 저장
    remove(id: string): void; // 대화 삭제
} // 계약 종료

export interface SettingsRepository // 설정 저장소 계약
{ // 계약 시작
    get(): AppSettings; // 설정 조회
    save(settings: AppSettings): void; // 설정 저장
} // 계약 종료

export interface TokenRepository // 토큰 저장소 계약
{ // 계약 시작
    get(): TokenWallet; // 토큰 조회
    save(wallet: TokenWallet): void; // 토큰 저장
} // 계약 종료
