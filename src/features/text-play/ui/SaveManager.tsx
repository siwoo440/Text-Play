import type { TextPlaySaveSlot, TextPlaySlotId } from "@/features/text-play/core/types"; // 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { useTextPlaySession } from "@/features/text-play/session/TextPlayProvider"; // 세션 훅
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자
import styles from "@/features/text-play/ui/SaveManager.module.css"; // 저장 스타일

export type SaveManagerMode = "save" | "load"; // 저장 관리자 모드

interface SaveManagerProps // 저장 관리자 속성
{ // 구조 시작
    mode: SaveManagerMode; // 관리자 모드
    open: boolean; // 열림 상태
    onClose(): void; // 닫기 처리
} // 구조 종료

const manualSlots: TextPlaySlotId[] = ["manual-1", "manual-2", "manual-3", "manual-4", "manual-5", "manual-6"]; // 수동 슬롯 목록

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

function getSceneTitle(slot: TextPlaySaveSlot): string // 장면 제목 조회
{ // 함수 시작
    return DEMO_TEXT_PLAY_PACKAGE.scenes.find((scene) => scene.id === slot.state.sceneId)?.title ?? slot.summary; // 장면 제목 반환
} // 함수 종료

function getRecentSummary(slot: TextPlaySaveSlot): string // 최근 내용 조회
{ // 함수 시작
    return slot.state.log.at(-1)?.content ?? slot.summary; // 최근 기록 반환
} // 함수 종료

export function SaveManager({ mode, open, onClose }: SaveManagerProps) // 저장 관리자
{ // 함수 시작
    const { slots, corruptSlotIds, save, load, remove } = useTextPlaySession(); // 저장 동작 조회
    const title = mode === "save" ? "게임 저장" : "게임 불러오기"; // 대화상자 제목
    const initialIndex = mode === "save" ? 0 : manualSlots.findIndex((slotId) => slots.some((slot) => slot.slotId === slotId)); // 초기 초점 슬롯
    const runSave = async (slotId: TextPlaySlotId, slot: TextPlaySaveSlot | null) => // 저장 실행
    { // 함수 시작
        if (slot !== null && !window.confirm("현재 슬롯을 덮어쓸까요?")) // 덮어쓰기 확인
        { // 조건 시작
            return; // 저장 취소
        } // 조건 종료
        await save(slotId); // 슬롯 저장
    }; // 함수 종료
    const runLoad = async (slotId: TextPlaySlotId) => // 불러오기 실행
    { // 함수 시작
        if (!window.confirm("현재 진행을 버리고 저장한 게임을 불러올까요?")) // 복원 확인
        { // 조건 시작
            return; // 복원 취소
        } // 조건 종료
        await load(slotId); // 슬롯 복원
        onClose(); // 대화상자 닫기
    }; // 함수 종료
    const runRemove = async (slotId: TextPlaySlotId) => // 삭제 실행
    { // 함수 시작
        if (!window.confirm("저장 데이터를 삭제할까요?")) // 삭제 확인
        { // 조건 시작
            return; // 삭제 취소
        } // 조건 종료
        await remove(slotId); // 슬롯 삭제
    }; // 함수 종료
    return ( // 관리자 반환
        <TextPlayDialog labelledBy="text-play-save-dialog-title" describedBy="text-play-save-dialog-description" open={open} onClose={onClose}> {/* 저장 대화상자 */}
            <header className={styles.header}> {/* 저장 머리말 */}
                <span>{mode === "save" ? "SAVE GAME" : "LOAD GAME"}</span> {/* 영문 표제 */}
                <h2 id="text-play-save-dialog-title">{title}</h2> {/* 저장 제목 */}
                <p id="text-play-save-dialog-description">{mode === "save" ? "현재 진행을 저장할 슬롯을 선택하세요." : "이어서 진행할 대화를 선택하세요."}</p> {/* 모드 설명 */}
            </header> {/* 머리말 종료 */}
            <div className={styles.grid}> {/* 슬롯 격자 */}
                {manualSlots.map((slotId, index) => // 수동 슬롯 순회
                { // 순회 시작
                    const slot = slots.find((candidate) => candidate.slotId === slotId) ?? null; // 저장 슬롯 조회
                    const corrupt = corruptSlotIds.includes(slotId); // 손상 슬롯 확인
                    return ( // 슬롯 반환
                        <article key={slotId} className={styles.slot} role="group" aria-label={`수동 저장 슬롯 ${index + 1}`} data-state={corrupt ? "error" : slot === null ? "empty" : "saved"}> {/* 슬롯 카드 */}
                            <div className={styles.slotHeading}> {/* 슬롯 머리말 */}
                                <strong>슬롯 {index + 1}</strong> {/* 슬롯 제목 */}
                                <span>{corrupt ? "ERROR" : slot === null ? "EMPTY" : "SAVED"}</span> {/* 슬롯 상태 */}
                            </div> {/* 머리말 종료 */}
                            {corrupt // 손상 슬롯 확인
                                ? <p className={styles.error}>저장 데이터가 손상되었습니다.</p> // 손상 슬롯 안내
                                : slot === null // 빈 슬롯 확인
                                ? <p className={styles.empty}>저장된 대화가 없습니다.</p> // 빈 슬롯 안내
                                : <div className={styles.meta}><strong>{getSceneTitle(slot)}</strong><p>{getRecentSummary(slot)}</p><span>{slot.summary}</span><span>플레이 {formatPlayTime(slot.state.playTimeSeconds)}</span><span>저장 {formatSavedAt(slot.savedAt)}</span></div>} {/* 슬롯 정보 */}
                            <div className={styles.actions}> {/* 슬롯 동작 */}
                                {mode === "save" // 저장 모드 확인
                                    ? <button type="button" data-dialog-initial={index === initialIndex ? "true" : undefined} onClick={() => void runSave(slotId, slot)}>{corrupt ? "복구 저장" : slot === null ? "저장" : "덮어쓰기"}</button> // 저장 버튼
                                    : <button type="button" data-dialog-initial={index === initialIndex ? "true" : undefined} disabled={slot === null} onClick={() => void runLoad(slotId)}>{corrupt ? "손상 슬롯" : slot === null ? "빈 슬롯" : "불러오기"}</button>} {/* 모드 버튼 */}
                                {slot === null && !corrupt ? null : <button type="button" className={styles.delete} onClick={() => void runRemove(slotId)}>삭제</button>} {/* 삭제 버튼 */}
                            </div> {/* 동작 종료 */}
                        </article> // 슬롯 카드 종료
                    ); // 슬롯 반환 종료
                })} {/* 슬롯 목록 종료 */}
            </div> {/* 슬롯 격자 종료 */}
        </TextPlayDialog> // 저장 대화상자 종료
    ); // 반환 종료
} // 함수 종료
