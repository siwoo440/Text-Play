import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 상태 리듀서
import { DEFAULT_PERSONA_ID } from "@chatbot/features/core/defaults"; // 기본 대화 프로필
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { createMemory } from "@chatbot/features/chat/memory-model"; // 기억 만들기
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화
import { isAppState } from "@chatbot/lib/repositories/local-storage-gateway"; // 상태 검증

describe("대화 설정·프로필·메모리·알림·폴더 리듀서", () => // 묶음
{ // 묶음 시작
    it("대화방 설정을 부분 갱신하고 채팅 병합은 전역 설정과 폴더를 지킨다", () => // 설정 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const updated = appReducer(state, { type: "update-conversation-settings", conversationId: "conversation-rian", settings: { tier: "plus", userNote: "리안은 커피를 싫어한다", writingStyle: "romance" } }); // 설정 변경
        const conversation = updated.conversations.find((item) => item.id === "conversation-rian")!; // 대상
        expect(conversation.settings).toMatchObject({ tier: "plus", userNote: "리안은 커피를 싫어한다", writingStyle: "romance", preventImpersonation: true }); // 부분 갱신
        const withFolder = appReducer(appReducer(updated, { type: "create-folder", folder: { id: "folder-1", name: "판타지", createdAt: "2026-10-01T00:00:00.000Z" } }), { type: "move-conversation-to-folder", conversationId: "conversation-rian", folderId: "folder-1" }); // 폴더 이동
        const merged = appReducer(withFolder, { type: "merge-chat-state", conversationId: "conversation-rian", state, allowCreate: false }); // 오래된 채팅 상태 병합
        const after = merged.conversations.find((item) => item.id === "conversation-rian")!; // 병합 결과
        expect(after.settings.tier).toBe("plus"); // 전역 설정 유지
        expect(after.folderId).toBe("folder-1"); // 폴더 유지
        expect(isAppState(merged)).toBe(true); // 저장 가능한 상태
    }); // 검증 종료

    it("대화 프로필을 추가·수정하고 지우면 그 프로필을 쓰던 대화는 기본 프로필로 돌아가며 기본 프로필은 지울 수 없다", () => // 프로필 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const persona = { id: "persona-2", name: "시우", description: "신입 사원", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" }; // 새 프로필
        const added = appReducer(appReducer(state, { type: "upsert-persona", persona }), { type: "update-conversation-settings", conversationId: "conversation-rian", settings: { personaId: "persona-2" } }); // 추가·선택
        expect(added.personas.map((item) => item.name)).toEqual([state.profile.nickname, "시우"]); // 추가 확인
        const edited = appReducer(added, { type: "upsert-persona", persona: { ...persona, name: "시우(수정)" } }); // 수정
        expect(edited.personas[1].name).toBe("시우(수정)"); // 수정 확인
        const removed = appReducer(edited, { type: "delete-persona", personaId: "persona-2" }); // 삭제
        expect(removed.personas).toHaveLength(1); // 삭제 확인
        expect(removed.conversations.find((item) => item.id === "conversation-rian")!.settings.personaId).toBeNull(); // 기본으로 복귀
        expect(appReducer(removed, { type: "delete-persona", personaId: DEFAULT_PERSONA_ID })).toBe(removed); // 기본 프로필 보호
    }); // 검증 종료

    it("요약 메모리를 추가·수정·삭제하고 대화를 지우면 그 대화의 메모리도 지운다", () => // 메모리 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const memory = createMemory({ id: "memory-1", conversationId: "conversation-rian", characterId: "rian", category: "goal", content: "기록관의 비밀 찾기", editedByUser: true, now: "2026-10-01T00:00:00.000Z" }); // 목표
        const added = appReducer(state, { type: "upsert-memories", memories: [memory] }); // 추가
        const edited = appReducer(added, { type: "upsert-memories", memories: [{ ...memory, content: "기록관의 비밀 끝까지 찾기" }] }); // 수정
        expect(edited.memories.map((item) => item.content)).toEqual(["기록관의 비밀 끝까지 찾기"]); // 같은 식별자 교체
        expect(appReducer(edited, { type: "delete-memory", memoryId: "memory-1" }).memories).toEqual([]); // 삭제
        expect(appReducer(edited, { type: "delete-conversation", conversationId: "conversation-rian" }).memories).toEqual([]); // 대화 삭제 시 함께 삭제
    }); // 검증 종료

    it("알림은 최근 순으로 30개까지 두고 모두 읽음·비우기를 지원한다", () => // 알림 검증
    { // 검증 시작
        let state = createInitialState(); // 초기 상태
        for (let index = 0; index < 32; index += 1) // 32개 추가
        { // 순회 시작
            state = appReducer(state, { type: "add-notification", notification: { id: `n-${index}`, kind: "image", title: `알림 ${index}`, body: "", href: "/images", read: false, createdAt: `2026-10-01T00:${String(index).padStart(2, "0")}:00.000Z` } }); // 추가
        } // 순회 종료
        expect(state.notifications).toHaveLength(30); // 최대 30개
        expect(state.notifications[0].id).toBe("n-31"); // 최근 순
        const read = appReducer(state, { type: "mark-notifications-read" }); // 모두 읽음
        expect(read.notifications.every((item) => item.read)).toBe(true); // 읽음 확인
        expect(appReducer(read, { type: "clear-notifications" }).notifications).toEqual([]); // 비우기
    }); // 검증 종료

    it("폴더를 만들고 이름을 바꾸고 지우면 안의 대화는 목록으로 돌아오며 자동 정리는 같은 작품 대화 두 개 이상을 묶는다", () => // 폴더 검증
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        const second = createStoryConversation(createStoryConversation(base, "story-closing-cafe", "2026-10-01T09:00:00.000Z").state, "story-closing-cafe", "2026-10-01T10:00:00.000Z").state; // 같은 스토리 대화 2개
        const created = appReducer(second, { type: "create-folder", folder: { id: "folder-a", name: "임시", createdAt: "2026-10-01T00:00:00.000Z" } }); // 폴더 만들기
        const renamed = appReducer(created, { type: "rename-folder", folderId: "folder-a", name: "즐겨 하는 대화" }); // 이름 변경
        expect(renamed.conversationFolders[0].name).toBe("즐겨 하는 대화"); // 이름 확인
        const moved = appReducer(renamed, { type: "move-conversation-to-folder", conversationId: "conversation-sera", folderId: "folder-a" }); // 이동
        const deleted = appReducer(moved, { type: "delete-folder", folderId: "folder-a" }); // 폴더 삭제
        expect(deleted.conversations.find((item) => item.id === "conversation-sera")!.folderId).toBeNull(); // 목록 복귀
        const organized = appReducer(deleted, { type: "auto-organize-conversations", now: "2026-10-01T11:00:00.000Z" }); // 자동 정리
        const cafeFolder = organized.conversationFolders.find((folder) => folder.name === "마감 10분 전, 비 오는 카페"); // 작품 폴더
        expect(cafeFolder).toBeDefined(); // 폴더 생성
        expect(organized.conversations.filter((item) => item.folderId === cafeFolder!.id)).toHaveLength(2); // 두 대화 이동
        expect(organized.conversations.find((item) => item.id === "conversation-rian")!.folderId).toBeNull(); // 대화 하나뿐인 작품은 그대로
        expect(isAppState(organized)).toBe(true); // 저장 가능한 상태
    }); // 검증 종료
}); // 묶음 종료
