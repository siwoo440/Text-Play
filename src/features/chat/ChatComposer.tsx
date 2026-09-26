"use client"; // 클라이언트 컴포넌트

import { useState, type FormEvent } from "react"; // 리액트 상태

export function ChatComposer({ busy, onSend }: { busy: boolean; onSend(text: string): Promise<void> }) // 채팅 입력
{ // 함수 시작
    const [text, setText] = useState(""); // 입력 내용
    const submit = async (event: FormEvent) => // 전송 처리
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        const content = text.trim(); // 입력 정리
        if (content.length === 0 || busy) // 전송 불가 판정
        { // 조건 시작
            return; // 전송 중단
        } // 조건 종료
        setText(""); // 입력 초기화
        await onSend(content); // 메시지 전송
    }; // 함수 종료
    return ( // 입력 반환
        <form onSubmit={submit}> {/* 전송 양식 */}
            <label><span className="sr-only">메시지</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="이야기를 이어가세요" disabled={busy} /></label> {/* 메시지 입력 */}
            <button type="submit" disabled={busy || text.trim().length === 0}>{busy ? "응답 중" : "전송"}</button> {/* 전송 버튼 */}
        </form> // 양식 종료
    ); // 반환 종료
} // 함수 종료
