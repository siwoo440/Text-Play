// 문서 언어 맞추기: <html lang>과 브라우저 탭 제목을 화면 언어로 맞춘다. 탭 제목은 서버가 한국어로 만들어 보내므로 브라우저에서 바꾼다.
import { useEffect } from "react"; // 리액트 효과
import { translateTo, type Locale } from "@chatbot/lib/i18n"; // 정한 언어로 바꾸기

const TITLE_SEPARATOR = " | "; // 제목과 서비스 이름 사이 글자

export function translateTitle(title: string, locale: Locale): string // 탭 제목 바꾸기(앞부분만, 사전에 없으면 그대로)
{ // 함수 시작
    const [head, ...rest] = title.split(TITLE_SEPARATOR); // 제목과 나머지
    return [translateTo(locale, head), ...rest].join(TITLE_SEPARATOR); // 바꾼 제목 반환
} // 함수 종료

export function useDocumentLanguage(locale: Locale): void // 문서 언어와 탭 제목 맞추기
{ // 함수 시작
    useEffect(() => // 언어 반영 효과
    { // 효과 시작
        document.documentElement.lang = locale; // 읽어 주는 도구와 브라우저에 화면 언어를 알림
        let original: string | null = null; // 바꾸기 전 제목
        let shown: string | null = null; // 바꾼 뒤 제목
        const sync = () => // 탭 제목 맞추기
        { // 함수 시작
            const current = document.title; // 지금 제목
            const next = translateTitle(current, locale); // 화면 언어의 제목
            if (current === shown || next === current) // 이미 바꿨거나 바꿀 것이 없음
            { // 조건 시작
                return; // 그대로 둠
            } // 조건 종료
            original = current; // 원래 제목 기억
            shown = next; // 바꾼 제목 기억
            document.title = next; // 제목 바꿈
        }; // 함수 종료
        sync(); // 지금 제목부터 맞춤
        const observer = new MutationObserver(sync); // 페이지를 옮겨 제목이 바뀌면 다시 맞춤
        observer.observe(document.head, { childList: true, subtree: true, characterData: true }); // 제목 변화 지켜보기
        return () => // 정리
        { // 정리 시작
            observer.disconnect(); // 지켜보기 끝
            if (original !== null && document.title === shown) // 내가 바꾼 제목이 그대로 있음
            { // 조건 시작
                document.title = original; // 언어를 되돌리면 원래 제목으로
            } // 조건 종료
        }; // 정리 종료
    }, [locale]); // 언어 의존
} // 함수 종료
