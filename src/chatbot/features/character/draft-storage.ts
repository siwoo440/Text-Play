// 작성 중 자동 저장: 편집기에서 쓰던 내용을 브라우저에 따로 보관해 창을 닫아도 이어서 쓸 수 있게 한다(앱 상태와 별개).
import { isExampleDialogue, isLoreEntry, isStatusTemplate, isStoryEvent, isWorkUpdate } from "@chatbot/lib/repositories/state-validation"; // 저장 값 검사

const prefix = "mateverse:draft:"; // 저장 키 앞머리

export interface StoredDraft<T> // 보관한 초안
{ // 구조 시작
    savedAt: string; // 보관 시각
    draft: T; // 초안
} // 구조 종료

export function draftKey(kind: "character" | "story", id: string | undefined): string // 저장 키(새로 만들기는 new)
{ // 함수 시작
    return `${prefix}${kind}:${id ?? "new"}`; // 키 반환
} // 함수 종료

function sameShape(base: unknown, value: unknown): boolean // 기본값과 같은 종류인지(글자·숫자·목록·묶음)
{ // 함수 시작
    return Array.isArray(base) ? Array.isArray(value) : base === null ? true : typeof base === typeof value && value !== null && !Array.isArray(value); // 종류 비교
} // 함수 종료

export function coerceDraft<T extends object>(base: T, raw: unknown): T // 보관 값을 지금 초안 모양에 맞추기(모양이 다른 항목은 기본값)
{ // 함수 시작
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) // 묶음 아님
    { // 조건 시작
        return base; // 기본값
    } // 조건 종료
    const source = raw as Record<string, unknown>; // 보관 값
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) }; // 기본값에서 시작
    for (const key of Object.keys(result)) // 항목 순회
    { // 순회 시작
        if (key in source && sameShape(result[key], source[key])) // 같은 종류
        { // 조건 시작
            result[key] = source[key]; // 보관 값 사용
        } // 조건 종료
    } // 순회 종료
    if ("statusTemplate" in result && !isStatusTemplate(result.statusTemplate)) // 상태창 형식이 예전 모양
    { // 조건 시작
        result.statusTemplate = (base as Record<string, unknown>).statusTemplate; // 기본값
    } // 조건 종료
    if ("events" in result && !(result.events as unknown[]).every(isStoryEvent)) // 이벤트가 예전 모양
    { // 조건 시작
        result.events = (base as Record<string, unknown>).events; // 기본값
    } // 조건 종료
    if ("updates" in result && !(result.updates as unknown[]).every(isWorkUpdate)) // 업데이트 기록이 예전 모양
    { // 조건 시작
        result.updates = (base as Record<string, unknown>).updates; // 기본값
    } // 조건 종료
    if ("lorebook" in result && !(result.lorebook as unknown[]).every(isLoreEntry)) // 설정집이 다른 모양
    { // 조건 시작
        result.lorebook = (base as Record<string, unknown>).lorebook; // 기본값
    } // 조건 종료
    if ("examples" in result && !(result.examples as unknown[]).every(isExampleDialogue)) // 예시 대화가 다른 모양
    { // 조건 시작
        result.examples = (base as Record<string, unknown>).examples; // 기본값
    } // 조건 종료
    return result as T; // 맞춘 초안
} // 함수 종료

export function loadDraft<T extends object>(storage: Pick<Storage, "getItem">, key: string, base: T): StoredDraft<T> | null // 보관한 초안 읽기(없거나 깨졌으면 없음)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        const raw = storage.getItem(key); // 보관 글
        const parsed: unknown = raw === null ? null : JSON.parse(raw); // 분석
        if (typeof parsed !== "object" || parsed === null || typeof (parsed as { savedAt?: unknown }).savedAt !== "string") // 모양 확인
        { // 조건 시작
            return null; // 없음
        } // 조건 종료
        return { savedAt: (parsed as { savedAt: string }).savedAt, draft: coerceDraft(base, (parsed as { draft?: unknown }).draft) }; // 초안 반환
    } // 시도 종료
    catch // 읽기 실패
    { // 실패 시작
        return null; // 없음
    } // 실패 종료
} // 함수 종료

export function saveDraft<T>(storage: Pick<Storage, "setItem">, key: string, draft: T, savedAt: string): boolean // 초안 보관(공간이 없으면 실패)
{ // 함수 시작
    try // 저장 시도
    { // 시도 시작
        storage.setItem(key, JSON.stringify({ savedAt, draft })); // 보관
        return true; // 성공
    } // 시도 종료
    catch // 저장 실패
    { // 실패 시작
        return false; // 실패
    } // 실패 종료
} // 함수 종료

export function clearDraft(storage: Pick<Storage, "removeItem">, key: string): void // 보관한 초안 지우기
{ // 함수 시작
    try // 삭제 시도
    { // 시도 시작
        storage.removeItem(key); // 삭제
    } // 시도 종료
    catch // 삭제 실패
    { // 실패 시작
        // 지우지 못해도 편집은 계속할 수 있음
    } // 실패 종료
} // 함수 종료
