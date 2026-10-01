import { describe, expect, it } from "vitest"; // 테스트 도구
import { createStructuredMessages } from "@/lib/adapters/structured-messages"; // 구조화 메시지 생성기

describe("구조화 응답 메시지", () => // 메시지 묶음
{ // 묶음 시작
    it("시스템 규칙과 응답 형식, 문맥과 사용자 행동을 두 메시지로 만든다", () => // 메시지 형식 검증
    { // 테스트 시작
        const messages = createStructuredMessages({ system: "규칙", context: "{\"sceneId\":\"forest-gate\"}", userInput: "주변을 본다", responseSchema: "{ narration: string }" }); // 메시지 생성
        expect(messages).toEqual( // 메시지 확인
        [ // 기대 목록 시작
            { role: "system", content: "규칙\n\n응답 형식:\n{ narration: string }" }, // 시스템 메시지
            { role: "user", content: "{\"sceneId\":\"forest-gate\"}\n\n사용자 행동:\n주변을 본다" }, // 사용자 메시지
        ]); // 기대 목록 종료
    }); // 테스트 종료
}); // 묶음 종료
