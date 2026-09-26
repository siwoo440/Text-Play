import Image from "next/image"; // 최적화 이미지
import type { Character } from "@/features/core/types"; // 캐릭터 타입
import styles from "@/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일

export function FeaturedCharacter({ character }: { character: Character }) // 추천 캐릭터
{ // 함수 시작
    return ( // 추천 반환
        <section className={styles.featured} aria-labelledby="featured-title"> {/* 추천 영역 */}
            <div> {/* 추천 설명 */}
                <span>오늘의 추천</span> {/* 추천 표시 */}
                <h2 id="featured-title">{character.name}</h2> {/* 추천 제목 */}
                <p>{character.description}</p> {/* 추천 설명 */}
                <a href={`/characters/${character.id}`}>세계관 살펴보기</a> {/* 상세 링크 */}
            </div> {/* 설명 종료 */}
            <Image src={character.coverImage} alt={character.name} width={420} height={520} priority /> {/* 추천 이미지 */}
        </section> // 영역 종료
    ); // 반환 종료
} // 함수 종료
