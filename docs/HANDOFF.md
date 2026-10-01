---
# 작업 인수인계

이 문서는 다른 컴퓨터나 새 챗봇 세션에서 `main` 브랜치의 최신 상태를 받아 바로 작업을 이어가기 위한 기준 문서입니다. 마지막 갱신은 2026-10-01입니다.

---
## 기준 저장소

- 저장소: [siwoo440/Text-Play](https://github.com/siwoo440/Text-Play)
- 작업 브랜치: `main` 하나만 사용
- 기준 소스 커밋: `f54fa3feb958c34e312cc9853166e814b2a67c81` (`기능: exe 메인 화면을 ChatBot 밝은 다채색 탐색 화면 구성으로 변경`)
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

---
## 작업 규칙

- 답변과 문서는 한국어로 작성합니다.
- 브랜치는 `main` 하나만 사용하고, 검증이 끝나면 커밋과 푸시까지 진행합니다.
- 기능 추가와 버그 수정은 실패하는 테스트를 먼저 쓰고 실제 실패를 확인한 뒤 구현합니다.
- 코드는 Allman 스타일(여는 중괄호를 다음 줄에)과 각 줄의 짧은 한글 주석 규칙을 따릅니다.
- 커밋 메시지는 한국어로 `기능:`·`수정:`·`문서:` 머리말을 붙이고, 본문에 이전 버전과 비교한 변경점을 `~추가`, `~수정`, `~변경`, `~삭제` 형태로 적습니다.
- 커밋 메시지에 `Co-Authored-By: Claude …` 같은 공동 작업자 줄을 넣지 않습니다.
- 기능·구조가 바뀌면 `docs/DEVELOPMENT-LOG.md`, `docs/PROJECT-STRUCTURE.md`, `README.md`, 이 문서를 함께 갱신합니다.

---
## 현재 구현 상태

### 실행 파일 메인 화면 (`src/features/text-play/ui/TextPlayHome.tsx`)

- ChatBot 최신 디자인(밝은 다채색)과 같은 구성: 흰 헤더와 하단 여러 색 띠, 여러 색 원형 그라데이션 바탕, 큰 제목과 검색창, 장르색 칩, 오늘의 작품, 인기 랭킹 TOP 10, 전체 작품과 `작품 더 보기`
- Text-Play 대표색은 주황(`#c2410c`), 장르색은 ChatBot과 같은 값(힐링 초록, 판타지 보라, 현대 주황, 로맨스 분홍, 미스터리 남색, SF 청록)
- 작품 목록(`src/features/text-play/catalog/text-play-catalog.ts`): 실제 플레이 가능한 `달빛 숲의 기록` 1개와 캐릭터 일러스트 기반 Mock 작품 50개(`준비 중` 표시)
- 작품 카드를 누르면 밝은 상세 창, 준비 중 작품은 플레이 버튼 비활성
- 이어하기 요약은 장면 제목으로 표시(예: `이어하기 · 폐허 회랑 · 2분 5초`)
- exe에서는 메인이 스크롤바 없이 안쪽 스크롤, 헤더는 상단 고정
- 웹(`/text-play`)에서는 Mate Verse 앱 헤더가 있으므로 자체 헤더를 숨김(`showHeader` 속성)

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
| `src/desktop/DesktopApp.tsx` | exe 화면 전환(메인 ↔ 플레이) |
| `src/desktop/desktop.css` | exe 창 크기 맞춤, 스크롤 제어 |
| `src/features/text-play/ui/TextPlayHome.tsx` | 메인 화면 |
| `src/features/text-play/catalog/text-play-catalog.ts` | 작품 목록·장르·검색 |
| `src/features/text-play/ui/TextPlayScreen.tsx` | 게임 플레이 화면 |
| `src/features/text-play/ui/ChoiceList.tsx` | AI 추천 답안 접기·펼치기 |
| `src/features/text-play/data/demo-package.ts` | 샘플 작품 장면·선택지·엔딩 |
| `src/lib/adapters/mock-llm-adapter.ts` | 임시 인공지능 응답 |
| `scripts/rebuild-local-exe.ps1` | `pnpm exe:rebuild` 본체 |

---
## 검증 명령

- 단위·컴포넌트·통합 테스트: `pnpm test:run`
- 타입 검사: `pnpm typecheck` (`next typegen`으로 `next-env.d.ts`를 먼저 생성)
- 코드 검사: `pnpm lint`
- 웹 운영 빌드: `pnpm build`
- 웹 통합 테스트: `pnpm test:e2e` (운영 빌드 후 `127.0.0.1:3100`에서 실행하므로 `pnpm dev`가 켜져 있어도 동작)
- 데스크톱 화면 빌드: `pnpm desktop:build`
- 데스크톱 자산 검사: `pnpm desktop:verify-assets`
- 데스크톱 통합 테스트: `pnpm test:e2e:desktop` (포트 1420을 쓰므로 `pnpm desktop:dev`를 먼저 종료)
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

---
## 이어서 진행할 작업

1. exe 메인 화면 아래쪽(인기 랭킹, 전체 작품, 작품 상세 창) 직접 확인과 세부 디자인 조정
2. 게임 플레이 화면을 메인과 같은 밝은 다채색 디자인으로 변경
3. 엔딩 화면 추가(엔딩 제목·요약, `처음부터`·`메인으로` 버튼)와 엔딩 뒤 직접 입력 막기
4. 사용자에게 보이는 내부 식별자 수정: 장면 위 장소(`FOREST-GATE`), 대사 화자(`lyra`)
5. 콘텐츠 보강: 장면별 추천 행동 데이터, 장면에 맞는 이미지, 임시 인공지능 응답 다양화, 장면 수 확대
6. 문서 정리: 개발 기록 누락분(게임 화면 개편·턴 이동·올라마 연결) 보충, README·로드맵의 `수동 저장 3개` 표기와 `Mock 시험판` 설명 수정
7. 빌드마다 버전 올리기와 GitHub Release 게시
8. `.mateplay` 콘텐츠 패키지 규격과 설치 기능
9. 외부 결정이 필요한 작업: 실제 챗봇 서버 API·인증·크레딧, MSI·자동 업데이트·Windows 코드 서명

---
## 새 챗봇 세션에 전달할 문장

`https://github.com/siwoo440/Text-Play` 저장소의 `main` 최신 커밋을 받아 `docs/HANDOFF.md`를 먼저 읽고 이어서 작업해 주세요. 확인 기준은 Windows 실행 파일(exe)이며 `pnpm exe:rebuild`로 고친 내용을 exe에 반영해 확인합니다. 기존 변경을 되돌리지 말고, 현재 상태와 `이어서 진행할 작업`을 확인한 뒤 수정하세요. 모든 작업은 `main` 하나만 유지하고, 실패하는 테스트를 먼저 쓴 뒤 구현하며, 검증이 끝나면 커밋과 푸시까지 진행하세요. 답변과 문서는 한국어로 작성하고, 코드에는 Allman 스타일과 각 줄의 짧은 한글 주석 규칙을 적용하세요. 커밋 메시지는 한국어로 이전 버전 대비 변경점을 `~추가/~수정/~변경/~삭제`로 적고, Claude 공동 작업자 줄은 넣지 마세요.
