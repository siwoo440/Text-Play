import { render, screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { MessageItem } from "@chatbot/features/chat/MessageItem"; // 메시지 항목
import type { Message } from "@chatbot/features/core/types"; // 메시지 타입

const base = { conversationId: "conversation-rian", versionId: "conversation-rian-version-1", sourceMessageId: null, emotion: null, sceneEvent: null, createdAt: "2026-10-05T00:00:00.000Z" }; // 메시지 공통 값
const reply: Message = { ...base, id: "reply-1", role: "assistant", content: "어서 와. 오늘도 자리를 남겨 뒀어." }; // 캐릭터 답변
const mine: Message = { ...base, id: "mine-1", role: "user", content: "오늘도 왔어." }; // 내 메시지
const versionGroup = { rootVersionId: "conversation-rian-version-1", sourceMessageId: "mine-1", versionIds: ["conversation-rian-version-1", "conversation-rian-version-2"], currentIndex: 1 }; // 수정 버전이 하나 있는 묶음

describe("메시지 동작 버튼", () => // 동작 버튼 묶음
{ // 묶음 시작
    it("답변의 복사·삭제·다시 생성·책갈피·명장면 카드는 글자 없이 그림만 보이고 이름과 풍선 도움말을 가진다", () => // 답변 버튼 검증
    { // 검증 시작
        render(<ul><MessageItem message={reply} streaming={false} busy={false} allowRegenerate versionGroup={null} onRegenerate={() => undefined} onDelete={() => undefined} onToggleBookmark={() => undefined} onSceneCard={() => undefined} /></ul>); // 답변 렌더
        const names = ["복사", "삭제", "다시 생성", "책갈피", "명장면 카드"]; // 버튼 이름(순서대로)
        const buttons = within(screen.getByRole("group", { name: "메시지 동작" })).getAllByRole("button"); // 동작 버튼
        expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(names); // 읽기 도구용 이름
        for (const [index, button] of buttons.entries()) // 버튼 순회
        { // 순회 시작
            expect(button).toHaveAttribute("title", names[index]); // 마우스를 올리면 보이는 이름
            expect(button.textContent).toBe(""); // 보이는 글자 없음
            expect(button.querySelector("svg[aria-hidden='true']")).not.toBeNull(); // 그림 있음
        } // 순회 종료
        expect(buttons.map((button) => button.querySelector("svg")?.getAttribute("data-icon"))).toEqual(["copy", "delete", "regenerate", "bookmark", "scene-card"]); // 버튼마다 다른 그림
    }); // 검증 종료

    it("내 메시지의 수정과 현재 버전 삭제도 그림 버튼이고, 누르면 전처럼 동작한다", async () => // 내 메시지 버튼 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const onDeleteVersion = vi.fn(); // 버전 삭제 처리
        const onDelete = vi.fn(); // 메시지 삭제 처리
        render(<ul><MessageItem message={mine} streaming={false} busy={false} allowRegenerate={false} versionGroup={versionGroup} onEdit={async () => ({ ok: true, versionId: "conversation-rian-version-3" })} onDelete={onDelete} onSelectVersion={() => undefined} onDeleteVersion={onDeleteVersion} /></ul>); // 내 메시지 렌더
        const edit = screen.getByRole("button", { name: "수정" }); // 수정 버튼
        expect([edit.textContent, edit.getAttribute("title"), edit.querySelector("svg")?.getAttribute("data-icon")]).toEqual(["", "수정", "edit"]); // 그림 버튼
        const versionDelete = screen.getByRole("button", { name: "현재 버전 삭제" }); // 버전 삭제 버튼
        expect([versionDelete.textContent, versionDelete.getAttribute("title"), versionDelete.querySelector("svg")?.getAttribute("data-icon")]).toEqual(["", "현재 버전 삭제", "delete"]); // 그림 버튼
        await user.click(versionDelete); // 버전 삭제 누름
        expect(onDeleteVersion).toHaveBeenCalledWith("conversation-rian-version-2"); // 지금 버전 전달
        await user.click(screen.getByRole("button", { name: "삭제" })); // 메시지 삭제 누름
        expect(onDelete).toHaveBeenCalledWith(mine); // 메시지 전달
        await user.click(edit); // 수정 누름
        expect(screen.getByRole("textbox", { name: "메시지 수정" })).toHaveValue("오늘도 왔어."); // 수정 입력칸이 열림
        expect(screen.getByRole("button", { name: "수정 전송" })).toHaveTextContent("수정 전송"); // 수정 폼의 버튼은 글자 그대로
    }); // 검증 종료

    it("켜진 책갈피는 눌린 상태로 알리고, 응답 중에는 모든 그림 버튼이 잠긴다", () => // 상태 검증
    { // 검증 시작
        const { rerender } = render(<ul><MessageItem message={{ ...reply, bookmarked: true }} streaming={false} busy={false} allowRegenerate={false} versionGroup={null} onDelete={() => undefined} onToggleBookmark={() => undefined} onSceneCard={() => undefined} /></ul>); // 책갈피한 답변
        expect(screen.getByRole("button", { name: "책갈피" })).toHaveAttribute("aria-pressed", "true"); // 눌린 상태
        rerender(<ul><MessageItem message={{ ...reply, bookmarked: true }} streaming={false} busy allowRegenerate={false} versionGroup={null} onDelete={() => undefined} onToggleBookmark={() => undefined} onSceneCard={() => undefined} /></ul>); // 응답 중
        expect(within(screen.getByRole("group", { name: "메시지 동작" })).getAllByRole("button").every((button) => (button as HTMLButtonElement).disabled)).toBe(true); // 모두 잠김
    }); // 검증 종료
}); // 묶음 종료
