import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 함수
import { createVersionFork } from "@chatbot/features/conversation/conversation-versioning"; // 버전 분기 도구
import type { AppState, Character, Message } from "@chatbot/features/core/types"; // 도메인 타입
import { ImportValidationError, LocalStorageGateway, StorageWriteError } from "@chatbot/lib/repositories/local-storage-gateway"; // 저장소 대상
import { createLocalRepositoryProvider } from "@chatbot/lib/repositories/repository-provider"; // 저장소 공급자
import { mockStories } from "@chatbot/mocks/story-fixtures"; // 기본 예시 스토리
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지 만들기

const stateKey = "mateverse:v1:state"; // 상태 저장 키
const backupKey = "mateverse:v1:backup"; // 백업 저장 키

function restoreLegacyConversationFields(value: Record<string, unknown>): void // 이전 대화 필드 복원
{ // 함수 시작
    const conversations = value.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
    const versions = value.conversationVersions as Array<Record<string, unknown>>; // 버전 목록 접근
    conversations.forEach((conversation) => // 대화 순회
    { // 순회 시작
        const version = versions.find((item) => item.id === conversation.currentVersionId); // 현재 버전 조회
        conversation.relationshipLevel = version?.relationshipLevel; // 관계 수치 복원
        conversation.relationshipStage = version?.relationshipStage; // 관계 단계 복원
        conversation.emotion = version?.emotion; // 감정 복원
        conversation.currentScene = version?.currentScene; // 장면 복원
        conversation.lastMessage = version?.lastMessage; // 최근 메시지 복원
        delete conversation.currentVersionId; // 현재 버전 제거
    }); // 순회 종료
    const messages = value.messages as Array<Record<string, unknown>>; // 메시지 목록 접근
    messages.forEach((message) => // 메시지 순회
    { // 순회 시작
        delete message.versionId; // 버전 연결 제거
        delete message.sourceMessageId; // 원본 연결 제거
    }); // 순회 종료
    delete value.conversationVersions; // 버전 목록 제거
} // 함수 종료

class FailingStorage implements Storage // 실패 저장소
{ // 클래스 시작
    public readonly length = 0; // 저장 항목 수

    public clear(): void // 전체 삭제 함수
    { // 함수 시작
    } // 함수 종료

    public getItem(key: string): string | null // 항목 읽기 함수
    { // 함수 시작
        void key; // 매개변수 사용
        return null; // 빈 항목 반환
    } // 함수 종료

    public key(index: number): string | null // 키 조회 함수
    { // 함수 시작
        void index; // 매개변수 사용
        return null; // 빈 키 반환
    } // 함수 종료

    public removeItem(key: string): void // 항목 삭제 함수
    { // 함수 시작
        void key; // 매개변수 사용
    } // 함수 종료

    public setItem(key: string, value: string): void // 항목 저장 함수
    { // 함수 시작
        void key; // 키 사용
        void value; // 값 사용
        throw new DOMException("저장공간 부족", "QuotaExceededError"); // 용량 오류 발생
    } // 함수 종료
} // 클래스 종료

class ResetFailingStorage implements Storage // 초기화 실패 저장소
{ // 클래스 시작
    private readonly values = new Map<string, string>([[backupKey, "보존할 백업"]]); // 저장값 목록

    public get length(): number // 저장 항목 수
    { // 함수 시작
        return this.values.size; // 항목 수 반환
    } // 함수 종료

    public clear(): void // 전체 삭제 함수
    { // 함수 시작
        this.values.clear(); // 전체 값 제거
    } // 함수 종료

    public getItem(key: string): string | null // 항목 읽기 함수
    { // 함수 시작
        return this.values.get(key) ?? null; // 저장값 반환
    } // 함수 종료

    public key(index: number): string | null // 키 조회 함수
    { // 함수 시작
        return [...this.values.keys()][index] ?? null; // 위치 키 반환
    } // 함수 종료

    public removeItem(key: string): void // 항목 삭제 함수
    { // 함수 시작
        this.values.delete(key); // 저장값 제거
    } // 함수 종료

    public setItem(key: string, value: string): void // 항목 저장 함수
    { // 함수 시작
        void value; // 값 사용
        if (key === stateKey) // 상태 저장 판정
        { // 상태 저장 시작
            throw new DOMException("저장공간 부족", "QuotaExceededError"); // 용량 오류 발생
        } // 상태 저장 종료
        this.values.set(key, value); // 일반 항목 저장
    } // 함수 종료
} // 클래스 종료

describe("로컬 저장소 게이트웨이", () => // 게이트웨이 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        localStorage.clear(); // 저장 데이터 제거
    }); // 초기화 종료

    it("저장한 상태를 새 복사본으로 복원한다", () => // 정상 저장 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        const state = createInitialState(); // 상태 생성
        state.wallet.balance = 777; // 잔액 변경
        gateway.save(state); // 상태 저장
        state.wallet.balance = 1; // 원본 변경
        const firstLoad = gateway.load(); // 첫 복원
        firstLoad.state.wallet.balance = 2; // 복원본 변경
        const secondLoad = gateway.load(); // 둘째 복원
        expect(firstLoad.recovered).toBe(false); // 정상 상태 확인
        expect(secondLoad.state.wallet.balance).toBe(777); // 저장값 유지 확인
    }); // 검증 종료

    it("손상된 원본을 백업하고 초기 상태를 반환한다", () => // 손상 복구 검증
    { // 검증 시작
        localStorage.setItem(stateKey, "{broken"); // 손상 데이터 저장
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        const result = gateway.load(); // 데이터 읽기
        expect(result.recovered).toBe(true); // 복구 상태 확인
        expect(result.warning).toContain("복구"); // 복구 경고 확인
        expect(result.state.schemaVersion).toBe(12); // 초기 상태 확인
        expect(localStorage.getItem(backupKey)).toBe("{broken"); // 원본 백업 확인
    }); // 검증 종료

    it("필수 내부 필드가 잘못된 상태도 손상 데이터로 복구한다", () => // 내부 검증 확인
    { // 검증 시작
        const invalidState = createInitialState() as unknown as Record<string, unknown>; // 잘못된 상태 준비
        invalidState.wallet = { balance: "많음" }; // 잘못된 지갑 적용
        const raw = JSON.stringify(invalidState); // 원본 직렬화
        localStorage.setItem(stateKey, raw); // 잘못된 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 데이터 읽기
        expect(result.recovered).toBe(true); // 복구 상태 확인
        expect(result.state.wallet.balance).toBe(1240); // 초기 잔액 확인
        expect(localStorage.getItem(backupKey)).toBe(raw); // 잘못된 원본 확인
    }); // 검증 종료

    it("버전 0 데이터를 버전 1로 변환하고 사용자 데이터를 유지한다", () => // 마이그레이션 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 생성
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 0; // 이전 버전 적용
        delete legacy.providerMode; // 공급자 필드 제거
        legacy.settings = { leftPanelOpen: false, rightPanelOpen: true }; // 이전 설정 적용
        const legacyWallet = legacy.wallet as Record<string, unknown>; // 이전 지갑 접근
        legacyWallet.balance = 321; // 이전 잔액 적용
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 이전 상태 읽기
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.warning).toContain("업데이트"); // 변환 안내 확인
        expect(result.state.schemaVersion).toBe(12); // 현재 버전 확인
        expect(result.state.providerMode).toBe("mock"); // 공급자 기본값 확인
        expect(result.state.wallet.balance).toBe(321); // 사용자 잔액 유지 확인
        expect(result.state.settings.leftPanelOpen).toBe(false); // 이전 설정 유지 확인
        expect(result.state.settings.notificationStartTime).toBe("09:00"); // 새 설정 기본값 확인
    }); // 검증 종료

    it("버전 1 상태를 버전 2로 변환하고 기존 데이터를 유지한다", () => // 마이그레이션 검증
    { // 검증 시작
        const legacy = createInitialState() as unknown as Record<string, unknown>; // 기준 상태 준비
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 1; // 이전 버전 적용
        delete legacy.bookmarkedCharacterIds; // 새 필드 제거
        const characters = legacy.characters as Array<Record<string, unknown>>; // 캐릭터 접근
        characters.forEach((character) => delete character.publicationStatus); // 상태 필드 제거
        const wallet = legacy.wallet as Record<string, unknown>; // 지갑 접근
        wallet.balance = 321; // 사용자 잔액 적용
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(12); // 새 버전 확인
        expect(result.state.wallet.balance).toBe(321); // 기존 데이터 확인
        expect(result.state.characters.every((character) => character.publicationStatus === "published")).toBe(true); // 공개 상태 확인
        expect(result.state.bookmarkedCharacterIds).toEqual([]); // 보관 목록 확인
    }); // 검증 종료

    it("버전 2 데이터에 누락된 랭킹 캐릭터를 추가하고 사용자 데이터를 유지한다", () => // 랭킹 마이그레이션 검증
    { // 검증 시작
        const current = createInitialState(); // 현재 상태 생성
        const custom: Character = { ...current.characters[0], id: "custom-local", name: "사용자 제작 캐릭터" }; // 사용자 캐릭터 생성
        const legacy = { ...current, schemaVersion: 2, characters: [...current.characters.slice(0, 7), custom] }; // 버전 2 상태 생성
        restoreLegacyConversationFields(legacy as unknown as Record<string, unknown>); // 이전 대화 구조 복원
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(12); // 새 버전 확인
        expect(result.state.characters).toHaveLength(101); // 전체 목록 확인
        expect(result.state.characters.some((character) => character.id === "custom-local")).toBe(true); // 사용자 캐릭터 확인
        expect(result.state.characters.some((character) => character.id === "rank-100")).toBe(true); // 랭킹 캐릭터 확인
    }); // 검증 종료

    it("버전 3의 랭킹 이미지 경로를 갱신하고 사용자 캐릭터를 유지한다", () => // 이미지 마이그레이션 검증
    { // 검증 시작
        const current = createInitialState(); // 현재 상태 생성
        const custom: Character = { ...current.characters[0], id: "custom-local", name: "사용자 제작 캐릭터", coverImage: "/custom.webp" }; // 사용자 캐릭터 생성
        const staleCharacters = current.characters.map((character) => character.id === "rank-050" ? { ...character, coverImage: "/images/characters/rian.webp" } : character); // 이전 이미지 적용
        const legacy = { ...current, schemaVersion: 3, characters: [...staleCharacters, custom] }; // 버전 3 상태 생성
        restoreLegacyConversationFields(legacy as unknown as Record<string, unknown>); // 이전 대화 구조 복원
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(12); // 새 버전 확인
        expect(result.state.characters.find((character) => character.id === "rank-050")?.coverImage).toBe("/images/characters/rank-050.webp"); // 이미지 갱신 확인
        expect(result.state.characters.find((character) => character.id === "custom-local")?.coverImage).toBe("/custom.webp"); // 사용자 이미지 유지 확인
    }); // 검증 종료

    it("스키마 4 대화에 보관 시각을 추가한다", () => // 스키마 변환 검증
    { // 테스트 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 4; // 이전 버전 적용
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
        conversations.forEach((conversation) => delete conversation.archivedAt); // 새 필드 제거
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.state.schemaVersion).toBe(12); // 새 버전 확인
        expect(result.state.conversations.every((conversation) => conversation.archivedAt === null)).toBe(true); // 기본값 확인
    }); // 테스트 종료

    it("스키마 5 데이터를 유지하며 최신 기본값을 추가한다", () => // 연속 변환 검증
    { // 테스트 시작
        const current = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 현재 상태 복사
        restoreLegacyConversationFields(current); // 이전 대화 구조 복원
        current.schemaVersion = 5; // 이전 버전 적용
        delete current.memories; // 기억 필드 제거
        delete current.likedCharacterIds; // 좋아요 필드 제거
        delete current.followedCreatorIds; // 팔로우 필드 제거
        delete current.localReports; // 신고 필드 제거
        const conversations = current.conversations as Array<Record<string, unknown>>; // 이전 대화 접근
        conversations.forEach((conversation) => delete conversation.startSettings); // 시작 설정 제거
        const characters = structuredClone(current.characters); // 캐릭터 기준값 보존
        const messages = structuredClone(current.messages); // 메시지 기준값 보존
        const wallet = current.wallet as Record<string, unknown>; // 지갑 접근
        wallet.balance = 777; // 사용자 잔액 적용
        localStorage.setItem(stateKey, JSON.stringify(current)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(12); // 새 버전 확인
        expect(result.state.characters).toEqual(characters); // 캐릭터 유지 확인
        expect(result.state.messages.map((message) => message.content)).toEqual((messages as Array<Record<string, unknown>>).map((message) => message.content)); // 메시지 내용 유지 확인
        expect(result.state.messages.every((message) => message.versionId.length > 0)).toBe(true); // 메시지 버전 연결 확인
        expect(result.state.wallet.balance).toBe(777); // 지갑 유지 확인
        expect(result.state.conversations).toHaveLength(conversations.length); // 대화 수 유지 확인
        expect(result.state.conversations[0]?.startSettings).toEqual( // 시작 설정 확인
        { // 기대값 시작
            profileId: "user-demo", // 사용자 프로필 확인
            presetId: "legacy-default", // 이전 프리셋 확인
            relationshipStage: "아는 사이", // 관계 단계 확인
            relationshipLevel: 34, // 관계 수치 확인
            emotion: "기대", // 감정 확인
            scene: "/images/scenes/dawn-letter.svg", // 장면 확인
            greeting: "기다리고 있었어. 오늘은 어떤 기억을 이곳에 남길까?", // 첫 대사 확인
        }); // 기대값 종료
        expect(result.state.memories).toEqual([]); // 기억 기본값 확인
        expect(result.state.likedCharacterIds).toEqual([]); // 좋아요 기본값 확인
        expect(result.state.followedCreatorIds).toEqual([]); // 팔로우 기본값 확인
        expect(result.state.localReports).toEqual([]); // 신고 기본값 확인
    }); // 테스트 종료

    it("스키마 6 대화마다 원본 버전과 연결 메시지를 만든다", () => // 스키마 7 변환 검증
    { // 테스트 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 6; // 이전 버전 적용
        delete legacy.conversationVersions; // 버전 목록 제거
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
        conversations.forEach((conversation) => delete conversation.currentVersionId); // 현재 버전 제거
        const messages = legacy.messages as Array<Record<string, unknown>>; // 메시지 목록 접근
        messages.forEach((message) => // 메시지 순회
        { // 순회 시작
            delete message.versionId; // 버전 연결 제거
            delete message.sourceMessageId; // 원본 연결 제거
        }); // 순회 종료
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(12); // 버전 확인
        expect(result.state.conversationVersions).toHaveLength(result.state.conversations.length); // 원본 버전 확인
        expect(result.state.messages.every((message) => message.versionId.length > 0)).toBe(true); // 메시지 연결 확인
        expect(result.state.messages.every((message) => message.sourceMessageId === null)).toBe(true); // 원본 메시지 확인
    }); // 테스트 종료

    it("메시지가 없는 스키마 6 대화를 손상 원본으로 보존한다", () => // 메시지 누락 검증
    { // 테스트 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 6; // 이전 버전 적용
        delete legacy.conversationVersions; // 버전 목록 제거
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
        conversations.forEach((conversation) => delete conversation.currentVersionId); // 현재 버전 제거
        const missingConversationId = String(conversations[0]?.id); // 누락 대상 확인
        legacy.messages = (legacy.messages as Array<Record<string, unknown>>).filter((message) => message.conversationId !== missingConversationId); // 연결 메시지 제거
        const raw = JSON.stringify(legacy); // 원본 직렬화
        localStorage.setItem(stateKey, raw); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(true); // 복구 상태 확인
        expect(localStorage.getItem(backupKey)).toBe(raw); // 원본 백업 확인
        expect(localStorage.getItem(stateKey)).toBe(raw); // 원본 상태 유지 확인
    }); // 테스트 종료

    it("캐릭터가 없는 스키마 6 대화를 손상 원본으로 보존한다", () => // 캐릭터 누락 검증
    { // 테스트 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 6; // 이전 버전 적용
        delete legacy.conversationVersions; // 버전 목록 제거
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
        conversations.forEach((conversation) => delete conversation.currentVersionId); // 현재 버전 제거
        const missingCharacterId = String(conversations[0]?.characterId); // 누락 대상 확인
        legacy.characters = (legacy.characters as Array<Record<string, unknown>>).filter((character) => character.id !== missingCharacterId); // 연결 캐릭터 제거
        const raw = JSON.stringify(legacy); // 원본 직렬화
        localStorage.setItem(stateKey, raw); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(true); // 복구 상태 확인
        expect(localStorage.getItem(backupKey)).toBe(raw); // 원본 백업 확인
    }); // 테스트 종료

    it("손상된 스키마 5 원본을 백업하고 안전한 최신 상태로 복구한다", () => // 손상 이전 검증
    { // 테스트 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 5; // 이전 버전 적용
        delete legacy.memories; // 기억 필드 제거
        delete legacy.likedCharacterIds; // 좋아요 필드 제거
        delete legacy.followedCreatorIds; // 팔로우 필드 제거
        delete legacy.localReports; // 신고 필드 제거
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 이전 대화 접근
        conversations.forEach((conversation) => delete conversation.startSettings); // 시작 설정 제거
        conversations[0].relationshipLevel = "손상"; // 손상 필드 적용
        const raw = JSON.stringify(legacy); // 원본 직렬화
        localStorage.setItem(stateKey, raw); // 손상 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(true); // 복구 상태 확인
        expect(result.state.schemaVersion).toBe(12); // 안전 버전 확인
        expect(localStorage.getItem(backupKey)).toBe(raw); // 원본 백업 확인
    }); // 테스트 종료

    it("버전 0 설정이 잘못된 구조면 원본을 백업하고 복구한다", () => // 잘못된 마이그레이션 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 생성
        legacy.schemaVersion = 0; // 이전 버전 적용
        delete legacy.providerMode; // 공급자 필드 제거
        legacy.settings = ["잘못된 설정"]; // 잘못된 설정 적용
        const raw = JSON.stringify(legacy); // 원본 직렬화
        localStorage.setItem(stateKey, raw); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 이전 상태 읽기
        expect(result.recovered).toBe(true); // 손상 복구 확인
        expect(localStorage.getItem(backupKey)).toBe(raw); // 손상 원본 확인
        expect(result.state.settings.platformMode).toBe("auto"); // 안전 설정 확인
    }); // 검증 종료

    it("연속 손상 복구에서도 첫 백업과 새 원본을 모두 보존한다", () => // 연속 복구 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        localStorage.setItem(stateKey, "{first-broken"); // 첫 손상 저장
        gateway.load(); // 첫 복구 실행
        localStorage.setItem(stateKey, "{second-broken"); // 둘째 손상 저장
        gateway.load(); // 둘째 복구 실행
        const exported = JSON.parse(gateway.exportBackupJson() ?? "null") as { backups: string[] }; // 백업 내보내기
        expect(localStorage.getItem(backupKey)).toBe("{first-broken"); // 첫 백업 유지 확인
        expect(exported.backups).toEqual(["{first-broken", "{second-broken"]); // 전체 백업 확인
    }); // 검증 종료

    it("백업 내보내기는 현재 손상 상태를 변경하지 않는다", () => // 읽기 전용 내보내기 검증
    { // 검증 시작
        localStorage.setItem(stateKey, "{unprocessed-broken"); // 미처리 손상 저장
        localStorage.setItem(backupKey, "{saved-broken"); // 기존 백업 저장
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        const exported = JSON.parse(gateway.exportBackupJson() ?? "null") as { backups: string[] }; // 백업 내보내기
        expect(exported.backups).toEqual(["{saved-broken"]); // 백업 내용 확인
        expect(localStorage.getItem(stateKey)).toBe("{unprocessed-broken"); // 현재 상태 유지 확인
    }); // 검증 종료

    it("잘못된 가져오기 데이터는 현재 상태를 변경하지 않는다", () => // 비파괴 가져오기 검증
    { // 테스트 시작
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        const state = createInitialState(); // 초기 상태 생성
        state.profile.nickname = "보존 이름"; // 사용자 값 변경
        gateway.save(state); // 현재 상태 저장
        expect(() => gateway.prepareImport("{잘못된 JSON")).toThrow(ImportValidationError); // 잘못된 파일 거부
        expect(gateway.load().state.profile.nickname).toBe("보존 이름"); // 현재 상태 유지
    }); // 테스트 종료

    it("미래 스키마 가져오기는 현재 상태를 변경하지 않는다", () => // 미래 버전 검증
    { // 테스트 시작
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        const state = createInitialState(); // 초기 상태 생성
        state.profile.nickname = "현재 사용자"; // 사용자 값 변경
        gateway.save(state); // 현재 상태 저장
        const future = { ...state, schemaVersion: 99 }; // 미래 상태 생성
        expect(() => gateway.prepareImport(JSON.stringify(future))).toThrow("지원하지 않는 데이터 버전"); // 미래 버전 거부
        expect(gateway.load().state.profile.nickname).toBe("현재 사용자"); // 현재 상태 유지
    }); // 테스트 종료

    it("백업은 최근 세 개만 유지한다", () => // 백업 순환 검증
    { // 테스트 시작
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        gateway.save(createInitialState()); // 초기 상태 저장
        gateway.createBackup("manual", "2026-09-24T01:00:00.000Z"); // 첫 백업 생성
        gateway.createBackup("manual", "2026-09-24T02:00:00.000Z"); // 둘째 백업 생성
        gateway.createBackup("manual", "2026-09-24T03:00:00.000Z"); // 셋째 백업 생성
        gateway.createBackup("manual", "2026-09-24T04:00:00.000Z"); // 넷째 백업 생성
        expect(gateway.listBackups()).toHaveLength(3); // 최대 개수 확인
        expect(gateway.listBackups()[0]?.createdAt).toBe("2026-09-24T04:00:00.000Z"); // 최신 순서 확인
    }); // 테스트 종료

    it("전달한 현재 상태를 메시지 삭제 사유로 먼저 백업한다", () => // 상태 백업 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        const state = createInitialState(); // 백업 상태 생성
        state.wallet.balance = 913; // 식별 잔액 적용
        const snapshot = gateway.createBackupFromState(state, "message-delete", "2026-09-29T14:00:00.000Z"); // 상태 백업 생성
        expect(snapshot.reason).toBe("message-delete"); // 백업 사유 확인
        expect(localStorage.getItem(backupKey)).toBe(JSON.stringify(state)); // 백업 원본 확인
    }); // 검증 종료

    it("백업이 세 개여도 마이그레이션 실패 원본을 보존한다", () => // 실패 원본 보존 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        gateway.createBackupFromState(createInitialState(), "manual", "2026-09-29T01:00:00.000Z"); // 첫 백업 생성
        gateway.createBackupFromState(createInitialState(), "manual", "2026-09-29T02:00:00.000Z"); // 둘째 백업 생성
        gateway.createBackupFromState(createInitialState(), "manual", "2026-09-29T03:00:00.000Z"); // 셋째 백업 생성
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        restoreLegacyConversationFields(legacy); // 이전 대화 구조 복원
        legacy.schemaVersion = 6; // 이전 버전 적용
        delete legacy.conversationVersions; // 버전 목록 제거
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
        conversations.forEach((conversation) => delete conversation.currentVersionId); // 현재 버전 제거
        legacy.messages = []; // 연결 메시지 제거
        const raw = JSON.stringify(legacy); // 실패 원본 직렬화
        localStorage.setItem(stateKey, raw); // 실패 원본 저장
        gateway.load(); // 마이그레이션 시도
        expect(localStorage.getItem(stateKey)).toBe(raw); // 원본 상태 유지 확인
        const exported = JSON.parse(gateway.exportBackupJson() ?? "null") as { backups: string[] }; // 백업 원본 분석
        expect(exported.backups).toContain(raw); // 복구 백업 확인
    }); // 검증 종료

    it("전체 데이터 가져오기에서 순환과 고아 버전 그래프를 거부한다", () => // 전체 그래프 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 분기 기준 조회
        const fork = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "가져오기 분기", assistantMessage: { id: "assistant-import", role: "assistant", content: "가져오기 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "가져오기 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 유효 분기 생성
        const cyclic = structuredClone(fork.state); // 순환 상태 복사
        const cyclicVersion = cyclic.conversationVersions.find((version) => version.id === fork.version.id)!; // 순환 버전 조회
        cyclicVersion.parentVersionId = cyclicVersion.id; // 자기 부모 적용
        expect(() => gateway.prepareImport(JSON.stringify(cyclic))).toThrow(ImportValidationError); // 순환 버전 거부 확인
        const orphaned = structuredClone(fork.state); // 고아 상태 복사
        const orphanedVersion = orphaned.conversationVersions.find((version) => version.id === fork.version.id)!; // 고아 버전 조회
        orphanedVersion.parentVersionId = "missing-parent"; // 누락 부모 적용
        expect(() => gateway.prepareImport(JSON.stringify(orphaned))).toThrow(ImportValidationError); // 고아 버전 거부 확인
    }); // 검증 종료

    it("저장공간 오류를 명시적인 쓰기 오류로 변환한다", () => // 저장 실패 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(new FailingStorage()); // 실패 게이트웨이 생성
        expect(() => gateway.save(createInitialState())).toThrowError(StorageWriteError); // 오류 종류 확인
        expect(() => gateway.save(createInitialState())).toThrowError("브라우저 저장공간"); // 오류 안내 확인
    }); // 검증 종료

    it("현재 상태를 JSON으로 내보내고 백업한 뒤 초기 상태로 재설정한다", () => // 내보내기 초기화 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        const state = createInitialState(); // 상태 생성
        state.wallet.balance = 55; // 잔액 변경
        gateway.save(state); // 상태 저장
        const exported = JSON.parse(gateway.exportJson()) as AppState; // JSON 내보내기
        const resetState = gateway.reset(); // 상태 초기화
        expect(exported.wallet.balance).toBe(55); // 내보낸 잔액 확인
        expect(resetState.wallet.balance).toBe(1240); // 초기 잔액 확인
        expect(gateway.load().state.wallet.balance).toBe(1240); // 저장 초기화 확인
        expect(gateway.listBackups()).toHaveLength(1); // 초기화 백업 확인
        expect(gateway.listBackups()[0]?.reason).toBe("reset"); // 백업 사유 확인
    }); // 검증 종료

    it("초기 상태 저장에 실패하면 기존 백업을 보존한다", () => // 초기화 실패 안전성 검증
    { // 검증 시작
        const storage = new ResetFailingStorage(); // 실패 저장소 생성
        const gateway = new LocalStorageGateway(storage); // 게이트웨이 생성
        expect(() => gateway.reset()).toThrowError(StorageWriteError); // 초기화 실패 확인
        expect(storage.getItem(backupKey)).toBe("보존할 백업"); // 기존 백업 유지 확인
    }); // 검증 종료
}); // 묶음 종료

describe("로컬 Repository 공급자", () => // 공급자 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        localStorage.clear(); // 저장 데이터 제거
    }); // 초기화 종료

    it("캐릭터 조회·저장·삭제를 공유 상태에 반영한다", () => // 캐릭터 저장소 검증
    { // 검증 시작
        const provider = createLocalRepositoryProvider(localStorage); // 공급자 생성
        const source = provider.characters.list()[0]; // 기준 캐릭터 조회
        const custom: Character = { ...source, id: "custom", name: "밤 기차의 루미" }; // 새 캐릭터 생성
        provider.characters.save(custom); // 캐릭터 저장
        expect(provider.characters.findById("custom")?.name).toBe("밤 기차의 루미"); // 단일 조회 확인
        expect(provider.characters.list()).toHaveLength(101); // 목록 추가 확인
        provider.characters.remove("custom"); // 캐릭터 삭제
        expect(provider.characters.findById("custom")).toBeNull(); // 삭제 확인
    }); // 검증 종료

    it("대화방과 메시지 조회·저장·삭제를 공유 상태에 반영한다", () => // 대화 저장소 검증
    { // 검증 시작
        const provider = createLocalRepositoryProvider(localStorage); // 공급자 생성
        const conversation = { ...provider.conversations.list()[0], title: "수정한 대화 제목" }; // 기존 대화 수정
        const message: Message = { id: "message-custom", conversationId: conversation.id, versionId: conversation.currentVersionId, sourceMessageId: null, role: "user", content: "안녕", emotion: null, sceneEvent: null, createdAt: "2026-09-22T10:00:00.000Z" }; // 새 메시지 생성
        provider.conversations.saveConversation(conversation); // 대화 저장
        provider.conversations.saveMessage(message); // 메시지 저장
        expect(provider.conversations.findById(conversation.id)?.title).toBe("수정한 대화 제목"); // 대화 조회 확인
        expect(provider.conversations.listMessages(conversation.id)).toContainEqual(message); // 메시지 조회 확인
        provider.conversations.remove(conversation.id); // 대화 삭제
        expect(provider.conversations.findById(conversation.id)).toBeNull(); // 대화 삭제 확인
        expect(provider.conversations.listMessages(conversation.id)).toEqual([]); // 메시지 연쇄 삭제 확인
    }); // 검증 종료

    it("설정과 토큰을 같은 게이트웨이에 저장한다", () => // 설정 지갑 검증
    { // 검증 시작
        const provider = createLocalRepositoryProvider(localStorage); // 공급자 생성
        const settings = provider.settings.get(); // 설정 조회
        const wallet = provider.tokens.get(); // 지갑 조회
        provider.settings.save({ ...settings, platformMode: "tablet" }); // 설정 저장
        provider.tokens.save({ ...wallet, balance: 900 }); // 지갑 저장
        expect(provider.settings.get().platformMode).toBe("tablet"); // 설정 유지 확인
        expect(provider.tokens.get().balance).toBe(900); // 지갑 유지 확인
        expect(provider.gateway.load().state.settings.platformMode).toBe("tablet"); // 공유 설정 확인
        expect(provider.gateway.load().state.wallet.balance).toBe(900); // 공유 지갑 확인
    }); // 검증 종료
}); // 묶음 종료

describe("스키마 8 성인 인증 변환", () => // 스키마 8 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        localStorage.clear(); // 저장소 비우기
    }); // 초기화 종료

    it("스키마 7 데이터에 이용 등급과 인증 전 상태를 추가한다", () => // 버전 7 변환 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        legacy.schemaVersion = 7; // 이전 버전 적용
        delete legacy.pinnedConversationIds; // 고정 목록 제거
        delete (legacy.settings as Record<string, unknown>).conversationSort; // 정렬 설정 제거
        delete (legacy.profile as Record<string, unknown>).adultVerification; // 인증 필드 제거
        delete (legacy.settings as Record<string, unknown>).matureContentEnabled; // 19+ 설정 제거
        const characters = legacy.characters as Array<Record<string, unknown>>; // 캐릭터 목록 접근
        characters.forEach((character) => delete character.contentRating); // 등급 제거
        characters.push({ ...characters[0], id: "character-custom", creatorId: "user-demo", name: "내 캐릭터" }); // 사용자 캐릭터 추가
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.warning).toContain("업데이트"); // 변환 안내 확인
        expect(result.state.schemaVersion).toBe(12); // 버전 확인
        expect(result.state.profile.adultVerification).toBeNull(); // 인증 전 확인
        expect(result.state.settings.matureContentEnabled).toBe(false); // 19+ 꺼짐 확인
        const rating = (id: string) => result.state.characters.find((character) => character.id === id)?.contentRating; // 등급 조회
        expect(rating("rank-017")).toBe("mature"); // 19세 예시 등급
        expect(rating("sera")).toBe("teen"); // 15세 기본 등급
        expect(rating("rian")).toBe("all"); // 전체 기본 등급
        expect(rating("character-custom")).toBe("all"); // 사용자 캐릭터 기본 등급
    }); // 검증 종료

    it("잘못된 이용 등급이나 인증 정보는 저장하지 않는다", () => // 잘못된 값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const badRating = { ...state, characters: state.characters.map((character, index) => index === 0 ? { ...character, contentRating: "adult" } : character) } as unknown as AppState; // 잘못된 등급
        const badVerification = { ...state, profile: { ...state.profile, adultVerification: { method: "pass", verifiedAt: "x", expiresAt: "y" } } } as unknown as AppState; // 잘못된 인증
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        expect(() => gateway.save(badRating)).toThrow(TypeError); // 등급 거부 확인
        expect(() => gateway.save(badVerification)).toThrow(TypeError); // 인증 거부 확인
        expect(() => gateway.prepareImport(JSON.stringify({ ...state, schemaVersion: 13 }))).toThrow(ImportValidationError); // 미래 버전 거부 확인
    }); // 검증 종료
}); // 묶음 종료

describe("스키마 9 대화방 고정과 정렬", () => // 스키마 9 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        localStorage.clear(); // 저장소 비우기
    }); // 초기화 종료

    it("스키마 8 데이터에 빈 고정 목록과 최근순 정렬을 추가한다", () => // 버전 8 변환 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        legacy.schemaVersion = 8; // 이전 버전 적용
        delete legacy.pinnedConversationIds; // 고정 목록 제거
        delete (legacy.settings as Record<string, unknown>).conversationSort; // 정렬 설정 제거
        (legacy.profile as Record<string, unknown>).nickname = "버전 8 사용자"; // 사용자 값 지정
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.warning).toContain("업데이트"); // 변환 안내 확인
        expect(result.state.schemaVersion).toBe(12); // 버전 확인
        expect(result.state.pinnedConversationIds).toEqual([]); // 고정 목록 확인
        expect(result.state.settings.conversationSort).toBe("recent"); // 정렬 확인
        expect(result.state.profile.nickname).toBe("버전 8 사용자"); // 사용자 값 유지
        expect(JSON.parse(localStorage.getItem(stateKey) ?? "{}").schemaVersion).toBe(12); // 변환 저장 확인
    }); // 검증 종료

    it("스키마 8 JSON 파일도 가져올 수 있다", () => // 버전 8 가져오기 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        legacy.schemaVersion = 8; // 이전 버전 적용
        delete legacy.pinnedConversationIds; // 고정 목록 제거
        delete (legacy.settings as Record<string, unknown>).conversationSort; // 정렬 설정 제거
        const prepared = new LocalStorageGateway(localStorage).prepareImport(JSON.stringify(legacy)); // 가져오기 준비
        expect(prepared.summary.schemaVersion).toBe(12); // 변환 버전 확인
    }); // 검증 종료

    it("잘못된 고정 목록이나 정렬 값은 저장하지 않는다", () => // 잘못된 값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const badPins = { ...state, pinnedConversationIds: [1] } as unknown as AppState; // 잘못된 고정 목록
        const badSort = { ...state, settings: { ...state.settings, conversationSort: "random" } } as unknown as AppState; // 잘못된 정렬
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        expect(() => gateway.save(badPins)).toThrow(TypeError); // 고정 거부 확인
        expect(() => gateway.save(badSort)).toThrow(TypeError); // 정렬 거부 확인
    }); // 검증 종료

    it("대화 삭제 전 백업을 대화 삭제 사유로 남긴다", () => // 대화 삭제 백업 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        gateway.save(createInitialState()); // 초기 상태 저장
        const snapshot = gateway.createBackupFromState(createInitialState(), "conversation-delete", "2026-10-01T00:00:00.000Z"); // 백업 생성
        expect(snapshot.reason).toBe("conversation-delete"); // 백업 사유 확인
        expect(gateway.listBackups()[0]?.reason).toBe("conversation-delete"); // 저장 사유 확인
    }); // 검증 종료
}); // 묶음 종료

describe("스키마 10 스토리 모드", () => // 스키마 10 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        localStorage.clear(); // 저장소 비우기
    }); // 초기화 종료

    function createVersionNine(): Record<string, unknown> // 버전 9 상태 생성
    { // 함수 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 현재 상태 복사
        legacy.schemaVersion = 9; // 이전 버전 적용
        delete legacy.stories; // 스토리 목록 제거
        delete legacy.images; // 이미지 목록 제거
        (legacy.conversations as Array<Record<string, unknown>>).forEach((conversation) => // 대화 순회
        { // 순회 시작
            delete conversation.mode; // 대화 종류 제거
            delete conversation.storyId; // 스토리 연결 제거
            delete conversation.storyCast; // 등장인물 묶음 제거
        }); // 순회 종료
        return legacy; // 버전 9 상태 반환
    } // 함수 종료

    it("스키마 9 데이터의 대화를 캐릭터 모드로 두고 예시 스토리를 추가한다", () => // 버전 9 변환 검증
    { // 검증 시작
        const legacy = createVersionNine(); // 버전 9 상태
        (legacy.profile as Record<string, unknown>).nickname = "버전 9 사용자"; // 사용자 값 지정
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(12); // 버전 확인
        expect(result.state.conversations.every((conversation) => conversation.mode === "character" && conversation.storyId === null && conversation.storyCast.length === 0)).toBe(true); // 캐릭터 모드 확인
        expect(result.state.stories.map((story) => story.id)).toEqual(mockStories.map((story) => story.id)); // 예시 스토리 확인
        expect(result.state.profile.nickname).toBe("버전 9 사용자"); // 사용자 값 유지
    }); // 검증 종료

    it("스키마 9 JSON 파일도 가져올 수 있다", () => // 버전 9 가져오기 검증
    { // 검증 시작
        const prepared = new LocalStorageGateway(localStorage).prepareImport(JSON.stringify(createVersionNine())); // 가져오기 준비
        expect(prepared.summary.schemaVersion).toBe(12); // 변환 버전 확인
    }); // 검증 종료

    it("잘못된 대화 종류·스토리·등장인물은 저장하지 않는다", () => // 잘못된 값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        const badMode = { ...state, conversations: state.conversations.map((conversation, index) => index === 0 ? { ...conversation, mode: "group" } : conversation) } as unknown as AppState; // 잘못된 대화 종류
        const emptyCast = { ...state, stories: state.stories.map((story, index) => index === 0 ? { ...story, cast: [] } : story) } as unknown as AppState; // 등장인물 없는 스토리
        const orphanStory = { ...state, conversations: state.conversations.map((conversation, index) => index === 0 ? { ...conversation, mode: "story", storyId: "없는-스토리", storyCast: state.stories[0].cast } : conversation) } as unknown as AppState; // 없는 스토리 연결
        expect(() => gateway.save(badMode)).toThrow(TypeError); // 대화 종류 거부 확인
        expect(() => gateway.save(emptyCast)).toThrow(TypeError); // 빈 등장인물 거부 확인
        expect(() => gateway.save(orphanStory)).toThrow(TypeError); // 없는 스토리 거부 확인
    }); // 검증 종료

    it("버전 10 데이터에 빠진 기본 예시 스토리는 불러올 때 채우고 저장한다", () => // 기본 스토리 보충 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const mine = { ...state.stories[1], id: "story-mine", creatorId: state.profile.id, title: "내 스토리" }; // 내가 만든 스토리
        state.stories = [...state.stories.slice(0, 3), mine]; // 예전 기본 스토리 3개만 가진 데이터
        localStorage.setItem(stateKey, JSON.stringify(state)); // 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        const ids = result.state.stories.map((story) => story.id); // 스토리 목록
        expect(ids).toEqual([...mockStories.slice(0, 3).map((story) => story.id), "story-mine", ...mockStories.slice(3).map((story) => story.id)]); // 기존 순서 유지 후 보충
        expect(result.warning).toBeNull(); // 안내 없이 보충
        expect((JSON.parse(localStorage.getItem(stateKey) ?? "{}") as AppState).stories).toHaveLength(mockStories.length + 1); // 보충 결과 저장
    }); // 검증 종료

    it("등장인물 캐릭터가 없는 기본 스토리는 채우지 않고 이미 다 있으면 저장하지 않는다", () => // 보충 예외 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.characters = state.characters.filter((character) => character.id !== "rank-028"); // 오스카 삭제
        state.stories = state.stories.filter((story) => story.id !== "story-monster-hotel"); // 오스카 스토리 없음
        localStorage.setItem(stateKey, JSON.stringify(state)); // 저장
        const raw = localStorage.getItem(stateKey); // 저장 원본
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.state.stories.some((story) => story.id === "story-monster-hotel")).toBe(false); // 보충 제외 확인
        expect(localStorage.getItem(stateKey)).toBe(raw); // 다시 저장하지 않음 확인
    }); // 검증 종료

    it("스키마 10 데이터는 빈 이미지 갤러리를 더해 11로 올린다", () => // 버전 10 변환 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 현재 상태 복사
        legacy.schemaVersion = 10; // 이전 버전 적용
        delete legacy.images; // 이미지 목록 제거
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.state.schemaVersion).toBe(12); // 버전 확인
        expect(result.state.images).toEqual([]); // 빈 갤러리 확인
        expect(result.warning).toBe("저장 데이터를 최신 버전으로 업데이트했습니다."); // 안내 확인
    }); // 검증 종료

    it("잘못된 생성 이미지(형식·등급과 가림 처리 불일치·중복)는 저장하지 않는다", () => // 이미지 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const image = createGeneratedImage({ prompt: "달빛 정원", style: "anime", aspect: "square", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-01T00:00:00.000Z", "image-1"); // 정상 이미지
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        expect(() => gateway.save({ ...state, images: [image] })).not.toThrow(); // 정상 저장
        expect(() => gateway.save({ ...state, images: [{ ...image, src: "https://example.com/a.png" }] })).toThrow(TypeError); // 외부 주소 거부
        expect(() => gateway.save({ ...state, images: [{ ...image, contentRating: "mature" }] })).toThrow(TypeError); // 19세인데 가림 처리 없음 거부
        expect(() => gateway.save({ ...state, images: [image, image] })).toThrow(TypeError); // 중복 거부
    }); // 검증 종료

    it("스키마 11 데이터는 대화 설정·작품 추가 필드·기본 대화 프로필·새 설정을 더해 12로 올리고 이전 기억 분류를 바꾼다", () => // 버전 11 변환 검증
    { // 검증 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 현재 상태 복사
        legacy.schemaVersion = 11; // 이전 버전
        delete legacy.personas; // 프로필 제거
        delete legacy.conversationFolders; // 폴더 제거
        delete legacy.notifications; // 알림 제거
        for (const key of ["conversationFilter", "chatFont", "chatFontSize", "chatTheme", "showSceneImages", "statusPanelOpen"]) // 새 설정 제거
        { // 순회 시작
            delete (legacy.settings as Record<string, unknown>)[key]; // 설정 제거
        } // 순회 종료
        (legacy.conversations as Array<Record<string, unknown>>).forEach((conversation) => { delete conversation.settings; delete conversation.folderId; }); // 대화 설정 제거
        const characters = legacy.characters as Array<Record<string, unknown>>; // 캐릭터
        characters.push({ ...characters[0], id: "user-made", name: "내 캐릭터", creatorId: "user-demo" }); // 사용자 캐릭터
        characters.forEach((character) => { delete character.playGuide; delete character.statusTemplate; delete character.updates; }); // 추가 필드 제거
        (legacy.stories as Array<Record<string, unknown>>).forEach((story) => { delete story.playGuide; delete story.statusTemplate; delete story.updates; }); // 스토리 필드 제거
        legacy.memories = [{ id: "m1", characterId: "rian", conversationId: "conversation-rian", category: "summary", content: "예전 요약", sourceMessageIds: [], editedByUser: false, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" }]; // 이전 분류 기억
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.state.schemaVersion).toBe(12); // 버전
        expect(result.state.conversations.every((conversation) => conversation.settings.tier === "basic" && conversation.folderId === null)).toBe(true); // 대화 기본 설정
        expect(result.state.characters.find((character) => character.id === "rian")!.playGuide).toContain("[플레이 가이드]"); // 기본 캐릭터 가이드
        expect(result.state.characters.find((character) => character.id === "user-made")!.playGuide).toBe(""); // 사용자 캐릭터 빈 가이드
        expect(result.state.memories[0].category).toBe("long"); // 분류 대응
        expect(result.state.personas[0].name).toBe(result.state.profile.nickname); // 기본 프로필
        expect(result.state.settings).toMatchObject({ chatFont: "default", chatTheme: "light", showSceneImages: true }); // 새 설정
    }); // 검증 종료

    it("잘못된 대화 설정·상태창·없는 폴더 연결은 저장하지 않는다", () => // 버전 12 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이
        const badTier = { ...state, conversations: state.conversations.map((conversation, index) => index === 0 ? { ...conversation, settings: { ...conversation.settings, tier: "ultra" } } : conversation) } as unknown as AppState; // 없는 등급
        const badStatus = { ...state, messages: state.messages.map((message, index) => index === 0 ? { ...message, status: { turn: "1" } } : message) } as unknown as AppState; // 잘못된 상태창
        const orphanFolder = { ...state, conversations: state.conversations.map((conversation, index) => index === 0 ? { ...conversation, folderId: "없는-폴더" } : conversation) } as unknown as AppState; // 없는 폴더
        const noPersona = { ...state, personas: [] } as unknown as AppState; // 프로필 없음
        for (const bad of [badTier, badStatus, orphanFolder, noPersona]) // 순회
        { // 순회 시작
            expect(() => gateway.save(bad)).toThrow(TypeError); // 거부
        } // 순회 종료
    }); // 검증 종료

    it("스토리 삭제 전 백업을 스토리 삭제 사유로 남긴다", () => // 스토리 삭제 백업 검증
    { // 검증 시작
        const gateway = new LocalStorageGateway(localStorage); // 게이트웨이 생성
        gateway.save(createInitialState()); // 초기 상태 저장
        const snapshot = gateway.createBackupFromState(createInitialState(), "story-delete", "2026-10-01T00:00:00.000Z"); // 백업 생성
        expect(snapshot.reason).toBe("story-delete"); // 백업 사유 확인
    }); // 검증 종료
}); // 묶음 종료
