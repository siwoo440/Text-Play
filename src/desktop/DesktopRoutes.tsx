"use client"; // 클라이언트 컴포넌트

import { Component, useEffect, useMemo, type ErrorInfo, type ReactElement, type ReactNode } from "react"; // 리액트 도구
import ErrorPage from "@chatbot/app/error"; // ChatBot 오류 화면
import LibraryPage from "@chatbot/app/library/page"; // ChatBot 보관함 페이지
import NotFound from "@chatbot/app/not-found"; // ChatBot 없는 페이지 화면
import HomePage from "@chatbot/app/page"; // ChatBot 메인 페이지
import DisplaySettingsPage from "@chatbot/app/settings/display/page"; // ChatBot 화면 레이아웃 페이지
import NotificationSettingsPage from "@chatbot/app/settings/notifications/page"; // ChatBot 알림 페이지
import PrivacySettingsPage from "@chatbot/app/settings/privacy/page"; // ChatBot 개인정보 페이지
import ProfileSettingsPage from "@chatbot/app/settings/profile/page"; // ChatBot 프로필 페이지
import TokenSettingsPage from "@chatbot/app/settings/tokens/page"; // ChatBot 토큰 페이지
import SupportPage from "@chatbot/app/support/page"; // ChatBot 고객 지원 페이지
import { CharacterDetail } from "@chatbot/features/character/CharacterDetail"; // ChatBot 캐릭터 상세
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // ChatBot 캐릭터 편집기
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // ChatBot 대화 화면
import { ExploreScreen } from "@chatbot/features/explore/ExploreScreen"; // ChatBot 탐색 화면
import { SettingsShell } from "@chatbot/features/settings/SettingsShell"; // ChatBot 설정 틀
import { StoryDetail } from "@chatbot/features/story/StoryDetail"; // ChatBot 스토리 상세
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // ChatBot 스토리 편집기
import { StoryHome } from "@chatbot/features/story/StoryHome"; // ChatBot 스토리 홈
import { AiModelsScreen } from "@/desktop/ai-models/AiModelsScreen"; // AI 모델 화면
import type { ModelStoreClient } from "@/desktop/ai-models/model-store-client"; // 보관함 통신 계약
import { createDesktopLLMSelection } from "@/desktop/desktop-llm"; // 데스크톱 AI 생성기
import { getDesktopAreaId } from "@/desktop/router/desktop-areas"; // 화면 소속 메뉴 영역
import { useDesktopLocation, useDesktopRouterActions } from "@/desktop/router/DesktopRouter"; // 데스크톱 경로 도구
import { getDesktopRouteTitle, matchDesktopRoute, type DesktopRouteMatch, type DesktopSettingsSection } from "@/desktop/router/desktop-routes"; // 데스크톱 경로표
import { DesktopShell } from "@/desktop/shell/DesktopShell"; // 데스크톱 틀
import { useTextPlayPreferences } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // Text-Play 설정
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // Text-Play 세션
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // Text-Play 홈
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // Text-Play 플레이 화면
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약

interface DesktopRoutesProps // 경로 화면 속성
{ // 구조 시작
    repository: TextPlaySaveRepository; // Text-Play 저장소
    localAIClient: OllamaClient; // 로컬 인공지능 통신기
    modelStoreClient: ModelStoreClient; // 내장 AI 모델 보관함 통신기
} // 구조 종료

interface ErrorBoundaryProps // 오류 경계 속성
{ // 구조 시작
    children: ReactNode; // 감쌀 화면
} // 구조 종료

interface ErrorBoundaryState // 오류 경계 상태
{ // 구조 시작
    error: Error | null; // 발생 오류
} // 구조 종료

class DesktopErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> // 화면 오류 경계
{ // 클래스 시작
    public state: ErrorBoundaryState = { error: null }; // 초기 상태

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState // 오류 상태 전환
    { // 함수 시작
        return { error }; // 오류 저장
    } // 함수 종료

    public componentDidCatch(error: Error, info: ErrorInfo): void // 오류 기록
    { // 함수 시작
        void info; // 미사용 값 표시
        void error; // ChatBot 오류 화면이 개발 도구에 기록
    } // 함수 종료

    public render(): ReactNode // 화면 출력
    { // 함수 시작
        return this.state.error === null ? this.props.children : <ErrorPage error={this.state.error} retry={() => this.setState({ error: null })} />; // 정상 화면이나 오류 화면
    } // 함수 종료
} // 클래스 종료

const settingsPages: Record<DesktopSettingsSection, () => ReactElement> = // 설정 페이지 목록
{ // 객체 시작
    profile: ProfileSettingsPage, // 프로필
    tokens: TokenSettingsPage, // 토큰
    display: DisplaySettingsPage, // 화면
    notifications: NotificationSettingsPage, // 알림
    privacy: PrivacySettingsPage, // 개인정보
}; // 객체 종료

function renderPage(match: DesktopRouteMatch, repository: TextPlaySaveRepository, modelStoreClient: ModelStoreClient): ReactNode // 경로 화면 출력
{ // 함수 시작
    switch (match.kind) // 경로 분기
    { // 분기 시작
        case "home": return <HomePage />; // 메인
        case "explore": return <ExploreScreen key={match.tag ?? "all"} initialTag={match.tag} />; // 탐색(ChatBot 페이지와 같은 키)
        case "character": return <CharacterDetail key={match.id} characterId={match.id} />; // 상세
        case "character-new": return <CharacterEditor key="new" />; // 만들기
        case "character-edit": return <CharacterEditor key={match.id} characterId={match.id} />; // 수정
        case "chat": return <ChatScreen key={`${match.characterId}:${match.conversationId ?? "new"}:${match.versionId ?? "current"}`} characterId={match.characterId} initialConversationId={match.conversationId} initialVersionId={match.versionId} />; // 대화(ChatBot 페이지와 같은 키에 캐릭터 포함)
        case "library": return <LibraryPage />; // 보관함
        case "settings": // 설정 분기
        { // 분기 내용 시작
            const SettingsPage = settingsPages[match.section]; // 설정 페이지 선택
            return <SettingsShell><SettingsPage /></SettingsShell>; // ChatBot 설정 레이아웃과 같은 틀
        } // 분기 내용 종료
        case "support": return <SupportPage />; // 고객 지원
        case "ai-models": return <AiModelsScreen client={modelStoreClient} />; // 내장 AI 모델
        case "story-home": return <StoryHome />; // 스토리 홈
        case "story-new": return <StoryEditor key="new" />; // 새 스토리
        case "story": return <StoryDetail key={match.id} storyId={match.id} />; // 스토리 상세
        case "story-chat": return <ChatScreen key={`story:${match.id}:${match.conversationId ?? "new"}:${match.versionId ?? "current"}`} storyId={match.id} initialConversationId={match.conversationId} initialVersionId={match.versionId} />; // 스토리 대화(ChatBot 페이지와 같은 키에 스토리 포함)
        case "story-edit": return <StoryEditor key={match.id} storyId={match.id} />; // 스토리 수정
        case "text-play-home": return <TextPlayHome repository={repository} />; // Text-Play 홈
        case "text-play-play": return null; // 틀 밖에서 출력
        case "redirect": return null; // 이동 대기
        case "not-found": return <NotFound />; // 없는 페이지
    } // 분기 종료
} // 함수 종료

export function DesktopRoutes({ repository, localAIClient, modelStoreClient }: DesktopRoutesProps): ReactElement | null // 경로 화면
{ // 함수 시작
    const location = useDesktopLocation(); // 현재 위치
    const router = useDesktopRouterActions(); // 이동 동작
    const { preferences } = useTextPlayPreferences(); // Text-Play 설정
    const llmSelection = useMemo(() => createDesktopLLMSelection(preferences, localAIClient), [localAIClient, preferences]); // 설정 기반 AI 생성
    const match = matchDesktopRoute(location); // 경로 찾기
    const title = getDesktopRouteTitle(match); // 화면 제목
    const redirectTo = match.kind === "redirect" ? match.to : null; // 이동 대상
    useEffect(() => // 주소 이동 처리
    { // 효과 시작
        if (redirectTo !== null) // 이동 필요 확인
        { // 조건 시작
            router.replace(redirectTo); // 기록 교체 이동
        } // 조건 종료
    }, [redirectTo, router]); // 이동 대상 의존
    useEffect(() => // 문서 제목 반영
    { // 효과 시작
        document.title = `${title} | MATE Text-Play`; // 창 문서 제목
    }, [title]); // 제목 의존
    if (match.kind === "text-play-play") // 플레이 화면 확인
    { // 조건 시작
        return <DesktopErrorBoundary key={location.search}><TextPlayProvider repository={repository} llm={llmSelection.adapter} llmLabel={llmSelection.label} resumeSlot={match.resumeSlot} language={preferences.language}><TextPlayScreen /></TextPlayProvider></DesktopErrorBoundary>; // 전체 창 플레이 화면
    } // 조건 종료
    return <DesktopShell pathname={location.pathname} area={getDesktopAreaId(match)} title={title} repository={repository}><DesktopErrorBoundary key={location.pathname}>{renderPage(match, repository, modelStoreClient)}</DesktopErrorBoundary></DesktopShell>; // 사이드바 틀 화면
} // 함수 종료
