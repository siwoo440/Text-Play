import type { Character } from "@/features/core/types"; // 캐릭터 타입
import { CharacterCard } from "@/features/discovery/CharacterCard"; // 캐릭터 카드
import styles from "@/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일

export function RankingRail({ characters }: { characters: Character[] }) // 랭킹 레일
{ // 함수 시작
    return ( // 레일 반환
        <section id="ranking" className={styles.ranking} aria-label="실시간 랭킹"> {/* 랭킹 영역 */}
            <div className={styles.sectionHeading}> {/* 제목 묶음 */}
                <div> {/* 제목 문구 */}
                    <span>지금 가장 많이 대화하는 메이트</span> {/* 제목 설명 */}
                    <h2>실시간 랭킹</h2> {/* 랭킹 제목 */}
                </div> {/* 문구 종료 */}
                <strong>TOP 10</strong> {/* 순위 범위 */}
            </div> {/* 제목 종료 */}
            <div className={styles.rankingGrid}> {/* 랭킹 목록 */}
                {characters.map((character, index) => // 랭킹 반복
                <div key={character.id} className={styles.rankingItem}> {/* 랭킹 항목 */}
                    <span className={styles.rankBadge}>{index + 1}위</span> {/* 순위 표시 */}
                    <CharacterCard character={character} /> {/* 캐릭터 카드 */}
                </div>)} {/* 반복 종료 */}
            </div> {/* 목록 종료 */}
        </section> // 영역 종료
    ); // 반환 종료
} // 함수 종료
