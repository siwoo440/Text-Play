// 서버 통로에 보낼 로그인 출입증: 실제 로그인 방식으로 로그인해 있으면 요청 머리말에 붙일 출입증을 돌려준다. 손님이거나 연습용 로그인이면 붙이지 않는다(서버가 확인할 수 없음).
import { getAccountServiceConfig } from "@chatbot/lib/account/account-config"; // 계정 서비스 설정
import { readSupabaseAccessToken } from "@chatbot/lib/account/supabase-account"; // 쓸 수 있는 출입증 읽기

export type AuthHeaders = () => Promise<Record<string, string>>; // 요청에 붙일 머리말을 만드는 함수

export async function getAccessTokenHeaders(): Promise<Record<string, string>> // 지금 로그인한 사람의 출입증 머리말(없으면 빈 것)
{ // 함수 시작
    if (typeof window === "undefined") // 서버에서 그리는 중
    { // 조건 시작
        return {}; // 출입증 없음
    } // 조건 종료
    const config = getAccountServiceConfig(); // 계정 서비스 설정
    if (config.mode !== "supabase") // 연습용 로그인
    { // 조건 시작
        return {}; // 붙이지 않음
    } // 조건 종료
    const token = await readSupabaseAccessToken(config, { storage: window.localStorage }).catch(() => null); // 쓸 수 있는 출입증(곧 끝나면 새로 받음)
    return token === null ? {} : { authorization: `Bearer ${token}` }; // 출입증 머리말
} // 함수 종료
