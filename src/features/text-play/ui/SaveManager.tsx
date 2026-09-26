import type { TextPlaySlotId } from "@/features/text-play/core/types"; // 슬롯 계약
import { useTextPlaySession } from "@/features/text-play/session/TextPlayProvider"; // 세션 훅

const manualSlots: TextPlaySlotId[] = ["manual-1", "manual-2", "manual-3"]; // 수동 슬롯 목록

function formatPlayTime(totalSeconds: number): string // 플레이 시간 표시
{ // 함수 시작
    const minutes = Math.floor(totalSeconds / 60); // 전체 분 계산
    const seconds = totalSeconds % 60; // 남은 초 계산
    return `${minutes}분 ${seconds}초`; // 시간 문구 반환
} // 함수 종료

function formatSavedAt(savedAt: string): string // 저장 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(savedAt)); // 지역 시각 반환
} // 함수 종료

export function SaveManager() // 저장 관리자
{ // 함수 시작
    const { slots, save, load, remove } = useTextPlaySession(); // 저장 동작 조회
    return ( // 관리자 반환
        <section aria-labelledby="save-manager-title"> {/* 저장 관리 영역 */}
            <h3 id="save-manager-title">저장 슬롯</h3> {/* 저장 제목 */}
            {manualSlots.map((slotId, index) => // 수동 슬롯 순회
            { // 순회 시작
                const slot = slots.find((candidate) => candidate.slotId === slotId) ?? null; // 저장 슬롯 조회
                return ( // 슬롯 반환
                    <div key={slotId} role="group" aria-label={`수동 저장 슬롯 ${index + 1}`}> {/* 슬롯 영역 */}
                        <strong>슬롯 {index + 1}</strong> {/* 슬롯 제목 */}
                        {slot === null ? <span>빈 슬롯</span> : <><span>{slot.summary}</span><span>플레이 {formatPlayTime(slot.state.playTimeSeconds)}</span><span>저장 {formatSavedAt(slot.savedAt)}</span></>} {/* 슬롯 정보 */}
                        <div> {/* 슬롯 동작 */}
                            {slot === null ? <button type="button" onClick={() => void save(slotId)}>저장</button> : <><button type="button" onClick={() => { if (window.confirm("현재 진행을 버리고 저장한 게임을 불러올까요?")) { void load(slotId); } }}>불러오기</button><button type="button" onClick={() => { if (window.confirm("현재 슬롯을 덮어쓸까요?")) { void save(slotId); } }}>덮어쓰기</button><button type="button" onClick={() => { if (window.confirm("저장 데이터를 삭제할까요?")) { void remove(slotId); } }}>삭제</button></>} {/* 슬롯 버튼 */}
                        </div> {/* 슬롯 동작 종료 */}
                    </div> // 슬롯 영역 종료
                ); // 반환 종료
            })} {/* 슬롯 목록 종료 */}
        </section> // 관리자 종료
    ); // 반환 종료
} // 함수 종료
