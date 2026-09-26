import Image from "next/image"; // 이미지 도구
import type { CharacterDraft } from "@/features/core/types"; // 초안 타입
import styles from "@/features/character/CharacterEditor.module.css"; // 편집기 스타일

export function CharacterPreview({ draft }: { draft: CharacterDraft }) // 캐릭터 미리보기
{ // 함수 시작
    const name = draft.name.trim() || "이름 없는 캐릭터"; // 표시 이름
    const summary = draft.summary.trim() || "한 줄 소개가 여기에 표시됩니다."; // 표시 소개
    const greeting = draft.greeting.trim() || "첫 인사를 입력하면 대화 미리보기가 완성됩니다."; // 표시 인사
    return ( // 미리보기 반환
        <aside className={styles.preview} data-testid="character-preview" aria-label="캐릭터 미리보기"> {/* 미리보기 영역 */}
            <span className={styles.previewLabel}>LIVE PREVIEW</span> {/* 미리보기 표시 */}
            <Image src={draft.coverImage} alt={`${name} 대표 이미지`} width={420} height={560} priority /> {/* 대표 이미지 */}
            <div className={styles.previewBody}> {/* 미리보기 본문 */}
                <h2>{name}</h2> {/* 캐릭터 이름 */}
                <p>{summary}</p> {/* 한 줄 소개 */}
                <div className={styles.tags}> {/* 태그 목록 */}
                    {draft.tags.map((tag) => <span key={tag}>#{tag}</span>)} {/* 태그 항목 */}
                </div> {/* 태그 종료 */}
                <blockquote>{greeting}</blockquote> {/* 첫 인사 */}
            </div> {/* 본문 종료 */}
        </aside> // 미리보기 종료
    ); // 반환 종료
} // 함수 종료
