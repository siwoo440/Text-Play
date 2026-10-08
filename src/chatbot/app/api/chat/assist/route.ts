// 보조 통로: 답변 말고 실제 AI에 맡기는 작은 일(대화 요약, 스탯 판단)을 받아, 답을 끝까지 모아 정리한 뒤 한 번에 돌려준다. 실패하면 브라우저가 연습용 규칙으로 넘어간다.
import { getChatTier } from "@chatbot/features/chat/chat-tiers"; // 채팅 등급
import { ASSIST_TIMEOUT_MS, buildStatsPrompt, buildSummaryPrompt, cleanSummary, parseAssistRequest, parseStatDeltas } from "@chatbot/lib/llm/assist-builder"; // 보조 지시문
import { takeChatSlot } from "@chatbot/lib/llm/chat-gate"; // 문지기
import { readChatBody, refuse, refuseProviderFailure } from "@chatbot/lib/llm/chat-request"; // 통로 공통
import { resolveModel } from "@chatbot/lib/llm/model-catalog"; // 모델 목록
import { collectReply, streamProviderReply } from "@chatbot/lib/llm/providers"; // AI 회사 연결

export const runtime = "nodejs"; // 서버(Node)에서 실행
export const dynamic = "force-dynamic"; // 요청마다 새로 실행

export async function POST(request: Request): Promise<Response> // 보조 일 받기
{ // 함수 시작
    const body = await readChatBody(request); // 스위치·보낸 곳·크기 확인
    if (!body.ok) // 거절
    { // 조건 시작
        return body.response; // 거절 응답
    } // 조건 종료
    const assist = parseAssistRequest(body.payload); // 검사와 정리
    if (assist === null) // 모양이 다름
    { // 조건 시작
        return refuse(400, "bad-request"); // 거절
    } // 조건 종료
    if (assist.contentRating === "mature" && !getChatTier(assist.tier).mature) // 19세 작품을 외부 AI 등급으로 요청
    { // 조건 시작
        return refuse(422, "mature-not-supported"); // 연습용으로(직접 돌리는 공개 모델 등급만)
    } // 조건 종료
    const model = resolveModel(assist.tier); // 등급의 모델
    if (model === null) // 열쇠 없음
    { // 조건 시작
        return refuse(503, "no-key"); // 연습용으로
    } // 조건 종료
    if (!takeChatSlot()) // 너무 자주 보냄
    { // 조건 시작
        return refuse(429, "rate-limited"); // 잠시 뒤 다시
    } // 조건 종료
    let raw = ""; // 모델의 답
    try // 답 받기
    { // 시도 시작
        raw = await collectReply(streamProviderReply(model, assist.task === "summary" ? buildSummaryPrompt(assist) : buildStatsPrompt(assist), fetch, AbortSignal.any([request.signal, AbortSignal.timeout(ASSIST_TIMEOUT_MS)]))); // 끝까지 모음(브라우저가 끊거나 너무 오래 걸리면 그만둠)
    } // 시도 종료
    catch (error) // 회사 오류
    { // 실패 시작
        return refuseProviderFailure(error, model.provider === "local"); // 이유 알림
    } // 실패 종료
    const headers = { "cache-control": "no-store", "x-chat-model": model.model }; // 응답 머리말
    if (assist.task === "stats") // 스탯 판단
    { // 조건 시작
        const deltas = parseStatDeltas(raw, assist.stats); // 번호 순서의 변화
        return deltas === null ? refuse(502, "bad-output") : Response.json({ deltas }, { headers }); // 변화 반환(읽을 수 없는 답이면 거절)
    } // 조건 종료
    const summary = cleanSummary(raw); // 요약 정리
    return summary.length === 0 ? refuse(502, "bad-output") : Response.json({ summary }, { headers }); // 요약 반환(쓸 수 없는 답이면 거절)
} // 함수 종료
