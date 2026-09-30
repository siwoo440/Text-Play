---
# MATE Text-Play

MATE Text-Play는 선택지와 제한형 자유 입력을 결합한 텍스트 게임 프로그램입니다. 현재 단계에서는 기존 Mate Verse 챗봇 웹 앱을 기반으로 게임 엔진과 저장 구조를 검증하고, 검증이 끝난 뒤 Tauri를 이용해 Windows 실행 프로그램으로 패키징합니다.

---
## 현재 상태

- 기존 Mate Verse 챗봇 웹 소스 가져오기 완료
- Text-Play 샘플 게임 엔진과 반응형 웹 화면 구현
- 자동 저장 1개와 수동 저장 3개, 홈 이어하기 구현
- 기존 챗봇과 Text-Play 상태 격리 검증
- 웹 MVP 1단계 자동 테스트·브라우저 검증 완료
- Text-Play 설계서와 구현 계획 포함
- 공통 LLM HTTP 어댑터·서버 프록시·오류·재시도 기반 구현
- 실제 LLM 서버 API 주소·모델·인증 계약 미확정
- Tauri 기반 Windows Mock 시험판과 NSIS 설치 EXE 생성 완료

기본 실행은 기존 챗봇과 Text-Play가 함께 `MockLLMAdapter`를 사용합니다. 실제 서비스 연결 모드에서는 두 화면이 같은 `/api/llm` 서버 경계를 사용하며 브라우저나 실행 파일에 비밀키를 저장하지 않습니다. 기존 챗봇 소스에도 실제 API 주소·모델·인증 계약이 없어 실서비스 호출은 아직 활성화하지 않았습니다.

---
## 처음 보는 사람을 위한 구조

| 경로 | 설명 |
| --- | --- |
| `src/app` | Next.js 화면과 URL 경로 |
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

```powershell
pnpm install
pnpm dev --hostname 127.0.0.1 --port 3001
```

Text-Play 홈은 `http://127.0.0.1:3001/text-play`, 새 게임은 `http://127.0.0.1:3001/text-play/demo?mode=new`, 이어하기는 `http://127.0.0.1:3001/text-play/demo?mode=resume`에서 확인합니다.

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
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
```

---
## Windows Mock 시험판

Windows 10·11 x64에서 실행하는 Mock 전용 미서명 시험판입니다. 실제 AI 서버, 로그인, 크레딧과 클라우드 저장은 포함하지 않습니다.

저장소 루트에서 다음 명령을 실행하면 전체 검증 후 NSIS 설치 EXE와 SHA-256 파일을 `artifacts/`에 만듭니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows-preview.ps1
```

생성 파일은 `MATE-Text-Play-Preview_0.1.0-preview.1_x64-setup.exe`입니다. 설치 안내와 제한은 [시험판 Release 문서](docs/releases/v0.1.0-preview.1.md)를 확인합니다.

개발 실행은 다음 명령을 사용합니다.

```powershell
pnpm tauri:dev
```

Windows 빌드에는 Rust, MSVC Build Tools와 WebView2가 필요합니다. 코드 서명이 없어 SmartScreen 경고가 표시될 수 있습니다.

---
## 문서 갱신 규칙

기능을 추가하거나 구조를 바꾸는 모든 커밋은 다음 문서를 함께 확인합니다.

- 새 파일·폴더·책임 변경: `docs/PROJECT-STRUCTURE.md`
- 구현·테스트·미완료 항목 변경: `docs/DEVELOPMENT-LOG.md`
- 범위·순서 변경: `docs/ROADMAP.md`
- 실행 방법 변경: `README.md`
