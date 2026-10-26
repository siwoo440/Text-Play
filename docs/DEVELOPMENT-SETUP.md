---
# 개발 환경과 재현 절차

2026-10-26 기준 개발 환경입니다. 버전 선택은 `package.json`의 `engines`·`packageManager`, Node 버전 파일 `.node-version`, 설치 정책 `pnpm-workspace.yaml`로 관리합니다.

---
## 필수 도구

| 도구 | 기준 |
| --- | --- |
| Git | 저장소 복제와 커밋 |
| Node.js | 권장 24.19.0, 지원 범위 24.19.0 이상 25 미만 |
| Corepack | 이 작업에서 확인한 버전 0.35.0, 저장소 지정 pnpm 실행 |
| pnpm | 11.19.0, 잠금 파일 변경 없이 설치 |
| Windows EXE 개발 | Windows x64, Rust·Cargo, MSVC C++ 데스크톱 도구·Windows SDK, WebView2 |
| 브라우저 통합 검사 | Playwright Chromium |

Rust의 현재 도구 버전은 `rustc --version`·`cargo --version`으로 확인합니다. `src-tauri/Cargo.toml`의 `rust-version`은 프로젝트 선언값이며, 최신 의존성까지 그 버전에서 빌드된다는 검증 결과는 아닙니다. 실제 검증 버전은 이번 개발 기록을 확인합니다.

---
## 새 컴퓨터에서 시작

1. Git, Node.js 24.19.0과 Corepack을 준비합니다. `corepack` 명령이 없으면 Corepack을 먼저 설치합니다.
2. `git clone https://github.com/siwoo440/Text-Play.git`으로 복제하고 `cd Text-Play`로 이동합니다.
3. `node --version`과 `corepack pnpm --version`으로 도구 버전을 확인합니다. pnpm은 11.19.0이어야 합니다.
4. `corepack pnpm install --frozen-lockfile`을 실행하고 `corepack enable --install-directory node_modules/.bin pnpm`으로 프로젝트 전용 실행기를 준비합니다. 처음에는 외부 의존성 다운로드가 필요합니다.
5. 웹: `corepack pnpm dev --hostname 127.0.0.1 --port 3001` 후 `http://127.0.0.1:3001/text-play`에 접속합니다.
6. EXE와 같은 브라우저 화면: `corepack pnpm desktop:dev` 후 `http://127.0.0.1:1420/#/text-play`에 접속합니다. 브라우저에는 Tauri의 모델·하드웨어 명령이 없습니다.
7. 실제 EXE 개발 창: Windows 빌드 도구를 준비한 뒤 `corepack pnpm tauri:dev`를 실행합니다.

모든 명령은 Text-Play 저장소 루트에서 실행합니다. 전역 pnpm 버전과 무관하게 `corepack pnpm`을 사용합니다. 프로젝트 전용 실행기는 스크립트 내부의 pnpm 호출도 같은 버전으로 연결합니다. `corepack pnpm exec pnpm --version`도 11.19.0인지 확인합니다. `node_modules`를 다시 만들었다면 프로젝트 전용 실행기도 다시 준비합니다.

---
## 검증 순서

| 검사 | 명령 |
| --- | --- |
| 단위·컴포넌트·통합 | `corepack pnpm test:run` |
| 타입 | `corepack pnpm typecheck` |
| 코드 규칙 | `corepack pnpm lint` |
| 웹 운영 빌드 | `corepack pnpm build` |
| 웹 사용자 흐름 | `corepack pnpm test:e2e` |
| EXE 화면 빌드 | `corepack pnpm desktop:build` |
| 오프라인 자산 | `corepack pnpm desktop:verify-assets` |
| EXE 화면 사용자 흐름 | `corepack pnpm test:e2e:desktop` |
| Rust | `cargo test --locked --manifest-path src-tauri/Cargo.toml` |
| EXE와 NSIS 생성 | `corepack pnpm tauri:build` |

Chromium이 없으면 `corepack pnpm exec playwright install chromium`으로 설치합니다. 데스크톱 통합 검사는 포트 1420을 쓰므로 기존 개발 서버를 종료한 뒤 실행합니다. 웹 통합 검사는 전용 포트 3100을 사용합니다. 로컬 통신과 임시 파일이 차단된 환경의 `EACCES`·`EPERM`·변환 파일 `ENOENT`는 제한을 해제한 동일 명령으로 재검증하고 코드 오류와 구분합니다.

---
## ChatBot 동기화

ChatBot 원본 저장소는 옆 폴더 `../ChatBot`에 둡니다. Text-Play만 복제해도 이미 포함된 사본으로 실행·검증할 수 있습니다.

1. 양쪽 저장소에서 `git status --short --branch`로 작업 중 변경을 확인하고 보존합니다.
2. `corepack pnpm chatbot:status`로 원격 상태와 사본의 차이를 확인합니다. 원격 조회가 실패했다면 최신 상태로 단정하지 않습니다.
3. `corepack pnpm chatbot:sync`로 원본 `origin/main`의 커밋된 내용만 가져옵니다.
4. `src/chatbot/SOURCE.md`와 변경 내역을 확인합니다. 새 화면·공개 환경 값·의존성이 생겼는지 점검합니다.
5. 전체 테스트·타입·코드·사용자 흐름·EXE 빌드를 확인하고 문서에 기준 원본 커밋을 기록합니다.

`src/chatbot`·`tests/chatbot`은 동기화 시 다시 생성하는 사본입니다. 원본의 미커밋 파일을 동기화 과정에서 저장·삭제·커밋하지 않습니다.

---
## 인공지능과 데이터 범위

| 경로 | 현재 지원 | 추가 준비 |
| --- | --- | --- |
| 웹 Text-Play | 기본 임시 AI, 선택적으로 `/api/llm` 서버 프록시 | 실제 서버 계약·인증 정보 |
| EXE Text-Play | 임시 AI, 올라마, 내장 llama.cpp AI | 올라마는 서비스·모델, 내장 AI는 엔진·GGUF 파일 |
| EXE ChatBot | 포함된 최신 화면·로컬 기록·연습용 로그인과 응답 | 실제 서버 AI·인증·서버 저장은 연결 미완료 |

내장 AI의 연결 통로·엔진 관리자·모델 보관함·화면은 구현되어 있지만 카탈로그의 다운로드 정보는 아직 비어 있습니다. 설치만으로 기본 모델이 자동 준비되지는 않습니다. `.local-ai/`의 엔진·모델과 앱 데이터는 Git에 포함되지 않으며 새 컴퓨터에서 별도로 준비합니다.

Text-Play 저장 게임은 기기별 IndexedDB, ChatBot 기록은 별도 로컬 저장소를 사용합니다. Git 복제로 대화·세이브·비밀키가 옮겨지지 않습니다. ChatBot 기록은 기존 내보내기·가져오기 흐름을 사용하고 웹·EXE 자동 동기화는 후속 단계입니다.
