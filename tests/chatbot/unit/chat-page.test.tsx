import { describe, expect, it } from "vitest"; // 테스트 도구
import ChatPage from "@chatbot/app/chat/[characterId]/page"; // 채팅 페이지

describe("채팅 페이지 경계", () => // 페이지 묶음
{ // 묶음 시작
    it("같은 캐릭터의 다른 대화 주소마다 화면 인스턴스 키를 바꾼다", async () => // 대화 전환 검증
    { // 검증 시작
        const first = await ChatPage({ params: Promise.resolve({ characterId: "rian" }), searchParams: Promise.resolve({ conversation: "conversation-one", version: "version-one" }) }); // 첫 대화 요소 생성
        const second = await ChatPage({ params: Promise.resolve({ characterId: "rian" }), searchParams: Promise.resolve({ conversation: "conversation-two", version: "version-two" }) }); // 둘째 대화 요소 생성
        expect(first.key).toBe("conversation-one:version-one"); // 첫 키 확인
        expect(second.key).toBe("conversation-two:version-two"); // 둘째 키 확인
        expect(first.key).not.toBe(second.key); // 인스턴스 분리 확인
    }); // 검증 종료
}); // 묶음 종료
