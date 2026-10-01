import { describe, expect, it } from "vitest"; // 테스트 도구
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { decorateReply, MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // 대화 어댑터
import type { LLMInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 입력
import { mockCharacters, mockConversations, mockConversationVersions } from "@chatbot/mocks/fixtures"; // Mock 데이터

function makeInput(content: string): LLMInput // 입력 생성
{ // 함수 시작
    return { character: mockCharacters[0], conversation: mockConversations[0], version: mockConversationVersions[0], messages: [{ id: "test-user-message", conversationId: mockConversations[0].id, versionId: mockConversationVersions[0].id, sourceMessageId: null, role: "user", content, emotion: null, sceneEvent: null, createdAt: "2026-09-22T00:00:00.000Z" }] }; // 입력 반환
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

    it("대화방 설정의 문체·답변 길이·사칭 방지·대화 프로필을 Mock 응답에 반영하고 기본 설정이면 그대로 둔다", () => // 설정 반영 검증
    { // 검증 시작
        const options = { tier: "basic" as const, length: 1 as const, thinking: "off" as const, writingStyle: "default" as const, preventImpersonation: true, persona: null, userNote: "", memories: [], playGuide: "" }; // 기본 설정
        expect(decorateReply("안녕.", options, 1, false)).toBe("안녕."); // 기본은 그대로
        expect(decorateReply("안녕.", { ...options, writingStyle: "romance" }, 1, false)).toBe("*시선이 잠시 네게 머문다.* 안녕."); // 문체
        expect(decorateReply("안녕.", { ...options, length: 3 }, 1, false).split(" ").length).toBeGreaterThan(5); // 긴 답변
        expect(decorateReply("안녕.", { ...options, preventImpersonation: false }, 2, false)).toContain("*당신은"); // 사칭 방지 끔
        expect(decorateReply("안녕.", { ...options, preventImpersonation: true }, 2, false)).not.toContain("*당신은"); // 사칭 방지 켬
        expect(decorateReply("안녕.", { ...options, persona: { name: "시우", description: "" } }, 3, false)).toBe("시우, 안녕."); // 이름 부르기
        expect(decorateReply("[리안] 안녕.", { ...options, length: 1.5 }, 1, true).split("\n")).toHaveLength(2); // 스토리 내레이션 추가
    }); // 검증 종료

    it("중단 신호를 받으면 대기 중인 응답을 종료한다", async () => // 중단 신호 검증
    { // 검증 시작
        const adapter = new MockLLMAdapter({ delayMs: 100, seed: 7 }); // 지연 어댑터 생성
        const abortController = new AbortController(); // 중단 제어기 생성
        const iterator = adapter.streamReply(makeInput("중단 확인"), abortController.signal)[Symbol.asyncIterator](); // 응답 반복기 생성
        const firstChunk = iterator.next(); // 첫 조각 요청
        abortController.abort(); // 응답 중단
        await expect(firstChunk).rejects.toMatchObject({ name: "AbortError" }); // 중단 오류 확인
    }); // 검증 종료

    it("알려진 장면과 알 수 없는 장면의 경로를 구분한다", async () => // 이미지 검증
    { // 검증 시작
        const adapter = new MockImageAdapter(); // 이미지 어댑터 생성
        await expect(adapter.generateScene({ sceneId: "dawn" })).resolves.toMatchObject({ path: "/images/scenes/dawn-letter.svg", fallback: false }); // 알려진 장면
        await expect(adapter.generateScene({ sceneId: "unknown" })).resolves.toMatchObject({ path: "/images/scenes/fallback-scene.svg", fallback: true }); // 대체 장면
    }); // 검증 종료
}); // 묶음 종료
