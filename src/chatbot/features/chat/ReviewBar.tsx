"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { createExcerpt, getBookmarkedMessages, moveMatch, REVIEW_QUERY_LIMIT, searchMessages } from "@chatbot/features/chat/review-model"; // 다시 보기 규칙
import type { Message } from "@chatbot/features/core/types"; // 메시지 타입
import styles from "@chatbot/features/chat/ReviewBar.module.css"; // 다시 보기 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface ReviewBarProps // 대화 다시 보기 속성
{ // 구조 시작
    messages: Message[]; // 지금 보는 대화의 메시지
    onFound(messageIds: string[]): void; // 찾은 메시지 표시
    onJump(messageId: string): void; // 그 메시지로 이동
    onClose(): void; // 닫기
} // 구조 종료

export function ReviewBar({ messages, onFound, onJump, onClose }: ReviewBarProps) // 대화 다시 보기(대화 안 검색과 책갈피 모아 보기)
{ // 함수 시작
    const [query, setQuery] = useState(""); // 검색어
    const [index, setIndex] = useState(-1); // 지금 보는 찾은 말
    const [showBookmarks, setShowBookmarks] = useState(false); // 책갈피 목록 열림
    const matches = searchMessages(messages, query); // 찾은 메시지(새 메시지가 오면 다시 계산)
    const bookmarks = getBookmarkedMessages(messages); // 책갈피한 답변
    const search = (value: string) => // 검색어 바꾸기
    { // 함수 시작
        setQuery(value); // 검색어 반영
        const found = searchMessages(messages, value); // 찾기
        onFound(found); // 찾은 메시지 표시
        setIndex(found.length === 0 ? -1 : found.length - 1); // 가장 최근 것부터
        if (found.length > 0) // 찾음
        { // 조건 시작
            onJump(found[found.length - 1]); // 가장 최근 것으로 이동
        } // 조건 종료
    }; // 함수 종료
    const move = (step: 1 | -1) => // 이전·다음 찾은 말
    { // 함수 시작
        const next = moveMatch(matches.length, Math.min(index, matches.length - 1), step); // 다음 위치
        if (next >= 0) // 찾은 말 있음
        { // 조건 시작
            setIndex(next); // 위치 반영
            onJump(matches[next]); // 이동
        } // 조건 종료
    }; // 함수 종료
    const close = () => // 닫기
    { // 함수 시작
        onFound([]); // 찾은 표시 지움
        onClose(); // 닫기
    }; // 함수 종료
    const position = matches.length === 0 ? -1 : Math.min(Math.max(index, 0), matches.length - 1); // 표시할 위치
    return ( // 다시 보기 반환
        <section id="chat-review-bar" className={styles.bar} aria-label={t("대화 다시 보기")}> {/* 대화 다시 보기 */}
            <div className={styles.row}> {/* 검색 줄 */}
                <label className={styles.search}><span className="sr-only">{t("대화 검색")}</span><input type="search" value={query} maxLength={REVIEW_QUERY_LIMIT} placeholder={t("이 대화에서 찾기")} autoFocus onChange={(event) => search(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); move(event.shiftKey ? -1 : 1); } }} /></label> {/* 검색어(Enter로 다음, Shift+Enter로 이전) */}
                <span className={styles.count} role="status" aria-label={t("찾은 말")}>{query.trim().length === 0 ? "" : matches.length === 0 ? t("찾은 말 없음") : `${position + 1}/${matches.length}`}</span> {/* 찾은 수 */}
                <button type="button" aria-label={t("이전 찾은 말")} disabled={matches.length === 0} onClick={() => move(-1)}>‹</button> {/* 이전 */}
                <button type="button" aria-label={t("다음 찾은 말")} disabled={matches.length === 0} onClick={() => move(1)}>›</button> {/* 다음 */}
                <button type="button" className={styles.bookmarkToggle} aria-expanded={showBookmarks} aria-controls="chat-review-bookmarks" onClick={() => setShowBookmarks(!showBookmarks)}>{t("책갈피")} {bookmarks.length}</button> {/* 책갈피 목록 열기 */}
                <button type="button" aria-label={t("대화 다시 보기 닫기")} onClick={close}>×</button> {/* 닫기 */}
            </div> {/* 검색 줄 종료 */}
            {showBookmarks ? ( // 책갈피 목록 판정
                <div id="chat-review-bookmarks" className={styles.bookmarks}> {/* 책갈피 목록 */}
                    {bookmarks.length === 0 ? <p>{t("아직 책갈피한 답변이 없어요. 답변 아래의 ‘책갈피’를 눌러 모아 보세요.")}</p> : <ul aria-label={t("책갈피한 답변")}>{bookmarks.map((message) => <li key={message.id}><button type="button" onClick={() => onJump(message.id)}>{createExcerpt(message.content)}</button></li>)}</ul>} {/* 답변으로 이동 */}
                </div> // 목록 종료
            ) : null} {/* 판정 종료 */}
        </section> // 다시 보기 종료
    ); // 반환 종료
} // 함수 종료
