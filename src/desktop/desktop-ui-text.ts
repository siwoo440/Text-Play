import type { DesktopAreaId } from "@/desktop/router/desktop-areas"; // 메뉴 영역 식별자
import type { DesktopRouteMatch, DesktopSettingsSection } from "@/desktop/router/desktop-routes"; // 화면 경로 결과
import { defineText } from "@/features/text-play/i18n/localized-text"; // 언어별 글자 정의

type RouteTitleKind = Exclude<DesktopRouteMatch["kind"], "settings">; // 설정 말고 고정 제목을 쓰는 화면

export const DESKTOP_UI_TEXT = defineText( // 데스크톱 틀 글자
    { // 한국어 시작
        routeTitles: // 화면 제목
        { // 제목 시작
            home: "메인", explore: "탐색", character: "캐릭터 상세", "character-new": "캐릭터 만들기", "character-edit": "캐릭터 수정", // 캐릭터 화면
            chat: "대화", library: "내 작품", support: "고객 지원", "ai-models": "AI 모델", // 기본 화면
            "story-home": "스토리 모드", "story-new": "새 스토리 만들기", story: "스토리 상세", "story-chat": "스토리 대화", "story-edit": "스토리 수정", // 스토리 화면
            "text-play-home": "Text-Play", "text-play-play": "Text-Play 플레이", redirect: "이동 중", "not-found": "페이지를 찾을 수 없음", // 기타 화면
        } satisfies Record<RouteTitleKind, string>, // 제목 종료
        settingsTitle: (section: string) => `설정 · ${section}`, // 설정 제목
        settingsSections: { profile: "프로필 관리", tokens: "토큰 이용 내역", display: "화면 레이아웃", notifications: "알림과 선제 메시지", privacy: "개인정보 및 보안" } satisfies Record<DesktopSettingsSection, string>, // 설정 화면
        areas: { home: "메인", explore: "탐색", library: "내 작품", "text-play": "Text-Play", settings: "설정", "ai-models": "AI 모델", support: "고객 지원" } satisfies Record<DesktopAreaId, string>, // 사이드바 메뉴
        shell: // 데스크톱 틀
        { // 틀 시작
            sidebar: "Mate Verse 사이드바", // 사이드바
            brand: "Mate Verse 메인", // 브랜드 링크
            primaryMenu: "주요 메뉴", // 주요 메뉴
            programMenu: "프로그램 메뉴", // 프로그램 메뉴
            importChatBot: "ChatBot 기록 가져오기", // 기록 가져오기
            previousMenu: "이전 메뉴", // 이전 메뉴
            nextMenu: "다음 메뉴", // 다음 메뉴
            tokens: (balance: string) => `보유 토큰 ${balance}, 토큰 이용 내역 열기`, // 토큰 칩
            userPanel: "사용자 패널 열기와 닫기", // 사용자 패널
            openDataSettings: "데이터 관리 열기", // 데이터 관리
            close: "닫기", // 닫기
        }, // 틀 종료
        rooms: // Text-Play 대화방
        { // 대화방 시작
            title: "Text-Play 대화방", // 제목
            choose: "＋ Text-Play 작품 고르기", // 작품 고르기
            loadFailed: "Text-Play 기록을 불러오지 못했습니다.", // 불러오기 실패
            empty: "아직 Text-Play 기록이 없습니다.", // 빈 기록
            list: "Text-Play 진행 기록", // 기록 목록
            resume: (title: string, slot: string) => `${title} ${slot} 이어하기`, // 이어하기
        }, // 대화방 종료
        llm: { bundled: "내장 AI", local: (model: string) => `로컬 · ${model}`, temporary: "임시 인공지능" }, // AI 연결 이름
    }, // 한국어 종료
    { // 영어 시작
        routeTitles: // 화면 제목
        { // 제목 시작
            home: "Home", explore: "Explore", character: "Character", "character-new": "Create character", "character-edit": "Edit character", // 캐릭터 화면
            chat: "Chat", library: "My works", support: "Support", "ai-models": "AI models", // 기본 화면
            "story-home": "Story mode", "story-new": "Create story", story: "Story", "story-chat": "Story chat", "story-edit": "Edit story", // 스토리 화면
            "text-play-home": "Text-Play", "text-play-play": "Text-Play play", redirect: "Moving", "not-found": "Page not found", // 기타 화면
        }, // 제목 종료
        settingsTitle: (section: string) => `Settings · ${section}`, // 설정 제목
        settingsSections: { profile: "Profile", tokens: "Token history", display: "Screen layout", notifications: "Notifications and proactive messages", privacy: "Privacy and security" }, // 설정 화면
        areas: { home: "Home", explore: "Explore", library: "My works", "text-play": "Text-Play", settings: "Settings", "ai-models": "AI models", support: "Support" }, // 사이드바 메뉴
        shell: // 데스크톱 틀
        { // 틀 시작
            sidebar: "Mate Verse sidebar", // 사이드바
            brand: "Mate Verse home", // 브랜드 링크
            primaryMenu: "Main menu", // 주요 메뉴
            programMenu: "Program menu", // 프로그램 메뉴
            importChatBot: "Import ChatBot history", // 기록 가져오기
            previousMenu: "Previous menu", // 이전 메뉴
            nextMenu: "Next menu", // 다음 메뉴
            tokens: (balance: string) => `${balance} tokens, open token history`, // 토큰 칩
            userPanel: "Open or close user panel", // 사용자 패널
            openDataSettings: "Open data settings", // 데이터 관리
            close: "Close", // 닫기
        }, // 틀 종료
        rooms: // Text-Play 대화방
        { // 대화방 시작
            title: "Text-Play rooms", // 제목
            choose: "＋ Choose a Text-Play work", // 작품 고르기
            loadFailed: "Could not load Text-Play history.", // 불러오기 실패
            empty: "No Text-Play history yet.", // 빈 기록
            list: "Text-Play progress", // 기록 목록
            resume: (title: string, slot: string) => `Continue ${title} ${slot}`, // 이어하기
        }, // 대화방 종료
        llm: { bundled: "Built-in AI", local: (model: string) => `Local · ${model}`, temporary: "Temporary AI" }, // AI 연결 이름
    }, // 영어 종료
); // 글자 종료
