# Text-Play Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Mate Verse ChatBot 웹 앱에 선택지와 제한형 자유 입력, 검증된 게임 상태, IndexedDB 세이브를 갖춘 Text-Play 샘플 게임을 추가한다.

**Architecture:** 기존 Next.js 앱에 `src/features/text-play` 기능 경계를 추가하고 도메인 엔진, AI 응답 검증, 저장소, UI를 분리한다. 기존 LLM 어댑터 객체에 구조화 응답 메서드를 추가해 같은 공급자와 모델을 공유하고, 게임 상태 변경은 Text-Play Engine과 Action Validator만 수행한다.

**Tech Stack:** Next.js 16.3.5, React 19.3.0, TypeScript 5.9.3, Vitest 5, Testing Library, IndexedDB, 기존 CSS Modules

**Spec:** `docs/superpowers/specs/2026-09-25-text-play-web-mvp-design.md`

## Global Constraints

- 작업 루트는 `imports/chatbot-session-snapshot`이다.
- 기존 ChatBot 캐릭터, 대화, 메시지, 지갑, 설정 데이터를 변경하지 않는다.
- 첫 샘플은 판타지 미스터리 탐험이며 AI 없이 선택지만으로 엔딩에 도달해야 한다.
- 첫 MVP는 Story Mode와 제한형 Hybrid Mode만 제공한다.
- 게임 저장은 IndexedDB, 기존 화면·접근성 설정은 localStorage를 사용한다.
- 실제 LLM 비밀키는 브라우저에 저장하지 않고 현재 MVP는 `MockLLMAdapter`를 사용한다.
- 실제 공급자가 연결될 때 ChatBot과 Text-Play는 같은 어댑터 인스턴스와 모델 설정을 사용한다.
- 모든 TypeScript, TSX, CSS 코드 줄에 짧은 한글 명사형 주석을 작성하고 TypeScript 블록은 Allman 스타일을 적용한다.
- JSON과 실행 명령처럼 주석 문법을 지원하지 않는 형식은 원래 문법을 유지한다.
- 제작기, 마켓, 결제, 실제 `.mateplay` 압축 설치, Tauri 패키징은 이번 계획에서 제외한다.

## Review Focus

- 존재하지 않는 장면·아이템·퀘스트를 참조한 액션은 전체 상태를 변경하지 않고 거부되어야 한다. Task 2와 Task 3에서 검증한다.
- 능력치가 허용 범위를 넘어가는 AI 액션은 범위 안으로 조용히 보정하지 않고 거부 사유를 반환해야 한다. Task 3에서 검증한다.
- IndexedDB를 사용할 수 없거나 저장 공간 오류가 발생해도 현재 플레이는 유지되고 저장 실패 안내가 표시되어야 한다. Task 4와 Task 7에서 검증한다.
- 스트리밍 중 취소하거나 잘못된 JSON을 받으면 이미 확정된 게임 상태와 입력 내용이 유지되어야 한다. Task 3과 Task 5에서 검증한다.
- 새로고침과 저장 복원 이후에도 기존 ChatBot `AppState` 직렬화 결과가 Text-Play 실행 전과 같아야 한다. Task 5와 Task 7에서 검증한다.

---

### Task 1: Text-Play 도메인 타입과 공식 샘플 패키지

**Files:**

- Create: `src/features/text-play/core/types.ts`
- Create: `src/features/text-play/data/demo-package.ts`
- Create: `tests/unit/text-play-package.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces: `TextPlayPackage`, `TextPlayState`, `TextPlayAction`, `TextPlayChoice`, `TextPlayScene`, `TextPlaySaveSlot`, `DEMO_TEXT_PLAY_PACKAGE`

- [ ] **Step 1: 패키지 무결성 실패 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

describe("Text-Play 샘플 패키지", () => // 패키지 검증 묶음
{ // 묶음 시작
    it("모든 선택지가 실제 장면을 가리킨다", () => // 장면 참조 검증
    { // 테스트 시작
        const sceneIds = new Set(DEMO_TEXT_PLAY_PACKAGE.scenes.map((scene) => scene.id)); // 장면 식별자 집합
        const targetIds = DEMO_TEXT_PLAY_PACKAGE.scenes.flatMap((scene) => scene.choices.map((choice) => choice.targetSceneId)); // 이동 대상 목록
        expect(targetIds.every((targetId) => sceneIds.has(targetId))).toBe(true); // 모든 대상 존재 확인
    }); // 테스트 종료

    it("정상 엔딩과 후퇴 엔딩을 모두 가진다", () => // 엔딩 구성 검증
    { // 테스트 시작
        expect(DEMO_TEXT_PLAY_PACKAGE.endings.map((ending) => ending.id)).toEqual(["truth-ending", "retreat-ending"]); // 엔딩 식별자 확인
    }); // 테스트 종료
}); // 묶음 종료
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- tests/unit/text-play-package.test.ts`

Expected: FAIL with `Cannot find module '@/features/text-play/data/demo-package'`

- [ ] **Step 3: 도메인 타입 작성**

`types.ts`에 다음 계약을 정확히 정의한다.

```typescript
export type TextPlayStatKey = "hp" | "sanity" | "gold"; // 능력치 식별자
export type TextPlaySlotId = "auto" | "manual-1" | "manual-2" | "manual-3"; // 저장 슬롯 식별자

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
```

- [ ] **Step 4: 샘플 패키지 작성**

`demo-package.ts`에 다음 고정 장면을 선언한다.

- `forest-gate`: 달빛 숲 입구, 등불 획득 또는 후퇴 선택
- `moonlit-hall`: 폐허 회랑, 문양 조사 또는 봉인 서재 이동
- `sealed-study`: 진실 퀘스트 시작, 기록 조사
- `truth-ending`: 기록을 해독하고 사건의 진실 확인
- `retreat-ending`: 숲 밖으로 후퇴

초기 상태는 HP 100, 정신력 80, 골드 10, 위치 `forest-gate`, 빈 인벤토리와 빈 퀘스트로 정의한다. 등불 ID는 `moon-lantern`, 퀘스트 ID는 `voices-below`, NPC ID는 `lyra`로 고정한다.

- [ ] **Step 5: 패키지 테스트 통과 확인**

Run: `npm run test:run -- tests/unit/text-play-package.test.ts`

Expected: PASS with 2 tests

- [ ] **Step 6: 커밋**

```powershell
git add src/features/text-play/core/types.ts src/features/text-play/data/demo-package.ts tests/unit/text-play-package.test.ts # 도메인 파일 스테이징
git commit -m "feat: add Text-Play demo package" # 도메인 커밋
```

---

### Task 2: 결정형 Text-Play Engine

**Files:**

- Create: `src/features/text-play/core/conditions.ts`
- Create: `src/features/text-play/core/actions.ts`
- Create: `src/features/text-play/core/engine.ts`
- Test: `tests/unit/text-play-engine.test.ts`

**Interfaces:**

- Consumes: `TextPlayPackage`, `TextPlayState`, `TextPlayAction`
- Produces: `createTextPlayState(packageData, now)`, `getAvailableChoices(packageData, state)`, `applyTextPlayActions(packageData, state, actions, now)`, `selectTextPlayChoice(packageData, state, choiceId, now)`

- [ ] **Step 1: 엔진 실패 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { applyTextPlayActions, createTextPlayState, selectTextPlayChoice } from "@/features/text-play/core/engine"; // 엔진 함수
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

describe("Text-Play Engine", () => // 엔진 검증 묶음
{ // 묶음 시작
    it("등불 선택 뒤 장면과 인벤토리를 함께 갱신한다", () => // 선택 처리 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = selectTextPlayChoice(DEMO_TEXT_PLAY_PACKAGE, initial, "take-lantern", "2026-09-25T00:01:00.000Z"); // 선택 적용
        expect(result.ok).toBe(true); // 성공 확인
        expect(result.state.sceneId).toBe("moonlit-hall"); // 장면 이동 확인
        expect(result.state.inventory["moon-lantern"]).toBe(1); // 등불 획득 확인
    }); // 테스트 종료

    it("존재하지 않는 아이템 액션은 전체 상태를 유지한다", () => // 잘못된 액션 검증
    { // 테스트 시작
        const initial = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        const result = applyTextPlayActions(DEMO_TEXT_PLAY_PACKAGE, initial, [{ type: "add-item", itemId: "missing", quantity: 1 }], "2026-09-25T00:01:00.000Z"); // 잘못된 액션 적용
        expect(result).toEqual({ ok: false, reason: "unknown-item", state: initial }); // 원자적 거부 확인
    }); // 테스트 종료
}); // 묶음 종료
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- tests/unit/text-play-engine.test.ts`

Expected: FAIL with missing engine module

- [ ] **Step 3: 조건과 액션 검증 구현**

`actions.ts`에서 모든 액션을 먼저 검증한 뒤 복제 상태에 순서대로 적용한다. 능력치 범위는 HP 0~100, 정신력 0~100, 골드 0~9999, 관계도 -100~100으로 고정한다. 아이템·장소·퀘스트·이벤트·캐릭터 식별자는 패키지 선언에 존재해야 한다.

반환 계약은 다음과 같다.

```typescript
export type TextPlayEngineResult = // 엔진 결과 묶음
    | { ok: true; state: TextPlayState } // 성공 결과
    | { ok: false; reason: TextPlayEngineFailure; state: TextPlayState }; // 실패 결과
```

- [ ] **Step 4: 선택 처리와 엔딩 판정 구현**

`selectTextPlayChoice`는 현재 장면에 존재하는 선택지만 허용한다. 액션 전체 성공 후에만 `targetSceneId`로 이동하고, 대상 장면의 `endingId`가 존재하면 상태에 엔딩을 기록한다.

- [ ] **Step 5: 엔진 테스트 통과 확인**

Run: `npm run test:run -- tests/unit/text-play-engine.test.ts`

Expected: PASS with choice, bounds, unknown target, quest transition, ending tests

- [ ] **Step 6: 커밋**

```powershell
git add src/features/text-play/core tests/unit/text-play-engine.test.ts # 엔진 파일 스테이징
git commit -m "feat: add deterministic Text-Play engine" # 엔진 커밋
```

---

### Task 3: 구조화 AI 응답과 Action Validator

**Files:**

- Create: `src/features/text-play/ai/types.ts`
- Create: `src/features/text-play/ai/context-builder.ts`
- Create: `src/features/text-play/ai/response-schema.ts`
- Create: `src/features/text-play/ai/action-validator.ts`
- Modify: `src/lib/adapters/llm-adapter.ts`
- Modify: `src/lib/adapters/mock-llm-adapter.ts`
- Test: `tests/unit/text-play-ai.test.ts`
- Test: `tests/unit/mock-adapters.test.ts`

**Interfaces:**

- Consumes: `TextPlayPackage`, `TextPlayState`, `TextPlayAction`, 기존 `LLMAdapter`
- Produces: `StructuredLLMInput`, `LLMAdapter.streamStructuredReply(input)`, `buildTextPlayContext(packageData, state, input)`, `parseTextPlayResponse(raw)`, `validateProposedActions(packageData, state, actions)`

- [ ] **Step 1: 잘못된 AI 응답 실패 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { parseTextPlayResponse } from "@/features/text-play/ai/response-schema"; // 응답 파서

describe("Text-Play AI 응답", () => // 응답 검증 묶음
{ // 묶음 시작
    it("잘못된 JSON을 거부한다", () => // JSON 오류 검증
    { // 테스트 시작
        expect(parseTextPlayResponse("not-json")).toEqual({ ok: false, reason: "invalid-json" }); // JSON 거부 확인
    }); // 테스트 종료

    it("허용되지 않은 액션을 거부한다", () => // 액션 허용 목록 검증
    { // 테스트 시작
        const raw = JSON.stringify({ narration: "문이 열린다.", dialogue: null, proposedActions: [{ type: "run-code", command: "x" }] }); // 악성 응답 생성
        expect(parseTextPlayResponse(raw)).toEqual({ ok: false, reason: "invalid-action" }); // 액션 거부 확인
    }); // 테스트 종료
}); // 묶음 종료
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- tests/unit/text-play-ai.test.ts`

Expected: FAIL with missing response schema module

- [ ] **Step 3: 공통 구조화 LLM 계약 추가**

`llm-adapter.ts`에 다음 계약을 추가하고 기존 메서드는 변경하지 않는다.

```typescript
export interface StructuredLLMInput // 구조화 입력
{ // 구조 시작
    system: string; // 시스템 규칙
    context: string; // 현재 문맥
    userInput: string; // 사용자 입력
    responseSchema: string; // 응답 스키마 설명
} // 구조 종료

export interface LLMAdapter // 대화 어댑터
{ // 구조 시작
    streamReply(input: LLMInput): AsyncIterable<string>; // 기존 대화 스트림
    streamStructuredReply(input: StructuredLLMInput): AsyncIterable<string>; // 구조화 응답 스트림
    summarizeConversation(input: SummaryInput): Promise<string>; // 대화 요약
} // 구조 종료
```

- [ ] **Step 4: Mock 구조화 응답 구현**

`MockLLMAdapter.streamStructuredReply`는 입력 해시로 결정되는 JSON 문자열을 단어 단위로 스트리밍한다. 기본 응답은 서술 한 개, Lyra 대사 한 개, 관계도 `+1` 액션 한 개를 포함한다. 잘못된 JSON 테스트를 위해 어댑터 내부에 오류 모드를 추가하지 않고 파서 단위 테스트에서 원문을 직접 전달한다.

- [ ] **Step 5: 컨텍스트·파서·검증기 구현**

컨텍스트에는 현재 장면, 능력치, 인벤토리, 활성 퀘스트, 관계도, 허용 대상 ID만 포함한다. 파서는 `narration`, 선택적 `dialogue`, `proposedActions` 외 필드를 무시하지 않고 거부한다. Action Validator는 Task 2 엔진의 동일한 검증 함수를 사용해 범위 밖 수치와 존재하지 않는 대상을 거부한다.

- [ ] **Step 6: AI 테스트와 기존 어댑터 회귀 테스트 통과 확인**

Run: `npm run test:run -- tests/unit/text-play-ai.test.ts tests/unit/mock-adapters.test.ts`

Expected: PASS with invalid JSON, invalid action, stat bounds, deterministic streaming, existing chat tests

- [ ] **Step 7: 커밋**

```powershell
git add src/features/text-play/ai src/lib/adapters tests/unit/text-play-ai.test.ts tests/unit/mock-adapters.test.ts # AI 파일 스테이징
git commit -m "feat: add validated Text-Play AI responses" # AI 커밋
```

---

### Task 4: IndexedDB 저장 계약과 복구 가능한 저장소

**Files:**

- Create: `src/features/text-play/storage/save-repository.ts`
- Create: `src/features/text-play/storage/indexeddb-save-repository.ts`
- Create: `src/features/text-play/storage/memory-save-repository.ts`
- Test: `tests/unit/text-play-save-repository.test.ts`

**Interfaces:**

- Consumes: `TextPlayState`, `TextPlaySlotId`, `TextPlaySaveSlot`
- Produces: `TextPlaySaveRepository`, `IndexedDBTextPlaySaveRepository`, `MemoryTextPlaySaveRepository`, `TextPlayStorageError`

- [ ] **Step 1: 저장 계약 실패 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { createTextPlayState } from "@/features/text-play/core/engine"; // 상태 생성 함수
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 패키지

describe("Text-Play 저장소", () => // 저장소 검증 묶음
{ // 묶음 시작
    it("작품과 슬롯을 분리해 저장한다", async () => // 슬롯 격리 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const state = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-09-25T00:00:00.000Z"); // 초기 상태 생성
        await repository.save("manual-1", state, "첫 장면"); // 수동 슬롯 저장
        expect((await repository.load(DEMO_TEXT_PLAY_PACKAGE.id, "manual-1"))?.state).toEqual(state); // 저장 상태 확인
        expect(await repository.load("another-package", "manual-1")).toBeNull(); // 작품 격리 확인
    }); // 테스트 종료
}); // 묶음 종료
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- tests/unit/text-play-save-repository.test.ts`

Expected: FAIL with missing repository module

- [ ] **Step 3: 저장 계약과 메모리 구현 작성**

```typescript
export interface TextPlaySaveRepository // 저장소 계약
{ // 구조 시작
    list(packageId: string): Promise<TextPlaySaveSlot[]>; // 슬롯 목록
    load(packageId: string, slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null>; // 슬롯 읽기
    save(slotId: TextPlaySlotId, state: TextPlayState, summary: string): Promise<void>; // 슬롯 저장
    remove(packageId: string, slotId: TextPlaySlotId): Promise<void>; // 슬롯 삭제
} // 구조 종료
```

- [ ] **Step 4: IndexedDB 구현 작성**

데이터베이스 이름은 `mateverse:text-play`, 버전은 `1`, 객체 저장소는 `saves`, 기본 키는 `${packageId}:${slotId}`로 고정한다. `indexedDB`가 없으면 생성 단계에서 `TextPlayStorageError("unavailable")`, 요청 실패는 `TextPlayStorageError("write-failed")`, 스키마 검증 실패는 `TextPlayStorageError("invalid-save")`를 반환한다.

- [ ] **Step 5: 저장소 테스트 통과 확인**

Run: `npm run test:run -- tests/unit/text-play-save-repository.test.ts`

Expected: PASS with slot isolation, overwrite, remove, unavailable, invalid save tests

- [ ] **Step 6: 커밋**

```powershell
git add src/features/text-play/storage tests/unit/text-play-save-repository.test.ts # 저장소 파일 스테이징
git commit -m "feat: add Text-Play save repositories" # 저장소 커밋
```

---

### Task 5: 플레이 세션 리듀서와 스트리밍 제어기

**Files:**

- Create: `src/features/text-play/session/text-play-reducer.ts`
- Create: `src/features/text-play/session/text-play-controller.ts`
- Create: `src/features/text-play/session/TextPlayProvider.tsx`
- Create: `src/test/text-play-fixtures.ts`
- Test: `tests/unit/text-play-reducer.test.ts`
- Test: `tests/integration/text-play-controller.test.ts`

**Interfaces:**

- Consumes: Engine, `LLMAdapter`, AI parser, Action Validator, `TextPlaySaveRepository`
- Produces: `TextPlaySessionState`, `TextPlaySessionAction`, `TextPlayController.sendFreeInput(input, signal)`, `useTextPlaySession()`, `createPreparedTextPlaySessionState()`

- [ ] **Step 1: 리듀서 원자성 실패 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { textPlayReducer } from "@/features/text-play/session/text-play-reducer"; // 세션 리듀서
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 준비된 세션 상태

describe("Text-Play 세션 리듀서", () => // 리듀서 검증 묶음
{ // 묶음 시작
    it("AI 실패 뒤 확정된 게임 상태를 유지한다", () => // 실패 원자성 검증
    { // 테스트 시작
        const preparedSessionState = createPreparedTextPlaySessionState(); // 준비 상태 생성
        const next = textPlayReducer(preparedSessionState, { type: "ai-failed", message: "응답을 해석하지 못했습니다." }); // 실패 동작 적용
        expect(next.game).toEqual(preparedSessionState.game); // 게임 상태 유지 확인
        expect(next.pendingInput).toBe(preparedSessionState.pendingInput); // 입력 유지 확인
        expect(next.error).toBe("응답을 해석하지 못했습니다."); // 오류 표시 확인
    }); // 테스트 종료
}); // 묶음 종료
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- tests/unit/text-play-reducer.test.ts tests/integration/text-play-controller.test.ts`

Expected: FAIL with missing session modules

- [ ] **Step 3: 세션 리듀서 구현**

세션 상태는 `game`, `streamedText`, `pendingInput`, `isStreaming`, `error`, `saveNotice`, `isStatePanelOpen`만 가진다. 기존 ChatBot `AppState`와 리듀서에는 Text-Play 게임 상태를 추가하지 않는다.

- [ ] **Step 4: 스트리밍 제어기 구현**

`sendFreeInput` 순서는 입력 보존, 컨텍스트 구성, `streamStructuredReply`, 청크 수집, 파싱, 액션 검증, 엔진 반영, 로그 추가, 자동 저장이다. AbortSignal이 중단되면 수집 중인 텍스트를 폐기하고 확정 상태를 유지한다. 파싱·검증 실패와 LLM 예외에서는 자동 저장을 호출하지 않는다.

- [ ] **Step 5: 기존 ChatBot 상태 무변경 통합 테스트 작성**

테스트 시작 전에 `createInitialState()`를 JSON으로 직렬화하고 Text-Play 선택·자유 입력·저장 후 다시 직렬화한다. 두 문자열이 동일해야 한다.

- [ ] **Step 6: 세션 테스트 통과 확인**

Run: `npm run test:run -- tests/unit/text-play-reducer.test.ts tests/integration/text-play-controller.test.ts`

Expected: PASS with abort, invalid JSON, rejected action, successful action, auto-save, ChatBot isolation tests

- [ ] **Step 7: 커밋**

```powershell
git add src/features/text-play/session tests/unit/text-play-reducer.test.ts tests/integration/text-play-controller.test.ts # 세션 파일 스테이징
git commit -m "feat: add Text-Play session controller" # 세션 커밋
```

---

### Task 6: Text-Play 홈과 플레이 화면

**Files:**

- Create: `src/app/text-play/page.tsx`
- Create: `src/app/text-play/demo/page.tsx`
- Create: `src/features/text-play/ui/TextPlayHome.tsx`
- Create: `src/features/text-play/ui/TextPlayHome.module.css`
- Create: `src/features/text-play/ui/TextPlayScreen.tsx`
- Create: `src/features/text-play/ui/TextPlayScreen.module.css`
- Create: `src/features/text-play/ui/StoryLog.tsx`
- Create: `src/features/text-play/ui/ChoiceList.tsx`
- Create: `src/features/text-play/ui/StatusPanel.tsx`
- Create: `src/features/text-play/ui/InventoryPanel.tsx`
- Create: `tests/components/text-play-home.test.tsx`
- Create: `tests/components/text-play-screen.test.tsx`

**Interfaces:**

- Consumes: `TextPlayProvider`, `useTextPlaySession`, Demo package
- Produces: `/text-play`, `/text-play/demo`, 접근 가능한 플레이 UI

- [ ] **Step 1: 홈 화면 실패 테스트 작성**

```typescript
import { render, screen } from "@testing-library/react"; // 렌더 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { TextPlayHome } from "@/features/text-play/ui/TextPlayHome"; // 홈 화면

describe("Text-Play 홈", () => // 홈 검증 묶음
{ // 묶음 시작
    it("샘플 작품과 새 게임 경로를 제공한다", () => // 진입점 검증
    { // 테스트 시작
        render(<TextPlayHome resumeSlot={null} />); // 홈 렌더
        expect(screen.getByRole("heading", { name: "달빛 숲의 기록" })).toBeInTheDocument(); // 작품 제목 확인
        expect(screen.getByRole("link", { name: "새 게임" })).toHaveAttribute("href", "/text-play/demo?mode=new"); // 새 게임 링크 확인
    }); // 테스트 종료
}); // 묶음 종료
```

- [ ] **Step 2: 플레이 화면 실패 테스트 작성**

선택지 버튼, 자유 입력, 전송, 응답 중지, 상태 패널, 인벤토리, 퀘스트, `aria-live` 시스템 메시지가 렌더되는지 검증한다. 모바일 패널 버튼은 `aria-expanded`와 `aria-controls`를 가져야 한다.

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test:run -- tests/components/text-play-home.test.tsx tests/components/text-play-screen.test.tsx`

Expected: FAIL with missing UI modules

- [ ] **Step 4: 홈과 경로 구현**

`src/app/text-play/page.tsx`는 `TextPlayHome`만 반환한다. 홈은 서비스 설명, 샘플 카드, 새 게임, 이어하기, Mate Verse 탐색 복귀 링크를 제공한다.

- [ ] **Step 5: 플레이 UI 구현**

`TextPlayScreen`은 상단 상태줄, 장면 이미지 영역, `StoryLog`, `ChoiceList`, 자유 입력 폼, 상태 패널을 결합한다. AI 서술은 `article`, 시스템 변화는 별도 `status` 영역, 선택지는 실제 `button` 목록을 사용한다.

- [ ] **Step 6: 반응형 CSS 구현**

1280px 이상은 장면·대화·상태의 3영역, 768~1279px는 상태 패널 축소, 767px 이하는 단일 열과 상태 서랍을 사용한다. 기존 Mate Verse 색상 토큰을 재사용하고 색상만으로 시스템 변화를 구분하지 않는다.

- [ ] **Step 7: UI 테스트 통과 확인**

Run: `npm run test:run -- tests/components/text-play-home.test.tsx tests/components/text-play-screen.test.tsx`

Expected: PASS with navigation, controls, accessibility, responsive class tests

- [ ] **Step 8: 커밋**

```powershell
git add src/app/text-play src/features/text-play/ui tests/components/text-play-home.test.tsx tests/components/text-play-screen.test.tsx # UI 파일 스테이징
git commit -m "feat: add Text-Play web screens" # UI 커밋
```

---

### Task 7: 세이브 관리자와 플레이 전체 흐름

**Files:**

- Create: `src/features/text-play/ui/SaveManager.tsx`
- Modify: `src/features/text-play/ui/TextPlayScreen.tsx`
- Modify: `src/features/text-play/ui/TextPlayScreen.module.css`
- Create: `tests/integration/text-play-flow.test.tsx`
- Create: `tests/integration/text-play-save-flow.test.tsx`

**Interfaces:**

- Consumes: `TextPlaySaveRepository`, `useTextPlaySession`, Engine, Demo package
- Produces: 자동 저장, 수동 저장 세 개, 복원·삭제·저장 실패 UI

- [ ] **Step 1: 전체 선택지 완주 실패 테스트 작성**

새 게임에서 `달빛 등불을 든다`, `봉인된 서재로 간다`, `기록을 해독한다`를 차례로 선택하고 `truth-ending`과 완료 퀘스트 `voices-below`가 표시되는지 검증한다.

- [ ] **Step 2: 저장·복원 실패 테스트 작성**

`manual-1`에 저장하고 컴포넌트를 언마운트한 뒤 같은 메모리 저장소로 다시 렌더한다. 이어하기 후 장면, 인벤토리, 퀘스트, 로그가 동일해야 한다.

- [ ] **Step 3: 저장 실패 복원력 테스트 작성**

`save()`가 `TextPlayStorageError("write-failed")`를 던지는 저장소를 주입한다. 선택 적용 후 현재 장면은 유지되고 `플레이는 계속할 수 있지만 저장하지 못했습니다.`가 표시되어야 한다.

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm run test:run -- tests/integration/text-play-flow.test.tsx tests/integration/text-play-save-flow.test.tsx`

Expected: FAIL with missing SaveManager and save actions

- [ ] **Step 5: SaveManager 구현**

슬롯별 장면명, 저장 시각, 플레이 시간, 진행 요약을 표시한다. 빈 슬롯은 `저장`만 제공하고 사용 중인 슬롯은 `불러오기`, `덮어쓰기`, `삭제`를 제공한다. 불러오기와 삭제는 확인 대화상자를 거친다.

- [ ] **Step 6: 자동 저장과 오류 안내 연결**

장면 전환과 주요 이벤트 완료 직후 `auto` 슬롯을 저장한다. 저장 실패는 게임 상태를 롤백하지 않고 `role="status"` 안내를 표시한다.

- [ ] **Step 7: 전체 흐름 테스트 통과 확인**

Run: `npm run test:run -- tests/integration/text-play-flow.test.tsx tests/integration/text-play-save-flow.test.tsx`

Expected: PASS with truth ending, retreat ending, manual restore, overwrite confirmation, save failure tests

- [ ] **Step 8: 커밋**

```powershell
git add src/features/text-play/ui tests/integration/text-play-flow.test.tsx tests/integration/text-play-save-flow.test.tsx # 흐름 파일 스테이징
git commit -m "feat: add Text-Play save manager" # 흐름 커밋
```

---

### Task 8: 기존 헤더 연결과 회귀 보호

**Files:**

- Modify: `src/components/app-shell/AppHeader.tsx`
- Modify: `src/components/app-shell/AppShell.module.css`
- Modify: `tests/components/app-shell.test.tsx`
- Create: `tests/integration/text-play-chatbot-isolation.test.tsx`

**Interfaces:**

- Consumes: `/text-play` 경로, 기존 AppShell
- Produces: 데스크톱 Text-Play 메뉴, 기존 ChatBot 회귀 보호

- [ ] **Step 1: 헤더 링크 실패 테스트 작성**

```typescript
it("Text-Play 메뉴를 제공한다", () => // 메뉴 검증
{ // 테스트 시작
    renderWithApp(<div>본문</div>); // 앱 셸 렌더
    expect(screen.getByRole("link", { name: "Text-Play" })).toHaveAttribute("href", "/text-play"); // 메뉴 경로 확인
}); // 테스트 종료
```

- [ ] **Step 2: ChatBot 격리 실패 테스트 작성**

Text-Play 새 게임, 선택, 자유 입력, 저장을 실행한 뒤 초기 `AppState`와 최종 `AppState`가 동일한지 검증한다. 기존 캐릭터 채팅 화면을 다시 렌더해 대화 메시지와 토큰 잔액도 동일한지 확인한다.

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test:run -- tests/components/app-shell.test.tsx tests/integration/text-play-chatbot-isolation.test.tsx`

Expected: FAIL because Text-Play navigation does not exist

- [ ] **Step 4: 헤더와 모바일 진입점 구현**

데스크톱 주요 메뉴에 `Text-Play` 링크를 추가한다. 모바일에서는 헤더 너비를 넘기지 않도록 기존 내비게이션 정책을 유지하고 Text-Play 홈에서 명확한 복귀 링크를 제공한다.

- [ ] **Step 5: 회귀 테스트 통과 확인**

Run: `npm run test:run -- tests/components/app-shell.test.tsx tests/integration/text-play-chatbot-isolation.test.tsx`

Expected: PASS with existing shell tests and isolation tests

- [ ] **Step 6: 커밋**

```powershell
git add src/components/app-shell tests/components/app-shell.test.tsx tests/integration/text-play-chatbot-isolation.test.tsx # 연결 파일 스테이징
git commit -m "feat: link Text-Play from ChatBot shell" # 연결 커밋
```

---

### Task 9: 전체 자동 검증과 개발 서버 동시 확인

**Files:**

- Create: `docs/text-play-preview-guide.md`

**Interfaces:**

- Consumes: 전체 Text-Play MVP
- Produces: 자동 검증 증거, 브라우저 확인 절차, Windows 패키징 진입 조건

- [ ] **Step 1: 전체 단위·통합 테스트 실행**

Run: `npm run test:run`

Expected: 모든 테스트 파일 PASS, 실패 0개

- [ ] **Step 2: 타입 검사 실행**

Run: `npm run typecheck`

Expected: exit code 0, TypeScript errors 0

- [ ] **Step 3: 린트 실행**

Run: `npm run lint`

Expected: exit code 0, ESLint errors 0

- [ ] **Step 4: 운영 빌드 실행**

Run: `npm run build`

Expected: exit code 0, `/text-play`와 `/text-play/demo` 빌드 확인

- [ ] **Step 5: 개발 서버 실행**

기존 홈페이지가 3000번 포트를 사용할 수 있으므로 Text-Play 작업 앱은 3001번 포트를 사용한다.

```powershell
Set-Location 'C:\Users\siwoo\Downloads\css-styling\imports\chatbot-session-snapshot' # 앱 폴더 이동
npm ci # 잠금 파일 기준 의존성 설치
npm run dev -- --hostname 127.0.0.1 --port 3001 # 개발 서버 실행
```

Expected: `http://127.0.0.1:3001` ready

- [ ] **Step 6: Codex 인앱 브라우저에서 함께 확인**

Codex는 개발 서버 터미널을 계속 실행한 상태에서 인앱 브라우저로 `http://127.0.0.1:3001/text-play`를 연다. 코드 변경 뒤 Next.js Fast Refresh 결과를 같은 탭에서 확인한다. 사용자와 다음 체크포인트마다 화면을 검토한다.

1. Text-Play 홈과 샘플 카드
2. 새 게임 진입과 첫 선택지
3. 자유 입력 스트리밍과 중지
4. 상태·인벤토리·퀘스트 변경
5. 수동 저장·새로고침·이어하기
6. 정상 엔딩과 후퇴 엔딩
7. 1440px 데스크톱, 1024px 태블릿, 390px 모바일
8. 키보드만 사용한 전체 이동

- [ ] **Step 7: 브라우저 오류 확인**

Expected: console error 0, hydration error 0, 깨진 이미지 요청 0, 접근 불가능한 필수 버튼 0

- [ ] **Step 8: 미리보기 안내 문서 작성**

`docs/text-play-preview-guide.md`에 설치, 3001번 실행, 홈·플레이 주소, 테스트 명령, 저장 초기화 방법, 알려진 제한을 기록한다. 실제 LLM이 아니라 Mock 응답이라는 사실을 명시한다.

- [ ] **Step 9: Windows 실행 파일 진입 조건 기록**

다음 항목이 모두 충족될 때 별도 Tauri 설계와 계획을 시작한다고 문서에 기록한다.

- 웹 MVP 전체 테스트·타입·린트·빌드 통과
- 사용자 화면 검토 승인
- 실제 LLM 서버 API 계약 확정
- IndexedDB 저장 스키마 안정화
- `.mateplay` 패키지 최소 규격 확정

Windows 단계에서는 Rust·MSVC·WebView2 준비, Tauri 셸 생성, Next.js 정적 출력 또는 로컬 서버 방식 결정, 파일 시스템 권한, 자동 업데이트, 코드 서명, MSI/EXE 빌드를 별도 검증한다.

- [ ] **Step 10: 최종 커밋**

```powershell
git add docs/text-play-preview-guide.md src tests # 검증 수정 스테이징
git commit -m "docs: add Text-Play preview workflow" # 검증 문서 커밋
```

- [ ] **Step 11: 최종 변경 검토**

Run: `git status --short`

Expected: Text-Play 계획 범위 밖의 새 변경 없음

Run: `git log --oneline -9`

Expected: Task 1~9의 독립 커밋 확인
