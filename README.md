---
# MATE Text-Play

MATE Text-Play는 선택지와 제한형 자유 입력을 결합한 텍스트 게임 프로그램입니다. Next.js 웹 화면과 Tauri 기반 Windows x64 실행 프로그램을 제공하며, 실행 프로그램에는 ChatBot 사본과 Text-Play가 함께 들어 있습니다.

---
## 현재 상태

- 기존 Mate Verse 챗봇 웹 소스 가져오기 완료
- Text-Play 샘플 게임 엔진과 반응형 웹 화면 구현
- 자동 저장 1개와 수동 저장 6개, 홈 이어하기 구현
- 기존 챗봇과 Text-Play 상태 격리 검증
- 웹 MVP 1단계 자동 테스트·브라우저 검증 완료
- Text-Play 설계서와 구현 계획 포함
- 공통 LLM HTTP 어댑터·서버 프록시·오류·재시도 기반 구현
- 실제 LLM 서버 API 주소·모델·인증 계약 미확정
- Tauri 기반 Windows 시험판과 NSIS 설치 EXE 생성
- 이야기 턴 이동, 엔딩 화면, 해상도·테마·다크 모드·한국어/영어 설정
- EXE Text-Play의 올라마·내장 llama.cpp AI 연결 기반과 모델 관리 화면
- ChatBot 원본 `1e8403a` 사본 동기화(서버 사용량·부분 저장 기반 포함)

기본 응답은 임시 AI입니다. 웹 Text-Play는 `/api/llm` 서버 프록시를 선택할 수 있고, EXE Text-Play는 별도 준비한 올라마 또는 내장 AI를 사용할 수 있습니다. EXE ChatBot의 로그인·대화는 연습용이며 서버 저장·과금 연동은 활성화하지 않았습니다. 내장 AI 모델 다운로드 정보와 설치 시 기본 모델 자동 준비는 미완료입니다. 실행 경로별 지원 범위는 [개발 환경 안내](docs/DEVELOPMENT-SETUP.md)에 정리합니다.

---
## 처음 보는 사람을 위한 구조

| 경로 | 설명 |
| --- | --- |
| `src/app` | Next.js 화면과 URL 경로 |
| `src/desktop` | EXE 화면·경로·사이드바·Tauri 연결 |
| `src/chatbot` | 확정된 ChatBot 커밋에서 생성한 소스 사본 |
| `src-tauri` | Windows 실행기·로컬 AI 엔진·모델 보관함 |
| `src/components` | 여러 화면에서 재사용하는 공통 UI |
| `src/features` | 캐릭터·채팅·설정·Text-Play 기능 |
| `src/lib/adapters` | LLM과 이미지 생성 기능의 연결 경계 |
| `src/lib/server` | 외부 LLM 서버 요청 검증과 비밀키 전달 경계 |
| `src/lib/repositories` | 브라우저 저장소 접근 코드 |
| `tests` | 기능이 예상대로 동작하는지 확인하는 자동 테스트 |
| `docs` | 설계, 구현 계획, 구조 설명과 개발 기록 |
| `prototype` | 초기 화면 아이디어를 확인하는 독립 프로토타입 |

자세한 설명은 [프로젝트 구조 문서](docs/PROJECT-STRUCTURE.md)와 [개발 기록](docs/DEVELOPMENT-LOG.md)을 확인합니다.

다른 컴퓨터나 새 챗봇 세션에서 작업을 이어갈 때는 [작업 인수인계](docs/HANDOFF.md)를 먼저 확인합니다.

---
## 로컬 실행

Node.js 권장 버전은 `24.19.0`(지원 범위 `>=24.19.0 <25`), pnpm은 `11.19.0`입니다. Node 버전은 `.node-version`, 설치 정책은 `pnpm-workspace.yaml`을 사용합니다. Git·Node.js·Corepack을 준비한 뒤 아래 명령을 실행합니다.

```powershell
corepack pnpm install --frozen-lockfile # 잠금 의존성 설치
corepack enable --install-directory node_modules/.bin pnpm # 프로젝트 pnpm 실행기 준비
corepack pnpm exec corepack pnpm --version # 내부 호출 버전 확인
corepack pnpm dev --hostname 127.0.0.1 --port 3001 # 웹 개발 서버
```

Text-Play 홈은 `http://127.0.0.1:3001/text-play`, 새 게임은 `http://127.0.0.1:3001/text-play/demo?mode=new`, 이어하기는 `http://127.0.0.1:3001/text-play/demo?mode=resume`에서 확인합니다.

EXE와 같은 화면을 브라우저로 보려면 `corepack pnpm desktop:dev` 후 `http://127.0.0.1:1420/#/text-play`에 접속합니다. 브라우저에는 Tauri 전용 모델·하드웨어 기능이 없으며, 실제 기능 검증은 Windows EXE에서 진행합니다. 저장 게임·대화 기록·모델 파일은 Git 복제로 이동하지 않습니다.

기본값은 Mock 모드입니다. 실제 서버 계약이 확정된 뒤 `.env.local`에 다음 값을 설정하면 Character Chat과 Text-Play가 같은 서버 연결 경계를 사용합니다.

```dotenv
NEXT_PUBLIC_LLM_MODE=server
MATEVERSE_LLM_API_URL=https://확정된-서버-주소
MATEVERSE_LLM_API_TOKEN=서버-전용-토큰
```

`MATEVERSE_LLM_API_TOKEN`은 서버 환경 변수로만 사용하며 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 실제 주소와 토큰은 저장소에 커밋하지 않습니다.

---
## 자동 검증

```powershell
corepack pnpm test:run # 전체 테스트
corepack pnpm typecheck # 타입 검사
corepack pnpm lint # 코드 검사
corepack pnpm build # 웹 운영 빌드
corepack pnpm test:e2e # 웹 사용자 흐름
corepack pnpm desktop:build # EXE 화면 빌드
corepack pnpm desktop:verify-assets # 오프라인 자산 검사
corepack pnpm test:e2e:desktop # EXE 화면 사용자 흐름
```

---
## 내장 로컬 AI(시험 적용)

```powershell
corepack pnpm local-ai:runtime
corepack pnpm local-ai:models --models midm-2.0-mini
corepack pnpm local-ai:eval --models midm-2.0-mini:Q4_K_M --backends vulkan:Vulkan0,cpu
corepack pnpm local-ai:install
```

llama.cpp 고정 빌드와 공식 모델 가중치를 받아 GGUF로 변환하고(가벼운 모델 4.3GB, 세 모델 전체 약 35GB), Text-Play 평가 문맥 30개로 형식·행동·속도를 측정한 뒤, 실행 엔진과 모델을 앱 데이터 폴더에 복사합니다. exe의 `AI 모델` 화면에서 `사용하기`를 누르고 Text-Play AI 선택에서 `내장 AI(이 PC)`를 고르면 이 PC의 모델이 대답합니다. 받은 파일과 결과는 Git에서 제외한 `.local-ai/`에 저장합니다. 자세한 내용은 [`docs/plans/2026-10-01-bundled-local-ai.md`](docs/plans/2026-10-01-bundled-local-ai.md)를 봅니다.

---
## Windows 시험판

Windows 10·11 x64용 미서명 시험판입니다. 기본 임시 AI와 별도 준비한 로컬 AI를 지원합니다. 실제 서버 로그인·크레딧·클라우드 저장은 연결하지 않았습니다. EXE와 설치 파일 버전은 아직 `0.1.0-preview.1`이며 배포 버전 체계 정리는 후속 단계입니다.

실행 파일은 최신 ChatBot(Mate Verse) 전체 기능과 Text-Play를 왼쪽 사이드바 하나에서 함께 제공합니다. 사이드바에는 ChatBot 대화방과 Text-Play 대화방(저장 기록)이 따로 나뉘어 있습니다.

ChatBot 기능은 `src/chatbot`의 소스 사본을 쓰며, ChatBot이 바뀌면 계속 똑같이 따라갑니다. ChatBot 저장소를 Text-Play 옆 `../ChatBot`에 두고 다음 명령으로 새 커밋을 확인하고 가져옵니다. 가져오는 기준은 ChatBot 저장소의 `origin/main` 커밋이고, 작업 폴더의 커밋하지 않은 수정은 가져오지 않습니다. `corepack pnpm exe:rebuild`도 빌드 전에 새 커밋 여부를 알려 줍니다.

```powershell
corepack pnpm chatbot:status # 원본 최신 커밋 확인
corepack pnpm chatbot:sync # 확정 커밋 동기화
```

저장소 루트에서 다음 명령을 실행하면 전체 검증 후 NSIS 설치 EXE와 SHA-256 파일을 `artifacts/`에 만듭니다.

```powershell
corepack pnpm exec powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows-preview.ps1 # 전체 검증과 설치 파일 빌드
```

생성 파일은 `MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe`입니다. 설치 안내와 제한은 [시험판 Release 문서](docs/releases/v0.1.0-preview.1.md)를 확인합니다.

개발 실행은 다음 명령을 사용합니다. 실제 실행 프로그램 창이 열리고 화면 코드를 고치면 바로 반영됩니다.

```powershell
corepack pnpm tauri:dev
```

수정한 내용을 실제 실행 파일로 확인할 때는 다음 명령을 사용합니다. 실행 중인 앱을 닫고 설치 파일 없이 실행 파일만 다시 빌드한 뒤 새 실행 파일을 엽니다. 결과는 `src-tauri/target/release/mate-text-play-preview.exe`입니다.

```powershell
corepack pnpm exe:rebuild
```

Windows 빌드에는 Rust, MSVC Build Tools와 WebView2가 필요합니다. 코드 서명이 없어 SmartScreen 경고가 표시될 수 있습니다.

---
## 문서 갱신 규칙

기능을 추가하거나 구조를 바꾸는 모든 커밋은 다음 문서를 함께 확인합니다.

- 새 파일·폴더·책임 변경: `docs/PROJECT-STRUCTURE.md`
- 구현·테스트·미완료 항목 변경: `docs/DEVELOPMENT-LOG.md`
- 범위·순서 변경: `docs/ROADMAP.md`
- 실행 방법 변경: `README.md`, `docs/DEVELOPMENT-SETUP.md`
- 재개 기준·제한·검증 결과 변경: `docs/HANDOFF.md`
