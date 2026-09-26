"use client"; // 클라이언트 컴포넌트

import Image from "next/image"; // 최적화 이미지
import Link from "next/link"; // 내부 링크
import type { Route } from "next"; // 경로 타입
import { useState } from "react"; // 리액트 상태
import { createConversationExport } from "@/features/conversation/conversation-export"; // 대화 내보내기
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태
import type { Character, Conversation } from "@/features/core/types"; // 도메인 타입
import { downloadJsonFile } from "@/features/settings/data-download"; // 파일 다운로드
import styles from "@/features/library/LibraryScreen.module.css"; // 보관함 스타일

type LibraryTab = "created" | "drafts" | "bookmarks" | "conversations"; // 보관함 탭

const tabs: Array<{ id: LibraryTab; label: string }> = // 탭 목록
[ // 목록 시작
    { id: "created", label: "내 캐릭터" }, // 제작 탭
    { id: "drafts", label: "임시 저장" }, // 임시 탭
    { id: "bookmarks", label: "보관 캐릭터" }, // 보관 탭
    { id: "conversations", label: "진행 중인 대화" }, // 대화 탭
]; // 목록 종료

export function LibraryScreen() // 보관함 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const [activeTab, setActiveTab] = useState<LibraryTab>("created"); // 선택 탭
    const [deleteTarget, setDeleteTarget] = useState<Character | null>(null); // 삭제 대상
    const created = state.characters.filter((character) => character.creatorId === state.profile.id && character.publicationStatus === "published"); // 제작 목록
    const drafts = state.characters.filter((character) => character.creatorId === state.profile.id && character.publicationStatus === "draft"); // 임시 목록
    const bookmarks = state.bookmarkedCharacterIds.map((id) => state.characters.find((character) => character.id === id)).filter((character): character is Character => character !== undefined); // 보관 목록
    const remove = () => // 삭제 실행
    { // 함수 시작
        if (deleteTarget === null) // 대상 부재 판정
        { // 조건 시작
            return; // 삭제 중단
        } // 조건 종료
        dispatch({ type: "delete-character", characterId: deleteTarget.id }); // 캐릭터 삭제
        setDeleteTarget(null); // 대화상자 닫기
    }; // 함수 종료
    const characters = activeTab === "created" ? created : activeTab === "drafts" ? drafts : bookmarks; // 현재 캐릭터 목록
    return ( // 보관함 반환
        <main className={styles.page}> {/* 보관함 본문 */}
            <header className={styles.header}> {/* 상단 영역 */}
                <div><span>MY ARCHIVE</span><h1>내 작품과 보관함</h1><p>직접 만든 캐릭터와 이어 가는 이야기를 한곳에서 관리합니다.</p></div> {/* 제목 영역 */}
                <Link href={"/characters/new" as Route}>＋ 새 캐릭터 만들기</Link> {/* 제작 링크 */}
            </header> {/* 상단 종료 */}
            <div className={styles.tabs} role="tablist" aria-label="보관함 분류"> {/* 탭 목록 */}
                {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-label={tab.label} aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}<small>{tab.id === "created" ? created.length : tab.id === "drafts" ? drafts.length : tab.id === "bookmarks" ? bookmarks.length : state.conversations.length}</small></button>)} {/* 탭 항목 */}
            </div> {/* 탭 종료 */}
            <section className={styles.content} role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label}> {/* 탭 내용 */}
                {activeTab === "conversations" ? <ConversationGrid /> : <CharacterGrid characters={characters} tab={activeTab} onDelete={setDeleteTarget} onToggleBookmark={(characterId) => dispatch({ type: "toggle-bookmark", characterId })} onTogglePublication={(character) => dispatch({ type: "set-publication-status", characterId: character.id, status: character.publicationStatus === "draft" ? "published" : "draft" })} />} {/* 탭 콘텐츠 */}
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

function CharacterGrid({ characters, tab, onDelete, onToggleBookmark, onTogglePublication }: { characters: Character[]; tab: LibraryTab; onDelete(character: Character): void; onToggleBookmark(characterId: string): void; onTogglePublication(character: Character): void }) // 캐릭터 목록
{ // 함수 시작
    if (characters.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>아직 표시할 캐릭터가 없습니다.</strong><p>새 캐릭터를 만들거나 탐색에서 마음에 드는 캐릭터를 보관해 보세요.</p><Link href={tab === "bookmarks" ? "/" : "/characters/new" as Route}>{tab === "bookmarks" ? "캐릭터 탐색하기" : "캐릭터 만들기"}</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <div className={styles.grid}> {/* 카드 격자 */}
            {characters.map((character) => ( // 캐릭터 순회
                <article key={character.id} className={styles.card}> {/* 캐릭터 카드 */}
                    <Image src={character.coverImage} alt={character.name} width={320} height={420} /> {/* 대표 이미지 */}
                    <div className={styles.cardBody}> {/* 카드 본문 */}
                        <span>{character.publicationStatus === "draft" ? "임시 저장" : character.visibility === "public" ? "전체 공개" : "비공개"}</span> {/* 공개 상태 */}
                        <Link href={`/characters/${character.id}` as Route} aria-label={`${character.name} 상세 보기`}><h2>{character.name}</h2></Link> {/* 상세 링크 */}
                        <p>{character.summary}</p> {/* 한 줄 소개 */}
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

function ConversationGrid() // 대화 목록
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [renameTarget, setRenameTarget] = useState<Conversation | null>(null); // 이름 변경 대상
    const [renameDraft, setRenameDraft] = useState(""); // 이름 변경 초안
    const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null); // 삭제 대상
    const active = state.conversations.filter((conversation) => conversation.archivedAt === null); // 진행 대화 목록
    const archived = state.conversations.filter((conversation) => conversation.archivedAt !== null); // 보관 대화 목록
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
        const content = JSON.stringify(createConversationExport(conversation, state.messages), null, 2); // 내보내기 JSON 생성
        const filename = `${conversation.title.replace(/[^0-9A-Za-z가-힣_-]+/g, "-") || "conversation"}.json`; // 안전한 파일명 생성
        downloadJsonFile(filename, content); // 파일 다운로드
    }; // 함수 종료
    const deleteConversation = () => // 대화 삭제 함수
    { // 함수 시작
        if (deleteTarget === null) // 대상 부재 확인
        { // 조건 시작
            return; // 삭제 중단
        } // 조건 종료
        dispatch({ type: "delete-conversation", conversationId: deleteTarget.id }); // 대화 삭제
        setDeleteTarget(null); // 대화상자 닫기
    }; // 함수 종료
    const messageCount = deleteTarget === null ? 0 : state.messages.filter((message) => message.conversationId === deleteTarget.id).length; // 삭제 메시지 수
    if (state.conversations.length === 0) // 빈 목록 판정
    { // 조건 시작
        return <div className={styles.empty}><strong>진행 중인 대화가 없습니다.</strong><p>캐릭터 상세 화면에서 첫 대화를 시작해 보세요.</p><Link href="/">캐릭터 탐색하기</Link></div>; // 빈 화면
    } // 조건 종료
    return ( // 목록 반환
        <div className={styles.conversationSections}> {/* 대화 구역 */}
            <ConversationSection title="진행 중인 대화" conversations={active} characters={state.characters} renameTarget={renameTarget} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={startRename} onSaveRename={saveRename} onCancelRename={() => setRenameTarget(null)} onArchive={(conversation) => dispatch({ type: "archive-conversation", conversationId: conversation.id, archivedAt: new Date().toISOString() })} onRestore={(conversation) => dispatch({ type: "restore-conversation", conversationId: conversation.id })} onExport={exportConversation} onDelete={setDeleteTarget} /> {/* 진행 대화 */}
            {archived.length === 0 ? null : <ConversationSection title="보관한 대화" conversations={archived} characters={state.characters} renameTarget={renameTarget} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={startRename} onSaveRename={saveRename} onCancelRename={() => setRenameTarget(null)} onArchive={(conversation) => dispatch({ type: "archive-conversation", conversationId: conversation.id, archivedAt: new Date().toISOString() })} onRestore={(conversation) => dispatch({ type: "restore-conversation", conversationId: conversation.id })} onExport={exportConversation} onDelete={setDeleteTarget} />} {/* 보관 대화 */}
            {deleteTarget === null ? null : <div className={styles.dialogBackdrop}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="conversation-delete-title"><span>DELETE CONVERSATION</span><h2 id="conversation-delete-title">대화 삭제</h2><p><strong>{deleteTarget.title}</strong>과 연결된 메시지 {messageCount}개를 삭제합니다.</p><div><button type="button" onClick={() => setDeleteTarget(null)}>취소</button><button type="button" className={styles.danger} onClick={deleteConversation}>대화 삭제 확인</button></div></section></div>} {/* 삭제 대화상자 */}
        </div> // 구역 종료
    ); // 반환 종료
} // 함수 종료

function ConversationSection({ title, conversations, characters, renameTarget, renameDraft, onRenameDraft, onStartRename, onSaveRename, onCancelRename, onArchive, onRestore, onExport, onDelete }: { title: string; conversations: Conversation[]; characters: Character[]; renameTarget: Conversation | null; renameDraft: string; onRenameDraft(value: string): void; onStartRename(conversation: Conversation): void; onSaveRename(): void; onCancelRename(): void; onArchive(conversation: Conversation): void; onRestore(conversation: Conversation): void; onExport(conversation: Conversation): void; onDelete(conversation: Conversation): void }) // 대화 구역
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
                    if (character === undefined) // 캐릭터 부재 확인
                    { // 조건 시작
                        return null; // 카드 생략
                    } // 조건 종료
                    const editing = renameTarget?.id === conversation.id; // 편집 상태 확인
                    return <article key={conversation.id} className={styles.conversationCard}><Link href={`/chat/${character.id}` as Route}><Image src={character.coverImage} alt="" width={88} height={88} /><span><strong>{conversation.title}</strong><small>{character.name} · {conversation.relationshipStage} · {conversation.emotion}</small><p>{conversation.lastMessage}</p></span></Link>{editing ? <div className={styles.renameRow}><label>대화 이름<input value={renameDraft} maxLength={60} onChange={(event) => onRenameDraft(event.target.value)} /></label><button type="button" onClick={onSaveRename}>이름 저장</button><button type="button" onClick={onCancelRename}>취소</button></div> : null}<div className={styles.conversationActions}><button type="button" aria-label={`${conversation.title} 이름 변경`} onClick={() => onStartRename(conversation)}>이름 변경</button>{conversation.archivedAt === null ? <button type="button" aria-label={`${conversation.title} 보관`} onClick={() => onArchive(conversation)}>보관</button> : <button type="button" aria-label={`${conversation.title} 복구`} onClick={() => onRestore(conversation)}>복구</button>}<button type="button" aria-label={`${conversation.title} 내보내기`} onClick={() => onExport(conversation)}>내보내기</button><button type="button" aria-label={`${conversation.title} 삭제`} onClick={() => onDelete(conversation)}>삭제</button></div></article>; // 대화 카드 반환
                })} {/* 순회 종료 */}
            </div> {/* 격자 종료 */}
        </section> // 그룹 종료
    ); // 반환 종료
} // 함수 종료
