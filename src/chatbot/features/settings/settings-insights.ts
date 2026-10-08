// 설정 페이지 요약: 활동 수, 팔로우한 제작자, 대화방별 요약 메모리, 내가 한 신고, 허용 시간 막대, 진단 정보를 앱 상태에서 뽑는다(저장 구조 변경 없음).
import { reportReasonLabels } from "@chatbot/features/character/report-reasons"; // 신고 사유 이름
import type { AppState, CharacterMemory } from "@chatbot/features/core/types"; // 도메인 타입
import { createSessionHref } from "@chatbot/features/story/story-model"; // 대화 주소
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export interface ActivitySummary // 내 활동 요약
{ // 구조 시작
    characters: number; // 만든 캐릭터
    stories: number; // 만든 스토리
    conversations: number; // 대화방
    likes: number; // 좋아요한 캐릭터
    bookmarks: number; // 보관한 캐릭터
    follows: number; // 팔로우한 제작자
} // 구조 종료

export function getActivitySummary(state: Pick<AppState, "profile" | "characters" | "stories" | "conversations" | "likedCharacterIds" | "bookmarkedCharacterIds" | "followedCreatorIds">): ActivitySummary // 활동 요약 만들기
{ // 함수 시작
    return { characters: state.characters.filter((character) => character.creatorId === state.profile.id).length, stories: state.stories.filter((story) => story.creatorId === state.profile.id).length, conversations: state.conversations.length, likes: state.likedCharacterIds.length, bookmarks: state.bookmarkedCharacterIds.length, follows: state.followedCreatorIds.length }; // 수 반환
} // 함수 종료

export interface FollowedCreator // 팔로우한 제작자
{ // 구조 시작
    creatorId: string; // 제작자 식별자
    name: string; // 제작자 이름
    works: number; // 공개한 작품 수(캐릭터·스토리)
} // 구조 종료

export function getFollowedCreators(state: Pick<AppState, "characters" | "stories" | "followedCreatorIds">): FollowedCreator[] // 팔로우한 제작자 목록(최근 팔로우가 앞)
{ // 함수 시작
    return [...state.followedCreatorIds].reverse().map((creatorId) => // 최근 순 순회
    { // 순회 시작
        const characters = state.characters.filter((character) => character.creatorId === creatorId); // 그 제작자의 캐릭터
        const stories = state.stories.filter((story) => story.creatorId === creatorId); // 그 제작자의 스토리
        return { creatorId, name: characters[0]?.creatorName ?? stories[0]?.creatorName ?? t("알 수 없는 제작자"), works: characters.length + stories.length }; // 제작자 반환
    }); // 순회 종료
} // 함수 종료

export interface MemoryGroup // 대화방별 요약 메모리 묶음
{ // 구조 시작
    conversationId: string; // 대화방 식별자
    title: string; // 대화방 이름
    href: string | null; // 대화방 주소(지워진 대화는 없음)
    memories: CharacterMemory[]; // 메모리(최근 수정이 앞)
} // 구조 종료

export function getMemoryGroups(state: Pick<AppState, "memories" | "conversations">): MemoryGroup[] // 요약 메모리를 대화방별로 묶기(최근에 바뀐 대화방이 앞)
{ // 함수 시작
    const groups = new Map<string, CharacterMemory[]>(); // 대화방별 묶음
    for (const memory of state.memories) // 메모리 순회
    { // 순회 시작
        groups.set(memory.conversationId, [...(groups.get(memory.conversationId) ?? []), memory]); // 묶음에 추가
    } // 순회 종료
    const newest = (memories: CharacterMemory[]) => memories.reduce((latest, memory) => memory.updatedAt > latest ? memory.updatedAt : latest, ""); // 가장 최근 수정 시각
    return [...groups.entries()].map(([conversationId, memories]) => // 묶음 순회
    { // 순회 시작
        const conversation = state.conversations.find((item) => item.id === conversationId); // 대화방
        return { conversationId, title: conversation?.title ?? t("지워진 대화"), href: conversation === undefined ? null : createSessionHref(conversation), memories: [...memories].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) }; // 묶음 반환
    }).sort((left, right) => newest(right.memories).localeCompare(newest(left.memories))); // 최근에 바뀐 대화방 순
} // 함수 종료

export interface ReportEntry // 내가 한 신고 한 건
{ // 구조 시작
    id: string; // 신고 식별자
    characterName: string; // 신고한 캐릭터
    reason: string; // 사유 이름
    createdAt: string; // 신고 시각
} // 구조 종료

export function getReportEntries(state: Pick<AppState, "localReports" | "characters">): ReportEntry[] // 내가 한 신고 목록(최근 순)
{ // 함수 시작
    return [...state.localReports].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((report) => ({ id: report.id, characterName: state.characters.find((character) => character.id === report.characterId)?.name ?? t("지워진 캐릭터"), reason: reportReasonLabels[report.reason], createdAt: report.createdAt })); // 표시용 반환
} // 함수 종료

export interface NotificationWindow // 하루 막대에 그릴 허용 시간
{ // 구조 시작
    startPercent: number; // 시작 위치(하루 중 %)
    widthPercent: number; // 길이(하루 중 %)
    label: string; // 길이 문구(예: 13시간, 1시간 30분)
} // 구조 종료

function toMinutes(value: string): number | null // 시:분 글자를 분으로
{ // 함수 시작
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value); // 형식 확인
    return match === null ? null : Number(match[1]) * 60 + Number(match[2]); // 분 반환
} // 함수 종료

export function getNotificationWindow(startTime: string, endTime: string): NotificationWindow | null // 허용 시간 막대 계산(시작이 종료보다 빨라야 함)
{ // 함수 시작
    const start = toMinutes(startTime); // 시작(분)
    const end = toMinutes(endTime); // 종료(분)
    if (start === null || end === null || end <= start) // 잘못된 범위
    { // 조건 시작
        return null; // 그리지 않음
    } // 조건 종료
    const length = end - start; // 길이(분)
    const hours = Math.floor(length / 60); // 시간
    const minutes = length % 60; // 분
    return { startPercent: start / 1440 * 100, widthPercent: length / 1440 * 100, label: [hours === 0 ? "" : t("{0}시간", [hours]), minutes === 0 ? "" : t("{0}분", [minutes])].filter(Boolean).join(" ") }; // 막대 반환
} // 함수 종료

export function formatBytes(bytes: number): string // 저장 용량 표시
{ // 함수 시작
    return bytes < 1024 ? `${bytes}B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1024 / 1024).toFixed(2)}MB`; // 단위별 반환
} // 함수 종료

export interface DiagnosticsInput // 진단 정보 재료
{ // 구조 시작
    appVersion: string; // 앱 버전
    state: Pick<AppState, "schemaVersion" | "providerMode" | "characters" | "stories" | "conversations" | "messages" | "images">; // 앱 상태
    storageBytes: number | null; // 저장 용량(알 수 없으면 없음)
    viewport: { width: number; height: number } | null; // 화면 크기
    userAgent: string | null; // 브라우저 정보
    responseMode?: string; // 응답 방식 안내(실제 AI 연결 상태를 읽은 화면이 넘김. 없으면 연습용으로 적음)
} // 구조 종료

export function buildDiagnostics(input: DiagnosticsInput): string // 문의할 때 붙일 진단 정보(이름·대화 내용 같은 개인 정보는 넣지 않음)
{ // 함수 시작
    const { state } = input; // 앱 상태
    return [ // 줄 목록
        t("Mate Verse 진단 정보"), // 제목
        t("앱 버전: {0}", [input.appVersion]), // 앱 버전
        t("데이터 버전: {0}", [state.schemaVersion]), // 데이터 버전
        t("응답 방식: {0}", [input.responseMode ?? (state.providerMode === "mock" ? t("로컬 Mock(외부 API 없음)") : state.providerMode)]), // 응답 방식
        t("저장 용량: {0}", [input.storageBytes === null ? t("알 수 없음") : formatBytes(input.storageBytes)]), // 저장 용량
        t("작품: 캐릭터 {0}개 · 스토리 {1}개 · 이미지 {2}장", [state.characters.length, state.stories.length, state.images.length]), // 작품 수
        t("대화: 대화방 {0}개 · 메시지 {1}개", [state.conversations.length, state.messages.length]), // 대화 수
        t("화면: {0}", [input.viewport === null ? t("알 수 없음") : `${input.viewport.width}×${input.viewport.height}`]), // 화면 크기
        t("브라우저: {0}", [input.userAgent ?? t("알 수 없음")]), // 브라우저
    ].join("\n"); // 한 덩어리 글
} // 함수 종료
