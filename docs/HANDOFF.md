---
# 작업 인수인계

이 문서는 다른 컴퓨터나 새 챗봇 세션에서 `main` 브랜치의 최신 상태를 받아 바로 작업을 이어가기 위한 기준 문서입니다. 마지막 갱신은 2026-10-01입니다.

---
## 기준 저장소

- 저장소: [siwoo440/Text-Play](https://github.com/siwoo440/Text-Play)
- 작업 브랜치: `main` 하나만 사용
- 기준 소스 커밋: `2115f42e214409f4b37f2758bab8561f0807244c` (`기능: exe에 최신 ChatBot 전체 기능과 왼쪽 사이드바 데스크톱 화면 추가`)
- 포함한 ChatBot 커밋: `03da2e4` (`src/chatbot/SOURCE.md`, 확인은 `pnpm chatbot:status`)
- 현재 커밋 확인: `git rev-parse HEAD`
- 원격 동기화 확인: `git status --short --branch`
- 확인 기준 화면: **Windows 실행 파일(exe)**. 웹 화면은 보조로 확인합니다.
- 기본 인공지능: 외부 비밀키가 필요 없는 임시 인공지능(Mock)
- 로컬 인공지능: 설치된 올라마 모델 조회·선택 지원, 통신 범위 `127.0.0.1:11434`로 제한

---
## 2026-10-01 커밋 기록 정리

- 9월 커밋 26개를 기능 단위 6개로 합치고 메시지를 한국어로 바꿔 `main`에 강제 푸시했습니다.
- 2026-10-01 이전에 받아 둔 복제본은 기록이 다르므로 `git fetch origin` 후 `git reset --hard origin/main`으로 다시 맞춥니다. 커밋하지 않은 수정이 있으면 먼저 따로 보관합니다.

| 커밋 | 내용 |
| --- | --- |
| `f0e3315` | 공통 LLM 서비스 연결 기반 |
| `c0349e9` | Tauri 기반 Windows 시험판 실행 프로그램 |
| `7158bb3` | 게임 화면 개편과 설정·테마·6칸 저장 |
| `79f2e78` | 이야기 턴 이동과 턴 수 표시 |
| `9662525` | 로컬 올라마 인공지능 연결 |
| `f0ace2e` | 작업 인수인계 안내 |
| `98b8e46` | AI 추천 답안 접기·펼치기와 명령 도크 카드 디자인 |
| `ac5f27e` | 웹 화면 불일치 오류·응답 원문 표시 수정, 테스트·개발 환경 정리 |
| `32f0557` | Tauri API 버전 불일치로 실패하던 exe 빌드 수정, `pnpm exe:rebuild` 추가 |
| `70c7c23` | exe 스크롤바 제거와 창 크기 맞춤 |
| `f54fa3f` | exe 메인 화면을 ChatBot 밝은 다채색 탐색 화면 구성으로 변경 |
| `8fae1be` | exe 플레이 화면 명령 도크를 장면 무대 아래로 변경 |
| `d23df47` | ChatBot 비교 기반 Text-Play 추가 작업 기획 문서 |
| `2115f42` | exe에 최신 ChatBot 전체 기능, 왼쪽 사이드바·Text-Play 대화방, ChatBot 동기화 명령 |

---
## 작업 규칙

- 답변과 문서는 한국어로 작성합니다.
- 브랜치는 `main` 하나만 사용하고, 검증이 끝나면 커밋과 푸시까지 진행합니다.
- 기능 추가와 버그 수정은 실패하는 테스트를 먼저 쓰고 실제 실패를 확인한 뒤 구현합니다.
- 코드는 Allman 스타일(여는 중괄호를 다음 줄에)과 각 줄의 짧은 한글 주석 규칙을 따릅니다.
- 커밋 메시지는 한국어로 `기능:`·`수정:`·`문서:` 머리말을 붙이고, 본문에 이전 버전과 비교한 변경점을 `~추가`, `~수정`, `~변경`, `~삭제` 형태로 적습니다.
- 커밋 메시지에 `Co-Authored-By: Claude …` 같은 공동 작업자 줄을 넣지 않습니다.
- 기능·구조가 바뀌면 `docs/DEVELOPMENT-LOG.md`, `docs/PROJECT-STRUCTURE.md`, `README.md`, 이 문서를 함께 갱신합니다.
- **exe는 ChatBot 기능을 계속 똑같이 따라갑니다.** 작업을 시작할 때 `pnpm chatbot:status`로 ChatBot(`../ChatBot`)의 새 커밋을 확인하고, 있으면 `pnpm chatbot:sync` → `pnpm test:run`·타입 검사·코드 검사·데스크톱 통합 테스트 → `pnpm exe:rebuild` 확인 → 커밋 순서로 반영합니다. `pnpm exe:rebuild`도 빌드 전에 새 커밋 여부를 알려 줍니다.

---
## 현재 구현 상태

### 실행 파일 전체 구성 (`src/desktop`)

- exe는 **최신 ChatBot 전체 기능 + Text-Play**를 하나의 프로그램으로 제공합니다. 웹 화면(`src/app`)은 예전 챗봇 코드를 그대로 둡니다.
- ChatBot 기능: 메인(검색·장르·오늘의 추천·랭킹), 탐색(태그), 캐릭터 상세·만들기·수정, 대화(버전 분기·다시 생성·내보내기), 보관함, 설정 5쪽(프로필·토큰·화면·알림·개인정보), 고객 지원, 19+ 성인 인증
- ChatBot 소스는 `src/chatbot`에 ChatBot 커밋 그대로 복사합니다(`pnpm chatbot:sync`, 현재 기준 `03da2e4` `개인정보처리방침과 이용약관 초안 추가`(2026-10-08, 커밋 66개: 다크 모드, 관계 스탯, 출석과 미션, 친구 초대, 한국어/영어, 실제 AI 통로, 로그인 틀 등), 기록은 `src/chatbot/SOURCE.md`). 직접 고치지 않고 ChatBot에서 고쳐 커밋한 뒤 다시 동기화합니다. ChatBot 앱 상태 버전이 오르면 exe에 저장된 ChatBot 데이터도 ChatBot 변환 규칙으로 자동 갱신됩니다(예: 9 → 10). ChatBot에 새 화면 주소가 생기면 `src/desktop/router/desktop-routes.ts`·`desktop-areas.ts`·`DesktopRoutes.tsx`에도 추가합니다(예: 스토리 모드 `/stories`, 이미지 스튜디오 `/images`). ChatBot 코드가 Next 공개 환경 값(`process.env.NEXT_PUBLIC_*`)을 새로 읽으면 Vite에는 `process`가 없어 화면이 깨지므로 `vite.desktop.config.ts`의 `define`에 같은 이름을 추가합니다(예: `NEXT_PUBLIC_SERVICE_REGION`, 기본 `kr`). ChatBot 머리 메뉴에 생긴 요소(예: 알림함)는 데스크톱 상단 바에도 둡니다. ChatBot 셸 안에서만 적용되는 스타일은 `AppShell.module.css`의 `.shell`로 감싸고 높이·바탕만 끕니다(`DesktopShell.module.css` `.chatbotHost`). ChatBot 셸(`AppShell.tsx`)이 하는 일은 exe 틀(`DesktopShell.tsx`)에도 똑같이 둡니다: 테마 적용(`data-theme`·`mateverse:theme` 저장)과 다크 모드 스위치, 이용 시간 알림, 19+ 보기 끔 안내, 받을 보상 점, 사용자 패널의 출석·미션 카드·로그아웃·19+ 보기 끄기, 계정 맞추기(`AccountSync`). exe에는 Next 서버가 없어 ChatBot의 `/api/chat`(실제 AI 통로)은 닿지 않고(보안 규칙이 막음) 연습용 AI로 답합니다. 계정 서비스 환경 값도 비워 두어 로그인은 연습용으로만 동작합니다. ChatBot 테스트 준비 파일(`src/chatbot/test/setup.ts`)은 `src/test/setup.ts`가 브라우저 환경일 때 불러오고, 데스크톱 통합 테스트는 브라우저 언어를 한국어로 고정합니다(ChatBot 자동 언어).
- 디자인: ChatBot과 같은 밝은 다채색·장르색을 쓰되, 웹 상단 헤더 대신 **왼쪽 사이드바(320px)**와 **상단 바**를 둡니다. 사이드바 오른쪽에 ChatBot 헤더의 여러 색 띠를 세로로 둡니다.
  - 사이드바 위→아래: 로고와 주황 `Text-Play` 표시 → 주요 메뉴(메인·탐색·내 작품·Text-Play) → **ChatBot 대화방**(ChatBot 왼쪽 창 목록 그대로: 검색·정렬·고정·묶음·턴 수·더보기 메뉴, 아래에 `ChatBot 기록 가져오기`) → **Text-Play 대화방**(Text-Play 저장 기록, 누르면 그 슬롯에서 이어하기, `＋ Text-Play 작품 고르기`) → 프로그램 메뉴(설정·고객 지원)
  - ChatBot 대화방 목록과 사용자 패널의 안쪽 모양은 ChatBot `AppShell.module.css`의 `.grid` 스타일을 그대로 쓰고, 서랍 위치·폭·그림자만 `DesktopShell.module.css`에서 덮어씁니다. ChatBot이 목록을 바꾸면 동기화만으로 모양까지 따라옵니다.
  - 창 높이 760px 이하에서는 영역을 나눠 자르지 않고 사이드바 전체가 스크롤됩니다.
  - 상단 바: **‹ › 화살표는 사이드바 메뉴 순서(메인 → 탐색 → 내 작품 → Text-Play → 설정 → 고객 지원)로 이전·다음 메뉴 이동**(처음·끝에서 비활성, 브라우저 기록 이동 아님), 현재 화면 제목, 19+, 토큰 잔액, 사용자 패널 팝업. 메뉴에 없는 화면은 소속 메뉴 기준으로 이동하고 사이드바에 소속 메뉴를 표시합니다(상세·대화 → 메인, 캐릭터 만들기·수정 → 내 작품, 설정 세부 → 설정).
- ChatBot 기록 가져오기: 웹 ChatBot(브라우저)과 exe는 저장소가 따로라 자동으로 합쳐지지 않습니다. 웹 ChatBot의 `설정 → 개인정보 및 보안 → JSON 내보내기` 파일을 exe의 `ChatBot 기록 가져오기`(데이터 관리)에서 가져오면 그 시점 기록으로 바뀝니다(바꾸기 전 자동 백업).
- 경로는 해시 주소(`#/explore?tag=힐링`)로, 새로고침과 창 기록 뒤로 가기가 유지됩니다. Text-Play 홈은 `#/text-play`, 플레이는 `#/text-play/play?mode=new|resume[&slot=manual-N]`이며 플레이 화면은 사이드바 없이 전체 창으로 엽니다.
- 대화 화면·보관함·편집기는 ChatBot 원본도 아직 어두운 디자인(ChatBot 디자인 3~5단계 예정)이라 그대로 어둡게 보입니다.

### Text-Play 메인 화면 (`src/features/text-play/ui/TextPlayHome.tsx`)

- ChatBot 최신 디자인(밝은 다채색)과 같은 구성: 흰 헤더와 하단 여러 색 띠, 여러 색 원형 그라데이션 바탕, 큰 제목과 검색창, 장르색 칩, 오늘의 작품, 인기 랭킹 TOP 10, 전체 작품과 `작품 더 보기`
- Text-Play 대표색은 주황(`#c2410c`), 장르색은 ChatBot과 같은 값(힐링 초록, 판타지 보라, 현대 주황, 로맨스 분홍, 미스터리 남색, SF 청록)
- 작품 목록(`src/features/text-play/catalog/text-play-catalog.ts`): 실제 플레이 가능한 `달빛 숲의 기록` 1개와 캐릭터 일러스트 기반 Mock 작품 50개(`준비 중` 표시)
- 작품 카드를 누르면 밝은 상세 창, 준비 중 작품은 플레이 버튼 비활성
- 이어하기 요약은 장면 제목으로 표시(예: `이어하기 · 폐허 회랑 · 2분 5초`)
- exe에서는 사이드바 틀 안에 자체 헤더 없이 표시하고 창 스크롤바는 숨김
- 웹(`/text-play`)에서도 Mate Verse 앱 헤더가 있으므로 자체 헤더를 숨김(`showHeader` 속성)

### 게임 플레이 화면 (`src/features/text-play/ui/TextPlayScreen.tsx`)

- 아직 **어두운 기존 디자인**입니다. 메인과 색 분위기가 다릅니다.
- 장면 이미지, 반투명 이야기 상자, 이전·다음 턴 이동과 현재 턴·전체 턴 표시
- 상단 상태 표시줄(체력·정신력·골드), 저장·불러오기, AI 선택, 설정
- 명령 도크는 장면 무대 **아래**에 배치(위 무대·아래 도크 한 열, 좌우 여백은 이야기 상자와 같음)
- 명령 도크: `AI 추천 답안`은 접힌 막대로 시작해 누르면 도크가 위로 커지며 답안 3개를 한 줄로 표시(선택지가 부족하면 자유 행동 추천으로 채움), 턴이 바뀌면 다시 접힘
- `행동 직접 입력` 카드는 제목·입력칸·전송 버튼 가로 한 줄, 응답 생성 중에는 `응답 생성 중…` 안내와 서술만 표시
- 창 높이 760px 이하에서는 이야기 상자·추천 답안·입력 카드를 줄이는 배치

### 공통

- Tauri 기반 Windows x64 실행 파일과 NSIS 설치 파일
- 자동 저장과 2×3 수동 저장 슬롯의 저장·불러오기·삭제
- 테마 3종과 창 해상도 설정(맞춤, 1280×720, 1600×900, 1920×1080)
- 임시 인공지능과 로컬 올라마 모델 선택, 응답 스트리밍·생성 중단·오류 안내
- 설정 형식 버전 1에서 버전 2로의 이전
- 웹 Text-Play 진입 시 화면을 가리는 앱 패널 자동 닫기, 화면별 브라우저 탭 제목
- 기존 캐릭터 챗봇 데이터와 Text-Play 저장 데이터 분리

---
## 디자인 기준

- 기준: [siwoo440/ChatBot](https://github.com/siwoo440/ChatBot) 커밋 `4fbbd3e` (`공통 틀과 메인 탐색 화면을 밝은 다채색 디자인으로 개편`)
- 참고 파일: ChatBot의 `src/app/globals.css`(색 변수·장르색), `src/features/discovery/DiscoveryHome.module.css`(메인 화면), `src/components/app-shell/AppShell.module.css`(헤더)
- 같은 값을 Text-Play의 `src/features/text-play/ui/TextPlayHome.module.css`에 옮겨 두었습니다. ChatBot을 받지 않아도 작업할 수 있습니다.
- ChatBot은 그 뒤에도 `5c141f5`(탐색 페이지 추가와 헤더 메뉴 개편), `3ae9f7d`(인수인계 갱신)까지 진행되었습니다. 메인 디자인을 다시 맞출 때는 ChatBot 최신 커밋을 먼저 확인합니다.

---
## 새 컴퓨터 준비 사항

- Git
- Node.js `20.9.0` 이상 (검증 환경 `24.19.0`)
- pnpm `11.19.0`
- exe 빌드: Rust(`winget install --id Rustlang.Rustup -e`, 검증 환경 `1.98.1`), Visual Studio 또는 Build Tools의 C++ 데스크톱 개발 도구, WebView2
- 통합 테스트: `pnpm exec playwright install chromium`
- Rust 프로젝트 선언 최소 버전은 `1.77.2`

---
## 처음 받아서 실행하는 순서

1. `git clone https://github.com/siwoo440/Text-Play.git`
2. `cd Text-Play`
3. `corepack enable`
4. `corepack prepare pnpm@11.19.0 --activate`
5. `pnpm install --frozen-lockfile`
6. exe로 확인: `pnpm exe:rebuild` (첫 빌드는 Rust 의존성 컴파일로 약 5~6분)
7. 웹으로 확인: `pnpm dev --hostname 127.0.0.1 --port 3001` 후 `http://127.0.0.1:3001/text-play`

임시 인공지능과 로컬 올라마 모드는 비밀키 없이 사용할 수 있습니다. 실제 서버 모드는 `.env.example`을 참고해 별도 계약 정보가 있을 때만 설정합니다.

---
## 실행 파일(exe)로 확인하며 수정하기

- 실시간 수정: `pnpm tauri:dev` — 실제 실행 프로그램 창에서 화면 코드 변경이 바로 반영
- 실행 파일 교체: `pnpm exe:rebuild` — 실행 중인 앱 종료, 실행 파일만 다시 빌드, 새 실행 파일 실행
- 실행 파일 위치: `src-tauri/target/release/mate-text-play-preview.exe` (설치 없이 실행)
- 설치 파일: `pnpm tauri:build` → `src-tauri/target/release/bundle/nsis/MATE Text-Play Preview_0.1.0-preview.1_x64-setup.exe`
- 소요 시간(2026-10-01 측정): 첫 빌드 약 5분 30초, 이후 `pnpm exe:rebuild` 약 1분~1분 35초
- 브라우저로 exe 화면 확인: `pnpm desktop:dev` 후 `http://127.0.0.1:1420` (exe에 들어가는 것과 같은 화면 묶음)
- Tauri 자바스크립트 패키지(`@tauri-apps/api`, `@tauri-apps/cli`)와 Rust 크레이트(`tauri`)는 주·부 버전이 같아야 빌드됩니다. 단위 테스트가 이를 검사합니다.

---
## 주요 파일

| 경로 | 역할 |
| --- | --- |
| `src/desktop/DesktopApp.tsx` | exe 공급자 조립(경로·ChatBot 상태·Text-Play) |
| `src/desktop/DesktopRoutes.tsx` | 경로별 화면 출력, 화면 오류 경계, 문서 제목 |
| `src/desktop/router/desktop-routes.ts` | 해시 주소 해석·경로표·화면 제목 |
| `src/desktop/router/desktop-areas.ts` | 사이드바 메뉴 순서와 화면 소속 메뉴(상단 바 화살표 기준) |
| `src/desktop/shell/DesktopShell.tsx` | 왼쪽 사이드바·상단 바·사용자 패널 팝업 |
| `src/desktop/shell/TextPlayRoomPanel.tsx` | 사이드바 Text-Play 대화방(저장 기록) |
| `src/desktop/next-compat/*` | ChatBot 사본용 Next 링크·이미지·경로 도구 |
| `src/chatbot/SOURCE.md` | 가져온 ChatBot 커밋 기록 |
| `scripts/sync-chatbot.mjs` | ChatBot 커밋에서 소스·테스트·자산 가져오기(`pnpm chatbot:sync`) |
| `scripts/chatbot-status.mjs` | ChatBot 새 커밋 확인(`pnpm chatbot:status`, `--check`는 새 커밋이 있으면 실패 코드) |
| `src/desktop/desktop.css` | exe 창 스크롤바 숨김, 플레이 화면 전체 창 맞춤 |
| `src/features/text-play/ui/TextPlayHome.tsx` | 메인 화면 |
| `src/features/text-play/catalog/text-play-catalog.ts` | 작품 목록·장르·검색 |
| `src/features/text-play/ui/TextPlayScreen.tsx` | 게임 플레이 화면 |
| `src/features/text-play/ui/ChoiceList.tsx` | AI 추천 답안 접기·펼치기 |
| `src/features/text-play/data/demo-package.ts` | 샘플 작품 장면·선택지·엔딩 |
| `src/lib/adapters/mock-llm-adapter.ts` | 임시 인공지능 응답 |
| `scripts/rebuild-local-exe.ps1` | `pnpm exe:rebuild` 본체 |
| `scripts/local-ai/local-ai-pins.mjs` | 내장 로컬 AI 고정 버전(llama.cpp 빌드·SHA-256, 공식 모델 리비전·생성 설정) |
| `scripts/local-ai/text-play-eval.ts` | 내장 로컬 AI 평가 문맥 30개와 응답 판정 |
| `src/features/text-play/ai/response-json-schema.ts` | 작품별 AI 응답 JSON 스키마(내장 로컬 AI 형식 강제) |

---
## 검증 명령

- 단위·컴포넌트·통합 테스트: `pnpm test:run`
- 타입 검사: `pnpm typecheck` (`next typegen`으로 `next-env.d.ts`를 먼저 생성)
- 코드 검사: `pnpm lint`
- 웹 운영 빌드: `pnpm build`
- 웹 통합 테스트: `pnpm test:e2e` (운영 빌드 후 `127.0.0.1:3100`에서 실행하므로 `pnpm dev`가 켜져 있어도 동작)
- 데스크톱 화면 빌드: `pnpm desktop:build`
- 데스크톱 자산 검사: `pnpm desktop:verify-assets`
- 데스크톱 통합 테스트: `pnpm test:e2e:desktop` (포트 1420을 쓰므로 `pnpm desktop:dev`를 먼저 종료, 1420 서버가 이미 떠 있으면 `node node_modules/@playwright/test/cli.js test --config playwright.desktop.config.ts`)
- ChatBot 새 기능 확인과 가져오기: `pnpm chatbot:status`, `pnpm chatbot:sync` (ChatBot 저장소가 Text-Play 옆 `../ChatBot`에 있어야 함)
- 내장 로컬 AI 측정 준비와 측정: `pnpm local-ai:runtime`, `pnpm local-ai:models`, `pnpm local-ai:eval` (작업 폴더 `.local-ai/`는 Git 제외, 계획 문서의 `작업 0 준비 상태` 참고). 이 PC처럼 그래픽 장치가 여럿이면 `--backends vulkan:Vulkan0,cpu`처럼 장치를 고름
- 만든 엔진·모델을 exe에 적용: `pnpm local-ai:install`(SHA-256 확인 후 `%LOCALAPPDATA%\MATE Text-Play\{runtime,models}`로 복사) → exe `AI 모델` 화면에서 `사용하기`
- 내장 AI를 모델 없이 exe에서 확인: 가짜 서버(`node scripts/local-ai/fake-openai-server.mjs` + `MATE_TEXT_PLAY_BUNDLED_AI_URL`) 또는 가짜 엔진(`fake_llama_server` 예제 + `MATE_TEXT_PLAY_LLAMA_RUNTIME_DIR`·`MATE_TEXT_PLAY_BUNDLED_MODEL`). 화면 조작은 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333`으로 exe를 띄워 Playwright `connectOverCDP`로 함(계획 문서 진행 상태 참고)
- Rust 검사: `pnpm tauri:check`
- Windows 설치 파일 빌드: `pnpm tauri:build`

---
## 2026-10-01 새 복제본 검증 결과

- GitHub 원격 저장소에서 빈 임시 폴더로 `main` 복제 성공, 기준 소스 커밋 `f54fa3f` 확인
- 복제 직후 `next-env.d.ts`가 없는 상태에서 시작
- 잠금 파일 기준 의존성 428개 설치 성공
- 테스트 파일 55개와 테스트 233개 통과
- 타입 검사(`next typegen` 자동 생성 포함)와 코드 검사 통과
- 데스크톱 화면 빌드와 오프라인 자산 검사 통과
- Next.js 운영 빌드 통과, 빌드 후 작업 폴더 변경 없음
- 작업 컴퓨터에서 데스크톱 통합 테스트 5개, 웹 통합 테스트 1개 통과
- 작업 컴퓨터에서 `pnpm exe:rebuild`로 exe를 만들고 메인 화면 표시 확인

인수인계 문서 갱신은 제품 코드 변경이 아니므로 위 기준 소스의 검증 결과를 그대로 사용합니다.

---
## 확인된 주의점

- Next.js 16은 같은 폴더에서 개발 서버를 하나만 허용합니다. 이미 띄운 서버가 있으면 그 주소를 사용합니다.
- `next-env.d.ts`는 Git에서 제외했습니다. `pnpm dev`, `pnpm build`, `pnpm typecheck`가 자동으로 만듭니다.
- 전체 테스트를 병렬로 돌리면 부하로 느려질 수 있어 테스트 시간 제한을 15초로 두었습니다.
- Playwright의 버튼 이름 찾기는 부분 일치입니다. `이어하기`와 `바로 이어하기`처럼 겹치는 이름은 `exact: true`를 씁니다.
- Windows PowerShell 5.1에서 실행하는 `.ps1` 스크립트에 한글 출력이 있으면 UTF-8 BOM으로 저장해야 글자가 깨지지 않습니다.
- 백그라운드에서 exe를 실행하면 창이 최소화된 상태로 뜰 수 있습니다. 작업 표시줄에서 열면 됩니다.
- 올라마가 설치되어 있어도 `127.0.0.1:11434` 서비스가 실행 중이 아니면 모델 조회와 응답 생성이 되지 않습니다. 작업 컴퓨터에는 올라마가 없어 exe에서 로컬 모델 연결은 직접 확인하지 못했습니다.
- 실제 챗봇 서버 주소, 모델, 인증 방식과 크레딧 정책은 아직 확정되지 않았습니다.
- Windows 설치 파일은 코드 서명이 없어 SmartScreen 경고가 표시될 수 있습니다.
- 버전 번호가 아직 `0.1.0-preview.1`이라 설치 파일만으로는 빌드를 구분할 수 없습니다.
- `src/chatbot`과 `tests/chatbot`은 동기화할 때마다 지우고 다시 만듭니다. 이 폴더를 직접 고치면 다음 동기화에서 사라집니다.
- 동기화는 ChatBot의 **커밋**(기본 `origin/main`)에서만 가져오고 작업 폴더의 커밋하지 않은 수정은 가져오지 않습니다. 다른 세션이 ChatBot을 고치는 중이면 `pnpm chatbot:status`가 알려 줍니다.
- 같은 이름의 공용 이미지는 웹 화면 보호를 위해 덮어쓰지 않고 경고만 냅니다(줄바꿈 차이는 무시).
- exe에 ChatBot 프롤로그 이미지(약 18MB)가 들어가 실행 파일이 약 44MB입니다.
- Vite 개발 서버가 같은 파일의 연속 수정을 놓쳐 예전 코드를 보낼 때가 있습니다. 데스크톱 통합 테스트가 이상하게 실패하면 1420 서버를 다시 띄우고 확인합니다.
- 내장 로컬 AI의 실행 엔진·모델 가중치 다운로드는 외부 실행 파일·데이터를 들여오는 작업이라 Claude 작업 세션의 자동 권한 검사에서 막힐 수 있습니다. 막히면 사용자가 `pnpm local-ai:*` 명령을 직접 실행하거나 허용한 뒤 이어서 진행합니다.

---
## 이어서 진행할 작업

0. 내장 로컬 인공지능: 설치 때 가벼운 모델(Mi:dm 2.0 Mini) 자동 준비, 표준·고성능(Qwen3.5-4B·9B)은 `AI 모델` 화면 다운로드 버튼. 계획 `docs/plans/2026-10-01-bundled-local-ai.md` 참고. 사용자 지시로 **기반을 먼저 만들고 기능을 덧붙이는 순서**로 진행: 기반 1 `AI 연결 통로` 완료 → 기반 2 `엔진 관리자` 완료(`local_runtime.rs`) → 기반 3 `모델 보관함` 완료(`hardware.rs`·`model_store.rs`·`resources/model-catalog.json`, 받기 정보는 아직 비어 `준비 중`) → 기반 4 `AI 모델` 화면 완료(`src/desktop/ai-models`, 사이드바 `설정 · AI 모델 · 고객 지원`) — **기반 완성** → 가벼운 모델 Mi:dm 2.0 Mini를 받아 만들고 exe에 적용 완료(Q4_K_M 1.33GiB, 측정·SHA-256은 계획 문서 `가벼운 모델 … 적용`). 응답 품질 1차 완료(쉬운 말 문맥·이야기꾼 규칙·예시, AI 행동은 능력치·관계·아이템만, 잘못된 행동만 빼고 반영, 발화자는 등장인물만). 다음 덧붙이기: 응답 품질 2차(상태 잘못 읽기·예시 따라 쓰기) → 표준·고성능 모델 받기·측정 → 보관 위치(결정 1)와 받기 정보 → 설치 프로그램. 끝의 결정 필요 항목 4개도 확인
0-1. 한국어·영어 나누기(계획 `docs/plans/2026-10-01-language-ko-en.md`, 범위는 앱 전체, 언어는 Text-Play 설정 창에서 고름): 1단계 언어 설정 완료 → 2단계 AI 답변 언어 완료(English를 고르면 다음 답변부터 영어) → 3단계 화면 글자 영어판 완료(Text-Play 화면·사이드바 메뉴·상단 바·AI 모델 화면, 사전 파일은 계획 문서 진행 기록) → 4단계 완료(2026-10-08: ChatBot `settings.language`와 Text-Play 설정 언어를 `DesktopLanguageBridge.tsx`로 양방향 연결, 플레이 화면은 ChatBot `AppProvider` 밖에 둬서 언어를 바꿔도 게임 유지). 메인 작품 50개 영어판 완료. 남은 한국어: ChatBot 작품 내용(방침), 엔진 실패 이유 문구
0-2. (완료 2026-10-01) ChatBot 대화 화면의 밝은 디자인: ChatBot `a337460`·`dd8fddb`를 동기화해 exe 대화 화면이 웹과 같아짐
1. exe에서 ChatBot 기능 직접 확인: JSON 내보내기·백업 파일 저장, 링크 복사, `window.confirm` 확인 창이 WebView2에서 동작하는지
2. exe 메인 화면 아래쪽(인기 랭킹, 전체 작품, 작품 상세 창) 직접 확인과 세부 디자인 조정
3. 게임 플레이 화면을 메인과 같은 밝은 다채색 디자인으로 변경
4. 엔딩 화면 추가(엔딩 제목·요약, `처음부터`·`메인으로` 버튼)와 엔딩 뒤 직접 입력 막기
5. (완료 2026-10-01) 사용자에게 보이는 내부 식별자 수정: 장면 위 장소(`FOREST-GATE`), 대사 화자(`lyra`) → 표시 이름으로 변경
6. 콘텐츠 보강: 장면별 추천 행동 데이터, 장면에 맞는 이미지, 임시 인공지능 응답 다양화, 장면 수 확대
7. 문서 정리: 개발 기록 누락분(게임 화면 개편·턴 이동·올라마 연결) 보충, README·로드맵의 `수동 저장 3개` 표기와 `Mock 시험판` 설명 수정
8. 빌드마다 버전 올리기와 GitHub Release 게시
9. `.mateplay` 콘텐츠 패키지 규격과 설치 기능
10. 외부 결정이 필요한 작업: 웹 ChatBot과 exe 기록의 자동 동기화(서버나 공유 파일 필요), 실제 챗봇 서버 API·인증·크레딧, MSI·자동 업데이트·Windows 코드 서명
11. ChatBot 기획안 참고: `docs/plans/2026-10-01-chatbot-feedback-work-plan.md`

---
## 새 챗봇 세션에 전달할 문장

`https://github.com/siwoo440/Text-Play` 저장소의 `main` 최신 커밋을 받아 `docs/HANDOFF.md`를 먼저 읽고 이어서 작업해 주세요. 확인 기준은 Windows 실행 파일(exe)이며 `pnpm exe:rebuild`로 고친 내용을 exe에 반영해 확인합니다. 기존 변경을 되돌리지 말고, 현재 상태와 `이어서 진행할 작업`을 확인한 뒤 수정하세요. exe는 ChatBot 기능을 계속 똑같이 따라가야 하므로 작업 시작 때 `pnpm chatbot:status`로 ChatBot 새 커밋을 확인하고, 있으면 `pnpm chatbot:sync`로 가져와 검증한 뒤 반영하세요. 모든 작업은 `main` 하나만 유지하고, 실패하는 테스트를 먼저 쓴 뒤 구현하며, 검증이 끝나면 커밋과 푸시까지 진행하세요. 답변과 문서는 한국어로 작성하고, 코드에는 Allman 스타일과 각 줄의 짧은 한글 주석 규칙을 적용하세요. 커밋 메시지는 한국어로 이전 버전 대비 변경점을 `~추가/~수정/~변경/~삭제`로 적고, Claude 공동 작업자 줄은 넣지 마세요.
