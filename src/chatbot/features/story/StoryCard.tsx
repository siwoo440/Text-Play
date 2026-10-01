import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import type { ContentRating, Story } from "@chatbot/features/core/types"; // 도메인 타입
import type { StoryCastEntry } from "@chatbot/features/story/story-model"; // 등장인물 연결
import styles from "@chatbot/features/story/Story.module.css"; // 스토리 스타일

export const storyRatingLabels: Record<ContentRating, string> = { all: "전체", teen: "15+", mature: "19+" }; // 등급 짧은 표시

export function StoryCast({ cast }: { cast: StoryCastEntry[] }) // 등장인물 얼굴과 이름
{ // 함수 시작
    return ( // 등장인물 반환
        <span className={styles.castRow}> {/* 등장인물 줄 */}
            <span className={styles.castFaces} aria-hidden="true">{cast.map((entry) => <span key={entry.member.characterId}>{entry.character === undefined ? entry.member.displayName.slice(0, 1) : <Image src={entry.character.coverImage} alt="" width={64} height={64} />}</span>)}</span> {/* 얼굴 묶음 */}
            <span className={styles.castNames}>{cast.map((entry) => entry.member.displayName).join(" · ")}</span> {/* 이름 */}
        </span> // 등장인물 줄 종료
    ); // 반환 종료
} // 함수 종료

export function StoryCard({ story, cast }: { story: Story; cast: StoryCastEntry[] }) // 스토리 카드
{ // 함수 시작
    return ( // 카드 반환
        <article className={styles.card} data-rating={story.contentRating}> {/* 스토리 카드 */}
            <Link href={`/stories/${encodeURIComponent(story.id)}` as Route} className={styles.cardLink}> {/* 상세 링크 */}
                <span className={styles.cardMedia}> {/* 대표 이미지 */}
                    <Image src={story.coverImage} alt="" width={640} height={400} /> {/* 이미지 */}
                    <span className={styles.ratingChip}>{storyRatingLabels[story.contentRating]}</span> {/* 등급 */}
                    {story.publicationStatus === "draft" ? <span className={styles.draftChip}>임시 저장</span> : null} {/* 임시 저장 표시 */}
                </span> {/* 이미지 종료 */}
                <span className={styles.cardBody}> {/* 카드 본문 */}
                    <h3>{story.title}</h3> {/* 제목 */}
                    <span className={styles.cardSummary}>{story.summary}</span> {/* 한 줄 소개 */}
                    <StoryCast cast={cast} /> {/* 등장인물 */}
                    <span className={styles.cardMeta}><span className={styles.castCount}>등장인물 {story.cast.length}명</span>{story.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</span> {/* 인물 수·태그 */}
                </span> {/* 본문 종료 */}
            </Link> {/* 링크 종료 */}
        </article> // 카드 종료
    ); // 반환 종료
} // 함수 종료
