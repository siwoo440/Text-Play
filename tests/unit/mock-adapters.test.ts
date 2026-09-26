import { describe, expect, it } from "vitest"; // 테스트 도구
import { MockImageAdapter } from "@/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // 대화 어댑터
import type { LLMInput, StructuredLLMInput } from "@/lib/adapters/llm-adapter"; // 대화 입력
import { mockCharacters, mockConversations } from "@/mocks/fixtures"; // Mock 데이터

function makeInput(content: string): LLMInput // 입력 생성
{ // 함수 시작
    return { character: mockCharacters[0], conversation: mockConversations[0], messages: [{ id: "test-user-message", conversationId: mockConversations[0].id, role: "user", content, emotion: null, sceneEvent: null, createdAt: "2026-09-22T00:00:00.000Z" }] }; // 입력 반환
} // 함수 종료

async function collect(chunks: AsyncIterable<string>): Promise<string> // 스트림 수집
{ // 함수 시작
    let text = ""; // 누적 문자열
    for await (const chunk of chunks) // 조각 순회
    { // 순회 시작
        text += chunk; // 조각 추가
    } // 순회 종료
    return text; // 전체 반환
} // 함수 종료

function makeStructuredInput(userInput: string): StructuredLLMInput // 구조화 입력 생성
{ // 함수 시작
    return { system: "게임 규칙", context: "현재 장면", userInput, responseSchema: "JSON" }; // 구조화 입력 반환
} // 함수 종료

describe("Mock 어댑터", () => // 어댑터 묶음
{ // 묶음 시작
    it("같은 시드와 입력에 같은 응답을 반환한다", async () => // 결정성 검증
    { // 검증 시작
        const adapter = new MockLLMAdapter({ delayMs: 0, seed: 7 }); // 어댑터 생성
        const first = await collect(adapter.streamReply(makeInput("안녕"))); // 첫 응답
        const second = await collect(adapter.streamReply(makeInput("안녕"))); // 둘째 응답
        expect(second).toBe(first); // 동일성 확인
        expect(first.length).toBeGreaterThan(0); // 응답 존재
    }); // 검증 종료

    it("같은 구조화 입력에 같은 JSON 응답을 반환한다", async () => // 구조화 결정성 검증
    { // 검증 시작
        const adapter = new MockLLMAdapter({ delayMs: 0, seed: 7 }); // 어댑터 생성
        const first = await collect(adapter.streamStructuredReply(makeStructuredInput("문을 조사한다"))); // 첫 구조화 응답
        const second = await collect(adapter.streamStructuredReply(makeStructuredInput("문을 조사한다"))); // 둘째 구조화 응답
        expect(second).toBe(first); // 동일성 확인
        expect(JSON.parse(first)).toMatchObject({ proposedActions: [{ type: "change-relation", characterId: "lyra", amount: 1 }] }); // 액션 내용 확인
    }); // 검증 종료

    it("알려진 장면과 알 수 없는 장면의 경로를 구분한다", async () => // 이미지 검증
    { // 검증 시작
        const adapter = new MockImageAdapter(); // 이미지 어댑터 생성
        await expect(adapter.generateScene({ sceneId: "dawn" })).resolves.toMatchObject({ path: "/images/scenes/dawn-letter.svg", fallback: false }); // 알려진 장면
        await expect(adapter.generateScene({ sceneId: "unknown" })).resolves.toMatchObject({ path: "/images/scenes/fallback-scene.svg", fallback: true }); // 대체 장면
    }); // 검증 종료
}); // 묶음 종료
