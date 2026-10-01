import type { TextPlayState } from "@/features/text-play/core/types"; // 게임 상태 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { localizeTextPlayPackage } from "@/features/text-play/data/localize-package"; // 작품 언어판
import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 언어
import { InventoryPanel } from "@/features/text-play/ui/InventoryPanel"; // 인벤토리 패널
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자

export function StatusPanel({ state, open }: { state: TextPlayState; open: boolean }) // 상태 패널
{ // 함수 시작
    const language = useAppLanguage(); // 고른 언어
    const text = TEXT_PLAY_UI_TEXT[language].status; // 언어별 상태 글자
    const work = localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, language); // 고른 언어의 작품
    const questNames = (ids: string[]) => ids.map((id) => work.glossary?.quests[id] ?? id).join(", ") || text.none; // 퀘스트 표시 이름
    return ( // 패널 반환
        <aside id="text-play-state-panel" aria-label={text.region} aria-hidden={!open}> {/* 상태 영역 */}
            <h2>{text.title}</h2> {/* 상태 제목 */}
            <dl> {/* 능력치 목록 */}
                <div><dt>{text.hp}</dt><dd>{state.stats.hp}</dd></div> {/* 체력 */}
                <div><dt>{text.sanity}</dt><dd>{state.stats.sanity}</dd></div> {/* 정신력 */}
                <div><dt>{text.gold}</dt><dd>{state.stats.gold}</dd></div> {/* 골드 */}
                {work.characterIds.map((id) => <div key={id}><dt>{text.relation(work.glossary?.characters[id]?.name ?? id)}</dt><dd>{state.relations[id] ?? 0}</dd></div>)} {/* 인물별 관계도 */}
            </dl> {/* 능력치 종료 */}
            <InventoryPanel inventory={state.inventory} itemNames={work.glossary?.items} /> {/* 인벤토리 */}
            <section aria-labelledby="quest-title"> {/* 퀘스트 영역 */}
                <h3 id="quest-title">{text.quests}</h3> {/* 퀘스트 제목 */}
                <p>{text.active}: {questNames(state.activeQuestIds)}</p> {/* 진행 퀘스트 */}
                <p>{text.completed}: {questNames(state.completedQuestIds)}</p> {/* 완료 퀘스트 */}
            </section> {/* 퀘스트 종료 */}
        </aside> // 패널 종료
    ); // 반환 종료
} // 함수 종료
