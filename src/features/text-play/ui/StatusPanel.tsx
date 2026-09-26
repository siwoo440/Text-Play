import type { TextPlayState } from "@/features/text-play/core/types"; // 게임 상태 계약
import { InventoryPanel } from "@/features/text-play/ui/InventoryPanel"; // 인벤토리 패널

export function StatusPanel({ state, open }: { state: TextPlayState; open: boolean }) // 상태 패널
{ // 함수 시작
    return ( // 패널 반환
        <aside id="text-play-state-panel" aria-label="게임 상태" aria-hidden={!open}> {/* 상태 영역 */}
            <h2>플레이 상태</h2> {/* 상태 제목 */}
            <dl> {/* 능력치 목록 */}
                <div><dt>체력</dt><dd>{state.stats.hp}</dd></div> {/* 체력 */}
                <div><dt>정신력</dt><dd>{state.stats.sanity}</dd></div> {/* 정신력 */}
                <div><dt>골드</dt><dd>{state.stats.gold}</dd></div> {/* 골드 */}
                <div><dt>리라 관계</dt><dd>{state.relations.lyra ?? 0}</dd></div> {/* 관계도 */}
            </dl> {/* 능력치 종료 */}
            <InventoryPanel inventory={state.inventory} /> {/* 인벤토리 */}
            <section aria-labelledby="quest-title"> {/* 퀘스트 영역 */}
                <h3 id="quest-title">퀘스트</h3> {/* 퀘스트 제목 */}
                <p>진행: {state.activeQuestIds.join(", ") || "없음"}</p> {/* 진행 퀘스트 */}
                <p>완료: {state.completedQuestIds.join(", ") || "없음"}</p> {/* 완료 퀘스트 */}
            </section> {/* 퀘스트 종료 */}
        </aside> // 패널 종료
    ); // 반환 종료
} // 함수 종료
