import { describe, expect, it } from "vitest"; // 테스트 도구
import { CHAT_MESSAGE_MAX_LENGTH, CHAT_VERSION_LIMIT, createVersionFork, getConversationSummary, getConversationVersion, getMessageVersionGroup, getVersionMessages, isConversationVersionGraphValid, removeMessageFromVersion, removeVersionTree } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 함수
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 생성
import type { ConversationVersion, Message } from "@chatbot/features/core/types"; // 도메인 타입

describe("대화 버전 조회", () => // 조회 묶음
{ // 묶음 시작
    it("요청 버전과 현재 버전을 대화 경계 안에서 조회한다", () => // 버전 경계 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const foreignVersion = state.conversationVersions.find((version) => version.conversationId !== conversation.id); // 외부 버전 조회
        expect(getConversationVersion(state, conversation.id, conversation.currentVersionId)?.id).toBe(conversation.currentVersionId); // 요청 버전 확인
        expect(getConversationVersion(state, conversation.id, foreignVersion?.id)?.id).toBe(conversation.currentVersionId); // 현재 버전 복구 확인
        expect(getConversationVersion(state, "missing-conversation", null)).toBeNull(); // 누락 대화 확인
    }); // 검증 종료

    it("현재 버전이 잘못되면 원본 버전으로 복구한다", () => // 원본 복구 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const changed = { ...state, conversations: state.conversations.map((item) => item.id === conversation.id ? { ...item, currentVersionId: "missing-version" } : item) }; // 잘못된 현재 버전 생성
        expect(getConversationVersion(changed, conversation.id, "foreign-version")?.ordinal).toBe(1); // 원본 버전 확인
    }); // 검증 종료

    it("선택 버전 메시지만 생성 시각과 식별자 순서로 반환한다", () => // 메시지 조회 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const versionId = `${conversation.id}-version-2`; // 추가 버전 식별자
        const version: ConversationVersion = { ...state.conversationVersions[0], id: versionId, parentVersionId: conversation.currentVersionId, forkRootVersionId: conversation.currentVersionId, forkedFromMessageId: state.messages[0].id, ordinal: 2 }; // 추가 버전 생성
        const messages: Message[] = // 추가 메시지 목록
        [ // 목록 시작
            { ...state.messages[0], id: "later", versionId, createdAt: "2026-09-22T08:00:00.000Z" }, // 나중 메시지
            { ...state.messages[0], id: "earlier-b", versionId, createdAt: "2026-09-22T07:00:00.000Z" }, // 같은 시각 뒷순서
            { ...state.messages[0], id: "earlier-a", versionId, createdAt: "2026-09-22T07:00:00.000Z" }, // 같은 시각 앞순서
        ]; // 목록 종료
        const changed = { ...state, conversationVersions: [...state.conversationVersions, version], messages: [...state.messages, ...messages] }; // 버전 상태 생성
        expect(getVersionMessages(changed, conversation.id, versionId).map((message) => message.id)).toEqual(["earlier-b", "earlier-a", "later"]); // 안정 정렬 결과 확인
    }); // 검증 종료

    it("대화 요약이 현재 버전의 진행 상태를 사용한다", () => // 요약 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const currentVersion = state.conversationVersions.find((version) => version.id === conversation.currentVersionId); // 현재 버전 조회
        expect(getConversationSummary(state, conversation.id)).toEqual({ versionId: currentVersion?.id, relationshipLevel: currentVersion?.relationshipLevel, relationshipStage: currentVersion?.relationshipStage, emotion: currentVersion?.emotion, currentScene: currentVersion?.currentScene, lastMessage: currentVersion?.lastMessage, updatedAt: currentVersion?.updatedAt }); // 요약 값 확인
    }); // 검증 종료
}); // 묶음 종료

describe("대화 버전 변경", () => // 변경 묶음
{ // 묶음 시작
    it("수정 분기는 원본을 유지하고 독립 메시지 스냅샷을 만든다", () => // 분기 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        const baseMessages = getVersionMessages(state, conversation.id, base.id); // 원본 메시지 저장
        const result = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "수정한 이야기", assistantMessage: { id: "assistant-edited", role: "assistant", content: "수정 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { relationshipLevel: 40, relationshipStage: "아는 사이", emotion: "관심", currentScene: base.currentScene, lastMessage: "수정 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 분기 생성
        expect(result.state.messages.filter((message) => message.versionId === base.id)).toEqual(baseMessages); // 원본 유지 확인
        expect(result.version.parentVersionId).toBe(base.id); // 부모 연결 확인
        expect(result.messages.find((message) => message.sourceMessageId === target.id)?.content).toBe("수정한 이야기"); // 수정 내용 확인
        expect(result.state.conversations[0].currentVersionId).toBe(result.version.id); // 현재 버전 확인
    }); // 검증 종료

    it("같은 메시지 반복 수정은 하나의 전환 그룹을 유지한다", () => // 반복 수정 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        const first = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "첫 수정", assistantMessage: { id: "assistant-first", role: "assistant", content: "첫 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "첫 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 첫 분기 생성
        const repeatedTarget = first.messages.find((message) => message.sourceMessageId === target.id)!; // 반복 대상 조회
        const second = createVersionFork(first.state, { conversationId: conversation.id, baseVersionId: first.version.id, targetMessageId: repeatedTarget.id, content: "둘째 수정", assistantMessage: { id: "assistant-second", role: "assistant", content: "둘째 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:02:00.000Z" }, versionState: { ...base, lastMessage: "둘째 응답" }, now: "2026-09-29T10:02:00.000Z" }); // 둘째 분기 생성
        const group = getMessageVersionGroup(second.state, second.version.id, second.messages.find((message) => message.sourceMessageId === target.id)!.id); // 전환 그룹 조회
        expect(group.rootVersionId).toBe(base.id); // 원본 버전 확인
        expect(group.sourceMessageId).toBe(target.id); // 원본 메시지 확인
        expect(group.versionIds).toEqual([base.id, first.version.id, second.version.id]); // 그룹 버전 확인
        expect(group.currentIndex).toBe(2); // 현재 위치 확인
    }); // 검증 종료

    it("같은 분기 지점의 최대 버전 수를 제한한다", () => // 분기 제한 검증
    { // 검증 시작
        let state = createInitialState(); // 변경 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        for (let index = 1; index < CHAT_VERSION_LIMIT; index += 1) // 허용 분기 반복
        { // 반복 시작
            state = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: `수정 ${index}`, assistantMessage: { id: `assistant-${index}`, role: "assistant", content: `응답 ${index}`, emotion: "관심", sceneEvent: null, createdAt: `2026-09-29T10:${String(index).padStart(2, "0")}:00.000Z` }, versionState: { ...base, lastMessage: `응답 ${index}` }, now: `2026-09-29T10:${String(index).padStart(2, "0")}:00.000Z` }).state; // 허용 분기 반영
        } // 반복 종료
        expect(() => createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "초과 수정", assistantMessage: { id: "assistant-over", role: "assistant", content: "초과 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T11:00:00.000Z" }, versionState: { ...base, lastMessage: "초과 응답" }, now: "2026-09-29T11:00:00.000Z" })).toThrowError(expect.objectContaining({ code: "version-limit" })); // 제한 오류 확인
        expect(CHAT_MESSAGE_MAX_LENGTH).toBe(2000); // 길이 제한 확인
    }); // 검증 종료

    it("현재 버전의 사용자 메시지와 이후 메시지만 삭제한다", () => // 메시지 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const versionId = conversation.currentVersionId; // 기준 버전 저장
        const target = state.messages.find((message) => message.versionId === versionId && message.role === "user")!; // 삭제 메시지 조회
        const next = removeMessageFromVersion(state, versionId, target.id); // 메시지 삭제
        expect(next.messages.filter((message) => message.versionId === versionId)).toHaveLength(1); // 현재 버전 삭제 확인
        expect(next.messages.filter((message) => message.versionId !== versionId)).toEqual(state.messages.filter((message) => message.versionId !== versionId)); // 다른 버전 유지 확인
    }); // 검증 종료

    it("수정 버전의 분기 기준 메시지 삭제는 해당 분기 트리를 제거한다", () => // 분기 기준 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        const fork = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "삭제할 분기", assistantMessage: { id: "assistant-delete", role: "assistant", content: "삭제 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "삭제 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 분기 생성
        const forkTarget = fork.messages.find((message) => message.sourceMessageId === target.id)!; // 분기 기준 조회
        const next = removeMessageFromVersion(fork.state, fork.version.id, forkTarget.id); // 분기 기준 삭제
        expect(next.conversationVersions.some((version) => version.id === fork.version.id)).toBe(false); // 분기 버전 제거 확인
        expect(next.messages.some((message) => message.versionId === fork.version.id)).toBe(false); // 분기 메시지 제거 확인
        expect(next.conversations[0].currentVersionId).toBe(base.id); // 원본 복귀 확인
        expect(getMessageVersionGroup(next, base.id, target.id).versionIds).toEqual([base.id]); // 전환 그룹 정리 확인
    }); // 검증 종료

    it("원본의 분기 기준 메시지 삭제는 연결된 수정 분기를 함께 제거한다", () => // 원본 기준 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 분기 기준 조회
        const fork = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "원본 삭제 분기", assistantMessage: { id: "assistant-root-delete", role: "assistant", content: "원본 삭제 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "원본 삭제 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 분기 생성
        const next = removeMessageFromVersion(fork.state, base.id, target.id); // 원본 기준 삭제
        expect(next.conversationVersions.some((version) => version.id === fork.version.id)).toBe(false); // 연결 분기 제거 확인
        expect(next.conversationVersions.some((version) => version.id === base.id)).toBe(true); // 원본 버전 유지 확인
        expect(next.messages.some((message) => message.versionId === fork.version.id)).toBe(false); // 분기 메시지 제거 확인
    }); // 검증 종료

    it("분기 기준보다 앞선 사용자 메시지 삭제는 현재 분기 트리를 제거한다", () => // 앞선 메시지 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const firstUser = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 앞선 사용자 조회
        const secondUser: Message = { ...firstUser, id: "second-user", content: "두 번째 이야기", createdAt: "2026-09-29T09:00:00.000Z" }; // 둘째 사용자 생성
        const secondAssistant: Message = { ...state.messages.find((message) => message.versionId === base.id && message.role === "assistant")!, id: "second-assistant", content: "두 번째 응답", createdAt: "2026-09-29T09:01:00.000Z" }; // 둘째 응답 생성
        const extended = { ...state, messages: [...state.messages, secondUser, secondAssistant] }; // 확장 대화 생성
        const fork = createVersionFork(extended, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: secondUser.id, content: "두 번째 수정", assistantMessage: { id: "assistant-later-delete", role: "assistant", content: "두 번째 수정 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "두 번째 수정 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 후속 분기 생성
        const earlierForkMessage = fork.messages.find((message) => message.sourceMessageId === firstUser.id)!; // 앞선 분기 메시지 조회
        const next = removeMessageFromVersion(fork.state, fork.version.id, earlierForkMessage.id); // 앞선 메시지 삭제
        expect(next.conversationVersions.some((version) => version.id === fork.version.id)).toBe(false); // 현재 분기 제거 확인
        expect(next.conversations[0].currentVersionId).toBe(base.id); // 부모 버전 복귀 확인
    }); // 검증 종료

    it("분기에서 참조한 원본 AI 메시지 삭제는 복제 참조를 분리한다", () => // AI 참조 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 분기 기준 조회
        const assistant = state.messages.find((message) => message.versionId === base.id && message.role === "assistant")!; // 원본 AI 메시지 조회
        const fork = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "AI 참조 분기", assistantMessage: { id: "assistant-reference", role: "assistant", content: "AI 참조 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "AI 참조 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 분기 생성
        const next = removeMessageFromVersion(fork.state, base.id, assistant.id); // 원본 AI 메시지 삭제
        const copiedAssistant = next.messages.find((message) => message.versionId === fork.version.id && message.sourceMessageId === null && message.content === assistant.content); // 분리된 복제 조회
        expect(copiedAssistant).toBeDefined(); // 복제 메시지 유지 확인
        expect(isConversationVersionGraphValid(next)).toBe(true); // 그래프 유효성 확인
    }); // 검증 종료

    it("버전의 마지막 메시지 삭제를 차단한다", () => // 마지막 메시지 보호 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const versionId = conversation.currentVersionId; // 기준 버전 식별자
        const onlyMessage = state.messages.find((message) => message.versionId === versionId)!; // 단일 메시지 조회
        const reduced = { ...state, messages: state.messages.filter((message) => message.versionId !== versionId || message.id === onlyMessage.id) }; // 단일 메시지 상태 생성
        const next = removeMessageFromVersion(reduced, versionId, onlyMessage.id); // 마지막 메시지 삭제 시도
        expect(next).toBe(reduced); // 원본 상태 유지 확인
        expect(isConversationVersionGraphValid(next)).toBe(true); // 그래프 유효성 확인
    }); // 검증 종료

    it("원본 삭제를 거부하고 수정 버전의 하위 트리를 함께 삭제한다", () => // 버전 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        const first = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "첫 수정", assistantMessage: { id: "assistant-first", role: "assistant", content: "첫 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:01:00.000Z" }, versionState: { ...base, lastMessage: "첫 응답" }, now: "2026-09-29T10:01:00.000Z" }); // 첫 분기 생성
        const childTarget = first.messages.find((message) => message.sourceMessageId === target.id)!; // 하위 대상 조회
        const second = createVersionFork(first.state, { conversationId: conversation.id, baseVersionId: first.version.id, targetMessageId: childTarget.id, content: "둘째 수정", assistantMessage: { id: "assistant-second", role: "assistant", content: "둘째 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T10:02:00.000Z" }, versionState: { ...base, lastMessage: "둘째 응답" }, now: "2026-09-29T10:02:00.000Z" }); // 하위 분기 생성
        expect(() => removeVersionTree(second.state, conversation.id, base.id)).toThrowError(expect.objectContaining({ code: "original-version" })); // 원본 삭제 거부 확인
        const deleted = removeVersionTree(second.state, conversation.id, first.version.id); // 수정 트리 삭제
        expect(deleted.versionCount).toBe(2); // 삭제 버전 수 확인
        expect(deleted.state.conversationVersions.some((version) => version.id === first.version.id || version.id === second.version.id)).toBe(false); // 하위 버전 삭제 확인
        expect(deleted.selectedVersionId).toBe(base.id); // 부모 복귀 확인
    }); // 검증 종료
}); // 묶음 종료
