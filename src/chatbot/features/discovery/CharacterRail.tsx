import type { ReactNode } from "react"; // 리액트 노드 타입
import type { Character } from "@chatbot/features/core/types"; // 캐릭터 타입
import { CharacterCard } from "@chatbot/features/discovery/CharacterCard"; // 캐릭터 카드
import styles from "@chatbot/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일

interface CharacterRailProps // 캐릭터 레일 속성
{ // 구조 시작
    title: string; // 영역 제목
    characters: Character[]; // 표시 캐릭터
    description?: string; // 제목 아래 안내
    empty?: ReactNode; // 목록이 비었을 때 내용
} // 구조 종료

export function CharacterRail({ title, characters, description, empty }: CharacterRailProps) // 캐릭터 레일
{ // 함수 시작
    return ( // 레일 반환
        <section className={styles.rail} aria-label={title}> {/* 레일 영역 */}
            <h2>{title}</h2> {/* 레일 제목 */}
            {description === undefined ? null : <p className={styles.railLead}>{description}</p>} {/* 제목 아래 안내 */}
            {characters.length === 0 && empty !== undefined ? empty : <div>{characters.map((character) => <CharacterCard key={character.id} character={character} />)}</div>} {/* 카드 목록 */}
        </section> // 영역 종료
    ); // 반환 종료
} // 함수 종료
