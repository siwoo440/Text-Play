import { createDefaultPersona } from "@chatbot/features/core/defaults"; // 기본 대화 프로필
import type { AppState } from "@chatbot/features/core/types"; // 앱 상태 타입
import { mockCharacters, mockConversations, mockConversationVersions, mockMessages, mockProfile } from "@chatbot/mocks/fixtures"; // Mock 기준값
import { mockStories } from "@chatbot/mocks/story-fixtures"; // 예시 스토리

export function createInitialState(): AppState // 초기 상태 생성 함수
{ // 함수 시작
    return ( // 초기 상태 반환
    { // 상태 시작
        schemaVersion: 12, // 스키마 버전
        providerMode: "mock", // Mock 공급자
        profile: structuredClone(mockProfile), // 사용자 복사본
        characters: structuredClone(mockCharacters), // 캐릭터 복사본
        stories: structuredClone(mockStories), // 예시 스토리 복사본
        images: [], // 생성 이미지 갤러리
        personas: [createDefaultPersona(mockProfile, "2026-09-22T00:00:00.000Z")], // 기본 대화 프로필
        conversationFolders: [], // 대화 폴더
        notifications: [{ id: "notice-welcome", kind: "notice", title: "Mate Verse에 오신 걸 환영해요", body: "대화 오른쪽 패널에서 대화 프로필·유저 노트·요약 메모리를 설정할 수 있어요.", href: null, read: false, createdAt: "2026-09-22T00:00:00.000Z" }], // 알림
        conversations: structuredClone(mockConversations), // 대화방 복사본
        conversationVersions: structuredClone(mockConversationVersions), // 대화 버전 복사본
        messages: structuredClone(mockMessages), // 메시지 복사본
        wallet: // 토큰 지갑
        { // 지갑 시작
            balance: 1240, // 초기 잔액
            totalUsed: 0, // 누적 사용량
            dailyChatUsed: 0, // 일일 대화 사용량
            dailyImageUsed: 0, // 일일 이미지 사용량
            updatedAt: "2026-09-22T00:00:00.000Z", // 수정 시각
        }, // 지갑 종료
        settings: // 앱 설정
        { // 설정 시작
            platformMode: "auto", // 자동 플랫폼
            layoutId: null, // 자동 레이아웃
            resolutionMode: "auto", // 자동 해상도
            leftPanelOpen: true, // 왼쪽 패널 열림
            rightPanelOpen: false, // 오른쪽 패널 닫힘
            proactiveMessageEnabled: true, // 선제 메시지 허용
            notificationStartTime: "09:00", // 알림 시작 시각
            notificationEndTime: "22:00", // 알림 종료 시각
            dailyNotificationLimit: 3, // 일일 알림 제한
            matureContentEnabled: false, // 19세 이상 콘텐츠 숨김
            conversationSort: "recent", // 최근 대화순 정렬
            conversationFilter: "all", // 모든 대화 종류
            chatFont: "default", // 기본 글꼴
            chatFontSize: "medium", // 보통 글자 크기
            chatTheme: "light", // 밝은 채팅
            showSceneImages: true, // 상황 이미지 보기
            statusPanelOpen: true, // 상태창 펼침
        }, // 설정 종료
        bookmarkedCharacterIds: [], // 보관 캐릭터
        memories: [], // 장기 기억 목록
        likedCharacterIds: [], // 좋아요 캐릭터
        followedCreatorIds: [], // 팔로우 제작자
        localReports: [], // 로컬 신고 목록
        pinnedConversationIds: [], // 고정 대화방
        selectedConversationId: "conversation-rian", // 선택 대화방
    }); // 상태 종료
} // 함수 종료
