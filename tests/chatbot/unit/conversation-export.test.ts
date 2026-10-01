import { describe, expect, it } from "vitest"; // 테스트 도구
import { createConversationExport, mergeConversationExport, parseConversationExport } from "@chatbot/features/conversation/conversation-export"; // 대화 파일 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 생성

function addFork(exported: ReturnType<typeof createConversationExport>, suffix: number): void // 수정 버전 추가
{ // 함수 시작
    const root = exported.versions[0]; // 원본 버전 조회
    const source = exported.messages.find((message) => message.role === "user") ?? exported.messages[0]; // 분기 메시지 조회
    const versionId = `${exported.conversation.id}-import-test-${suffix}`; // 수정 버전 식별자
    exported.versions.push({ ...root, id: versionId, parentVersionId: root.id, forkRootVersionId: root.id, forkedFromMessageId: source.id, ordinal: suffix + 1 }); // 수정 버전 추가
    exported.messages.filter((message) => message.versionId === root.id).forEach((message, index) => // 원본 메시지 순회
    { // 순회 시작
        exported.messages.push({ ...message, id: `${versionId}-message-${index + 1}`, versionId, sourceMessageId: message.id }); // 수정 메시지 추가
    }); // 순회 종료
} // 함수 종료

describe("대화 내보내기와 가져오기", () => // 파일 묶음
{ // 묶음 시작
    it("대화의 모든 버전과 메시지를 내보내고 다시 가져온다", () => // 왕복 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 대상 대화 조회
        const exported = createConversationExport(state, conversation.id); // 대화 내보내기
        const parsed = parseConversationExport(JSON.stringify(exported)); // 대화 파일 해석
        const emptyState = { ...state, conversations: state.conversations.filter((item) => item.id !== conversation.id), conversationVersions: state.conversationVersions.filter((item) => item.conversationId !== conversation.id), messages: state.messages.filter((item) => item.conversationId !== conversation.id) }; // 대상 제거 상태
        const restored = mergeConversationExport(emptyState, parsed); // 대화 다시 가져오기
        expect(exported.schemaVersion).toBe(2); // 스키마 버전 확인
        expect(restored.conversations.find((item) => item.id === conversation.id)).toEqual(exported.conversation); // 대화 왕복 확인
        expect(restored.conversationVersions.filter((item) => item.conversationId === conversation.id)).toEqual(exported.versions); // 버전 왕복 확인
        expect(restored.messages.filter((item) => item.conversationId === conversation.id)).toEqual(exported.messages); // 메시지 왕복 확인
    }); // 검증 종료

    it("기존 식별자와 충돌하면 파일 전체를 새 대화 영역으로 다시 연결한다", () => // 충돌 재매핑 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const exported = createConversationExport(state, state.conversations[0].id); // 충돌 파일 생성
        const merged = mergeConversationExport(state, exported); // 충돌 파일 병합
        const imported = merged.conversations.at(-1)!; // 가져온 대화 조회
        const importedVersions = merged.conversationVersions.filter((version) => version.conversationId === imported.id); // 가져온 버전 조회
        const importedMessages = merged.messages.filter((message) => message.conversationId === imported.id); // 가져온 메시지 조회
        expect(imported.id).not.toBe(exported.conversation.id); // 대화 식별자 변경 확인
        expect(importedVersions.every((version) => version.conversationId === imported.id)).toBe(true); // 버전 연결 확인
        expect(importedMessages.every((message) => importedVersions.some((version) => version.id === message.versionId))).toBe(true); // 메시지 연결 확인
        expect(importedVersions.some((version) => version.id === imported.currentVersionId)).toBe(true); // 현재 버전 연결 확인
    }); // 검증 종료

    it.each( // 악성 파일 목록
    [ // 목록 시작
        ["순환 부모", (value: ReturnType<typeof createConversationExport>) => { value.versions[0].parentVersionId = value.versions[0].id; }], // 순환 부모 변조
        ["다른 대화 식별자", (value: ReturnType<typeof createConversationExport>) => { value.versions[0].conversationId = "other-conversation"; }], // 외부 대화 변조
        ["누락 부모", (value: ReturnType<typeof createConversationExport>) => { value.versions[0].parentVersionId = "missing-version"; }], // 누락 부모 변조
        ["누락 메시지", (value: ReturnType<typeof createConversationExport>) => { value.messages = []; }], // 누락 메시지 변조
        ["원본 버전 부재", (value: ReturnType<typeof createConversationExport>) => { value.versions[0].parentVersionId = "missing-version"; }], // 원본 부재 변조
        ["원본의 분기 정보", (value: ReturnType<typeof createConversationExport>) => { value.versions[0].forkRootVersionId = value.versions[0].id; value.versions[0].forkedFromMessageId = value.messages[0].id; }], // 원본 분기 변조
        ["수정 버전의 분기 정보 누락", (value: ReturnType<typeof createConversationExport>) => { addFork(value, 1); value.versions.at(-1)!.forkRootVersionId = null; value.versions.at(-1)!.forkedFromMessageId = null; }], // 수정 분기 누락
        ["조상이 아닌 분기 원본", (value: ReturnType<typeof createConversationExport>) => { addFork(value, 1); addFork(value, 2); value.versions.at(-1)!.forkRootVersionId = value.versions.at(-2)!.id; }], // 분기 조상 변조
        ["AI 응답 분기 기준", (value: ReturnType<typeof createConversationExport>) => { addFork(value, 1); value.versions.at(-1)!.forkedFromMessageId = value.messages.find((message) => message.role === "assistant")!.id; }], // AI 분기 변조
        ["부모에 없는 분기 기준", (value: ReturnType<typeof createConversationExport>) => { addFork(value, 1); addFork(value, 2); const parent = value.versions.at(-2)!; value.versions.at(-1)!.parentVersionId = parent.id; value.messages = value.messages.filter((message) => message.versionId !== parent.id || message.role !== "user"); }], // 부모 기준 제거
    ])("%s 파일을 거부한다", (_label, mutate) => // 악성 파일 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const exported = createConversationExport(state, state.conversations[0].id); // 정상 파일 생성
        mutate(exported); // 파일 변조
        expect(() => parseConversationExport(JSON.stringify(exported))).toThrow(); // 변조 거부 확인
    }); // 검증 종료

    it("분기 메시지가 없거나 같은 분기가 열 개를 초과한 파일을 거부한다", () => // 분기 제한 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const missingMessage = createConversationExport(state, state.conversations[0].id); // 누락 파일 생성
        addFork(missingMessage, 1); // 수정 버전 추가
        missingMessage.versions.at(-1)!.forkedFromMessageId = "missing-message"; // 분기 메시지 제거
        expect(() => parseConversationExport(JSON.stringify(missingMessage))).toThrow(); // 누락 메시지 거부 확인
        const overLimit = createConversationExport(state, state.conversations[0].id); // 제한 파일 생성
        Array.from({ length: 10 }, (_value, index) => index + 1).forEach((suffix) => addFork(overLimit, suffix)); // 열 개 수정 버전 추가
        expect(() => parseConversationExport(JSON.stringify(overLimit))).toThrow(); // 제한 초과 거부 확인
    }); // 검증 종료

    it("잘못된 시작 설정과 현재 앱에 없는 캐릭터 대화를 거부한다", () => // 전체 상태 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const invalidSettings = createConversationExport(state, state.conversations[0].id); // 설정 오류 파일 생성
        invalidSettings.conversation.startSettings = {} as typeof invalidSettings.conversation.startSettings; // 빈 시작 설정 적용
        expect(() => parseConversationExport(JSON.stringify(invalidSettings))).toThrow(); // 시작 설정 거부 확인
        const missingCharacter = createConversationExport(state, state.conversations[0].id); // 캐릭터 오류 파일 생성
        missingCharacter.conversation.characterId = "missing-character"; // 없는 캐릭터 적용
        expect(() => mergeConversationExport(state, missingCharacter)).toThrow(); // 전체 상태 연결 거부 확인
        expect(state.conversations).toHaveLength(createInitialState().conversations.length); // 기존 상태 불변 확인
    }); // 검증 종료
}); // 묶음 종료
