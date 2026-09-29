# Text-Play Game UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Text-Play를 중앙 장면 중심의 고정형 게임 UI로 재구성하고, 6개 저장 슬롯·세 가지 SVG 테마·EXE 창 해상도 설정을 제공한다.

**Architecture:** 게임 전용 환경 설정 공급자가 테마, 해상도, AI 표시 상태를 관리하고 웹과 데스크톱 플랫폼이 같은 화면 구조를 공유한다. 저장 슬롯은 기존 저장소 계약을 유지한 채 식별자 범위와 모달 UI만 확장하며, Tauri 창 API는 데스크톱 플랫폼 경계 안에서만 호출한다.

**Tech Stack:** React 19, TypeScript 5.9, CSS Modules, Vitest, Testing Library, Playwright, Tauri 2, 코드 기반 SVG

**Spec:** `docs/superpowers/specs/2026-09-29-text-play-game-ui-redesign-design.md`

---
## Global Constraints

- 모든 TypeScript와 Rust 블록은 Allman 스타일을 사용한다.
- 새 코드의 각 줄에는 초보자가 이해할 수 있는 짧은 한글 명사형 주석을 작성한다.
- 외부 네트워크 연결과 실제 로컬 GPU 모델 연결은 추가하지 않는다.
- 배포 CSP의 `connect-src 'none'`을 유지한다.
- 벡터 장식은 코드 기반 SVG만 사용한다.
- 기존 자동 저장과 수동 저장 1~3번 데이터는 그대로 읽을 수 있어야 한다.
- 1280×720 이상의 데스크톱에서는 문서 전체 세로 스크롤을 만들지 않는다.

---
## Review Focus

- 손상되거나 이전 버전인 환경 설정은 기본값으로 복구되어야 한다. Task 1의 환경 설정 복구 테스트로 고정한다.
- 화면보다 큰 고정 해상도는 사용 가능한 화면 크기로 제한되어야 한다. Task 2의 크기 제한 테스트로 고정한다.
- 이전 수동 슬롯 1~3번과 새 슬롯 4~6번을 같은 저장소에서 읽어야 한다. Task 3의 슬롯 호환성 테스트로 고정한다.
- 모달이 연속으로 열리거나 `Esc`로 닫힐 때 초점과 배경 조작 상태가 깨지지 않아야 한다. Task 4의 모달 상호작용 테스트로 고정한다.
- 기록과 선택지가 길어져도 장면 무대가 화면 밖으로 밀리지 않아야 한다. Task 5의 넘침 배치 테스트와 Task 6의 1280×720 E2E로 고정한다.

---
## 파일 구조

- `src/features/text-play/preferences/text-play-preferences.ts`: 환경 설정 타입, 기본값, 검증, 저장소 함수
- `src/features/text-play/preferences/TextPlayPreferencesProvider.tsx`: 환경 설정 상태와 적용 문맥
- `src/features/text-play/ui/TextPlaySettingsDialog.tsx`: 테마, 해상도, AI 선택 UI
- `src/features/text-play/ui/TextPlayDialog.tsx`: 공통 모달 접근성 동작
- `src/features/text-play/ui/TextPlayIcons.tsx`: 공용 SVG 아이콘과 테마 장식
- `src/features/text-play/ui/SaveManager.tsx`: 6개 슬롯 저장·불러오기 모달 내용
- `src/features/text-play/ui/TextPlayScreen.tsx`: 상단바, 장면 무대, 스토리 상자, 명령 도크 조립
- `src/features/text-play/ui/TextPlayScreen.module.css`: 고정형 화면, 반응형 배치, 테마 변수
- `src/features/text-play/platform/text-play-platform.tsx`: 창 해상도 적용 플랫폼 계약
- `src/desktop/DesktopPlatformProvider.tsx`: Tauri 창 크기 적용
- `src/features/text-play/platform/NextTextPlayPlatformProvider.tsx`: 웹 해상도 적용 무시
- `src/features/text-play/core/types.ts`: 수동 슬롯 4~6번 식별자 추가
- `src/features/text-play/storage/save-repository.ts`: 확장 슬롯 검증
- `src-tauri/capabilities/default.toml`: 창 크기와 중앙 이동 최소 권한

---
### Task 1: 게임 환경 설정 계약과 영속성

**Files:**
- Create: `src/features/text-play/preferences/text-play-preferences.ts`
- Create: `src/features/text-play/preferences/TextPlayPreferencesProvider.tsx`
- Create: `tests/unit/text-play-preferences.test.ts`
- Modify: `src/app/text-play/demo/page.tsx`
- Modify: `src/desktop/DesktopApp.tsx`

**Interfaces:**
- Produces: `TextPlayThemeId`, `TextPlayResolutionId`, `TextPlayAIProviderId`, `TextPlayPreferences`
- Produces: `DEFAULT_TEXT_PLAY_PREFERENCES`, `loadTextPlayPreferences(storage)`, `saveTextPlayPreferences(storage, value)`
- Produces: `TextPlayPreferencesProvider`, `useTextPlayPreferences()`

- [ ] **Step 1: 손상 값과 정상 값의 실패 테스트 작성**

```ts
it("손상된 환경 설정을 기본값으로 복구한다", () => // 손상 복구 검증
{ // 테스트 시작
    expect(loadTextPlayPreferences(createStorage("broken"))).toEqual(DEFAULT_TEXT_PLAY_PREFERENCES); // 기본값 확인
}); // 테스트 종료
```

- [ ] **Step 2: 단위 테스트 실패 확인**

Run: `pnpm vitest run tests/unit/text-play-preferences.test.ts`

Expected: `text-play-preferences` 모듈이 없어 실패

- [ ] **Step 3: 타입, 버전 1 검증, 저장과 공급자 구현**

기본값은 `dark-fantasy`, `fit`, `mock`으로 고정한다. 저장 키는 `mate.text-play.preferences.v1`을 사용한다.

- [ ] **Step 4: 웹과 데스크톱 진입점에 공급자 연결**

웹과 EXE가 같은 환경 설정을 사용하되 각 실행 환경의 `localStorage`에 독립적으로 저장되게 한다.

- [ ] **Step 5: 단위 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/text-play-preferences.test.ts`

Expected: PASS

- [ ] **Step 6: 환경 설정 기반 코드 커밋**

Run: `git add src/features/text-play/preferences src/app/text-play/demo/page.tsx src/desktop/DesktopApp.tsx tests/unit/text-play-preferences.test.ts && git commit -m "feat: add text play preferences"`

---
### Task 2: EXE 창 해상도 적용 경계

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/features/text-play/platform/text-play-platform.tsx`
- Modify: `src/desktop/DesktopPlatformProvider.tsx`
- Modify: `src/features/text-play/platform/NextTextPlayPlatformProvider.tsx`
- Modify: `src-tauri/capabilities/default.toml`
- Modify: `tests/unit/text-play-platform.test.tsx`
- Modify: `tests/unit/tauri-config.test.ts`

**Interfaces:**
- Consumes: `TextPlayResolutionId` from Task 1
- Produces: `TextPlayPlatform.applyWindowResolution(resolutionId): Promise<void>`
- Produces: `resolveWindowSize(resolutionId, availableWidth, availableHeight): { width: number; height: number } | "maximize"`

- [ ] **Step 1: 화면 제한과 웹 무동작 실패 테스트 작성**

```ts
it("고정 해상도를 사용 가능한 화면 안으로 제한한다", () => // 화면 제한 검증
{ // 테스트 시작
    expect(resolveWindowSize("1920x1080", 1366, 728)).toEqual({ width: 1366, height: 728 }); // 제한 크기 확인
}); // 테스트 종료
```

- [ ] **Step 2: 플랫폼 테스트 실패 확인**

Run: `pnpm vitest run tests/unit/text-play-platform.test.tsx tests/unit/tauri-config.test.ts`

Expected: 새 해상도 계약과 권한이 없어 실패

- [ ] **Step 3: `@tauri-apps/api`와 최소 창 권한 추가**

`core:window:allow-set-size`, `core:window:allow-center`, `core:window:allow-maximize`, `core:window:allow-unmaximize`만 추가하고 네트워크 권한은 추가하지 않는다.

- [ ] **Step 4: 데스크톱 적용과 웹 무동작 구현**

고정 해상도는 `LogicalSize`와 `center()`를 사용한다. `fit`은 `maximize()`를 사용한다. 웹 공급자는 완료된 Promise만 반환한다.

- [ ] **Step 5: 플랫폼과 Tauri 설정 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/text-play-platform.test.tsx tests/unit/tauri-config.test.ts`

Expected: PASS

- [ ] **Step 6: 창 해상도 경계 커밋**

Run: `git add package.json pnpm-lock.yaml src/features/text-play/platform src/desktop/DesktopPlatformProvider.tsx src-tauri/capabilities/default.toml tests/unit/text-play-platform.test.tsx tests/unit/tauri-config.test.ts && git commit -m "feat: apply desktop window resolution"`

---
### Task 3: 6개 저장 슬롯과 저장·불러오기 모달

**Files:**
- Modify: `src/features/text-play/core/types.ts`
- Modify: `src/features/text-play/storage/save-repository.ts`
- Modify: `src/features/text-play/ui/SaveManager.tsx`
- Create: `src/features/text-play/ui/TextPlayDialog.tsx`
- Modify: `tests/unit/text-play-save-repository.test.ts`
- Modify: `tests/integration/text-play-save-flow.test.tsx`

**Interfaces:**
- Produces: `TextPlaySlotId`에 `manual-4`, `manual-5`, `manual-6` 추가
- Produces: `SaveManager({ mode, open, onClose })`의 `mode`는 `"save" | "load"`
- Produces: `TextPlayDialog({ labelledBy, open, onClose, children })`

- [ ] **Step 1: 6개 슬롯과 모달 모드 실패 테스트 작성**

```ts
it("저장 모달에 수동 슬롯 여섯 개를 표시한다", async () => // 슬롯 개수 검증
{ // 테스트 시작
    expect(screen.getAllByRole("group", { name: /수동 저장 슬롯/u })).toHaveLength(6); // 여섯 슬롯 확인
}); // 테스트 종료
```

- [ ] **Step 2: 저장 흐름 테스트 실패 확인**

Run: `pnpm vitest run tests/unit/text-play-save-repository.test.ts tests/integration/text-play-save-flow.test.tsx`

Expected: 슬롯 4~6번 검증과 모달 UI가 없어 실패

- [ ] **Step 3: 슬롯 타입과 저장 검증 확장**

기존 슬롯 키와 저장 객체 구조는 바꾸지 않고 허용 식별자만 확장한다.

- [ ] **Step 4: 접근 가능한 공통 모달과 저장 관리자 구현**

저장과 불러오기 모드를 분리하고, `Esc`, 닫기 버튼, 배경 클릭, 첫 버튼 초점 이동을 구현한다.

- [ ] **Step 5: 저장 흐름 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/text-play-save-repository.test.ts tests/integration/text-play-save-flow.test.tsx`

Expected: PASS

- [ ] **Step 6: 저장 슬롯 확장 커밋**

Run: `git add src/features/text-play/core/types.ts src/features/text-play/storage/save-repository.ts src/features/text-play/ui/SaveManager.tsx src/features/text-play/ui/TextPlayDialog.tsx tests/unit/text-play-save-repository.test.ts tests/integration/text-play-save-flow.test.tsx && git commit -m "feat: add six-slot save dialog"`

---
### Task 4: 세 가지 SVG 테마와 설정 모달

**Files:**
- Create: `src/features/text-play/ui/TextPlayIcons.tsx`
- Create: `src/features/text-play/ui/TextPlaySettingsDialog.tsx`
- Modify: `src/features/text-play/ui/TextPlayScreen.module.css`
- Create: `tests/components/text-play-settings-dialog.test.tsx`

**Interfaces:**
- Consumes: `useTextPlayPreferences()` from Task 1
- Consumes: `TextPlayPlatform.applyWindowResolution()` from Task 2
- Consumes: `TextPlayDialog` from Task 3
- Produces: `TextPlayIcon({ name })`, `TextPlayFrameDecoration()`
- Produces: `TextPlaySettingsDialog({ open, onClose })`

- [ ] **Step 1: 테마 저장, 해상도 적용, 비활성 AI 실패 테스트 작성**

```ts
it("테마를 바꾸고 로컬 GPU 항목은 비활성 상태로 둔다", async () => // 설정 동작 검증
{ // 테스트 시작
    expect(screen.getByRole("option", { name: /로컬 GPU/u })).toBeDisabled(); // 로컬 항목 확인
}); // 테스트 종료
```

- [ ] **Step 2: 설정 모달 테스트 실패 확인**

Run: `pnpm vitest run tests/components/text-play-settings-dialog.test.tsx`

Expected: 설정 모달과 SVG 아이콘이 없어 실패

- [ ] **Step 3: 의미를 가진 SVG 아이콘과 장식 구현**

장식 SVG는 `aria-hidden="true"`를 사용하고, 기능 버튼은 별도 텍스트 또는 `aria-label`을 유지한다.

- [ ] **Step 4: 테마와 해상도 설정 모달 구현**

세 테마와 네 해상도를 즉시 반영하고 저장한다. AI 선택에는 Mock AI와 비활성 로컬 GPU 항목을 표시한다.

- [ ] **Step 5: 설정 모달 테스트 통과 확인**

Run: `pnpm vitest run tests/components/text-play-settings-dialog.test.tsx`

Expected: PASS

- [ ] **Step 6: 테마와 설정 모달 커밋**

Run: `git add src/features/text-play/ui/TextPlayIcons.tsx src/features/text-play/ui/TextPlaySettingsDialog.tsx src/features/text-play/ui/TextPlayScreen.module.css tests/components/text-play-settings-dialog.test.tsx && git commit -m "feat: add selectable text play themes"`

---
### Task 5: 플레이 화면 고정형 재배치

**Files:**
- Modify: `src/features/text-play/ui/TextPlayScreen.tsx`
- Modify: `src/features/text-play/ui/TextPlayScreen.module.css`
- Modify: `src/features/text-play/ui/ChoiceList.tsx`
- Modify: `src/features/text-play/ui/StoryLog.tsx`
- Modify: `src/features/text-play/ui/StatusPanel.tsx`
- Modify: `src/desktop/desktop.css`
- Modify: `tests/components/text-play-screen.test.tsx`

**Interfaces:**
- Consumes: `SaveManager`, `TextPlaySettingsDialog`, SVG 아이콘, 환경 설정 문맥
- Produces: 상단바, 장면 무대, 반투명 스토리 상자, 추천 답안 도크, 직접 입력 도크

- [ ] **Step 1: 새 화면 구조와 상호작용 실패 테스트 작성**

```ts
it("상단바와 장면 무대와 추천 답안 도크를 제공한다", () => // 화면 구조 검증
{ // 테스트 시작
    expect(screen.getByRole("region", { name: "추천 답안" })).toBeInTheDocument(); // 추천 영역 확인
}); // 테스트 종료
```

- [ ] **Step 2: 컴포넌트 테스트 실패 확인**

Run: `pnpm vitest run tests/components/text-play-screen.test.tsx`

Expected: 새 영역 이름과 모달 버튼이 없어 실패

- [ ] **Step 3: 화면 컴포넌트 구조 재배치**

작품 제목은 버튼으로 만들고 홈 이동을 연결한다. 상태 칩은 상태 팝업을, 저장과 불러오기는 각 모드의 저장 모달을 연다.

- [ ] **Step 4: 고정형 CSS와 반응형 전환 구현**

데스크톱은 `100dvh` 안에서 배치하고 장면·스토리·추천 영역에만 필요한 내부 스크롤을 둔다. 959px 이하에서는 명령 도크를 아래로 이동한다.

- [ ] **Step 5: 컴포넌트 테스트 통과 확인**

Run: `pnpm vitest run tests/components/text-play-screen.test.tsx`

Expected: PASS

- [ ] **Step 6: 플레이 화면 재배치 커밋**

Run: `git add src/features/text-play/ui src/desktop/desktop.css tests/components/text-play-screen.test.tsx && git commit -m "feat: redesign text play game screen"`

---
### Task 6: 통합 검증과 EXE 회귀 확인

**Files:**
- Modify: `tests/integration/desktop-app.test.tsx`
- Modify: `tests/e2e/desktop-preview.spec.ts`
- Modify: `docs/text-play-preview-guide.md`

**Interfaces:**
- Consumes: Task 1~5의 완성된 화면과 플랫폼 계약
- Produces: 1280×720 회귀 시나리오와 사용자 안내

- [ ] **Step 1: 1280×720 화면과 전체 사용자 흐름 E2E 추가**

검증 순서는 새 게임 시작, 테마 전환, 해상도 선택, 슬롯 6 저장, 진행, 불러오기, 홈 복귀다. `document.documentElement.scrollHeight <= window.innerHeight`도 확인한다.

- [ ] **Step 2: 관련 통합 테스트 실행**

Run: `pnpm vitest run tests/integration/desktop-app.test.tsx tests/integration/text-play-save-flow.test.tsx tests/integration/settings-screen.test.tsx`

Expected: PASS

- [ ] **Step 3: 전체 정적 검증 실행**

Run: `pnpm lint && pnpm typecheck && pnpm test:run && pnpm desktop:build && pnpm tauri:check`

Expected: 모든 명령 PASS

- [ ] **Step 4: 데스크톱 E2E 실행**

Run: `pnpm test:e2e:desktop`

Expected: 새 고정형 화면과 저장·불러오기 흐름 PASS

- [ ] **Step 5: 사용 안내 갱신**

세 테마, 네 해상도, 6개 슬롯, Mock AI와 비활성 로컬 GPU 표시를 문서에 기록한다.

- [ ] **Step 6: 최종 회귀 결과 커밋**

Run: `git add tests docs/text-play-preview-guide.md && git commit -m "test: verify redesigned text play ui"`
