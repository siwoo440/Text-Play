import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 함수
import type { AppState, Character, Message } from "@/features/core/types"; // 도메인 타입
import { ImportValidationError, LocalStorageGateway, StorageWriteError } from "@/lib/repositories/local-storage-gateway"; // 저장소 대상
import { createLocalRepositoryProvider } from "@/lib/repositories/repository-provider"; // 저장소 공급자

const stateKey = "mateverse:v1:state"; // 상태 저장 키
const backupKey = "mateverse:v1:backup"; // 백업 저장 키

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
        expect(result.state.schemaVersion).toBe(5); // 초기 상태 확인
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
        legacy.schemaVersion = 0; // 이전 버전 적용
        delete legacy.providerMode; // 공급자 필드 제거
        legacy.settings = { leftPanelOpen: false, rightPanelOpen: true }; // 이전 설정 적용
        const legacyWallet = legacy.wallet as Record<string, unknown>; // 이전 지갑 접근
        legacyWallet.balance = 321; // 이전 잔액 적용
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 이전 상태 읽기
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.warning).toContain("업데이트"); // 변환 안내 확인
        expect(result.state.schemaVersion).toBe(5); // 현재 버전 확인
        expect(result.state.providerMode).toBe("mock"); // 공급자 기본값 확인
        expect(result.state.wallet.balance).toBe(321); // 사용자 잔액 유지 확인
        expect(result.state.settings.leftPanelOpen).toBe(false); // 이전 설정 유지 확인
        expect(result.state.settings.notificationStartTime).toBe("09:00"); // 새 설정 기본값 확인
    }); // 검증 종료

    it("버전 1 상태를 버전 2로 변환하고 기존 데이터를 유지한다", () => // 마이그레이션 검증
    { // 검증 시작
        const legacy = createInitialState() as unknown as Record<string, unknown>; // 기준 상태 준비
        legacy.schemaVersion = 1; // 이전 버전 적용
        delete legacy.bookmarkedCharacterIds; // 새 필드 제거
        const characters = legacy.characters as Array<Record<string, unknown>>; // 캐릭터 접근
        characters.forEach((character) => delete character.publicationStatus); // 상태 필드 제거
        const wallet = legacy.wallet as Record<string, unknown>; // 지갑 접근
        wallet.balance = 321; // 사용자 잔액 적용
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(5); // 새 버전 확인
        expect(result.state.wallet.balance).toBe(321); // 기존 데이터 확인
        expect(result.state.characters.every((character) => character.publicationStatus === "published")).toBe(true); // 공개 상태 확인
        expect(result.state.bookmarkedCharacterIds).toEqual([]); // 보관 목록 확인
    }); // 검증 종료

    it("버전 2 데이터에 누락된 랭킹 캐릭터를 추가하고 사용자 데이터를 유지한다", () => // 랭킹 마이그레이션 검증
    { // 검증 시작
        const current = createInitialState(); // 현재 상태 생성
        const custom: Character = { ...current.characters[0], id: "custom-local", name: "사용자 제작 캐릭터" }; // 사용자 캐릭터 생성
        const legacy = { ...current, schemaVersion: 2, characters: [...current.characters.slice(0, 7), custom] }; // 버전 2 상태 생성
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(5); // 새 버전 확인
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
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.recovered).toBe(false); // 정상 변환 확인
        expect(result.state.schemaVersion).toBe(5); // 새 버전 확인
        expect(result.state.characters.find((character) => character.id === "rank-050")?.coverImage).toBe("/images/characters/rank-050.webp"); // 이미지 갱신 확인
        expect(result.state.characters.find((character) => character.id === "custom-local")?.coverImage).toBe("/custom.webp"); // 사용자 이미지 유지 확인
    }); // 검증 종료

    it("스키마 4 대화에 보관 시각을 추가한다", () => // 스키마 변환 검증
    { // 테스트 시작
        const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
        legacy.schemaVersion = 4; // 이전 버전 적용
        const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
        conversations.forEach((conversation) => delete conversation.archivedAt); // 새 필드 제거
        localStorage.setItem(stateKey, JSON.stringify(legacy)); // 이전 상태 저장
        const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
        expect(result.state.schemaVersion).toBe(5); // 새 버전 확인
        expect(result.state.conversations.every((conversation) => conversation.archivedAt === null)).toBe(true); // 기본값 확인
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
        const conversation = { ...provider.conversations.list()[0], id: "conversation-custom", characterId: "harin" }; // 새 대화 생성
        const message: Message = { id: "message-custom", conversationId: conversation.id, role: "user", content: "안녕", emotion: null, sceneEvent: null, createdAt: "2026-09-22T10:00:00.000Z" }; // 새 메시지 생성
        provider.conversations.saveConversation(conversation); // 대화 저장
        provider.conversations.saveMessage(message); // 메시지 저장
        expect(provider.conversations.findById(conversation.id)?.characterId).toBe("harin"); // 대화 조회 확인
        expect(provider.conversations.listMessages(conversation.id)).toEqual([message]); // 메시지 조회 확인
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
