import Image from "next/image"; // 최적화 이미지
import type { Character } from "@/features/core/types"; // 캐릭터 타입
import styles from "@/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일

export function CharacterCard({ character }: { character: Character }) // 캐릭터 카드
{ // 함수 시작
    return ( // 카드 반환
        <a className={styles.card} href={`/characters/${character.id}`} aria-label={`${character.name} - ${character.summary}`}> {/* 상세 링크 */}
            <Image src={character.coverImage} alt={character.name} width={360} height={480} /> {/* 대표 이미지 */}
            <div> {/* 카드 설명 */}
                <h3>{character.name}</h3> {/* 캐릭터 이름 */}
                <p>{character.summary}</p> {/* 한 줄 소개 */}
                <span>{character.popularity.toLocaleString()} 대화</span> {/* 인기도 */}
            </div> {/* 설명 종료 */}
        </a> // 링크 종료
    ); // 반환 종료
} // 함수 종료
