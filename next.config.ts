import type { NextConfig } from "next"; // 설정 타입

const nextConfig: NextConfig = // 설정 객체
{ // 객체 시작
    typedRoutes: true, // 타입 경로 활성화
    agentRules: false, // 에이전트 규칙 자동 생성 차단
}; // 객체 종료

export default nextConfig; // 설정 내보내기
