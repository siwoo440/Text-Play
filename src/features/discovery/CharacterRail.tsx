import type { Character } from "@/features/core/types"; // 캐릭터 타입
import { CharacterCard } from "@/features/discovery/CharacterCard"; // 캐릭터 카드
import styles from "@/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일

export function CharacterRail({ title, characters }: { title: string; characters: Character[] }) // 캐릭터 레일
{ // 함수 시작
    return ( // 레일 반환
        <section className={styles.rail} aria-label={title}> {/* 레일 영역 */}
            <h2>{title}</h2> {/* 레일 제목 */}
            <div>{characters.map((character) => <CharacterCard key={character.id} character={character} />)}</div> {/* 카드 목록 */}
        </section> // 영역 종료
    ); // 반환 종료
} // 함수 종료
