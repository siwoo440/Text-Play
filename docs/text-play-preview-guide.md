---
# Text-Play 웹 미리보기 안내

현재 단계는 설치 파일을 반복 생성하지 않고 Next.js 개발 서버와 Fast Refresh로 UI를 확인합니다. Windows 실행 프로그램은 웹 MVP 승인 뒤 Tauri로 패키징합니다.

---
## 준비

Node.js와 pnpm을 준비한 뒤 저장소 루트에서 의존성을 설치합니다.

```powershell
pnpm install
```

---
## 실행

기존 웹 앱과 포트가 겹치지 않도록 3001번 포트를 사용합니다.

```powershell
pnpm dev --hostname 127.0.0.1 --port 3001
```

- Text-Play 홈: `http://127.0.0.1:3001/text-play`
- 샘플 새 게임: `http://127.0.0.1:3001/text-play/demo?mode=new`
- 샘플 이어하기: `http://127.0.0.1:3001/text-play/demo?mode=resume`

코드를 저장하면 같은 브라우저 탭에 변경 내용이 자동 반영됩니다.

---
## 자동 검증

```powershell
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
```

---
## 저장 데이터 초기화

브라우저 개발자 도구의 Application 메뉴에서 IndexedDB의 `mateverse:text-play` 데이터베이스를 삭제한 뒤 페이지를 새로고침합니다. 기존 Mate Verse 챗봇 localStorage 데이터는 별도이므로 Text-Play 저장 초기화 대상에 포함하지 않습니다.

---
## 현재 구현 범위

- `달빛 숲의 기록` 샘플 작품
- 선택지와 제한형 자유 입력
- Character Chat과 Text-Play 공통 LLM 선택기
- Mock LLM 구조화 스트리밍
- 같은 출처 `/api/llm` HTTP 어댑터와 서버 프록시
- 인증·크레딧·호출 제한·서버 오류 안내
- 실패한 자유 입력의 수동 재시도
- 자동 저장 1개와 수동 저장 3개
- 정상 엔딩과 후퇴 엔딩
- 데스크톱·태블릿·모바일 반응형 UI

---
## 알려진 제한

- 기존 챗봇 소스에 실제 API 주소·모델·인증 계약이 없어 실서비스 호출은 아직 연결하지 않음
- 기본 모드는 공통 `LLMAdapter`의 `MockLLMAdapter` 사용
- 서버 모드는 `NEXT_PUBLIC_LLM_MODE=server`, `MATEVERSE_LLM_API_URL`, `MATEVERSE_LLM_API_TOKEN` 설정 필요
- 비밀 토큰은 브라우저 환경 변수나 저장소에 저장 금지
- `.mateplay` 다운로드·설치 미지원
- Windows EXE·MSI 미제공
- Rust와 Cargo가 현재 개발 환경에 없어 Tauri 빌드 미검증

---
## Windows 프로그램 전환 조건

다음 항목이 모두 확정된 뒤 별도 Tauri 설계와 빌드 검증을 시작합니다.

- 웹 MVP 전체 테스트·타입·린트·빌드 통과
- 사용자 화면 검토 승인
- 실제 LLM 서버 API 계약 확정
- IndexedDB 저장 스키마 안정화
- `.mateplay` 패키지 최소 규격 확정

Windows 단계에서는 Rust·MSVC Build Tools·WebView2 준비, Tauri 셸 생성, 정적 출력 또는 로컬 서버 방식 결정, 파일 시스템 권한, 자동 업데이트, 코드 서명과 MSI·EXE 빌드를 각각 검증합니다.
