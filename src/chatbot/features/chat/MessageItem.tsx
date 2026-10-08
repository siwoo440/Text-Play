"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import { useState, type FormEvent, type ReactNode } from "react"; // 리액트 상태
import type { EditMessageResult } from "@chatbot/features/chat/chat-controller"; // 수정 결과 타입
import { MessageIcon } from "@chatbot/features/chat/MessageIcon"; // 동작 버튼 그림
import { messageAnchor } from "@chatbot/features/chat/review-model"; // 메시지 표식
import { CHAT_MESSAGE_MAX_LENGTH, type MessageVersionGroup } from "@chatbot/features/conversation/conversation-versioning"; // 버전 도메인 타입
import type { Message } from "@chatbot/features/core/types"; // 메시지 타입
import { getMentionedCastMember, parseStoryMessage, STORY_CONTINUE_TEXT, type StoryCastEntry } from "@chatbot/features/story/story-model"; // 스토리 대사 나누기
import styles from "@chatbot/features/chat/MessageList.module.css"; // 메시지 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

export function renderEmphasis(text: string): ReactNode[] // *지문*을 기울임 글자로 바꾸기(별표는 숨김)
{ // 함수 시작
    return text.split(/(\*[^*\n]+\*)/g).filter((part) => part.length > 0).map((part, index) => /^\*[^*\n]+\*$/.test(part) ? <em key={index} className={styles.action}>{part.slice(1, -1)}</em> : part); // 조각 반환
} // 함수 종료

function StoryAssistantBody({ content, streaming, cast }: { content: string; streaming: boolean; cast: StoryCastEntry[] }) // 스토리 응답 본문(내레이션·인물별 대사)
{ // 함수 시작
    const segments = parseStoryMessage(content, cast.map((entry) => entry.member)); // 대사 나누기
    if (segments.length === 0) // 빈 응답 판정
    { // 조건 시작
        return <p data-stream-tail="">{streaming ? t("응답 작성 중…") : content}</p>; // 빈 응답 표시
    } // 조건 종료
    return ( // 본문 반환
        <div className={styles.storyBody}> {/* 스토리 본문 */}
            {segments.map((segment, index) => // 조각 순회
            { // 순회 시작
                const tail = index === segments.length - 1 ? "" : undefined; // 마지막 조각(스트리밍 커서 위치)
                if (segment.kind === "narration") // 내레이션 판정
                { // 조건 시작
                    return <p key={index} className={styles.narration} data-narration="" data-stream-tail={tail}>{renderEmphasis(segment.text)}</p>; // 내레이션 반환
                } // 조건 종료
                const character = cast.find((entry) => entry.member.characterId === segment.characterId)?.character; // 화자 캐릭터
                return ( // 인물 대사 반환
                    <div key={index} className={styles.speakerLine} data-speaker={segment.characterId ?? undefined}> {/* 인물 대사 */}
                        <span className={styles.speakerAvatar} aria-hidden="true">{character === undefined ? segment.label.slice(0, 1) : <Image src={character.coverImage} alt="" width={72} height={72} />}</span> {/* 인물 얼굴 */}
                        <div><strong>{t(segment.label)}</strong><p data-stream-tail={tail}>{renderEmphasis(segment.text)}</p></div> {/* 이름과 대사 */}
                    </div> // 인물 대사 종료
                ); // 반환 종료
            })} {/* 순회 종료 */}
        </div> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function StoryUserBody({ content, cast }: { content: string; cast: StoryCastEntry[] }) // 스토리 사용자 본문(진행·지목 표시)
{ // 함수 시작
    if (content.trim() === STORY_CONTINUE_TEXT) // 이야기 진행 판정
    { // 조건 시작
        return <p className={styles.continueChip}><span aria-hidden="true">▶</span> <span>{t("다음 장면으로")}</span></p>; // 진행 표시
    } // 조건 종료
    const member = getMentionedCastMember(content, cast.map((entry) => entry.member)); // 지목 인물
    if (member === null) // 지목 없음 판정
    { // 조건 시작
        return <p>{renderEmphasis(content)}</p>; // 일반 문장
    } // 조건 종료
    const mention = `@${member.displayName}`; // 지목 표시
    return <p><span className={styles.mention}>{mention}</span> {renderEmphasis(content.trim().slice(mention.length).trim())}</p>; // 지목 문장 반환
} // 함수 종료

interface MessageItemProps // 메시지 항목 속성
{ // 구조 시작
    message: Message; // 표시 메시지
    streaming: boolean; // 스트리밍 상태
    busy: boolean; // 전체 응답 상태
    allowRegenerate: boolean; // 다시 생성 허용
    versionGroup: MessageVersionGroup | null; // 버전 그룹
    onRegenerate?(): void; // 다시 생성 처리
    onEdit?(messageId: string, text: string): Promise<EditMessageResult>; // 메시지 수정 처리
    onDelete?(message: Message): void; // 메시지 삭제 처리
    onSelectVersion?(versionId: string, direction: "previous" | "next"): void; // 버전 선택 처리
    onDeleteVersion?(versionId: string): void; // 버전 삭제 처리
    storyCast?: StoryCastEntry[]; // 스토리 모드 등장인물(있으면 인물별로 나눠 표시)
    showSceneImage?: boolean; // 응답 아래 상황 이미지 보기
    found?: boolean; // 검색으로 찾은 메시지
    focused?: boolean; // 지금 보고 있는 메시지(찾은 말·책갈피로 이동)
    onToggleBookmark?(message: Message): void; // 답변 책갈피 전환
    onSceneCard?(message: Message): void; // 명장면 카드 만들기
} // 구조 종료

function editError(result: Exclude<EditMessageResult, { ok: true }>): string // 수정 오류 문구 생성
{ // 함수 시작
    const messages = { empty: t("수정할 내용을 입력해 주세요."), unchanged: t("기존 메시지와 같은 내용입니다."), "too-long": t("메시지는 {0}자까지 입력할 수 있습니다.", [CHAT_MESSAGE_MAX_LENGTH.toLocaleString(localeTag())]), busy: t("응답 중에는 수정할 수 없습니다."), cancelled: t("수정 응답을 중단했습니다."), "insufficient-token": t("수정에 사용할 토큰이 부족합니다."), "missing-message": t("수정할 메시지를 찾지 못했습니다."), "version-limit": t("같은 메시지의 대화 버전은 10개까지 만들 수 있습니다."), "storage-failed": t("저장하지 못해 원본 대화를 유지했습니다.") }; // 오류 문구 목록
    return messages[result.reason]; // 오류 문구 반환
} // 함수 종료

const alertReasons = new Set<Exclude<EditMessageResult, { ok: true }>["reason"]>(["unchanged", "insufficient-token", "missing-message", "version-limit", "storage-failed"]); // 바로 알려야 하는 수정 실패(글자가 아니라 사유로 판정해 언어와 상관없이 같게)

export function MessageItem({ message, streaming, busy, allowRegenerate, versionGroup, onRegenerate, onEdit, onDelete, onSelectVersion, onDeleteVersion, storyCast, showSceneImage = true, found = false, focused = false, onToggleBookmark, onSceneCard }: MessageItemProps) // 메시지 항목
{ // 함수 시작
    const [editing, setEditing] = useState(false); // 편집 상태
    const [draft, setDraft] = useState(message.content); // 수정 초안
    const [status, setStatus] = useState(""); // 동작 안내
    const [statusAlert, setStatusAlert] = useState(false); // 안내가 오류인지
    const copy = async () => // 메시지 복사
    { // 함수 시작
        try // 복사 시도
        { // 시도 시작
            await navigator.clipboard.writeText(message.content); // 클립보드 쓰기
            setStatusAlert(false); // 성공 표시
            setStatus(t("메시지를 복사했습니다.")); // 성공 안내
        } // 시도 종료
        catch // 복사 실패 처리
        { // 실패 시작
            setStatusAlert(true); // 오류 표시
            setStatus(t("메시지를 복사하지 못했습니다.")); // 실패 안내
        } // 실패 종료
    }; // 함수 종료
    const submit = async (event: FormEvent) => // 수정 제출
    { // 함수 시작
        event.preventDefault(); // 기본 제출 차단
        if (onEdit === undefined) // 수정 처리 부재 판정
        { // 조건 시작
            return; // 수정 중단
        } // 조건 종료
        try // 수정 시도
        { // 시도 시작
            const result = await onEdit(message.id, draft); // 수정 요청
            if (result.ok) // 수정 성공 판정
            { // 성공 시작
                setEditing(false); // 편집 종료
                setStatus(""); // 안내 초기화
                return; // 처리 종료
            } // 성공 종료
            setStatusAlert(alertReasons.has(result.reason)); // 사유에 따라 오류 표시
            setStatus(editError(result)); // 오류 안내
        } // 시도 종료
        catch // 수정 실패 처리
        { // 실패 시작
            setStatusAlert(true); // 오류 표시
            setStatus(t("수정 응답을 만들지 못했습니다.")); // 실패 안내
        } // 실패 종료
    }; // 함수 종료
    const move = (direction: "previous" | "next") => // 버전 이동
    { // 함수 시작
        if (versionGroup === null || onSelectVersion === undefined) // 이동 불가 판정
        { // 조건 시작
            return; // 이동 중단
        } // 조건 종료
        const offset = direction === "previous" ? -1 : 1; // 이동 방향 계산
        const nextIndex = versionGroup.currentIndex + offset; // 다음 위치 계산
        const versionId = versionGroup.versionIds[nextIndex]; // 다음 버전 조회
        if (versionId === undefined) // 다음 버전 부재 판정
        { // 조건 시작
            return; // 이동 중단
        } // 조건 종료
        onSelectVersion(versionId, direction); // 버전 선택 전달
    }; // 함수 종료
    const showSwitcher = versionGroup !== null && versionGroup.versionIds.length > 1; // 전환기 표시 판정
    const currentVersionId = versionGroup?.versionIds[versionGroup.currentIndex]; // 현재 버전 식별자
    const canDeleteVersion = showSwitcher && currentVersionId !== undefined && currentVersionId !== versionGroup?.rootVersionId; // 수정 버전 삭제 판정
    return ( // 항목 반환
        <li id={messageAnchor(message.id)} className={styles.item} data-role={message.role} data-streaming={streaming ? "true" : undefined} data-bookmarked={message.bookmarked === true ? "true" : undefined} data-found={found ? "true" : undefined} data-focus={focused ? "true" : undefined}> {/* 메시지 항목(바로 가기 표식 포함) */}
            <strong>{message.role === "user" ? t("나") : storyCast === undefined ? t("캐릭터") : t("스토리")}</strong> {/* 메시지 작성자 */}
            {editing ? <form className={styles.editForm} onSubmit={submit}><label><span className="sr-only">{t("메시지 수정")}</span><textarea aria-label={t("메시지 수정")} value={draft} maxLength={CHAT_MESSAGE_MAX_LENGTH} disabled={busy} onChange={(event) => setDraft(event.target.value)} /></label><div><button type="submit" disabled={busy}>{t("수정 전송")}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>{t("취소")}</button></div></form> : storyCast !== undefined && message.role === "assistant" ? <StoryAssistantBody content={message.content} streaming={streaming} cast={storyCast} /> : storyCast !== undefined && message.role === "user" ? <StoryUserBody content={message.content} cast={storyCast} /> : <p data-stream-tail="">{message.content.length === 0 && streaming ? t("응답 작성 중…") : renderEmphasis(message.content)}</p>} {/* 메시지 내용 */}
            {showSceneImage && message.role === "assistant" && typeof message.sceneImage === "string" && message.sceneImage.length > 0 ? <figure className={styles.sceneImage}><Image src={message.sceneImage} alt={t("이 장면의 상황 이미지")} width={640} height={400} unoptimized={message.sceneImage.startsWith("data:")} /></figure> : null} {/* 상황 이미지 */}
            {message.role !== "assistant" ? null : (message.status?.events ?? []).map((item) => ( // 이 턴에 일어난 이벤트
                <div key={`${item.eventId}-${item.target ?? ""}`} className={styles.eventCard} role="note" aria-label={t("이벤트: {0}", [item.name])} data-ending={item.ending ? "true" : undefined}> {/* 이벤트 카드 */}
                    <b><span aria-hidden="true">✨ </span>{item.name}{item.target === null ? "" : ` · ${item.target}`}</b> {/* 이벤트 이름과 인물 */}
                    {item.narration.length === 0 ? null : <em>{item.narration}</em>} {/* 내레이션 */}
                    {item.title.length === 0 && !item.ending ? null : <span className={styles.eventBadges}>{item.title.length === 0 ? null : <span>{t("🏅 칭호 ‘")}{t(item.title)}’</span>}{item.ending ? <span data-ending="true">{t("🎬 엔딩")}</span> : null}</span>} {/* 칭호·엔딩 */}
                </div> // 이벤트 카드 종료
            ))} {/* 이벤트 종료 */}
            <div className={styles.actions} role="group" aria-label={t("메시지 동작")}> {/* 메시지 동작(글자 대신 작은 그림 버튼, 이름은 aria-label과 풍선 도움말로 알림) */}
                <button type="button" aria-label={t("복사")} title={t("복사")} disabled={busy} onClick={() => void copy()}><MessageIcon name="copy" /></button> {/* 복사 버튼 */}
                {message.role === "user" && onEdit !== undefined ? <button type="button" aria-label={t("수정")} title={t("수정")} disabled={busy} onClick={() => { setDraft(message.content); setEditing(true); setStatus(""); }}><MessageIcon name="edit" /></button> : null} {/* 수정 버튼 */}
                {onDelete !== undefined ? <button type="button" aria-label={t("삭제")} title={t("삭제")} disabled={busy} onClick={() => onDelete(message)}><MessageIcon name="delete" /></button> : null} {/* 삭제 버튼 */}
                {allowRegenerate && onRegenerate !== undefined ? <button type="button" aria-label={t("다시 생성")} title={t("다시 생성")} disabled={busy} onClick={onRegenerate}><MessageIcon name="regenerate" /></button> : null} {/* 다시 생성 버튼 */}
                {message.role === "assistant" && !streaming && onToggleBookmark !== undefined ? <button type="button" aria-label={t("책갈피")} title={t("책갈피")} aria-pressed={message.bookmarked === true} disabled={busy} onClick={() => onToggleBookmark(message)}><MessageIcon name="bookmark" /></button> : null} {/* 책갈피 버튼 */}
                {message.role === "assistant" && !streaming && onSceneCard !== undefined && message.content.trim().length > 0 ? <button type="button" aria-label={t("명장면 카드")} title={t("명장면 카드")} disabled={busy} onClick={() => onSceneCard(message)}><MessageIcon name="scene-card" /></button> : null} {/* 명장면 카드 버튼 */}
            </div> {/* 동작 종료 */}
            {showSwitcher ? <div className={styles.switcher}><button type="button" aria-label={t("이전 대화 버전")} disabled={busy || versionGroup.currentIndex <= 0} onClick={() => move("previous")}>‹</button><span aria-label={t("대화 버전 {0}/{1}", [versionGroup.currentIndex + 1, versionGroup.versionIds.length])}>{versionGroup.currentIndex + 1} / {versionGroup.versionIds.length}</span><button type="button" aria-label={t("다음 대화 버전")} disabled={busy || versionGroup.currentIndex >= versionGroup.versionIds.length - 1} onClick={() => move("next")}>›</button>{canDeleteVersion && onDeleteVersion !== undefined ? <button type="button" className={styles.versionDelete} aria-label={t("현재 버전 삭제")} title={t("현재 버전 삭제")} disabled={busy} onClick={() => onDeleteVersion(currentVersionId)}><MessageIcon name="delete" /></button> : null}</div> : null} {/* 버전 전환기 */}
            {status.length > 0 ? <p className={styles.status} role={statusAlert ? "alert" : "status"}>{status}</p> : null} {/* 동작 안내 */}
        </li> // 항목 종료
    ); // 반환 종료
} // 함수 종료
