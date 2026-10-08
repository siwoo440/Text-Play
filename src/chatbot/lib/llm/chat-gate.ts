// 서버 통로의 문지기: 로그인이 없는 동안 실제 AI를 혼자 쓰는 시험용으로만 열어 둔다(내 컴퓨터에서 온 요청만, 1분에 정해진 횟수까지).
export const CHAT_REQUESTS_PER_MINUTE = 20; // 1분에 받는 요청 수
export const CHAT_BODY_LIMIT = 400_000; // 요청 글자 수 한도

const WINDOW_MS = 60_000; // 세는 시간(1분)
let recent: number[] = []; // 최근 요청 시각

export function isLocalHost(host: string | null): boolean // 내 컴퓨터로 온 요청인지(localhost·127.0.0.1·[::1])
{ // 함수 시작
    const name = (host ?? "").toLowerCase().replace(/:\d+$/, ""); // 포트 제거
    return name === "localhost" || name === "127.0.0.1" || name === "[::1]" || name.endsWith(".localhost"); // 로컬 주소
} // 함수 종료

export function isChatAllowedFrom(host: string | null, env: Record<string, string | undefined> = process.env): boolean // 이 요청에 실제 AI를 써도 되는지
{ // 함수 시작
    return isLocalHost(host) || (env.CHAT_ALLOW_PUBLIC ?? "").trim() === "true"; // 내 컴퓨터이거나, 공개를 명시적으로 켠 경우
} // 함수 종료

export function takeChatSlot(now: number = Date.now()): boolean // 요청 한 번 받기(한도를 넘으면 거절)
{ // 함수 시작
    recent = recent.filter((time) => now - time < WINDOW_MS); // 1분이 지난 기록 지움
    if (recent.length >= CHAT_REQUESTS_PER_MINUTE) // 한도 도달
    { // 조건 시작
        return false; // 거절
    } // 조건 종료
    recent.push(now); // 기록
    return true; // 받음
} // 함수 종료

export function resetChatSlots(): void // 기록 비우기(테스트용)
{ // 함수 시작
    recent = []; // 비움
} // 함수 종료
