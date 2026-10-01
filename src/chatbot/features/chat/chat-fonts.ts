import type { ChatFont, ChatFontSize } from "@chatbot/features/core/types"; // 글꼴 타입

export const chatFontOptions: Array<{ id: ChatFont; label: string; family: string; google: string | null }> = // 채팅 글꼴(구글 폰트, 고를 때만 불러옴)
[ // 목록 시작
    { id: "default", label: "기본", family: "inherit", google: null }, // 기본 글꼴
    { id: "nanum-myeongjo", label: "나눔명조", family: "\"Nanum Myeongjo\", \"NanumMyeongjo\", serif", google: "Nanum+Myeongjo:wght@400;700" }, // 나눔명조
    { id: "gowun-batang", label: "고운바탕", family: "\"Gowun Batang\", serif", google: "Gowun+Batang:wght@400;700" }, // 고운바탕
    { id: "noto-serif", label: "노토 세리프", family: "\"Noto Serif KR\", serif", google: "Noto+Serif+KR:wght@400;700" }, // 노토 세리프
]; // 목록 종료

export const chatFontSizeOptions: Array<{ id: ChatFontSize; label: string; size: string }> = [{ id: "small", label: "작게", size: "0.94rem" }, { id: "medium", label: "보통", size: "1rem" }, { id: "large", label: "크게", size: "1.12rem" }]; // 글자 크기

export function getChatFontFamily(id: ChatFont): string // 글꼴 이름
{ // 함수 시작
    return chatFontOptions.find((option) => option.id === id)?.family ?? "inherit"; // 글꼴 반환
} // 함수 종료

export function getChatFontSize(id: ChatFontSize): string // 글자 크기
{ // 함수 시작
    return chatFontSizeOptions.find((option) => option.id === id)?.size ?? "1rem"; // 크기 반환
} // 함수 종료

export function loadChatFont(id: ChatFont): void // 고른 글꼴만 불러오기(기본 글꼴은 외부 요청 없음)
{ // 함수 시작
    const option = chatFontOptions.find((item) => item.id === id); // 글꼴 조회
    if (option?.google === null || option === undefined || typeof document === "undefined" || document.getElementById(`chat-font-${id}`) !== null) // 불러올 필요 없음
    { // 조건 시작
        return; // 생략
    } // 조건 종료
    const link = document.createElement("link"); // 글꼴 연결
    link.id = `chat-font-${id}`; // 식별자
    link.rel = "stylesheet"; // 스타일시트
    link.href = `https://fonts.googleapis.com/css2?family=${option.google}&display=swap`; // 구글 폰트 주소
    document.head.appendChild(link); // 문서에 추가
} // 함수 종료
