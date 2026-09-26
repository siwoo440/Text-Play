# Local Settings and Data Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 단일 `AppState` 구조를 스키마 5로 확장해 설정, 프로필, 백업·복구, 가져오기·내보내기와 대화 관리를 로컬에서 완성한다.

**Architecture:** 모든 사용자 상태는 `AppState`에 유지하고 Reducer를 통해서만 변경한다. `LocalStorageGateway`는 순수 검증·마이그레이션과 저장·백업을 분리하며, `/settings` 화면은 기존 `AppProvider` 상태와 Gateway 데이터 작업을 연결한다.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, CSS Modules, LocalStorage, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-24-settings-data-management-design.md`

## Global Constraints

- 실제 회원 인증, 서버 동기화, 클라우드 백업, 이메일·푸시 전송, 결제와 원격 데이터베이스는 구현하지 않는다.
- 모든 제품 코드는 Allman 스타일과 각 줄의 짧은 한글 명사형 주석을 유지한다.
- 스키마 4 데이터는 캐릭터·대화·메시지·보관함·설정 손실 없이 스키마 5로 변환한다.
- 초기화와 가져오기는 현재 상태 백업이 성공한 경우에만 진행한다.
- 백업은 최근 3개를 유지한다.
- 모바일 터치 영역은 최소 44px로 구성한다.

## Review Focus

- 미래 스키마 JSON을 가져올 때 기존 상태를 변경하지 않고 오류를 표시하는지 확인한다.
- 손상 JSON이나 필수 필드 누락 JSON을 가져올 때 현재 LocalStorage가 보존되는지 확인한다.
- 초기화·복구·가져오기 전에 백업 쓰기가 실패하면 파괴 작업이 중단되는지 확인한다.
- 대화 삭제 시 연결 메시지와 현재 선택 상태가 함께 정리되는지 확인한다.
- 기존 문자열 배열 형태의 백업 이력을 읽을 때 복구 가능 상태로 변환되는지 확인한다.

---

### Task 1: 스키마 5와 대화 보관 상태

**Files:**
- Modify: `src/features/core/types.ts`
- Modify: `src/features/core/initial-state.ts`
- Modify: `src/mocks/fixtures.ts`
- Modify: `src/test/chat-fixtures.ts`
- Modify: `src/lib/repositories/local-storage-gateway.ts`
- Test: `tests/unit/local-storage-gateway.test.ts`
- Test: `tests/unit/fixtures.test.ts`

**Interfaces:**
- Consumes: 기존 `AppState`, `Conversation`, 스키마 0~4 마이그레이션
- Produces: `Conversation.archivedAt: string | null`, `AppState.schemaVersion: 5`, 스키마 4→5 마이그레이션

- [ ] **Step 1: 스키마 4 마이그레이션 실패 테스트 작성**

```ts
it("스키마 4 대화에 보관 시각을 추가한다", () => // 스키마 변환 검증
{ // 테스트 시작
    const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>; // 이전 상태 복사
    legacy.schemaVersion = 4; // 이전 버전 적용
    const conversations = legacy.conversations as Array<Record<string, unknown>>; // 대화 목록 접근
    conversations.forEach((conversation) => delete conversation.archivedAt); // 새 필드 제거
    localStorage.setItem("mateverse:v1:state", JSON.stringify(legacy)); // 이전 상태 저장
    const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
    expect(result.state.schemaVersion).toBe(5); // 새 버전 확인
    expect(result.state.conversations.every((conversation) => conversation.archivedAt === null)).toBe(true); // 기본값 확인
}); // 테스트 종료
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `pnpm vitest run tests/unit/local-storage-gateway.test.ts tests/unit/fixtures.test.ts`
Expected: 스키마 5 타입 또는 `archivedAt` 부재로 FAIL

- [ ] **Step 3: 타입과 마이그레이션 구현**

```ts
export interface Conversation // 대화방 구조
{ // 구조 시작
    id: string; // 대화방 식별자
    characterId: string; // 캐릭터 식별자
    userId: string; // 사용자 식별자
    title: string; // 대화방 이름
    relationshipLevel: number; // 관계 수치
    relationshipStage: RelationshipStage; // 관계 단계
    emotion: string; // 현재 감정
    currentScene: string; // 현재 장면
    lastMessage: string; // 마지막 메시지
    archivedAt: string | null; // 보관 시각
    createdAt: string; // 생성 시각
    updatedAt: string; // 수정 시각
} // 구조 종료
```

```ts
function migrateVersionFour(value: Record<string, unknown>): AppState | null // 버전 4 변환 함수
{ // 함수 시작
    const conversations = Array.isArray(value.conversations) ? value.conversations.map((item) => // 대화 변환
    { // 변환 시작
        return isRecord(item) ? { ...item, archivedAt: null } : item; // 보관 시각 추가
    }) : value.conversations; // 기존 값 유지
    const candidate: unknown = { ...value, schemaVersion: 5, conversations }; // 버전 5 후보
    return isAppState(candidate) ? candidate : null; // 유효 상태 반환
} // 함수 종료
```

- [ ] **Step 4: 관련 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/local-storage-gateway.test.ts tests/unit/fixtures.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/core/types.ts src/features/core/initial-state.ts src/mocks/fixtures.ts src/test/chat-fixtures.ts src/lib/repositories/local-storage-gateway.ts tests/unit/local-storage-gateway.test.ts tests/unit/fixtures.test.ts
git commit -m "feat: migrate local state to schema five"
```

---

### Task 2: 안전한 가져오기와 백업 이력

**Files:**
- Modify: `src/lib/repositories/local-storage-gateway.ts`
- Test: `tests/unit/local-storage-gateway.test.ts`

**Interfaces:**
- Consumes: 스키마 0~5 상태 검증과 `Storage`
- Produces: `DataSummary`, `BackupSnapshot`, `PreparedImport`, `prepareImport()`, `importPrepared()`, `listBackups()`, `restoreBackup()`

- [ ] **Step 1: 비파괴 가져오기와 3개 백업 테스트 작성**

```ts
it("잘못된 가져오기 데이터는 현재 상태를 변경하지 않는다", () => // 비파괴 가져오기 검증
{ // 테스트 시작
    const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
    const state = createInitialState(); // 초기 상태 생성
    state.profile.nickname = "보존 이름"; // 사용자 값 변경
    gateway.save(state); // 현재 상태 저장
    expect(() => gateway.prepareImport("{잘못된 JSON")).toThrow(ImportValidationError); // 잘못된 파일 거부
    expect(gateway.load().state.profile.nickname).toBe("보존 이름"); // 현재 상태 유지
}); // 테스트 종료

it("백업은 최근 세 개만 유지한다", () => // 백업 순환 검증
{ // 테스트 시작
    const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
    gateway.save(createInitialState()); // 초기 상태 저장
    gateway.createBackup("manual", "2026-09-24T01:00:00.000Z"); // 첫 백업 생성
    gateway.createBackup("manual", "2026-09-24T02:00:00.000Z"); // 둘째 백업 생성
    gateway.createBackup("manual", "2026-09-24T03:00:00.000Z"); // 셋째 백업 생성
    gateway.createBackup("manual", "2026-09-24T04:00:00.000Z"); // 넷째 백업 생성
    expect(gateway.listBackups()).toHaveLength(3); // 최대 개수 확인
    expect(gateway.listBackups()[0]?.createdAt).toBe("2026-09-24T04:00:00.000Z"); // 최신 순서 확인
}); // 테스트 종료
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `pnpm vitest run tests/unit/local-storage-gateway.test.ts`
Expected: 새 타입과 메서드 부재로 FAIL

- [ ] **Step 3: 공개 데이터 계약 구현**

```ts
export interface DataSummary // 데이터 요약 구조
{ // 구조 시작
    schemaVersion: number; // 스키마 버전
    characterCount: number; // 캐릭터 수
    conversationCount: number; // 대화 수
    messageCount: number; // 메시지 수
    bookmarkCount: number; // 보관 수
} // 구조 종료

export interface PreparedImport // 가져오기 준비 구조
{ // 구조 시작
    state: AppState; // 검증 상태
    summary: DataSummary; // 데이터 요약
} // 구조 종료

export interface BackupSnapshot // 백업 구조
{ // 구조 시작
    id: string; // 백업 식별자
    createdAt: string | null; // 생성 시각
    reason: "manual" | "import" | "reset" | "restore" | "recovery"; // 생성 사유
    summary: DataSummary | null; // 데이터 요약
} // 구조 종료
```

- [ ] **Step 4: 검증·저장 분리와 백업 메서드 구현**

`prepareImport(raw)`은 순수 검증과 마이그레이션만 수행하고 Storage를 변경하지 않는다. `importPrepared(prepared)`은 현재 상태 백업 성공 후 검증된 상태를 저장한다. `reset()`과 `restoreBackup(id)`도 동일한 백업 선행 규칙을 사용한다. 기존 문자열 배열 백업은 `createdAt: null`, `reason: "recovery"`로 읽는다.

- [ ] **Step 5: 전체 Gateway 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/local-storage-gateway.test.ts`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/repositories/local-storage-gateway.ts tests/unit/local-storage-gateway.test.ts
git commit -m "feat: add safe local import and backups"
```

---

### Task 3: 프로필과 대화 관리 Reducer

**Files:**
- Modify: `src/features/core/app-reducer.ts`
- Test: `tests/unit/app-reducer.test.ts`

**Interfaces:**
- Consumes: `UserProfile`, `Conversation`, `Message`, `AppState`
- Produces: `update-profile`, `rename-conversation`, `archive-conversation`, `restore-conversation`, `delete-conversation` 액션

- [ ] **Step 1: Reducer 실패 테스트 작성**

```ts
it("대화 삭제 시 메시지와 선택 상태를 함께 정리한다", () => // 대화 삭제 검증
{ // 테스트 시작
    const state = createInitialState(); // 초기 상태 생성
    const target = state.conversations[0]; // 삭제 대상 선택
    state.selectedConversationId = target.id; // 현재 대화 설정
    const next = appReducer(state, { type: "delete-conversation", conversationId: target.id }); // 삭제 실행
    expect(next.conversations.some((conversation) => conversation.id === target.id)).toBe(false); // 대화 제거 확인
    expect(next.messages.some((message) => message.conversationId === target.id)).toBe(false); // 메시지 제거 확인
    expect(next.selectedConversationId).toBeNull(); // 선택 해제 확인
}); // 테스트 종료
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `pnpm vitest run tests/unit/app-reducer.test.ts`
Expected: `delete-conversation` 액션 부재로 FAIL

- [ ] **Step 3: 액션과 Reducer 구현**

```ts
export type AppAction = // 앱 동작
    | { type: "update-profile"; profile: Pick<UserProfile, "nickname" | "avatar"> } // 프로필 변경
    | { type: "rename-conversation"; conversationId: string; title: string } // 대화 이름 변경
    | { type: "archive-conversation"; conversationId: string; archivedAt: string } // 대화 보관
    | { type: "restore-conversation"; conversationId: string } // 대화 복구
    | { type: "delete-conversation"; conversationId: string }; // 대화 삭제
```

대화 이름은 앞뒤 공백을 제거한 1~60자만 허용한다. 유효하지 않은 값은 UI 검증에서 차단하고 Reducer는 빈 문자열 액션을 받으면 기존 상태를 반환한다.

- [ ] **Step 4: Reducer 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/app-reducer.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/core/app-reducer.ts tests/unit/app-reducer.test.ts
git commit -m "feat: add profile and conversation actions"
```

---

### Task 4: 설정 검증과 화면 구현

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/features/settings/SettingsScreen.tsx`
- Create: `src/features/settings/SettingsScreen.module.css`
- Create: `src/features/settings/settings-validation.ts`
- Test: `tests/unit/settings-validation.test.ts`
- Test: `tests/integration/settings-screen.test.tsx`

**Interfaces:**
- Consumes: `useAppStore()`, `update-profile`, `update-settings`, `storageError`
- Produces: `/settings`, `validateProfileSettings()`, `validateNotificationSettings()`

- [ ] **Step 1: 설정 검증 실패 테스트 작성**

```ts
it("공백 닉네임과 역전된 알림 시간을 거부한다", () => // 설정 검증
{ // 테스트 시작
    expect(validateProfileSettings({ nickname: "   ", avatar: "🌙" })).toEqual({ nickname: "닉네임을 입력해 주세요." }); // 닉네임 오류 확인
    expect(validateNotificationSettings({ startTime: "22:00", endTime: "09:00", dailyLimit: 3 })).toEqual({ endTime: "종료 시각은 시작 시각보다 늦어야 합니다." }); // 시간 오류 확인
}); // 테스트 종료
```

- [ ] **Step 2: 설정 화면 실패 테스트 작성**

```tsx
it("프로필을 저장하고 화면 설정을 즉시 반영한다", async () => // 설정 흐름 검증
{ // 테스트 시작
    const user = userEvent.setup(); // 사용자 도구 생성
    renderWithApp(<SettingsScreen />); // 설정 화면 렌더링
    const nickname = screen.getByLabelText("닉네임"); // 닉네임 입력 조회
    await user.clear(nickname); // 기존 이름 제거
    await user.type(nickname, "새 사용자"); // 새 이름 입력
    await user.click(screen.getByRole("button", { name: "프로필 저장" })); // 프로필 저장
    await user.selectOptions(screen.getByLabelText("플랫폼 모드"), "tablet"); // 플랫폼 변경
    expect(screen.getByRole("status")).toHaveTextContent("저장했습니다."); // 성공 안내 확인
}); // 테스트 종료
```

- [ ] **Step 3: 테스트를 실행해 실패 확인**

Run: `pnpm vitest run tests/unit/settings-validation.test.ts tests/integration/settings-screen.test.tsx`
Expected: 설정 모듈 부재로 FAIL

- [ ] **Step 4: 설정 화면과 검증 구현**

`SettingsScreen`은 프로필, 화면, 알림, 데이터 관리, 개인정보의 다섯 탭을 제공한다. 프로필과 알림 입력은 로컬 초안 상태를 사용하며 저장 성공 후 Reducer 액션을 전달한다. 플랫폼·해상도·레이아웃은 선택 즉시 `update-settings`를 전달한다.

- [ ] **Step 5: 설정 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/settings-validation.test.ts tests/integration/settings-screen.test.tsx`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/app/settings/page.tsx src/features/settings tests/unit/settings-validation.test.ts tests/integration/settings-screen.test.tsx
git commit -m "feat: add persisted settings screen"
```

---

### Task 5: 데이터 관리 UI와 브라우저 다운로드

**Files:**
- Create: `src/features/settings/DataManagement.tsx`
- Create: `src/features/settings/data-download.ts`
- Modify: `src/features/settings/SettingsScreen.tsx`
- Test: `tests/unit/data-download.test.ts`
- Test: `tests/integration/data-management.test.tsx`

**Interfaces:**
- Consumes: `LocalStorageGateway`, `PreparedImport`, `BackupSnapshot`, `replace-state`
- Produces: `downloadJsonFile()`, 가져오기 미리보기, 초기화·복구 UI

- [ ] **Step 1: 다운로드와 잘못된 가져오기 실패 테스트 작성**

```ts
it("JSON 파일 다운로드 정보를 생성한다", () => // 다운로드 검증
{ // 테스트 시작
    const result = createJsonDownload("mateverse-backup.json", "{\"ok\":true}"); // 다운로드 생성
    expect(result.filename).toBe("mateverse-backup.json"); // 파일명 확인
    expect(result.blob.type).toBe("application/json;charset=utf-8"); // 형식 확인
}); // 테스트 종료
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `pnpm vitest run tests/unit/data-download.test.ts tests/integration/data-management.test.tsx`
Expected: 데이터 관리 모듈 부재로 FAIL

- [ ] **Step 3: 다운로드·가져오기·초기화·복구 구현**

내보내기는 `Blob`과 임시 Object URL을 사용하고 클릭 후 URL을 해제한다. 가져오기는 파일을 읽은 뒤 `prepareImport()` 결과를 화면에 표시하고 별도 확인 버튼에서만 `importPrepared()`와 `replace-state`를 실행한다. 초기화와 복구도 Gateway 저장이 성공한 뒤에만 `replace-state`를 전달한다.

- [ ] **Step 4: 데이터 관리 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/data-download.test.ts tests/integration/data-management.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/settings/DataManagement.tsx src/features/settings/data-download.ts src/features/settings/SettingsScreen.tsx tests/unit/data-download.test.ts tests/integration/data-management.test.tsx
git commit -m "feat: add local data backup and restore UI"
```

---

### Task 6: 대화 관리 UI와 단일 내보내기

**Files:**
- Create: `src/features/conversation/conversation-export.ts`
- Modify: `src/features/library/LibraryScreen.tsx`
- Modify: `src/features/library/LibraryScreen.module.css`
- Test: `tests/unit/conversation-export.test.ts`
- Test: `tests/integration/library.test.tsx`

**Interfaces:**
- Consumes: 대화 관리 Reducer 액션, `Message[]`, `downloadJsonFile()`
- Produces: `createConversationExport()`, 이름 변경·보관·복구·삭제·내보내기 UI

- [ ] **Step 1: 단일 대화 내보내기와 삭제 흐름 실패 테스트 작성**

```ts
it("선택 대화와 연결 메시지만 내보낸다", () => // 단일 내보내기 검증
{ // 테스트 시작
    const state = createInitialState(); // 초기 상태 생성
    const conversation = state.conversations[0]; // 대상 대화 선택
    const exported = createConversationExport(conversation, state.messages); // 내보내기 생성
    expect(exported.conversation.id).toBe(conversation.id); // 대화 식별자 확인
    expect(exported.messages.every((message) => message.conversationId === conversation.id)).toBe(true); // 연결 메시지 확인
}); // 테스트 종료
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `pnpm vitest run tests/unit/conversation-export.test.ts tests/integration/library.test.tsx`
Expected: 내보내기 함수와 관리 버튼 부재로 FAIL

- [ ] **Step 3: 대화 관리 UI 구현**

진행 중 대화와 보관 대화를 구분하고 각 카드에 이름 변경, 보관 또는 복구, 내보내기와 삭제 동작을 제공한다. 삭제는 대화 제목과 연결 메시지 수를 포함한 확인 대화상자를 거친다.

- [ ] **Step 4: 대화 관리 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/conversation-export.test.ts tests/integration/library.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/conversation/conversation-export.ts src/features/library/LibraryScreen.tsx src/features/library/LibraryScreen.module.css tests/unit/conversation-export.test.ts tests/integration/library.test.tsx
git commit -m "feat: add local conversation management"
```

---

### Task 7: 전체 검증과 사업계획서 11.10 반영

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-settings-data-management-design.md`
- External edit: Google Docs `사업 계획서`의 `11. 챗봇 서비스 사업` 아래 `11.10 로컬 저장 구조 평가·확장 계획` 하위 탭

**Interfaces:**
- Consumes: Task 1~6의 구현과 검증 결과
- Produces: 검증된 로컬 앱과 사업계획서 저장 구조 평가

- [ ] **Step 1: 정적 검사와 전체 테스트 실행**

Run: `pnpm test:run`
Expected: 모든 Vitest 테스트 PASS

Run: `pnpm typecheck`
Expected: 종료 코드 0

Run: `pnpm lint`
Expected: 종료 코드 0

Run: `pnpm build`
Expected: 프로덕션 빌드 성공

- [ ] **Step 2: 브라우저 핵심 흐름 검증**

`/settings`에서 프로필 저장, 레이아웃 변경, JSON 내보내기, 잘못된 파일 거부, 초기화 취소·승인, 백업 복구를 확인한다. `/library`에서 대화 이름 변경, 보관, 복구, 내보내기와 삭제를 확인한다. 데스크톱과 모바일 폭에서 터치 영역과 가로 넘침을 확인한다.

- [ ] **Step 3: 사업계획서 11.10 하위 탭 작성**

`11.10 로컬 저장 구조 평가·확장 계획`을 `11. 챗봇 서비스 사업`의 자식 탭으로 만들고 다음 내용을 기록한다.

- A안: 현재 채택, 단일 AppState·Reducer·LocalStorageGateway·스키마 5 구현 범위
- B안: 설정 분리의 장점, 동기화·통합 백업 복잡성, 서버 동기화 분리 필요 시 재평가
- C안: 대용량·부분 조회·Blob 저장 장점, 마이그레이션·비동기 복잡성, Text-Play 패키지·이미지 Blob·대규모 대화에서 재평가
- 확인되지 않은 용량 수치와 일정은 확정값으로 작성하지 않음

- [ ] **Step 4: 문서 다시 읽기와 탭 계층 검증**

Google Docs 전체 탭 목록에서 `11.10`의 `parentTabId`가 11번 탭인지 확인하고, 본문에 A·B·C 평가와 전환 조건이 모두 포함됐는지 확인한다.

- [ ] **Step 5: 최종 커밋**

```bash
git add docs/superpowers/specs/2026-09-24-settings-data-management-design.md
git commit -m "docs: record completed local settings implementation"
```
