import { normalizeEvents, pruneEvents, validateEvents } from "@chatbot/features/chat/event-model"; // 이벤트 정리·검증
import { normalizeExamples, normalizeLorebook, validateExamples, validateLorebook } from "@chatbot/features/chat/lore-model"; // 설정집·예시 대화 정리·검증
import { normalizeRelationStatId } from "@chatbot/features/chat/relation-model"; // 관계 스탯 지정 정리
import { normalizeStats, validateStats } from "@chatbot/features/chat/stat-model"; // 스탯 정리·검증
import type { WorkExtras } from "@chatbot/features/core/defaults"; // 작품 추가 필드
import type { WorkUpdate } from "@chatbot/features/core/types"; // 업데이트 기록
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export const PLAY_GUIDE_LIMIT = 2000; // 플레이 가이드 최대 글자 수
export const CUSTOM_LABEL_LIMIT = 10; // 직접 항목 이름 최대 글자 수
export const UPDATE_LIMIT = 20; // 업데이트 기록 최대 수
export const UPDATE_NOTE_LIMIT = 200; // 업데이트 내용 최대 글자 수

export type WorkExtrasErrors = Partial<Record<keyof WorkExtras, string>>; // 추가 필드 오류

export function normalizeWorkExtras<T extends WorkExtras>(draft: T): T // 추가 필드 정리
{ // 함수 시작
    return { ...draft, events: normalizeEvents(pruneEvents(draft.events, draft.statusTemplate.stats)), lorebook: normalizeLorebook(draft.lorebook), examples: normalizeExamples(draft.examples), playGuide: draft.playGuide.trim(), statusTemplate: { ...draft.statusTemplate, customLabels: draft.statusTemplate.customLabels.map((label) => label.trim()).filter(Boolean).slice(0, 2), stats: normalizeStats(draft.statusTemplate.stats), relationStatId: normalizeRelationStatId(draft.statusTemplate) }, updates: draft.updates.map((update) => ({ ...update, version: update.version.trim(), note: update.note.trim() })) }; // 정리 반환
} // 함수 종료

export function validateWorkExtras(draft: WorkExtras): WorkExtrasErrors // 추가 필드 검증
{ // 함수 시작
    const errors: WorkExtrasErrors = {}; // 오류 목록
    if (draft.playGuide.trim().length > PLAY_GUIDE_LIMIT) // 가이드 길이 판정
    { // 조건 시작
        errors.playGuide = t("플레이 가이드는 {0}자 이하여야 합니다.", [PLAY_GUIDE_LIMIT]); // 길이 오류
    } // 조건 종료
    if (draft.statusTemplate.customLabels.some((label) => label.trim().length > CUSTOM_LABEL_LIMIT)) // 직접 항목 길이 판정
    { // 조건 시작
        errors.statusTemplate = t("상태창 직접 항목 이름은 {0}자 이하여야 합니다.", [CUSTOM_LABEL_LIMIT]); // 항목 오류
    } // 조건 종료
    const statError = validateStats(draft.statusTemplate.stats); // 스탯 검증
    if (statError !== null && errors.statusTemplate === undefined) // 스탯 오류
    { // 조건 시작
        errors.statusTemplate = statError; // 스탯 오류 문구
    } // 조건 종료
    if (draft.updates.length > UPDATE_LIMIT) // 기록 수 판정
    { // 조건 시작
        errors.updates = t("업데이트 기록은 {0}개까지 남길 수 있습니다.", [UPDATE_LIMIT]); // 개수 오류
    } // 조건 종료
    else if (draft.updates.some((update) => update.version.trim().length === 0 || update.version.trim().length > 20 || update.note.trim().length === 0 || update.note.trim().length > UPDATE_NOTE_LIMIT)) // 기록 내용 판정
    { // 조건 시작
        errors.updates = t("업데이트 기록은 버전(1~20자)과 내용(1~{0}자)이 필요합니다.", [UPDATE_NOTE_LIMIT]); // 내용 오류
    } // 조건 종료
    const eventError = validateEvents(draft.events, draft.statusTemplate.stats); // 이벤트 검증
    if (eventError !== null) // 이벤트 오류
    { // 조건 시작
        errors.events = eventError; // 이벤트 오류 문구
    } // 조건 종료
    const loreError = validateLorebook(normalizeLorebook(draft.lorebook)); // 설정집 검증(빈 항목은 빼고)
    if (loreError !== null) // 설정집 오류
    { // 조건 시작
        errors.lorebook = loreError; // 설정집 오류 문구
    } // 조건 종료
    const exampleError = validateExamples(normalizeExamples(draft.examples)); // 예시 대화 검증(빈 쌍은 빼고)
    if (exampleError !== null) // 예시 오류
    { // 조건 시작
        errors.examples = exampleError; // 예시 오류 문구
    } // 조건 종료
    return errors; // 오류 반환
} // 함수 종료

export function createWorkUpdate(version: string, note: string, date: string): WorkUpdate // 업데이트 기록 만들기
{ // 함수 시작
    return { id: `update-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, version: version.trim(), date, note: note.trim() }; // 기록 반환
} // 함수 종료
