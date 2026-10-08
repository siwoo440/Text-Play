// 계정 서비스 설정: 실제 로그인·서버 저장(Supabase)을 쓸지, 연습용으로 둘지를 환경 변수로 정한다. 주소와 공개 키를 넣어 두어도 스위치를 켜기 전에는 연습용이다.
export type AccountServiceConfig = // 계정 서비스 설정
    | { mode: "practice" } // 연습용(이 브라우저 안에서만)
    | { mode: "supabase"; url: string; anonKey: string }; // 실제 서비스(Supabase 프로젝트 주소와 공개 키)

export interface AccountServiceValues // 설정 값(환경 변수에서 읽음)
{ // 구조 시작
    service?: string; // 스위치(supabase일 때만 실제 서비스)
    url?: string; // Supabase 프로젝트 주소
    anonKey?: string; // Supabase 공개 키(Publishable key 또는 예전 방식의 anon 키. 브라우저에 내보내도 되는 키이고, 비밀 키를 넣으면 안 됨)
} // 구조 종료

const SERVICE_PATHS: ReadonlySet<string> = new Set(["", "/rest/v1", "/auth/v1"]); // 받아 주는 주소 끝 경로(없음, 또는 Supabase 화면이 붙여 보여 주는 데이터·로그인 경로)

function cleanUrl(value: string): string | null // 주소 다듬기(프로젝트 주소 모양이 아니면 없음)
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        const url = new URL(value.trim()); // 주소 해석
        const path = url.pathname.replace(/\/+$/, ""); // 끝의 빗금을 뗀 경로
        return (url.protocol === "https:" || url.protocol === "http:") && SERVICE_PATHS.has(path) ? url.origin : null; // http(s) 주소이고 경로가 없거나 서비스 경로일 때만(경로는 떼고 씀)
    } // 시도 종료
    catch // 주소가 아님
    { // 실패 시작
        return null; // 없음
    } // 실패 종료
} // 함수 종료

export function readAccountServiceConfig(values: AccountServiceValues): AccountServiceConfig // 값으로 설정 정하기(하나라도 빠지면 연습용)
{ // 함수 시작
    const url = cleanUrl(values.url ?? ""); // 프로젝트 주소
    const anonKey = (values.anonKey ?? "").trim(); // 공개 키
    return values.service?.trim() === "supabase" && url !== null && anonKey.length > 0 ? { mode: "supabase", url, anonKey } : { mode: "practice" }; // 스위치·주소·키가 모두 있을 때만 실제 서비스
} // 함수 종료

export function getAccountServiceConfig(): AccountServiceConfig // 지금 설정(환경 변수는 이름을 그대로 적어야 브라우저 코드에 들어감)
{ // 함수 시작
    return readAccountServiceConfig({ service: process.env.NEXT_PUBLIC_ACCOUNT_SERVICE, url: process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }); // 설정 반환
} // 함수 종료
