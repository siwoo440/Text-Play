import type { TextPlaySaveSlot, TextPlaySlotId } from "@/features/text-play/core/types"; // 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { createSpeakerNamer, createTextTranslator, localizeTextPlayPackage } from "@/features/text-play/data/localize-package"; // 작품 언어판
import { dateLocale } from "@/features/text-play/i18n/localized-text"; // 날짜 표시 지역
import { useAppLanguage } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 고른 언어
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어
import { useTextPlaySession } from "@/features/text-play/session/TextPlayProvider"; // 세션 훅
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자
import styles from "@/features/text-play/ui/SaveManager.module.css"; // 저장 스타일
import { formatTextPlayPlayTime } from "@/features/text-play/ui/text-play-save-summary"; // 플레이 시간 표시
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자

export type SaveManagerMode = "save" | "load"; // 저장 관리자 모드

interface SaveManagerProps // 저장 관리자 속성
{ // 구조 시작
    mode: SaveManagerMode; // 관리자 모드
    open: boolean; // 열림 상태
    onClose(): void; // 닫기 처리
} // 구조 종료

const manualSlots: TextPlaySlotId[] = ["manual-1", "manual-2", "manual-3", "manual-4", "manual-5", "manual-6"]; // 수동 슬롯 목록

function formatSavedAt(savedAt: string, language: AppLanguage): string // 저장 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(dateLocale(language), { dateStyle: "short", timeStyle: "short" }).format(new Date(savedAt)); // 지역 시각 반환
} // 함수 종료

function getSceneTitle(slot: TextPlaySaveSlot, language: AppLanguage): string // 장면 제목 조회
{ // 함수 시작
    return localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, language).scenes.find((scene) => scene.id === slot.state.sceneId)?.title ?? slot.summary; // 장면 제목 반환
} // 함수 종료

function getRecentSummary(slot: TextPlaySaveSlot, language: AppLanguage): string // 최근 내용 조회
{ // 함수 시작
    const entry = slot.state.log.at(-1); // 최근 기록
    if (entry === undefined) // 기록 없음 확인
    { // 조건 시작
        return slot.summary; // 저장 요약 반환
    } // 조건 종료
    return entry.kind === "dialogue" ? `${createSpeakerNamer(DEMO_TEXT_PLAY_PACKAGE, language)(entry.speaker ?? "")}: ${entry.content}` : createTextTranslator(DEMO_TEXT_PLAY_PACKAGE, language)(entry.content); // 고른 언어로 최근 기록 반환
} // 함수 종료

export function SaveManager({ mode, open, onClose }: SaveManagerProps) // 저장 관리자
{ // 함수 시작
    const { slots, corruptSlotIds, save, load, remove } = useTextPlaySession(); // 저장 동작 조회
    const language = useAppLanguage(); // 고른 언어
    const text = TEXT_PLAY_UI_TEXT[language].saves; // 언어별 저장 글자
    const title = mode === "save" ? text.saveTitle : text.loadTitle; // 대화상자 제목
    const initialIndex = mode === "save" ? 0 : manualSlots.findIndex((slotId) => slots.some((slot) => slot.slotId === slotId)); // 초기 초점 슬롯
    const runSave = async (slotId: TextPlaySlotId, slot: TextPlaySaveSlot | null) => // 저장 실행
    { // 함수 시작
        if (slot !== null && !window.confirm(text.confirmOverwrite)) // 덮어쓰기 확인
        { // 조건 시작
            return; // 저장 취소
        } // 조건 종료
        await save(slotId); // 슬롯 저장
    }; // 함수 종료
    const runLoad = async (slotId: TextPlaySlotId) => // 불러오기 실행
    { // 함수 시작
        if (!window.confirm(text.confirmLoad)) // 복원 확인
        { // 조건 시작
            return; // 복원 취소
        } // 조건 종료
        await load(slotId); // 슬롯 복원
        onClose(); // 대화상자 닫기
    }; // 함수 종료
    const runRemove = async (slotId: TextPlaySlotId) => // 삭제 실행
    { // 함수 시작
        if (!window.confirm(text.confirmRemove)) // 삭제 확인
        { // 조건 시작
            return; // 삭제 취소
        } // 조건 종료
        await remove(slotId); // 슬롯 삭제
    }; // 함수 종료
    return ( // 관리자 반환
        <TextPlayDialog labelledBy="text-play-save-dialog-title" describedBy="text-play-save-dialog-description" open={open} onClose={onClose}> {/* 저장 대화상자 */}
            <header className={styles.header}> {/* 저장 머리말 */}
                <span>{mode === "save" ? text.saveEyebrow : text.loadEyebrow}</span> {/* 표제(고른 언어) */}
                <h2 id="text-play-save-dialog-title">{title}</h2> {/* 저장 제목 */}
                <p id="text-play-save-dialog-description">{mode === "save" ? text.saveDescription : text.loadDescription}</p> {/* 모드 설명 */}
            </header> {/* 머리말 종료 */}
            <div className={styles.grid}> {/* 슬롯 격자 */}
                {manualSlots.map((slotId, index) => // 수동 슬롯 순회
                { // 순회 시작
                    const slot = slots.find((candidate) => candidate.slotId === slotId) ?? null; // 저장 슬롯 조회
                    const corrupt = corruptSlotIds.includes(slotId); // 손상 슬롯 확인
                    return ( // 슬롯 반환
                        <article key={slotId} className={styles.slot} role="group" aria-label={text.slotGroup(index + 1)} data-state={corrupt ? "error" : slot === null ? "empty" : "saved"}> {/* 슬롯 카드 */}
                            <div className={styles.slotHeading}> {/* 슬롯 머리말 */}
                                <strong>{text.slot(index + 1)}</strong> {/* 슬롯 제목 */}
                                <span>{corrupt ? text.stateError : slot === null ? text.stateEmpty : text.stateSaved}</span> {/* 슬롯 상태(고른 언어) */}
                            </div> {/* 머리말 종료 */}
                            {corrupt // 손상 슬롯 확인
                                ? <p className={styles.error}>{text.corrupt}</p> // 손상 슬롯 안내
                                : slot === null // 빈 슬롯 확인
                                ? <p className={styles.empty}>{text.empty}</p> // 빈 슬롯 안내
                                : <div className={styles.meta}><strong>{getSceneTitle(slot, language)}</strong><p>{getRecentSummary(slot, language)}</p><span>{text.playTime(formatTextPlayPlayTime(slot.state.playTimeSeconds, language))}</span><span>{text.savedAt(formatSavedAt(slot.savedAt, language))}</span></div>} {/* 슬롯 정보 */}
                            <div className={styles.actions}> {/* 슬롯 동작 */}
                                {mode === "save" // 저장 모드 확인
                                    ? <button type="button" data-dialog-initial={index === initialIndex ? "true" : undefined} onClick={() => void runSave(slotId, slot)}>{corrupt ? text.repairSave : slot === null ? text.save : text.overwrite}</button> // 저장 버튼
                                    : <button type="button" data-dialog-initial={index === initialIndex ? "true" : undefined} disabled={slot === null} onClick={() => void runLoad(slotId)}>{corrupt ? text.corruptSlot : slot === null ? text.emptySlot : text.load}</button>} {/* 모드 버튼 */}
                                {slot === null && !corrupt ? null : <button type="button" className={styles.delete} onClick={() => void runRemove(slotId)}>{text.remove}</button>} {/* 삭제 버튼 */}
                            </div> {/* 동작 종료 */}
                        </article> // 슬롯 카드 종료
                    ); // 슬롯 반환 종료
                })} {/* 슬롯 목록 종료 */}
            </div> {/* 슬롯 격자 종료 */}
        </TextPlayDialog> // 저장 대화상자 종료
    ); // 반환 종료
} // 함수 종료
