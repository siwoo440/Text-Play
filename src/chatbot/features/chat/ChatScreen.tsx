"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect, useRef, useState } from "react"; // 리액트 도구
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { isCharacterLocked } from "@chatbot/features/adult/adult-access"; // 19세 잠금 판정
import { AdultContentGate } from "@chatbot/features/adult/AdultContentGate"; // 19세 잠금 화면
import { useRouter } from "@/desktop/next-compat/navigation"; // 경로 이동 도구
import { ChatComposer } from "@chatbot/features/chat/ChatComposer"; // 채팅 입력
import { ChatController, type ChatProgress, type EditMessageResult, type SendResult } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { LayoutSelector } from "@chatbot/features/chat/LayoutSelector"; // 레이아웃 선택기
import { MessageList } from "@chatbot/features/chat/MessageList"; // 메시지 목록
import { SceneViewer } from "@chatbot/features/chat/SceneViewer"; // 장면 보기
import { createConversationHref, ensureConversationForCharacter, resolveConversationRoute } from "@chatbot/features/character/character-detail-model"; // 대화 준비
import { getConversationVersion, getMessageVersionGroup, getVersionMessages, removeVersionTree } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 함수
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import type { AppState, Message } from "@chatbot/features/core/types"; // 앱 타입
import { recommendLayout } from "@chatbot/features/chat/layout-resolver"; // 레이아웃 추천
import type { ImageGenerationAdapter } from "@chatbot/lib/adapters/image-generation-adapter"; // 이미지 계약
import type { LLMAdapter } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화
import styles from "@chatbot/features/chat/ChatScreen.module.css"; // 채팅 스타일

interface ChatScreenProps // 채팅 화면 속성
{ // 구조 시작
    characterId: string; // 캐릭터 식별자
    initialConversationId?: string; // 초기 대화 식별자
    initialVersionId?: string; // 초기 버전 식별자
    llm?: LLMAdapter; // 대화 어댑터
    images?: ImageGenerationAdapter; // 이미지 어댑터
} // 구조 종료

export function ChatScreen(props: ChatScreenProps) // 채팅 화면
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const character = state.characters.find((item) => item.id === props.characterId); // 대화 캐릭터 조회
    if (character === undefined) // 캐릭터 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="CHARACTER NOT FOUND" title="대화할 캐릭터를 찾을 수 없습니다" description="주소가 잘못되었거나 이 브라우저에서 삭제된 캐릭터입니다. 탐색 화면에서 다른 캐릭터를 골라 주세요."> {/* 부재 안내 */}
                <Link href="/">메인으로 이동</Link> {/* 메인 링크 */}
                <Link href={"/library" as Route}>보관함 열기</Link> {/* 보관함 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (isCharacterLocked(character, state, new Date())) // 19세 잠금 판정
    { // 조건 시작
        return <AdultContentGate character={character} target="chat" />; // 잠금 화면 반환
    } // 조건 종료
    return <ChatConversationScreen {...props} />; // 대화 화면 반환
} // 함수 종료

function ChatConversationScreen({ characterId, initialConversationId, initialVersionId, llm, images }: ChatScreenProps) // 대화 화면
{ // 함수 시작
    const { state, dispatch, createBackup, commitState } = useAppStore(); // 앱 상태
    const router = useRouter(); // 경로 이동기
    const [prepared] = useState(() => // 초기 대화 준비
    { // 초기화 시작
        const base = ensureConversationForCharacter(state, characterId); // 기본 대화 준비
        const route = resolveConversationRoute(base.state, characterId, initialConversationId, initialVersionId); // 주소 대화 선택
        const routedState = appReducer(base.state, { type: "select-conversation-version", conversationId: route.conversation.id, versionId: route.version.id }); // 선택 버전 적용
        const created = !state.conversations.some((conversation) => conversation.id === route.conversation.id); // 이 화면에서 새로 만든 대화 여부
        return { ...base, state: routedState, conversation: route.conversation, version: route.version, href: route.canonicalHref, recovered: route.recovered, created }; // 준비 결과 반환
    }); // 초기화 종료
    const allowCreate = useRef(prepared.created); // 새 대화 첫 저장 허용
    const latestGlobalState = useRef(state); // 최신 전역 상태
    useEffect(() => // 전역 상태 기록 효과
    { // 효과 시작
        latestGlobalState.current = state; // 최신 상태 기록
    }, [state]); // 전역 상태 의존
    const [controller] = useState(() => new ChatController({ state: prepared.state, conversationId: prepared.conversation.id, llm: llm ?? new MockLLMAdapter(), images: images ?? new MockImageAdapter() })); // 제어기 생성
    const [snapshot, setSnapshot] = useState(prepared.state); // 화면 상태
    const [busy, setBusy] = useState(false); // 응답 상태
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null); // 스트리밍 메시지
    const [notice, setNotice] = useState(""); // 상태 안내
    const [retryAvailable, setRetryAvailable] = useState(false); // 재시도 가능 상태
    const replaceRoute = router.replace; // 주소 교체 함수
    useEffect(() => // 초기 주소 정규화
    { // 효과 시작
        if (prepared.recovered) // 복구 주소 판정
        { // 조건 시작
            replaceRoute(prepared.href as Route, { scroll: false }); // 정규 주소 적용
        } // 조건 종료
    }, [prepared.href, prepared.recovered, replaceRoute]); // 효과 의존성
    const character = snapshot.characters.find((item) => item.id === characterId); // 캐릭터 조회
    const conversation = snapshot.conversations.find((item) => item.id === prepared.conversation.id); // 대화 조회
    const version = conversation === undefined ? null : getConversationVersion(snapshot, conversation.id); // 현재 버전 조회
    if (character === undefined || conversation === undefined || version === null) // 데이터 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="CONVERSATION NOT FOUND" title="대화를 찾을 수 없습니다" description="삭제되었거나 더 이상 열 수 없는 대화입니다. 보관함에서 다른 대화를 이어가 주세요."> {/* 부재 안내 */}
                <Link href={"/library" as Route}>보관함 열기</Link> {/* 보관함 링크 */}
                <Link href="/">메인으로 이동</Link> {/* 메인 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    const width = typeof window === "undefined" ? 1440 : window.innerWidth; // 화면 너비
    const height = typeof window === "undefined" ? 900 : window.innerHeight; // 화면 높이
    const layout = state.settings.layoutId ?? recommendLayout({ width, height, platformMode: state.settings.platformMode, layoutId: null }); // 현재 레이아웃
    const createMergeAction = (nextState: AppState) => ({ type: "merge-chat-state" as const, conversationId: prepared.conversation.id, state: nextState, allowCreate: allowCreate.current }); // 채팅 상태 병합 동작 생성
    const publish = (nextState: AppState) => // 전역 상태 반영
    { // 함수 시작
        dispatch(createMergeAction(nextState)); // 왼쪽 창 변경을 지키며 전역 반영
        allowCreate.current = false; // 첫 저장 이후 재생성 차단
    }; // 함수 종료
    const sync = () => // 상태 동기화
    { // 함수 시작
        const nextState = controller.snapshot(); // 제어 상태 조회
        setSnapshot(nextState); // 화면 상태 갱신
        publish(nextState); // 전역 상태 반영
    }; // 함수 종료
    const applyControllerState = (nextState: AppState) => // 제어 상태 적용
    { // 함수 시작
        controller.replaceState(nextState); // 제어기 상태 교체
        setSnapshot(nextState); // 화면 상태 갱신
        publish(nextState); // 전역 상태 반영
    }; // 함수 종료
    const runRequest = async (request: (onProgress: (progress: ChatProgress) => void) => Promise<SendResult>) => // 응답 요청 실행
    { // 함수 시작
        setBusy(true); // 응답 상태 시작
        setNotice(""); // 기존 안내 해제
        setRetryAvailable(false); // 재시도 상태 해제
        const updateProgress = (progress: ChatProgress) => // 진행 상태 처리
        { // 처리 시작
            setSnapshot(progress.state); // 부분 상태 반영
            setStreamingMessageId(progress.phase === "assistant" ? progress.messageId : null); // 스트리밍 상태 반영
        }; // 처리 종료
        try // 메시지 전송 시도
        { // 시도 시작
            const result = await request(updateProgress); // 제어기 요청
            sync(); // 상태 동기화
            setNotice(result.ok ? "" : result.reason === "cancelled" ? "응답을 중단했습니다." : result.reason === "insufficient-token" ? "토큰이 부족합니다." : "메시지를 전송하지 못했습니다."); // 안내 갱신
        } // 시도 종료
        catch // 응답 실패 처리
        { // 실패 시작
            sync(); // 부분 상태 동기화
            setRetryAvailable(true); // 재시도 상태 설정
            setNotice("응답을 받지 못했습니다. 다시 시도해 주세요."); // 실패 안내
        } // 실패 종료
        finally // 응답 상태 정리
        { // 정리 시작
            setStreamingMessageId(null); // 스트리밍 상태 해제
            setBusy(false); // 응답 상태 종료
        } // 정리 종료
    }; // 함수 종료
    const send = async (text: string) => // 메시지 전송
    { // 함수 시작
        await runRequest((onProgress) => controller.sendMessage(text, onProgress)); // 새 메시지 요청
    }; // 함수 종료
    const regenerate = async () => // 응답 다시 생성
    { // 함수 시작
        await runRequest((onProgress) => controller.regenerateLastReply(onProgress)); // 마지막 응답 요청
    }; // 함수 종료
    const editMessage = async (messageId: string, text: string): Promise<EditMessageResult> => // 메시지 수정
    { // 함수 시작
        const originalState = controller.snapshot(); // 수정 전 상태 보존
        setBusy(true); // 응답 상태 시작
        setNotice(""); // 기존 안내 해제
        const updateProgress = (progress: ChatProgress) => // 수정 진행 처리
        { // 처리 시작
            setSnapshot(progress.state); // 임시 상태 반영
            setStreamingMessageId(progress.phase === "assistant" ? progress.messageId : null); // 스트리밍 표시 반영
        }; // 처리 종료
        try // 수정 요청 시도
        { // 시도 시작
            const result = await controller.editUserMessage(messageId, text, updateProgress); // 수정 요청 실행
            if (result.ok) // 수정 성공 판정
            { // 조건 시작
                const nextState = controller.snapshot(); // 수정 상태 조회
                if (!commitState(appReducer(latestGlobalState.current, createMergeAction(nextState)))) // 저장 실패 판정
                { // 실패 시작
                    controller.replaceState(originalState); // 제어 상태 복원
                    setSnapshot(originalState); // 화면 상태 복원
                    setNotice("저장하지 못해 원본 대화를 유지했습니다."); // 저장 실패 안내
                    return { ok: false, reason: "storage-failed" }; // 저장 실패 반환
                } // 실패 종료
                allowCreate.current = false; // 첫 저장 이후 재생성 차단
                setSnapshot(nextState); // 확정 화면 반영
                replaceRoute(createConversationHref(characterId, conversation.id, result.versionId) as Route, { scroll: false }); // 새 버전 주소 적용
            } // 조건 종료
            else // 수정 실패 판정
            { // 실패 시작
                sync(); // 원본 상태 동기화
            } // 실패 종료
            setNotice(result.ok ? "새 대화 버전을 만들었습니다." : result.reason === "cancelled" ? "수정 응답을 중단했습니다." : "메시지를 수정하지 못했습니다."); // 수정 안내 갱신
            return result; // 수정 결과 반환
        } // 시도 종료
        catch (error) // 수정 실패 처리
        { // 실패 시작
            sync(); // 원본 상태 복원
            setNotice("수정 응답을 만들지 못했습니다."); // 실패 안내
            throw error; // 오류 전달
        } // 실패 종료
        finally // 수정 정리
        { // 정리 시작
            setStreamingMessageId(null); // 스트리밍 상태 해제
            setBusy(false); // 응답 상태 종료
        } // 정리 종료
    }; // 함수 종료
    const deleteMessage = (message: Message) => // 메시지 삭제
    { // 함수 시작
        if (!window.confirm("이 메시지를 현재 대화 버전에서 삭제할까요?")) // 삭제 확인 판정
        { // 조건 시작
            return; // 삭제 취소
        } // 조건 종료
        if (!createBackup("message-delete")) // 백업 실패 판정
        { // 조건 시작
            setNotice("백업하지 못해 메시지 삭제를 중단했습니다."); // 백업 오류 안내
            return; // 삭제 중단
        } // 조건 종료
        const currentState = controller.snapshot(); // 삭제 전 상태 조회
        const nextState = appReducer(currentState, { type: "delete-version-message", versionId: version.id, messageId: message.id }); // 메시지 삭제 상태 생성
        if (nextState === currentState) // 마지막 메시지 삭제 차단 판정
        { // 조건 시작
            setNotice("대화 버전의 마지막 메시지는 삭제할 수 없습니다."); // 삭제 차단 안내
            return; // 삭제 중단
        } // 조건 종료
        applyControllerState(nextState); // 삭제 상태 적용
        const versionRemoved = !nextState.conversationVersions.some((item) => item.id === version.id); // 분기 버전 삭제 판정
        const nextConversation = nextState.conversations.find((item) => item.id === conversation.id); // 삭제 후 대화 조회
        if (nextConversation !== undefined && nextConversation.currentVersionId !== version.id) // 원본 복귀 판정
        { // 조건 시작
            replaceRoute(createConversationHref(characterId, nextConversation.id, nextConversation.currentVersionId) as Route, { scroll: false }); // 복귀 주소 적용
        } // 조건 종료
        setNotice(versionRemoved ? "분기 기준 메시지와 해당 버전을 삭제했습니다." : "현재 버전에서 메시지를 삭제했습니다."); // 삭제 안내
    }; // 함수 종료
    const selectVersion = (versionId: string, direction: "previous" | "next") => // 대화 버전 선택
    { // 함수 시작
        const nextState = appReducer(controller.snapshot(), { type: "select-conversation-version", conversationId: conversation.id, versionId }); // 선택 상태 생성
        applyControllerState(nextState); // 선택 상태 적용
        replaceRoute(createConversationHref(characterId, conversation.id, versionId) as Route, { scroll: false }); // 선택 주소 적용
        const focusLabel = direction === "previous" ? "이전 대화 버전" : "다음 대화 버전"; // 포커스 이름 결정
        window.setTimeout(() => (document.querySelector(`[aria-label="${focusLabel}"]`) as HTMLButtonElement | null)?.focus(), 0); // 전환 버튼 포커스 복원
    }; // 함수 종료
    const deleteVersion = (versionId: string) => // 대화 버전 삭제
    { // 함수 시작
        const preview = removeVersionTree(controller.snapshot(), conversation.id, versionId); // 삭제 범위 계산
        if (!window.confirm(`현재 수정 버전과 하위 버전 ${preview.versionCount}개, 메시지 ${preview.messageCount}개를 삭제할까요?`)) // 삭제 확인 판정
        { // 조건 시작
            return; // 삭제 취소
        } // 조건 종료
        if (!createBackup("version-delete")) // 백업 실패 판정
        { // 조건 시작
            setNotice("백업하지 못해 버전 삭제를 중단했습니다."); // 백업 오류 안내
            return; // 삭제 중단
        } // 조건 종료
        applyControllerState(preview.state); // 삭제 상태 적용
        const nextConversation = preview.state.conversations.find((item) => item.id === conversation.id); // 다음 대화 조회
        if (nextConversation !== undefined) // 다음 대화 존재 판정
        { // 조건 시작
            replaceRoute(createConversationHref(characterId, nextConversation.id, nextConversation.currentVersionId) as Route, { scroll: false }); // 복구 주소 적용
        } // 조건 종료
        setNotice("수정 대화 버전을 삭제했습니다."); // 삭제 안내
    }; // 함수 종료
    const cancel = () => // 응답 중단
    { // 함수 시작
        controller.cancelReply(); // 활성 요청 중단
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
                <SceneViewer src={version.currentScene} name={character.name} /> {/* 현재 장면 */}
                <button type="button" onClick={generateScene}>장면 이미지 생성 · 20</button> {/* 이미지 버튼 */}
            </section> {/* 장면 종료 */}
            <section className={styles.story}> {/* 대화 영역 */}
                <header><div><span>{version.relationshipStage}</span><h1>{character.name}</h1></div><div><span>{version.emotion}</span><strong>{snapshot.wallet.balance} 토큰</strong></div></header> {/* 캐릭터 상태 */}
                <MessageList messages={getVersionMessages(snapshot, conversation.id, version.id)} streamingMessageId={streamingMessageId} busy={busy} allowRegenerate={!busy && !retryAvailable} onRegenerate={regenerate} getVersionGroup={(message) => getMessageVersionGroup(snapshot, version.id, message.id)} onEdit={editMessage} onDelete={deleteMessage} onSelectVersion={selectVersion} onDeleteVersion={deleteVersion} /> {/* 메시지 목록 */}
                <p role="status">{notice}</p> {/* 상태 안내 */}
                {retryAvailable ? <div className={styles.requestActions}><button type="button" onClick={regenerate}>다시 시도</button></div> : null} {/* 재시도 영역 */}
                <ChatComposer busy={busy} onSend={send} onCancel={cancel} /> {/* 메시지 입력 */}
            </section> {/* 대화 종료 */}
            <aside className={styles.controls}> {/* 화면 설정 */}
                <h2>화면 배치</h2> {/* 설정 제목 */}
                <LayoutSelector width={width} height={height} /> {/* 레이아웃 선택 */}
                <p>관계 {version.relationshipLevel}/100</p> {/* 관계 수치 */}
            </aside> {/* 설정 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
