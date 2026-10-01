"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"; // 리액트 도구
import { CHAT_MESSAGE_MAX_LENGTH } from "@chatbot/features/conversation/conversation-versioning"; // 메시지 길이 제한
import type { StoryCastMember } from "@chatbot/features/core/types"; // 등장인물 타입
import { addressText } from "@chatbot/features/story/story-model"; // 말 걸 상대 붙이기
import styles from "@chatbot/features/chat/ChatScreen.module.css"; // 채팅 스타일

export interface ComposerCommand // 명령어
{ // 구조 시작
    id: string; // 식별자
    label: string; // 명령 이름(/요약 등)
    description: string; // 설명
    run(): void; // 실행
} // 구조 종료

interface ChatComposerProps // 채팅 입력 속성
{ // 구조 시작
    busy: boolean; // 응답 상태
    onSend(text: string): Promise<void>; // 전송 처리
    onCancel(): void; // 중단 처리
    storyCast?: StoryCastMember[]; // 스토리 모드 등장인물(있으면 말 걸 상대·이야기 진행 표시)
    onContinue?(): Promise<void>; // 입력 없이 이야기 진행
    getSuggestions?(): string[]; // 추천 답변 만들기
    commands?: ComposerCommand[]; // / 명령어
} // 구조 종료

export function ChatComposer({ busy, onSend, onCancel, storyCast, onContinue, getSuggestions, commands = [] }: ChatComposerProps) // 채팅 입력
{ // 함수 시작
    const [text, setText] = useState(""); // 입력 내용
    const [target, setTarget] = useState("all"); // 말 걸 상대(전체 또는 캐릭터 식별자)
    const [suggestions, setSuggestions] = useState<string[] | null>(null); // 추천 답변(열렸을 때만)
    const [commandOpen, setCommandOpen] = useState(false); // 명령어 메뉴
    const inputRef = useRef<HTMLTextAreaElement>(null); // 입력창
    const commandRef = useRef<HTMLDivElement>(null); // 명령어 메뉴
    const toggleSuggestions = () => setSuggestions((current) => current === null && getSuggestions !== undefined ? getSuggestions() : null); // 추천 열고 닫기
    const insertAction = () => // 지문(*행동*) 넣기
    { // 함수 시작
        const input = inputRef.current; // 입력창
        const start = input?.selectionStart ?? text.length; // 선택 시작
        const end = input?.selectionEnd ?? text.length; // 선택 끝
        const selected = text.slice(start, end); // 선택 글자
        const next = `${text.slice(0, start)}*${selected}*${text.slice(end)}`; // 별표 감싸기
        setText(next.slice(0, CHAT_MESSAGE_MAX_LENGTH)); // 반영
        window.requestAnimationFrame(() => // 커서 위치
        { // 처리 시작
            input?.focus(); // 초점
            const caret = selected.length === 0 ? start + 1 : end + 2; // 빈 지문은 별표 사이
            input?.setSelectionRange(caret, caret); // 커서 이동
        }); // 처리 종료
    }; // 함수 종료
    useEffect(() => // 입력 단축키(Alt+S 추천, Alt+8 지문)
    { // 효과 시작
        const handleKey = (event: globalThis.KeyboardEvent) => // 키 처리
        { // 처리 시작
            if (!event.altKey || event.ctrlKey || event.metaKey || busy) // Alt 조합 아님
            { // 조건 시작
                return; // 생략
            } // 조건 종료
            if (event.key.toLowerCase() === "s") // 추천 답변
            { // 조건 시작
                event.preventDefault(); // 기본 동작 차단
                toggleSuggestions(); // 열고 닫기
            } // 조건 종료
            else if (event.key === "8" || event.key === "*") // 지문
            { // 조건 시작
                event.preventDefault(); // 기본 동작 차단
                insertAction(); // 지문 넣기
            } // 조건 종료
        }; // 처리 종료
        window.addEventListener("keydown", handleKey); // 구독
        return () => window.removeEventListener("keydown", handleKey); // 해제
    }); // 매 렌더 갱신
    useEffect(() => // 명령어 메뉴 첫 항목 초점
    { // 효과 시작
        if (commandOpen) // 열림
        { // 조건 시작
            commandRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus(); // 첫 항목
        } // 조건 종료
    }, [commandOpen]); // 열림 의존
    const submit = async (event?: FormEvent) => // 전송 처리
    { // 함수 시작
        event?.preventDefault(); // 기본 제출 차단
        const content = text.trim(); // 입력 정리
        if (content.length === 0 || busy) // 빈 입력·응답 중
        { // 조건 시작
            return; // 전송 중단
        } // 조건 종료
        const member = storyCast?.find((item) => item.characterId === target); // 고른 상대
        setText(""); // 입력 초기화
        setSuggestions(null); // 추천 닫기
        await onSend(member === undefined || content.startsWith("@") ? content : addressText(member, content)); // 메시지 전송(상대가 있으면 @이름 붙임)
    }; // 함수 종료
    const handleInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => // 입력창 키 처리
    { // 함수 시작
        if (event.nativeEvent.isComposing) // 한글 조합 중
        { // 조건 시작
            return; // 조합 유지
        } // 조건 종료
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) // 전송 판정
        { // 조건 시작
            event.preventDefault(); // 줄바꿈 대신
            void submit(); // 전송
        } // 조건 종료
        else if (event.key === "/" && text.length === 0 && commands.length > 0) // 명령어 판정
        { // 조건 시작
            event.preventDefault(); // 글자 입력 대신
            setCommandOpen(true); // 메뉴 열기
        } // 조건 종료
    }; // 함수 종료
    const handleCommandKey = (event: KeyboardEvent<HTMLDivElement>) => // 명령어 메뉴 키 처리
    { // 함수 시작
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']")); // 항목
        const index = items.indexOf(document.activeElement as HTMLElement); // 현재 위치
        if (event.key === "Escape") // 닫기
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            setCommandOpen(false); // 닫기
            inputRef.current?.focus(); // 입력창으로
        } // 조건 종료
        else if (event.key === "ArrowDown" || event.key === "ArrowUp") // 이동
        { // 조건 시작
            event.preventDefault(); // 스크롤 차단
            items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); // 순환 이동
        } // 조건 종료
    }; // 함수 종료
    return ( // 입력 반환
        <> {/* 입력 묶음 */}
            {storyCast === undefined ? null : ( // 스토리 조작 판정
                <div className={styles.storyControls}> {/* 스토리 조작 */}
                    <label>말 걸 상대<select aria-label="말 걸 상대" value={target} disabled={busy} onChange={(event) => setTarget(event.target.value)}><option value="all">전체</option>{storyCast.map((member) => <option key={member.characterId} value={member.characterId}>{member.displayName}</option>)}</select></label> {/* 상대 선택 */}
                    <button type="button" className={styles.continueButton} disabled={busy || onContinue === undefined} onClick={() => void onContinue?.()}>이야기 진행</button> {/* 이야기 진행 */}
                </div> // 스토리 조작 종료
            )} {/* 스토리 조작 판정 종료 */}
            {suggestions === null ? null : ( // 추천 답변 판정
                <div className={styles.suggestions} role="group" aria-label="추천 답변"> {/* 추천 답변 */}
                    {suggestions.map((item) => <button key={item} type="button" onClick={() => { setText(item); setSuggestions(null); inputRef.current?.focus(); }}>{item}</button>)} {/* 추천 */}
                </div> // 추천 종료
            )} {/* 추천 판정 종료 */}
            {!commandOpen ? null : ( // 명령어 판정
                <div ref={commandRef} className={styles.commandMenu} role="menu" aria-label="명령어" onKeyDown={handleCommandKey}> {/* 명령어 */}
                    {commands.map((command) => <button key={command.id} type="button" role="menuitem" onClick={() => { setCommandOpen(false); command.run(); }}><strong>{command.label}</strong><small>{command.description}</small></button>)} {/* 명령 */}
                </div> // 명령어 종료
            )} {/* 명령어 판정 종료 */}
            <form onSubmit={submit}> {/* 전송 양식 */}
                <label><span className="sr-only">메시지</span><textarea ref={inputRef} value={text} maxLength={CHAT_MESSAGE_MAX_LENGTH} onChange={(event) => setText(event.target.value)} onKeyDown={handleInputKey} placeholder={storyCast === undefined ? "이야기를 이어가세요 (/ 명령어)" : "대사나 행동을 적어 상황극을 이어가세요 (/ 명령어)"} disabled={busy} /></label> {/* 메시지 입력 */}
                {busy ? <button type="button" onClick={onCancel}>응답 중단</button> : <button type="submit" disabled={text.trim().length === 0}>전송</button>} {/* 요청 제어 버튼 */}
            </form> {/* 양식 종료 */}
            <div className={styles.composerTools}> {/* 입력 보조 */}
                <button type="button" aria-label="지문 넣기" title="지문(*행동*) 넣기 · Alt+8" disabled={busy} onClick={insertAction}>*</button> {/* 지문 */}
                <button type="button" aria-label="명령어 열기" title="명령어 · 빈 입력창에서 /" aria-expanded={commandOpen} disabled={busy || commands.length === 0} onClick={() => setCommandOpen(!commandOpen)}>/</button> {/* 명령어 */}
                <button type="button" className={styles.suggestButton} aria-expanded={suggestions !== null} disabled={busy || getSuggestions === undefined} onClick={toggleSuggestions}>추천답변</button> {/* 추천 답변 */}
            </div> {/* 보조 종료 */}
        </> // 입력 묶음 종료
    ); // 반환 종료
} // 함수 종료
