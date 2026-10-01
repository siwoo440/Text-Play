// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest"; // 테스트 도구
import { parseTextPlayResponse } from "@/features/text-play/ai/response-schema"; // 앱 응답 해석기
import { createSseDecoder } from "../../scripts/lib/local-model-eval.mjs"; // SSE 해석기
import { startFakeOpenAIServer } from "../../scripts/local-ai/fake-openai-server.mjs"; // 가짜 내장 AI 서버

let running: { url: string; close(): Promise<void> } | null = null; // 실행 중 서버

afterEach(async () => // 서버 정리
{ // 정리 시작
    await running?.close(); // 서버 종료
    running = null; // 참조 제거
}); // 정리 종료

describe("가짜 내장 AI 서버", () => // 가짜 서버 묶음
{ // 묶음 시작
    it("준비 확인에 응답하고 사용자 행동을 담은 Text-Play JSON을 조각으로 보낸다", async () => // 응답 검증
    { // 테스트 시작
        running = await startFakeOpenAIServer({ port: 0 }); // 임의 포트 시작
        expect((await fetch(`${running.url}/health`)).status).toBe(200); // 준비 확인
        const response = await fetch(`${running.url}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stream: true, response_format: { type: "json_schema", json_schema: { name: "text_play_response", schema: { type: "object" } } }, messages: [{ role: "system", content: "규칙" }, { role: "user", content: "{}\n\n사용자 행동:\n문을 연다" }] }) }); // 형식 강제 대화 요청
        const decoder = createSseDecoder(); // SSE 해석기
        let content = ""; // 응답 내용
        for (const event of decoder.push(await response.text())) // 사건 순회
        { // 반복 시작
            if (event !== "[DONE]") // 완료 표시 제외
            { // 조건 시작
                content += String((event as { choices: { delta: { content?: string } }[] }).choices[0].delta.content ?? ""); // 조각 누적
            } // 조건 종료
        } // 반복 종료
        const parsed = parseTextPlayResponse(content); // 앱 해석
        expect(parsed.ok).toBe(true); // 형식 확인
        expect(parsed.ok && parsed.value.narration).toContain("문을 연다"); // 사용자 행동 반영 확인
    }); // 테스트 종료
}); // 묶음 종료
