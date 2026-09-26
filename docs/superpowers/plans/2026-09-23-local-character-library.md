# Local Character Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬에서 캐릭터를 제작·수정·보관하고 보관함에서 관리할 수 있는 1단계 기능을 완성한다.

**Architecture:** 기존 단일 `AppState`와 Reducer 흐름을 스키마 2로 확장한다. 제작 폼은 로컬 편집 상태를 검증한 뒤 Reducer로 저장하고, 보관함과 상세 화면은 같은 전역 상태를 읽어 즉시 반영한다. `AppProvider`와 `LocalStorageGateway`가 새로고침 뒤 상태를 복원한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-23-local-character-library-design.md`

---

## Global Constraints

- 외부 API, 데이터베이스, 결제, 인증을 호출하지 않는다.
- 대표 이미지는 `/images/characters/*.webp`의 로컬 자산만 사용한다.
- 모든 코드는 Allman 스타일과 각 줄의 짧은 한글 주석을 지킨다.
- 제작자용 프롬프트는 일반 상세·탐색·보관 카드에 표시하지 않는다.
- 화면 전환은 160~220ms이며 `prefers-reduced-motion`에서 제거한다.
- 모바일 터치 대상은 최소 44px을 유지한다.

---

## Review Focus

- 스키마 1 저장값에 새 필드가 없어도 캐릭터·대화·지갑 데이터가 손실되지 않아야 한다.
- 삭제 대상 캐릭터가 선택된 대화와 연결된 경우 대화·메시지·선택 상태를 모두 정리해야 한다.
- 공개 저장과 임시 저장을 반복해도 캐릭터 ID가 바뀌거나 중복 생성되지 않아야 한다.
- 보관 목록에 삭제되거나 존재하지 않는 캐릭터 ID가 남지 않아야 한다.
- 저장 실패 시 편집 폼의 입력값을 유지하고 사용자가 이해할 수 있는 오류를 표시해야 한다.

---

### Task 1: 스키마 2와 캐릭터 상태 동작

**Files:**
- Modify: `src/features/core/types.ts`
- Modify: `src/features/core/initial-state.ts`
- Modify: `src/features/core/app-reducer.ts`
- Modify: `src/mocks/fixtures.ts`
- Modify: `src/lib/repositories/local-storage-gateway.ts`
- Modify: `tests/unit/app-reducer.test.ts`
- Modify: `tests/unit/local-storage-gateway.test.ts`

**Interfaces:**
- Consumes: 기존 `AppState`, `Character`, `LocalStorageGateway`
- Produces: `PublicationStatus`, 스키마 2 `AppState`, `upsert-character`, `delete-character`, `toggle-bookmark`, `set-publication-status`

- [ ] **Step 1: 스키마와 Reducer 실패 테스트 작성**

```typescript
it("버전 1 상태를 버전 2로 변환하고 기존 데이터를 유지한다", () => // 마이그레이션 검증
{ // 검증 시작
    const legacy = createInitialState() as unknown as Record<string, unknown>; // 기준 상태 준비
    legacy.schemaVersion = 1; // 이전 버전 적용
    delete legacy.bookmarkedCharacterIds; // 새 필드 제거
    const characters = legacy.characters as Array<Record<string, unknown>>; // 캐릭터 접근
    characters.forEach((character) => delete character.publicationStatus); // 상태 필드 제거
    localStorage.setItem("mateverse:v1:state", JSON.stringify(legacy)); // 이전 상태 저장
    const result = new LocalStorageGateway(localStorage).load(); // 상태 복원
    expect(result.state.schemaVersion).toBe(2); // 새 버전 확인
    expect(result.state.characters.every((character) => character.publicationStatus === "published")).toBe(true); // 공개 상태 확인
    expect(result.state.bookmarkedCharacterIds).toEqual([]); // 보관 목록 확인
}); // 검증 종료

it("캐릭터 삭제 시 연결 데이터와 보관 상태를 함께 제거한다", () => // 연쇄 삭제 검증
{ // 검증 시작
    const state = createInitialState(); // 초기 상태 준비
    state.bookmarkedCharacterIds = ["rian"]; // 보관 상태 적용
    const next = appReducer(state, { type: "delete-character", characterId: "rian" }); // 캐릭터 삭제
    expect(next.characters.some((character) => character.id === "rian")).toBe(false); // 캐릭터 제거 확인
    expect(next.conversations.some((conversation) => conversation.characterId === "rian")).toBe(false); // 대화 제거 확인
    expect(next.messages.some((message) => message.conversationId === "conversation-rian")).toBe(false); // 메시지 제거 확인
    expect(next.bookmarkedCharacterIds).toEqual([]); // 보관 제거 확인
    expect(next.selectedConversationId).toBeNull(); // 선택 해제 확인
}); // 검증 종료
```

- [ ] **Step 2: 대상 테스트가 새 타입과 동작 부재로 실패하는지 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/app-reducer.test.ts tests/unit/local-storage-gateway.test.ts`

Expected: `bookmarkedCharacterIds`, `publicationStatus`, `delete-character` 부재로 FAIL.

- [ ] **Step 3: 스키마 2 타입과 Reducer 동작 구현**

```typescript
export type PublicationStatus = "draft" | "published"; // 발행 상태

export interface Character // 캐릭터 구조
{ // 구조 시작
    publicationStatus: PublicationStatus; // 발행 상태
} // 구조 종료

export interface AppState // 앱 상태 구조
{ // 구조 시작
    schemaVersion: 2; // 스키마 버전
    bookmarkedCharacterIds: string[]; // 보관 캐릭터
} // 구조 종료
```

Reducer는 캐릭터 ID 기준 불변 갱신, 보관 중복 방지, 캐릭터 삭제의 연결 대화·메시지 정리를 수행한다. `LocalStorageGateway`는 스키마 0→1 변환 뒤 1→2 변환을 연속 적용하며 복구 키는 기존 키를 유지한다.

- [ ] **Step 4: 스키마와 Reducer 테스트 통과 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/app-reducer.test.ts tests/unit/local-storage-gateway.test.ts`

Expected: PASS.

- [ ] **Step 5: 전체 테스트와 타입 검사 실행**

Run: `node node_modules/vitest/vitest.mjs run && node node_modules/typescript/bin/tsc --noEmit`

Expected: 모든 테스트와 타입 검사 PASS.

- [ ] **Step 6: 상태 기반 커밋**

```powershell
git add src/features/core src/mocks/fixtures.ts src/lib/repositories/local-storage-gateway.ts tests/unit/app-reducer.test.ts tests/unit/local-storage-gateway.test.ts # 상태 파일 추가
git commit -m "feat: add local character library state" # 상태 커밋
```

---

### Task 2: 캐릭터 입력 검증과 정규화

**Files:**
- Create: `src/features/character/character-validation.ts`
- Create: `tests/unit/character-validation.test.ts`

**Interfaces:**
- Consumes: `CharacterDraft`
- Produces: `normalizeCharacterDraft(draft): CharacterDraft`, `validateCharacterDraft(draft): CharacterValidationResult`

- [ ] **Step 1: 입력 경계 실패 테스트 작성**

```typescript
it("필수값과 길이 오류를 한 번에 반환한다", () => // 다중 오류 검증
{ // 검증 시작
    const result = validateCharacterDraft({ ...validCharacterDraft, name: " ", summary: "가".repeat(81), personality: "", greeting: "" }); // 잘못된 입력 검증
    expect(result.errors).toEqual( // 오류 목록 확인
    { // 예상 시작
        name: "캐릭터 이름을 입력해 주세요.", // 이름 오류
        summary: "한 줄 소개는 80자 이하여야 합니다.", // 소개 오류
        personality: "성격을 입력해 주세요.", // 성격 오류
        greeting: "첫 인사를 입력해 주세요.", // 인사 오류
    }); // 예상 종료
}); // 검증 종료

it("태그 공백과 중복을 제거한다", () => // 태그 정규화 검증
{ // 검증 시작
    const normalized = normalizeCharacterDraft({ ...validCharacterDraft, tags: [" 힐링 ", "힐링", " 여행 "] }); // 초안 정규화
    expect(normalized.tags).toEqual(["힐링", "여행"]); // 정규 태그 확인
}); // 검증 종료
```

- [ ] **Step 2: 검증 모듈 부재로 실패하는지 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/character-validation.test.ts`

Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: 검증과 정규화 구현**

```typescript
export interface CharacterValidationResult // 검증 결과
{ // 구조 시작
    valid: boolean; // 통과 여부
    errors: Partial<Record<keyof CharacterDraft, string>>; // 필드 오류
} // 구조 종료

export function normalizeCharacterDraft(draft: CharacterDraft): CharacterDraft // 초안 정규화
{ // 함수 시작
    return { ...draft, name: draft.name.trim(), summary: draft.summary.trim(), tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))] }; // 정규 초안 반환
} // 함수 종료
```

검증 함수는 명세의 필수값·최대 길이·태그 8개·태그 12자·허용 이미지 경로를 모두 검사한다.

- [ ] **Step 4: 검증 테스트와 전체 테스트 통과 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/character-validation.test.ts && node node_modules/vitest/vitest.mjs run`

Expected: 신규 테스트와 전체 테스트 PASS.

- [ ] **Step 5: 검증 커밋**

```powershell
git add src/features/character/character-validation.ts tests/unit/character-validation.test.ts # 검증 파일 추가
git commit -m "feat: validate local character drafts" # 검증 커밋
```

---

### Task 3: 제작·수정 편집기와 미리보기

**Files:**
- Create: `src/features/character/CharacterEditor.tsx`
- Create: `src/features/character/CharacterPreview.tsx`
- Create: `src/features/character/CharacterEditor.module.css`
- Create: `src/app/characters/new/page.tsx`
- Create: `src/app/characters/[id]/edit/page.tsx`
- Create: `tests/integration/character-editor.test.tsx`

**Interfaces:**
- Consumes: `CharacterDraft`, `validateCharacterDraft`, `normalizeCharacterDraft`, `upsert-character`
- Produces: 제작·수정 폼, 실시간 미리보기, `draft`·`published` 저장 흐름

- [ ] **Step 1: 제작과 수정 흐름 실패 테스트 작성**

```tsx
it("입력한 캐릭터를 임시 저장하고 미리보기에 반영한다", async () => // 제작 흐름 검증
{ // 검증 시작
    const user = userEvent.setup(); // 사용자 생성
    renderWithApp(<CharacterEditor />); // 편집기 렌더
    await user.clear(screen.getByLabelText("캐릭터 이름")); // 이름 초기화
    await user.type(screen.getByLabelText("캐릭터 이름"), "밤 기차의 루미"); // 이름 입력
    await user.type(screen.getByLabelText("한 줄 소개"), "자정 열차의 안내자"); // 소개 입력
    await user.type(screen.getByLabelText("성격"), "차분하고 다정함"); // 성격 입력
    await user.type(screen.getByLabelText("첫 인사"), "어디까지 가고 싶어?"); // 인사 입력
    expect(screen.getByRole("heading", { name: "밤 기차의 루미" })).toBeVisible(); // 미리보기 확인
    await user.click(screen.getByRole("button", { name: "임시 저장" })); // 임시 저장
    expect(screen.getByRole("status")).toHaveTextContent("임시 저장했습니다."); // 저장 안내 확인
}); // 검증 종료

it("기존 캐릭터를 수정해 같은 식별자로 저장한다", async () => // 수정 흐름 검증
{ // 검증 시작
    const user = userEvent.setup(); // 사용자 생성
    renderWithApp(<CharacterEditor characterId="rian" />); // 수정 편집기 렌더
    const name = screen.getByLabelText("캐릭터 이름"); // 이름 입력 조회
    await user.clear(name); // 기존 이름 제거
    await user.type(name, "수정된 리안"); // 새 이름 입력
    await user.click(screen.getByRole("button", { name: "공개 저장" })); // 공개 저장
    expect(screen.getByRole("status")).toHaveTextContent("공개 저장했습니다."); // 저장 안내 확인
}); // 검증 종료
```

- [ ] **Step 2: 편집 컴포넌트 부재로 실패하는지 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/integration/character-editor.test.tsx`

Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: 공용 편집기와 미리보기 구현**

편집기는 기존 캐릭터가 있으면 필드를 채우고 없으면 빈 초안을 사용한다. 저장 시 정규화·검증 뒤 `upsert-character`를 전달하며 현재 프로필 ID와 이름을 제작자 정보로 사용한다. 새 ID는 `character-${Date.now()}` 형식으로 한 번 생성해 임시·공개 저장 간 유지한다.

`CharacterPreview`는 대표 이미지, 이름, 한 줄 소개, 태그, 첫 인사를 표시하고 비공개 프롬프트를 렌더링하지 않는다. CSS는 데스크톱 2열·모바일 단일 열, 고정 미리보기, 200ms 카드 등장, 44px 버튼, reduced-motion을 포함한다.

- [ ] **Step 4: 제작·수정 테스트와 타입 검사 통과 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/integration/character-editor.test.tsx && node node_modules/typescript/bin/tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: 전체 테스트 실행**

Run: `node node_modules/vitest/vitest.mjs run`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 편집기 커밋**

```powershell
git add src/features/character src/app/characters tests/integration/character-editor.test.tsx # 편집기 파일 추가
git commit -m "feat: add local character editor" # 편집기 커밋
```

---

### Task 4: 보관 토글과 보관함

**Files:**
- Modify: `src/features/character/CharacterDetail.tsx`
- Create: `src/features/library/LibraryScreen.tsx`
- Create: `src/features/library/LibraryScreen.module.css`
- Create: `src/app/library/page.tsx`
- Create: `tests/integration/library.test.tsx`
- Modify: `src/features/discovery/DiscoveryHome.tsx`

**Interfaces:**
- Consumes: 스키마 2 `AppState`, `toggle-bookmark`, `delete-character`, 제작·수정 경로
- Produces: 상세 보관 토글, 네 탭 보관함, 수정·삭제·대화 이동

- [ ] **Step 1: 보관과 삭제 흐름 실패 테스트 작성**

```tsx
it("상세 화면에서 보관한 캐릭터를 보관함에 표시한다", async () => // 보관 흐름 검증
{ // 검증 시작
    const user = userEvent.setup(); // 사용자 생성
    renderWithApp(<><CharacterDetail characterId="rian" /><LibraryScreen /></>); // 화면 렌더
    await user.click(screen.getByRole("button", { name: "보관함에 추가" })); // 보관 추가
    await user.click(screen.getByRole("tab", { name: "보관 캐릭터" })); // 보관 탭 이동
    expect(screen.getByRole("link", { name: /새벽 도서관의 리안/ })).toBeVisible(); // 보관 카드 확인
    expect(screen.getByRole("button", { name: "새벽 도서관의 리안 보관 해제" })).toBeVisible(); // 해제 버튼 확인
}); // 검증 종료

it("삭제 확인 뒤 제작 캐릭터와 연결 대화를 제거한다", async () => // 삭제 흐름 검증
{ // 검증 시작
    const user = userEvent.setup(); // 사용자 생성
    const state = createInitialState(); // 초기 상태 준비
    state.characters[0] = { ...state.characters[0], creatorId: state.profile.id }; // 내 캐릭터 적용
    renderWithApp(<LibraryScreen />, state); // 보관함 렌더
    await user.click(screen.getByRole("button", { name: /삭제/ })); // 삭제 시작
    await user.click(screen.getByRole("button", { name: "삭제 확인" })); // 삭제 승인
    expect(screen.queryByText("새벽 도서관의 리안")).toBeNull(); // 카드 제거 확인
}); // 검증 종료
```

- [ ] **Step 2: 보관함 모듈과 토글 동작 부재로 실패하는지 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/integration/library.test.tsx`

Expected: 모듈 부재 또는 보관 버튼 동작 부재로 FAIL.

- [ ] **Step 3: 상세 보관 토글과 보관함 구현**

보관함은 `role="tablist"`와 네 탭을 사용한다. 내 캐릭터는 `creatorId === profile.id && publicationStatus === "published"`, 임시 저장은 `creatorId === profile.id && publicationStatus === "draft"`, 보관 캐릭터는 `bookmarkedCharacterIds`, 진행 중인 대화는 `conversations`에서 계산한다.

삭제 대화상자는 캐릭터 이름과 연결 대화 삭제 사실을 표시한다. 상세 보관 버튼은 현재 상태에 따라 `보관함에 추가`와 `보관함에서 제거`로 이름을 바꾼다. 탐색 홈은 `published` 캐릭터만 표시한다.

- [ ] **Step 4: 보관함 테스트와 전체 테스트 통과 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/integration/library.test.tsx && node node_modules/vitest/vitest.mjs run`

Expected: 신규 테스트와 전체 테스트 PASS.

- [ ] **Step 5: 보관함 커밋**

```powershell
git add src/features/character/CharacterDetail.tsx src/features/library src/app/library src/features/discovery/DiscoveryHome.tsx tests/integration/library.test.tsx # 보관함 파일 추가
git commit -m "feat: add local character library" # 보관함 커밋
```

---

### Task 5: 저장 오류와 최종 화면 품질

**Files:**
- Modify: `src/features/core/AppProvider.tsx`
- Modify: `src/features/character/CharacterEditor.tsx`
- Modify: `src/features/character/CharacterEditor.module.css`
- Modify: `src/features/library/LibraryScreen.module.css`
- Create: `tests/integration/character-persistence.test.tsx`
- Modify: `tests/unit/app-smoke.test.tsx`

**Interfaces:**
- Consumes: `StorageWriteError`, 제작·수정·보관 흐름
- Produces: 저장 실패 알림, 새로고침 복원 검증, 최종 접근성·반응형 품질

- [ ] **Step 1: 저장 복원과 실패 상태 테스트 작성**

```tsx
it("저장한 캐릭터를 새 공급자에서 복원한다", async () => // 복원 검증
{ // 검증 시작
    const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
    const state = createInitialState(); // 초기 상태 준비
    const character = { ...state.characters[0], id: "local-lumi", creatorId: state.profile.id, name: "로컬 루미" }; // 로컬 캐릭터 생성
    gateway.save(appReducer(state, { type: "upsert-character", character })); // 캐릭터 저장
    expect(new LocalStorageGateway(localStorage).load().state.characters.some((item) => item.id === "local-lumi")).toBe(true); // 복원 확인
}); // 검증 종료
```

AppProvider 테스트에는 저장소가 `StorageWriteError`를 던질 때 앱이 중단되지 않고 `저장하지 못했습니다.` 라이브 알림을 표시하는 사례를 추가한다.

- [ ] **Step 2: 오류 알림 부재로 실패하는지 확인**

Run: `node node_modules/vitest/vitest.mjs run tests/integration/character-persistence.test.tsx tests/components/app-provider.test.tsx`

Expected: 저장 오류 UI 부재로 FAIL.

- [ ] **Step 3: 저장 오류 상태와 최종 연출 구현**

`AppProvider` 문맥에 `storageError: string | null`을 추가하고 저장 실패를 잡아 라이브 영역에 전달한다. 편집기와 보관함은 동일 오류를 상단 상태 영역에 표시한다. CSS는 포커스 표시, 빈 상태, 토스트, 확인 대화상자, 760px 단일 열, reduced-motion을 완성한다.

- [ ] **Step 4: 전체 품질 검증**

Run: `node node_modules/vitest/vitest.mjs run && node node_modules/typescript/bin/tsc --noEmit && node node_modules/eslint/bin/eslint.js . && node node_modules/next/dist/bin/next build`

Expected: 테스트, 타입 검사, ESLint, 프로덕션 빌드 모두 PASS.

- [ ] **Step 5: 최종 기능 커밋**

```powershell
git add src tests # 최종 변경 추가
git commit -m "feat: complete local character workflow" # 최종 커밋
```
