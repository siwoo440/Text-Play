"use client"; // 클라이언트 컴포넌트

import { useMemo, useState } from "react"; // 리액트 도구
import { ChatComposer } from "@/features/chat/ChatComposer"; // 채팅 입력
import { ChatController } from "@/features/chat/chat-controller"; // 채팅 제어기
import { LayoutSelector } from "@/features/chat/LayoutSelector"; // 레이아웃 선택기
import { MessageList } from "@/features/chat/MessageList"; // 메시지 목록
import { SceneViewer } from "@/features/chat/SceneViewer"; // 장면 보기
import { ensureConversationForCharacter } from "@/features/character/CharacterDetail"; // 대화 준비
import { useAppStore } from "@/features/core/AppProvider"; // 앱 저장소
import { recommendLayout } from "@/features/chat/layout-resolver"; // 레이아웃 추천
import { MockImageAdapter } from "@/lib/adapters/mock-image-adapter"; // Mock 이미지
import { createLLMAdapter } from "@/lib/adapters/create-llm-adapter"; // 공통 LLM 생성기
import styles from "@/features/chat/ChatScreen.module.css"; // 채팅 스타일

export function ChatScreen({ characterId }: { characterId: string }) // 채팅 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const prepared = useMemo(() => ensureConversationForCharacter(state, characterId), [characterId, state]); // 대화 준비
    const [llmSelection] = useState(() => createLLMAdapter()); // 공통 LLM 선택
    const [controller] = useState(() => new ChatController({ state: prepared.state, conversationId: prepared.conversation.id, llm: llmSelection.adapter, images: new MockImageAdapter() })); // 제어기 생성
    const [snapshot, setSnapshot] = useState(prepared.state); // 화면 상태
    const [busy, setBusy] = useState(false); // 응답 상태
    const [notice, setNotice] = useState(""); // 상태 안내
    const character = snapshot.characters.find((item) => item.id === characterId); // 캐릭터 조회
    const conversation = snapshot.conversations.find((item) => item.id === prepared.conversation.id); // 대화 조회
    if (character === undefined || conversation === undefined) // 데이터 부재 판정
    { // 조건 시작
        return <main><h1>대화를 찾을 수 없습니다.</h1></main>; // 오류 화면
    } // 조건 종료
    const width = typeof window === "undefined" ? 1440 : window.innerWidth; // 화면 너비
    const height = typeof window === "undefined" ? 900 : window.innerHeight; // 화면 높이
    const layout = state.settings.layoutId ?? recommendLayout({ width, height, platformMode: state.settings.platformMode, layoutId: null }); // 현재 레이아웃
    const sync = () => // 상태 동기화
    { // 함수 시작
        const nextState = controller.snapshot(); // 제어 상태 조회
        setSnapshot(nextState); // 화면 상태 갱신
        dispatch({ type: "replace-state", state: nextState }); // 전역 상태 갱신
    }; // 함수 종료
    const send = async (text: string) => // 메시지 전송
    { // 함수 시작
        setBusy(true); // 응답 상태 시작
        const result = await controller.sendMessage(text); // 제어기 전송
        sync(); // 상태 동기화
        setBusy(false); // 응답 상태 종료
        setNotice(result.ok ? "" : result.reason === "insufficient-token" ? "토큰이 부족합니다." : "메시지를 전송하지 못했습니다."); // 안내 갱신
    }; // 함수 종료
    const generateScene = async () => // 수동 장면 생성
    { // 함수 시작
        const result = await controller.generateManualScene(); // 장면 생성
        sync(); // 상태 동기화
        setNotice(result.ok ? "새 장면을 만들었습니다." : result.reason === "insufficient-token" ? "이미지를 만들 토큰이 부족합니다." : "장면을 만들지 못했습니다."); // 안내 갱신
    }; // 함수 종료
    return ( // 채팅 반환
        <main className={styles.chat} data-layout={layout}> {/* 채팅 본문 */}
            <section className={styles.scene}> {/* 장면 영역 */}
                <SceneViewer src={conversation.currentScene} name={character.name} /> {/* 현재 장면 */}
                <button type="button" onClick={generateScene}>장면 이미지 생성 · 20</button> {/* 이미지 버튼 */}
            </section> {/* 장면 종료 */}
            <section className={styles.story}> {/* 대화 영역 */}
                <header><div><span>{conversation.relationshipStage}</span><h1>{character.name}</h1></div><div><span>{conversation.emotion}</span><span aria-label="AI 연결">{llmSelection.label}</span><strong>{snapshot.wallet.balance} 토큰</strong></div></header> {/* 캐릭터 상태 */}
                <MessageList messages={snapshot.messages.filter((message) => message.conversationId === conversation.id)} /> {/* 메시지 목록 */}
                <p role="status">{notice}</p> {/* 상태 안내 */}
                <ChatComposer busy={busy} onSend={send} /> {/* 메시지 입력 */}
            </section> {/* 대화 종료 */}
            <aside className={styles.controls}> {/* 화면 설정 */}
                <h2>화면 배치</h2> {/* 설정 제목 */}
                <LayoutSelector width={width} height={height} /> {/* 레이아웃 선택 */}
                <p>관계 {conversation.relationshipLevel}/100</p> {/* 관계 수치 */}
            </aside> {/* 설정 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
