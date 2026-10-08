"use client"; // 클라이언트 컴포넌트

import { useState, type FormEvent, type KeyboardEvent } from "react"; // 리액트 도구
import { ChatController } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { ChatDialog } from "@chatbot/features/chat/ChatDialog"; // 대화상자
import { matchLore } from "@chatbot/features/chat/lore-model"; // 키워드가 나온 설정 찾기
import { MessageList } from "@chatbot/features/chat/MessageList"; // 메시지 목록
import { StatusPanel } from "@chatbot/features/chat/StatusPanel"; // 상태창
import { getConversationVersion, getVersionMessages } from "@chatbot/features/conversation/conversation-versioning"; // 버전 조회
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { getStoryCastEntries } from "@chatbot/features/story/story-model"; // 등장인물과 캐릭터
import type { LLMAdapter } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색
import panels from "@chatbot/features/chat/ChatPanels.module.css"; // 대화상자 버튼 스타일
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export const TEST_CHAT_TURN_LIMIT = 10; // 시험 대화 최대 턴
export const TEST_CHAT_BALANCE = 99_999; // 시험 대화용 가짜 잔액(실제 지갑은 건드리지 않음)

export interface TestChatSession // 시험 대화 준비물(저장하지 않는 임시 상태)
{ // 구조 시작
    state: AppState; // 지금 초안을 넣은 임시 상태
    conversationId: string; // 임시 대화
} // 구조 종료

interface TestChatProps // 시험 대화 속성
{ // 구조 시작
    title: string; // 작품 이름
    tags: string[]; // 작품 태그(색)
    start(): TestChatSession; // 임시 대화 만들기
    onClose(): void; // 닫기
    llm?: LLMAdapter; // 대화 어댑터(테스트용)
} // 구조 종료

export function TestChat({ title, tags, start, onClose, llm }: TestChatProps) // 저장하기 전 지금 초안으로 해 보는 대화(기록·토큰 없음)
{ // 함수 시작
    const create = () => // 임시 대화와 제어기 만들기
    { // 함수 시작
        const session = start(); // 임시 상태
        return { conversationId: session.conversationId, controller: new ChatController({ state: session.state, conversationId: session.conversationId, llm: llm ?? new MockLLMAdapter(), images: new MockImageAdapter() }) }; // 제어기 반환
    }; // 함수 종료
    const [session, setSession] = useState(create); // 임시 대화
    const [snapshot, setSnapshot] = useState(() => session.controller.snapshot()); // 화면 상태
    const [streaming, setStreaming] = useState<string | null>(null); // 스트리밍 메시지
    const [busy, setBusy] = useState(false); // 응답 중
    const [text, setText] = useState(""); // 입력
    const conversation = snapshot.conversations.find((item) => item.id === session.conversationId); // 임시 대화
    const version = conversation === undefined ? null : getConversationVersion(snapshot, conversation.id); // 현재 버전
    const messages = conversation === undefined || version === null ? [] : getVersionMessages(snapshot, conversation.id, version.id); // 메시지
    const turns = messages.filter((message) => message.role === "user").length; // 진행한 턴
    const full = turns >= TEST_CHAT_TURN_LIMIT; // 한도 도달
    const lorebook = (conversation === undefined ? undefined : conversation.mode === "story" ? snapshot.stories.find((story) => story.id === conversation.storyId) : snapshot.characters.find((character) => character.id === conversation.characterId))?.lorebook ?? []; // 이 작품의 설정집
    const lastUser = messages.map((message) => message.role).lastIndexOf("user"); // 마지막으로 보낸 말
    const usedLore = lastUser < 0 ? [] : matchLore(lorebook, messages.slice(0, lastUser + 1)); // 마지막 답변에 넘긴 설정(보낸 말까지의 최근 대화 기준)
    const send = async (event?: FormEvent) => // 보내기
    { // 함수 시작
        event?.preventDefault(); // 기본 제출 차단
        const content = text.trim(); // 입력 정리
        if (content.length === 0 || busy || full) // 빈 입력·응답 중·한도
        { // 조건 시작
            return; // 중단
        } // 조건 종료
        setText(""); // 입력 비움
        setBusy(true); // 응답 시작
        try // 전송 시도
        { // 시도 시작
            await session.controller.sendMessage(content, (progress) => { setSnapshot(progress.state); setStreaming(progress.phase === "assistant" ? progress.messageId : null); }); // 응답 받기
        } // 시도 종료
        catch // 응답 실패
        { // 실패 시작
            // 시험 대화라 따로 다시 시도하지 않음
        } // 실패 종료
        finally // 정리
        { // 정리 시작
            setSnapshot(session.controller.snapshot()); // 최종 상태
            setStreaming(null); // 스트리밍 해제
            setBusy(false); // 응답 종료
        } // 정리 종료
    }; // 함수 종료
    const restart = () => // 처음부터 다시
    { // 함수 시작
        const next = create(); // 새 임시 대화
        setSession(next); // 교체
        setSnapshot(next.controller.snapshot()); // 화면 갱신
        setText(""); // 입력 비움
    }; // 함수 종료
    const handleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => // Enter로 보내기
    { // 함수 시작
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) // 전송 판정
        { // 조건 시작
            event.preventDefault(); // 줄바꿈 대신
            void send(); // 보내기
        } // 조건 종료
    }; // 함수 종료
    return ( // 대화상자 반환
        <ChatDialog title={t("{0} 시험 대화", [title])} description={t("저장하기 전에 지금 내용으로 대화해 봐요. 기록이 남지 않고 토큰을 쓰지 않아요.")} onClose={onClose} wide footer={<><span className={styles.testTurns}>{turns}/{TEST_CHAT_TURN_LIMIT}{t("턴")}</span><button type="button" className={panels.secondaryButton} disabled={busy || turns === 0} onClick={restart}>{t("처음부터 다시")}</button><button type="button" className={panels.secondaryButton} onClick={onClose}>{t("닫기")}</button></>}> {/* 시험 대화 */}
            <div className={styles.testChat} data-genre={getGenreKey(tags)}> {/* 대화 영역 */}
                <MessageList messages={messages} streamingMessageId={streaming} busy={busy} showSceneImages storyCast={conversation?.mode === "story" ? getStoryCastEntries(snapshot, conversation.storyCast) : undefined} /> {/* 메시지 */}
                <StatusPanel messages={messages} open onToggle={() => undefined} /> {/* 상태창(스탯·칭호·그래프) */}
                <form className={styles.testForm} onSubmit={send}> {/* 입력(안내와 함께 늘 보이게 아래에 붙임) */}
                    {lorebook.length === 0 || turns === 0 ? null : <p className={styles.testLore}>{usedLore.length === 0 ? t("이번 답변에는 설정집을 쓰지 않았어요. 최근 대화에 키워드가 나오지 않았어요.") : <>{t("이번 답변에 참고한 설정:")} <strong>{usedLore.map((entry) => entry.title).join(", ")}</strong></>}</p>} {/* 쓰인 설정(제작자만 보는 확인용) */}
                    {full ? <p className={styles.testLore}>{t("시험 대화는")} {TEST_CHAT_TURN_LIMIT}{t("턴까지예요. ‘처음부터 다시’로 새로 해 볼 수 있어요.")}</p> : null} {/* 한도 안내 */}
                    <label><span className="sr-only">{t("시험 메시지")}</span><textarea value={text} rows={2} placeholder={t("시험해 볼 말을 적어 보세요")} disabled={busy || full} onChange={(event) => setText(event.target.value)} onKeyDown={handleKey} /></label> {/* 시험 메시지 */}
                    <button type="submit" className={panels.primaryButton} disabled={busy || full || text.trim().length === 0}>{t("보내기")}</button> {/* 보내기 */}
                </form> {/* 입력 종료 */}
            </div> {/* 대화 영역 종료 */}
        </ChatDialog> // 시험 대화 종료
    ); // 반환 종료
} // 함수 종료
