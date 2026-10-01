import type { TextPlaySaveSlot, TextPlaySlotId } from "@/features/text-play/core/types"; // 저장 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품

export function formatTextPlayPlayTime(totalSeconds: number): string // 플레이 시간 표시
{ // 함수 시작
    const minutes = Math.floor(totalSeconds / 60); // 전체 분 계산
    const seconds = totalSeconds % 60; // 남은 초 계산
    return `${minutes}분 ${seconds}초`; // 시간 문구 반환
} // 함수 종료

export function formatTextPlaySaveSummary(slot: TextPlaySaveSlot): string // 장면 제목과 플레이 시간 요약
{ // 함수 시작
    const scene = DEMO_TEXT_PLAY_PACKAGE.scenes.find((candidate) => candidate.id === slot.state.sceneId); // 저장 장면 조회
    return `${scene?.title ?? slot.summary} · ${formatTextPlayPlayTime(slot.state.playTimeSeconds)}`; // 장면 제목 요약 반환
} // 함수 종료

export function getTextPlaySlotLabel(slotId: TextPlaySlotId): string // 저장 슬롯 이름
{ // 함수 시작
    return slotId === "auto" ? "자동 저장" : `수동 저장 ${slotId.replace("manual-", "")}`; // 자동·수동 구분 이름
} // 함수 종료

export function getTextPlayWorkTitle(packageId: string): string // 작품 제목
{ // 함수 시작
    return packageId === DEMO_TEXT_PLAY_PACKAGE.id ? DEMO_TEXT_PLAY_PACKAGE.title : packageId; // 알려진 작품 제목 반환
} // 함수 종료
