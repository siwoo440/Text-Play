import { proxyLLMRequest } from "@/lib/server/llm-proxy"; // LLM 프록시

export const dynamic = "force-dynamic"; // 동적 경로 설정

export async function POST(request: Request): Promise<Response> // LLM POST 경로
{ // 함수 시작
    return proxyLLMRequest(request, { endpoint: process.env.MATEVERSE_LLM_API_URL, token: process.env.MATEVERSE_LLM_API_TOKEN }); // 서버 프록시 실행
} // 함수 종료
