---
# Mock Windows EXE와 배포 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외부 서버 없이 Mock 데이터로 플레이·저장·이어하기가 가능한 Windows 설치 EXE를 만들고, 검증된 GitHub Release 정보를 ChatBot과 HomePage 작업에 전달한다.

**Architecture:** 기존 Next.js 웹 앱은 유지하고, 공유 Text-Play 모듈을 사용하는 별도 Vite·React 데스크톱 진입점을 추가한다. Tauri 2는 정적 Vite 결과물을 로드하며 최소 권한과 외부 연결 차단 CSP를 적용한다. Windows NSIS 설치 EXE와 SHA-256 파일을 Release 자산으로 게시한다.

**Tech Stack:** TypeScript 5.9, React 19, Vite, Vitest, Playwright, Tauri 2.12 계열, Rust stable-msvc, NSIS, pnpm 11.19.0

**Spec:** `docs/superpowers/specs/2026-09-29-mock-windows-exe-distribution-design.md`

---
## Global Constraints

- 대상은 Windows 10·11 x64다.
- 제품명은 `MATE Text-Play Preview`다.
- 초기 버전은 `0.1.0-preview.1`이다.
- 설치 파일명은 `MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe`다.
- 데스크톱 실행은 환경 변수와 관계없이 항상 `MockLLMAdapter`를 사용한다.
- 데스크톱 앱은 실제 LLM·이미지 API, 로그인, 결제와 크레딧을 호출하지 않는다.
- Tauri에 셸 실행, 파일 시스템, HTTP와 임의 URL 열기 권한을 추가하지 않는다.
- 기존 웹 저장 슬롯 형식과 `auto`, `manual-1`, `manual-2`, `manual-3` 식별자를 유지한다.
- GitHub Release 태그는 `v0.1.0-preview.1`이다.
- EXE 파일을 ChatBot 또는 HomePage Git 저장소에 커밋하지 않는다.
- 패키지 관리자는 pnpm 11.19.0으로 통일한다.
- 모든 코드 블록은 Allman 스타일을 사용하고 각 코드 줄에 짧은 한글 명사형 주석을 작성한다.

---
## Review Focus

- `NEXT_PUBLIC_LLM_MODE=server` 환경에서도 데스크톱 앱은 Mock 모드와 `Mock AI` 표시를 유지해야 한다. Task 2 단위 테스트로 고정한다.
- 손상된 자동 저장이 있어도 홈 화면이 중단되지 않고 새 게임 진입을 제공해야 한다. Task 2 통합 테스트로 고정한다.
- 장면 이미지 한 개라도 데스크톱 결과물에서 누락되면 Release 빌드가 실패해야 한다. Task 3 자산 검증 테스트로 고정한다.
- WebView2가 없는 환경에서는 NSIS가 런타임 설치 안내 또는 부트스트래퍼 경로를 제공해야 한다. Task 4 설정 검사와 수동 검증으로 고정한다.
- Release에서 다시 내려받은 EXE의 SHA-256이 다르면 ChatBot·HomePage 전달을 중단해야 한다. Task 6 검증 단계로 고정한다.

---
## File Structure

공유 경계:

- `src/features/text-play/platform/text-play-platform.tsx`: 화면 이동과 장면 이미지 렌더링 계약
- `src/features/text-play/platform/NextTextPlayPlatformProvider.tsx`: Next.js 웹 플랫폼 구현
- `src/features/text-play/ui/TextPlayHome.tsx`: 플랫폼 계약을 사용하는 공용 홈
- `src/features/text-play/ui/TextPlayScreen.tsx`: 플랫폼 계약을 사용하는 공용 플레이 화면

데스크톱 진입점:

- `desktop/index.html`: Vite HTML 진입점
- `src/desktop/main.tsx`: React 마운트
- `src/desktop/DesktopApp.tsx`: 홈·플레이 상태와 저장소 수명 주기
- `src/desktop/desktop-navigation.ts`: 데스크톱 화면 상태 전이
- `src/desktop/desktop-llm.ts`: 강제 Mock 공급자
- `src/desktop/DesktopPlatformProvider.tsx`: 데스크톱 플랫폼 구현
- `src/desktop/desktop.css`: 데스크톱 전역 스타일
- `vite.desktop.config.ts`: 상대 자산 경로와 `desktop-dist` 출력 설정

Tauri 셸:

- `src-tauri/Cargo.toml`: Rust 의존성
- `src-tauri/build.rs`: Tauri 빌드 진입점
- `src-tauri/src/main.rs`: 최소 앱 실행 코드
- `src-tauri/Tauri.toml`: 제품·창·CSP·NSIS 설정
- `src-tauri/capabilities/default.toml`: 최소 `core:default` 권한
- `src-tauri/icons/*`: Windows 프로그램 아이콘

검증·배포:

- `playwright.desktop.config.ts`: 데스크톱 Vite E2E 설정
- `tests/e2e/desktop-preview.spec.ts`: Mock 플레이·저장·오프라인 흐름
- `scripts/build-windows-preview.ps1`: 빌드·파일명·SHA-256 생성
- `scripts/verify-desktop-assets.mjs`: 필수 자산과 금지 문자열 검사
- `docs/releases/v0.1.0-preview.1.md`: Release 설명 원본
- `artifacts/`: 생성 결과물, Git 제외

---
### Task 1: Text-Play 플랫폼 경계 분리

**Files:**

- Create: `src/features/text-play/platform/text-play-platform.tsx`
- Create: `src/features/text-play/platform/NextTextPlayPlatformProvider.tsx`
- Modify: `src/features/text-play/ui/TextPlayHome.tsx`
- Modify: `src/features/text-play/ui/TextPlayScreen.tsx`
- Modify: `src/app/text-play/page.tsx`
- Modify: `src/app/text-play/demo/page.tsx`
- Modify: `tests/components/text-play-home.test.tsx`
- Modify: `tests/components/text-play-screen.test.tsx`
- Test: `tests/unit/text-play-platform.test.tsx`

**Interfaces:**

- Consumes: 기존 `TextPlayHome`, `TextPlayScreen`, `TextPlayProvider`, Next.js `useRouter`, Next.js `Image`
- Produces: `TextPlayRoute = "home" | "new" | "resume" | "back"`, `TextPlayPlatform`, `TextPlayPlatformProvider`, `useTextPlayPlatform`, `NextTextPlayPlatformProvider`

- [ ] **Step 1: 플랫폼 계약 실패 테스트 작성**

```tsx
it("홈 동작을 플랫폼 이동 계약으로 전달한다", async () => // 이동 계약 검증
{ // 테스트 시작
    const navigate = vi.fn(); // 이동 기록 함수
    const platform: TextPlayPlatform = { navigate, renderSceneImage: () => null }; // 테스트 플랫폼
    render(<TextPlayPlatformProvider value={platform}><TextPlayHome repository={new MemoryTextPlaySaveRepository()} /></TextPlayPlatformProvider>); // 홈 렌더
    await userEvent.click(screen.getByRole("button", { name: "새 게임" })); // 새 게임 선택
    expect(navigate).toHaveBeenCalledWith("new"); // 이동 값 확인
}); // 테스트 종료
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/unit/text-play-platform.test.tsx tests/components/text-play-home.test.tsx tests/components/text-play-screen.test.tsx`

Expected: FAIL because `TextPlayPlatformProvider` and the platform-driven buttons do not exist.

- [ ] **Step 3: 플랫폼 계약 구현**

`text-play-platform.tsx`에 `TextPlayPlatform`의 정확한 계약을 추가한다.

- `navigate(route: TextPlayRoute): void`
- `renderSceneImage(source: string): ReactNode`
- `TextPlayPlatformProvider({ value, children }): ReactElement`
- `useTextPlayPlatform(): TextPlayPlatform`

Provider 밖에서 훅을 사용하면 명시적 오류를 발생시킨다.

- [ ] **Step 4: Next.js 플랫폼 구현과 화면 교체**

`NextTextPlayPlatformProvider`는 `new`, `resume`, `home`, `back`을 각각 기존 웹 URL로 연결하고 장면 이미지는 기존 `next/image` 설정으로 출력한다. 공용 홈과 플레이 화면에서 `next/link`, `next/image` 직접 import를 제거한다.

- [ ] **Step 5: 웹 회귀 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/text-play-platform.test.tsx tests/components/text-play-home.test.tsx tests/components/text-play-screen.test.tsx tests/integration/text-play-flow.test.tsx`

Expected: PASS with new platform tests and the existing Text-Play flow.

- [ ] **Step 6: 전체 웹 검증**

Run: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build`

Expected: 160 or more tests pass, typecheck and lint exit 0, Next.js build exit 0.

- [ ] **Step 7: 커밋**

```powershell
git add src/features/text-play/platform src/features/text-play/ui/TextPlayHome.tsx src/features/text-play/ui/TextPlayScreen.tsx src/app/text-play tests/unit/text-play-platform.test.tsx tests/components/text-play-home.test.tsx tests/components/text-play-screen.test.tsx # 플랫폼 경계 스테이징
git commit -m "refactor: Text-Play 플랫폼 경계 분리" # 플랫폼 경계 커밋
```

---
### Task 2: 데스크톱 화면 상태와 강제 Mock 모드

**Files:**

- Create: `src/desktop/desktop-navigation.ts`
- Create: `src/desktop/desktop-llm.ts`
- Create: `src/desktop/DesktopPlatformProvider.tsx`
- Create: `src/desktop/DesktopApp.tsx`
- Create: `tests/unit/desktop-navigation.test.ts`
- Create: `tests/unit/desktop-llm.test.ts`
- Create: `tests/integration/desktop-app.test.tsx`

**Interfaces:**

- Consumes: Task 1의 `TextPlayPlatform`, `TextPlayHome`, `TextPlayProvider`, `TextPlayScreen`; 기존 `TextPlaySaveRepository`
- Produces: `DesktopRoute`, `reduceDesktopRoute`, `createDesktopLLMSelection`, `DesktopPlatformProvider`, `DesktopApp`

- [ ] **Step 1: 화면 상태 전이 실패 테스트 작성**

```ts
it("새 게임과 이어하기의 복원 슬롯을 구분한다", () => // 화면 전이 검증
{ // 테스트 시작
    expect(reduceDesktopRoute({ screen: "home" }, { type: "start-new" })).toEqual({ screen: "play", resumeSlot: null }); // 새 게임 확인
    expect(reduceDesktopRoute({ screen: "home" }, { type: "resume" })).toEqual({ screen: "play", resumeSlot: "auto" }); // 이어하기 확인
}); // 테스트 종료
```

- [ ] **Step 2: 강제 Mock 실패 테스트 작성**

```ts
it("서버 환경 값과 관계없이 Mock 공급자를 반환한다", () => // 강제 Mock 검증
{ // 테스트 시작
    const previousMode = process.env.NEXT_PUBLIC_LLM_MODE; // 기존 환경 값
    process.env.NEXT_PUBLIC_LLM_MODE = "server"; // 서버 환경 설정
    const selection = createDesktopLLMSelection(); // 데스크톱 공급자 생성
    expect(selection.mode).toBe("mock"); // Mock 모드 확인
    expect(selection.label).toBe("Mock AI"); // 표시 문구 확인
    if (previousMode === undefined) // 기존 값 부재 확인
    { // 부재 처리 시작
        delete process.env.NEXT_PUBLIC_LLM_MODE; // 환경 값 제거
    } // 부재 처리 종료
    else // 기존 값 존재 처리
    { // 존재 처리 시작
        process.env.NEXT_PUBLIC_LLM_MODE = previousMode; // 기존 환경 복원
    } // 존재 처리 종료
}); // 테스트 종료
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run tests/unit/desktop-navigation.test.ts tests/unit/desktop-llm.test.ts tests/integration/desktop-app.test.tsx`

Expected: FAIL because desktop modules do not exist.

- [ ] **Step 4: 최소 데스크톱 상태 구현**

`DesktopRoute`는 `{ screen: "home" } | { screen: "play"; resumeSlot: TextPlaySlotId | null }`만 허용한다. `DesktopApp`은 브라우저 저장소 인스턴스를 앱 수명 동안 하나만 유지하고 홈과 플레이 화면에 동일 인스턴스를 전달한다.

- [ ] **Step 5: 손상 저장과 네트워크 미사용 통합 테스트 추가**

`desktop-app.test.tsx`에 다음을 검증한다.

- 저장소 `load`가 오류를 던져도 새 게임 버튼 표시
- 새 게임 진입 후 `Mock AI` 표시
- 자유 입력 완료까지 `fetch` 호출 0회
- 홈 복귀 후 저장소 인스턴스 유지

- [ ] **Step 6: 데스크톱 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/desktop-navigation.test.ts tests/unit/desktop-llm.test.ts tests/integration/desktop-app.test.tsx`

Expected: PASS, including `NEXT_PUBLIC_LLM_MODE=server` and corrupted save cases.

- [ ] **Step 7: 커밋**

```powershell
git add src/desktop tests/unit/desktop-navigation.test.ts tests/unit/desktop-llm.test.ts tests/integration/desktop-app.test.tsx # 데스크톱 상태 스테이징
git commit -m "feat: Mock 데스크톱 플레이 흐름 추가" # 데스크톱 흐름 커밋
```

---
### Task 3: Vite 데스크톱 빌드와 자산 경계

**Files:**

- Create: `desktop/index.html`
- Create: `src/desktop/main.tsx`
- Create: `src/desktop/desktop.css`
- Create: `vite.desktop.config.ts`
- Create: `scripts/verify-desktop-assets.mjs`
- Create: `tests/unit/desktop-build-config.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.gitignore`
- Delete: `package-lock.json`

**Interfaces:**

- Consumes: Task 2의 `DesktopApp`
- Produces: `pnpm desktop:dev`, `pnpm desktop:build`, `desktop-dist/`, `pnpm desktop:verify-assets`

- [ ] **Step 1: 빌드 설정 실패 테스트 작성**

```ts
it("데스크톱 빌드는 상대 자산과 전용 출력 폴더를 사용한다", async () => // 빌드 설정 검증
{ // 테스트 시작
    const module = await import("../../vite.desktop.config"); // 설정 모듈 조회
    const config = module.default as UserConfig; // 설정 객체 변환
    expect(config.base).toBe("./"); // 상대 경로 확인
    expect(config.build?.outDir).toContain("desktop-dist"); // 출력 폴더 확인
}); // 테스트 종료
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/unit/desktop-build-config.test.ts`

Expected: FAIL because the Vite desktop config and scripts do not exist.

- [ ] **Step 3: pnpm과 Vite 구성 추가**

`package.json`에 `packageManager: "pnpm@11.19.0"`을 추가하고 다음 스크립트를 정의한다.

- `desktop:dev`: 전용 Vite 설정으로 1420 포트 실행
- `desktop:build`: 전용 Vite 설정으로 `desktop-dist` 생성
- `desktop:verify-assets`: 데스크톱 자산 검증 스크립트 실행

Vite와 `@tauri-apps/cli` 2.12 계열을 devDependencies에 추가한다. pnpm 잠금 파일을 갱신하고 중복 잠금 파일인 `package-lock.json`을 제거한다.

- [ ] **Step 4: 데스크톱 HTML과 React 마운트 구현**

`main.tsx`는 `DesktopApp`만 마운트한다. 기존 `src/app/globals.css`와 데스크톱 보정 CSS를 불러오며 StrictMode를 사용한다.

- [ ] **Step 5: 필수 자산·금지 문자열 검사 구현**

`verify-desktop-assets.mjs`는 다음 조건 중 하나라도 만족하지 않으면 종료 코드 1을 반환한다.

- `desktop-dist/index.html` 부재
- 데모 장면 이미지 부재
- `MATEVERSE_LLM_API_TOKEN` 문자열 포함
- `/api/llm` 호출 문자열 포함
- `desktop-dist/index.html`에 절대 `http://` 또는 `https://` 자산 주소 포함

- [ ] **Step 6: Vite 빌드와 자산 검사**

Run: `pnpm desktop:build && pnpm desktop:verify-assets`

Expected: `desktop-dist/index.html` and required images exist; forbidden strings are absent; both commands exit 0.

- [ ] **Step 7: 웹·데스크톱 전체 검증**

Run: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build && pnpm desktop:build`

Expected: every command exits 0.

- [ ] **Step 8: 커밋**

```powershell
git add desktop src/desktop/main.tsx src/desktop/desktop.css vite.desktop.config.ts scripts/verify-desktop-assets.mjs tests/unit/desktop-build-config.test.ts package.json pnpm-lock.yaml .gitignore package-lock.json # 빌드 경계 스테이징
git commit -m "build: Vite 데스크톱 번들 추가" # 데스크톱 빌드 커밋
```

---
### Task 4: Tauri 2 Windows 셸과 최소 권한

**Files:**

- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/Cargo.lock`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/Tauri.toml`
- Create: `src-tauri/capabilities/default.toml`
- Create: `src-tauri/icons/*`
- Create: `tests/unit/tauri-config.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: Task 3의 `desktop:dev`, `desktop:build`, `desktop-dist`
- Produces: `pnpm tauri:dev`, `pnpm tauri:check`, `pnpm tauri:build`, NSIS 설정

- [ ] **Step 1: 도구 설치 승인과 사전 점검**

Implementation must request approval before installing system tools. Install Microsoft C++ Build Tools의 `Desktop development with C++`, Rust stable-msvc and WebView2 runtime, then verify:

Run: `rustc --version; cargo --version; rustup show active-toolchain; where.exe cl`

Expected: Rust stable MSVC toolchain and the MSVC compiler are available.

- [ ] **Step 2: Tauri 설정 실패 테스트 작성**

```ts
it("Tauri 설정은 NSIS와 외부 연결 차단 CSP를 사용한다", () => // 셸 설정 검증
{ // 테스트 시작
    const config = readFileSync("src-tauri/Tauri.toml", "utf8"); // 설정 읽기
    expect(config).toContain('targets = ["nsis"]'); // NSIS 확인
    expect(config).toContain("connect-src 'none'"); // 외부 연결 차단 확인
}); // 테스트 종료
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run tests/unit/tauri-config.test.ts`

Expected: FAIL because `src-tauri/Tauri.toml` does not exist.

- [ ] **Step 4: 최소 Rust 셸과 권한 구성**

`Cargo.toml`은 Tauri 2 계열의 `config-toml` 기능을 사용한다. `main.rs`는 플러그인과 명령을 등록하지 않고 기본 창만 실행한다. capability에는 `core:default`만 허용하고 shell, fs, http, opener 권한을 넣지 않는다.

`package.json`에는 다음 스크립트를 추가한다.

- `tauri:dev`: `tauri dev`
- `tauri:check`: `cargo check --manifest-path src-tauri/Cargo.toml`
- `tauri:build`: `tauri build --bundles nsis`

- [ ] **Step 5: 제품·창·CSP·WebView2 구성**

`Tauri.toml`에 다음 값을 고정한다. 소스 주석 규칙을 지킬 수 있도록 공식 지원 형식인 TOML을 사용한다.

- productName: `MATE Text-Play Preview`
- version: `0.1.0-preview.1`
- identifier: `com.mateverse.textplay.preview`
- beforeDevCommand: `pnpm desktop:dev`
- devUrl: `http://127.0.0.1:1420`
- beforeBuildCommand: `pnpm desktop:build && pnpm desktop:verify-assets`
- frontendDist: `../desktop-dist`
- bundle targets: `nsis`
- WebView2 installMode: `downloadBootstrapper`
- production CSP: self 자산만 허용하고 `connect-src 'none'`
- development CSP: Vite 개발 서버와 `ws://127.0.0.1:1420`만 추가 허용

- [ ] **Step 6: 브랜드 아이콘 생성**

Run: `pnpm tauri icon public/images/brand/mate-verse-logo-v3.png`

Expected: `src-tauri/icons/icon.ico` and required Windows icon sizes are generated.

- [ ] **Step 7: Rust와 설정 검증**

Run: `pnpm tauri:check && pnpm vitest run tests/unit/tauri-config.test.ts`

Expected: `cargo check` exit 0 and all Tauri config assertions pass.

- [ ] **Step 8: 개발 앱 수동 확인**

Run: `pnpm tauri:dev`

Expected: native window opens directly to the Text-Play home; Mock flow works; no developer console errors or external requests.

- [ ] **Step 9: 커밋**

```powershell
git add src-tauri tests/unit/tauri-config.test.ts package.json pnpm-lock.yaml # Tauri 셸 스테이징
git commit -m "feat: Tauri Windows 셸 추가" # Tauri 셸 커밋
```

---
### Task 5: 데스크톱 플레이·저장·오프라인 E2E

**Files:**

- Create: `playwright.desktop.config.ts`
- Create: `tests/e2e/desktop-preview.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Modify: `src/features/text-play/storage/indexeddb-save-repository.ts` only if an observed WebView-compatible bug requires it

**Interfaces:**

- Consumes: Task 2의 데스크톱 흐름과 Task 3의 Vite 서버
- Produces: `pnpm test:e2e:desktop`, verified IndexedDB reload flow and network boundary

- [ ] **Step 1: E2E 실패 테스트 작성**

```ts
test("Mock 플레이를 저장하고 새 세션에서 이어간다", async ({ page }) => // 저장 흐름 검증
{ // 테스트 시작
    await page.goto("/"); // 데스크톱 홈 진입
    await page.getByRole("button", { name: "새 게임" }).click(); // 새 게임 시작
    await page.getByRole("button", { name: "달빛 등불을 든다" }).click(); // 선택지 진행
    await page.reload(); // 앱 재실행 모사
    await page.getByRole("button", { name: "이어하기" }).click(); // 자동 저장 복원
    await expect(page.getByText("Mock AI")).toBeVisible(); // Mock 표시 확인
}); // 테스트 종료
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test:e2e:desktop`

Expected: FAIL because the desktop Playwright configuration or scripts do not exist.

- [ ] **Step 3: 데스크톱 Playwright 설정 구현**

Vite 서버 명령은 `pnpm desktop:dev --host 127.0.0.1`로 고정한다. 기존 웹 Playwright 설정의 `npm run dev`도 `pnpm dev`로 바로잡되 웹 테스트 경로와 포트는 유지한다.

- [ ] **Step 4: 핵심 사용자 흐름 검증**

E2E에 다음 시나리오를 추가한다.

- 홈 → 새 게임 → 선택지 → 자동 저장 → 새 페이지 → 이어하기
- 자유 입력 → Mock 응답 → 외부 API 요청 0회
- 수동 슬롯 저장 → 장면 진행 → 불러오기
- 저장 삭제 → 빈 슬롯 표시
- 네트워크 라우팅에서 localhost 정적 자산 외 요청 발생 시 즉시 실패

- [ ] **Step 5: E2E와 전체 회귀 검증**

Run: `pnpm test:e2e:desktop && pnpm test:run && pnpm typecheck && pnpm lint && pnpm desktop:build && pnpm desktop:verify-assets`

Expected: all desktop E2E scenarios and repository checks pass.

- [ ] **Step 6: 실제 Tauri 저장 재실행 확인**

`pnpm tauri:dev`에서 자동 저장 생성 → 앱 완전 종료 → 재실행 → 이어하기를 확인한다. WebView2 프로필에서 저장이 유지되지 않을 때만 IndexedDB 저장소를 수정하고 실패 재현 테스트를 먼저 추가한다.

- [ ] **Step 7: 커밋**

```powershell
git add playwright.desktop.config.ts playwright.config.ts tests/e2e/desktop-preview.spec.ts package.json pnpm-lock.yaml src/features/text-play/storage/indexeddb-save-repository.ts # E2E 검증 스테이징
git commit -m "test: 데스크톱 Mock 플레이 흐름 검증" # E2E 검증 커밋
```

---
### Task 6: Windows 설치 EXE와 Release 자산 생성

**Files:**

- Create: `scripts/build-windows-preview.ps1`
- Create: `docs/releases/v0.1.0-preview.1.md`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `docs/DEVELOPMENT-LOG.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**

- Consumes: Task 4의 `pnpm tauri:build`, Task 5의 검증 명령
- Produces: `artifacts/MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe`, `.sha256`, Release 설명

- [ ] **Step 1: 패키징 스크립트의 입력·출력 계약 작성**

`build-windows-preview.ps1`는 저장소 루트에서만 실행하고 다음 순서를 실패 즉시 중단 방식으로 수행한다.

1. 테스트·타입·린트·데스크톱 빌드·자산 검사
2. `pnpm tauri:build`
3. NSIS 결과물 존재 확인
4. 고정 파일명으로 `artifacts/`에 복사
5. SHA-256 계산과 `.sha256` 파일 생성
6. 파일명, 크기, SHA-256을 콘솔에 출력

- [ ] **Step 2: Release 문서 작성**

`docs/releases/v0.1.0-preview.1.md`에 Windows 10·11 x64, Mock 전용, 설치 순서, SmartScreen 가능성, 저장 데이터 제한, WebView2 요구사항, 알려진 문제와 SHA-256 확인 방법을 기록한다.

- [ ] **Step 3: 전체 패키징 실행**

Run: `powershell -ExecutionPolicy Bypass -File scripts/build-windows-preview.ps1`

Expected: the named setup EXE and `.sha256` file exist under `artifacts/`; every verification command exits 0.

- [ ] **Step 4: 로컬 설치·오프라인 수동 검증**

검증 순서:

1. 설치 EXE 실행
2. 프로그램 실행
3. 새 게임·선택지·자유 입력
4. 자동·수동 저장
5. 프로그램 종료와 재실행
6. 이어하기
7. 네트워크 연결 해제 후 동일 흐름
8. 제거·재설치 후 저장 데이터 동작 기록

Expected: spec의 수동 검증 기준을 모두 만족한다. 실패가 있으면 Release 작업을 시작하지 않는다.

- [ ] **Step 5: 문서와 로드맵 갱신**

README에는 Windows 미리보기 실행법을 추가하고, DEVELOPMENT-LOG에는 실제 검증 결과와 제한을 기록한다. ROADMAP의 Windows 개발 실행 파일 항목만 완료 처리하며 MSI, 자동 업데이트, 코드 서명은 미완료로 유지한다.

- [ ] **Step 6: 커밋**

```powershell
git add scripts/build-windows-preview.ps1 docs/releases/v0.1.0-preview.1.md README.md docs/DEVELOPMENT-LOG.md docs/ROADMAP.md .gitignore # 패키징 문서 스테이징
git commit -m "build: Windows 미리보기 설치 파일 준비" # 패키징 준비 커밋
```

---
### Task 7: GitHub Release 게시와 작업 간 전달

**Files:**

- No tracked source changes expected
- Generated: `artifacts/MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe`
- Generated: `artifacts/MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe.sha256`

**Interfaces:**

- Consumes: Task 6의 설치 EXE, SHA-256, Release 문서
- Produces: GitHub Release URL, 직접 다운로드 URL, 검증된 전달 메시지

- [ ] **Step 1: 최종 브랜치 검증**

Run: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build && pnpm desktop:build && pnpm desktop:verify-assets && pnpm test:e2e:desktop && pnpm tauri:check`

Expected: every command exits 0 immediately before publishing.

- [ ] **Step 2: 검증된 커밋을 원격 릴리스 기준 브랜치에 반영**

`superpowers:finishing-a-development-branch` 절차로 구현 브랜치의 통합 방식을 확정한다. 승인된 방식으로 원격에 반영한 뒤 Release 대상 커밋이 원격 기준 브랜치에 포함됐는지 확인한다.

Run: `git merge-base --is-ancestor <verified-commit> origin/main`

Expected: exit 0. 원격 `main`이 아닌 승인된 릴리스 브랜치를 사용할 경우 해당 원격 브랜치로 동일 검사를 수행한다.

- [ ] **Step 3: Release 게시**

GitHub 인증을 확인한 뒤 `v0.1.0-preview.1` 시험판 Release를 만들고 EXE와 `.sha256` 파일을 첨부한다. 본문은 `docs/releases/v0.1.0-preview.1.md`를 사용한다.

Run: `gh release create v0.1.0-preview.1 artifacts/MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe artifacts/MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe.sha256 --prerelease --title "MATE Text-Play Preview 0.1.0-preview.1" --notes-file docs/releases/v0.1.0-preview.1.md`

Expected: GitHub returns the created Release URL and both assets are listed.

- [ ] **Step 4: 게시 자산 재다운로드와 해시 검증**

새 임시 폴더에 Release EXE를 다시 내려받아 로컬 `.sha256` 값과 비교한다.

Expected: remote and local SHA-256 values are identical. A mismatch stops all handoff messages.

- [ ] **Step 5: ChatBot 작업 전달**

대상: Codex 작업 `ChatBot` (`01a0e196-0b75-7711-9af1-419bafde9ed6`)

전달 내용: 제품명, 버전, Release URL, 직접 다운로드 URL, 파일 크기, SHA-256, Windows x64 요구사항, Mock·미서명 시험판 안내, 검증 결과.

- [ ] **Step 6: HomePage 작업 전달**

대상: Codex 작업 `HomePage` (`01a0e195-22cf-7aa1-8208-efafc9092466`)

전달 내용에 홈페이지 다운로드 버튼 구현 요청을 포함한다. 직접 EXE 파일을 저장소에 추가하지 않고 Release 자산 URL을 사용하도록 명시한다.

- [ ] **Step 7: HomePage 후속 범위 확인**

HomePage 작업에서 다운로드 버튼, 버전·크기·시스템 요구사항, SmartScreen 경고와 실제 다운로드 검증을 별도 설계·구현하도록 한다. 이 저장소에서는 HomePage 코드를 수정하지 않는다.

---
## Final Verification

- [ ] `git status --short`에 의도하지 않은 변경이 없다.
- [ ] `pnpm test:run` 전체 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] `pnpm build` 웹 빌드 통과
- [ ] `pnpm desktop:build` 데스크톱 빌드 통과
- [ ] `pnpm desktop:verify-assets` 자산·외부 연결 검사 통과
- [ ] `pnpm test:e2e:desktop` 핵심 사용자 흐름 통과
- [ ] `pnpm tauri:check` Rust 검사 통과
- [ ] NSIS 설치 EXE 생성
- [ ] 로컬 설치·오프라인·재실행 검증 통과
- [ ] Release 재다운로드 SHA-256 일치
- [ ] ChatBot·HomePage 작업 전달 완료
