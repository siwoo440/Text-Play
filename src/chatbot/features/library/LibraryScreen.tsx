"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 링크
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import { useState, type ChangeEvent } from "react"; // 리액트 상태
import { canViewMatureContent, isMatureCharacter } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { getCharacterDetailProfile } from "@chatbot/features/character/character-detail-model"; // 상세 프로필 조회
import { createConversationExport, mergeConversationExport, parseConversationExport } from "@chatbot/features/conversation/conversation-export"; // 대화 파일 도구
import { getConversationSummary, type ConversationSummary } from "@chatbot/features/conversation/conversation-versioning"; // 대화 요약 조회
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { Character, Conversation, Story } from "@chatbot/features/core/types"; // 도메인 타입
import { createSessionHref, getStoryCastEntries, isMatureStory, summarizeStoryContent } from "@chatbot/features/story/story-model"; // 스토리 주소·판정·미리보기·등장인물
import { downloadJsonFile } from "@chatbot/features/settings/data-download"; // 파일 다운로드
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import styles from "@chatbot/features/library/LibraryScreen.module.css"; // 보관함 스타일

type LibraryTab = "created" | "drafts" | "stories" | "bookmarks" | "conversations"; // 보관함 탭

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
]; // 목록 종료

export function LibraryScreen() // 보관함 화면
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태
    const [activeTab, setActiveTab] = useState<LibraryTab>("created"); // 선택 탭
    const [deleteTarget, setDeleteTarget] = useState<Character | null>(null); // 삭제 대상
    const created = state.characters.filter((character) => character.creatorId === state.profile.id && character.publicationStatus === "published"); // 제작 목록
    const drafts = state.characters.filter((character) => character.creatorId === state.profile.id && character.publicationStatus === "draft"); // 임시 목록
    const myStories = state.stories.filter((story) => story.creatorId === state.profile.id).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)); // 내 스토리
    const bookmarks = state.bookmarkedCharacterIds.map((id) => state.characters.find((character) => character.id === id)).filter((character): character is Character => character !== undefined); // 보관 목록
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
    return ( // 보관함 반환
        <main className={styles.page} data-surface="light"> {/* 보관함 본문 */}
            <header className={styles.header}> {/* 상단 영역 */}
                <div><span className={styles.eyebrow}>MY ARCHIVE</span><h1>내 작품과 <span className={styles.titleHighlight}>보관함</span></h1><p>직접 만든 캐릭터와 이어 가는 이야기를 한곳에서 관리합니다.</p></div> {/* 제목 영역 */}
                <div className={styles.headerActions}><Link href={"/images" as Route} className={styles.secondaryLink}>이미지 스튜디오</Link><Link href={"/characters/new" as Route}>＋ 새 캐릭터 만들기</Link></div> {/* 이미지·제작 링크 */}
            </header> {/* 상단 종료 */}
            <div className={styles.tabs} role="tablist" aria-label="보관함 분류"> {/* 탭 목록 */}
                {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-label={tab.label} aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}<small>{tab.id === "created" ? created.length : tab.id === "drafts" ? drafts.length : tab.id === "stories" ? myStories.length : tab.id === "bookmarks" ? bookmarks.length : state.conversations.length}</small></button>)} {/* 탭 항목 */}
            </div> {/* 탭 종료 */}
            <section className={styles.content} role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label}> {/* 탭 내용 */}
                {activeTab === "conversations" ? <ConversationGrid isLocked={isLocked} isStoryLocked={isStoryLocked} /> : activeTab === "stories" ? <StoryGrid stories={myStories} isStoryLocked={isStoryLocked} /> : <CharacterGrid characters={characters} tab={activeTab} isLocked={isLocked} onDelete={setDeleteTarget} onToggleBookmark={(characterId) => dispatch({ type: "toggle-bookmark", characterId })} onTogglePublication={(character) => dispatch({ type: "set-publication-status", characterId: character.id, status: character.publicationStatus === "draft" ? "published" : "draft" })} />} {/* 탭 콘텐츠 */}
            </section> {/* 내용 종료 */}
            {deleteTarget === null ? null : ( // 삭제 대화상자 조건
                <div className={styles.dialogBackdrop}> {/* 대화상자 배경 */}
                    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="delete-title"> {/* 삭제 대화상자 */}
                        <span>DELETE CHARACTER</span> {/* 삭제 표시 */}
                        <h2 id="delete-title">캐릭터 삭제</h2> {/* 대화상자 제목 */}
                        <p><strong>{deleteTarget.name}</strong>을 삭제합니다. 연결된 대화와 메시지도 함께 삭제됩니다.</p> {/* 삭제 안내 */}
                        <div><button type="button" onClick={() => setDeleteTarget(null)}>취소</button><button type="button" className={styles.danger} onClick={remove}>삭제 확인</button></div> {/* 삭제 동작 */}
                    </section> {/* 대화상자 종료 */}
                </div> // 배경 종료
            )} {/* 삭제 조건 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function CharacterGrid({ characters, tab, isLocked, onDelete, onToggleBookmark, onTogglePublication }: { characters: Character[]; tab: LibraryTab; isLocked(character: Character): boolean; onDelete(character: Character): void; onToggleBookmark(characterId: string): void; onTogglePublication(character: Character): void }) // 캐릭터 목록
{ // 함수 시작
    if (characters.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>아직 표시할 캐릭터가 없습니다.</strong><p>새 캐릭터를 만들거나 탐색에서 마음에 드는 캐릭터를 보관해 보세요.</p><Link href={tab === "bookmarks" ? "/" : "/characters/new" as Route}>{tab === "bookmarks" ? "캐릭터 탐색하기" : "캐릭터 만들기"}</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <div className={styles.grid}> {/* 카드 격자 */}
            {characters.map((character) => ( // 캐릭터 순회
                <article key={character.id} className={styles.card} data-genre={getGenreKey(character.tags)} data-locked={isLocked(character) ? "true" : undefined}> {/* 캐릭터 카드 */}
                    <Image src={character.coverImage} alt={character.name} width={320} height={420} /> {/* 대표 이미지 */}
                    {isLocked(character) ? <span className={styles.lockBadge}>19+ 잠금</span> : null} {/* 잠금 표시 */}
                    <div className={styles.cardBody}> {/* 카드 본문 */}
                        <span>{character.publicationStatus === "draft" ? "임시 저장" : character.visibility === "public" ? "전체 공개" : "비공개"}</span> {/* 공개 상태 */}
                        <Link href={`/characters/${character.id}` as Route} aria-label={`${character.name} 상세 보기`}><h2>{character.name}</h2></Link> {/* 상세 링크 */}
                        <p>{isLocked(character) ? "19세 이용가 캐릭터입니다. 19+를 켜면 내용을 볼 수 있습니다." : character.summary}</p> {/* 한 줄 소개 */}
                        <small>최근 수정 {new Date(character.updatedAt).toLocaleDateString("ko-KR")}</small> {/* 수정 시각 */}
                        <div className={styles.cardActions}> {/* 카드 동작 */}
                            {tab === "bookmarks" ? <button type="button" aria-label={`${character.name} 보관 해제`} onClick={() => onToggleBookmark(character.id)}>보관 해제</button> : <><Link href={`/characters/${character.id}/edit` as Route}>수정</Link><button type="button" onClick={() => onTogglePublication(character)}>{character.publicationStatus === "draft" ? "공개 전환" : "임시 전환"}</button><button type="button" aria-label={`${character.name} 삭제`} onClick={() => onDelete(character)}>삭제</button></>} {/* 탭별 동작 */}
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
    const visibilityLabel = (story: Story) => story.publicationStatus === "draft" ? "임시 저장" : story.visibility === "public" ? "전체 공개" : story.visibility === "unlisted" ? "링크 공개" : "비공개"; // 상태 표시
    const conversationCount = deleteTarget === null ? 0 : state.conversations.filter((conversation) => conversation.storyId === deleteTarget.id).length; // 삭제될 대화 수
    if (stories.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>아직 만든 스토리가 없습니다.</strong><p>캐릭터 1~4명을 불러 모아 하나의 상황극을 만들어 보세요.</p><Link href={"/stories/new" as Route}>＋ 새 스토리 만들기</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <> {/* 목록·대화상자 */}
            <div className={styles.grid}> {/* 카드 격자 */}
                {stories.map((story) => // 스토리 순회
                { // 순회 시작
                    const locked = isStoryLocked(story); // 19세 잠금 여부
                    const names = getStoryCastEntries(state, story.cast).map((entry) => entry.member.displayName).join(" · "); // 등장인물 이름
                    const action = story.publicationStatus === "draft" ? "공개 전환" : "임시 전환"; // 전환 문구
                    return ( // 카드 반환
                        <article key={story.id} className={styles.card} data-kind="story" data-genre={getGenreKey(story.tags)} data-locked={locked ? "true" : undefined}> {/* 스토리 카드 */}
                            <Image src={story.coverImage} alt={`${story.title} 표지`} width={320} height={420} /> {/* 표지 */}
                            {locked ? <span className={styles.lockBadge}>19+ 잠금</span> : null} {/* 잠금 표시 */}
                            <div className={styles.cardBody}> {/* 카드 본문 */}
                                <span>{visibilityLabel(story)}</span> {/* 공개 상태 */}
                                <Link href={`/stories/${encodeURIComponent(story.id)}` as Route}><h2>{story.title}</h2></Link> {/* 상세 링크 */}
                                <p>{locked ? "19세 이용가 스토리입니다. 19+를 켜면 내용을 볼 수 있습니다." : story.summary}</p> {/* 한 줄 소개 */}
                                <small>등장인물 {story.cast.length}명 · {names}</small> {/* 등장인물 */}
                                <small>최근 수정 {new Date(story.updatedAt).toLocaleDateString("ko-KR")}</small> {/* 수정 시각 */}
                                <div className={styles.cardActions}> {/* 카드 동작 */}
                                    <Link href={`/stories/${encodeURIComponent(story.id)}/edit` as Route} aria-label={`${story.title} 수정`}>수정</Link> {/* 수정 */}
                                    <button type="button" aria-label={`${story.title} ${action}`} onClick={() => togglePublication(story)}>{action}</button> {/* 공개 전환 */}
                                    <button type="button" aria-label={`${story.title} 삭제`} onClick={() => setDeleteTarget(story)}>삭제</button> {/* 삭제 */}
                                </div> {/* 동작 종료 */}
                            </div> {/* 본문 종료 */}
                        </article> // 카드 종료
                    ); // 카드 반환 종료
                })} {/* 순회 종료 */}
            </div> {/* 격자 종료 */}
            {deleteTarget === null ? null : ( // 삭제 대화상자 조건
                <div className={styles.dialogBackdrop}> {/* 대화상자 배경 */}
                    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="story-delete-title"> {/* 삭제 대화상자 */}
                        <span>DELETE STORY</span> {/* 삭제 표시 */}
                        <h2 id="story-delete-title">스토리 삭제</h2> {/* 대화상자 제목 */}
                        <p><strong>{deleteTarget.title}</strong>을 삭제합니다. 이 스토리로 진행한 대화 {conversationCount}개도 함께 삭제됩니다. 삭제 전에 백업을 만듭니다.</p> {/* 삭제 안내 */}
                        <div><button type="button" onClick={() => setDeleteTarget(null)}>취소</button><button type="button" className={styles.danger} onClick={remove}>스토리 삭제 확인</button></div> {/* 삭제 동작 */}
                    </section> {/* 대화상자 종료 */}
                </div> // 배경 종료
            )} {/* 삭제 조건 종료 */}
        </> // 묶음 종료
    ); // 반환 종료
} // 함수 종료

function ConversationGrid({ isLocked, isStoryLocked }: { isLocked(character: Character): boolean; isStoryLocked(story: Story): boolean }) // 대화 목록
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태 조회
    const [renameTarget, setRenameTarget] = useState<Conversation | null>(null); // 이름 변경 대상
    const [renameDraft, setRenameDraft] = useState(""); // 이름 변경 초안
    const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null); // 삭제 대상
    const [importStatus, setImportStatus] = useState(""); // 가져오기 안내
    const active = state.conversations.filter((conversation) => conversation.archivedAt === null); // 진행 대화 목록
    const archived = state.conversations.filter((conversation) => conversation.archivedAt !== null); // 보관 대화 목록
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
            setImportStatus(`대화 “${nextState.conversations.at(-1)?.title ?? imported.conversation.title}”을 가져왔습니다.`); // 성공 안내
        } // 시도 종료
        catch // 가져오기 실패 처리
        { // 실패 시작
            setImportStatus("대화 파일을 가져오지 못했습니다. 형식과 버전 관계를 확인해 주세요."); // 실패 안내
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
                <div><strong>대화 파일 가져오기</strong><span>내보낸 JSON 파일의 모든 대화 버전을 복원합니다.</span></div> {/* 가져오기 설명 */}
                <label>JSON 파일 선택<input type="file" accept="application/json,.json" aria-label="대화 가져오기" onChange={importConversation} /></label> {/* 파일 입력 */}
                {importStatus.length === 0 ? null : <p role="status">{importStatus}</p>} {/* 가져오기 안내 */}
            </div> {/* 가져오기 도구 종료 */}
            {state.conversations.length === 0 ? <div className={styles.empty}><strong>진행 중인 대화가 없습니다.</strong><p>캐릭터 상세 화면에서 첫 대화를 시작하거나 JSON 파일을 가져오세요.</p><Link href="/">캐릭터 탐색하기</Link></div> : null} {/* 빈 화면 */}
            <ConversationSection isLocked={isLocked} isStoryLocked={isStoryLocked} stories={state.stories} title="진행 중인 대화" conversations={active} summaries={summaries} characters={state.characters} renameTarget={renameTarget} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={startRename} onSaveRename={saveRename} onCancelRename={() => setRenameTarget(null)} onSelect={(conversation) => dispatch({ type: "select-conversation", conversationId: conversation.id })} onArchive={(conversation) => dispatch({ type: "archive-conversation", conversationId: conversation.id, archivedAt: new Date().toISOString() })} onRestore={(conversation) => dispatch({ type: "restore-conversation", conversationId: conversation.id })} onExport={exportConversation} onDelete={setDeleteTarget} /> {/* 진행 대화 */}
            {archived.length === 0 ? null : <ConversationSection isLocked={isLocked} isStoryLocked={isStoryLocked} stories={state.stories} title="보관한 대화" conversations={archived} summaries={summaries} characters={state.characters} renameTarget={renameTarget} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={startRename} onSaveRename={saveRename} onCancelRename={() => setRenameTarget(null)} onSelect={(conversation) => dispatch({ type: "select-conversation", conversationId: conversation.id })} onArchive={(conversation) => dispatch({ type: "archive-conversation", conversationId: conversation.id, archivedAt: new Date().toISOString() })} onRestore={(conversation) => dispatch({ type: "restore-conversation", conversationId: conversation.id })} onExport={exportConversation} onDelete={setDeleteTarget} />} {/* 보관 대화 */}
            {deleteTarget === null ? null : <div className={styles.dialogBackdrop}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="conversation-delete-title"><span>DELETE CONVERSATION</span><h2 id="conversation-delete-title">대화 삭제</h2><p><strong>{deleteTarget.title}</strong>과 연결된 메시지 {messageCount}개를 삭제합니다.</p><div><button type="button" onClick={() => setDeleteTarget(null)}>취소</button><button type="button" className={styles.danger} onClick={deleteConversation}>대화 삭제 확인</button></div></section></div>} {/* 삭제 대화상자 */}
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
                    const presetName = story === undefined ? profile.startPresets.find((preset) => preset.id === conversation.startSettings.presetId)?.name ?? "기본 설정" : "스토리 시작 장면"; // 시작 설정 이름
                    const subtitle = story === undefined ? `${character.name} · ${summary.relationshipStage} · ${summary.emotion}` : `스토리 · 등장인물 ${conversation.storyCast.length}명 · ${summary.emotion}`; // 카드 부제
                    const preview = story === undefined ? summary.lastMessage : summarizeStoryContent(summary.lastMessage, conversation.storyCast); // 최근 메시지 미리보기
                    const recentTime = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(summary.updatedAt)); // 최근 시각 표시
                    return <article key={conversation.id} className={styles.conversationCard} data-mode={conversation.mode} data-genre={getGenreKey(story?.tags ?? character.tags)} data-locked={locked ? "true" : undefined}><Link href={createSessionHref(conversation) as Route} onClick={() => onSelect(conversation)}><Image src={story?.coverImage ?? character.coverImage} alt="" width={88} height={88} /><span><strong>{conversation.title}</strong><small>{subtitle}</small><small className={styles.conversationMeta}>시작: {presetName} · 최근 {recentTime}</small><p>{locked ? "19+ 잠금 · 19+를 켜면 대화를 볼 수 있습니다." : preview}</p></span></Link>{editing ? <div className={styles.renameRow}><label>대화 이름<input value={renameDraft} maxLength={60} onChange={(event) => onRenameDraft(event.target.value)} /></label><button type="button" onClick={onSaveRename}>이름 저장</button><button type="button" onClick={onCancelRename}>취소</button></div> : null}<div className={styles.conversationActions}><button type="button" aria-label={`${conversation.title} 이름 변경`} onClick={() => onStartRename(conversation)}>이름 변경</button>{conversation.archivedAt === null ? <button type="button" aria-label={`${conversation.title} 보관`} onClick={() => onArchive(conversation)}>보관</button> : <button type="button" aria-label={`${conversation.title} 복구`} onClick={() => onRestore(conversation)}>복구</button>}<button type="button" aria-label={`${conversation.title} 내보내기`} onClick={() => onExport(conversation)}>내보내기</button><button type="button" aria-label={`${conversation.title} 삭제`} onClick={() => onDelete(conversation)}>삭제</button></div></article>; // 대화 카드 반환
                })} {/* 순회 종료 */}
            </div> {/* 격자 종료 */}
        </section> // 그룹 종료
    ); // 반환 종료
} // 함수 종료
