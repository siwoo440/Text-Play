import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 상태 리듀서
import { createVersionFork } from "@chatbot/features/conversation/conversation-versioning"; // 버전 분기 함수
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태

describe("앱 상태 리듀서", () => // 리듀서 묶음
{ // 묶음 시작
    it("패널과 설정을 불변 방식으로 변경한다", () => // 설정 변경 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const toggled = appReducer(state, { type: "toggle-right-panel" }); // 패널 전환
        const updated = appReducer(toggled, { type: "update-settings", settings: { platformMode: "tablet" } }); // 설정 변경
        expect(updated.settings.rightPanelOpen).toBe(true); // 패널 결과
        expect(updated.settings.platformMode).toBe("tablet"); // 설정 결과
        expect(state.settings.rightPanelOpen).toBe(false); // 원본 유지
    }); // 검증 종료

    it("메시지를 추가하고 대화방을 선택한다", () => // 대화 상태 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const message = { id: "message-new", conversationId: "conversation-sera", versionId: "conversation-sera-version-1", sourceMessageId: null, role: "user" as const, content: "안녕", emotion: null, sceneEvent: null, createdAt: "2026-09-23T00:00:00.000Z" }; // 새 메시지
        const withMessage = appReducer(state, { type: "add-message", message }); // 메시지 추가
        const selected = appReducer(withMessage, { type: "select-conversation", conversationId: "conversation-sera" }); // 대화 선택
        expect(selected.messages.at(-1)).toEqual(message); // 메시지 확인
        expect(selected.selectedConversationId).toBe("conversation-sera"); // 선택 확인
    }); // 검증 종료

    it("토큰 부족 시 전체 상태를 그대로 반환한다", () => // 원자성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.wallet.balance = 0; // 빈 지갑
        const next = appReducer(state, { type: "spend-token", action: "manual-image" }); // 차감 시도
        expect(next).toBe(state); // 상태 동일성
    }); // 검증 종료

    it("캐릭터 삭제 시 연결 데이터와 보관 상태를 함께 제거한다", () => // 연쇄 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const rian = state.characters.find((character) => character.id === "rian"); // 삭제 캐릭터 조회
        if (rian === undefined) // 삭제 캐릭터 부재 확인
        { // 조건 시작
            throw new Error("리안 테스트 데이터 부재"); // 데이터 오류
        } // 조건 종료
        state.bookmarkedCharacterIds = ["rian"]; // 보관 상태 적용
        state.likedCharacterIds = ["rian"]; // 좋아요 상태 적용
        state.followedCreatorIds = [rian.creatorId]; // 팔로우 상태 적용
        state.localReports = [{ id: "report-rian", characterId: "rian", reason: "other", createdAt: "2026-09-29T10:00:00.000Z" }]; // 신고 상태 적용
        state.memories = [{ id: "memory-rian", characterId: "rian", conversationId: "conversation-rian", category: "summary", content: "리안 대화 기억", sourceMessageIds: [], editedByUser: false, createdAt: "2026-09-29T10:00:00.000Z", updatedAt: "2026-09-29T10:00:00.000Z" }]; // 기억 상태 적용
        const next = appReducer(state, { type: "delete-character", characterId: "rian" }); // 캐릭터 삭제
        expect(next.characters.some((character) => character.id === "rian")).toBe(false); // 캐릭터 제거 확인
        expect(next.conversations.some((conversation) => conversation.characterId === "rian")).toBe(false); // 대화 제거 확인
        expect(next.messages.some((message) => message.conversationId === "conversation-rian")).toBe(false); // 메시지 제거 확인
        expect(next.bookmarkedCharacterIds).toEqual([]); // 보관 제거 확인
        expect(next.likedCharacterIds).toEqual([]); // 좋아요 제거 확인
        expect(next.followedCreatorIds).toEqual([]); // 팔로우 제거 확인
        expect(next.localReports).toEqual([]); // 신고 제거 확인
        expect(next.memories).toEqual([]); // 기억 제거 확인
        expect(next.selectedConversationId).toBeNull(); // 선택 해제 확인
    }); // 검증 종료

    it("보관 토글은 중복 없이 추가하고 제거한다", () => // 보관 토글 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const added = appReducer(state, { type: "toggle-bookmark", characterId: "rian" }); // 보관 추가
        const removed = appReducer(added, { type: "toggle-bookmark", characterId: "rian" }); // 보관 제거
        expect(added.bookmarkedCharacterIds).toEqual(["rian"]); // 추가 결과 확인
        expect(removed.bookmarkedCharacterIds).toEqual([]); // 제거 결과 확인
    }); // 검증 종료

    it("존재하지 않는 캐릭터는 보관하지 않는다", () => // 잘못된 보관 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const next = appReducer(state, { type: "toggle-bookmark", characterId: "missing" }); // 잘못된 보관 시도
        expect(next).toBe(state); // 기존 상태 확인
    }); // 검증 종료

    it("캐릭터 좋아요를 중복 없이 추가하고 제거한다", () => // 좋아요 전환 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const added = appReducer(state, { type: "toggle-character-like", characterId: "rian" }); // 좋아요 추가
        const removed = appReducer(added, { type: "toggle-character-like", characterId: "rian" }); // 좋아요 제거
        expect(added.likedCharacterIds).toEqual(["rian"]); // 추가 결과 확인
        expect(removed.likedCharacterIds).toEqual([]); // 제거 결과 확인
    }); // 검증 종료

    it("존재하는 제작자 팔로우를 중복 없이 추가하고 제거한다", () => // 팔로우 전환 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const added = appReducer(state, { type: "toggle-creator-follow", creatorId: "creator-archive" }); // 팔로우 추가
        const removed = appReducer(added, { type: "toggle-creator-follow", creatorId: "creator-archive" }); // 팔로우 제거
        expect(added.followedCreatorIds).toEqual(["creator-archive"]); // 추가 결과 확인
        expect(removed.followedCreatorIds).toEqual([]); // 제거 결과 확인
    }); // 검증 종료

    it("같은 식별자의 로컬 신고를 한 번만 저장한다", () => // 신고 중복 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const report = { id: "report-rian-1", characterId: "rian", reason: "spam" as const, createdAt: "2026-09-29T10:00:00.000Z" }; // 신고 기준값
        const added = appReducer(state, { type: "add-character-report", report }); // 신고 추가
        const duplicated = appReducer(added, { type: "add-character-report", report }); // 중복 신고 시도
        expect(added.localReports).toEqual([report]); // 신고 저장 확인
        expect(duplicated).toBe(added); // 중복 상태 확인
    }); // 검증 종료

    it("존재하지 않는 캐릭터와 제작자 반응을 무시한다", () => // 잘못된 반응 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const liked = appReducer(state, { type: "toggle-character-like", characterId: "missing" }); // 잘못된 좋아요 시도
        const followed = appReducer(state, { type: "toggle-creator-follow", creatorId: "missing" }); // 잘못된 팔로우 시도
        const reported = appReducer(state, { type: "add-character-report", report: { id: "report-missing", characterId: "missing", reason: "other", createdAt: "2026-09-29T10:00:00.000Z" } }); // 잘못된 신고 시도
        expect(liked).toBe(state); // 좋아요 무시 확인
        expect(followed).toBe(state); // 팔로우 무시 확인
        expect(reported).toBe(state); // 신고 무시 확인
    }); // 검증 종료

    it("프로필의 이름과 이미지를 변경한다", () => // 프로필 변경 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const next = appReducer(state, { type: "update-profile", profile: { nickname: "새 사용자", avatar: "🌙" } }); // 프로필 변경
        expect(next.profile.nickname).toBe("새 사용자"); // 이름 확인
        expect(next.profile.avatar).toBe("🌙"); // 이미지 확인
        expect(next.profile.membership).toBe(state.profile.membership); // 멤버십 유지
    }); // 검증 종료

    it("대화 이름을 다듬고 보관한 뒤 복구한다", () => // 대화 관리 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const target = state.conversations[0]; // 대상 대화 선택
        const renamed = appReducer(state, { type: "rename-conversation", conversationId: target.id, title: "  새 대화 이름  " }); // 이름 변경
        const archived = appReducer(renamed, { type: "archive-conversation", conversationId: target.id, archivedAt: "2026-09-24T00:00:00.000Z" }); // 대화 보관
        const restored = appReducer(archived, { type: "restore-conversation", conversationId: target.id }); // 대화 복구
        expect(renamed.conversations[0]?.title).toBe("새 대화 이름"); // 정리된 이름 확인
        expect(archived.conversations[0]?.archivedAt).toBe("2026-09-24T00:00:00.000Z"); // 보관 시각 확인
        expect(restored.conversations[0]?.archivedAt).toBeNull(); // 복구 상태 확인
    }); // 검증 종료

    it("빈 이름과 너무 긴 이름은 대화 이름을 바꾸지 않는다", () => // 이름 제한 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const target = state.conversations[0]; // 대상 대화 선택
        const empty = appReducer(state, { type: "rename-conversation", conversationId: target.id, title: "   " }); // 빈 이름 변경
        const long = appReducer(state, { type: "rename-conversation", conversationId: target.id, title: "가".repeat(61) }); // 긴 이름 변경
        expect(empty).toBe(state); // 빈 이름 거부 확인
        expect(long).toBe(state); // 긴 이름 거부 확인
    }); // 검증 종료

    it("대화 삭제 시 메시지와 선택 상태를 함께 정리한다", () => // 대화 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        const target = state.conversations[0]; // 삭제 대상 선택
        state.selectedConversationId = target.id; // 현재 대화 설정
        const next = appReducer(state, { type: "delete-conversation", conversationId: target.id }); // 삭제 실행
        expect(next.conversations.some((conversation) => conversation.id === target.id)).toBe(false); // 대화 제거 확인
        expect(next.messages.some((message) => message.conversationId === target.id)).toBe(false); // 메시지 제거 확인
        expect(next.selectedConversationId).toBeNull(); // 선택 해제 확인
    }); // 검증 종료

    it("대화 버전을 적용하고 선택 버전을 전환한다", () => // 버전 적용 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        const fork = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "리듀서 수정", assistantMessage: { id: "reducer-assistant", role: "assistant", content: "리듀서 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T12:00:00.000Z" }, versionState: { ...base, lastMessage: "리듀서 응답" }, now: "2026-09-29T12:00:00.000Z" }); // 분기 기준 생성
        const applied = appReducer(state, { type: "apply-conversation-version", conversationId: conversation.id, version: fork.version, messages: fork.messages }); // 새 버전 적용
        const selected = appReducer(applied, { type: "select-conversation-version", conversationId: conversation.id, versionId: base.id }); // 원본 버전 선택
        expect(applied.conversations[0].currentVersionId).toBe(fork.version.id); // 적용 버전 확인
        expect(applied.messages.filter((message) => message.versionId === fork.version.id)).toEqual(fork.messages); // 적용 메시지 확인
        expect(selected.conversations[0].currentVersionId).toBe(base.id); // 선택 버전 확인
    }); // 검증 종료

    it("리듀서가 현재 버전 메시지와 수정 버전 트리를 삭제한다", () => // 버전 삭제 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const base = state.conversationVersions.find((version) => version.id === conversation.currentVersionId)!; // 기준 버전 조회
        const target = state.messages.find((message) => message.versionId === base.id && message.role === "user")!; // 수정 메시지 조회
        const fork = createVersionFork(state, { conversationId: conversation.id, baseVersionId: base.id, targetMessageId: target.id, content: "삭제용 수정", assistantMessage: { id: "delete-assistant", role: "assistant", content: "삭제용 응답", emotion: "관심", sceneEvent: null, createdAt: "2026-09-29T12:00:00.000Z" }, versionState: { ...base, lastMessage: "삭제용 응답" }, now: "2026-09-29T12:00:00.000Z" }); // 분기 생성
        const removedMessage = appReducer(fork.state, { type: "delete-version-message", versionId: fork.version.id, messageId: fork.messages.at(-1)!.id }); // 응답 메시지 삭제
        const removedVersion = appReducer(removedMessage, { type: "delete-conversation-version", conversationId: conversation.id, versionId: fork.version.id }); // 수정 버전 삭제
        expect(removedMessage.messages.some((message) => message.id === fork.messages.at(-1)!.id)).toBe(false); // 메시지 삭제 확인
        expect(removedVersion.conversationVersions.some((version) => version.id === fork.version.id)).toBe(false); // 버전 삭제 확인
        expect(removedVersion.conversations[0].currentVersionId).toBe(base.id); // 부모 버전 복귀 확인
    }); // 검증 종료

    it("대화방 고정을 켜고 끄며 최근에 고정한 대화를 앞에 둔다", () => // 고정 전환 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const first = appReducer(state, { type: "toggle-conversation-pin", conversationId: "conversation-noah" }); // 노아 고정
        const second = appReducer(first, { type: "toggle-conversation-pin", conversationId: "conversation-sera" }); // 세라 고정
        const released = appReducer(second, { type: "toggle-conversation-pin", conversationId: "conversation-noah" }); // 노아 해제
        expect(second.pinnedConversationIds).toEqual(["conversation-sera", "conversation-noah"]); // 고정 순서 확인
        expect(released.pinnedConversationIds).toEqual(["conversation-sera"]); // 해제 확인
        expect(state.pinnedConversationIds).toEqual([]); // 원본 유지
    }); // 검증 종료

    it("없는 대화·보관한 대화·한도 초과는 고정하지 않는다", () => // 고정 제한 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        expect(appReducer(state, { type: "toggle-conversation-pin", conversationId: "없는-대화" })).toBe(state); // 없는 대화 확인
        const archived = appReducer(state, { type: "archive-conversation", conversationId: "conversation-noah", archivedAt: "2026-09-30T00:00:00.000Z" }); // 노아 보관
        expect(appReducer(archived, { type: "toggle-conversation-pin", conversationId: "conversation-noah" })).toBe(archived); // 보관 대화 확인
        const extra = Array.from({ length: 5 }, (_, index) => ({ ...state.conversations[0], id: `extra-${index}` })); // 추가 대화
        const full = { ...state, conversations: [...state.conversations, ...extra], pinnedConversationIds: extra.map((conversation) => conversation.id) }; // 한도 상태
        expect(appReducer(full, { type: "toggle-conversation-pin", conversationId: "conversation-rian" })).toBe(full); // 한도 초과 확인
    }); // 검증 종료

    it("고정한 대화를 보관·삭제하거나 캐릭터를 지우면 고정 목록에서도 뺀다", () => // 고정 정리 검증
    { // 검증 시작
        const state = { ...createInitialState(), pinnedConversationIds: ["conversation-rian", "conversation-sera", "conversation-noah"] }; // 고정 상태
        const archived = appReducer(state, { type: "archive-conversation", conversationId: "conversation-rian", archivedAt: "2026-09-30T00:00:00.000Z" }); // 리안 보관
        const deleted = appReducer(archived, { type: "delete-conversation", conversationId: "conversation-sera" }); // 세라 삭제
        const removedCharacter = appReducer(deleted, { type: "delete-character", characterId: "noah" }); // 노아 캐릭터 삭제
        expect(archived.pinnedConversationIds).toEqual(["conversation-sera", "conversation-noah"]); // 보관 정리 확인
        expect(deleted.pinnedConversationIds).toEqual(["conversation-noah"]); // 삭제 정리 확인
        expect(removedCharacter.pinnedConversationIds).toEqual([]); // 캐릭터 삭제 정리 확인
    }); // 검증 종료

    it("채팅 상태를 합칠 때 다른 화면에서 바꾼 이름·보관·설정·고정을 유지한다", () => // 채팅 병합 검증
    { // 검증 시작
        const chat = createInitialState(); // 채팅 화면 상태
        const reply = { id: "merge-reply", conversationId: "conversation-rian", versionId: "conversation-rian-version-1", sourceMessageId: null, role: "assistant" as const, content: "새 응답", emotion: "기대", sceneEvent: null, createdAt: "2026-10-01T00:00:00.000Z" }; // 새 응답
        chat.messages = [...chat.messages, reply]; // 응답 추가
        chat.wallet = { ...chat.wallet, balance: 1200 }; // 토큰 차감
        let global = createInitialState(); // 전역 상태
        global = appReducer(global, { type: "rename-conversation", conversationId: "conversation-rian", title: "바뀐 이름" }); // 이름 변경
        global = appReducer(global, { type: "archive-conversation", conversationId: "conversation-rian", archivedAt: "2026-10-01T00:00:00.000Z" }); // 리안 보관
        global = appReducer(global, { type: "toggle-conversation-pin", conversationId: "conversation-sera" }); // 세라 고정
        global = appReducer(global, { type: "update-settings", settings: { conversationSort: "turns", leftPanelOpen: false } }); // 설정 변경
        const merged = appReducer(global, { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: false }); // 채팅 병합
        expect(merged.messages.some((message) => message.id === "merge-reply")).toBe(true); // 응답 반영 확인
        expect(merged.wallet.balance).toBe(1200); // 토큰 반영 확인
        expect(merged.conversations.find((conversation) => conversation.id === "conversation-rian")?.title).toBe("바뀐 이름"); // 이름 유지 확인
        expect(merged.conversations.find((conversation) => conversation.id === "conversation-rian")?.archivedAt).toBe("2026-10-01T00:00:00.000Z"); // 보관 유지 확인
        expect(merged.pinnedConversationIds).toEqual(["conversation-sera"]); // 고정 유지 확인
        expect(merged.settings.conversationSort).toBe("turns"); // 정렬 유지 확인
        expect(merged.settings.leftPanelOpen).toBe(false); // 패널 유지 확인
    }); // 검증 종료

    it("채팅에서 처음 만든 대화만 새로 추가하고 다른 곳에서 지운 대화는 되살리지 않는다", () => // 채팅 생성 검증
    { // 검증 시작
        const chat = createInitialState(); // 채팅 화면 상태
        const global = appReducer(createInitialState(), { type: "delete-conversation", conversationId: "conversation-rian" }); // 리안 삭제
        const created = appReducer(global, { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: true }); // 새 대화 병합
        const revived = appReducer(global, { type: "merge-chat-state", conversationId: "conversation-rian", state: chat, allowCreate: false }); // 삭제 대화 병합
        expect(created.conversations.some((conversation) => conversation.id === "conversation-rian")).toBe(true); // 새 대화 추가 확인
        expect(created.messages.filter((message) => message.conversationId === "conversation-rian")).toHaveLength(3); // 새 메시지 추가 확인
        expect(revived).toBe(global); // 삭제 대화 유지 확인
    }); // 검증 종료
}); // 묶음 종료
