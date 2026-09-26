import type { TextPlayLogEntry } from "@/features/text-play/core/types"; // 기록 계약

export function StoryLog({ entries, streamedText }: { entries: TextPlayLogEntry[]; streamedText: string }) // 이야기 기록
{ // 함수 시작
    return ( // 기록 반환
        <section aria-label="이야기 기록"> {/* 기록 영역 */}
            {entries.map((entry) => <article key={entry.id} data-kind={entry.kind}>{entry.speaker === null ? null : <strong>{entry.speaker}</strong>}<p>{entry.content}</p></article>)} {/* 기록 목록 */}
            {streamedText.length === 0 ? null : <article data-kind="narration" aria-label="생성 중인 이야기"><p>{streamedText}</p></article>} {/* 생성 중 기록 */}
        </section> // 기록 종료
    ); // 반환 종료
} // 함수 종료
