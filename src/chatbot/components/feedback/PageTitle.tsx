"use client"; // 클라이언트 컴포넌트(작품 이름은 브라우저 저장소에 있어 서버가 제목을 만들 수 없음)

import { useEffect } from "react"; // 리액트 효과

const SERVICE_NAME = "Mate Verse"; // 서비스 이름

export function PageTitle({ title }: { title: string }) // 브라우저 탭 제목(작품 이름처럼 브라우저에서만 아는 제목)
{ // 함수 시작
    useEffect(() => // 제목 반영 효과
    { // 효과 시작
        const previous = document.title; // 서버가 보낸 제목
        const mine = `${title} | ${SERVICE_NAME}`; // 이 화면 제목
        document.title = mine; // 제목 바꿈
        const observer = new MutationObserver(() => // 화면을 다 그린 뒤 서버 제목이 다시 들어오면 되돌림
        { // 처리 시작
            if (document.title === previous && previous !== mine) // 서버 제목으로 돌아감(다른 제목으로 바뀐 것은 건드리지 않음)
            { // 조건 시작
                document.title = mine; // 이 화면 제목으로
            } // 조건 종료
        }); // 처리 종료
        observer.observe(document.head, { childList: true, subtree: true, characterData: true }); // 제목 변화 지켜보기
        return () => // 정리
        { // 정리 시작
            observer.disconnect(); // 지켜보기 끝
            if (document.title === mine) // 다른 화면이 제목을 바꾸지 않았음
            { // 조건 시작
                document.title = previous; // 원래 제목으로
            } // 조건 종료
        }; // 정리 종료
    }, [title]); // 제목 의존
    return null; // 화면에는 그리지 않음
} // 함수 종료
