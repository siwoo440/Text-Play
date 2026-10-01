---
# 작업 인수인계

이 문서는 다른 컴퓨터나 새 챗봇 세션에서 `main` 브랜치의 최신 상태를 받아 바로 작업을 이어가기 위한 기준 문서입니다.

---
## 기준 저장소

- 저장소: [siwoo440/Text-Play](https://github.com/siwoo440/Text-Play)
- 작업 브랜치: `main` 하나만 사용
- 현재 커밋 확인: `git rev-parse HEAD`
- 원격 동기화 확인: `git status --short --branch`
- 기본 실행 모드: 외부 비밀키가 필요 없는 임시 인공지능
- Windows 실행 프로그램: 설치된 올라마 모델을 조회하고 선택하는 로컬 인공지능 모드 지원
- 올라마 통신 범위: `127.0.0.1:11434`로 제한

---
## 현재 구현 상태

- Tauri 기반 Windows x64 실행 프로그램과 NSIS 설치 파일 생성
- 이야기 장면의 이전·다음 턴 이동과 현재 턴·전체 턴 표시
- 장면별 이미지 교체, 반투명 대화 상자, 추천 답안과 직접 입력 배치
- 상단 상태 표시줄, 작품 제목의 메인 이동, 인공지능 선택 화면
- 자동 저장과 2×3 수동 저장 슬롯의 저장·불러오기·삭제
- 테마 3종과 창 해상도 설정
- 임시 인공지능과 로컬 올라마 모델 선택
- 올라마 모델 조회, 응답 스트리밍, 생성 중단, 오류 안내
- 응답 생성 중에는 `응답 생성 중…` 안내와 서술만 표시
- AI 추천 답안 접기·펼치기와 답안 3개 표시(선택지가 부족하면 자유 행동 추천으로 채움)
- 웹 Text-Play 진입 시 화면을 가리는 앱 패널 자동 닫기와 화면별 브라우저 탭 제목
- 설정 형식 버전 1에서 버전 2로의 이전
- 기존 캐릭터 챗봇 데이터와 Text-Play 저장 데이터 분리

---
## 새 컴퓨터 준비 사항

- Git
- Node.js `20.9.0` 이상
- pnpm `11.19.0`
- Windows 설치 파일 빌드 시 Rust, MSVC Build Tools의 C++ 데스크톱 개발 도구, WebView2
- Rust 프로젝트 선언 최소 버전은 `1.77.2`
- 이번 새 복제본 검증 환경은 Node.js `24.19.0`, pnpm `11.19.0`, Rust `1.98.1`

---
## 처음 받아서 실행하는 순서

1. `git clone https://github.com/siwoo440/Text-Play.git`
2. `cd Text-Play`
3. `corepack enable`
4. `corepack prepare pnpm@11.19.0 --activate`
5. `pnpm install --frozen-lockfile`
6. `pnpm dev --hostname 127.0.0.1 --port 3001`
7. 브라우저에서 `http://127.0.0.1:3001/text-play` 접속

임시 인공지능과 로컬 올라마 모드는 비밀키 없이 사용할 수 있습니다. 실제 서버 모드는 `.env.example`을 참고해 별도 계약 정보가 있을 때만 설정합니다.

---
## 실행 파일(exe)로 확인하며 수정하기

- 준비: Rust(`winget install Rustlang.Rustup`), Visual Studio 또는 Build Tools의 C++ 데스크톱 개발 도구, WebView2
- 실시간 수정: `pnpm tauri:dev` — 실제 실행 프로그램 창에서 화면 코드 변경이 바로 반영
- 실행 파일 교체: `pnpm exe:rebuild` — 실행 중인 앱 종료, 실행 파일만 다시 빌드, 새 실행 파일 실행
- 실행 파일 위치: `src-tauri/target/release/mate-text-play-preview.exe` (설치 없이 실행)
- 설치 파일: `pnpm tauri:build` → `src-tauri/target/release/bundle/nsis/MATE Text-Play Preview_0.1.0-preview.1_x64-setup.exe`
- 소요 시간(2026-10-01 측정): 첫 빌드 약 5분 30초, 이후 `pnpm exe:rebuild` 약 1분 15초
- Tauri의 자바스크립트 패키지(`@tauri-apps/api`, `@tauri-apps/cli`)와 Rust 크레이트(`tauri`)는 주·부 버전이 같아야 빌드됩니다. 단위 테스트가 이를 검사합니다.

---
## 검증 명령

- 단위·컴포넌트·통합 테스트: `pnpm test:run`
- 타입 검사: `pnpm typecheck` (`next typegen`으로 `next-env.d.ts`를 먼저 생성)
- 코드 검사: `pnpm lint`
- 웹 운영 빌드: `pnpm build`
- 웹 통합 테스트: `pnpm test:e2e` (운영 빌드 후 `127.0.0.1:3100`에서 실행하므로 `pnpm dev`가 켜져 있어도 동작)
- 데스크톱 화면 빌드: `pnpm desktop:build`
- 데스크톱 자산 검사: `pnpm desktop:verify-assets`
- 데스크톱 통합 테스트: `pnpm test:e2e:desktop`
- Rust 검사: `pnpm tauri:check`
- Windows 설치 파일 빌드: `pnpm tauri:build`

브라우저 실행 파일이 없는 새 컴퓨터에서 통합 테스트가 시작되지 않으면 `pnpm exec playwright install chromium`으로 Chromium을 설치합니다.

---
## 2026-09-30 새 복제본 검증 결과

- GitHub 원격 저장소에서 빈 임시 폴더로 `main` 복제 성공
- 기준 소스 커밋 `9662525bbafed974c0ee1b864a5226ae2e5426b1` 확인
- 잠금 파일 기준 의존성 428개 설치 성공
- 테스트 파일 51개와 테스트 212개 통과
- 타입 검사와 코드 검사 통과
- Next.js 운영 빌드 통과
- 데스크톱 화면 빌드와 오프라인 자산 검사 통과
- 데스크톱 통합 테스트 4개 통과
- Rust 검사 통과
- Tauri 배포 빌드와 NSIS 설치 파일 생성 성공
- 생성된 설치 파일 크기 약 `16.58 MiB`

인수인계 문서 추가는 제품 코드 변경이 아니므로 위 기준 소스의 검증 결과를 그대로 사용합니다.

---
## 확인된 주의점

- Next.js 16은 같은 폴더에서 개발 서버를 하나만 허용합니다. 개발 서버를 이미 띄워 두었다면 같은 폴더에서 `pnpm dev`를 다시 실행하지 말고 기존 주소를 사용합니다.
- `next-env.d.ts`는 2026-10-01부터 Git에서 제외했습니다. `pnpm dev`, `pnpm build`, `pnpm typecheck`가 자동으로 만듭니다.
- 올라마가 설치되어 있어도 `127.0.0.1:11434` 서비스가 실행 중이 아니면 모델 조회와 응답 생성이 되지 않습니다.
- 실제 챗봇 서버 주소, 모델, 인증 방식과 크레딧 정책은 아직 확정되지 않았습니다.
- Windows 설치 파일은 코드 서명이 없어 SmartScreen 경고가 표시될 수 있습니다.

---
## 이어서 진행할 작업

1. 문서 정리: 개발 기록 누락분(게임 화면 개편·턴 이동·올라마 연결) 보충, README·로드맵의 수동 저장 3칸 표기 수정, 구조 문서의 Tauri 셸 미구현 표기 수정
2. 콘텐츠 보강: 장면별 추천 행동 데이터, 장면 이미지 교체, 이어하기 요약의 장면 식별자(예: `truth-ending`)를 장면 제목으로 표시
3. `.mateplay` 콘텐츠 패키지 규격과 설치 기능
4. 실제 챗봇 서버 API·인증·크레딧 계약 연결
5. MSI, 자동 업데이트와 Windows 코드 서명
6. 사용자 확인 결과에 따른 게임 화면 UI 세부 조정

---
## 새 챗봇 세션에 전달할 문장

`https://github.com/siwoo440/Text-Play` 저장소의 `main` 최신 커밋을 받아 `docs/HANDOFF.md`를 먼저 읽고 이어서 작업해 주세요. 기존 변경을 되돌리지 말고, 현재 상태와 남은 작업을 확인한 뒤 수정하세요. 모든 작업은 `main` 하나만 유지하고, 검증이 끝나면 커밋과 푸시까지 진행하세요. 답변과 문서는 한국어로 작성하고, 코드에는 Allman 스타일과 각 줄의 짧은 한글 주석 규칙을 적용하세요.
