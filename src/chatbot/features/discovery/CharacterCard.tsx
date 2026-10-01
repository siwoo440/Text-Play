import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import type { Character } from "@chatbot/features/core/types"; // 캐릭터 타입
import styles from "@chatbot/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일
import { getGenreKey, getGenreLabel } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회

export function CharacterCard({ character }: { character: Character }) // 캐릭터 카드
{ // 함수 시작
    return ( // 카드 반환
        <Link className={styles.card} href={`/characters/${character.id}` as Route} data-genre={getGenreKey(character.tags)} aria-label={`${character.name} - ${character.summary}`}> {/* 상세 링크 */}
            <span className={styles.cardMedia}> {/* 이미지 영역 */}
                <Image src={character.coverImage} alt={character.name} width={360} height={480} /> {/* 대표 이미지 */}
                <em className={styles.genreChip}>{getGenreLabel(character.tags)}</em> {/* 장르 표시 */}
                {character.contentRating === "mature" ? <em className={styles.adultChip}>19+</em> : null} {/* 19세 표시 */}
            </span> {/* 이미지 영역 종료 */}
            <div> {/* 카드 설명 */}
                <h3>{character.name}</h3> {/* 캐릭터 이름 */}
                <p>{character.summary}</p> {/* 한 줄 소개 */}
                <span>{character.popularity.toLocaleString()} 대화</span> {/* 인기도 */}
            </div> {/* 설명 종료 */}
        </Link> // 링크 종료
    ); // 반환 종료
} // 함수 종료
