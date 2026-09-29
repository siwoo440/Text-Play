import type { TextPlayChoice } from "@/features/text-play/core/types"; // 선택지 계약

export function ChoiceList({ choices, disabled, onSelect }: { choices: TextPlayChoice[]; disabled: boolean; onSelect(choiceId: string): void }) // 선택지 목록
{ // 함수 시작
    return ( // 목록 반환
        <section aria-label="추천 답안"> {/* 선택지 영역 */}
            <h2>AI 추천 답안</h2> {/* 선택지 제목 */}
            {choices.length === 0 ? <p>이야기가 끝났습니다.</p> : <div>{choices.map((choice) => <button key={choice.id} type="button" disabled={disabled} onClick={() => onSelect(choice.id)}>{choice.label}</button>)}</div>} {/* 선택지 버튼 */}
        </section> // 선택지 종료
    ); // 반환 종료
} // 함수 종료
