import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 언어
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자

export function InventoryPanel({ inventory, itemNames = {} }: { inventory: Record<string, number>; itemNames?: Record<string, string> }) // 인벤토리 패널
{ // 함수 시작
    const text = TEXT_PLAY_UI_TEXT[useAppLanguage()].status; // 언어별 상태 글자
    const items = Object.entries(inventory).filter(([, quantity]) => quantity > 0); // 보유 아이템 조회
    return ( // 패널 반환
        <section aria-labelledby="inventory-title"> {/* 인벤토리 영역 */}
            <h3 id="inventory-title">{text.inventory}</h3> {/* 인벤토리 제목 */}
            {items.length === 0 ? <p>{text.noItems}</p> : <ul>{items.map(([itemId, quantity]) => <li key={itemId}>{itemNames[itemId] ?? itemId} × {quantity}</li>)}</ul>} {/* 아이템 목록(표시 이름) */}
        </section> // 패널 종료
    ); // 반환 종료
} // 함수 종료
