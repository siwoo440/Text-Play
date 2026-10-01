import type { TextPlaySaveSlot, TextPlaySlotId } from "@/features/text-play/core/types"; // 저장 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { localizeTextPlayPackage } from "@/features/text-play/data/localize-package"; // 작품 언어판
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어
import { TEXT_PLAY_UI_TEXT } from "@/features/text-play/ui/text-play-ui-text"; // 언어별 화면 글자

export function formatTextPlayPlayTime(totalSeconds: number, language: AppLanguage = "ko"): string // 플레이 시간 표시
{ // 함수 시작
    const minutes = Math.floor(totalSeconds / 60); // 전체 분 계산
    const seconds = totalSeconds % 60; // 남은 초 계산
    return TEXT_PLAY_UI_TEXT[language].saves.minutesSeconds(minutes, seconds); // 시간 문구 반환
} // 함수 종료

export function formatTextPlaySaveSummary(slot: TextPlaySaveSlot, language: AppLanguage = "ko"): string // 장면 제목과 플레이 시간 요약
{ // 함수 시작
    const scene = localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, language).scenes.find((candidate) => candidate.id === slot.state.sceneId); // 저장 장면 조회(고른 언어)
    return `${scene?.title ?? slot.summary} · ${formatTextPlayPlayTime(slot.state.playTimeSeconds, language)}`; // 장면 제목 요약 반환
} // 함수 종료

export function getTextPlaySlotLabel(slotId: TextPlaySlotId, language: AppLanguage = "ko"): string // 저장 슬롯 이름
{ // 함수 시작
    const text = TEXT_PLAY_UI_TEXT[language].saves; // 언어별 저장 글자
    return slotId === "auto" ? text.autoSlot : text.manualSlot(slotId.replace("manual-", "")); // 자동·수동 구분 이름
} // 함수 종료

export function getTextPlayWorkTitle(packageId: string, language: AppLanguage = "ko"): string // 작품 제목
{ // 함수 시작
    return packageId === DEMO_TEXT_PLAY_PACKAGE.id ? localizeTextPlayPackage(DEMO_TEXT_PLAY_PACKAGE, language).title : packageId; // 알려진 작품 제목 반환(고른 언어)
} // 함수 종료
