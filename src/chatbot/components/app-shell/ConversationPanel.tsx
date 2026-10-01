"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { usePathname, useRouter, useSearchParams } from "@/desktop/next-compat/navigation"; // 경로 도구
import { Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"; // 리액트 도구
import { autoOrganizeConversations, buildConversationListItems, CONVERSATION_PIN_LIMIT, conversationFilterOptions, conversationSortOptions, filterConversationItems, formatConversationStatus, formatConversationTime, groupConversationItems, matchesConversationQuery, type ConversationListItem } from "@chatbot/features/conversation/conversation-list-model"; // 대화 목록 계산
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import type { ConversationSort } from "@chatbot/features/core/types"; // 정렬 타입

type FolderForm = { mode: "create"; moveConversationId: string | null } | { mode: "rename"; folderId: string }; // 폴더 만들기·이름 변경 입력

function createFolderId(): string // 새 폴더 식별자
{ // 함수 시작
    return `folder-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; // 시각·난수 조합
} // 함수 종료
import { createSessionHref, summarizeStoryContent } from "@chatbot/features/story/story-model"; // 스토리 주소·미리보기
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회

interface ConversationPanelProps // 패널 속성
{ // 구조 시작
    open: boolean; // 열림 상태
    onNavigate(): void; // 내부 이동 처리
} // 구조 종료

interface PanelNotice // 패널 안내
{ // 구조 시작
    message: string; // 안내 문구
    undoConversationId: string | null; // 되돌릴 보관 대화
} // 구조 종료

export function ConversationPanel(props: ConversationPanelProps) // 대화 패널(현재 주소 연결)
{ // 함수 시작
    return <Suspense fallback={<ConversationPanelView {...props} activeConversationId={null} />}><RoutedConversationPanel {...props} /></Suspense>; // 주소 읽기 경계 반환
} // 함수 종료

function RoutedConversationPanel(props: ConversationPanelProps) // 현재 대화 판별
{ // 함수 시작
    const pathname = usePathname() ?? ""; // 현재 경로
    const searchParams = useSearchParams(); // 검색 매개변수
    const chatPage = pathname.startsWith("/chat/") || /^\/stories\/[^/]+\/chat$/.test(pathname); // 캐릭터·스토리 대화 화면 판정
    const activeConversationId = chatPage ? searchParams?.get("conversation") ?? null : null; // 보고 있는 대화
    return <ConversationPanelView {...props} activeConversationId={activeConversationId} />; // 패널 반환
} // 함수 종료

function PinIcon({ label }: { label?: string }) // 고정 아이콘
{ // 함수 시작
    const accessibility = label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label }; // 장식·의미 구분
    return <svg className="conversation-pin-icon" {...accessibility} viewBox="0 0 24 24" width="13" height="13"><path d="M9 4h6l-1 5 3 3v2h-4v6l-1 1-1-1v-6H7v-2l3-3z" fill="currentColor" /></svg>; // 아이콘 반환
} // 함수 종료

function ConversationPanelView({ open, onNavigate, activeConversationId }: ConversationPanelProps & { activeConversationId: string | null }) // 대화 패널 화면
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태
    const router = useRouter(); // 경로 이동기
    const [query, setQuery] = useState(""); // 검색어
    const [menuFor, setMenuFor] = useState<string | null>(null); // 메뉴 연 대화
    const [renameFor, setRenameFor] = useState<string | null>(null); // 이름 변경 대화
    const [renameDraft, setRenameDraft] = useState(""); // 이름 초안
    const [deleteFor, setDeleteFor] = useState<string | null>(null); // 삭제 확인 대화
    const [notice, setNotice] = useState<PanelNotice | null>(null); // 패널 안내
    const [moveFor, setMoveFor] = useState<string | null>(null); // 폴더 고르기 메뉴를 연 대화
    const [folderForm, setFolderForm] = useState<FolderForm | null>(null); // 폴더 입력
    const [folderDraft, setFolderDraft] = useState(""); // 폴더 이름 초안
    const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set()); // 접은 폴더
    const folderInputRef = useRef<HTMLInputElement>(null); // 폴더 이름 입력
    const [, setTick] = useState(0); // 상대 시간 갱신
    const menuRef = useRef<HTMLDivElement>(null); // 열린 메뉴
    const renameInputRef = useRef<HTMLInputElement>(null); // 이름 입력
    const cancelDeleteRef = useRef<HTMLButtonElement>(null); // 삭제 취소 버튼
    const moreButtons = useRef(new Map<string, HTMLButtonElement>()); // 더보기 버튼 목록
    const undoButtonRef = useRef<HTMLButtonElement>(null); // 되돌리기 버튼
    const closeNoticeRef = useRef<HTMLButtonElement>(null); // 안내 닫기 버튼
    const pendingFocus = useRef<string | null>(null); // 다시 그린 뒤 초점 줄 대화
    const noticeFocus = useRef<"undo" | "close" | null>(null); // 카드가 사라진 뒤 초점 줄 안내 버튼
    const now = new Date(); // 현재 시각
    useEffect(() => // 분 단위 갱신 효과
    { // 효과 시작
        if (!open) // 닫힘 판정
        { // 조건 시작
            return; // 갱신 생략
        } // 조건 종료
        const timer = window.setInterval(() => setTick((tick) => tick + 1), 60_000); // 1분마다 다시 그림
        return () => window.clearInterval(timer); // 갱신 해제
    }, [open]); // 열림 의존
    useEffect(() => // 메뉴 위치·초점 효과
    { // 효과 시작
        const menu = menuRef.current; // 열린 메뉴
        if (menu === null) // 메뉴 닫힘 판정
        { // 조건 시작
            return; // 처리 생략
        } // 조건 종료
        const panelBox = menu.closest("aside")?.getBoundingClientRect(); // 패널 영역
        const navigation = document.querySelector<HTMLElement>(".mobile-bottom-navigation"); // 모바일 하단 메뉴
        const navigationTop = navigation !== null && getComputedStyle(navigation).display !== "none" ? navigation.getBoundingClientRect().top : Number.POSITIVE_INFINITY; // 하단 메뉴 위쪽
        const bottomLimit = Math.min(panelBox?.bottom ?? window.innerHeight, navigationTop); // 아래쪽 한계
        const box = menu.getBoundingClientRect(); // 메뉴 영역
        if (box.bottom > bottomLimit && box.top - box.height - 48 > (panelBox?.top ?? 0)) // 아래 공간 부족 판정
        { // 조건 시작
            menu.dataset.placement = "top"; // 위로 펼침
        } // 조건 종료
        menu.querySelector<HTMLElement>("[role='menuitem']")?.focus(); // 첫 항목 초점
    }, [menuFor, moveFor]); // 메뉴·폴더 고르기 의존
    useEffect(() => // 폴더 이름 입력 초점
    { // 효과 시작
        folderInputRef.current?.focus(); // 입력 초점
        folderInputRef.current?.select(); // 기존 이름 선택
    }, [folderForm]); // 폴더 입력 의존
    useEffect(() => // 이름 입력 초점 효과
    { // 효과 시작
        renameInputRef.current?.focus(); // 입력 초점
        renameInputRef.current?.select(); // 기존 이름 선택
    }, [renameFor]); // 이름 변경 의존
    useEffect(() => // 삭제 확인 초점 효과
    { // 효과 시작
        cancelDeleteRef.current?.focus(); // 안전한 취소 초점
    }, [deleteFor]); // 삭제 확인 의존
    useEffect(() => // 다시 그린 뒤 초점 복귀
    { // 효과 시작
        const target = pendingFocus.current; // 초점 대상
        if (target !== null) // 대상 존재 판정
        { // 조건 시작
            pendingFocus.current = null; // 요청 해제
            moreButtons.current.get(target)?.focus(); // 더보기 버튼 초점
        } // 조건 종료
        const noticeTarget = noticeFocus.current; // 안내 초점 대상
        if (noticeTarget !== null) // 대상 존재 판정
        { // 조건 시작
            noticeFocus.current = null; // 요청 해제
            (noticeTarget === "undo" ? undoButtonRef : closeNoticeRef).current?.focus(); // 안내 버튼 초점
        } // 조건 종료
    }); // 매 렌더 확인
    useEffect(() => // 메뉴 바깥 선택 효과
    { // 효과 시작
        if (menuFor === null) // 메뉴 닫힘 판정
        { // 조건 시작
            return; // 구독 생략
        } // 조건 종료
        const close = (event: PointerEvent) => // 바깥 선택 처리
        { // 처리 시작
            const target = event.target as Node; // 선택 요소
            if (!menuRef.current?.contains(target) && !moreButtons.current.get(menuFor)?.contains(target)) // 메뉴 바깥 판정
            { // 조건 시작
                setMenuFor(null); // 메뉴 닫기
            } // 조건 종료
        }; // 처리 종료
        document.addEventListener("pointerdown", close); // 선택 구독
        return () => document.removeEventListener("pointerdown", close); // 구독 해제
    }, [menuFor]); // 메뉴 의존
    const items = buildConversationListItems(state, now); // 진행 중인 대화
    const filter = state.settings.conversationFilter; // 대화 종류 탭
    const visibleItems = filterConversationItems(items, filter).filter((item) => matchesConversationQuery(item, query)); // 종류·검색 결과
    const groups = groupConversationItems(visibleItems, state.settings.conversationSort, state.pinnedConversationIds, now, state.conversationFolders, query.length === 0 && filter === "all"); // 화면 묶음(고정 → 폴더 → 날짜)
    const filterCounts = { all: items.length, character: items.filter((item) => item.conversation.mode === "character").length, story: items.filter((item) => item.conversation.mode === "story").length }; // 탭별 개수
    const archivedCount = state.conversations.filter((conversation) => conversation.archivedAt !== null).length; // 보관 대화 수
    const pinnedCount = items.filter((item) => item.pinned).length; // 고정 대화 수
    const openFolderForm = (form: FolderForm) => // 폴더 입력 열기
    { // 함수 시작
        setMenuFor(null); // 메뉴 닫기
        setMoveFor(null); // 폴더 고르기 닫기
        setFolderDraft(form.mode === "rename" ? state.conversationFolders.find((folder) => folder.id === form.folderId)?.name ?? "" : ""); // 기존 이름
        setFolderForm(form); // 입력 열기
    }; // 함수 종료
    const saveFolder = (event: FormEvent<HTMLFormElement>) => // 폴더 저장
    { // 함수 시작
        event.preventDefault(); // 문서 이동 차단
        const name = folderDraft.trim(); // 이름 정리
        if (folderForm === null || name.length === 0) // 빈 이름 판정
        { // 조건 시작
            return; // 입력 유지
        } // 조건 종료
        if (folderForm.mode === "rename") // 이름 변경
        { // 조건 시작
            dispatch({ type: "rename-folder", folderId: folderForm.folderId, name }); // 이름 반영
            setNotice({ message: `폴더 이름을 ‘${name.slice(0, 30)}’(으)로 바꿨습니다.`, undoConversationId: null }); // 안내
        } // 조건 종료
        else // 새 폴더
        { // 분기 시작
            const folderId = createFolderId(); // 식별자
            dispatch({ type: "create-folder", folder: { id: folderId, name, createdAt: new Date().toISOString() } }); // 폴더 추가
            if (folderForm.moveConversationId !== null) // 만들면서 넣을 대화
            { // 조건 시작
                dispatch({ type: "move-conversation-to-folder", conversationId: folderForm.moveConversationId, folderId }); // 대화 이동
            } // 조건 종료
            setNotice({ message: `‘${name.slice(0, 30)}’ 폴더를 만들었습니다.`, undoConversationId: null }); // 안내
        } // 분기 종료
        setFolderForm(null); // 입력 닫기
    }; // 함수 종료
    const deleteFolder = (folderId: string, name: string) => // 폴더 지우기(대화는 목록으로)
    { // 함수 시작
        dispatch({ type: "delete-folder", folderId }); // 삭제
        setNotice({ message: `‘${name}’ 폴더를 지웠습니다. 안의 대화는 목록으로 돌아갔어요.`, undoConversationId: null }); // 안내
        noticeFocus.current = "close"; // 안내에 초점
    }; // 함수 종료
    const toggleFolder = (folderId: string) => setCollapsed((current) => // 폴더 접고 펴기
    { // 갱신 시작
        const next = new Set(current); // 복사
        if (next.has(folderId)) // 접힘 판정
        { // 조건 시작
            next.delete(folderId); // 펴기
        } // 조건 종료
        else // 펼침
        { // 분기 시작
            next.add(folderId); // 접기
        } // 분기 종료
        return next; // 반환
    }); // 갱신 종료
    const moveToFolder = (item: ConversationListItem, folderId: string | null) => // 대화 폴더 이동
    { // 함수 시작
        closeMenu(item.conversation.id); // 메뉴 닫기
        dispatch({ type: "move-conversation-to-folder", conversationId: item.conversation.id, folderId }); // 이동
        const folderName = state.conversationFolders.find((folder) => folder.id === folderId)?.name; // 폴더 이름
        setNotice({ message: folderName === undefined ? `‘${item.conversation.title}’ 대화를 폴더에서 뺐습니다.` : `‘${item.conversation.title}’ 대화를 ‘${folderName}’ 폴더로 옮겼습니다.`, undoConversationId: null }); // 안내
    }; // 함수 종료
    const setFilterAll = () => // 전체 탭으로
    { // 함수 시작
        if (filter !== "all") // 다른 탭 판정
        { // 조건 시작
            dispatch({ type: "update-settings", settings: { conversationFilter: "all" } }); // 전체로
        } // 조건 종료
    }; // 함수 종료
    const autoOrganize = () => // 자동 정리
    { // 함수 시작
        const nowIso = new Date().toISOString(); // 정리 시각
        const next = autoOrganizeConversations(state, nowIso); // 정리 결과 미리 계산
        const moved = next.conversations.filter((conversation, index) => conversation.folderId !== state.conversations[index]?.folderId).length; // 옮겨질 대화 수
        if (moved === 0) // 정리할 대화 없음
        { // 조건 시작
            setNotice({ message: "같은 작품 대화가 두 개 이상이면 작품 이름 폴더로 묶어요. 지금은 정리할 대화가 없습니다.", undoConversationId: null }); // 안내
            return; // 중단
        } // 조건 종료
        dispatch({ type: "auto-organize-conversations", now: nowIso }); // 정리 실행
        setFilterAll(); // 폴더가 보이도록 전체 탭
        setNotice({ message: `대화 ${moved}개를 작품별 폴더로 정리했습니다.`, undoConversationId: null }); // 안내
    }; // 함수 종료
    const closeMenu = (conversationId: string) => // 메뉴 닫고 초점 복귀
    { // 함수 시작
        setMenuFor(null); // 메뉴 닫기
        setMoveFor(null); // 폴더 고르기 닫기
        pendingFocus.current = conversationId; // 초점 복귀 예약
    }; // 함수 종료
    const togglePin = (item: ConversationListItem) => // 고정 전환
    { // 함수 시작
        closeMenu(item.conversation.id); // 메뉴 닫기
        if (!item.pinned && pinnedCount >= CONVERSATION_PIN_LIMIT) // 한도 판정
        { // 조건 시작
            setNotice({ message: `대화방은 ${CONVERSATION_PIN_LIMIT}개까지 고정할 수 있습니다.`, undoConversationId: null }); // 한도 안내
            return; // 고정 중단
        } // 조건 종료
        dispatch({ type: "toggle-conversation-pin", conversationId: item.conversation.id }); // 고정 전환
        setNotice(null); // 기존 안내 해제
    }; // 함수 종료
    const startRename = (item: ConversationListItem) => // 이름 변경 시작
    { // 함수 시작
        setMenuFor(null); // 메뉴 닫기
        setDeleteFor(null); // 삭제 확인 닫기
        setRenameDraft(item.conversation.title); // 기존 이름
        setRenameFor(item.conversation.id); // 편집 대상
    }; // 함수 종료
    const finishRename = (conversationId: string) => // 이름 변경 종료
    { // 함수 시작
        setRenameFor(null); // 편집 종료
        pendingFocus.current = conversationId; // 초점 복귀 예약
    }; // 함수 종료
    const saveRename = (event: FormEvent<HTMLFormElement>, conversationId: string) => // 이름 저장
    { // 함수 시작
        event.preventDefault(); // 문서 이동 차단
        if (renameDraft.trim().length === 0) // 빈 이름 판정
        { // 조건 시작
            return; // 편집 유지
        } // 조건 종료
        dispatch({ type: "rename-conversation", conversationId, title: renameDraft }); // 이름 변경
        finishRename(conversationId); // 편집 종료
    }; // 함수 종료
    const archive = (item: ConversationListItem) => // 대화 보관
    { // 함수 시작
        setMenuFor(null); // 메뉴 닫기
        dispatch({ type: "archive-conversation", conversationId: item.conversation.id, archivedAt: new Date().toISOString() }); // 보관 실행
        setNotice({ message: `‘${item.conversation.title}’ 대화를 보관했습니다.`, undoConversationId: item.conversation.id }); // 되돌리기 안내
        noticeFocus.current = "undo"; // 사라진 카드 대신 되돌리기에 초점
    }; // 함수 종료
    const undoArchive = (conversationId: string) => // 보관 되돌리기
    { // 함수 시작
        dispatch({ type: "restore-conversation", conversationId }); // 복구 실행
        setNotice(null); // 안내 닫기
        pendingFocus.current = conversationId; // 초점 복귀 예약
    }; // 함수 종료
    const startDelete = (item: ConversationListItem) => // 삭제 확인 시작
    { // 함수 시작
        setMenuFor(null); // 메뉴 닫기
        setRenameFor(null); // 이름 변경 닫기
        setDeleteFor(item.conversation.id); // 확인 대상
    }; // 함수 종료
    const confirmDelete = (item: ConversationListItem) => // 삭제 확정
    { // 함수 시작
        setDeleteFor(null); // 확인 닫기
        if (!createBackup("conversation-delete")) // 백업 실패 판정
        { // 조건 시작
            pendingFocus.current = item.conversation.id; // 초점 복귀 예약
            return; // 삭제 중단
        } // 조건 종료
        if (item.conversation.id === activeConversationId) // 보고 있는 대화 판정
        { // 조건 시작
            router.push((item.story === null ? `/characters/${encodeURIComponent(item.character.id)}` : `/stories/${encodeURIComponent(item.story.id)}`) as Route); // 캐릭터·스토리 상세로 이동
        } // 조건 종료
        dispatch({ type: "delete-conversation", conversationId: item.conversation.id }); // 대화 삭제
        setNotice({ message: `‘${item.conversation.title}’ 대화를 삭제했습니다.`, undoConversationId: null }); // 삭제 안내
        noticeFocus.current = "close"; // 사라진 카드 대신 안내에 초점
    }; // 함수 종료
    const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => // 검색 키 처리
    { // 함수 시작
        if (event.key === "Escape" && query.length > 0) // 검색어 지우기 판정
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            setQuery(""); // 검색어 지우기
        } // 조건 종료
    }; // 함수 종료
    const handleMenuKey = (event: KeyboardEvent<HTMLDivElement>, conversationId: string) => // 메뉴 키 처리
    { // 함수 시작
        const menuItems = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']")); // 메뉴 항목
        const index = menuItems.indexOf(document.activeElement as HTMLElement); // 현재 위치
        if (event.key === "Escape") // 닫기 판정
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            closeMenu(conversationId); // 메뉴 닫기
        } // 조건 종료
        else if (event.key === "ArrowDown" || event.key === "ArrowUp") // 위아래 이동 판정
        { // 조건 시작
            event.preventDefault(); // 화면 이동 차단
            const step = event.key === "ArrowDown" ? 1 : -1; // 이동 방향
            menuItems[(index + step + menuItems.length) % menuItems.length]?.focus(); // 순환 이동
        } // 조건 종료
        else if (event.key === "Home" || event.key === "End") // 처음·끝 이동 판정
        { // 조건 시작
            event.preventDefault(); // 기본 동작 차단
            menuItems[event.key === "Home" ? 0 : menuItems.length - 1]?.focus(); // 처음·끝 이동
        } // 조건 종료
        else if (event.key === "Tab") // 탭 이동 판정
        { // 조건 시작
            setMenuFor(null); // 메뉴 닫기
            setMoveFor(null); // 폴더 고르기 닫기
        } // 조건 종료
    }; // 함수 종료
    const handleFolderKey = (event: KeyboardEvent<HTMLInputElement>) => // 폴더 이름 키 처리
    { // 함수 시작
        if (event.key === "Escape") // 취소 판정
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            setFolderForm(null); // 입력 닫기
        } // 조건 종료
    }; // 함수 종료
    const handleRenameKey = (event: KeyboardEvent<HTMLInputElement>, conversationId: string) => // 이름 입력 키 처리
    { // 함수 시작
        if (event.key === "Escape") // 취소 판정
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            finishRename(conversationId); // 편집 취소
        } // 조건 종료
    }; // 함수 종료
    const cardOrder = new Map(groups.flatMap((group) => group.items).map((item, index) => [item.conversation.id, index])); // 카드 번호(대비 교차용)
    return ( // 패널 반환
        <aside id="conversation-panel" className="conversation-panel" role="complementary" aria-label="진행 중인 대화방" aria-hidden={!open}> {/* 대화 패널 */}
            <div className="conversation-panel-heading"> {/* 제목 영역 */}
                <div className="conversation-panel-title"> {/* 제목 묶음 */}
                    <span>MY CHATS</span> {/* 제목 표제 */}
                    <div><h2>대화방</h2><span className="conversation-panel-count">{items.length}</span></div> {/* 제목과 개수 */}
                </div> {/* 제목 묶음 종료 */}
                {items.length === 0 ? null : ( // 정렬 표시 판정
                    <select className="conversation-sort" aria-label="대화방 정렬" value={state.settings.conversationSort} onChange={(event) => dispatch({ type: "update-settings", settings: { conversationSort: event.target.value as ConversationSort } })}> {/* 정렬 선택 */}
                        {conversationSortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)} {/* 정렬 선택지 */}
                    </select> // 정렬 종료
                )} {/* 정렬 판정 종료 */}
            </div> {/* 제목 영역 종료 */}
            <Link href={"/characters/new" as Route} className="conversation-create" onClick={onNavigate}>＋ 새 캐릭터 만들기</Link> {/* 제작 링크 */}
            {items.length === 0 ? null : ( // 검색 표시 판정
                <div className="conversation-search" role="search"> {/* 검색 영역 */}
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> {/* 검색 아이콘 */}
                    <input type="search" aria-label="대화방 검색" placeholder="대화방·캐릭터·메시지 검색" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKey} /> {/* 검색 입력 */}
                </div> // 검색 영역 종료
            )} {/* 검색 판정 종료 */}
            {items.length === 0 ? null : ( // 탭·폴더 도구 판정
                <div className="conversation-tools"> {/* 탭·폴더 도구 */}
                    <div className="conversation-filter" role="group" aria-label="대화 종류"> {/* 종류 탭 */}
                        {conversationFilterOptions.map((option) => <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => dispatch({ type: "update-settings", settings: { conversationFilter: option.id } })}>{option.label}<small>{filterCounts[option.id]}</small></button>)} {/* 탭 */}
                    </div> {/* 종류 탭 종료 */}
                    <div className="conversation-folder-tools"> {/* 폴더 도구 */}
                        <button type="button" onClick={() => openFolderForm({ mode: "create", moveConversationId: null })}>＋ 폴더</button> {/* 폴더 만들기 */}
                        <button type="button" title="같은 작품 대화 두 개 이상을 작품 이름 폴더로 묶어요" onClick={autoOrganize}>자동 정리</button> {/* 자동 정리 */}
                    </div> {/* 폴더 도구 종료 */}
                </div> // 도구 종료
            )} {/* 도구 판정 종료 */}
            {folderForm === null ? null : ( // 폴더 입력 판정
                <form className="conversation-folder-form" onSubmit={saveFolder}> {/* 폴더 입력 */}
                    <input ref={folderInputRef} aria-label="폴더 이름" placeholder="폴더 이름" value={folderDraft} maxLength={30} required onChange={(event) => setFolderDraft(event.target.value)} onKeyDown={handleFolderKey} /> {/* 이름 입력 */}
                    <div><button type="submit">{folderForm.mode === "create" ? "만들기" : "저장"}</button><button type="button" onClick={() => setFolderForm(null)}>취소</button></div> {/* 폴더 동작 */}
                </form> // 폴더 입력 종료
            )} {/* 폴더 입력 판정 종료 */}
            {notice === null ? null : ( // 안내 표시 판정
                <div className="conversation-notice" role="status"> {/* 패널 안내 */}
                    <p>{notice.message}</p> {/* 안내 문구 */}
                    {notice.undoConversationId === null ? null : <button ref={undoButtonRef} type="button" onClick={() => undoArchive(notice.undoConversationId as string)}>되돌리기</button>} {/* 되돌리기 */}
                    <button ref={closeNoticeRef} type="button" className="conversation-notice-close" aria-label="안내 닫기" onClick={() => setNotice(null)}>×</button> {/* 안내 닫기 */}
                </div> // 안내 종료
            )} {/* 안내 판정 종료 */}
            {items.length === 0 ? ( // 빈 목록 판정
                <div className="conversation-empty"> {/* 빈 안내 */}
                    <strong>진행 중인 대화가 없습니다.</strong> {/* 빈 제목 */}
                    <p>마음에 드는 캐릭터를 골라 첫 대화를 시작해 보세요.</p> {/* 빈 설명 */}
                    <Link href={"/explore" as Route} onClick={onNavigate}>캐릭터 탐색하기</Link> {/* 탐색 링크 */}
                </div> // 빈 안내 종료
            ) : visibleItems.length === 0 ? <p className="conversation-empty-search">{query.length > 0 ? `‘${query}’에 맞는 대화방이 없습니다.` : `${conversationFilterOptions.find((option) => option.id === filter)?.label ?? ""} 대화가 아직 없습니다.`}</p> : null} {/* 결과 없음 */}
            {groups.map((group) => ( // 묶음 순회
                <section key={group.id} className="conversation-group" aria-labelledby={`conversation-group-${group.id}`} data-folder={group.folderId === undefined ? undefined : "true"}> {/* 대화 묶음 */}
                    {group.folderId === undefined ? <h3 id={`conversation-group-${group.id}`} className="conversation-group-title" data-group={group.id}>{group.id === "pinned" ? <PinIcon /> : null}{group.label}</h3> : ( // 일반·폴더 제목
                        <div className="conversation-folder-head"> {/* 폴더 제목 줄 */}
                            <h3 id={`conversation-group-${group.id}`} className="conversation-group-title" data-group="folder"><button type="button" aria-expanded={!collapsed.has(group.folderId)} onClick={() => toggleFolder(group.folderId as string)}><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" fill="currentColor" /></svg>{group.label}<small><span className="sr-only">, 대화 </span>{group.items.length}<span className="sr-only">개</span></small></button></h3> {/* 폴더 제목(접기) */}
                            <button type="button" aria-label={`${group.label} 폴더 이름 변경`} onClick={() => openFolderForm({ mode: "rename", folderId: group.folderId as string })}>이름</button> {/* 이름 변경 */}
                            <button type="button" aria-label={`${group.label} 폴더 삭제`} onClick={() => deleteFolder(group.folderId as string, group.label)}>삭제</button> {/* 폴더 삭제 */}
                        </div> // 폴더 제목 줄 종료
                    )} {/* 제목 판정 종료 */}
                    {group.folderId !== undefined && collapsed.has(group.folderId) ? null : group.items.length === 0 ? <p className="conversation-folder-empty">빈 폴더예요. 대화 더보기의 ‘폴더로 이동’으로 넣어 보세요.</p> : ( // 접힘·빈 폴더 판정
                    <ul className="conversation-list"> {/* 대화 목록 */}
                        {group.items.map((item) => // 대화 순회
                        { // 순회 시작
                            const { conversation, character, story, summary } = item; // 항목 분해
                            const statusLine = item.locked ? "" : formatConversationStatus(item.latestStatus); // 마지막 상태창 줄
                            const tone = (cardOrder.get(conversation.id) ?? 0) % 2 === 0 ? "primary" : "secondary"; // 대비 교차
                            const active = conversation.id === activeConversationId; // 현재 대화 여부
                            return ( // 카드 반환
                                <li key={conversation.id} className="conversation-card" data-mode={conversation.mode} data-tone={tone} data-genre={getGenreKey(story?.tags ?? character.tags)} data-locked={item.locked ? "true" : undefined} data-active={active ? "true" : undefined}> {/* 대화 카드 */}
                                    <div className="conversation-card-main"> {/* 링크·더보기 영역 */}
                                        <Link href={createSessionHref(conversation) as Route} className="conversation-card-link" aria-current={active ? "page" : undefined} onClick={onNavigate}> {/* 대화 링크 */}
                                            <span className="conversation-card-avatar"><Image src={story?.coverImage ?? character.coverImage} alt="" width={88} height={88} /></span> {/* 캐릭터 얼굴·스토리 표지 */}
                                            <span className="conversation-card-body"> {/* 카드 본문 */}
                                                <span className="conversation-card-heading">{item.pinned ? <PinIcon label="고정한 대화" /> : null}{story === null ? null : <span className="conversation-card-mode">스토리</span>}<strong className="conversation-card-title">{conversation.title}</strong></span> {/* 대화 제목 */}
                                                <span className="conversation-card-message">{item.locked ? "19+ 잠금 · 19+를 켜면 대화를 볼 수 있습니다." : story === null ? summary.lastMessage : summarizeStoryContent(summary.lastMessage, conversation.storyCast)}</span> {/* 최근 메시지 */}
                                                {statusLine.length === 0 ? null : <span className="conversation-card-status"><svg aria-hidden="true" viewBox="0 0 24 24" width="11" height="11"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor" /></svg><span className="sr-only">마지막 상태 </span>{statusLine}</span>} {/* 마지막 상태창 장소·시간 */}
                                                <span className="conversation-card-relation"> {/* 관계 정보 */}
                                                    <span className="conversation-card-stage">{story === null ? summary.relationshipStage : `등장인물 ${conversation.storyCast.length}명`} · {summary.emotion}</span> {/* 관계 단계·인물 수·감정 */}
                                                    {story === null ? <span className="conversation-card-meter" role="meter" aria-label="관계 수치" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.relationshipLevel}><span style={{ width: `${summary.relationshipLevel}%` }} /></span> : null} {/* 관계 막대(캐릭터 대화만) */}
                                                </span> {/* 관계 정보 종료 */}
                                            </span> {/* 카드 본문 종료 */}
                                            <span className="conversation-card-meta"> {/* 오른쪽 정보 */}
                                                <time dateTime={item.lastActivityAt}>{formatConversationTime(item.lastActivityAt, now)}</time> {/* 마지막 활동 */}
                                                <span className="conversation-card-turns">{item.turnCount}턴</span> {/* 진행한 턴 */}
                                            </span> {/* 오른쪽 정보 종료 */}
                                        </Link> {/* 링크 종료 */}
                                        <button type="button" className="conversation-card-more" aria-label={`${conversation.title} 더보기`} aria-haspopup="menu" aria-expanded={menuFor === conversation.id} ref={(element) => { if (element === null) { moreButtons.current.delete(conversation.id); } else { moreButtons.current.set(conversation.id, element); } }} onClick={() => { setMoveFor(null); setMenuFor(menuFor === conversation.id ? null : conversation.id); }}><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><circle cx="5" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="19" cy="12" r="1.8" fill="currentColor" /></svg></button> {/* 더보기 버튼 */}
                                        {menuFor !== conversation.id ? null : ( // 메뉴 표시 판정
                                            <div ref={menuRef} className="conversation-menu" role="menu" aria-label={moveFor === conversation.id ? `${conversation.title} 옮길 폴더` : `${conversation.title} 메뉴`} onKeyDown={(event) => handleMenuKey(event, conversation.id)}> {/* 대화 메뉴 */}
                                                {moveFor === conversation.id ? ( // 폴더 고르기 판정
                                                    <> {/* 폴더 고르기 */}
                                                        <button type="button" role="menuitem" tabIndex={-1} className="conversation-menu-back" onClick={() => setMoveFor(null)}>‹ 뒤로</button> {/* 뒤로 */}
                                                        {state.conversationFolders.filter((folder) => folder.id !== conversation.folderId).map((folder) => <button key={folder.id} type="button" role="menuitem" tabIndex={-1} onClick={() => moveToFolder(item, folder.id)}>{folder.name}</button>)} {/* 폴더 목록 */}
                                                        {conversation.folderId === null ? null : <button type="button" role="menuitem" tabIndex={-1} onClick={() => moveToFolder(item, null)}>폴더에서 빼기</button>} {/* 폴더에서 빼기 */}
                                                        <button type="button" role="menuitem" tabIndex={-1} onClick={() => openFolderForm({ mode: "create", moveConversationId: conversation.id })}>＋ 새 폴더에 넣기</button> {/* 새 폴더 */}
                                                    </> // 폴더 고르기 종료
                                                ) : ( // 기본 메뉴
                                                <> {/* 기본 메뉴 */}
                                                <button type="button" role="menuitem" tabIndex={-1} onClick={() => togglePin(item)}>{item.pinned ? "고정 해제" : "고정"}</button> {/* 고정 전환 */}
                                                <button type="button" role="menuitem" tabIndex={-1} onClick={() => startRename(item)}>이름 변경</button> {/* 이름 변경 */}
                                                <button type="button" role="menuitem" tabIndex={-1} aria-haspopup="menu" onClick={() => setMoveFor(conversation.id)}>폴더로 이동</button> {/* 폴더로 이동 */}
                                                <Link href={(story === null ? `/characters/${character.id}` : `/stories/${story.id}`) as Route} role="menuitem" tabIndex={-1} onClick={() => { setMenuFor(null); onNavigate(); }}>{story === null ? "캐릭터 보기" : "스토리 보기"}</Link> {/* 캐릭터·스토리 상세 */}
                                                <button type="button" role="menuitem" tabIndex={-1} onClick={() => archive(item)}>보관</button> {/* 보관 */}
                                                <button type="button" role="menuitem" tabIndex={-1} className="conversation-menu-danger" onClick={() => startDelete(item)}>삭제</button> {/* 삭제 */}
                                                </> // 기본 메뉴 종료
                                                )} {/* 메뉴 판정 종료 */}
                                            </div> // 메뉴 종료
                                        )} {/* 메뉴 판정 종료 */}
                                    </div> {/* 링크·더보기 영역 종료 */}
                                    {renameFor !== conversation.id ? null : ( // 이름 변경 판정
                                        <form className="conversation-rename" onSubmit={(event) => saveRename(event, conversation.id)}> {/* 이름 변경 */}
                                            <input ref={renameInputRef} aria-label="대화방 이름" value={renameDraft} maxLength={60} required onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => handleRenameKey(event, conversation.id)} /> {/* 이름 입력 */}
                                            <div><button type="submit">저장</button><button type="button" onClick={() => finishRename(conversation.id)}>취소</button></div> {/* 이름 동작 */}
                                        </form> // 이름 변경 종료
                                    )} {/* 이름 변경 판정 종료 */}
                                    {deleteFor !== conversation.id ? null : ( // 삭제 확인 판정
                                        <div className="conversation-delete" role="group" aria-label="대화 삭제 확인"> {/* 삭제 확인 */}
                                            <p>‘{conversation.title}’ 대화와 메시지 {state.messages.filter((message) => message.conversationId === conversation.id).length}개를 삭제할까요? 삭제 전에 백업을 만듭니다.</p> {/* 삭제 안내 */}
                                            <div><button ref={cancelDeleteRef} type="button" onClick={() => { setDeleteFor(null); pendingFocus.current = conversation.id; }}>취소</button><button type="button" className="conversation-delete-confirm" onClick={() => confirmDelete(item)}>대화 삭제 확인</button></div> {/* 삭제 동작 */}
                                        </div> // 삭제 확인 종료
                                    )} {/* 삭제 확인 판정 종료 */}
                                </li> // 카드 종료
                            ); // 카드 반환 종료
                        })} {/* 순회 종료 */}
                    </ul> // 목록 종료
                    )} {/* 접힘 판정 종료 */}
                </section> // 묶음 종료
            ))} {/* 묶음 순회 종료 */}
            <Link href={"/library" as Route} className="conversation-library" onClick={onNavigate}><span>보관함</span>{archivedCount === 0 ? null : <small>보관한 대화 {archivedCount}</small>}</Link> {/* 보관함 링크 */}
        </aside> // 패널 종료
    ); // 반환 종료
} // 함수 종료
