import type { TextPlayLogEntry } from "@/features/text-play/core/types"; // 기록 계약
import { extractStreamingNarration } from "@/features/text-play/ui/text-play-streaming-preview"; // 스트리밍 서술 추출기

export const TEXT_PLAY_STREAMING_PLACEHOLDER = "응답 생성 중…"; // 생성 대기 안내

export function StoryLog({ entries, streamedText, isStreaming = false }: { entries: TextPlayLogEntry[]; streamedText: string; isStreaming?: boolean }) // 이야기 기록
{ // 함수 시작
    const preview = extractStreamingNarration(streamedText); // 생성 중 서술 추출
    const pendingText = preview.length > 0 ? preview : isStreaming ? TEXT_PLAY_STREAMING_PLACEHOLDER : ""; // 표시할 생성 문구
    return ( // 기록 반환
        <section aria-label="이야기 기록"> {/* 기록 영역 */}
            {entries.map((entry) => <article key={entry.id} data-kind={entry.kind}>{entry.speaker === null ? null : <strong>{entry.speaker}</strong>}<p>{entry.content}</p></article>)} {/* 기록 목록 */}
            {pendingText.length === 0 ? null : <article data-kind="narration" data-pending={preview.length === 0} aria-label="생성 중인 이야기" aria-busy={isStreaming}><p>{pendingText}</p></article>} {/* 생성 중 기록 */}
        </section> // 기록 종료
    ); // 반환 종료
} // 함수 종료
