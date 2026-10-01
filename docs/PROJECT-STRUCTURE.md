---
# 프로젝트 구조 안내

이 문서는 저장소를 처음 보는 사람이 파일의 위치와 역할을 빠르게 이해할 수 있도록 작성합니다. 구조가 바뀌는 커밋에서는 이 문서도 함께 수정합니다.

---
## 프로그램 구성

프로그램은 화면, 기능, 외부 연결, 저장소와 테스트로 나뉩니다.

```text
사용자 입력
  → Next.js 화면
  → Text-Play 세션 제어기
  → 게임 엔진
  → 로컬 저장소

자유 입력
  → 공통 LLM 어댑터
  → 같은 출처 /api/llm
  → 서버 전용 프록시
  → 기존 챗봇 서버 API
  → 구조화 응답 검증
  → 허용된 액션만 게임 엔진에 반영
```

게임 상태의 최종 결정권은 LLM이 아니라 게임 엔진이 가집니다.

웹(Next.js)과 Windows 실행 파일(exe)은 화면 구성이 다릅니다.

| 실행 형태 | 진입점 | 들어 있는 화면 |
| --- | --- | --- |
| 웹 | `src/app` | 예전 Mate Verse 챗봇 화면(`src/features/*`)과 Text-Play |
| exe | `src/desktop/main.tsx` | 최신 ChatBot 전체 기능(`src/chatbot`)과 Text-Play, 왼쪽 사이드바 틀 |

---
## 주요 폴더

### `src/app`

웹의 URL별 화면을 정의합니다. 기존 홈, 보관함, 캐릭터 상세, 채팅과 설정 화면 외에 `src/app/text-play`의 게임 홈과 샘플 플레이 경로가 들어 있습니다. exe는 이 폴더를 쓰지 않습니다.

### `src/chatbot`

[siwoo440/ChatBot](https://github.com/siwoo440/ChatBot) 커밋에서 가져온 소스 사본입니다. `scripts/sync-chatbot.mjs`(`pnpm chatbot:sync`)가 만들며, 가져온 커밋은 `src/chatbot/SOURCE.md`에 적혀 있습니다. `scripts/chatbot-status.mjs`(`pnpm chatbot:status`)는 ChatBot에 가져오지 않은 새 커밋이 있는지 알려 줍니다. 가져오면서 `@/` 별칭을 `@chatbot/`으로, `next/link`·`next/image`·`next/navigation`·`Route` 타입을 `src/desktop/next-compat`으로 바꿉니다. 직접 고치지 말고 ChatBot에서 고쳐 커밋한 뒤 다시 동기화합니다. 함께 가져온 ChatBot 테스트는 `tests/chatbot`에 있습니다.

### `src/desktop`

Windows 실행 파일 화면입니다.

| 경로 | 역할 |
| --- | --- |
| `DesktopApp.tsx` | 경로·ChatBot 상태·Text-Play 플랫폼·설정 공급자 조립 |
| `DesktopRoutes.tsx` | 경로별 화면 출력, 화면 오류 경계, 문서 제목 |
| `router/desktop-routes.ts` | 해시 주소(`#/explore?tag=…`) 해석, 경로표, ChatBot 주소 이동 규칙, 화면 제목, Text-Play 슬롯 이어하기 주소 |
| `router/desktop-areas.ts` | 사이드바 메뉴 순서(메인·탐색·내 작품·Text-Play·설정·고객 지원)와 화면 소속 메뉴, 이전·다음 메뉴 계산 |
| `router/DesktopRouter.tsx` | 해시 기반 경로 공급자와 이동 동작 |
| `next-compat/*` | ChatBot 사본이 쓰는 Next 링크·이미지·경로 도구의 데스크톱 구현 |
| `shell/DesktopShell.tsx` | 왼쪽 사이드바(주요 메뉴, ChatBot 대화방, Text-Play 대화방, 프로그램 메뉴)와 상단 바(이전·다음 메뉴 화살표, 19+, 토큰, 사용자 패널) |
| `shell/TextPlayRoomPanel.tsx` | 사이드바 Text-Play 대화방: Text-Play 저장 슬롯 목록과 슬롯별 이어하기 |
| `shell/DesktopShell.module.css` | 사이드바 디자인. ChatBot 대화방·사용자 패널은 ChatBot `.grid` 스타일을 그대로 쓰고 서랍 배치만 덮어씀 |
| `DesktopPlatformProvider.tsx` | Text-Play 화면 이동·창 해상도·장면 이미지·올라마 연결 |
| `desktop.css` | 창 스크롤바 숨김, 플레이 화면 전체 창 맞춤 |

### `src/components/app-shell`

헤더, 사용자 패널, 대화 패널과 모바일 내비게이션처럼 전체 화면이 공유하는 틀을 관리합니다.

### `src/features/core`

기존 챗봇의 전역 상태와 상태 변경 규칙을 관리합니다. Text-Play 게임 상태는 기존 챗봇 데이터와 섞지 않습니다.

### `src/features/chat`

캐릭터 채팅 화면, 메시지 목록, 입력창과 장면 표시를 관리합니다.

### `src/features/text-play`

Text-Play 전용 기능이 들어 있는 경로입니다.

| 하위 폴더 | 역할 |
| --- | --- |
| `core` | 게임 상태, 조건, 액션, 장면 전환과 엔딩 판정 |
| `data` | 공식 샘플 게임의 선언형 데이터 |
| `ai` | LLM 컨텍스트, 응답 해석과 액션 검증, 작품별 응답 JSON 스키마(내장 로컬 AI 형식 강제) |
| `storage` | 자동 저장과 수동 저장 슬롯 |
| `catalog` | 메인 화면 작품 목록(실제 샘플 1개와 Mock 작품), 장르 판정과 검색 필터 |
| `session` | 화면·엔진·LLM·저장소 연결 |
| `platform` | 웹·데스크톱별 화면 이동, 이미지 출력, 웹 진입 시 앱 패널 닫기 |
| `preferences` | 테마·창 해상도·AI 선택 설정 저장과 적용 |
| `ui` | 홈, 플레이, 상태, 인벤토리와 세이브 화면, 추천 답안 생성과 스트리밍 서술 추출 |

### `src/lib/adapters`

LLM과 이미지 생성 기능을 앱에서 사용할 수 있는 공통 인터페이스로 감쌉니다. `create-llm-adapter.ts`가 Mock 모드와 서버 모드를 선택하고, `http-llm-adapter.ts`가 Character Chat과 Text-Play의 요청을 같은 `/api/llm` 경로로 보냅니다. `structured-messages.ts`는 Text-Play 구조화 응답 메시지를, `chat-messages.ts`는 캐릭터 대화·요약 메시지를 만들어 올라마 연결과 내장 AI가 함께 씁니다. `bundled-llm-adapter.ts`는 이 PC의 내장 AI 어댑터이며 구조화 응답에 작품 JSON 스키마를 함께 보냅니다(데스크톱 통신은 `src/desktop/tauri-bundled-client.ts`, Rust 쪽은 `src-tauri/src/bundled_ai.rs`, 실행 엔진을 켜고 끄는 관리자는 `src-tauri/src/local_runtime.rs`). 실제 비밀키는 포함하지 않습니다.

### `src/lib/server`

`llm-proxy.ts`가 요청 크기와 모드를 검증하고 외부 LLM 서버로 전달합니다. 브라우저의 쿠키·인증 헤더는 전달하지 않으며 서버 환경 변수의 주소와 토큰만 사용합니다. 외부 서버가 설정되지 않았거나 응답할 수 없으면 안전한 오류 상태를 반환합니다.

### `src/lib/repositories`

브라우저 저장소에 접근하는 코드입니다. 기존 캐릭터와 설정 데이터는 현재 localStorage를 사용합니다. Text-Play 세이브는 별도 IndexedDB 저장소를 사용하도록 설계했습니다.

`src/features/text-play/storage/browser-save-repository.ts`는 브라우저의 IndexedDB 저장소를 선택하고, IndexedDB를 사용할 수 없는 환경에서는 메모리 저장소로 대체합니다.

### `scripts`

빌드·검사·ChatBot 동기화 명령의 본체입니다. 내장 로컬 AI 작업 0 도구는 `scripts/local-ai`(고정 버전 목록, 평가 문맥 30개와 응답 판정), `scripts/lib`(이어받기 다운로드·해시, 측정 요약·보고서)와 `fetch-llama-runtime.mjs`·`build-local-models.mjs`·`evaluate-local-models.mjs`(`pnpm local-ai:runtime`·`local-ai:models`·`local-ai:eval`)입니다. 받은 실행 엔진·모델과 측정 결과는 Git에서 제외한 `.local-ai/`에 둡니다.

### `tests`

기능 단위, 화면 단위와 전체 흐름을 자동 검증합니다. 기능 추가는 실패 테스트를 먼저 작성하고 실제 실패를 확인한 뒤 구현합니다.

### `docs`

제품 설계, 작업 계획, 실행 안내와 누적 개발 기록을 보관합니다.

`HANDOFF.md`는 다른 컴퓨터나 새 챗봇 세션에서 최신 `main` 작업을 이어가기 위한 준비 사항, 검증 결과와 전달 문장을 보관합니다.

---
## 데이터 분리 원칙

- 기존 Character Chat 데이터와 Text-Play 세이브 분리
- 작품 ID와 저장 슬롯 ID를 조합한 저장 키 사용
- LLM 서술과 게임 상태 변경 액션 분리
- 검증되지 않은 LLM 액션 적용 금지
- 브라우저와 실행 파일의 비밀키 저장 금지

---
## 아직 없는 구성

- 실제 LLM 서버 주소·모델·인증·응답 계약 연결
- 실제 계정과 크레딧 정책 연동
- `.mateplay` 설치·검증 기능
- 자동 업데이트와 코드 서명
- 웹 화면의 최신 ChatBot 코드 반영(웹은 예전 챗봇 코드 유지)

없는 기능은 완료된 것처럼 표시하지 않고 개발 기록의 미완료 항목으로 관리합니다.
