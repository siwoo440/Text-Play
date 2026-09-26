import type { TextPlayAction, TextPlayPackage, TextPlayState, TextPlayStatKey } from "@/features/text-play/core/types"; // 도메인 계약

export type TextPlayEngineFailure = // 엔진 실패 종류
    | "ending-reached" // 엔딩 이후 입력
    | "unknown-scene" // 미등록 장면
    | "unknown-choice" // 미등록 선택지
    | "unknown-item" // 미등록 아이템
    | "invalid-quantity" // 잘못된 수량
    | "insufficient-item" // 아이템 부족
    | "unknown-location" // 미등록 장소
    | "unknown-quest" // 미등록 퀘스트
    | "invalid-quest-transition" // 잘못된 퀘스트 전환
    | "unknown-event" // 미등록 이벤트
    | "unknown-character" // 미등록 캐릭터
    | "stat-out-of-range" // 능력치 범위 초과
    | "relation-out-of-range"; // 관계도 범위 초과

export type TextPlayEngineResult = // 엔진 결과 묶음
    | { ok: true; state: TextPlayState } // 성공 결과
    | { ok: false; reason: TextPlayEngineFailure; state: TextPlayState }; // 실패 결과

const STAT_LIMITS: Record<TextPlayStatKey, { minimum: number; maximum: number }> = // 능력치 범위
{ // 범위 시작
    hp: { minimum: 0, maximum: 100 }, // 체력 범위
    sanity: { minimum: 0, maximum: 100 }, // 정신력 범위
    gold: { minimum: 0, maximum: 9999 }, // 골드 범위
}; // 범위 종료

function cloneTextPlayState(state: TextPlayState): TextPlayState // 상태 복제
{ // 함수 시작
    return { // 복제 상태 반환
        ...state, // 기본 필드 복사
        stats: { ...state.stats }, // 능력치 복사
        relations: { ...state.relations }, // 관계도 복사
        inventory: { ...state.inventory }, // 인벤토리 복사
        activeQuestIds: [...state.activeQuestIds], // 진행 퀘스트 복사
        completedQuestIds: [...state.completedQuestIds], // 완료 퀘스트 복사
        eventFlags: { ...state.eventFlags }, // 이벤트 상태 복사
        log: state.log.map((entry) => ({ ...entry })), // 기록 복사
    }; // 복제 종료
} // 함수 종료

function calculateElapsedSeconds(previous: string, current: string): number // 경과 시간 계산
{ // 함수 시작
    const difference = Date.parse(current) - Date.parse(previous); // 시각 차이 계산
    if (!Number.isFinite(difference) || difference <= 0) // 유효한 순방향 시간 확인
    { // 조건 시작
        return 0; // 경과 없음 반환
    } // 조건 종료
    return Math.floor(difference / 1000); // 경과 초 반환
} // 함수 종료

function applyActionToDraft(packageData: TextPlayPackage, draft: TextPlayState, action: TextPlayAction): TextPlayEngineFailure | null // 단일 액션 검증·적용
{ // 함수 시작
    if (action.type === "change-stat") // 능력치 액션 확인
    { // 조건 시작
        const limit = STAT_LIMITS[action.stat]; // 적용 범위 조회
        const nextValue = draft.stats[action.stat] + action.amount; // 변경 값 계산
        if (nextValue < limit.minimum || nextValue > limit.maximum) // 범위 확인
        { // 조건 시작
            return "stat-out-of-range"; // 범위 오류 반환
        } // 조건 종료
        draft.stats[action.stat] = nextValue; // 능력치 적용
        return null; // 성공 반환
    } // 조건 종료

    if (action.type === "add-item" || action.type === "remove-item") // 아이템 액션 확인
    { // 조건 시작
        if (!packageData.itemIds.includes(action.itemId)) // 아이템 존재 확인
        { // 조건 시작
            return "unknown-item"; // 아이템 오류 반환
        } // 조건 종료
        if (!Number.isInteger(action.quantity) || action.quantity <= 0) // 수량 유효성 확인
        { // 조건 시작
            return "invalid-quantity"; // 수량 오류 반환
        } // 조건 종료
        const currentQuantity = draft.inventory[action.itemId] ?? 0; // 현재 수량 조회
        if (action.type === "remove-item" && currentQuantity < action.quantity) // 보유 수량 확인
        { // 조건 시작
            return "insufficient-item"; // 수량 부족 반환
        } // 조건 종료
        const nextQuantity = action.type === "add-item" ? currentQuantity + action.quantity : currentQuantity - action.quantity; // 다음 수량 계산
        if (nextQuantity === 0) // 빈 아이템 확인
        { // 조건 시작
            delete draft.inventory[action.itemId]; // 빈 아이템 제거
        } // 조건 종료
        else // 보유 아이템 처리
        { // 조건 시작
            draft.inventory[action.itemId] = nextQuantity; // 수량 적용
        } // 조건 종료
        return null; // 성공 반환
    } // 조건 종료

    if (action.type === "move-location") // 위치 액션 확인
    { // 조건 시작
        if (!packageData.locationIds.includes(action.locationId)) // 위치 존재 확인
        { // 조건 시작
            return "unknown-location"; // 위치 오류 반환
        } // 조건 종료
        draft.locationId = action.locationId; // 위치 적용
        return null; // 성공 반환
    } // 조건 종료

    if (action.type === "change-relation") // 관계도 액션 확인
    { // 조건 시작
        if (!packageData.characterIds.includes(action.characterId)) // 캐릭터 존재 확인
        { // 조건 시작
            return "unknown-character"; // 캐릭터 오류 반환
        } // 조건 종료
        const nextValue = (draft.relations[action.characterId] ?? 0) + action.amount; // 관계도 계산
        if (nextValue < -100 || nextValue > 100) // 관계도 범위 확인
        { // 조건 시작
            return "relation-out-of-range"; // 관계도 오류 반환
        } // 조건 종료
        draft.relations[action.characterId] = nextValue; // 관계도 적용
        return null; // 성공 반환
    } // 조건 종료

    if (action.type === "start-quest" || action.type === "complete-quest") // 퀘스트 액션 확인
    { // 조건 시작
        if (!packageData.questIds.includes(action.questId)) // 퀘스트 존재 확인
        { // 조건 시작
            return "unknown-quest"; // 퀘스트 오류 반환
        } // 조건 종료
        if (action.type === "start-quest") // 퀘스트 시작 확인
        { // 조건 시작
            if (draft.activeQuestIds.includes(action.questId) || draft.completedQuestIds.includes(action.questId)) // 중복 시작 확인
            { // 조건 시작
                return "invalid-quest-transition"; // 전환 오류 반환
            } // 조건 종료
            draft.activeQuestIds.push(action.questId); // 진행 퀘스트 추가
            return null; // 성공 반환
        } // 조건 종료
        if (!draft.activeQuestIds.includes(action.questId)) // 진행 상태 확인
        { // 조건 시작
            return "invalid-quest-transition"; // 전환 오류 반환
        } // 조건 종료
        draft.activeQuestIds = draft.activeQuestIds.filter((questId) => questId !== action.questId); // 진행 퀘스트 제거
        draft.completedQuestIds.push(action.questId); // 완료 퀘스트 추가
        return null; // 성공 반환
    } // 조건 종료

    if (!packageData.eventIds.includes(action.eventId)) // 이벤트 존재 확인
    { // 조건 시작
        return "unknown-event"; // 이벤트 오류 반환
    } // 조건 종료
    draft.eventFlags[action.eventId] = true; // 이벤트 적용
    return null; // 성공 반환
} // 함수 종료

export function applyTextPlayActions(packageData: TextPlayPackage, state: TextPlayState, actions: TextPlayAction[], now: string): TextPlayEngineResult // 액션 묶음 적용
{ // 함수 시작
    if (state.endingId !== null) // 엔딩 상태 확인
    { // 조건 시작
        return { ok: false, reason: "ending-reached", state }; // 엔딩 입력 거부
    } // 조건 종료

    const draft = cloneTextPlayState(state); // 검증용 상태 복제
    for (const action of actions) // 액션 순회
    { // 반복 시작
        const failure = applyActionToDraft(packageData, draft, action); // 액션 검증·적용
        if (failure !== null) // 실패 여부 확인
        { // 조건 시작
            return { ok: false, reason: failure, state }; // 원본 상태와 실패 반환
        } // 조건 종료
    } // 반복 종료
    draft.playTimeSeconds += calculateElapsedSeconds(state.updatedAt, now); // 플레이 시간 누적
    draft.updatedAt = now; // 갱신 시각 적용
    return { ok: true, state: draft }; // 성공 상태 반환
} // 함수 종료
