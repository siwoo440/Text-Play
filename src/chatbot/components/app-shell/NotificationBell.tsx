"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect, useRef, useState } from "react"; // 리액트 도구
import { formatConversationTime } from "@chatbot/features/conversation/conversation-list-model"; // 상대 시간
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import type { NotificationKind } from "@chatbot/features/core/types"; // 알림 종류

const kindLabels: Record<NotificationKind, string> = { notice: "공지", image: "이미지", memory: "메모리" }; // 종류 이름

function BellIcon() // 종 아이콘
{ // 함수 시작
    return ( // 아이콘 반환
        <svg data-icon="bell" aria-hidden="true" focusable="false" viewBox="0 0 24 24"> {/* 종 도형 */}
            <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" /> {/* 종 몸통 */}
            <path d="M10 20.5a2 2 0 0 0 4 0" /> {/* 종 추 */}
        </svg> // 종 도형 종료
    ); // 반환 종료
} // 함수 종료

export function NotificationBell({ onNavigate }: { onNavigate(): void }) // 헤더 알림함
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const [open, setOpen] = useState(false); // 열림
    const buttonRef = useRef<HTMLButtonElement>(null); // 종 버튼
    const popoverRef = useRef<HTMLDivElement>(null); // 알림 목록
    const notifications = state.notifications; // 알림(최근 순)
    const unread = notifications.filter((item) => !item.read).length; // 안 읽은 수
    const close = (restoreFocus: boolean) => // 닫기(본 알림은 읽음 처리)
    { // 함수 시작
        setOpen(false); // 닫기
        if (unread > 0) // 안 읽은 알림 판정
        { // 조건 시작
            dispatch({ type: "mark-notifications-read" }); // 읽음 처리
        } // 조건 종료
        if (restoreFocus) // 초점 복귀 판정
        { // 조건 시작
            buttonRef.current?.focus(); // 종 버튼으로
        } // 조건 종료
    }; // 함수 종료
    const closeRef = useRef(close); // 최신 닫기 함수
    useEffect(() => // 최신 닫기 기억
    { // 효과 시작
        closeRef.current = close; // 갱신
    }); // 매 렌더
    useEffect(() => // 바깥 선택·Esc 닫기
    { // 효과 시작
        if (!open) // 닫힘 판정
        { // 조건 시작
            return; // 구독 생략
        } // 조건 종료
        popoverRef.current?.querySelector<HTMLElement>("button, a")?.focus(); // 첫 조작 요소 초점
        const handlePointer = (event: PointerEvent) => // 바깥 선택
        { // 처리 시작
            const target = event.target as Node; // 선택 요소
            if (!popoverRef.current?.contains(target) && !buttonRef.current?.contains(target)) // 바깥 판정
            { // 조건 시작
                closeRef.current(false); // 닫기
            } // 조건 종료
        }; // 처리 종료
        const handleKey = (event: KeyboardEvent) => // Esc 닫기
        { // 처리 시작
            if (event.key === "Escape") // 닫기 키
            { // 조건 시작
                event.preventDefault(); // 패널 닫기 방지 표시
                closeRef.current(true); // 닫고 초점 복귀
            } // 조건 종료
        }; // 처리 종료
        document.addEventListener("pointerdown", handlePointer); // 선택 구독
        document.addEventListener("keydown", handleKey, true); // 키 구독(패널 닫기보다 먼저)
        return () => // 해제
        { // 해제 시작
            document.removeEventListener("pointerdown", handlePointer); // 선택 해제
            document.removeEventListener("keydown", handleKey, true); // 키 해제
        }; // 해제 종료
    }, [open]); // 열림 의존
    const now = new Date(); // 현재 시각
    return ( // 알림함 반환
        <div className="app-notifications"> {/* 알림함 */}
            <button ref={buttonRef} type="button" aria-label={unread === 0 ? "알림함" : `알림함, 안 읽은 알림 ${unread}개`} aria-expanded={open} aria-controls="notification-popover" onClick={() => (open ? close(false) : setOpen(true))}> {/* 종 버튼 */}
                <BellIcon /> {/* 종 */}
                {unread === 0 ? null : <span className="app-notifications-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>} {/* 안 읽은 수 */}
            </button> {/* 종 버튼 종료 */}
            {!open ? null : ( // 목록 판정
                <div ref={popoverRef} id="notification-popover" className="app-notifications-popover" role="dialog" aria-label="알림함"> {/* 알림 목록 */}
                    <div className="app-notifications-head"> {/* 머리 */}
                        <strong>알림</strong> {/* 제목 */}
                        <button type="button" disabled={unread === 0} onClick={() => dispatch({ type: "mark-notifications-read" })}>모두 읽음</button> {/* 모두 읽음 */}
                        <button type="button" disabled={notifications.length === 0} onClick={() => dispatch({ type: "clear-notifications" })}>비우기</button> {/* 비우기 */}
                    </div> {/* 머리 종료 */}
                    {notifications.length === 0 ? <p className="app-notifications-empty">새 알림이 없어요. 이미지 완성·요약 메모리 추가 같은 소식이 여기에 모여요.</p> : ( // 빈 판정
                        <ul> {/* 알림 목록 */}
                            {notifications.map((item) => // 알림 순회
                            { // 순회 시작
                                const body = ( // 알림 내용
                                    <> {/* 내용 묶음 */}
                                        <span className="app-notifications-kind" data-kind={item.kind}>{kindLabels[item.kind]}</span> {/* 종류 */}
                                        <strong>{item.title}</strong> {/* 제목 */}
                                        {item.body.length === 0 ? null : <small>{item.body}</small>} {/* 내용 */}
                                        <time dateTime={item.createdAt}>{formatConversationTime(item.createdAt, now)}</time> {/* 시각 */}
                                    </> // 내용 묶음 종료
                                ); // 내용 종료
                                return ( // 항목 반환
                                    <li key={item.id} data-unread={item.read ? undefined : "true"}> {/* 알림 */}
                                        {item.href === null ? <div>{body}</div> : <Link href={item.href as Route} onClick={() => { close(false); onNavigate(); }}>{body}</Link>} {/* 이동 링크 */}
                                    </li> // 알림 종료
                                ); // 항목 반환 종료
                            })} {/* 순회 종료 */}
                        </ul> // 목록 종료
                    )} {/* 빈 판정 종료 */}
                </div> // 알림 목록 종료
            )} {/* 목록 판정 종료 */}
        </div> // 알림함 종료
    ); // 반환 종료
} // 함수 종료
