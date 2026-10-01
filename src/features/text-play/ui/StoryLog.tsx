import type { TextPlayLogEntry } from "@/features/text-play/core/types"; // 기록 계약
import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 언어
import { extractStreamingNarration } from "@/features/text-play/ui/text-play-streaming-preview"; // 스트리밍 서술 추출기
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자

export const TEXT_PLAY_STREAMING_PLACEHOLDER = TEXT_PLAY_UI_TEXT.ko.story.generating; // 생성 대기 안내(한국어)

export function StoryLog({ entries, streamedText, isStreaming = false }: { entries: TextPlayLogEntry[]; streamedText: string; isStreaming?: boolean }) // 이야기 기록
{ // 함수 시작
    const text = TEXT_PLAY_UI_TEXT[useAppLanguage()].story; // 언어별 기록 글자
    const preview = extractStreamingNarration(streamedText); // 생성 중 서술 추출
    const pendingText = preview.length > 0 ? preview : isStreaming ? text.generating : ""; // 표시할 생성 문구
    return ( // 기록 반환
        <section aria-label={text.log}> {/* 기록 영역 */}
            {entries.map((entry) => <article key={entry.id} data-kind={entry.kind}>{entry.speaker === null ? null : <strong>{entry.speaker}</strong>}<p>{entry.content}</p></article>)} {/* 기록 목록 */}
            {pendingText.length === 0 ? null : <article data-kind="narration" data-pending={preview.length === 0} aria-label={text.pending} aria-busy={isStreaming}><p>{pendingText}</p></article>} {/* 생성 중 기록 */}
        </section> // 기록 종료
    ); // 반환 종료
} // 함수 종료
