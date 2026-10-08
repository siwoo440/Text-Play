import { MessageItem } from "@chatbot/features/chat/MessageItem"; // 메시지 항목
import type { EditMessageResult } from "@chatbot/features/chat/chat-controller"; // 수정 결과 타입
import type { MessageVersionGroup } from "@chatbot/features/conversation/conversation-versioning"; // 버전 그룹 타입
import type { Message } from "@chatbot/features/core/types"; // 메시지 타입
import type { StoryCastEntry } from "@chatbot/features/story/story-model"; // 스토리 등장인물
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface MessageListProps // 메시지 목록 속성
{ // 구조 시작
    messages: Message[]; // 대화 메시지
    streamingMessageId?: string | null; // 스트리밍 메시지 식별자
    busy?: boolean; // 응답 상태
    allowRegenerate?: boolean; // 다시 생성 허용
    onRegenerate?: () => void; // 다시 생성 처리
    getVersionGroup?: (message: Message) => MessageVersionGroup | null; // 버전 그룹 조회
    onEdit?: (messageId: string, text: string) => Promise<EditMessageResult>; // 메시지 수정 처리
    onDelete?: (message: Message) => void; // 메시지 삭제 처리
    onSelectVersion?: (versionId: string, direction: "previous" | "next") => void; // 버전 선택 처리
    onDeleteVersion?: (versionId: string) => void; // 버전 삭제 처리
    storyCast?: StoryCastEntry[]; // 스토리 모드 등장인물
    showSceneImages?: boolean; // 응답 아래 상황 이미지 보기
    foundIds?: readonly string[]; // 검색으로 찾은 메시지
    focusId?: string | null; // 지금 보고 있는 메시지
    onToggleBookmark?: (message: Message) => void; // 답변 책갈피 전환
    onSceneCard?: (message: Message) => void; // 명장면 카드 만들기
} // 구조 종료

export function MessageList({ messages, streamingMessageId = null, busy = false, allowRegenerate = false, onRegenerate, getVersionGroup, onEdit, onDelete, onSelectVersion, onDeleteVersion, storyCast, showSceneImages = true, foundIds = [], focusId = null, onToggleBookmark, onSceneCard }: MessageListProps) // 메시지 목록
{ // 함수 시작
    const lastUserIndex = messages.findLastIndex((message) => message.role === "user"); // 마지막 사용자 위치
    const lastAssistantIndex = messages.findLastIndex((message) => message.role === "assistant"); // 마지막 응답 위치
    const lastAssistantId = lastAssistantIndex > lastUserIndex && lastUserIndex >= 0 ? messages[lastAssistantIndex]?.id ?? null : null; // 유효 응답 식별자
    return ( // 목록 반환
        <ol aria-label={t("대화 메시지")} aria-live="polite" aria-busy={streamingMessageId !== null}> {/* 메시지 영역 */}
            {messages.map((message) => <MessageItem key={message.id} message={message} streaming={message.id === streamingMessageId} busy={busy} allowRegenerate={allowRegenerate && message.id === lastAssistantId} versionGroup={message.role === "user" ? getVersionGroup?.(message) ?? null : null} onRegenerate={onRegenerate} onEdit={onEdit} onDelete={onDelete} onSelectVersion={onSelectVersion} onDeleteVersion={onDeleteVersion} storyCast={storyCast} showSceneImage={showSceneImages} found={foundIds.includes(message.id)} focused={focusId === message.id} onToggleBookmark={onToggleBookmark} onSceneCard={onSceneCard} />)} {/* 메시지 순회 */}
        </ol> // 영역 종료
    ); // 반환 종료
} // 함수 종료
