"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"; // 리액트 도구
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { isCharacterLocked } from "@chatbot/features/adult/adult-access"; // 19세 잠금 판정
import { AdultContentGate } from "@chatbot/features/adult/AdultContentGate"; // 19세 잠금 화면
import { useRouter } from "@/desktop/next-compat/navigation"; // 경로 이동 도구
import { ChatComposer, type ComposerCommand } from "@chatbot/features/chat/ChatComposer"; // 채팅 입력
import { buildChatContext } from "@chatbot/features/chat/chat-context"; // 대화 맥락
import { getChatFontFamily, getChatFontSize, loadChatFont } from "@chatbot/features/chat/chat-fonts"; // 채팅 글꼴
import { getMessageCost } from "@chatbot/features/chat/chat-tiers"; // 메시지 비용
import { getVersionDeleteConfirmText } from "@chatbot/features/chat/version-delete-text"; // 버전 삭제 확인 문구
import { ChatSettingsPanel, type ChatDialogId } from "@chatbot/features/chat/ChatSettingsPanel"; // 채팅방 설정 패널
import { buildAutoMemories } from "@chatbot/features/chat/memory-model"; // 자동 요약 메모리
import { StatusPanel } from "@chatbot/features/chat/StatusPanel"; // 고정 상태창
import { ReviewBar } from "@chatbot/features/chat/ReviewBar"; // 대화 다시 보기
import { messageAnchor } from "@chatbot/features/chat/review-model"; // 메시지 표식
import { SceneCardDialog } from "@chatbot/features/chat/SceneCardDialog"; // 명장면 카드
import { fromRelationLevel, getRelationStat } from "@chatbot/features/chat/relation-model"; // 관계 스탯
import { AFFECTION_STAT_ID, currentStatValues, formatStatValue } from "@chatbot/features/chat/stat-model"; // 스탯 초기값·표시
import { getStatusPeople } from "@chatbot/features/chat/status-model"; // 상태창 인물
import { createSuggestedReplies } from "@chatbot/features/chat/suggestion-model"; // 추천 답변
import { TierSelector } from "@chatbot/features/chat/TierSelector"; // 모델 등급 선택
import { ChatController, type ChatProgress, type EditMessageResult, type SendResult } from "@chatbot/features/chat/chat-controller"; // 채팅 제어기
import { MessageList } from "@chatbot/features/chat/MessageList"; // 메시지 목록
import { ensureConversationForCharacter, getCharacterDetailProfile, resolveConversationRoute } from "@chatbot/features/character/character-detail-model"; // 대화 준비·상세 프로필
import { createSessionHref, deriveDisplayName, ensureConversationForStory, getStoryCastEntries, isStoryLocked, resolveStoryConversationRoute, STORY_CONTINUE_TEXT } from "@chatbot/features/story/story-model"; // 스토리 대화 준비
import { getConversationVersion, getMessageVersionGroup, getVersionMessages, removeVersionTree } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 함수
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import type { AppState, ConversationSettings, Message, WorkUpdate } from "@chatbot/features/core/types"; // 앱 타입
import { recommendLayout } from "@chatbot/features/chat/layout-resolver"; // 레이아웃 추천
import type { ImageGenerationAdapter } from "@chatbot/lib/adapters/image-generation-adapter"; // 이미지 계약
import type { LLMAdapter } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // Mock 이미지
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import { canViewMatureContent } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import type { GeneratedImage } from "@chatbot/features/core/types"; // 생성 이미지 타입
import { canUseImageForRating } from "@chatbot/features/images/image-model"; // 이미지 등급 판정
import styles from "@chatbot/features/chat/ChatScreen.module.css"; // 채팅 스타일
import { getActiveLocale, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·화면 언어
import { PageTitle } from "@chatbot/components/feedback/PageTitle"; // 탭 제목
import { ChatServiceError, RemoteLLMAdapter, type ChatServiceCode } from "@chatbot/lib/adapters/remote-llm-adapter"; // 실제 AI 어댑터

interface ChatScreenProps // 채팅 화면 속성
{ // 구조 시작
    characterId?: string; // 캐릭터 식별자(캐릭터 모드)
    storyId?: string; // 스토리 식별자(스토리 모드)
    initialConversationId?: string; // 초기 대화 식별자
    initialVersionId?: string; // 초기 버전 식별자
    initialMessageId?: string; // 바로 갈 답변(책갈피에서 들어올 때)
    llm?: LLMAdapter; // 대화 어댑터
    images?: ImageGenerationAdapter; // 이미지 어댑터
} // 구조 종료

function describeChatServiceError(code: ChatServiceCode): string // 실제 AI 실패 이유를 쉬운 말로
{ // 함수 시작
    if (code === "bad-key") // 열쇠 문제
    { // 조건 시작
        return t("AI 열쇠가 맞지 않아요. .env.local의 열쇠를 확인한 뒤 서버를 다시 켜 주세요."); // 열쇠 안내
    } // 조건 종료
    if (code === "rate-limited") // 너무 자주 보냄
    { // 조건 시작
        return t("너무 빠르게 보냈어요. 1분쯤 뒤에 다시 시도해 주세요."); // 속도 안내
    } // 조건 종료
    if (code === "provider-busy") // AI 회사가 바쁨
    { // 조건 시작
        return t("AI 회사의 사용 한도에 걸렸어요. 잠시 뒤에 다시 시도하거나 다른 등급을 골라 주세요."); // 한도 안내
    } // 조건 종료
    if (code === "model-offline") // 내 컴퓨터의 AI 프로그램이 꺼짐
    { // 조건 시작
        return t("내 컴퓨터의 AI 프로그램(Ollama)이 꺼져 있어요. 프로그램을 켠 뒤 다시 시도해 주세요."); // 프로그램 안내
    } // 조건 종료
    if (code === "model-missing") // 설치되지 않은 모델
    { // 조건 시작
        return t("설치되지 않은 모델이에요. .env.local의 CHAT_MODEL_OPEN과 설치한 모델 이름이 같은지 확인해 주세요."); // 모델 안내
    } // 조건 종료
    return t("AI 회사에서 답을 받지 못했어요. 다시 시도하거나 다른 등급을 골라 주세요."); // 그 밖의 실패
} // 함수 종료

export function ChatScreen(props: ChatScreenProps) // 채팅 화면
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    if (props.storyId !== undefined) // 스토리 모드 판정
    { // 조건 시작
        const story = state.stories.find((item) => item.id === props.storyId); // 스토리 조회
        if (story === undefined) // 스토리 부재 판정
        { // 조건 시작
            return ( // 부재 화면 반환
                <StatusScreen tone="not-found" label="STORY NOT FOUND" title={t("스토리를 찾을 수 없습니다")} description={t("주소가 잘못되었거나 이 브라우저에서 삭제된 스토리입니다. 스토리 모드에서 다른 이야기를 골라 주세요.")}> {/* 부재 안내 */}
                    <Link href={"/stories" as Route}>{t("스토리 모드로 이동")}</Link> {/* 스토리 목록 링크 */}
                    <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 링크 */}
                </StatusScreen> // 부재 안내 종료
            ); // 반환 종료
        } // 조건 종료
        if (isStoryLocked(story, state, new Date())) // 19세 잠금 판정
        { // 조건 시작
            return <AdultContentGate subject={{ kind: "story", name: story.title, coverImage: story.coverImage }} target="chat" />; // 잠금 화면 반환
        } // 조건 종료
        return <ChatConversationScreen {...props} />; // 스토리 대화 화면 반환
    } // 조건 종료
    const character = state.characters.find((item) => item.id === props.characterId); // 대화 캐릭터 조회
    if (character === undefined) // 캐릭터 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="CHARACTER NOT FOUND" title={t("대화할 캐릭터를 찾을 수 없습니다")} description={t("주소가 잘못되었거나 이 브라우저에서 삭제된 캐릭터입니다. 탐색 화면에서 다른 캐릭터를 골라 주세요.")}> {/* 부재 안내 */}
                <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 링크 */}
                <Link href={"/library" as Route}>{t("보관함 열기")}</Link> {/* 보관함 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (isCharacterLocked(character, state, new Date())) // 19세 잠금 판정
    { // 조건 시작
        return <AdultContentGate subject={{ kind: "character", name: character.name, coverImage: character.coverImage }} target="chat" />; // 잠금 화면 반환
    } // 조건 종료
    return <ChatConversationScreen {...props} />; // 대화 화면 반환
} // 함수 종료

function ChatConversationScreen({ characterId: requestedCharacterId, storyId, initialConversationId, initialVersionId, initialMessageId, llm, images }: ChatScreenProps) // 대화 화면
{ // 함수 시작
    const { state, dispatch, createBackup, commitState } = useAppStore(); // 앱 상태
    const router = useRouter(); // 경로 이동기
    const [prepared] = useState(() => // 초기 대화 준비
    { // 초기화 시작
        const base = storyId === undefined ? ensureConversationForCharacter(state, requestedCharacterId ?? "") : ensureConversationForStory(state, storyId); // 기본 대화 준비(캐릭터·스토리)
        const route = storyId === undefined ? resolveConversationRoute(base.state, requestedCharacterId ?? "", initialConversationId, initialVersionId) : resolveStoryConversationRoute(base.state, storyId, initialConversationId, initialVersionId); // 주소 대화 선택
        const routedState = appReducer(base.state, { type: "select-conversation-version", conversationId: route.conversation.id, versionId: route.version.id }); // 선택 버전 적용
        const created = !state.conversations.some((conversation) => conversation.id === route.conversation.id); // 이 화면에서 새로 만든 대화 여부
        return { ...base, state: routedState, conversation: route.conversation, version: route.version, href: route.canonicalHref, recovered: route.recovered, created }; // 준비 결과 반환
    }); // 초기화 종료
    const characterId = prepared.conversation.characterId; // 대화 캐릭터(스토리는 첫 등장인물)
    const allowCreate = useRef(prepared.created); // 새 대화 첫 저장 허용
    const latestGlobalState = useRef(state); // 최신 전역 상태
    useEffect(() => // 전역 상태 기록 효과
    { // 효과 시작
        latestGlobalState.current = state; // 최신 상태 기록
    }, [state]); // 전역 상태 의존
    const [adapter] = useState(() => llm ?? new RemoteLLMAdapter(new MockLLMAdapter())); // 대화 어댑터(실제 AI를 쓸 수 있는 등급은 서버 통로로, 아니면 연습용 AI로 답함)
    const [controller] = useState(() => new ChatController({ state: prepared.state, conversationId: prepared.conversation.id, llm: adapter, images: images ?? new MockImageAdapter() })); // 제어기 생성
    const [panelRequest, setPanelRequest] = useState<{ dialog: ChatDialogId; seq: number } | null>(null); // 설정 대화상자 열기 요청
    const openDialog = useCallback((dialog: ChatDialogId) => setPanelRequest((current) => ({ dialog, seq: (current?.seq ?? 0) + 1 })), []); // 대화상자 열기
    const toggleStatusPanel = useCallback(() => dispatch({ type: "update-settings", settings: { statusPanelOpen: !latestGlobalState.current.settings.statusPanelOpen } }), [dispatch]); // 상태창 접기
    const narrow = useNarrowScreen(); // 모바일 너비
    const [overlayOpen, setOverlayOpen] = useState(false); // 좁은 화면의 채팅방 설정 서랍(처음엔 닫힘)
    const panelToggleRef = useRef<HTMLButtonElement>(null); // 설정 열기 버튼
    const panelCloseRef = useRef<HTMLButtonElement>(null); // 설정 닫기 버튼
    const shellPanelOpen = state.settings.leftPanelOpen || state.settings.rightPanelOpen; // 왼쪽·오른쪽 패널 열림
    const [previousShellPanelOpen, setPreviousShellPanelOpen] = useState(shellPanelOpen); // 직전 패널 열림
    if (shellPanelOpen !== previousShellPanelOpen) // 패널 열림이 바뀜
    { // 조건 시작
        setPreviousShellPanelOpen(shellPanelOpen); // 기록
        if (shellPanelOpen) // 다른 패널이 열림
        { // 조건 시작
            setOverlayOpen(false); // 서랍은 닫기(겹침 방지)
        } // 조건 종료
    } // 조건 종료
    useEffect(() => // 서랍을 열면 닫기 버튼에 초점, Esc로 닫기
    { // 효과 시작
        if (!overlayOpen) // 닫힘
        { // 조건 시작
            return; // 처리 없음
        } // 조건 종료
        panelCloseRef.current?.focus(); // 닫기 버튼 초점
        const handleKey = (event: KeyboardEvent) => // 키 처리
        { // 처리 시작
            if (event.key === "Escape" && !event.defaultPrevented) // 대화상자·메뉴가 처리하지 않은 Esc
            { // 조건 시작
                setOverlayOpen(false); // 닫기
                panelToggleRef.current?.focus(); // 열기 버튼으로
            } // 조건 종료
        }; // 처리 종료
        document.addEventListener("keydown", handleKey); // 구독
        return () => document.removeEventListener("keydown", handleKey); // 해제
    }, [overlayOpen]); // 열림 의존
    const [snapshot, setSnapshot] = useState(prepared.state); // 화면 상태
    const [busy, setBusy] = useState(false); // 응답 상태
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null); // 스트리밍 메시지
    const [notice, setNotice] = useState(""); // 상태 안내
    const [retryAvailable, setRetryAvailable] = useState(false); // 재시도 가능 상태
    const [reviewOpen, setReviewOpen] = useState(false); // 대화 다시 보기 열림
    const [foundIds, setFoundIds] = useState<string[]>([]); // 검색으로 찾은 메시지
    const [focus, setFocus] = useState<{ id: string; seq: number } | null>(initialMessageId === undefined || initialMessageId.length === 0 ? null : { id: initialMessageId, seq: 0 }); // 지금 보고 있는 메시지(책갈피 주소로 들어오면 그 답변)
    const [cardMessage, setCardMessage] = useState<Message | null>(null); // 명장면 카드로 만들 답변
    useEffect(() => // 보고 있는 메시지가 바뀌면 그 자리로 이동
    { // 효과 시작
        if (focus !== null) // 대상 있음
        { // 조건 시작
            document.getElementById(messageAnchor(focus.id))?.scrollIntoView?.({ block: "center" }); // 화면 가운데로
        } // 조건 종료
    }, [focus]); // 대상 의존
    const jumpTo = useCallback((messageId: string) => setFocus((current) => ({ id: messageId, seq: (current?.seq ?? 0) + 1 })), []); // 메시지로 이동(같은 메시지도 다시 이동)
    const replaceRoute = router.replace; // 주소 교체 함수
    useEffect(() => // 초기 주소 정규화
    { // 효과 시작
        if (prepared.recovered && !prepared.created) // 복구 주소 판정(아직 저장하지 않은 새 대화는 주소를 바꾸지 않음: 바꾸면 화면이 다시 만들어지며 새 대화가 또 생겨 끝없이 반복됨)
        { // 조건 시작
            replaceRoute(prepared.href as Route, { scroll: false }); // 정규 주소 적용
        } // 조건 종료
    }, [prepared.created, prepared.href, prepared.recovered, replaceRoute]); // 효과 의존성
    const character = snapshot.characters.find((item) => item.id === characterId); // 캐릭터 조회
    const conversation = snapshot.conversations.find((item) => item.id === prepared.conversation.id); // 대화 조회
    const version = conversation === undefined ? null : getConversationVersion(snapshot, conversation.id); // 현재 버전 조회
    if (character === undefined || conversation === undefined || version === null) // 데이터 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="CONVERSATION NOT FOUND" title={t("대화를 찾을 수 없습니다")} description={t("삭제되었거나 더 이상 열 수 없는 대화입니다. 보관함에서 다른 대화를 이어가 주세요.")}> {/* 부재 안내 */}
                <Link href={"/library" as Route}>{t("보관함 열기")}</Link> {/* 보관함 링크 */}
                <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    const width = typeof window === "undefined" ? 1440 : window.innerWidth; // 화면 너비
    const height = typeof window === "undefined" ? 900 : window.innerHeight; // 화면 높이
    const layout = state.settings.layoutId ?? recommendLayout({ width, height, platformMode: state.settings.platformMode, layoutId: null }); // 현재 레이아웃
    const overlay = narrow || layout.startsWith("M"); // 모바일 배치는 서랍, 그 밖에는 접히는 열
    const panelOpen = overlay ? overlayOpen : state.settings.chatPanelOpen; // 채팅방 설정 열림
    const setPanelOpen = (open: boolean) => // 채팅방 설정 열고 닫기
    { // 함수 시작
        if (overlay) // 서랍 판정
        { // 조건 시작
            setOverlayOpen(open); // 서랍 열림
            if (open && shellPanelOpen) // 다른 패널 열림
            { // 조건 시작
                dispatch({ type: "close-panels" }); // 겹치지 않게 닫기
            } // 조건 종료
        } // 조건 종료
        else // 넓은 화면
        { // 분기 시작
            dispatch({ type: "update-settings", settings: { chatPanelOpen: open } }); // 펼침 저장
        } // 분기 종료
        if (!open) // 닫음
        { // 조건 시작
            window.requestAnimationFrame(() => panelToggleRef.current?.focus()); // 열기 버튼으로 초점
        } // 조건 종료
    }; // 함수 종료
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
    const isSaved = () => latestGlobalState.current.conversations.some((item) => item.id === prepared.conversation.id); // 전역 저장 여부
    const ensureSaved = () => // 아직 저장 전인 새 대화를 먼저 저장(설정·메모리를 붙이기 위해)
    { // 함수 시작
        if (!isSaved()) // 저장 전 판정
        { // 조건 시작
            const nextState = controller.snapshot(); // 제어 상태
            latestGlobalState.current = appReducer(latestGlobalState.current, createMergeAction(nextState)); // 즉시 최신 상태 기록
            publish(nextState); // 저장
        } // 조건 종료
    }; // 함수 종료
    const syncContext = () => // 요청 직전 최신 설정·프로필·메모리 전달
    { // 함수 시작
        const global = latestGlobalState.current; // 전역 상태
        const source = isSaved() ? global : { ...controller.snapshot(), personas: global.personas, memories: global.memories }; // 저장 전이면 제어 상태 기준
        controller.setContext(buildChatContext(source, prepared.conversation.id)); // 맥락 반영
        if (isSaved()) // 저장된 대화(전역 지갑이 기준)
        { // 조건 시작
            controller.syncWallet(global.wallet); // 다른 곳에서 받은 토큰 반영
        } // 조건 종료
    }; // 함수 종료
    const summarizeIfNeeded = async () => // 5턴마다 요약 메모리 자동 추가
    { // 함수 시작
        const current = controller.snapshot(); // 제어 상태
        const chat = current.conversations.find((item) => item.id === prepared.conversation.id); // 대화
        const chatVersion = chat === undefined ? null : getConversationVersion(current, chat.id); // 현재 버전
        const lead = current.characters.find((item) => item.id === characterId); // 대표 캐릭터
        if (chat === undefined || chatVersion === null || lead === undefined) // 대상 부재
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        const messages = getVersionMessages(current, chat.id, chatVersion.id); // 현재 버전 메시지
        const lastUser = messages.filter((message) => message.role === "user").at(-1); // 마지막 사용자 메시지
        const turn = messages.filter((message) => message.role === "user").length; // 턴 수
        if (lastUser === undefined || turn % 5 !== 0) // 간격 아님
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        const chatStory = chat.mode === "story" ? current.stories.find((item) => item.id === chat.storyId) : undefined; // 연결 스토리
        const liveSettings = latestGlobalState.current.conversations.find((item) => item.id === chat.id)?.settings ?? chat.settings; // 지금 대화방 설정(제어기의 복사본은 화면을 열 때의 등급을 들고 있을 수 있음)
        const persona = latestGlobalState.current.personas.find((item) => item.id === liveSettings.personaId) ?? latestGlobalState.current.personas[0]; // 이 대화의 대화 프로필(없으면 기본 프로필)
        const summary = await adapter.summarizeConversation({ conversation: { ...chat, settings: liveSettings }, version: chatVersion, messages: messages.slice(-10), userName: persona?.name, speakerName: chat.mode === "story" ? t("이야기") : deriveDisplayName(lead.name), contentRating: chatStory?.contentRating ?? lead.contentRating, language: getActiveLocale() }); // 요약(실제 AI를 쓸 수 있으면 대화 내용을 읽고 요약)
        const status = messages.filter((message) => message.role === "assistant" && message.status !== undefined && message.status !== null).at(-1)?.status; // 최근 상태창
        const levelOf = (name: string) => status?.stats.find((item) => item.target === name && (item.statId === AFFECTION_STAT_ID || item.name === "호감도"))?.value ?? chatVersion.relationshipLevel; // 호감도 스탯(없으면 관계 수치)
        const people = getStatusPeople(chat, deriveDisplayName(lead.name)).map((name) => ({ name, level: levelOf(name), stage: chatVersion.relationshipStage, emotion: chatVersion.emotion })); // 관계도 인물
        const memories = buildAutoMemories({ conversationId: chat.id, characterId: lead.id, turn, userMessageId: lastUser.id, summary, people, existing: latestGlobalState.current.memories.filter((memory) => memory.conversationId === chat.id), now: new Date().toISOString() }); // 자동 기억
        if (memories.length > 0) // 새 기억 판정
        { // 조건 시작
            dispatch({ type: "upsert-memories", memories }); // 저장
            dispatch({ type: "add-notification", notification: { id: `memory-${chat.id}-${turn}`, kind: "memory", title: t("요약 메모리가 추가됐어요"), body: t("{0} · {1}턴까지 요약", [chat.title, turn]), href: createSessionHref(chat), read: false, createdAt: new Date().toISOString() } }); // 알림
        } // 조건 종료
    }; // 함수 종료
    const notifyEvents = () => // 방금 일어난 이벤트 가운데 알림을 켠 것을 알림함에 추가
    { // 함수 시작
        const current = controller.snapshot(); // 제어 상태
        const chat = current.conversations.find((item) => item.id === prepared.conversation.id); // 대화
        const chatVersion = chat === undefined ? null : getConversationVersion(current, chat.id); // 현재 버전
        if (chat === undefined || chatVersion === null) // 대상 부재
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        const latest = getVersionMessages(current, chat.id, chatVersion.id).filter((message) => message.role === "assistant").at(-1); // 마지막 응답
        for (const item of latest?.status?.events ?? []) // 이벤트 순회
        { // 순회 시작
            if (item.notify) // 알림을 켠 이벤트
            { // 조건 시작
                dispatch({ type: "add-notification", notification: { id: `event-${chat.id}-${chatVersion.id}-${item.eventId}-${item.target ?? ""}`, kind: "event", title: item.ending ? t("엔딩: {0}", [item.name]) : t("이벤트: {0}", [item.name]), body: `${chat.title}${item.target === null ? "" : ` · ${item.target}`}${item.title.length === 0 ? "" : t(" · 칭호 ‘{0}’", [item.title])}`, href: createSessionHref(chat), read: false, createdAt: new Date().toISOString() } }); // 알림(같은 이벤트는 한 번)
            } // 조건 종료
        } // 순회 종료
    }; // 함수 종료
    const runRequest = async (request: (onProgress: (progress: ChatProgress) => void) => Promise<SendResult>): Promise<boolean> => // 응답 요청 실행(보내기가 받아들여졌는지 돌려줌)
    { // 함수 시작
        let accepted = true; // 받아들여짐(토큰 부족처럼 보내기 전에 거절되면 거짓)
        syncContext(); // 최신 설정 반영
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
            accepted = result.ok || result.reason === "cancelled"; // 중단은 이미 보낸 뒤라 받아들여진 것으로 봄
            sync(); // 상태 동기화
            setNotice(result.ok ? "" : result.reason === "cancelled" ? t("응답을 중단했습니다.") : result.reason === "insufficient-token" ? t("토큰이 부족합니다.") : t("메시지를 전송하지 못했습니다.")); // 안내 갱신
            if (result.ok) // 성공 판정
            { // 조건 시작
                notifyEvents(); // 이벤트 알림
                void summarizeIfNeeded().catch(() => undefined); // 요약 메모리(실패해도 대화는 유지)
            } // 조건 종료
        } // 시도 종료
        catch (error) // 응답 실패 처리
        { // 실패 시작
            sync(); // 부분 상태 동기화
            setRetryAvailable(true); // 재시도 상태 설정
            setNotice(error instanceof ChatServiceError ? describeChatServiceError(error.code) : t("응답을 받지 못했습니다. 다시 시도해 주세요.")); // 실패 안내(실제 AI는 이유를 알려 줌)
        } // 실패 종료
        finally // 응답 상태 정리
        { // 정리 시작
            setStreamingMessageId(null); // 스트리밍 상태 해제
            setBusy(false); // 응답 상태 종료
        } // 정리 종료
        return accepted; // 받아들여졌는지 반환
    }; // 함수 종료
    const send = async (text: string): Promise<boolean> => // 메시지 전송(거절되면 거짓: 입력창이 쓴 글을 되돌림)
    { // 함수 시작
        return runRequest((onProgress) => controller.sendMessage(text, onProgress)); // 새 메시지 요청
    }; // 함수 종료
    const continueStory = async () => // 입력 없이 이야기 진행
    { // 함수 시작
        await runRequest((onProgress) => controller.sendMessage(STORY_CONTINUE_TEXT, onProgress)); // 진행 요청
    }; // 함수 종료
    const regenerate = async () => // 응답 다시 생성
    { // 함수 시작
        await runRequest((onProgress) => controller.regenerateLastReply(onProgress)); // 마지막 응답 요청
    }; // 함수 종료
    const editMessage = async (messageId: string, text: string): Promise<EditMessageResult> => // 메시지 수정
    { // 함수 시작
        syncContext(); // 최신 설정 반영
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
                    setNotice(t("저장하지 못해 원본 대화를 유지했습니다.")); // 저장 실패 안내
                    return { ok: false, reason: "storage-failed" }; // 저장 실패 반환
                } // 실패 종료
                allowCreate.current = false; // 첫 저장 이후 재생성 차단
                setSnapshot(nextState); // 확정 화면 반영
                notifyEvents(); // 수정 분기에서 일어난 이벤트 알림
                replaceRoute(createSessionHref(conversation, result.versionId) as Route, { scroll: false }); // 새 버전 주소 적용
            } // 조건 종료
            else // 수정 실패 판정
            { // 실패 시작
                sync(); // 원본 상태 동기화
            } // 실패 종료
            setNotice(result.ok ? t("새 대화 버전을 만들었습니다.") : result.reason === "cancelled" ? t("수정 응답을 중단했습니다.") : t("메시지를 수정하지 못했습니다.")); // 수정 안내 갱신
            return result; // 수정 결과 반환
        } // 시도 종료
        catch (error) // 수정 실패 처리
        { // 실패 시작
            sync(); // 원본 상태 복원
            setNotice(t("수정 응답을 만들지 못했습니다.")); // 실패 안내
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
        if (!window.confirm(t("이 메시지를 현재 대화 버전에서 삭제할까요?"))) // 삭제 확인 판정
        { // 조건 시작
            return; // 삭제 취소
        } // 조건 종료
        if (!createBackup("message-delete")) // 백업 실패 판정
        { // 조건 시작
            setNotice(t("백업하지 못해 메시지 삭제를 중단했습니다.")); // 백업 오류 안내
            return; // 삭제 중단
        } // 조건 종료
        const currentState = controller.snapshot(); // 삭제 전 상태 조회
        const nextState = appReducer(currentState, { type: "delete-version-message", versionId: version.id, messageId: message.id }); // 메시지 삭제 상태 생성
        if (nextState === currentState) // 마지막 메시지 삭제 차단 판정
        { // 조건 시작
            setNotice(t("대화 버전의 마지막 메시지는 삭제할 수 없습니다.")); // 삭제 차단 안내
            return; // 삭제 중단
        } // 조건 종료
        applyControllerState(nextState); // 삭제 상태 적용
        const versionRemoved = !nextState.conversationVersions.some((item) => item.id === version.id); // 분기 버전 삭제 판정
        const nextConversation = nextState.conversations.find((item) => item.id === conversation.id); // 삭제 후 대화 조회
        if (nextConversation !== undefined && nextConversation.currentVersionId !== version.id) // 원본 복귀 판정
        { // 조건 시작
            replaceRoute(createSessionHref(nextConversation) as Route, { scroll: false }); // 복귀 주소 적용
        } // 조건 종료
        setNotice(versionRemoved ? t("분기 기준 메시지와 해당 버전을 삭제했습니다.") : t("현재 버전에서 메시지를 삭제했습니다.")); // 삭제 안내
    }; // 함수 종료
    const selectVersion = (versionId: string, direction: "previous" | "next") => // 대화 버전 선택
    { // 함수 시작
        const nextState = appReducer(controller.snapshot(), { type: "select-conversation-version", conversationId: conversation.id, versionId }); // 선택 상태 생성
        applyControllerState(nextState); // 선택 상태 적용
        replaceRoute(createSessionHref(conversation, versionId) as Route, { scroll: false }); // 선택 주소 적용
        const focusLabel = direction === "previous" ? t("이전 대화 버전") : t("다음 대화 버전"); // 포커스 이름 결정
        window.setTimeout(() => (document.querySelector(`[aria-label="${focusLabel}"]`) as HTMLButtonElement | null)?.focus(), 0); // 전환 버튼 포커스 복원
    }; // 함수 종료
    const deleteVersion = (versionId: string) => // 대화 버전 삭제
    { // 함수 시작
        const preview = removeVersionTree(controller.snapshot(), conversation.id, versionId); // 삭제 범위 계산
        if (!window.confirm(getVersionDeleteConfirmText(preview.versionCount, preview.messageCount))) // 삭제 확인 판정(하위 버전 수에서 자신은 뺌)
        { // 조건 시작
            return; // 삭제 취소
        } // 조건 종료
        if (!createBackup("version-delete")) // 백업 실패 판정
        { // 조건 시작
            setNotice(t("백업하지 못해 버전 삭제를 중단했습니다.")); // 백업 오류 안내
            return; // 삭제 중단
        } // 조건 종료
        applyControllerState(preview.state); // 삭제 상태 적용
        const nextConversation = preview.state.conversations.find((item) => item.id === conversation.id); // 다음 대화 조회
        if (nextConversation !== undefined) // 다음 대화 존재 판정
        { // 조건 시작
            replaceRoute(createSessionHref(nextConversation) as Route, { scroll: false }); // 복구 주소 적용
        } // 조건 종료
        setNotice(t("수정 대화 버전을 삭제했습니다.")); // 삭제 안내
    }; // 함수 종료
    const cancel = () => // 응답 중단
    { // 함수 시작
        controller.cancelReply(); // 활성 요청 중단
    }; // 함수 종료
    const applyImage = (image: GeneratedImage) => // 내 이미지로 장면 바꾸기
    { // 함수 시작
        const result = controller.applySceneImage(image.src); // 장면 반영
        sync(); // 상태 동기화
        setNotice(result.ok ? t("내 이미지로 장면을 바꿨습니다.") : t("응답 중에는 장면을 바꿀 수 없습니다.")); // 안내 갱신
    }; // 함수 종료
    const generateScene = async () => // 수동 장면 생성
    { // 함수 시작
        syncContext(); // 최신 지갑 반영(다른 곳에서 받은 토큰)
        const result = await controller.generateManualScene(); // 장면 생성
        sync(); // 상태 동기화
        const made = latestGlobalState.current.settings.showSceneImages ? t("새 장면을 만들었습니다.") : t("새 장면을 만들었습니다. ‘상황 이미지 보기’를 켜면 대화에서 볼 수 있어요."); // 만든 그림은 마지막 응답 아래에 붙음(숨김이면 켜는 방법 안내)
        setNotice(result.ok ? made : result.reason === "insufficient-token" ? t("이미지를 만들 토큰이 부족합니다.") : t("장면을 만들지 못했습니다.")); // 안내 갱신
    }; // 함수 종료
    const storyMode = conversation.mode === "story"; // 스토리 모드 여부
    const story = storyMode ? snapshot.stories.find((item) => item.id === conversation.storyId) : undefined; // 연결 스토리
    const castEntries = storyMode ? getStoryCastEntries(snapshot, conversation.storyCast) : undefined; // 등장인물과 캐릭터
    const title = storyMode ? conversation.title : character.name; // 화면 제목
    const globalConversation = state.conversations.find((item) => item.id === conversation.id); // 전역 대화(설정 기준)
    const settings: ConversationSettings = globalConversation?.settings ?? conversation.settings; // 대화방 설정
    const updateSettings = (patch: Partial<ConversationSettings>) => // 대화방 설정 변경
    { // 함수 시작
        ensureSaved(); // 새 대화면 먼저 저장
        dispatch({ type: "update-conversation-settings", conversationId: conversation.id, settings: patch }); // 설정 저장
    }; // 함수 종료
    const work = story ?? character; // 작품(스토리 또는 캐릭터)
    const profile = getCharacterDetailProfile(character); // 상세 프로필(기본 캐릭터 업데이트·시작 설정)
    const updates: WorkUpdate[] = work.updates.length > 0 ? work.updates : !storyMode && profile.releaseNotes.length > 0 ? profile.releaseNotes.map((note) => ({ id: note.version, version: note.version, date: note.date, note: [note.title, ...note.changes].join(" · ") })) : [{ id: "v1", version: "V1", date: work.createdAt.slice(0, 10), note: t("최초 공개") }]; // 업데이트 기록
    const presetName = storyMode ? t("스토리 시작 장면") : profile.startPresets.find((preset) => preset.id === conversation.startSettings.presetId)?.name ?? t("기본 설정"); // 시작 설정
    const versionMessages = getVersionMessages(snapshot, conversation.id, version.id); // 현재 버전 메시지
    const conversationImages = [...new Set(versionMessages.flatMap((message) => typeof message.sceneImage === "string" && message.sceneImage.length > 0 ? [message.sceneImage] : []).reverse())]; // 대화 속 상황 이미지(최근 순)
    const statusEnabled = work.statusTemplate?.enabled === true; // 상태창 사용
    const statusPeople = getStatusPeople(conversation, deriveDisplayName(character.name)); // 상태창 인물
    const relationStat = getRelationStat(work.statusTemplate); // 관계 스탯(없으면 예전 관계 수치)
    const relationLead = statusPeople[0]; // 대표 인물
    const relationValue = relationStat === null ? null : fromRelationLevel(relationStat, version.relationshipLevel); // 대표 인물의 관계 스탯 값
    const relationBaselines = relationStat === null || relationLead === undefined || relationValue === null ? [] : [{ statId: relationStat.id, target: relationLead, value: relationValue }]; // 첫 응답 전 관계 스탯 시작 값
    const turn = versionMessages.filter((message) => message.role === "user").length; // 현재 턴
    const toggleBookmark = (message: Message) => // 답변 책갈피 넣고 빼기
    { // 함수 시작
        applyControllerState(appReducer(controller.snapshot(), { type: "toggle-message-bookmark", messageId: message.id })); // 책갈피 반영
        setNotice(message.bookmarked === true ? t("책갈피에서 뺐습니다.") : t("책갈피에 넣었습니다. 위쪽 ‘다시 보기’에서 모아 볼 수 있어요.")); // 안내
    }; // 함수 종료
    const getSuggestions = () => createSuggestedReplies({ names: storyMode ? conversation.storyCast.map((member) => member.displayName) : [deriveDisplayName(character.name)], emotion: version.emotion, turn, seed: conversation.id }); // 추천 답변
    const canRegenerate = !busy && !retryAvailable && versionMessages.some((message) => message.role === "user"); // 다시 생성 가능
    const commands: ComposerCommand[] = // / 명령어
    [ // 목록 시작
        ...(canRegenerate ? [{ id: "regenerate", label: t("/다시"), description: t("마지막 응답을 다시 생성해요"), run: () => void regenerate() }] : []), // 다시 생성
        { id: "scene", label: t("/장면"), description: t("장면 이미지 만들기 · 20토큰"), run: () => void generateScene() }, // 장면
        { id: "review", label: t("/검색"), description: t("이 대화에서 말 찾기와 책갈피 보기"), run: () => setReviewOpen(true) }, // 대화 다시 보기
        { id: "memory", label: t("/요약"), description: t("요약 메모리 열기"), run: () => openDialog("memory") }, // 요약 메모리
        { id: "note", label: t("/노트"), description: t("유저 노트 열기"), run: () => openDialog("note") }, // 유저 노트
        { id: "guide", label: t("/가이드"), description: t("플레이 가이드 보기"), run: () => openDialog("guide") }, // 가이드
        { id: "shortcuts", label: t("/단축키"), description: t("키보드 단축키 보기"), run: () => openDialog("shortcuts") }, // 단축키
        { id: "images", label: t("/이미지"), description: t("이미지 스튜디오 열기"), run: () => router.push("/images" as Route) }, // 스튜디오
    ]; // 목록 종료
    const workRating = story?.contentRating ?? character.contentRating; // 작품 등급(스토리면 스토리 등급)
    const sceneImages = state.images.filter((image) => canUseImageForRating(image.contentRating, workRating) && (image.contentRating !== "mature" || canViewMatureContent(state, new Date()))).slice(0, 6); // 장면으로 쓸 수 있는 내 이미지
    return ( // 채팅 반환
        <main className={styles.chat} data-layout={layout} data-panel={overlay ? undefined : panelOpen ? "open" : "closed"} data-overlay={overlay ? "true" : undefined} data-mode={conversation.mode} data-genre={getGenreKey(story?.tags ?? character.tags)} data-surface="light" style={{ "--chat-font": getChatFontFamily(state.settings.chatFont), "--chat-font-size": getChatFontSize(state.settings.chatFontSize) } as CSSProperties}> {/* 채팅 본문 */}
            <PageTitle title={title} /> {/* 탭 제목 */}
            <ChatShortcuts onRegenerate={canRegenerate ? () => void regenerate() : undefined} onShortcuts={() => openDialog("shortcuts")} font={state.settings.chatFont} /> {/* 화면 단축키·글꼴 불러오기 */}
            <section className={styles.story}> {/* 대화 영역(왼쪽 장면 영역 없이 남는 폭을 모두 차지) */}
                <header className={styles.storyHeader}><div><span className={styles.stage}>{storyMode ? t("스토리 모드 · 등장인물 {0}명", [conversation.storyCast.length]) : t(version.relationshipStage)}</span><h1>{title} <span className={styles.aiBadge} data-ai-badge="" title={storyMode ? t("AI 스토리") : t("AI 캐릭터")}>AI</span></h1></div><div className={styles.meta}><TierSelector settings={settings} mature={workRating === "mature"} onSelect={(tier) => updateSettings({ tier })} onSaveOptions={(tierOptions) => updateSettings({ tierOptions })} /><span>{t(version.emotion)}</span><strong>{snapshot.wallet.balance} {t("토큰")}</strong><button type="button" className={styles.panelToggle} aria-expanded={reviewOpen} aria-controls="chat-review-bar" onClick={() => { if (reviewOpen) { setFoundIds([]); } setReviewOpen(!reviewOpen); }}><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>{t("다시 보기")}</button><button ref={panelToggleRef} type="button" className={styles.panelToggle} aria-label={t("채팅방 설정 열기와 닫기")} aria-expanded={panelOpen} aria-controls="chat-settings-panel" onClick={() => setPanelOpen(!panelOpen)}><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>{t("설정")}</button></div></header> {/* 대화 상태 */}
                <p className={styles.aiNotice} role="note" aria-label={t("AI 이용 안내")}>{storyMode ? t("AI가 만든 허구의 대화입니다. 등장인물은 실제 사람이 아니며, 건강·법률·금융처럼 중요한 결정은 전문가와 상의하세요.") : t("AI가 만든 허구의 대화입니다. 캐릭터는 실제 사람이 아니며, 건강·법률·금융처럼 중요한 결정은 전문가와 상의하세요.")}</p> {/* AI 이용 안내 */}
                {work.playGuide.trim().length === 0 ? null : <PlayGuideCard text={work.playGuide} onOpen={() => openDialog("guide")} />} {/* 플레이 가이드 */}
                {reviewOpen ? <ReviewBar messages={versionMessages} onFound={setFoundIds} onJump={jumpTo} onClose={() => setReviewOpen(false)} /> : null} {/* 대화 다시 보기(검색·책갈피) */}
                <MessageList messages={versionMessages} showSceneImages={state.settings.showSceneImages} streamingMessageId={streamingMessageId} busy={busy} allowRegenerate={!busy && !retryAvailable} onRegenerate={regenerate} getVersionGroup={(message) => getMessageVersionGroup(snapshot, version.id, message.id)} onEdit={editMessage} onDelete={deleteMessage} onSelectVersion={selectVersion} onDeleteVersion={deleteVersion} storyCast={castEntries} foundIds={foundIds} focusId={focus?.id ?? null} onToggleBookmark={toggleBookmark} onSceneCard={setCardMessage} /> {/* 메시지 목록 */}
                <p role="status" className={styles.notice}>{notice}</p> {/* 상태 안내 */}
                {retryAvailable ? <div className={styles.requestActions}><button type="button" onClick={regenerate}>{t("다시 시도")}</button></div> : null} {/* 재시도 영역 */}
                {statusEnabled ? <StatusPanel messages={versionMessages} open={state.settings.statusPanelOpen} onToggle={toggleStatusPanel} initialStats={currentStatValues(work.statusTemplate, statusPeople, null, relationBaselines)} /> : null} {/* 고정 상태창(첫 응답 전에는 스탯 초기값) */}
                <ChatComposer busy={busy} onSend={send} onCancel={cancel} storyCast={storyMode ? conversation.storyCast : undefined} onContinue={storyMode ? continueStory : undefined} getSuggestions={getSuggestions} commands={commands} onGenerateScene={() => void generateScene()} messageCost={getMessageCost(settings)} affordable={snapshot.wallet.balance >= getMessageCost(settings)} /> {/* 메시지 입력(장면 이미지 생성 버튼·예상 비용 포함) */}
            </section> {/* 대화 종료 */}
            {overlay && panelOpen ? <button type="button" className={styles.panelScrim} aria-hidden="true" tabIndex={-1} onClick={() => setPanelOpen(false)} /> : null} {/* 서랍 배경(누르면 닫기) */}
            <aside id="chat-settings-panel" className={styles.controls} aria-label={t("채팅방 설정")} hidden={!overlay && !panelOpen} aria-hidden={overlay && !panelOpen ? true : undefined}> {/* 채팅방 설정(열고 닫기) */}
                <div className={styles.controlsHead}><h2>{t("채팅방 설정")}</h2><button ref={panelCloseRef} type="button" aria-label={t("채팅방 설정 닫기")} onClick={() => setPanelOpen(false)}>×</button></div> {/* 머리말 */}
                {castEntries === undefined ? null : ( // 등장인물 패널 판정
                    <section className={styles.castPanel} aria-labelledby="story-cast-title"> {/* 등장인물 패널 */}
                        <h2 id="story-cast-title">{t("등장인물")}</h2> {/* 패널 제목 */}
                        <ul> {/* 등장인물 목록 */}
                            {castEntries.map((entry) => ( // 인물 순회
                                <li key={entry.member.characterId}> {/* 인물 항목 */}
                                    <span className={styles.castAvatar} aria-hidden="true">{entry.character === undefined ? entry.member.displayName.slice(0, 1) : <Image src={entry.character.coverImage} alt="" width={80} height={80} />}</span> {/* 인물 얼굴 */}
                                    <div><strong>{entry.member.displayName}</strong><span>{entry.member.role}</span></div> {/* 이름과 역할 */}
                                </li> // 인물 항목 종료
                            ))} {/* 인물 순회 종료 */}
                        </ul> {/* 목록 종료 */}
                        {story === undefined || story.userRole.length === 0 ? null : <p className={styles.userRole}><span>{t("내 역할")}</span>{story.userRole}</p>} {/* 내 역할 */}
                    </section> // 등장인물 패널 종료
                )} {/* 등장인물 패널 판정 종료 */}
                <ChatSettingsPanel conversationId={conversation.id} characterId={characterId} settings={settings} onUpdateSettings={updateSettings} playGuide={work.playGuide} updates={updates} presetName={presetName} sceneImages={conversationImages} currentScene={version.currentScene} busy={busy} onApplyScene={(src) => { const result = controller.applySceneImage(src); sync(); setNotice(result.ok ? t("상황 이미지로 장면을 바꿨습니다.") : t("응답 중에는 장면을 바꿀 수 없습니다.")); }} sampleName={storyMode ? conversation.storyCast[0]?.displayName ?? title : deriveDisplayName(character.name)} request={panelRequest} ensureSaved={ensureSaved} /> {/* 채팅방 설정 */}
                <section className={styles.myImages} aria-label={t("내 이미지로 장면 바꾸기")}> {/* 내 이미지 장면 */}
                    <h2>{t("내 이미지")}</h2> {/* 제목 */}
                    {sceneImages.length === 0 ? <p>{t("이미지 스튜디오에서 만든 이미지를 장면으로 쓸 수 있어요.")}</p> : <div>{sceneImages.map((image) => <button key={image.id} type="button" aria-label={t("{0} 장면으로", [image.prompt])} title={image.prompt} disabled={busy} data-current={version.currentScene === image.src ? "true" : undefined} onClick={() => applyImage(image)}><Image src={image.src} alt="" width={96} height={72} unoptimized /></button>)}</div>} {/* 이미지 목록 */}
                    <Link href={"/images" as Route}>{t("이미지 스튜디오 열기")}</Link> {/* 스튜디오 링크 */}
                </section> {/* 내 이미지 종료 */}
                {relationStat !== null && relationValue !== null ? <p className={styles.relation}><b>{t("관계 · {0}", [version.relationshipStage])}</b><em>{`${storyMode ? `${relationLead ?? ""} ` : ""}${relationStat.icon.length === 0 ? "" : `${relationStat.icon} `}${t(relationStat.name)} ${formatStatValue({ value: relationValue, min: relationStat.min, max: relationStat.max })}`}</em><span aria-hidden="true"><span style={{ width: `${version.relationshipLevel}%` }} /></span></p> : storyMode ? null : <p className={styles.relation}>{t("관계")} {version.relationshipLevel}/100<span aria-hidden="true"><span style={{ width: `${version.relationshipLevel}%` }} /></span></p>} {/* 관계(관계 스탯이 있으면 대표 인물의 스탯 값과 단계, 없으면 예전 관계 수치) */}
            </aside> {/* 설정 종료 */}
            {cardMessage === null ? null : <SceneCardDialog title={title} speaker={storyMode ? t("스토리") : deriveDisplayName(character.name)} content={cardMessage.content} image={typeof cardMessage.sceneImage === "string" && cardMessage.sceneImage.length > 0 ? cardMessage.sceneImage : version.currentScene} onClose={() => setCardMessage(null)} />} {/* 명장면 카드 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function PlayGuideCard({ text, onOpen }: { text: string; onOpen(): void }) // 대화창 위 플레이 가이드 카드
{ // 함수 시작
    const [expanded, setExpanded] = useState(false); // 펼침
    return ( // 카드 반환
        <section className={styles.playGuide} aria-label={t("플레이 가이드 안내")} data-expanded={expanded ? "true" : undefined}> {/* 카드 */}
            <h2>{t("플레이 가이드")}</h2> {/* 제목 */}
            <p>{text}</p> {/* 내용 */}
            <div className={styles.playGuideActions}><button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? t("접기") : t("더 보기")}</button><button type="button" onClick={onOpen}>{t("창으로 보기")}</button></div> {/* 동작 */}
        </section> // 카드 종료
    ); // 반환 종료
} // 함수 종료

function ChatShortcuts({ onRegenerate, onShortcuts, font }: { onRegenerate?: () => void; onShortcuts(): void; font: Parameters<typeof loadChatFont>[0] }) // 채팅 화면 단축키(Alt+R 다시 생성, Ctrl+/ 안내)와 글꼴 불러오기
{ // 함수 시작
    useEffect(() => // 글꼴 불러오기
    { // 효과 시작
        loadChatFont(font); // 고른 글꼴만
    }, [font]); // 글꼴 의존
    useEffect(() => // 단축키
    { // 효과 시작
        const handleKey = (event: KeyboardEvent) => // 키 처리
        { // 처리 시작
            if (event.altKey && !event.ctrlKey && event.key.toLowerCase() === "r" && onRegenerate !== undefined) // 다시 생성
            { // 조건 시작
                event.preventDefault(); // 기본 동작 차단
                onRegenerate(); // 다시 생성
            } // 조건 종료
            else if ((event.ctrlKey || event.metaKey) && event.key === "/") // 단축키 안내
            { // 조건 시작
                event.preventDefault(); // 기본 동작 차단
                onShortcuts(); // 안내 열기
            } // 조건 종료
        }; // 처리 종료
        window.addEventListener("keydown", handleKey); // 구독
        return () => window.removeEventListener("keydown", handleKey); // 해제
    }, [onRegenerate, onShortcuts]); // 의존
    return null; // 화면 표시 없음
} // 함수 종료

function subscribeResize(callback: () => void): () => void // 창 크기 변화 구독
{ // 함수 시작
    window.addEventListener("resize", callback); // 구독
    return () => window.removeEventListener("resize", callback); // 해제
} // 함수 종료

function useNarrowScreen(): boolean // 모바일 너비(760px 이하) 판정
{ // 함수 시작
    return useSyncExternalStore(subscribeResize, () => window.innerWidth <= 760, () => false); // 서버는 넓은 화면 기준
} // 함수 종료
