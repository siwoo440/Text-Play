"use client"; // 클라이언트 컴포넌트

import { useState, type FormEvent } from "react"; // 리액트 상태
import { CHAT_MESSAGE_MAX_LENGTH } from "@chatbot/features/conversation/conversation-versioning"; // 메시지 길이 제한
import type { StoryCastMember } from "@chatbot/features/core/types"; // 등장인물 타입
import { addressText } from "@chatbot/features/story/story-model"; // 말 걸 상대 붙이기
import styles from "@chatbot/features/chat/ChatScreen.module.css"; // 채팅 스타일

interface ChatComposerProps // 채팅 입력 속성
{ // 구조 시작
    busy: boolean; // 응답 상태
    onSend(text: string): Promise<void>; // 전송 처리
    onCancel(): void; // 중단 처리
    storyCast?: StoryCastMember[]; // 스토리 모드 등장인물(있으면 말 걸 상대·이야기 진행 표시)
    onContinue?(): Promise<void>; // 입력 없이 이야기 진행
} // 구조 종료

export function ChatComposer({ busy, onSend, onCancel, storyCast, onContinue }: ChatComposerProps) // 채팅 입력
{ // 함수 시작
    const [text, setText] = useState(""); // 입력 내용
    const [target, setTarget] = useState("all"); // 말 걸 상대(전체 또는 캐릭터 식별자)
    const submit = async (event: FormEvent) => // 전송 처리
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        const content = text.trim(); // 입력 정리
        if (content.length === 0 || busy) // 전송 불가 판정
        { // 조건 시작
            return; // 전송 중단
        } // 조건 종료
        const member = storyCast?.find((item) => item.characterId === target); // 고른 상대
        setText(""); // 입력 초기화
        await onSend(member === undefined || content.startsWith("@") ? content : addressText(member, content)); // 메시지 전송(상대가 있으면 @이름 붙임)
    }; // 함수 종료
    return ( // 입력 반환
        <> {/* 입력 묶음 */}
            {storyCast === undefined ? null : ( // 스토리 조작 판정
                <div className={styles.storyControls}> {/* 스토리 조작 */}
                    <label>말 걸 상대<select aria-label="말 걸 상대" value={target} disabled={busy} onChange={(event) => setTarget(event.target.value)}><option value="all">전체</option>{storyCast.map((member) => <option key={member.characterId} value={member.characterId}>{member.displayName}</option>)}</select></label> {/* 상대 선택 */}
                    <button type="button" className={styles.continueButton} disabled={busy || onContinue === undefined} onClick={() => void onContinue?.()}>이야기 진행</button> {/* 이야기 진행 */}
                </div> // 스토리 조작 종료
            )} {/* 스토리 조작 판정 종료 */}
            <form onSubmit={submit}> {/* 전송 양식 */}
                <label><span className="sr-only">메시지</span><textarea value={text} maxLength={CHAT_MESSAGE_MAX_LENGTH} onChange={(event) => setText(event.target.value)} placeholder={storyCast === undefined ? "이야기를 이어가세요" : "대사나 행동을 적어 상황극을 이어가세요"} disabled={busy} /></label> {/* 메시지 입력 */}
                {busy ? <button type="button" onClick={onCancel}>응답 중단</button> : <button type="submit" disabled={text.trim().length === 0}>전송</button>} {/* 요청 제어 버튼 */}
            </form> {/* 양식 종료 */}
        </> // 입력 묶음 종료
    ); // 반환 종료
} // 함수 종료
