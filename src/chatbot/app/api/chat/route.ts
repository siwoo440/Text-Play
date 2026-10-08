// 서버 통로: 브라우저와 AI 회사 사이에 서서 열쇠를 숨기고, 지시문을 조립해 보내고, 답을 글자 조각으로 흘려보낸다. 열쇠가 없거나 꺼져 있으면 브라우저가 연습용 AI로 답한다.
import { getChatTier } from "@chatbot/features/chat/chat-tiers"; // 채팅 등급
import { isChatAllowedFrom, takeChatSlot } from "@chatbot/lib/llm/chat-gate"; // 문지기
import { readChatBody, refuse, refuseProviderFailure } from "@chatbot/lib/llm/chat-request"; // 통로 공통
import { getLocalModelNames, getTierAvailability, isRealChatEnabled, resolveModel } from "@chatbot/lib/llm/model-catalog"; // 모델 목록
import { buildChatPrompt, parseChatRequest } from "@chatbot/lib/llm/prompt-builder"; // 지시문 만들기
import { streamProviderReply } from "@chatbot/lib/llm/providers"; // AI 회사 연결

export const runtime = "nodejs"; // 서버(Node)에서 실행
export const dynamic = "force-dynamic"; // 요청마다 새로 실행(미리 만들어 두지 않음)

export function GET(request: Request): Response // 등급별로 실제 AI를 쓸 수 있는지 알려 주기(열쇠 값은 내보내지 않음)
{ // 함수 시작
    const allowed = isChatAllowedFrom(request.headers.get("host")); // 이 요청에 허용되는지
    const availability = getTierAvailability(); // 등급별 가능 여부
    const tiers = Object.fromEntries(Object.entries(availability).map(([tier, ready]) => [tier, allowed && ready])); // 허용되지 않으면 모두 불가
    return Response.json({ enabled: allowed && isRealChatEnabled(), tiers, models: allowed ? getLocalModelNames() : {} }, { headers: { "cache-control": "no-store" } }); // 상태 반환(내 컴퓨터 모델은 이름도 알려 줌)
} // 함수 종료

export async function POST(request: Request): Promise<Response> // 답변 받기
{ // 함수 시작
    const body = await readChatBody(request); // 스위치·보낸 곳·크기 확인
    if (!body.ok) // 거절
    { // 조건 시작
        return body.response; // 거절 응답
    } // 조건 종료
    const chat = parseChatRequest(body.payload); // 검사와 정리
    if (chat === null) // 모양이 다름
    { // 조건 시작
        return refuse(400, "bad-request"); // 거절
    } // 조건 종료
    if (chat.character.contentRating === "mature" && !getChatTier(chat.tier).mature) // 19세 작품을 외부 AI 등급으로 요청
    { // 조건 시작
        return refuse(422, "mature-not-supported"); // 외부 AI 약관 때문에 연습용으로(직접 돌리는 공개 모델 등급만 답함)
    } // 조건 종료
    const model = resolveModel(chat.tier); // 등급의 모델
    if (model === null) // 열쇠 없음
    { // 조건 시작
        return refuse(503, "no-key"); // 연습용으로
    } // 조건 종료
    if (!takeChatSlot()) // 너무 자주 보냄
    { // 조건 시작
        return refuse(429, "rate-limited"); // 잠시 뒤 다시
    } // 조건 종료
    const iterator = streamProviderReply(model, buildChatPrompt(chat), fetch, request.signal)[Symbol.asyncIterator](); // 답 흐름
    let first: IteratorResult<string>; // 첫 조각
    try // 첫 조각 받기(여기서 실패하면 오류 코드로 알릴 수 있음)
    { // 시도 시작
        first = await iterator.next(); // 첫 조각
    } // 시도 종료
    catch (error) // 회사 오류
    { // 실패 시작
        return refuseProviderFailure(error, model.provider === "local"); // 이유 알림
    } // 실패 종료
    const encoder = new TextEncoder(); // 글자 변환
    const stream = new ReadableStream<Uint8Array>( // 브라우저로 보내는 흐름
    { // 흐름 시작
        async start(controller) // 보내기
        { // 함수 시작
            try // 보내기 시도
            { // 시도 시작
                for (let result = first; result.done !== true; result = await iterator.next()) // 조각 순회
                { // 순회 시작
                    controller.enqueue(encoder.encode(result.value)); // 조각 보냄
                } // 순회 종료
                controller.close(); // 끝
            } // 시도 종료
            catch (error) // 도중 오류
            { // 실패 시작
                controller.error(error); // 흐름을 오류로 끝냄(브라우저가 재시도 안내)
            } // 실패 종료
        }, // 함수 종료
        async cancel() // 브라우저가 중단함
        { // 함수 시작
            await iterator.return?.(); // 회사 쪽 흐름도 닫음
        }, // 함수 종료
    }); // 흐름 종료
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-chat-model": model.model } }); // 답 반환
} // 함수 종료
