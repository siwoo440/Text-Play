"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 링크
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import { useState, type ChangeEvent } from "react"; // 리액트 상태
import { canViewMatureContent, isMatureCharacter } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { getCharacterDetailProfile } from "@chatbot/features/character/character-detail-model"; // 상세 프로필 조회
import { createConversationExport, mergeConversationExport, parseConversationExport } from "@chatbot/features/conversation/conversation-export"; // 대화 파일 도구
import { getBookmarkEntries, type BookmarkEntry } from "@chatbot/features/chat/review-model"; // 책갈피한 답변
import { getConversationSummary, type ConversationSummary } from "@chatbot/features/conversation/conversation-versioning"; // 대화 요약 조회
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { Character, Conversation, Story } from "@chatbot/features/core/types"; // 도메인 타입
import { createSessionHref, getStoryCastEntries, isMatureStory, summarizeStoryContent } from "@chatbot/features/story/story-model"; // 스토리 주소·판정·미리보기·등장인물
import { downloadJsonFile } from "@chatbot/features/settings/data-download"; // 파일 다운로드
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import styles from "@chatbot/features/library/LibraryScreen.module.css"; // 보관함 스타일
import { localeTag, t, tc } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { ListSearch } from "@chatbot/components/search/ListSearch"; // 목록 검색창
import { searchBy } from "@chatbot/features/search/list-search"; // 목록 검색
import { DialogFrame } from "@chatbot/components/dialog/DialogFrame"; // 확인 대화상자 틀

type LibraryTab = "created" | "drafts" | "stories" | "bookmarks" | "conversations" | "replies"; // 보관함 탭

function readTextFile(file: File): Promise<string> // 텍스트 파일 읽기
{ // 함수 시작
    return new Promise((resolve, reject) => // 읽기 약속 생성
    { // 약속 시작
        const reader = new FileReader(); // 파일 읽기 도구 생성
        reader.addEventListener("load", () => resolve(typeof reader.result === "string" ? reader.result : "")); // 읽기 완료 처리
        reader.addEventListener("error", () => reject(reader.error ?? new Error("file-read-failed"))); // 읽기 실패 처리
        reader.readAsText(file); // 텍스트 읽기 시작
    }); // 약속 종료
} // 함수 종료

const tabs: Array<{ id: LibraryTab; label: string }> = // 탭 목록
[ // 목록 시작
    { id: "created", label: "내 캐릭터" }, // 제작 탭
    { id: "drafts", label: "임시 저장" }, // 임시 탭
    { id: "stories", label: "내 스토리" }, // 스토리 탭
    { id: "bookmarks", label: "보관 캐릭터" }, // 보관 탭
    { id: "conversations", label: "진행 중인 대화" }, // 대화 탭
    { id: "replies", label: "책갈피" }, // 책갈피한 답변 탭
]; // 목록 종료

export function LibraryScreen() // 보관함 화면
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태
    const [activeTab, setActiveTab] = useState<LibraryTab>("created"); // 선택 탭
    const [deleteTarget, setDeleteTarget] = useState<Character | null>(null); // 삭제 대상
    const [query, setQuery] = useState(""); // 보관함 검색어
    const created = state.characters.filter((character) => character.creatorId === state.profile.id && character.publicationStatus === "published"); // 제작 목록
    const drafts = state.characters.filter((character) => character.creatorId === state.profile.id && character.publicationStatus === "draft"); // 임시 목록
    const myStories = state.stories.filter((story) => story.creatorId === state.profile.id).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)); // 내 스토리
    const bookmarks = state.bookmarkedCharacterIds.map((id) => state.characters.find((character) => character.id === id)).filter((character): character is Character => character !== undefined); // 보관 목록
    const replies = getBookmarkEntries(state); // 책갈피한 답변
    const remove = () => // 삭제 실행
    { // 함수 시작
        if (deleteTarget === null) // 대상 부재 판정
        { // 조건 시작
            return; // 삭제 중단
        } // 조건 종료
        setDeleteTarget(null); // 대화상자 닫기
        if (!createBackup("character-delete")) // 백업 실패 판정
        { // 조건 시작
            return; // 삭제 중단(저장소 오류 안내는 공통 틀이 표시)
        } // 조건 종료
        dispatch({ type: "delete-character", characterId: deleteTarget.id }); // 캐릭터 삭제
    }; // 함수 종료
    const characters = activeTab === "created" ? created : activeTab === "drafts" ? drafts : bookmarks; // 현재 캐릭터 목록
    const showMature = canViewMatureContent(state, new Date()); // 19세 콘텐츠 표시 여부
    const isLocked = (character: Character) => isMatureCharacter(character) && !showMature; // 19세 잠금 판정
    const isStoryLocked = (story: Story) => isMatureStory(story) && !showMature; // 19세 스토리 잠금 판정
    const foundCharacters = searchBy(characters, query, (character) => [character.name, character.creatorName, ...character.tags]); // 찾은 캐릭터(이름·제작자·태그)
    const foundStories = searchBy(myStories, query, (story) => [story.title, ...story.tags, ...story.cast.map((member) => member.displayName)]); // 찾은 스토리(제목·태그·등장인물)
    const foundReplies = searchBy(replies, query, (entry) => [entry.title, entry.excerpt]); // 찾은 책갈피(대화방 이름·답변)
    const foundConversations = searchBy(state.conversations, query, (conversation) => // 찾은 대화(이름·캐릭터·스토리·마지막 말)
    { // 대상 시작
        const character = state.characters.find((item) => item.id === conversation.characterId); // 대화 캐릭터
        const story = conversation.storyId === null ? undefined : state.stories.find((item) => item.id === conversation.storyId); // 대화 스토리
        const locked = (character !== undefined && isLocked(character)) || (story !== undefined && isStoryLocked(story)); // 19세 잠금
        return [conversation.title, character?.name, story?.title, ...(locked ? [] : state.messages.filter((message) => message.versionId === conversation.currentVersionId && message.role !== "system").map((message) => message.content))]; // 검색 대상(잠기지 않았으면 지금 버전의 대화 전체)
    }); // 대상 종료
    const searching = query.trim().length > 0; // 검색 중
    const foundCount = activeTab === "replies" ? foundReplies.length : activeTab === "conversations" ? foundConversations.length : activeTab === "stories" ? foundStories.length : foundCharacters.length; // 지금 탭에서 찾은 수
    return ( // 보관함 반환
        <main className={styles.page} data-surface="light"> {/* 보관함 본문 */}
            <header className={styles.header}> {/* 상단 영역 */}
                <div><span className={styles.eyebrow}>MY ARCHIVE</span><h1>{t("내 작품과")} <span className={styles.titleHighlight}>{t("보관함")}</span></h1><p>{t("직접 만든 캐릭터와 이어 가는 이야기를 한곳에서 관리합니다.")}</p></div> {/* 제목 영역 */}
                <div className={styles.headerActions}><Link href={"/images" as Route} className={styles.secondaryLink}>{t("이미지 스튜디오")}</Link><Link href={"/characters/new" as Route}>{t("＋ 새 캐릭터 만들기")}</Link></div> {/* 이미지·제작 링크 */}
            </header> {/* 상단 종료 */}
            <div className={styles.tabs} role="tablist" aria-label={t("보관함 분류")}> {/* 탭 목록 */}
                {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-label={tc("tab", tab.label)} aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tc("tab", tab.label)}<small>{tab.id === "created" ? created.length : tab.id === "drafts" ? drafts.length : tab.id === "stories" ? myStories.length : tab.id === "bookmarks" ? bookmarks.length : tab.id === "replies" ? replies.length : state.conversations.filter((conversation) => conversation.archivedAt === null).length}</small></button>)} {/* 탭 항목 */}
            </div> {/* 탭 종료 */}
            <div className={styles.searchRow}><ListSearch label={t("보관함 검색")} placeholder={t("이름·태그·대화 내용으로 찾기")} value={query} count={foundCount} onChange={setQuery} /></div> {/* 지금 탭 안에서 찾기 */}
            <section className={styles.content} role="tabpanel" aria-label={tc("tab", tabs.find((tab) => tab.id === activeTab)?.label ?? "")}> {/* 탭 내용 */}
                {searching && foundCount === 0 ? <div className={styles.empty}><strong>{t("‘{0}’에 맞는 항목이 없어요.", [query.trim()])}</strong><p>{t("다른 낱말로 찾아보거나 다른 탭을 눌러 보세요.")}</p></div> : activeTab === "replies" ? <ReplyList entries={foundReplies} onRemove={(messageId) => dispatch({ type: "toggle-message-bookmark", messageId })} /> : activeTab === "conversations" ? <ConversationGrid isLocked={isLocked} isStoryLocked={isStoryLocked} visibleIds={searching ? new Set(foundConversations.map((conversation) => conversation.id)) : null} /> : activeTab === "stories" ? <StoryGrid stories={foundStories} isStoryLocked={isStoryLocked} /> : <CharacterGrid characters={foundCharacters} tab={activeTab} isLocked={isLocked} onDelete={setDeleteTarget} onToggleBookmark={(characterId) => dispatch({ type: "toggle-bookmark", characterId })} onTogglePublication={(character) => dispatch({ type: "set-publication-status", characterId: character.id, status: character.publicationStatus === "draft" ? "published" : "draft" })} />} {/* 탭 콘텐츠 */}
            </section> {/* 내용 종료 */}
            {deleteTarget === null ? null : ( // 삭제 대화상자 조건
                <DialogFrame backdropClassName={styles.dialogBackdrop} className={styles.dialog} labelledBy="delete-title" onClose={() => setDeleteTarget(null)}> {/* 삭제 대화상자 */}
                        <span>DELETE CHARACTER</span> {/* 삭제 표시 */}
                        <h2 id="delete-title">{t("캐릭터 삭제")}</h2> {/* 대화상자 제목 */}
                        <p><strong>{deleteTarget.name}</strong>{t("을 삭제합니다. 연결된 대화와 메시지도 함께 삭제됩니다.")}</p> {/* 삭제 안내 */}
                        <div><button type="button" onClick={() => setDeleteTarget(null)}>{t("취소")}</button><button type="button" className={styles.danger} onClick={remove}>{t("삭제 확인")}</button></div> {/* 삭제 동작 */}
                    </DialogFrame> // 대화상자 종료
            )} {/* 삭제 조건 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function CharacterGrid({ characters, tab, isLocked, onDelete, onToggleBookmark, onTogglePublication }: { characters: Character[]; tab: LibraryTab; isLocked(character: Character): boolean; onDelete(character: Character): void; onToggleBookmark(characterId: string): void; onTogglePublication(character: Character): void }) // 캐릭터 목록
{ // 함수 시작
    if (characters.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>{t("아직 표시할 캐릭터가 없습니다.")}</strong><p>{t("새 캐릭터를 만들거나 탐색에서 마음에 드는 캐릭터를 보관해 보세요.")}</p><Link href={tab === "bookmarks" ? "/" : "/characters/new" as Route}>{tab === "bookmarks" ? t("캐릭터 탐색하기") : t("캐릭터 만들기")}</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <div className={styles.grid}> {/* 카드 격자 */}
            {characters.map((character) => ( // 캐릭터 순회
                <article key={character.id} className={styles.card} data-genre={getGenreKey(character.tags)} data-locked={isLocked(character) ? "true" : undefined}> {/* 캐릭터 카드 */}
                    <Image src={character.coverImage} alt={character.name} width={320} height={420} /> {/* 대표 이미지 */}
                    {isLocked(character) ? <span className={styles.lockBadge}>{t("19+ 잠금")}</span> : null} {/* 잠금 표시 */}
                    <div className={styles.cardBody}> {/* 카드 본문 */}
                        <span>{character.publicationStatus === "draft" ? t("임시 저장") : character.visibility === "public" ? t("전체 공개") : character.visibility === "unlisted" ? t("링크 공개") : t("비공개")}</span> {/* 공개 상태(스토리 카드와 같은 세 가지) */}
                        <Link href={`/characters/${character.id}` as Route} aria-label={t("{0} 상세 보기", [character.name])}><h2>{character.name}</h2></Link> {/* 상세 링크 */}
                        <p>{isLocked(character) ? t("19세 이용가 캐릭터입니다. 19+를 켜면 내용을 볼 수 있습니다.") : character.summary}</p> {/* 한 줄 소개 */}
                        <small>{t("최근 수정")} {new Date(character.updatedAt).toLocaleDateString(localeTag())}</small> {/* 수정 시각 */}
                        <div className={styles.cardActions}> {/* 카드 동작 */}
                            {tab === "bookmarks" ? <button type="button" aria-label={t("{0} 보관 해제", [character.name])} onClick={() => onToggleBookmark(character.id)}>{t("보관 해제")}</button> : <><Link href={`/characters/${character.id}/edit` as Route}>{t("수정")}</Link><button type="button" onClick={() => onTogglePublication(character)}>{character.publicationStatus === "draft" ? t("공개 전환") : t("임시 전환")}</button><button type="button" data-danger="true" aria-label={t("{0} 삭제", [character.name])} onClick={() => onDelete(character)}>{t("삭제")}</button></>} {/* 탭별 동작 */}
                        </div> {/* 동작 종료 */}
                    </div> {/* 본문 종료 */}
                </article> // 카드 종료
            ))} {/* 순회 종료 */}
        </div> // 격자 종료
    ); // 반환 종료
} // 함수 종료

function StoryGrid({ stories, isStoryLocked }: { stories: Story[]; isStoryLocked(story: Story): boolean }) // 내 스토리 목록
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태
    const [deleteTarget, setDeleteTarget] = useState<Story | null>(null); // 삭제 대상
    const remove = () => // 삭제 실행
    { // 함수 시작
        if (deleteTarget === null) // 대상 부재 판정
        { // 조건 시작
            return; // 삭제 중단
        } // 조건 종료
        setDeleteTarget(null); // 대화상자 닫기
        if (!createBackup("story-delete")) // 백업 실패 판정
        { // 조건 시작
            return; // 삭제 중단(저장소 오류 안내는 공통 틀이 표시)
        } // 조건 종료
        dispatch({ type: "delete-story", storyId: deleteTarget.id }); // 스토리 삭제
    }; // 함수 종료
    const togglePublication = (story: Story) => dispatch({ type: "upsert-story", story: { ...story, publicationStatus: story.publicationStatus === "draft" ? "published" : "draft", updatedAt: new Date().toISOString() } }); // 공개·임시 전환
    const visibilityLabel = (story: Story) => story.publicationStatus === "draft" ? t("임시 저장") : story.visibility === "public" ? t("전체 공개") : story.visibility === "unlisted" ? t("링크 공개") : t("비공개"); // 상태 표시
    const conversationCount = deleteTarget === null ? 0 : state.conversations.filter((conversation) => conversation.storyId === deleteTarget.id).length; // 삭제될 대화 수
    if (stories.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>{t("아직 만든 스토리가 없습니다.")}</strong><p>{t("캐릭터 1~4명을 불러 모아 하나의 상황극을 만들어 보세요.")}</p><Link href={"/stories/new" as Route}>{t("＋ 새 스토리 만들기")}</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <> {/* 목록·대화상자 */}
            <div className={styles.grid}> {/* 카드 격자 */}
                {stories.map((story) => // 스토리 순회
                { // 순회 시작
                    const locked = isStoryLocked(story); // 19세 잠금 여부
                    const names = getStoryCastEntries(state, story.cast).map((entry) => entry.member.displayName).join(" · "); // 등장인물 이름
                    const action = story.publicationStatus === "draft" ? t("공개 전환") : t("임시 전환"); // 전환 문구
                    return ( // 카드 반환
                        <article key={story.id} className={styles.card} data-kind="story" data-genre={getGenreKey(story.tags)} data-locked={locked ? "true" : undefined}> {/* 스토리 카드 */}
                            <Image src={story.coverImage} alt={t("{0} 표지", [story.title])} width={320} height={420} /> {/* 표지 */}
                            {locked ? <span className={styles.lockBadge}>{t("19+ 잠금")}</span> : null} {/* 잠금 표시 */}
                            <div className={styles.cardBody}> {/* 카드 본문 */}
                                <span>{visibilityLabel(story)}</span> {/* 공개 상태 */}
                                <Link href={`/stories/${encodeURIComponent(story.id)}` as Route}><h2>{t(story.title)}</h2></Link> {/* 상세 링크 */}
                                <p>{locked ? t("19세 이용가 스토리입니다. 19+를 켜면 내용을 볼 수 있습니다.") : story.summary}</p> {/* 한 줄 소개 */}
                                <small>{t("등장인물")} {story.cast.length}{t("명 ·")} {names}</small> {/* 등장인물 */}
                                <small>{t("최근 수정")} {new Date(story.updatedAt).toLocaleDateString(localeTag())}</small> {/* 수정 시각 */}
                                <div className={styles.cardActions}> {/* 카드 동작 */}
                                    <Link href={`/stories/${encodeURIComponent(story.id)}/edit` as Route} aria-label={t("{0} 수정", [story.title])}>{t("수정")}</Link> {/* 수정 */}
                                    <button type="button" aria-label={`${story.title} ${action}`} onClick={() => togglePublication(story)}>{action}</button> {/* 공개 전환 */}
                                    <button type="button" data-danger="true" aria-label={t("{0} 삭제", [story.title])} onClick={() => setDeleteTarget(story)}>{t("삭제")}</button> {/* 삭제 */}
                                </div> {/* 동작 종료 */}
                            </div> {/* 본문 종료 */}
                        </article> // 카드 종료
                    ); // 카드 반환 종료
                })} {/* 순회 종료 */}
            </div> {/* 격자 종료 */}
            {deleteTarget === null ? null : ( // 삭제 대화상자 조건
                <DialogFrame backdropClassName={styles.dialogBackdrop} className={styles.dialog} labelledBy="story-delete-title" onClose={() => setDeleteTarget(null)}> {/* 삭제 대화상자 */}
                        <span>DELETE STORY</span> {/* 삭제 표시 */}
                        <h2 id="story-delete-title">{t("스토리 삭제")}</h2> {/* 대화상자 제목 */}
                        <p><strong>{t(deleteTarget.title)}</strong>{t("을 삭제합니다. 이 스토리로 진행한 대화")} {conversationCount}{t("개도 함께 삭제됩니다. 삭제 전에 백업을 만듭니다.")}</p> {/* 삭제 안내 */}
                        <div><button type="button" onClick={() => setDeleteTarget(null)}>{t("취소")}</button><button type="button" className={styles.danger} onClick={remove}>{t("스토리 삭제 확인")}</button></div> {/* 삭제 동작 */}
                    </DialogFrame> // 대화상자 종료
            )} {/* 삭제 조건 종료 */}
        </> // 묶음 종료
    ); // 반환 종료
} // 함수 종료

function ConversationGrid({ isLocked, isStoryLocked, visibleIds }: { isLocked(character: Character): boolean; isStoryLocked(story: Story): boolean; visibleIds: ReadonlySet<string> | null }) // 대화 목록(검색 중이면 찾은 대화만)
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태 조회
    const [renameTarget, setRenameTarget] = useState<Conversation | null>(null); // 이름 변경 대상
    const [renameDraft, setRenameDraft] = useState(""); // 이름 변경 초안
    const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null); // 삭제 대상
    const [importStatus, setImportStatus] = useState(""); // 가져오기 안내
    const shown = visibleIds === null ? state.conversations : state.conversations.filter((conversation) => visibleIds.has(conversation.id)); // 보여 줄 대화(검색 결과)
    const active = shown.filter((conversation) => conversation.archivedAt === null); // 진행 대화 목록
    const archived = shown.filter((conversation) => conversation.archivedAt !== null); // 보관 대화 목록
    const summaries = new Map(state.conversations.flatMap((conversation) => // 대화 요약 색인
    { // 변환 시작
        const summary = getConversationSummary(state, conversation.id); // 대화 요약 조회
        return summary === null ? [] : [[conversation.id, summary] as const]; // 유효 요약 반환
    })); // 변환 종료
    const startRename = (conversation: Conversation) => // 이름 변경 시작
    { // 함수 시작
        setRenameTarget(conversation); // 대상 설정
        setRenameDraft(conversation.title); // 초안 설정
    }; // 함수 종료
    const saveRename = () => // 이름 저장 함수
    { // 함수 시작
        if (renameTarget === null) // 대상 부재 확인
        { // 조건 시작
            return; // 저장 중단
        } // 조건 종료
        dispatch({ type: "rename-conversation", conversationId: renameTarget.id, title: renameDraft }); // 이름 변경
        setRenameTarget(null); // 편집 종료
    }; // 함수 종료
    const exportConversation = (conversation: Conversation) => // 대화 내보내기 함수
    { // 함수 시작
        const content = JSON.stringify(createConversationExport(state, conversation.id), null, 2); // 내보내기 JSON 생성
        const filename = `${conversation.title.replace(/[^0-9A-Za-z가-힣_-]+/g, "-") || "conversation"}.json`; // 안전한 파일명 생성
        downloadJsonFile(filename, content); // 파일 다운로드
    }; // 함수 종료
    const importConversation = async (event: ChangeEvent<HTMLInputElement>) => // 대화 가져오기 함수
    { // 함수 시작
        const input = event.currentTarget; // 파일 입력 참조
        const file = input.files?.[0]; // 선택 파일 조회
        if (file === undefined) // 파일 부재 판정
        { // 조건 시작
            return; // 가져오기 중단
        } // 조건 종료
        try // 가져오기 시도
        { // 시도 시작
            const raw = await readTextFile(file); // 파일 내용 읽기
            const imported = parseConversationExport(raw); // 대화 파일 검증
            const nextState = mergeConversationExport(state, imported); // 대화 상태 병합
            dispatch({ type: "replace-state", state: nextState }); // 가져오기 상태 저장
            setImportStatus(t("대화 “{0}”을 가져왔습니다.", [nextState.conversations.at(-1)?.title ?? imported.conversation.title])); // 성공 안내
        } // 시도 종료
        catch (error: unknown) // 가져오기 실패 처리
        { // 실패 시작
            const reason = error instanceof SyntaxError ? t("JSON 파일이 아니거나 내용이 깨져 있어요.") : error instanceof Error && error.constructor === Error && error.message.length > 0 ? error.message : t("형식과 버전 관계를 확인해 주세요."); // 실패 이유(파일 검사에서 알려 준 이유만 그대로 보여 주고, 그 밖의 오류는 일반 안내)
            setImportStatus(t("대화 파일을 가져오지 못했습니다. {0}", [reason])); // 실패 안내
        } // 실패 종료
        input.value = ""; // 파일 선택 초기화
    }; // 함수 종료
    const deleteConversation = () => // 대화 삭제 함수
    { // 함수 시작
        if (deleteTarget === null) // 대상 부재 확인
        { // 조건 시작
            return; // 삭제 중단
        } // 조건 종료
        setDeleteTarget(null); // 대화상자 닫기
        if (!createBackup("conversation-delete")) // 백업 실패 판정
        { // 조건 시작
            return; // 삭제 중단(저장소 오류 안내는 공통 틀이 표시)
        } // 조건 종료
        dispatch({ type: "delete-conversation", conversationId: deleteTarget.id }); // 대화 삭제
    }; // 함수 종료
    const messageCount = deleteTarget === null ? 0 : state.messages.filter((message) => message.conversationId === deleteTarget.id).length; // 삭제 메시지 수
    return ( // 목록 반환
        <div className={styles.conversationSections}> {/* 대화 구역 */}
            <div className={styles.importToolbar}> {/* 가져오기 도구 */}
                <div><strong>{t("대화 파일 가져오기")}</strong><span>{t("내보낸 JSON 파일의 모든 대화 버전을 복원합니다.")}</span></div> {/* 가져오기 설명 */}
                <label>{t("JSON 파일 선택")}<input type="file" accept="application/json,.json" aria-label={t("대화 가져오기")} onChange={importConversation} /></label> {/* 파일 입력 */}
                {importStatus.length === 0 ? null : <p role="status">{importStatus}</p>} {/* 가져오기 안내 */}
            </div> {/* 가져오기 도구 종료 */}
            {state.conversations.length === 0 ? <div className={styles.empty}><strong>{t("진행 중인 대화가 없습니다.")}</strong><p>{t("캐릭터 상세 화면에서 첫 대화를 시작하거나 JSON 파일을 가져오세요.")}</p><Link href="/">{t("캐릭터 탐색하기")}</Link></div> : null} {/* 빈 화면 */}
            <ConversationSection isLocked={isLocked} isStoryLocked={isStoryLocked} stories={state.stories} title={t("진행 중인 대화")} conversations={active} summaries={summaries} characters={state.characters} renameTarget={renameTarget} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={startRename} onSaveRename={saveRename} onCancelRename={() => setRenameTarget(null)} onSelect={(conversation) => dispatch({ type: "select-conversation", conversationId: conversation.id })} onArchive={(conversation) => dispatch({ type: "archive-conversation", conversationId: conversation.id, archivedAt: new Date().toISOString() })} onRestore={(conversation) => dispatch({ type: "restore-conversation", conversationId: conversation.id })} onExport={exportConversation} onDelete={setDeleteTarget} /> {/* 진행 대화 */}
            {archived.length === 0 ? null : <ConversationSection isLocked={isLocked} isStoryLocked={isStoryLocked} stories={state.stories} title={t("보관한 대화")} conversations={archived} summaries={summaries} characters={state.characters} renameTarget={renameTarget} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={startRename} onSaveRename={saveRename} onCancelRename={() => setRenameTarget(null)} onSelect={(conversation) => dispatch({ type: "select-conversation", conversationId: conversation.id })} onArchive={(conversation) => dispatch({ type: "archive-conversation", conversationId: conversation.id, archivedAt: new Date().toISOString() })} onRestore={(conversation) => dispatch({ type: "restore-conversation", conversationId: conversation.id })} onExport={exportConversation} onDelete={setDeleteTarget} />} {/* 보관 대화 */}
            {deleteTarget === null ? null : <DialogFrame backdropClassName={styles.dialogBackdrop} className={styles.dialog} labelledBy="conversation-delete-title" onClose={() => setDeleteTarget(null)}><span>DELETE CONVERSATION</span><h2 id="conversation-delete-title">{t("대화 삭제")}</h2><p><strong>{t(deleteTarget.title)}</strong>{t("과 연결된 메시지")} {messageCount}{t("개를 삭제합니다.")}</p><div><button type="button" onClick={() => setDeleteTarget(null)}>{t("취소")}</button><button type="button" className={styles.danger} onClick={deleteConversation}>{t("대화 삭제 확인")}</button></div></DialogFrame>} {/* 삭제 대화상자 */}
        </div> // 구역 종료
    ); // 반환 종료
} // 함수 종료

function ConversationSection({ isLocked, isStoryLocked, stories, title, conversations, summaries, characters, renameTarget, renameDraft, onRenameDraft, onStartRename, onSaveRename, onCancelRename, onSelect, onArchive, onRestore, onExport, onDelete }: { isLocked(character: Character): boolean; isStoryLocked(story: Story): boolean; stories: Story[]; title: string; conversations: Conversation[]; summaries: Map<string, ConversationSummary>; characters: Character[]; renameTarget: Conversation | null; renameDraft: string; onRenameDraft(value: string): void; onStartRename(conversation: Conversation): void; onSaveRename(): void; onCancelRename(): void; onSelect(conversation: Conversation): void; onArchive(conversation: Conversation): void; onRestore(conversation: Conversation): void; onExport(conversation: Conversation): void; onDelete(conversation: Conversation): void }) // 대화 구역
{ // 함수 시작
    if (conversations.length === 0) // 빈 구역 확인
    { // 조건 시작
        return null; // 구역 생략
    } // 조건 종료
    return ( // 구역 반환
        <section className={styles.conversationGroup}> {/* 대화 그룹 */}
            <h2>{title}</h2> {/* 그룹 제목 */}
            <div className={styles.conversations}> {/* 대화 격자 */}
                {conversations.map((conversation) => // 대화 순회
                { // 순회 시작
                    const character = characters.find((item) => item.id === conversation.characterId); // 캐릭터 조회
                    const summary = summaries.get(conversation.id); // 대화 요약 조회
                    const story = conversation.mode === "story" ? stories.find((item) => item.id === conversation.storyId) : undefined; // 스토리 조회
                    if (character === undefined || summary === undefined || (conversation.mode === "story" && story === undefined)) // 캐릭터·스토리 부재 확인
                    { // 조건 시작
                        return null; // 카드 생략
                    } // 조건 종료
                    const editing = renameTarget?.id === conversation.id; // 편집 상태 확인
                    const locked = story === undefined ? isLocked(character) : isStoryLocked(story); // 19세 잠금 여부(스토리는 스토리 등급)
                    const profile = getCharacterDetailProfile(character); // 상세 프로필 조회
                    const presetName = story === undefined ? profile.startPresets.find((preset) => preset.id === conversation.startSettings.presetId)?.name ?? t("기본 설정") : t("스토리 시작 장면"); // 시작 설정 이름
                    const subtitle = story === undefined ? `${character.name} · ${t(summary.relationshipStage)} · ${t(summary.emotion)}` : t("스토리 · 등장인물 {0}명 · {1}", [conversation.storyCast.length, summary.emotion]); // 카드 부제
                    const preview = story === undefined ? summary.lastMessage : summarizeStoryContent(summary.lastMessage, conversation.storyCast); // 최근 메시지 미리보기
                    const recentTime = new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(summary.updatedAt)); // 최근 시각 표시
                    return <article key={conversation.id} className={styles.conversationCard} data-mode={conversation.mode} data-genre={getGenreKey(story?.tags ?? character.tags)} data-locked={locked ? "true" : undefined}><Link href={createSessionHref(conversation) as Route} onClick={() => onSelect(conversation)}><Image src={story?.coverImage ?? character.coverImage} alt="" width={88} height={88} /><span><strong>{t(conversation.title)}</strong><small>{subtitle}</small><small className={styles.conversationMeta}>{t("시작:")} {presetName} {t("· 최근")} {recentTime}</small><p>{locked ? t("19+ 잠금 · 19+를 켜면 대화를 볼 수 있습니다.") : preview}</p></span></Link>{editing ? <div className={styles.renameRow}><label>{t("대화 이름")}<input value={renameDraft} maxLength={60} onChange={(event) => onRenameDraft(event.target.value)} /></label><button type="button" onClick={onSaveRename}>{t("이름 저장")}</button><button type="button" onClick={onCancelRename}>{t("취소")}</button></div> : null}<div className={styles.conversationActions}><button type="button" aria-label={t("{0} 이름 변경", [conversation.title])} onClick={() => onStartRename(conversation)}>{t("이름 변경")}</button>{conversation.archivedAt === null ? <button type="button" aria-label={t("{0} 보관", [conversation.title])} onClick={() => onArchive(conversation)}>{t("보관")}</button> : <button type="button" aria-label={t("{0} 복구", [conversation.title])} onClick={() => onRestore(conversation)}>{t("복구")}</button>}<button type="button" aria-label={t("{0} 내보내기", [conversation.title])} onClick={() => onExport(conversation)}>{t("내보내기")}</button><button type="button" data-danger="true" aria-label={t("{0} 삭제", [conversation.title])} onClick={() => onDelete(conversation)}>{t("삭제")}</button></div></article>; // 대화 카드 반환
                })} {/* 순회 종료 */}
            </div> {/* 격자 종료 */}
        </section> // 그룹 종료
    ); // 반환 종료
} // 함수 종료

function ReplyList({ entries, onRemove }: { entries: BookmarkEntry[]; onRemove(messageId: string): void }) // 책갈피한 답변 목록(누르면 그 답변으로 이동)
{ // 함수 시작
    if (entries.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>{t("아직 책갈피한 답변이 없습니다.")}</strong><p>{t("대화하다 마음에 든 답변 아래의 ‘책갈피’를 누르면 이곳에 모여요.")}</p><Link href="/">{t("캐릭터 탐색하기")}</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <ul className={styles.replyList} aria-label={t("책갈피한 답변")}> {/* 책갈피 목록 */}
            {entries.map((entry) => ( // 책갈피 순회
                <li key={entry.messageId}> {/* 책갈피 */}
                    <Link href={entry.href as Route}><strong>{t(entry.title)}</strong><span>{entry.excerpt}</span><small>{new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(entry.createdAt))}</small></Link> {/* 답변으로 이동 */}
                    <button type="button" aria-label={t("{0} 책갈피 빼기: {1}", [entry.title, entry.excerpt])} onClick={() => onRemove(entry.messageId)}>{t("책갈피 빼기")}</button> {/* 빼기 */}
                </li> // 책갈피 종료
            ))} {/* 순회 종료 */}
        </ul> // 목록 종료
    ); // 반환 종료
} // 함수 종료
