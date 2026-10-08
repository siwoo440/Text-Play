import { fireEvent, render, screen } from "@testing-library/react"; // 화면 조회 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { StatusPanel } from "@chatbot/features/chat/StatusPanel"; // 상태창
import { composeStatus } from "@chatbot/features/chat/status-model"; // 상태창 만들기
import { getVersionDeleteConfirmText } from "@chatbot/features/chat/version-delete-text"; // 버전 삭제 확인 문구
import { createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본 상태창 틀
import type { Message } from "@chatbot/features/core/types"; // 메시지 타입

const base = { template: createDefaultStatusTemplate(true), people: ["리안"], previous: null, userMessage: "오늘 책 정리했어", aiChanges: [], emotion: "설렘", tags: ["판타지"], startedAt: "2026-10-02T11:00:00.000Z", seed: "conversation-rian" }; // 상태창 재료

function reply(turn: number): Message // 상태창이 붙은 응답
{ // 함수 시작
    return { id: `reply-${turn}`, conversationId: "conversation-rian", versionId: "conversation-rian-version-1", sourceMessageId: null, role: "assistant", content: `응답 ${turn}`, emotion: null, sceneEvent: null, createdAt: `2026-10-02T11:0${turn}:00.000Z`, status: composeStatus({ ...base, turn }) }; // 응답 반환
} // 함수 종료

function pressAltArrow(key: "ArrowLeft" | "ArrowRight"): boolean // Alt+화살표를 누르고, 브라우저 기본 동작(뒤로·앞으로 가기)이 막혔는지 돌려줌
{ // 함수 시작
    return !fireEvent.keyDown(window, { key, altKey: true }); // 막혔으면 참
} // 함수 종료

describe("상태창 단축키", () => // 단축키 묶음
{ // 묶음 시작
    it("상태창이 펼쳐져 있고 넘겨 볼 턴이 있을 때만 Alt+화살표를 가로챈다", () => // 가로채기 조건 검증
    { // 검증 시작
        const { rerender } = render(<StatusPanel messages={[reply(1), reply(2)]} open onToggle={() => undefined} />); // 펼친 상태창(두 턴)
        expect(pressAltArrow("ArrowLeft")).toBe(true); // 펼쳐져 있으면 이전 턴으로(기본 동작 막음)
        expect(screen.getByRole("button", { name: "이전 턴 상태창" })).toBeDisabled(); // 첫 턴을 보고 있음(더 앞이 없음)
        rerender(<StatusPanel messages={[reply(1), reply(2)]} open={false} onToggle={() => undefined} />); // 접은 상태창
        expect(pressAltArrow("ArrowLeft")).toBe(false); // 접혀 있으면 브라우저의 뒤로 가기를 막지 않음
        expect(pressAltArrow("ArrowRight")).toBe(false); // 앞으로 가기도 막지 않음
        rerender(<StatusPanel messages={[reply(1)]} open onToggle={() => undefined} />); // 펼쳤지만 턴이 하나
        expect(pressAltArrow("ArrowLeft")).toBe(false); // 넘겨 볼 턴이 없으면 막지 않음
    }); // 검증 종료
}); // 묶음 종료

describe("대화 버전 삭제 확인 문구", () => // 삭제 문구 묶음
{ // 묶음 시작
    it("하위 버전 수에는 지우려는 버전 자신을 넣지 않는다", () => // 하위 버전 수 검증
    { // 검증 시작
        expect(getVersionDeleteConfirmText(1, 4)).toBe("현재 수정 버전과 메시지 4개를 삭제할까요?"); // 하위 버전 없음
        expect(getVersionDeleteConfirmText(3, 9)).toBe("현재 수정 버전과 하위 버전 2개, 메시지 9개를 삭제할까요?"); // 자신을 뺀 두 개
    }); // 검증 종료
}); // 묶음 종료
