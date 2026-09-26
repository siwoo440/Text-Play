import type { AppState } from "@/features/core/types"; // 앱 상태 타입
import { mockCharacters, mockConversations, mockMessages, mockProfile } from "@/mocks/fixtures"; // Mock 기준값

export function createInitialState(): AppState // 초기 상태 생성 함수
{ // 함수 시작
    return ( // 초기 상태 반환
    { // 상태 시작
        schemaVersion: 5, // 스키마 버전
        providerMode: "mock", // Mock 공급자
        profile: structuredClone(mockProfile), // 사용자 복사본
        characters: structuredClone(mockCharacters), // 캐릭터 복사본
        conversations: structuredClone(mockConversations), // 대화방 복사본
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
        }, // 설정 종료
        bookmarkedCharacterIds: [], // 보관 캐릭터
        selectedConversationId: "conversation-rian", // 선택 대화방
    }); // 상태 종료
} // 함수 종료
