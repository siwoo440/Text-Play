import { describe, expect, it } from "vitest"; // 테스트 도구
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // 연습용 AI
import { isAppState } from "@chatbot/lib/repositories/state-validation"; // 저장 전 검사

const conversationId = "conversation-rian"; // 리안 대화
const create = (state = createInitialState()) => new ChatController({ state, conversationId, llm: new MockLLMAdapter({ delayMs: 0 }), images: new MockImageAdapter() }); // 제어기 만들기(화면을 새로 열 때마다 새로 만들어짐)
const ids = (controller: ChatController) => controller.snapshot().messages.filter((message) => message.conversationId === conversationId).map((message) => message.id); // 이 대화의 메시지 식별자

describe("메시지 식별자", () => // 식별자 묶음
{ // 묶음 시작
    it("화면을 새로 연 뒤에 보낸 말도 앞서 저장된 말과 식별자가 겹치지 않아 저장 검사를 통과한다", async () => // 새로 고침 뒤 전송 검증
    { // 검증 시작
        const first = create(); // 처음 연 화면
        expect((await first.sendMessage("첫 번째로 보낸 말")).ok).toBe(true); // 첫 전송
        const reopened = create(first.snapshot()); // 새로 고침한 화면(저장된 상태로 제어기를 새로 만듦)
        expect((await reopened.sendMessage("새로 고침 뒤에 보낸 말")).ok).toBe(true); // 둘째 전송
        const after = ids(reopened); // 식별자 목록
        expect(new Set(after).size).toBe(after.length); // 겹치는 식별자 없음
        expect(after).toHaveLength(ids(create()).length + 4); // 내 말 둘과 답 둘이 모두 남음
        expect(reopened.snapshot().messages.filter((message) => message.conversationId === conversationId).map((message) => message.content)).toEqual(expect.arrayContaining(["첫 번째로 보낸 말", "새로 고침 뒤에 보낸 말"])); // 두 말 모두 있음
        expect(isAppState(reopened.snapshot())).toBe(true); // 저장 전 검사 통과
        const third = create(reopened.snapshot()); // 한 번 더 새로 연 화면
        expect((await third.sendMessage("세 번째로 보낸 말")).ok).toBe(true); // 셋째 전송
        expect(new Set(ids(third)).size).toBe(ids(third).length); // 여전히 겹치지 않음
        expect(isAppState(third.snapshot())).toBe(true); // 저장 전 검사 통과
    }); // 검증 종료

    it("메시지를 고쳐 새 대화 버전을 만든 뒤 화면을 새로 열고 또 보내도 겹치지 않는다", async () => // 수정 뒤 전송 검증
    { // 검증 시작
        const first = create(); // 처음 연 화면
        await first.sendMessage("고치기 전의 말"); // 전송
        const sent = first.getMessages().filter((message) => message.role === "user").at(-1); // 방금 보낸 말
        expect(sent).toBeDefined(); // 보낸 말 있음
        const edited = await first.editUserMessage(sent?.id ?? "", "고친 말"); // 수정(새 대화 버전)
        expect(edited.ok).toBe(true); // 수정 성공
        const reopened = create(first.snapshot()); // 새로 연 화면
        expect((await reopened.sendMessage("수정 뒤에 보낸 말")).ok).toBe(true); // 전송
        const all = reopened.snapshot().messages.map((message) => message.id); // 모든 식별자
        expect(new Set(all).size).toBe(all.length); // 겹치는 식별자 없음
        expect(isAppState(reopened.snapshot())).toBe(true); // 저장 전 검사 통과
    }); // 검증 종료

    it("다시 생성은 같은 답변 자리를 쓰므로 식별자가 늘지 않는다", async () => // 다시 생성 검증
    { // 검증 시작
        const controller = create(); // 제어기
        await controller.sendMessage("다시 받아 볼 말"); // 전송
        const before = ids(controller); // 전 식별자
        expect((await controller.regenerateLastReply()).ok).toBe(true); // 다시 생성
        expect(ids(controller)).toEqual(before); // 같은 식별자
    }); // 검증 종료
}); // 묶음 종료
