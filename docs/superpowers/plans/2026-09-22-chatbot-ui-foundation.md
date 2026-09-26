# AI 캐릭터·스토리 채팅 UI 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 유료 API 없이 탐색, 캐릭터 상세, Mock 채팅, 캐릭터 제작, 내 작품, 설정을 체험할 수 있는 반응형 Next.js 서비스를 구현한다.

**Architecture:** Next.js App Router의 얇은 경로 컴포넌트 아래에 기능별 컴포넌트와 순수 도메인 로직을 둔다. React Context와 `useReducer`가 앱 상태를 관리하고, Repository와 Adapter 인터페이스가 `localStorage` 및 Mock 공급자를 감춰 이후 Supabase와 실제 AI 공급자로 교체할 수 있게 한다.

**Tech Stack:** Node.js 20.9 이상, Next.js App Router, React, TypeScript, CSS Modules, Vitest, React Testing Library, Playwright, npm

**Spec:** `docs/superpowers/specs/2026-09-22-chatbot-ui-foundation-design.md`

## Global Constraints

- 실제 OpenAI, Anthropic, 이미지 생성, Supabase, 결제 API 요청을 만들지 않는다.
- 기본 공급자는 항상 `mock`이며 실제 공급자 활성화 기본값은 `false`다.
- 비밀키를 브라우저 번들, 샘플 데이터, 커밋에 포함하지 않는다.
- API 키 없이 모든 화면과 테스트가 실행되어야 한다.
- 상태는 React Context, `useReducer`, Repository 인터페이스로 관리한다.
- 초기 영속 저장소는 브라우저 `localStorage`다.
- 데스크톱 기본값은 왼쪽 패널 열림, 오른쪽 패널 닫힘이다.
- 모바일 기본값은 양쪽 서랍 닫힘이며 한 번에 하나만 열 수 있다.
- 모바일·태블릿·모니터별 세 개씩 총 아홉 개 채팅 레이아웃을 제공한다.
- 경쟁 서비스의 로고, 이미지, 문구, 고유 아이콘을 복제하지 않는다.
- 런타임 화면에서 외부 폰트, 외부 이미지, CDN 자산을 불러오지 않는다.
- TypeScript 빌드 오류를 무시하는 설정을 사용하지 않는다.
- 모든 구현은 Allman 스타일과 각 코드 줄의 짧은 한글 명사형 주석 규칙을 따른다.

## Review Focus

- 손상되거나 이전 버전인 로컬 저장 데이터가 들어오면 원본을 백업하고 안전한 초기 상태 또는 마이그레이션 결과를 반환하는지 검증한다.
- 좁은 데스크톱에서 양쪽 패널을 열어도 중앙 콘텐츠가 잘리지 않고 오른쪽 패널이 오버레이로 전환되는지 검증한다.
- 전송 버튼을 빠르게 두 번 눌러도 사용자 메시지와 Mock 응답이 중복되지 않고 순서가 유지되는지 검증한다.
- 토큰 잔액이 부족할 때 메시지, 관계, 장면, 지갑이 하나도 변경되지 않는지 검증한다.
- Mock 모드에서 `fetch`, `XMLHttpRequest`, `WebSocket`을 통한 외부 AI·데이터·결제 요청이 발생하지 않는지 검증한다.

---

## File Structure

```text
ChatBot/
├─ prototype/
│  ├─ Main.html
│  └─ main.test.mjs
├─ public/
│  └─ images/scenes/
│     ├─ dawn-letter.svg
│     ├─ rainy-classroom.svg
│     ├─ moon-library.svg
│     └─ fallback-scene.svg
├─ src/
│  ├─ app/
│  │  ├─ characters/[id]/edit/page.tsx
│  │  ├─ characters/[id]/page.tsx
│  │  ├─ characters/new/page.tsx
│  │  ├─ chat/[characterId]/page.tsx
│  │  ├─ library/page.tsx
│  │  ├─ settings/page.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ test/
│  │  ├─ chat-fixtures.ts
│  │  ├─ render-with-app.tsx
│  │  └─ setup.ts
│  ├─ components/app-shell/
│  │  ├─ AppHeader.tsx
│  │  ├─ AppShell.module.css
│  │  ├─ AppShell.tsx
│  │  ├─ ConversationPanel.tsx
│  │  ├─ MobileBottomNavigation.tsx
│  │  └─ UserPanel.tsx
│  ├─ features/character/
│  │  ├─ CharacterDetail.tsx
│  │  ├─ CharacterEditor.tsx
│  │  ├─ CharacterPreview.tsx
│  │  └─ character-validation.ts
│  ├─ features/chat/
│  │  ├─ ChatComposer.tsx
│  │  ├─ ChatScreen.module.css
│  │  ├─ ChatScreen.tsx
│  │  ├─ LayoutSelector.tsx
│  │  ├─ MessageList.tsx
│  │  ├─ SceneViewer.tsx
│  │  ├─ chat-controller.ts
│  │  └─ layout-resolver.ts
│  ├─ features/core/
│  │  ├─ AppProvider.tsx
│  │  ├─ app-reducer.ts
│  │  ├─ initial-state.ts
│  │  └─ types.ts
│  ├─ features/discovery/
│  │  ├─ CategoryFilter.tsx
│  │  ├─ CharacterCard.tsx
│  │  ├─ CharacterRail.tsx
│  │  ├─ DiscoveryHome.module.css
│  │  ├─ DiscoveryHome.tsx
│  │  └─ FeaturedCharacter.tsx
│  ├─ features/library/
│  │  └─ LibraryScreen.tsx
│  ├─ features/settings/
│  │  ├─ LocalDataControls.tsx
│  │  ├─ NotificationSettings.tsx
│  │  └─ SettingsScreen.tsx
│  ├─ lib/adapters/
│  │  ├─ image-generation-adapter.ts
│  │  ├─ llm-adapter.ts
│  │  ├─ mock-image-adapter.ts
│  │  └─ mock-llm-adapter.ts
│  ├─ lib/repositories/
│  │  ├─ local-storage-gateway.ts
│  │  ├─ repositories.ts
│  │  └─ repository-provider.ts
│  ├─ lib/story/
│  │  ├─ story-engine.ts
│  │  └─ token-policy.ts
│  └─ mocks/fixtures.ts
├─ tests/
│  ├─ components/
│  ├─ e2e/
│  ├─ integration/
│  └─ unit/
├─ .env.example
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ playwright.config.ts
├─ tsconfig.json
└─ vitest.config.mts
```

`src/app`는 경로 조립만 담당하고, 도메인 로직은 `features`와 `lib`에 둔다.

`components/app-shell`은 모든 주요 페이지에서 공유하는 좌우 패널과 상단·하단 탐색만 담당한다.

`lib/adapters`와 `lib/repositories`는 외부 공급자와 저장 방식을 교체하는 경계다.

---

### Task 1: Next.js 기반과 테스트 하네스

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.mts`
- Create: `src/test/setup.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Test: `tests/unit/app-smoke.test.tsx`

**Interfaces:**
- Consumes: 승인된 설계 명세와 Node.js 20.9 이상 실행 환경
- Produces: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:e2e`, `npm run build`

- [ ] **Step 1: 런타임 버전 확인**

```powershell
node --version # 노드 버전 확인
npm --version # 패키지 관리자 확인
```

Expected: Node.js `20.9.0` 이상과 npm 버전 출력.

- [ ] **Step 2: npm 프로젝트와 런타임 의존성 구성**

```powershell
npm init -y # 패키지 파일 생성
npm install next@latest react@latest react-dom@latest # 앱 의존성 설치
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths @playwright/test # 테스트 의존성 설치
npm pkg set scripts.dev="next dev" # 개발 명령 등록
npm pkg set scripts.build="next build" # 빌드 명령 등록
npm pkg set scripts.start="next start" # 실행 명령 등록
npm pkg set scripts.lint="eslint ." # 린트 명령 등록
npm pkg set scripts.typecheck="tsc --noEmit" # 타입 검사 등록
npm pkg set scripts.test="vitest" # 감시 테스트 등록
npm pkg set scripts.test:run="vitest run" # 단발 테스트 등록
npm pkg set scripts.test:e2e="playwright test" # 종단 테스트 등록
```

Expected: `package-lock.json` 생성과 설치 성공.

- [ ] **Step 3: 실패하는 앱 스모크 테스트 작성**

```tsx
import { render, screen } from "@testing-library/react"; // 렌더링 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import Page from "@/app/page"; // 홈 화면 대상

describe("홈 화면", () => // 홈 화면 묶음
{ // 묶음 시작
    it("서비스 제목을 표시한다", () => // 제목 검증
    { // 검증 시작
        render(<Page />); // 홈 화면 렌더링
        expect(screen.getByRole("heading", { name: "MATE:VERSE" })).toBeInTheDocument(); // 제목 존재 확인
    }); // 검증 종료
}); // 묶음 종료
```

- [ ] **Step 4: 테스트 실패 확인**

```powershell
npm run test:run -- tests/unit/app-smoke.test.tsx # 스모크 테스트 실행
```

Expected: `@/app/page` 또는 대상 제목 부재로 FAIL.

- [ ] **Step 5: 최소 루트 레이아웃과 홈 화면 작성**

```tsx
export default function Page() // 홈 화면 함수
{ // 함수 시작
    return <h1>MATE:VERSE</h1>; // 서비스 제목 반환
} // 함수 종료
```

`layout.tsx`는 `lang="ko"`, 전역 CSS, `AppProvider`를 위한 자리를 포함한다. `next.config.ts`는 `typedRoutes: true`만 활성화하며 타입 오류 무시 옵션을 넣지 않는다. Vitest는 `jsdom`, `vite-tsconfig-paths`, React 플러그인과 `src/test/setup.ts`를 사용한다. Playwright는 `http://127.0.0.1:3000`을 기본 URL로 하고 `npm run dev`를 `webServer`로 실행한다.

`.env.example`은 다음 비과금 기본값만 포함한다.

```dotenv
NEXT_PUBLIC_PROVIDER_MODE=mock # 공개 Mock 공급자 설정
ENABLE_REAL_PROVIDERS=false # 실제 공급자 비활성화
```

전역 CSS는 운영체제 기본 글꼴 묶음을 사용하며 외부 폰트를 가져오지 않는다. `.gitignore`는 `node_modules`, `.next`, 테스트 보고서, 실제 `.env` 파일을 제외하고 `.env.example`은 추적한다.

- [ ] **Step 6: 기본 검증 실행**

```powershell
npm run test:run -- tests/unit/app-smoke.test.tsx # 스모크 테스트 재실행
npm run typecheck # 타입 검사 실행
npm run lint # 린트 실행
```

Expected: 세 명령 모두 PASS.

- [ ] **Step 7: 기반 커밋**

```powershell
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.mts playwright.config.ts .env.example .gitignore src/app src/test tests/unit/app-smoke.test.tsx # 기반 파일 스테이징
git commit -m "chore: scaffold Next.js test foundation" # 기반 커밋 생성
```

---

### Task 2: 승인된 정적 `Main.html` 목업

**Files:**
- Create: `prototype/Main.html`
- Test: `prototype/main.test.mjs`

**Interfaces:**
- Consumes: 승인된 탐색 홈, 좌우 패널, 모바일 서랍 설계
- Produces: 브라우저에서 단독 실행되는 `prototype/Main.html`

- [ ] **Step 1: 실패하는 정적 구조 테스트 작성**

```javascript
import assert from "node:assert/strict"; // 단언 도구
import { readFile } from "node:fs/promises"; // 파일 읽기
import test from "node:test"; // 테스트 도구

const htmlPath = new URL("./Main.html", import.meta.url); // 목업 경로

test("필수 패널과 외부 요청 차단 상태를 포함한다", async () => // 구조 검증
{ // 검증 시작
    const html = await readFile(htmlPath, "utf8"); // 목업 읽기
    assert.match(html, /id="conversation-panel"/); // 왼쪽 패널 확인
    assert.match(html, /id="user-panel"/); // 오른쪽 패널 확인
    assert.match(html, /id="mobile-navigation"/); // 모바일 메뉴 확인
    assert.doesNotMatch(html, /fetch\s*\(/); // 네트워크 호출 차단
    assert.doesNotMatch(html, /XMLHttpRequest/); // 요청 객체 차단
    assert.doesNotMatch(html, /WebSocket/); // 소켓 호출 차단
}); // 검증 종료
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
node --test prototype/main.test.mjs # 목업 구조 테스트 실행
```

Expected: `Main.html` 부재로 FAIL.

- [ ] **Step 3: 정적 목업 구현**

`Main.html`에 다음 ID와 동작을 정확히 포함한다.

- `conversation-panel`: 최근 대화방, 새 캐릭터, 대화 정리, 보관함
- `conversation-toggle`: 데스크톱 왼쪽 패널 토글
- `user-panel`: 프로필, 멤버십, 가상 토큰, 이미지 횟수, 설정, 로그아웃
- `user-toggle`: 데스크톱 오른쪽 패널 토글
- `featured-character`: 추천 캐릭터 배너
- `character-grid`: 캐릭터 카드 목록
- `mobile-navigation`: 홈, 발견, 만들기, 대화, 내 정보
- `mobile-scrim`: 모바일 서랍 배경

초기 상태는 데스크톱에서 왼쪽 열림·오른쪽 닫힘, 760px 이하에서 양쪽 닫힘이다. 패널 토글은 `aria-expanded`를 갱신하며 모바일 서랍은 상호 배타적으로 동작한다. 캐릭터 카드는 자체 그라데이션 대체 이미지를 사용한다.

핵심 토글 함수는 다음 계약을 따른다.

```javascript
function setPanel(side, open) // 패널 상태 함수
{ // 함수 시작
    const app = document.getElementById("app-shell"); // 앱 셸 탐색
    const button = document.getElementById(`${side}-toggle`); // 토글 버튼 탐색
    app.dataset[`${side}Open`] = String(open); // 열림 상태 저장
    button.setAttribute("aria-expanded", String(open)); // 접근성 상태 갱신
} // 함수 종료
```

- [ ] **Step 4: 정적 목업 검증**

```powershell
node --test prototype/main.test.mjs # 목업 구조 테스트 재실행
```

Expected: PASS.

- [ ] **Step 5: 목업 커밋**

```powershell
git add prototype/Main.html prototype/main.test.mjs # 목업 파일 스테이징
git commit -m "feat: add interactive Main prototype" # 목업 커밋 생성
```

---

### Task 3: 도메인 타입과 Mock 데이터

**Files:**
- Create: `src/features/core/types.ts`
- Create: `src/features/core/initial-state.ts`
- Create: `src/mocks/fixtures.ts`
- Create: `public/images/scenes/dawn-letter.svg`
- Create: `public/images/scenes/rainy-classroom.svg`
- Create: `public/images/scenes/moon-library.svg`
- Create: `public/images/scenes/fallback-scene.svg`
- Test: `tests/unit/fixtures.test.ts`

**Interfaces:**
- Consumes: 설계 명세의 `UserProfile`, `Character`, `Conversation`, `Message`, `TokenWallet`, `AppSettings`
- Produces: `AppState`, `createInitialState(): AppState`, `mockCharacters`, `mockConversations`, `mockMessages`, `validCharacterDraft`

- [ ] **Step 1: 실패하는 초기 상태 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 함수

describe("초기 앱 상태", () => // 초기 상태 묶음
{ // 묶음 시작
    it("스키마 버전과 Mock 공급자를 고정한다", () => // 기본값 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        expect(state.schemaVersion).toBe(1); // 스키마 버전 확인
        expect(state.providerMode).toBe("mock"); // Mock 공급자 확인
        expect(state.settings.leftPanelOpen).toBe(true); // 왼쪽 패널 확인
        expect(state.settings.rightPanelOpen).toBe(false); // 오른쪽 패널 확인
        expect(state.characters.length).toBeGreaterThanOrEqual(6); // 캐릭터 수 확인
    }); // 검증 종료
}); // 묶음 종료
```

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/unit/fixtures.test.ts # 초기 상태 테스트 실행
```

Expected: 대상 모듈 부재로 FAIL.

- [ ] **Step 3: 타입과 초기 상태 구현**

`types.ts`는 다음 핵심 합성 타입을 제공한다.

```typescript
export type ProviderMode = "mock"; // 공급자 모드
export type MessageRole = "user" | "assistant" | "system"; // 메시지 역할
export type PlatformMode = "auto" | "mobile" | "tablet" | "desktop"; // 플랫폼 모드
export type LayoutId = "M1" | "M2" | "M3" | "T1" | "T2" | "T3" | "D1" | "D2" | "D3"; // 레이아웃 식별자

export interface AppState // 앱 상태 구조
{ // 구조 시작
    schemaVersion: 1; // 스키마 버전
    providerMode: ProviderMode; // 공급자 설정
    profile: UserProfile; // 사용자 프로필
    characters: Character[]; // 캐릭터 목록
    conversations: Conversation[]; // 대화방 목록
    messages: Message[]; // 메시지 목록
    wallet: TokenWallet; // 토큰 지갑
    settings: AppSettings; // 사용자 설정
    selectedConversationId: string | null; // 선택 대화방
} // 구조 종료
```

Mock 데이터는 자체 이름과 문구만 사용하고 여섯 개 이상의 캐릭터, 세 개 이상의 대화방, 각 대화방의 메시지를 포함한다. 초기 지갑 잔액은 1,240으로 고정한다. `validCharacterDraft`는 모든 필수값과 80자 이하 소개를 가진 제작 테스트 기준값이다. SVG는 추상 장면과 제목만 포함한 자체 제작 대체 이미지로 구성한다.

- [ ] **Step 4: 초기 상태 검증**

```powershell
npm run test:run -- tests/unit/fixtures.test.ts # 초기 상태 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 도메인 커밋**

```powershell
git add src/features/core src/mocks public/images/scenes tests/unit/fixtures.test.ts # 도메인 파일 스테이징
git commit -m "feat: define mock chatbot domain" # 도메인 커밋 생성
```

---

### Task 4: 로컬 Repository와 데이터 복구

**Files:**
- Create: `src/lib/repositories/local-storage-gateway.ts`
- Create: `src/lib/repositories/repositories.ts`
- Create: `src/lib/repositories/repository-provider.ts`
- Test: `tests/unit/local-storage-gateway.test.ts`

**Interfaces:**
- Consumes: `AppState`, `createInitialState()`
- Produces: `LocalStorageGateway.load(): LoadResult`, `save(state: AppState): void`, `exportJson(): string`, `reset(): AppState`

- [ ] **Step 1: 실패하는 손상 데이터 복구 테스트 작성**

```typescript
import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { LocalStorageGateway } from "@/lib/repositories/local-storage-gateway"; // 저장소 대상

describe("로컬 저장소", () => // 저장소 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        localStorage.clear(); // 저장 데이터 제거
    }); // 초기화 종료

    it("손상된 원본을 백업하고 초기 상태를 반환한다", () => // 손상 복구 검증
    { // 검증 시작
        localStorage.setItem("mateverse:v1:state", "{broken"); // 손상 데이터 저장
        const gateway = new LocalStorageGateway(localStorage); // 저장소 생성
        const result = gateway.load(); // 데이터 읽기
        expect(result.recovered).toBe(true); // 복구 상태 확인
        expect(result.state.schemaVersion).toBe(1); // 초기 상태 확인
        expect(localStorage.getItem("mateverse:v1:backup")).toBe("{broken"); // 원본 백업 확인
    }); // 검증 종료
}); // 묶음 종료
```

정상 저장·불러오기, 스키마 버전 0의 버전 1 마이그레이션, 저장공간 예외, 내보내기, 사용자 확인 뒤 초기화 테스트도 같은 파일에 작성한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/unit/local-storage-gateway.test.ts # 저장소 테스트 실행
```

Expected: `LocalStorageGateway` 부재로 FAIL.

- [ ] **Step 3: 저장소 구현**

```typescript
export interface LoadResult // 읽기 결과 구조
{ // 구조 시작
    state: AppState; // 복원 상태
    recovered: boolean; // 복구 여부
    warning: string | null; // 경고 문구
} // 구조 종료

export class LocalStorageGateway // 로컬 저장소 클래스
{ // 클래스 시작
    public constructor(private readonly storage: Storage) // 저장소 주입
    { // 생성자 시작
    } // 생성자 종료

    public load(): LoadResult // 데이터 읽기
    { // 함수 시작
        const raw = this.storage.getItem("mateverse:v1:state"); // 저장 원본 조회
        if (raw === null) // 원본 부재 확인
        { // 조건 시작
            return { state: createInitialState(), recovered: false, warning: null }; // 초기 상태 반환
        } // 조건 종료
        return parseAndMigrate(raw, this.storage); // 복구 처리 반환
    } // 함수 종료
} // 클래스 종료
```

`parseAndMigrate(raw, storage)`는 JSON 분석을 시도하고, `schemaVersion`이 1이면 타입 가드로 필수 필드를 확인해 반환한다. 버전 0이면 누락된 설정과 `providerMode: "mock"`을 추가해 버전 1로 변환한다. 분석 또는 검증 실패 시 원본을 `mateverse:v1:backup`에 저장하고 `createInitialState()`와 복구 경고를 반환한다. `storage.setItem` 예외는 저장공간 경고가 포함된 명시적 `StorageWriteError`로 변환한다.

`repositories.ts`는 `CharacterRepository`, `ConversationRepository`, `SettingsRepository`, `TokenRepository` 인터페이스를 정의한다. `repository-provider.ts`는 하나의 `LocalStorageGateway`를 공유하는 로컬 구현을 생성한다.

- [ ] **Step 4: 저장소 검증**

```powershell
npm run test:run -- tests/unit/local-storage-gateway.test.ts # 저장소 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 저장소 커밋**

```powershell
git add src/lib/repositories tests/unit/local-storage-gateway.test.ts # 저장소 파일 스테이징
git commit -m "feat: add recoverable local repositories" # 저장소 커밋 생성
```

---

### Task 5: 상태 Reducer, 토큰 정책, 레이아웃 추천

**Files:**
- Create: `src/features/core/app-reducer.ts`
- Create: `src/features/core/AppProvider.tsx`
- Create: `src/test/render-with-app.tsx`
- Create: `src/lib/story/token-policy.ts`
- Create: `src/features/chat/layout-resolver.ts`
- Test: `tests/unit/app-reducer.test.ts`
- Test: `tests/unit/token-policy.test.ts`
- Test: `tests/unit/layout-resolver.test.ts`

**Interfaces:**
- Consumes: `AppState`, Repository 인터페이스
- Produces: `appReducer(state, action): AppState`, `trySpend(wallet, action): SpendResult`, `recommendLayout(input): LayoutId`, `useAppStore()`, `renderWithApp(ui, initialState?)`

- [ ] **Step 1: 실패하는 토큰 원자성 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { trySpend } from "@/lib/story/token-policy"; // 토큰 함수

describe("가상 토큰 정책", () => // 토큰 정책 묶음
{ // 묶음 시작
    it("잔액 부족 시 지갑을 변경하지 않는다", () => // 부족 상태 검증
    { // 검증 시작
        const wallet = { balance: 0, totalUsed: 4, dailyChatUsed: 4, dailyImageUsed: 0, updatedAt: "2026-09-22T00:00:00.000Z" }; // 원본 지갑
        const result = trySpend(wallet, "manual-image"); // 이미지 차감 시도
        expect(result.ok).toBe(false); // 실패 결과 확인
        expect(result.wallet).toEqual(wallet); // 원본 유지 확인
    }); // 검증 종료
}); // 묶음 종료
```

레이아웃 테스트는 모바일 세로 `M1`, 모바일 가로 `M3`, 태블릿 가로 `T1`, 태블릿 세로 `T2`, 1600px 이상 `D2`, 화면 비율 1.9 초과 `D3`, 일반 모니터 `D1`, 사용자 강제 선택 우선 적용을 검증한다.

Reducer 테스트는 패널 상태, 설정 변경, 메시지 추가, 대화방 선택, 토큰 차감 실패 시 전체 상태 불변을 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/unit/token-policy.test.ts tests/unit/layout-resolver.test.ts tests/unit/app-reducer.test.ts # 정책 테스트 실행
```

Expected: 대상 함수 부재로 FAIL.

- [ ] **Step 3: 토큰 정책과 레이아웃 추천 구현**

```typescript
const costs = { chat: 1, "advanced-chat": 3, "auto-image": 15, "manual-image": 20, "regenerate-image": 20 } as const; // 차감표

export function trySpend(wallet: TokenWallet, action: TokenAction): SpendResult // 차감 함수
{ // 함수 시작
    const cost = costs[action]; // 차감량 조회
    if (wallet.balance < cost) // 잔액 부족 확인
    { // 조건 시작
        return { ok: false, wallet, cost }; // 불변 실패 반환
    } // 조건 종료
    const imageAction = action === "auto-image" || action === "manual-image" || action === "regenerate-image"; // 이미지 동작 판정
    const nextWallet = { ...wallet, balance: wallet.balance - cost, totalUsed: wallet.totalUsed + cost, dailyChatUsed: wallet.dailyChatUsed + (imageAction ? 0 : cost), dailyImageUsed: wallet.dailyImageUsed + (imageAction ? 1 : 0), updatedAt: new Date().toISOString() }; // 변경 지갑 생성
    return { ok: true, wallet: nextWallet, cost }; // 변경 지갑 반환
} // 함수 종료
```

`recommendLayout`은 사용자 강제 `layoutId`가 있으면 즉시 반환하고, 없으면 승인된 플랫폼·방향·폭·화면 비율 규칙을 순서대로 적용한다.

`AppProvider`는 최초 렌더링 뒤 Repository에서 상태를 읽고 reducer 변경을 저장한다. 서버 렌더링 중 `window`나 `localStorage`를 참조하지 않는다.

`AppProvider`는 테스트용 `initialState`와 `repository` 선택 주입을 받는다. `renderWithApp`은 기본 초기 상태 또는 전달받은 상태로 컴포넌트를 감싸고 React Testing Library의 렌더링 결과를 반환한다.

```tsx
import type { ReactElement } from "react"; // 리액트 요소 타입
import { render } from "@testing-library/react"; // 렌더링 도구
import { AppProvider } from "@/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태 함수

export function renderWithApp(ui: ReactElement, initialState = createInitialState()) // 테스트 렌더 함수
{ // 함수 시작
    return render(<AppProvider initialState={initialState}>{ui}</AppProvider>); // 공급자 포함 렌더링
} // 함수 종료
```

- [ ] **Step 4: 상태와 정책 검증**

```powershell
npm run test:run -- tests/unit/token-policy.test.ts tests/unit/layout-resolver.test.ts tests/unit/app-reducer.test.ts # 정책 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 상태 관리 커밋**

```powershell
git add src/features/core src/features/chat/layout-resolver.ts src/lib/story/token-policy.ts src/test/render-with-app.tsx tests/unit # 상태 파일 스테이징
git commit -m "feat: add app state and layout policies" # 상태 커밋 생성
```

---

### Task 6: Mock LLM·이미지 어댑터와 스토리 엔진

**Files:**
- Create: `src/lib/adapters/llm-adapter.ts`
- Create: `src/lib/adapters/image-generation-adapter.ts`
- Create: `src/lib/adapters/mock-llm-adapter.ts`
- Create: `src/lib/adapters/mock-image-adapter.ts`
- Create: `src/lib/story/story-engine.ts`
- Test: `tests/unit/mock-adapters.test.ts`
- Test: `tests/unit/story-engine.test.ts`

**Interfaces:**
- Consumes: `Character`, `Conversation`, `Message`, 장면 SVG 경로
- Produces: `LLMAdapter.streamReply(input): AsyncIterable<string>`, `ImageGenerationAdapter.generateScene(input): Promise<SceneAsset>`, `evaluateStory(input): StoryUpdate`

- [ ] **Step 1: 실패하는 결정적 Mock 응답 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // Mock 대상
import { mockCharacters, mockConversations } from "@/mocks/fixtures"; // Mock 데이터
import type { LLMInput } from "@/lib/adapters/llm-adapter"; // 입력 타입

function makeInput(content: string): LLMInput // 입력 생성 함수
{ // 함수 시작
    return { character: mockCharacters[0], conversation: mockConversations[0], messages: [{ id: "test-user-message", conversationId: mockConversations[0].id, role: "user", content, emotion: "neutral", sceneEvent: null, createdAt: "2026-09-22T00:00:00.000Z" }] }; // 대화 입력 반환
} // 함수 종료

async function collect(chunks: AsyncIterable<string>): Promise<string> // 스트림 수집 함수
{ // 함수 시작
    let text = ""; // 응답 누적값
    for await (const chunk of chunks) // 응답 조각 순회
    { // 순회 시작
        text += chunk; // 응답 조각 누적
    } // 순회 종료
    return text; // 전체 응답 반환
} // 함수 종료

describe("Mock LLM 어댑터", () => // Mock 묶음
{ // 묶음 시작
    it("같은 시드와 입력에 같은 응답을 반환한다", async () => // 결정성 검증
    { // 검증 시작
        const adapter = new MockLLMAdapter({ delayMs: 0, seed: 7 }); // Mock 어댑터 생성
        const first = await collect(adapter.streamReply(makeInput("안녕"))); // 첫 응답 수집
        const second = await collect(adapter.streamReply(makeInput("안녕"))); // 둘째 응답 수집
        expect(second).toBe(first); // 동일 응답 확인
    }); // 검증 종료
}); // 묶음 종료
```

스토리 테스트는 메시지 수와 관계 수치에 따라 감정, 관계 단계, 중요 사건, 장면 ID가 결정되는지 검증한다. 이미지 테스트는 알려진 장면과 알 수 없는 장면의 대체 이미지 반환을 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/unit/mock-adapters.test.ts tests/unit/story-engine.test.ts # 어댑터 테스트 실행
```

Expected: 대상 모듈 부재로 FAIL.

- [ ] **Step 3: 어댑터와 스토리 엔진 구현**

```typescript
export interface LLMAdapter // 대화 어댑터 계약
{ // 구조 시작
    streamReply(input: LLMInput): AsyncIterable<string>; // 응답 스트림
    summarizeConversation(input: SummaryInput): Promise<string>; // 대화 요약
} // 구조 종료

export interface ImageGenerationAdapter // 이미지 어댑터 계약
{ // 구조 시작
    generateScene(input: SceneInput): Promise<SceneAsset>; // 장면 생성
    regenerateScene(input: SceneInput): Promise<SceneAsset>; // 장면 재생성
    cancelGeneration(): void; // 생성 취소
} // 구조 종료
```

Mock LLM은 캐릭터 ID, 감정, 관계 단계, 사용자 메시지의 정규화된 문자열로 응답 인덱스를 계산한다. 스트림은 공백 단위 조각을 반환한다. Mock 이미지는 `dawn`, `rain`, `library`, `fallback` 장면 ID만 반환한다.

- [ ] **Step 4: 어댑터 검증**

```powershell
npm run test:run -- tests/unit/mock-adapters.test.ts tests/unit/story-engine.test.ts # 어댑터 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 어댑터 커밋**

```powershell
git add src/lib/adapters src/lib/story tests/unit/mock-adapters.test.ts tests/unit/story-engine.test.ts # 어댑터 파일 스테이징
git commit -m "feat: add deterministic mock providers" # 어댑터 커밋 생성
```

---

### Task 7: 공통 AppShell과 양쪽 패널

**Files:**
- Create: `src/components/app-shell/AppShell.tsx`
- Create: `src/components/app-shell/AppShell.module.css`
- Create: `src/components/app-shell/AppHeader.tsx`
- Create: `src/components/app-shell/ConversationPanel.tsx`
- Create: `src/components/app-shell/UserPanel.tsx`
- Create: `src/components/app-shell/MobileBottomNavigation.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: `useAppStore()`, `Conversation[]`, `UserProfile`, `TokenWallet`, `AppSettings`
- Produces: 모든 경로가 공유하는 `AppShell({ children })`

- [ ] **Step 1: 실패하는 패널 상호작용 테스트 작성**

```tsx
import { screen } from "@testing-library/react"; // 화면 탐색 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { AppShell } from "@/components/app-shell/AppShell"; // 앱 셸 대상
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더 도구

describe("앱 셸 패널", () => // 패널 묶음
{ // 묶음 시작
    it("왼쪽과 오른쪽 패널을 독립적으로 전환한다", async () => // 패널 전환 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        renderWithApp(<AppShell><main>본문</main></AppShell>); // 앱 셸 렌더링
        const leftButton = screen.getByRole("button", { name: "대화방 패널 열기와 닫기" }); // 왼쪽 버튼 탐색
        const rightButton = screen.getByRole("button", { name: "사용자 패널 열기와 닫기" }); // 오른쪽 버튼 탐색
        expect(leftButton).toHaveAttribute("aria-expanded", "true"); // 왼쪽 기본값 확인
        expect(rightButton).toHaveAttribute("aria-expanded", "false"); // 오른쪽 기본값 확인
        await user.click(rightButton); // 오른쪽 패널 열기
        expect(rightButton).toHaveAttribute("aria-expanded", "true"); // 오른쪽 열림 확인
        expect(leftButton).toHaveAttribute("aria-expanded", "true"); // 왼쪽 유지 확인
    }); // 검증 종료
}); // 묶음 종료
```

모바일 테스트는 왼쪽 서랍을 연 뒤 오른쪽을 열면 왼쪽이 닫히는지, Escape와 배경 선택으로 닫히는지, 포커스가 토글 버튼으로 복귀하는지 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/components/app-shell.test.tsx # 앱 셸 테스트 실행
```

Expected: `AppShell` 부재로 FAIL.

- [ ] **Step 3: AppShell 구현**

CSS 그리드는 열린 상태에서 `250px minmax(0, 1fr) 280px`, 왼쪽 닫힘에서 `0 minmax(0, 1fr) 280px`, 오른쪽 닫힘에서 `250px minmax(0, 1fr) 0`을 사용한다. 중앙 가독 폭이 부족한 구간에서는 오른쪽 패널을 오버레이로 전환한다. 760px 이하에서는 양쪽 모두 오버레이 서랍으로 전환한다.

오른쪽 패널은 1180px 이하에서 `data-presentation="overlay"`를 사용한다. 왼쪽과 오른쪽 패널은 각각 `role="complementary"`, `aria-label="진행 중인 대화방"`, `aria-label="사용자 정보와 설정"`을 제공한다. `toggleLeftPanel`과 `toggleRightPanel`은 reducer의 패널 액션을 dispatch하는 AppShell 내부 함수다.

패널 버튼 계약은 다음과 같다.

```tsx
<button type="button" aria-label="사용자 패널 열기와 닫기" aria-expanded={rightOpen} aria-controls="user-panel" onClick={toggleRightPanel}>●</button> // 사용자 패널 버튼
```

오른쪽 패널은 프로필, 멤버십, 토큰, 이미지 횟수, 프로필 관리, 작품, 토큰 내역, 레이아웃, 알림, 선제 메시지, 보안, 지원, 로그아웃을 표시한다. 로그아웃은 Mock 확인 대화상자 뒤 로컬 세션 선택값만 초기화하고 작품과 대화를 삭제하지 않는다.

- [ ] **Step 4: AppShell 검증**

```powershell
npm run test:run -- tests/components/app-shell.test.tsx # 앱 셸 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: AppShell 커밋**

```powershell
git add src/components/app-shell src/app/layout.tsx tests/components/app-shell.test.tsx # 앱 셸 파일 스테이징
git commit -m "feat: add responsive dual-panel app shell" # 앱 셸 커밋 생성
```

---

### Task 8: 탐색 홈과 캐릭터 상세

**Files:**
- Create: `src/features/discovery/DiscoveryHome.tsx`
- Create: `src/features/discovery/DiscoveryHome.module.css`
- Create: `src/features/discovery/CategoryFilter.tsx`
- Create: `src/features/discovery/FeaturedCharacter.tsx`
- Create: `src/features/discovery/CharacterRail.tsx`
- Create: `src/features/discovery/CharacterCard.tsx`
- Create: `src/features/character/CharacterDetail.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/characters/[id]/page.tsx`
- Test: `tests/components/discovery-home.test.tsx`
- Test: `tests/integration/character-detail.test.tsx`

**Interfaces:**
- Consumes: `mockCharacters`, `useAppStore()`, Next.js 경로 매개변수
- Produces: 검색·카테고리 필터가 가능한 홈과 대화 시작 가능한 상세 화면

- [ ] **Step 1: 실패하는 탐색 필터 테스트 작성**

```tsx
import { screen } from "@testing-library/react"; // 화면 탐색 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { DiscoveryHome } from "@/features/discovery/DiscoveryHome"; // 탐색 화면 대상
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더 도구

describe("캐릭터 탐색", () => // 탐색 묶음
{ // 묶음 시작
    it("검색어와 카테고리를 함께 적용한다", async () => // 복합 필터 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        renderWithApp(<DiscoveryHome />); // 탐색 화면 렌더링
        await user.type(screen.getByRole("searchbox", { name: "캐릭터와 세계관 검색" }), "유하"); // 검색어 입력
        await user.click(screen.getByRole("button", { name: "힐링" })); // 카테고리 선택
        expect(screen.getByRole("link", { name: /새벽의 편지, 유하/ })).toBeVisible(); // 일치 카드 확인
        expect(screen.queryByRole("link", { name: /황태자의 비밀 계약/ })).toBeNull(); // 불일치 카드 제외
    }); // 검증 종료
}); // 묶음 종료
```

상세 통합 테스트는 기존 대화방이 있으면 재사용하고 없으면 하나만 생성한 뒤 `/chat/[characterId]` 목적지를 반환하는지 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/components/discovery-home.test.tsx tests/integration/character-detail.test.tsx # 탐색 테스트 실행
```

Expected: 대상 컴포넌트 부재로 FAIL.

- [ ] **Step 3: 탐색과 상세 구현**

데스크톱 홈은 카테고리 칩, 추천 배너, 인기·신규·제작자 추천 레일을 제공한다. 모바일 홈은 상단 홈·랭킹, 프로모션 배너, 세로 이미지 2열 카드, 하단 탐색을 제공한다. 카드 링크 이름에는 캐릭터 이름과 한 줄 소개를 포함한다.

상세 화면은 대표 이미지, 이름, 소개, 제작자, 태그, 성격, 세계관, 첫 대화 예시, 대화 시작, 보관함 추가를 표시한다.

- [ ] **Step 4: 탐색과 상세 검증**

```powershell
npm run test:run -- tests/components/discovery-home.test.tsx tests/integration/character-detail.test.tsx # 탐색 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 탐색 커밋**

```powershell
git add src/features/discovery src/features/character/CharacterDetail.tsx src/app/page.tsx src/app/characters tests/components/discovery-home.test.tsx tests/integration/character-detail.test.tsx # 탐색 파일 스테이징
git commit -m "feat: add character discovery and detail" # 탐색 커밋 생성
```

---

### Task 9: Mock 채팅과 아홉 개 레이아웃

**Files:**
- Create: `src/features/chat/ChatScreen.tsx`
- Create: `src/features/chat/ChatScreen.module.css`
- Create: `src/features/chat/SceneViewer.tsx`
- Create: `src/features/chat/MessageList.tsx`
- Create: `src/features/chat/ChatComposer.tsx`
- Create: `src/features/chat/LayoutSelector.tsx`
- Create: `src/features/chat/chat-controller.ts`
- Create: `src/test/chat-fixtures.ts`
- Create: `src/app/chat/[characterId]/page.tsx`
- Test: `tests/integration/chat-flow.test.tsx`
- Test: `tests/components/layout-selector.test.tsx`

**Interfaces:**
- Consumes: `LLMAdapter`, `ImageGenerationAdapter`, `evaluateStory`, `trySpend`, `recommendLayout`, Repository
- Produces: `sendMessage(text): Promise<SendResult>`, `generateManualScene(): Promise<SceneResult>`, `ChatScreen`

- [ ] **Step 1: 실패하는 중복 전송·토큰 원자성 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { makeController } from "@/test/chat-fixtures"; // 채팅 테스트 제어기

describe("채팅 흐름", () => // 채팅 흐름 묶음
{ // 묶음 시작
    it("응답 대기 중 두 번째 전송을 거절한다", async () => // 중복 전송 검증
    { // 검증 시작
        const controller = makeController({ balance: 100, replyDelayMs: 20 }); // 채팅 제어 생성
        const first = controller.sendMessage("첫 메시지"); // 첫 전송 시작
        const second = await controller.sendMessage("중복 메시지"); // 중복 전송 시도
        await first; // 첫 전송 완료
        expect(second.ok).toBe(false); // 중복 거절 확인
        expect(second.reason).toBe("busy"); // 거절 이유 확인
        expect(controller.getMessages().filter((message) => message.role === "user")).toHaveLength(1); // 단일 사용자 메시지 확인
    }); // 검증 종료

    it("토큰 부족 시 어떤 대화 상태도 바꾸지 않는다", async () => // 원자성 검증
    { // 검증 시작
        const controller = makeController({ balance: 0, replyDelayMs: 0 }); // 빈 지갑 제어 생성
        const before = controller.snapshot(); // 변경 전 상태
        const result = await controller.sendMessage("안녕"); // 전송 시도
        expect(result.reason).toBe("insufficient-token"); // 부족 이유 확인
        expect(controller.snapshot()).toEqual(before); // 전체 불변 확인
    }); // 검증 종료
}); // 묶음 종료
```

레이아웃 컴포넌트 테스트는 자동 추천 표시, 플랫폼 강제 선택, 해상도 강제 선택, 아홉 ID 선택, 새로고침 복원 값을 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/integration/chat-flow.test.tsx tests/components/layout-selector.test.tsx # 채팅 테스트 실행
```

Expected: 대상 모듈 부재로 FAIL.

- [ ] **Step 3: 채팅 제어기와 화면 구현**

`sendMessage`는 공백 입력, 응답 대기, 토큰 부족을 먼저 검사한다. 성공할 때만 사용자 메시지 저장, 1토큰 차감, Mock 스트림 출력, 관계 갱신, 중요 사건 이미지 갱신을 순서대로 실행한다.

`src/test/chat-fixtures.ts`는 `makeController({ balance, replyDelayMs })`를 제공한다. 이 함수는 `createInitialState()`의 지갑 잔액을 인자로 교체하고, 메모리 Repository, `MockLLMAdapter`, `MockImageAdapter`를 주입한 `ChatController`를 반환한다. `ChatController`는 테스트용 `snapshot(): AppState`와 `getMessages(): Message[]` 읽기 메서드를 제공하되 상태 변경은 `sendMessage`와 이미지 명령만 허용한다.

`ChatScreen`은 장면 이미지, 캐릭터 정보, 관계 단계, 감정, 메시지 목록, 입력창, 전송, 수동 이미지, 토큰, 레이아웃 선택을 표시한다.

CSS는 `data-layout="M1"`부터 `data-layout="D3"`까지 아홉 상태를 제공한다. 모바일은 M1 균형, M2 이미지 강조, M3 채팅 강조다. 태블릿은 T1 가로 분할, T2 중앙 세로, T3 장면·정보 강조다. 모니터는 D1 중앙 집중, D2 3열, D3 시네마틱이다.

- [ ] **Step 4: 채팅 검증**

```powershell
npm run test:run -- tests/integration/chat-flow.test.tsx tests/components/layout-selector.test.tsx # 채팅 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 채팅 커밋**

```powershell
git add src/features/chat src/app/chat src/test/chat-fixtures.ts tests/integration/chat-flow.test.tsx tests/components/layout-selector.test.tsx # 채팅 파일 스테이징
git commit -m "feat: add mock story chat experience" # 채팅 커밋 생성
```

---

### Task 10: 캐릭터 제작·수정과 내 작품

**Files:**
- Create: `src/features/character/CharacterEditor.tsx`
- Create: `src/features/character/CharacterPreview.tsx`
- Create: `src/features/character/character-validation.ts`
- Create: `src/features/library/LibraryScreen.tsx`
- Create: `src/app/characters/new/page.tsx`
- Create: `src/app/characters/[id]/edit/page.tsx`
- Create: `src/app/library/page.tsx`
- Test: `tests/unit/character-validation.test.ts`
- Test: `tests/integration/character-editor.test.tsx`

**Interfaces:**
- Consumes: `CharacterRepository`, `Character`
- Produces: `validateCharacterDraft(draft): ValidationResult`, 생성·수정·보관 UI

- [ ] **Step 1: 실패하는 제작 검증 테스트 작성**

```typescript
import { describe, expect, it } from "vitest"; // 테스트 도구
import { validateCharacterDraft } from "@/features/character/character-validation"; // 검증 대상
import { validCharacterDraft } from "@/mocks/fixtures"; // 정상 제작 초안

describe("캐릭터 제작 검증", () => // 제작 검증 묶음
{ // 묶음 시작
    it("필수 필드와 길이 제한을 함께 반환한다", () => // 다중 오류 검증
    { // 검증 시작
        const result = validateCharacterDraft({ ...validCharacterDraft, name: "", summary: "가".repeat(81) }); // 잘못된 초안 검증
        expect(result.errors.name).toBe("캐릭터 이름을 입력해 주세요."); // 이름 오류 확인
        expect(result.errors.summary).toBe("한 줄 소개는 80자 이하여야 합니다."); // 소개 오류 확인
    }); // 검증 종료
}); // 묶음 종료
```

통합 테스트는 초안 입력, 미리보기 반영, 비공개 저장, `/library` 노출, 편집 뒤 업데이트를 검증한다. 제작자 프롬프트가 일반 상세 컴포넌트에 렌더링되지 않는지도 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/unit/character-validation.test.ts tests/integration/character-editor.test.tsx # 제작 테스트 실행
```

Expected: 대상 모듈 부재로 FAIL.

- [ ] **Step 3: 제작·수정·내 작품 구현**

제작 필드는 이름, 한 줄 소개, 설명, 성격, 첫 인사, 세계관, 비공개 프롬프트, 태그, 대표 이미지, 공개 범위다. 필수값은 이름, 한 줄 소개, 성격, 첫 인사다. 미리보기는 카드와 첫 메시지를 즉시 갱신한다.

내 작품은 제작 작품, 임시 저장, 공개 상태, 최근 수정 시각, 편집 진입, 보관한 캐릭터, 진행 대화를 탭으로 구분한다.

- [ ] **Step 4: 제작 흐름 검증**

```powershell
npm run test:run -- tests/unit/character-validation.test.ts tests/integration/character-editor.test.tsx # 제작 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 제작 기능 커밋**

```powershell
git add src/features/character src/features/library src/app/characters src/app/library tests/unit/character-validation.test.ts tests/integration/character-editor.test.tsx # 제작 파일 스테이징
git commit -m "feat: add character creation and library" # 제작 커밋 생성
```

---

### Task 11: 설정, 알림 준비, 로컬 데이터 제어

**Files:**
- Create: `src/features/settings/SettingsScreen.tsx`
- Create: `src/features/settings/NotificationSettings.tsx`
- Create: `src/features/settings/LocalDataControls.tsx`
- Create: `src/app/settings/page.tsx`
- Test: `tests/integration/settings.test.tsx`

**Interfaces:**
- Consumes: `SettingsRepository`, `LocalStorageGateway`
- Produces: 레이아웃·알림 설정 저장, JSON 내보내기, 확인 기반 초기화

- [ ] **Step 1: 실패하는 설정 범위 테스트 작성**

```tsx
import { screen } from "@testing-library/react"; // 화면 탐색 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { NotificationSettings } from "@/features/settings/NotificationSettings"; // 알림 설정 대상
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더 도구

describe("알림 설정", () => // 알림 설정 묶음
{ // 묶음 시작
    it("종료 시각이 시작 시각보다 빠르면 저장을 막는다", async () => // 시각 범위 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 동작 생성
        renderWithApp(<NotificationSettings />); // 알림 설정 렌더링
        await user.selectOptions(screen.getByLabelText("알림 시작 시각"), "22:00"); // 시작 시각 선택
        await user.selectOptions(screen.getByLabelText("알림 종료 시각"), "09:00"); // 종료 시각 선택
        await user.click(screen.getByRole("button", { name: "설정 저장" })); // 설정 저장 시도
        expect(screen.getByRole("alert")).toHaveTextContent("종료 시각은 시작 시각보다 늦어야 합니다."); // 오류 문구 확인
    }); // 검증 종료
}); // 묶음 종료
```

같은 파일에서 하루 최대 횟수 0~10 범위, 선제 메시지 비활성화, 실제 Notification 권한 미요청, 내보내기 JSON, 초기화 확인 취소·승인을 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

```powershell
npm run test:run -- tests/integration/settings.test.tsx # 설정 테스트 실행
```

Expected: 대상 컴포넌트 부재로 FAIL.

- [ ] **Step 3: 설정 화면 구현**

설정 화면은 프로필, 자동 플랫폼, 강제 플랫폼, 강제 해상도, 레이아웃, 선제 메시지, 알림 시작·종료, 하루 최대 횟수, 내보내기, 초기화를 제공한다.

알림 미리보기는 관계와 현재 장면에서 Mock 문장을 생성해 화면에만 표시한다. `Notification.requestPermission()`을 호출하지 않는다.

초기화는 삭제 범위를 대화, 작품, 설정으로 나누어 표시하고 명시적 확인 뒤 실행한다.

- [ ] **Step 4: 설정 검증**

```powershell
npm run test:run -- tests/integration/settings.test.tsx # 설정 테스트 재실행
npm run typecheck # 타입 검사 실행
```

Expected: PASS.

- [ ] **Step 5: 설정 커밋**

```powershell
git add src/features/settings src/app/settings tests/integration/settings.test.tsx # 설정 파일 스테이징
git commit -m "feat: add local settings and data controls" # 설정 커밋 생성
```

---

### Task 12: 종단 흐름, 네트워크 차단, 최종 품질 검증

**Files:**
- Create: `tests/e2e/discovery-chat.spec.ts`
- Create: `tests/e2e/panels-settings.spec.ts`
- Create: `tests/e2e/no-external-network.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1~11의 전체 앱
- Produces: 사용 가능한 무과금 데모와 반복 가능한 검증 명령

- [ ] **Step 1: 실패하는 핵심 종단 테스트 작성**

```typescript
import { expect, test } from "@playwright/test"; // 종단 테스트 도구

test("탐색에서 Mock 대화와 장면 전환까지 진행한다", async ({ page }) => // 핵심 흐름 검증
{ // 검증 시작
    await page.goto("/"); // 탐색 홈 이동
    await page.getByRole("link", { name: /새벽의 편지, 유하/ }).click(); // 캐릭터 상세 이동
    await page.getByRole("button", { name: "대화 시작" }).click(); // 채팅 시작
    await page.getByRole("textbox", { name: "메시지 입력" }).fill("오늘 기분은 어때?"); // 메시지 입력
    await page.getByRole("button", { name: "전송" }).click(); // 메시지 전송
    await expect(page.getByText("오늘 기분은 어때?")).toBeVisible(); // 사용자 메시지 확인
    await expect(page.getByTestId("assistant-message").last()).toBeVisible(); // Mock 응답 확인
    await expect(page.getByTestId("token-balance")).toContainText("1,239"); // 토큰 차감 확인
}); // 검증 종료
```

패널 종단 테스트는 데스크톱 독립 토글, 모바일 상호 배타 서랍, 설정 저장 후 새로고침 복원을 검증한다.

```typescript
test("좁은 데스크톱에서 오른쪽 패널을 오버레이로 표시한다", async ({ page }) => // 좁은 화면 검증
{ // 검증 시작
    await page.setViewportSize({ width: 1024, height: 768 }); // 데스크톱 화면 설정
    await page.goto("/"); // 홈 이동
    await page.getByRole("button", { name: "사용자 패널 열기와 닫기" }).click(); // 사용자 패널 열기
    await expect(page.getByRole("complementary", { name: "사용자 정보와 설정" })).toHaveAttribute("data-presentation", "overlay"); // 오버레이 상태 확인
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); // 가로 넘침 계산
    expect(overflow).toBe(false); // 가로 넘침 부재 확인
}); // 검증 종료
```

외부 네트워크 테스트는 다음 허용 목록 외 요청을 수집해 실패시킨다.

```typescript
test("Mock 모드에서 외부 서비스 요청을 보내지 않는다", async ({ page }) => // 네트워크 차단 검증
{ // 검증 시작
    const forbidden: string[] = []; // 금지 요청 목록
    page.on("request", (request) => // 요청 감시
    { // 감시 시작
        const url = new URL(request.url()); // 요청 주소 분석
        if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") // 외부 주소 확인
        { // 조건 시작
            forbidden.push(request.url()); // 금지 요청 저장
        } // 조건 종료
    }); // 감시 종료
    await page.goto("/"); // 홈 이동
    await page.getByRole("link", { name: /새벽의 편지, 유하/ }).click(); // 상세 이동
    await page.getByRole("button", { name: "대화 시작" }).click(); // 채팅 이동
    expect(forbidden).toEqual([]); // 외부 요청 부재 확인
}); // 검증 종료
```

- [ ] **Step 2: 종단 테스트 실패 확인**

```powershell
npx playwright install chromium # 크로미움 설치
npm run test:e2e # 종단 테스트 실행
```

Expected: 누락된 접근성 이름, 경로 또는 흐름이 있으면 FAIL.

- [ ] **Step 3: 종단 실패 항목 수정과 README 작성**

README에는 Node.js 요구 버전, 설치, 개발 실행, 전체 검증, Mock 모드, 데이터 초기화, 비용이 발생하지 않는 범위, 실제 공급자가 비활성 상태임을 명시한다.

종단 실패는 테스트가 지적한 경로, 접근성 이름, 상태 저장, 반응형 동작만 수정한다. 실제 API 또는 Supabase 코드는 추가하지 않는다.

- [ ] **Step 4: 전체 검증 실행**

```powershell
node --test prototype/main.test.mjs # 정적 목업 검증
npm run lint # 전체 린트 실행
npm run typecheck # 전체 타입 검사
npm run test:run # 전체 단위 통합 테스트
npm run build # 프로덕션 빌드
npm run test:e2e # 전체 종단 테스트
```

Expected: 모든 명령 PASS, 외부 요청 0건.

- [ ] **Step 5: 최종 상태와 변경 범위 확인**

```powershell
git status --short # 변경 파일 확인
git diff --check # 공백 오류 확인
git log --oneline --decorate -12 # 작업 커밋 확인
```

Expected: 의도한 README와 종단 테스트 및 최종 수정 파일만 미커밋 상태.

- [ ] **Step 6: 최종 구현 커밋**

```powershell
git add README.md tests/e2e src # 최종 파일 스테이징
git commit -m "test: verify zero-cost chatbot experience" # 최종 커밋 생성
```

- [ ] **Step 7: 완료 전 재검증**

```powershell
npm run lint # 완료 린트 실행
npm run typecheck # 완료 타입 검사
npm run test:run # 완료 테스트 실행
npm run build # 완료 빌드 실행
npm run test:e2e # 완료 종단 테스트
git status --short --branch # 완료 상태 확인
```

Expected: 모든 검증 PASS와 깨끗한 작업 트리.
