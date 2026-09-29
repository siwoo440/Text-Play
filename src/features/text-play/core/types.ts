export type TextPlayStatKey = "hp" | "sanity" | "gold"; // 능력치 식별자
export type TextPlaySlotId = "auto" | "manual-1" | "manual-2" | "manual-3" | "manual-4" | "manual-5" | "manual-6"; // 저장 슬롯 식별자

export type TextPlayAction = // 게임 액션 묶음
    | { type: "change-stat"; stat: TextPlayStatKey; amount: number } // 능력치 변경
    | { type: "add-item"; itemId: string; quantity: number } // 아이템 추가
    | { type: "remove-item"; itemId: string; quantity: number } // 아이템 제거
    | { type: "move-location"; locationId: string } // 위치 이동
    | { type: "change-relation"; characterId: string; amount: number } // 관계도 변경
    | { type: "start-quest"; questId: string } // 퀘스트 시작
    | { type: "complete-quest"; questId: string } // 퀘스트 완료
    | { type: "trigger-event"; eventId: string }; // 이벤트 실행

export interface TextPlayLogEntry // 플레이 기록 구조
{ // 구조 시작
    id: string; // 기록 식별자
    kind: "narration" | "dialogue" | "system"; // 기록 종류
    speaker: string | null; // 발화자 이름
    content: string; // 표시 내용
    createdAt: string; // 생성 시각
} // 구조 종료

export interface TextPlayChoice // 선택지 구조
{ // 구조 시작
    id: string; // 선택지 식별자
    label: string; // 선택지 문구
    targetSceneId: string; // 이동 장면
    actions: TextPlayAction[]; // 적용 액션
} // 구조 종료

export interface TextPlayScene // 장면 구조
{ // 구조 시작
    id: string; // 장면 식별자
    title: string; // 장면 제목
    locationId: string; // 장소 식별자
    narration: string; // 기본 서술
    imagePath: string | null; // 정적 이미지 경로
    choices: TextPlayChoice[]; // 선택지 목록
    endingId: string | null; // 엔딩 식별자
} // 구조 종료

export interface TextPlayEnding // 엔딩 구조
{ // 구조 시작
    id: string; // 엔딩 식별자
    title: string; // 엔딩 제목
    summary: string; // 엔딩 요약
} // 구조 종료

export interface TextPlayState // 게임 상태 구조
{ // 구조 시작
    packageId: string; // 작품 식별자
    packageVersion: string; // 작품 버전
    saveSchemaVersion: number; // 저장 스키마 버전
    sceneId: string; // 현재 장면
    locationId: string; // 현재 위치
    stats: Record<TextPlayStatKey, number>; // 능력치 목록
    relations: Record<string, number>; // 관계도 목록
    inventory: Record<string, number>; // 인벤토리 목록
    activeQuestIds: string[]; // 진행 퀘스트
    completedQuestIds: string[]; // 완료 퀘스트
    eventFlags: Record<string, boolean>; // 이벤트 상태
    endingId: string | null; // 엔딩 식별자
    log: TextPlayLogEntry[]; // 플레이 기록
    playTimeSeconds: number; // 플레이 시간
    updatedAt: string; // 갱신 시각
} // 구조 종료

export interface TextPlayPackage // 작품 패키지 구조
{ // 구조 시작
    id: string; // 작품 식별자
    version: string; // 작품 버전
    saveSchemaVersion: number; // 저장 스키마 버전
    title: string; // 작품 제목
    description: string; // 작품 설명
    initialSceneId: string; // 시작 장면
    initialLocationId: string; // 시작 위치
    initialStats: Record<TextPlayStatKey, number>; // 초기 능력치
    initialRelations: Record<string, number>; // 초기 관계도
    itemIds: string[]; // 아이템 식별자 목록
    locationIds: string[]; // 장소 식별자 목록
    questIds: string[]; // 퀘스트 식별자 목록
    eventIds: string[]; // 이벤트 식별자 목록
    characterIds: string[]; // 캐릭터 식별자 목록
    scenes: TextPlayScene[]; // 장면 목록
    endings: TextPlayEnding[]; // 엔딩 목록
} // 구조 종료

export interface TextPlaySaveSlot // 저장 슬롯 구조
{ // 구조 시작
    key: string; // 저장 키
    slotId: TextPlaySlotId; // 슬롯 식별자
    packageId: string; // 작품 식별자
    summary: string; // 진행 요약
    state: TextPlayState; // 저장 상태
    savedAt: string; // 저장 시각
} // 구조 종료
