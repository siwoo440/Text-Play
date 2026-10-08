import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import type { Character } from "@chatbot/features/core/types"; // 캐릭터 타입
import styles from "@chatbot/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일
import { createExploreHref } from "@chatbot/features/explore/explore-model"; // 탐색 주소 생성
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function FeaturedCharacter({ character }: { character: Character }) // 추천 캐릭터
{ // 함수 시작
    return ( // 추천 반환
        <section className={styles.featured} data-genre={getGenreKey(character.tags)} aria-labelledby="featured-title"> {/* 추천 영역 */}
            <div> {/* 추천 설명 */}
                <span className={styles.featuredLabel}>{t("오늘의 추천")}</span> {/* 추천 표시 */}
                <h2 id="featured-title">{character.name}</h2> {/* 추천 제목 */}
                <p>{t(character.description)}</p> {/* 추천 설명 */}
                <ul className={styles.tagList} aria-label={t("캐릭터 태그")}>{character.tags.map((tag) => <li key={tag}><Link href={createExploreHref(tag) as Route}>#{tag}</Link></li>)}</ul> {/* 태그 탐색 링크 */}
                <Link className={styles.detailLink} href={`/characters/${character.id}` as Route}>{t("세계관 살펴보기")}</Link> {/* 상세 링크 */}
            </div> {/* 설명 종료 */}
            <Image src={character.coverImage} alt={character.name} width={420} height={520} priority /> {/* 추천 이미지 */}
        </section> // 영역 종료
    ); // 반환 종료
} // 함수 종료
