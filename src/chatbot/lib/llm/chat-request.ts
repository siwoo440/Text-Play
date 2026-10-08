// 서버 통로 공통: 두 통로(답변, 보조)가 함께 쓰는 문지기 확인과 거절 응답, 회사 오류를 이유 코드로 바꾸기.
import { CHAT_BODY_LIMIT, isChatAllowedFrom } from "@chatbot/lib/llm/chat-gate"; // 문지기
import { isRealChatEnabled } from "@chatbot/lib/llm/model-catalog"; // 실제 AI 스위치
import { ProviderError } from "@chatbot/lib/llm/providers"; // AI 회사 오류

export function refuse(status: number, error: string, detail = ""): Response // 거절 응답(이유 코드와 짧은 설명)
{ // 함수 시작
    return Response.json({ error, detail }, { status, headers: { "cache-control": "no-store" } }); // 응답 반환
} // 함수 종료

export async function readChatBody(request: Request): Promise<{ ok: true; payload: unknown } | { ok: false; response: Response }> // 스위치·보낸 곳·크기를 확인하고 요청 내용을 읽기
{ // 함수 시작
    if (!isRealChatEnabled()) // 스위치 꺼짐
    { // 조건 시작
        return { ok: false, response: refuse(503, "disabled") }; // 연습용으로
    } // 조건 종료
    if (!isChatAllowedFrom(request.headers.get("host"))) // 내 컴퓨터가 아님
    { // 조건 시작
        return { ok: false, response: refuse(403, "local-only") }; // 거절
    } // 조건 종료
    const raw = await request.text(); // 요청 글
    if (raw.length > CHAT_BODY_LIMIT) // 너무 큼
    { // 조건 시작
        return { ok: false, response: refuse(413, "too-large") }; // 거절
    } // 조건 종료
    try // 해석 시도
    { // 시도 시작
        return { ok: true, payload: JSON.parse(raw) as unknown }; // 해석한 내용
    } // 시도 종료
    catch // 해석 실패
    { // 실패 시작
        return { ok: false, response: refuse(400, "bad-request") }; // 거절
    } // 실패 종료
} // 함수 종료

export function refuseProviderFailure(error: unknown, local: boolean): Response // 회사(또는 내 컴퓨터 모델) 오류를 이유 코드로 알리기
{ // 함수 시작
    const status = error instanceof ProviderError ? error.status : 0; // 회사가 준 상태(연결조차 안 되면 0)
    const code = local && status === 0 ? "model-offline" : local && status === 404 ? "model-missing" : status === 401 || status === 403 ? "bad-key" : status === 429 ? "provider-busy" : "provider-error"; // 이유(내 컴퓨터 모델은 프로그램 꺼짐·모델 없음을 따로 알림)
    return refuse(code === "provider-busy" ? 429 : 502, code, error instanceof Error ? error.message.slice(0, 200) : ""); // 이유 알림
} // 함수 종료
