export function InventoryPanel({ inventory }: { inventory: Record<string, number> }) // 인벤토리 패널
{ // 함수 시작
    const items = Object.entries(inventory).filter(([, quantity]) => quantity > 0); // 보유 아이템 조회
    return ( // 패널 반환
        <section aria-labelledby="inventory-title"> {/* 인벤토리 영역 */}
            <h3 id="inventory-title">인벤토리</h3> {/* 인벤토리 제목 */}
            {items.length === 0 ? <p>보유 아이템 없음</p> : <ul>{items.map(([itemId, quantity]) => <li key={itemId}>{itemId} × {quantity}</li>)}</ul>} {/* 아이템 목록 */}
        </section> // 패널 종료
    ); // 반환 종료
} // 함수 종료
