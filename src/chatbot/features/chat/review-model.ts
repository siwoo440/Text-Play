// 대화 다시 보기: 대화 안에서 말을 찾고, 책갈피한 답변을 모으고, 명장면 카드에 넣을 글을 다듬는다.
import { matchesKoreanText } from "@chatbot/features/conversation/conversation-list-model"; // 초성 포함 검색
import { getConversationVersion, getVersionMessages } from "@chatbot/features/conversation/conversation-versioning"; // 버전 조회
import type { AppState, Message } from "@chatbot/features/core/types"; // 도메인 타입
import { createSessionHref } from "@chatbot/features/story/story-model"; // 대화 주소

export const REVIEW_QUERY_LIMIT = 50; // 검색어 최대 글자 수
export const BOOKMARK_EXCERPT_LIMIT = 90; // 책갈피 목록에 보여 줄 글자 수
export const SCENE_CARD_TEXT_LIMIT = 220; // 명장면 카드에 넣는 글자 수
export const SCENE_CARD_WIDTH = 1080; // 카드 이미지 너비
export const SCENE_CARD_HEIGHT = 1350; // 카드 이미지 높이(4:5)
export const SCENE_CARD_MAX_LINES = 9; // 카드에 넣는 최대 줄 수

export function messageAnchor(messageId: string): string // 메시지로 바로 가는 화면 표식
{ // 함수 시작
    return `message-${messageId}`; // 표식 반환
} // 함수 종료

export function searchMessages(messages: readonly Pick<Message, "id" | "role" | "content">[], query: string): string[] // 대화에서 검색어가 든 메시지 찾기(대화 순서, 초성 포함)
{ // 함수 시작
    const text = query.trim(); // 검색어 정리
    return text.length === 0 ? [] : messages.filter((message) => message.role !== "system" && matchesKoreanText(message.content, text)).map((message) => message.id); // 찾은 메시지
} // 함수 종료

export function moveMatch(count: number, current: number, step: 1 | -1): number // 찾은 말 사이를 돌아가며 옮기기
{ // 함수 시작
    return count === 0 ? -1 : (current + step + count) % count; // 다음 위치(끝에서 처음으로)
} // 함수 종료

export function toPlainText(content: string): string // 지문 별표와 줄바꿈을 정리한 글
{ // 함수 시작
    return content.replace(/\*/g, "").replace(/\s+/g, " ").trim(); // 정리 반환
} // 함수 종료

export function createExcerpt(content: string, limit = BOOKMARK_EXCERPT_LIMIT): string // 목록에 보여 줄 짧은 글
{ // 함수 시작
    const text = toPlainText(content); // 정리한 글
    return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`; // 길면 줄임
} // 함수 종료

export function toCardText(content: string): string // 명장면 카드에 넣을 글(길면 줄임)
{ // 함수 시작
    return createExcerpt(content, SCENE_CARD_TEXT_LIMIT); // 카드 글 반환
} // 함수 종료

export function wrapCardLines(text: string, maxWidth: number, measure: (value: string) => number, maxLines = SCENE_CARD_MAX_LINES): string[] // 카드 너비에 맞춰 줄 나누기(띄어쓰기에서 먼저 나누고, 긴 낱말은 글자 단위로)
{ // 함수 시작
    const lines: string[] = []; // 완성한 줄
    let line = ""; // 만드는 중인 줄
    const push = (value: string) => { lines.push(value); line = ""; }; // 줄 마감
    for (const word of text.split(" ").filter((item) => item.length > 0)) // 낱말 순회
    { // 순회 시작
        const joined = line.length === 0 ? word : `${line} ${word}`; // 이어 붙인 줄
        if (measure(joined) <= maxWidth) // 너비 안
        { // 조건 시작
            line = joined; // 이어 붙임
            continue; // 다음 낱말
        } // 조건 종료
        if (line.length > 0) // 쓰던 줄이 있음
        { // 조건 시작
            push(line); // 줄 마감
        } // 조건 종료
        let rest = word; // 남은 낱말
        while (measure(rest) > maxWidth && rest.length > 1) // 한 줄보다 긴 낱말
        { // 반복 시작
            let cut = rest.length - 1; // 자를 자리
            while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) // 들어갈 때까지 줄임
            { // 반복 시작
                cut -= 1; // 한 글자 줄임
            } // 반복 종료
            push(rest.slice(0, cut)); // 잘라 낸 줄
            rest = rest.slice(cut); // 나머지
        } // 반복 종료
        line = rest; // 남은 글로 새 줄
    } // 순회 종료
    if (line.length > 0) // 마지막 줄
    { // 조건 시작
        lines.push(line); // 줄 추가
    } // 조건 종료
    if (lines.length <= maxLines) // 줄 수 안
    { // 조건 시작
        return lines; // 그대로
    } // 조건 종료
    const kept = lines.slice(0, maxLines); // 보여 줄 줄
    let last = `${kept[maxLines - 1]}…`; // 마지막 줄에 줄임표
    while (measure(last) > maxWidth && last.length > 2) // 줄임표가 넘치면
    { // 반복 시작
        last = `${last.slice(0, -2)}…`; // 한 글자 줄임
    } // 반복 종료
    return [...kept.slice(0, maxLines - 1), last]; // 줄임 반환
} // 함수 종료

export function sceneCardFileName(title: string, date: Date): string // 저장할 카드 파일 이름
{ // 함수 시작
    const safe = title.trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30); // 파일 이름에 쓸 수 없는 글자 정리
    const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(date).replace(/-/g, ""); // 서울 날짜(연월일)
    return `mateverse-scene-${safe.length === 0 ? "card" : safe}-${day}.png`; // 파일 이름 반환
} // 함수 종료

export interface BookmarkEntry // 책갈피한 답변 한 건
{ // 구조 시작
    messageId: string; // 메시지 식별자
    conversationId: string; // 대화방 식별자
    title: string; // 대화방 이름
    href: string; // 그 답변으로 바로 가는 주소
    excerpt: string; // 짧은 글
    createdAt: string; // 답변 시각
} // 구조 종료

export function getBookmarkedMessages(messages: readonly Message[]): Message[] // 책갈피한 메시지만
{ // 함수 시작
    return messages.filter((message) => message.bookmarked === true); // 책갈피 반환
} // 함수 종료

export function getBookmarkEntries(state: AppState): BookmarkEntry[] // 모든 대화방의 책갈피(지금 보는 대화 버전 기준, 최근 답변이 앞)
{ // 함수 시작
    return state.conversations.flatMap((conversation) => // 대화방 순회
    { // 순회 시작
        const version = getConversationVersion(state, conversation.id); // 현재 버전
        const messages = version === null ? [] : getBookmarkedMessages(getVersionMessages(state, conversation.id, version.id)); // 책갈피한 답변
        return messages.map((message) => ({ messageId: message.id, conversationId: conversation.id, title: conversation.title, href: `${createSessionHref(conversation)}&message=${encodeURIComponent(message.id)}`, excerpt: createExcerpt(message.content), createdAt: message.createdAt })); // 표시용 반환
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt)); // 최근 순
} // 함수 종료
