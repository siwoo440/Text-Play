---
# 개발 기록

이 문서는 현재 구현 상태와 검증 결과를 누적 기록합니다. 기능 커밋마다 날짜, 변경 파일, 사용자에게 보이는 기능, 테스트 결과와 남은 작업을 갱신합니다.

---
## 2026-09-26 — 저장소 초기 구성

### 목표

기존 Mate Verse 챗봇 소스를 Text-Play 전용 GitHub 저장소로 옮기고, 웹 MVP와 Windows 실행 프로그램 개발의 기준점을 만듭니다.

### 들어온 파일

- 기존 Next.js·React·TypeScript 챗봇 소스
- 캐릭터 탐색·상세·채팅·보관함·설정 화면
- LLM·이미지 생성 Mock 어댑터
- localStorage 저장소와 데이터 관리 기능
- 단위·통합·컴포넌트 테스트
- Text-Play 웹 MVP 설계서와 구현 계획

### 현재 가능한 기능

- 캐릭터 탐색과 로컬 캐릭터 생성·수정
- Mock LLM 기반 캐릭터 대화
- 대화·설정·캐릭터 데이터의 로컬 저장
- 데이터 백업·복구와 삭제
- 화면 레이아웃과 접근성 설정

### 검증

- `pnpm test:run`: 테스트 파일 23개, 테스트 96개 통과
- Rust·Cargo 미설치 확인
- 실제 Windows 실행 파일은 아직 생성하지 않음

### 다음 작업

- Text-Play 도메인 타입과 공식 샘플 패키지
- 결정형 게임 엔진과 액션 검증
- IndexedDB 저장소
- Text-Play 홈과 플레이 화면
- 실제 서버 LLM 계약 확인
- Tauri Windows 셸 설계와 빌드 환경 준비

### 알려진 제한

- 현재 AI 응답은 Mock 데이터
- Text-Play 실행 화면 미구현
- `.mateplay` 패키지 미지원
- Windows 설치 파일 미제공

---
## 2026-09-26 — 공식 샘플 패키지 기반

### 목표

Text-Play 게임 엔진과 화면이 공통으로 사용할 타입과 첫 공식 샘플 작품 데이터를 정의합니다.

### 변경 파일

- `src/features/text-play/core/types.ts`
- `src/features/text-play/data/demo-package.ts`
- `tests/unit/text-play-package.test.ts`

### 사용자 기능

- 판타지 미스터리 샘플 작품 `달빛 숲의 기록` 추가
- 달빛 숲 입구, 폐허 회랑, 봉인된 서재와 두 종류의 엔딩 구성
- HP·정신력·골드, 관계도, 인벤토리, 퀘스트와 이벤트 데이터 계약 구성
- 자동 저장과 수동 저장 3개를 위한 슬롯 타입 구성

### 검증 결과

- 구현 전 샘플 패키지 모듈을 찾지 못하는 실패 확인
- 구현 후 테스트 파일 24개, 테스트 98개 통과
- 모든 선택지가 실제 장면을 참조하는지 검증
- 정상 엔딩과 후퇴 엔딩이 모두 존재하는지 검증

### 남은 작업

- 선택지와 액션을 처리하는 결정형 게임 엔진
- 존재하지 않는 대상과 범위 밖 수치 거부
- 화면과 저장소 연결

### 알려진 제한

- 현재 샘플 데이터만 존재하며 아직 화면에서 실행할 수 없음
- 장면 이미지는 기존 임시 에셋 사용

---
## 2026-09-26 — 결정형 게임 엔진

### 목표

LLM과 화면이 게임 상태를 직접 바꾸지 못하게 하고, 검증된 액션과 선택지만 원자적으로 적용합니다.

### 변경 파일

- `src/features/text-play/core/conditions.ts`
- `src/features/text-play/core/actions.ts`
- `src/features/text-play/core/engine.ts`
- `tests/unit/text-play-engine.test.ts`

### 사용자 기능

- 샘플 작품의 초기 게임 상태 생성
- 현재 장면에 포함된 선택지만 실행
- 선택지에 따른 장면·위치·인벤토리·퀘스트·관계도 변경
- 정상 엔딩과 후퇴 엔딩 판정
- 선택과 장면 서술의 플레이 기록 추가

### 검증 결과

- 구현 전 엔진 모듈을 찾지 못하는 실패 확인
- 구현 후 테스트 파일 25개, 테스트 105개 통과
- 존재하지 않는 아이템 액션의 전체 상태 변경 차단
- HP·정신력·골드와 관계도의 범위 초과 차단
- 퀘스트 시작·완료와 정상 엔딩 경로 확인

### 남은 작업

- 구조화 LLM 응답과 액션 검증 연결
- IndexedDB 세이브 저장소
- 플레이 세션과 화면

### 알려진 제한

- 화면과 아직 연결되지 않음
- 플레이 시간 자동 계산 미연결

---
## 2026-09-26 — 구조화 AI 응답 검증

### 목표

기존 챗봇과 같은 LLM 어댑터를 사용하면서 게임용 JSON 응답과 제안 액션을 별도로 검증합니다.

### 변경 파일

- `src/features/text-play/ai/types.ts`
- `src/features/text-play/ai/context-builder.ts`
- `src/features/text-play/ai/response-schema.ts`
- `src/features/text-play/ai/action-validator.ts`
- `src/lib/adapters/llm-adapter.ts`
- `src/lib/adapters/mock-llm-adapter.ts`
- `tests/unit/text-play-ai.test.ts`
- `tests/unit/mock-adapters.test.ts`

### 사용자 기능

- 현재 장면과 상태만 포함한 최소 AI 문맥 생성
- 서술·대사·제안 액션을 분리한 구조화 응답
- 동일 입력에 같은 결과를 내는 Mock 구조화 스트리밍
- 허용되지 않은 액션과 추가 응답 필드 차단

### 검증 결과

- 구현 전 AI 모듈 누락과 구조화 메서드 부재 실패 확인
- 구현 후 테스트 파일 26개, 테스트 111개 통과
- 잘못된 JSON, 미지원 액션과 추가 필드 거부 확인
- 능력치 범위 초과 액션의 상태 변경 차단 확인

### 남은 작업

- 플레이 세션에서 실제 구조화 스트림 수집
- 응답 취소와 오류 복구
- 기존 서버 LLM 연결

### 알려진 제한

- 현재 구조화 응답은 Mock 데이터
- 실제 공급자·모델·API 경로 미확정

---
## 기록 작성 형식

새 작업은 다음 형식을 복사해 추가합니다.

```text
## YYYY-MM-DD — 작업 이름
### 목표
### 변경 파일
### 사용자 기능
### 검증 결과
### 남은 작업
### 알려진 제한
```

---
## 2026-09-26 — 저장소와 세션 제어

### 목표

브라우저 저장소와 LLM 스트리밍을 게임 엔진에 안전하게 연결하고 실패 시 확정 상태를 보존합니다.

### 변경 파일

- `src/features/text-play/storage`
- `src/features/text-play/session`
- `src/test/text-play-fixtures.ts`
- `tests/unit/text-play-save-repository.test.ts`
- `tests/unit/text-play-reducer.test.ts`
- `tests/integration/text-play-controller.test.ts`

### 사용자 기능

- IndexedDB 자동 저장 1개와 수동 저장 3개
- IndexedDB 미지원 환경의 메모리 저장소 대체
- 구조화 AI 응답 스트리밍과 중지
- JSON·액션 검증 실패 시 확정 게임 상태 유지
- 저장 실패 시 플레이를 유지하는 복구 안내

### 검증 결과

- 저장소 테스트를 포함해 테스트 116개 통과
- 세션 제어기 테스트를 포함해 테스트 120개 통과
- 잘못된 JSON의 상태 변경과 자동 저장 차단 확인

### 알려진 제한

- 실제 서버 LLM 대신 결정형 Mock 응답 사용
- 브라우저별 IndexedDB 실제 동작은 수동 확인 필요

---
## 2026-09-26 — 웹 MVP 홈과 플레이 화면

### 목표

설치 파일 없이 개발 서버에서 확인할 수 있는 Text-Play 홈과 샘플 플레이 화면을 제공합니다.

### 변경 파일

- `src/app/text-play`
- `src/features/text-play/ui`
- `src/components/app-shell/AppHeader.tsx`
- `tests/components/text-play-home.test.tsx`
- `tests/components/text-play-screen.test.tsx`
- `tests/integration/text-play-flow.test.tsx`
- `tests/integration/text-play-save-flow.test.tsx`
- `tests/integration/text-play-chatbot-isolation.test.tsx`

### 사용자 기능

- `/text-play` 샘플 작품 홈
- `/text-play/demo?mode=new` 플레이 화면
- 장면 이미지, 이야기 기록, 선택지와 자유 입력
- 스트리밍 응답 중지와 시스템 안내
- 체력·정신력·골드·관계도·인벤토리·퀘스트 표시
- 정상 엔딩과 후퇴 엔딩
- 자동 저장과 수동 저장·불러오기·삭제
- 3열 데스크톱, 2영역 태블릿과 단일 열 모바일 레이아웃
- 기존 Mate Verse 헤더의 Text-Play 메뉴

### 검증 결과

- 정상 엔딩 전체 선택 흐름 통과
- 수동 저장 뒤 장면·상태 복원 통과
- 기존 챗봇 상태 격리 통과
- 테스트 파일 34개, 테스트 126개 통과
- 타입 검사, 린트와 운영 빌드 통과
- `/text-play`와 `/text-play/demo` 정적 경로 생성 확인
- 인앱 브라우저 홈·첫 선택·자유 입력 확인
- 브라우저 오류·경고 로그 0개 확인

### 남은 작업

- 실제 LLM 서버 API 계약과 인증 연결
- 사용자 브라우저 화면 검토
- `.mateplay` 패키지 규격
- Tauri Windows 셸과 실행 파일

### 알려진 제한

- 실제 AI 모델 미연결
- 저장 슬롯의 상세 메타데이터 표시는 초기형
- Windows EXE·MSI 미생성

---
## 2026-09-26 — 웹 MVP 1단계 완성

### 목표

웹 MVP의 자동 저장·이어하기·저장 슬롯 정보를 실제 브라우저에서 사용할 수 있는 상태로 마무리합니다.

### 변경 파일

- `src/app/text-play/page.tsx`
- `src/app/text-play/demo/page.tsx`
- `src/features/text-play/core/actions.ts`
- `src/features/text-play/session/TextPlayProvider.tsx`
- `src/features/text-play/storage/browser-save-repository.ts`
- `src/features/text-play/ui/TextPlayHome.tsx`
- `src/features/text-play/ui/SaveManager.tsx`
- `tests/components/text-play-home.test.tsx`
- `tests/integration/text-play-save-flow.test.tsx`
- `tests/unit/text-play-engine.test.ts`

### 사용자 기능

- 홈 화면의 실제 자동 저장 진행 정보와 이어하기
- `mode=resume` 경로의 자동 저장 복원
- 수동 저장 슬롯의 장면·플레이 시간·저장 시각 표시
- 사용 중인 슬롯의 불러오기·덮어쓰기·삭제
- 불러오기와 덮어쓰기 전 확인
- 행동 경과 시간의 누적 플레이 시간 반영

### 검증 결과

- 자동 저장 후 홈에서 진행 정보와 이어하기 표시 확인
- 이어하기 후 장면·인벤토리·이야기 기록 복원 확인
- 수동 저장 슬롯 메타데이터 표시 확인
- 브라우저 오류·경고 로그 0개 확인
- 테스트 파일 34개, 테스트 130개 통과
- 타입 검사, 린트와 운영 빌드 통과

### 남은 작업

- 2단계 실제 LLM 서버 API·인증·크레딧 연결
- `.mateplay` 패키지 규격
- Tauri Windows 셸과 실행 파일

### 알려진 제한

- 현재 AI 응답은 실제 서비스 모델이 아닌 `MockLLMAdapter` 사용
- IndexedDB 미지원 환경은 현재 세션 동안만 유지되는 메모리 저장소 사용
- 화면 구성과 세부 사양은 이후 검토 결과에 따라 변경 가능

---
## 2026-09-26 — 공통 LLM 서비스 연결 기반

### 목표

Character Chat과 Text-Play가 같은 서버 경계를 사용하고 실제 비밀키를 브라우저에 노출하지 않는 연결 기반을 만듭니다.

### 변경 파일

- `src/lib/adapters/http-llm-adapter.ts`
- `src/lib/adapters/llm-service-error.ts`
- `src/lib/adapters/create-llm-adapter.ts`
- `src/lib/server/llm-proxy.ts`
- `src/app/api/llm/route.ts`
- `src/features/chat`
- `src/features/text-play/session`
- `src/features/text-play/ui`
- `tests/unit/http-llm-adapter.test.ts`
- `tests/unit/llm-proxy.test.ts`
- `tests/unit/create-llm-adapter.test.ts`

### 사용자 기능

- Character Chat과 Text-Play의 공통 Mock·서버 모드 선택
- 분할 NDJSON 스트리밍과 마지막 무개행 프레임 처리
- 인증·크레딧·호출 제한·서버 장애별 안내
- 진행 중 응답 중단 신호 전달
- 실패한 Text-Play 자유 입력의 수동 재시도
- Character Chat 실패 시 메시지와 토큰 상태 원상 복구

### 검증 결과

- HTTP 어댑터 테스트 8개 통과
- 서버 프록시 테스트 4개 통과
- 공급자 선택·Text-Play·Character Chat 대상 테스트 14개 통과
- 전체 테스트 파일 37개, 테스트 160개 통과
- 타입 검사와 린트 통과
- 운영 빌드 통과와 동적 `/api/llm` 경로 생성 확인
- 인앱 브라우저 `Mock AI` 표시와 오류·경고 0개 확인
- 서버 미설정 요청의 `503 / llm-service-unconfigured` 확인
- 별도 코드 검토의 모드별 입력 검증·본문 오류 정규화·스트림 정리 지적 3건 수정 후 재검토 통과

### 남은 작업

- 기존 챗봇 서비스의 실제 API 주소·모델·응답 계약 확인
- 실제 로그인·인증과 크레딧 데이터 연결
- `.mateplay` 패키지 규격
- Tauri Windows 셸과 실행 파일

### 알려진 제한

- 실제 서버 계약이 없어 기본 Mock 모드를 유지
- 자동 재시도는 중복 과금 가능성 때문에 사용하지 않고 사용자 수동 재시도만 제공
- 이번 연결 기반은 새 래스터·벡터 이미지가 필요하지 않아 기존 UI 자산을 그대로 사용

---
## 2026-09-29 — Windows Mock 시험판 패키징

---
### 목표

웹 Text-Play를 외부 AI 연결 없이 실행하는 Windows x64 설치 EXE로 패키징합니다.

---
### 변경 파일

- `desktop`
- `src/desktop`
- `src-tauri`
- `scripts/build-windows-preview.ps1`
- `scripts/finalize-windows-preview.mjs`
- `scripts/smoke-installed-preview.mjs`
- `tests/e2e/desktop-preview.spec.ts`
- `tests/unit/windows-build-script.test.ts`
- `vite.desktop.config.ts`
- `playwright.desktop.config.ts`

---
### 사용자 기능

- Tauri 기반 Windows 데스크톱 실행
- Mock AI 고정 실행과 외부 API 요청 차단
- 자동 저장·수동 저장·이어하기
- NSIS 설치 EXE와 SHA-256 파일 생성

---
### 검증 결과

- 단위·통합 테스트 44개 파일, 178개 테스트 통과
- 데스크톱 Playwright E2E 3개 통과
- 타입 검사, 린트, Next.js 웹 빌드 통과
- 데스크톱 상대 자산과 외부 연결 금지 문자열 검사 통과
- Rust `cargo check`와 Tauri NSIS 빌드 통과
- 설치 EXE 크기 16,400,384바이트 확인
- SHA-256 `b507cbadf807e3f51657af34f61e0eba2c4066362113395ce203bdecb1245322` 확인
- 최종 설치 EXE의 현재 Windows 사용자 설치와 직접 실행 성공
- 앱 제거 후 WebView 저장 데이터 폴더 유지 확인
- 최종 설치 EXE 재설치 후 자동 저장 이어하기와 수동 저장 유지 확인
- 최종 설치본의 Mock AI 표시와 자동화 연결 이후 외부 요청 0건 확인
- 최종 설치본 일반 실행과 창 응답 상태 확인

---
### 남은 검증

- GitHub 시험판 Release 게시와 게시 자산 재다운로드 해시 확인

---
### 알려진 제한

- Mock AI 전용 시험판
- Windows 코드 서명과 자동 업데이트 미적용
- MSI 미제공
- WebView2 미설치 환경의 완전한 오프라인 설치 미지원
- 설치 앱 시작 이전 네트워크 요청은 CDP 감시 범위 밖이며 사용자 승인에 따라 CSP·번들 검사로 대체 검증

---
## 2026-10-01 — AI 추천 답안 접기·펼치기

---
### 목표

명령 도크의 불필요한 제목을 없애고, AI 추천 답안을 필요할 때만 펼쳐 보도록 바꿉니다.

---
### 변경 파일

- `src/features/text-play/ui/ChoiceList.tsx`
- `src/features/text-play/ui/text-play-recommendations.ts`
- `src/features/text-play/ui/TextPlayScreen.tsx`
- `src/features/text-play/ui/TextPlayScreen.module.css`
- `src/test/text-play-recommendations.ts`
- `tests/components/text-play-screen.test.tsx`
- `tests/integration`의 선택지 진행 테스트 3개
- `tests/e2e/desktop-preview.spec.ts`

---
### 사용자 기능

- 명령 도크 상단의 `AI ASSIST`와 `다음 행동을 선택하세요` 제목 삭제
- `AI 추천 답안` 막대는 접힌 상태로 시작하고, 누르면 위로 펼쳐지며 막대 아래에 답안 3개 표시
- 작품 선택지가 3개보다 적으면 자유 행동 추천으로 채우고, 누르면 자유 입력과 같은 경로로 인공지능에 전달
- 답안을 고르거나 자유 입력으로 턴이 바뀌면 다시 접힘
- 종료 장면에서는 펼침 막대 없이 `이야기가 끝났습니다.` 안내만 표시
- 동작 감소 설정에서는 펼침 효과 제거
- 추천 답안과 행동 직접 입력을 테두리가 있는 별도 카드로 분리하고, 펼치거나 입력 중인 카드 테두리를 강조색으로 변경
- `AI 추천 답안`, `행동 직접 입력` 제목을 더 크고 굵게(0.98rem, 900) 변경

---
### 검증 결과

- 테스트 파일 51개, 테스트 214개 통과
- 타입 검사와 코드 검사 통과
- 데스크톱 통합 테스트 4개 통과
- 인앱 브라우저 1280×720·768×1024·375×812에서 접힘·펼침·자유 행동 진행과 가로 넘침 없음 확인

---
### 알려진 제한

- 자유 행동 추천 문구는 장면과 무관한 고정 문구 3개
- 자유 행동 응답이 스트리밍되는 동안 이야기 상자에 응답 원문(JSON)이 그대로 보임

---
## 2026-10-01 — 안정화

---
### 목표

웹 화면 오류, 응답 표시, 탭 제목, 테스트 명령과 자동 생성 파일 처리처럼 바로 고칠 수 있는 문제를 정리합니다.

---
### 변경 파일

- `src/features/text-play/ui/TextPlayHome.tsx`, `src/features/text-play/session/TextPlayProvider.tsx`
- `src/features/text-play/ui/StoryLog.tsx`, `src/features/text-play/ui/text-play-streaming-preview.ts`
- `src/features/text-play/platform/CloseAppPanelsOnEnter.tsx`, `src/features/core/AppProvider.tsx`
- `src/app/layout.tsx`, `src/app/text-play/page.tsx`, `src/app/text-play/demo/page.tsx`
- `playwright.config.ts`, `tests/e2e/web-text-play.spec.ts`
- `package.json`, `.gitignore`, `next-env.d.ts` 추적 해제
- `tests/components`, `tests/unit`의 관련 테스트

---
### 사용자 기능

- 저장 경고를 화면 표시 후에 반영하도록 수정해 웹 화면 불일치 오류(빨간 `1 Issue`) 제거
- 응답 생성 중에는 원문(JSON) 대신 `응답 생성 중…` 안내와 서술만 표시
- 브라우저 탭 제목 추가: `Text-Play · Mate Verse`, `달빛 숲의 기록 · Text-Play · Mate Verse`
- 웹 Text-Play 진입 시 기본으로 열려 화면을 가리던 대화방 패널과 흐린 배경을 닫도록 수정
- 앱 저장 상태 복원 완료 여부(`restored`)를 앱 저장소에 추가

---
### 개발 환경 변경

- `pnpm test:e2e`가 데스크톱 전용 테스트를 제외하고, 운영 빌드 후 전용 주소 `127.0.0.1:3100`에서 웹 통합 테스트를 실행하도록 변경
- `next-env.d.ts`를 Git 추적에서 제외하고 `pnpm typecheck`가 `next typegen`으로 먼저 생성하도록 변경

---
### 검증 결과

- 테스트 파일 54개, 테스트 224개 통과
- 타입 검사와 코드 검사 통과
- 웹 통합 테스트 1개 통과(콘솔 오류 0건)
- 데스크톱 통합 테스트 4개 통과
- 인앱 브라우저에서 탭 제목, 패널 닫힘, 빨간 오류 표시 제거, 생성 중 서술 표시 확인

---
### 알려진 제한

- 이어하기 요약이 장면 제목 대신 장면 식별자(예: `truth-ending`)를 표시
- 개발 기록에 게임 화면 개편·턴 이동·올라마 연결 기록이 빠져 있음

---
## 2026-10-01 — Windows 실행 파일 빌드 복구와 교체 명령

---
### 목표

수정한 내용을 Windows 실행 파일(exe)로 바로 확인할 수 있게 합니다.

---
### 변경 파일

- `package.json`, `pnpm-lock.yaml`
- `scripts/rebuild-local-exe.ps1`
- `tests/unit/tauri-config.test.ts`
- `README.md`, `docs/HANDOFF.md`

---
### 사용자 기능

- `@tauri-apps/api`를 2.0.0에서 2.12.0으로 변경해 Rust `tauri` 2.12.0과 버전 불일치로 실패하던 `pnpm tauri:build` 수정
- `pnpm exe:rebuild` 추가: 실행 중인 앱 종료, 실행 파일만 다시 빌드, 새 실행 파일 실행
- Tauri 자바스크립트 패키지와 Rust 크레이트의 주·부 버전 일치 테스트 추가

---
### 검증 결과

- Rust 1.98.1 설치 후 `pnpm tauri:build`로 실행 파일(24.85MB)과 NSIS 설치 파일(16.58MB) 생성
- 실행 파일 실행, 창 제목 `MATE Text-Play Preview`와 홈 화면 표시 확인
- `pnpm exe:rebuild` 재빌드·재실행 약 74초 확인
- 테스트 파일 54개, 테스트 225개 통과, 타입 검사와 코드 검사 통과

---
## 2026-10-01 — 실행 파일 창 크기 맞춤

---
### 목표

실행 파일(exe) 오른쪽의 세로 스크롤바를 없애고, 홈과 플레이 화면이 창 크기에 맞게 정해지도록 합니다.

---
### 변경 파일

- `src/desktop/desktop.css`
- `src/features/text-play/ui/TextPlayHome.tsx`, `src/features/text-play/ui/TextPlayHome.module.css`
- `src/features/text-play/ui/TextPlayScreen.module.css`
- `tests/e2e/desktop-preview.spec.ts`

---
### 사용자 기능

- 실행 파일의 문서 스크롤을 막고 홈·플레이 화면 높이를 창 높이에 고정
- 홈 화면 여백, 제목, 작품 장식, 버튼 간격을 창 크기 비례(`vh`·`vw`) 크기로 변경
- 추천 답안 영역이 공간이 부족할 때 위로 넘쳐 제목이 잘리던 문제를 제목부터 보이도록 수정
- 높이 760px 이하 창에서 추천 답안·입력 카드 간격과 높이를 줄이는 낮은 창 배치 추가

---
### 검증 결과

- 데스크톱 화면에서 960×640(최소 창), 1264×781(기본 창), 1280×720, 1920×1080 모두 문서 스크롤 없음, 홈·플레이 내용이 창 안에 들어감, 추천 답안 3개를 펼쳐도 추천 영역 스크롤 없음
- 최소 창 맞춤 데스크톱 통합 테스트 추가: 수정 전 코드에서 실패, 수정 후 통과
- 데스크톱 통합 테스트 5개, 웹 통합 테스트 1개, 테스트 225개, 타입 검사와 코드 검사 통과
- `pnpm exe:rebuild` 후 실행 파일 화면에서 스크롤바 없음 확인

---
## 2026-10-01 — 실행 파일 메인 화면 개편 (진행 중)

---
### 목표

실행 파일을 열면 ChatBot 최신 커밋(`4fbbd3e`, 밝은 다채색 디자인)과 같은 메인 탐색 화면이 나오도록 합니다.

---
### 변경 파일

- `src/features/text-play/catalog/text-play-catalog.ts`
- `src/features/text-play/ui/TextPlayHome.tsx`, `src/features/text-play/ui/TextPlayHome.module.css`
- `src/features/text-play/ui/TextPlayDialog.tsx`, `src/features/text-play/ui/TextPlayDialog.module.css`
- `src/features/text-play/platform/*`, `src/desktop/DesktopApp.tsx`, `src/desktop/desktop.css`
- `public/images/text-play/moonlit-forest-cover.svg`
- `vitest.config.mts`, 관련 단위·컴포넌트·통합 테스트

---
### 사용자 기능

- 어두운 단일 카드 홈을 ChatBot 밝은 다채색 메인 화면 구성으로 변경: 흰 헤더와 여러 색 띠, 여러 색 원형 그라데이션 바탕, 큰 제목과 검색창, 장르색 칩, 오늘의 작품, 인기 랭킹 TOP 10, 전체 작품과 더 보기
- Text-Play 대표색(주황)으로 주요 버튼·검색 테두리·제품 표시 지정
- 실제 플레이 가능한 `달빛 숲의 기록` 1개와 캐릭터 일러스트 기반 Mock 작품 50개 추가, Mock 작품은 `준비 중` 표시
- 작품 카드를 누르면 밝은 상세 창 표시, 준비 중 작품은 플레이 버튼 비활성
- 이어하기 요약을 장면 식별자 대신 장면 제목으로 표시
- 실행 파일에서 `Mate Verse 탐색으로 돌아가기` 버튼 제거, 메인은 스크롤바 없이 안쪽 스크롤
- `달빛 숲의 기록` 표지 SVG 추가

---
### 검증 결과

- 테스트 파일 55개, 테스트 233개 통과, 타입 검사와 코드 검사 통과
- 데스크톱 통합 테스트 5개, 웹 통합 테스트 1개 통과
- 전체 병렬 실행 부하로 시간 초과가 생겨 테스트 시간 제한을 15초로 변경

---
### 남은 작업

- 실행 파일 화면 직접 확인과 세부 디자인 조정
- 게임 플레이 화면을 같은 밝은 디자인으로 맞추기

---
## 2026-10-01 — 플레이 화면 명령 도크 하단 배치

---
### 목표

실행 파일(exe) 플레이 화면 오른쪽 열에 있던 명령 도크(AI 추천 답안·행동 직접 입력)를 장면 무대 아래로 옮깁니다.

---
### 변경 파일

- `src/features/text-play/ui/TextPlayScreen.module.css`
- `tests/e2e/desktop-preview.spec.ts`
- `docs/text-play-preview-guide.md`, `docs/HANDOFF.md`

---
### 사용자 기능

- 작업 영역을 무대·도크 좌우 두 열에서 위 무대·아래 도크 한 열로 변경
- 도크 좌우 여백을 스토리 상자와 같게 맞추고, 도크 구분선을 왼쪽 선에서 위쪽 선으로 변경
- 펼친 AI 추천 답안 3개를 세로 목록에서 한 줄 가로 배치로 변경(좁은 웹 화면은 자동 줄바꿈)
- 행동 직접 입력 카드를 제목·입력칸·전송 버튼의 가로 한 줄로 변경(모바일 웹은 기존 세로 배치 유지)
- 추천 답안에 마우스를 올렸을 때 왼쪽 이동 효과를 위쪽 이동 효과로 변경
- 높이 760px 이하 창에서 스토리 상자 최소 높이와 도크 여백을 줄이는 배치 수정

---
### 검증 결과

- 하단 도크 데스크톱 통합 테스트(960×640, 1280×720, 1920×1080) 추가: 수정 전 코드에서 실패(도크 위쪽 74px), 수정 후 통과
- 데스크톱 통합 테스트 8개, 테스트 233개 통과, 타입 검사와 코드 검사 통과
- 1600×900과 960×640 화면 캡처로 추천 답안 접힘·펼침 상태 확인
- `pnpm exe:rebuild`(Rust 컴파일 약 35초)로 실행 파일 교체와 실행 확인

---
## 2026-10-01 — exe에 ChatBot 전체 기능 이식과 사이드바 데스크톱 화면

---
### 목표

Windows 실행 파일(exe)이 최신 ChatBot(Mate Verse) 기능을 똑같이 제공하고, 실행 프로그램답게 비슷하지만 다른 디자인(왼쪽 사이드바)으로 Text-Play와 함께 쓰이게 합니다. ChatBot이 바뀌면 계속 똑같이 따라갈 수 있게 합니다. 웹 화면(`src/app`)은 바꾸지 않습니다.

---
### 변경 파일

- `src/chatbot/**`, `tests/chatbot/**`: ChatBot `0bb7d5c` 소스·테스트 사본(동기화 스크립트가 생성)
- `public/images/characters/prologues/*`, `public/images/text-play/twilight-post-office.svg`: ChatBot에만 있던 공용 이미지
- `scripts/sync-chatbot.mjs`, `scripts/chatbot-status.mjs`, `scripts/rebuild-local-exe.ps1`, `scripts/verify-desktop-assets.mjs`, `package.json`
- `src/desktop/DesktopApp.tsx`, `DesktopRoutes.tsx`, `DesktopPlatformProvider.tsx`, `main.tsx`, `desktop.css`
- `src/desktop/router/*`, `src/desktop/next-compat/*`, `src/desktop/shell/*`
- `src/features/text-play/ui/text-play-save-summary.ts`, `TextPlayHome.tsx`
- `tsconfig.json`, `vite.desktop.config.ts`, `vitest.config.mts`
- 삭제: `src/desktop/desktop-navigation.ts`, `tests/unit/desktop-navigation.test.ts`(해시 경로표로 대체)
- 테스트: `tests/unit/desktop-routes.test.ts`, `desktop-areas.test.ts`, `chatbot-status.test.ts`, `tests/components/desktop-next-compat.test.tsx`, `tests/integration/desktop-app.test.tsx`, `tests/e2e/desktop-preview.spec.ts`

---
### 사용자 기능

- exe에서 ChatBot 전체 기능 사용: 메인·탐색(태그)·캐릭터 상세·만들기·수정·대화(버전 분기·다시 생성)·보관함·설정 5쪽·고객 지원·19+ 성인 인증
- 왼쪽 사이드바(320px): 로고와 주황 `Text-Play` 표시, 주요 메뉴, ChatBot 대화방, Text-Play 대화방, 설정·고객 지원. 오른쪽 경계에 여러 색 띠
- 상단 바: 사이드바 메뉴 순서대로 이동하는 이전·다음 메뉴 화살표(처음·끝 비활성), 현재 화면 제목, 19+ 스위치, 토큰 잔액, ChatBot 사용자 패널 팝업
- 메뉴에 없는 화면(상세·대화·만들기 등)은 소속 메뉴를 사이드바에 표시하고 그 기준으로 화살표 이동
- ChatBot 대화방: ChatBot 왼쪽 창 목록 그대로(검색·정렬·고정·날짜 묶음·턴 수·관계 막대·더보기 메뉴·보고 있는 대화 강조), 아래에 `ChatBot 기록 가져오기`(데이터 관리의 JSON 가져오기)
- Text-Play 대화방: ChatBot 대화방 아래에 따로 나뉜 영역. Text-Play 자동·수동 저장 기록을 최신 순으로 보여 주고 누르면 그 슬롯에서 이어하기, 기록이 없으면 안내와 `＋ Text-Play 작품 고르기`. 플레이하고 돌아오면 기록 반영
- 해시 주소로 새로고침·창 기록 유지, 화면 오류 경계(ChatBot 오류 화면), 창 제목에 현재 화면 이름
- 창 높이 760px 이하에서는 사이드바 전체 스크롤
- ChatBot 따라가기: `pnpm chatbot:status`(새 커밋 확인), `pnpm chatbot:sync`(커밋에서만 가져오기), `pnpm exe:rebuild`가 빌드 전에 새 커밋 안내

---
### 검증 결과

- 새 테스트는 구현 전 실패를 확인한 뒤 구현(경로·메뉴 영역·Next 호환 모듈·데스크톱 앱·Text-Play 대화방·확인 명령). 사이드바 ChatBot 대화방 검색·강조 테스트는 ChatBot `0bb7d5c` 동기화만으로 첫 실행부터 통과
- 테스트 파일 95개, 테스트 551개 통과(가져온 ChatBot 테스트 38개 파일 포함), 타입 검사와 코드 검사 통과
- 데스크톱 통합 테스트 13개 통과: 사이드바 이동, 화살표 순서, 캐릭터 대화, Text-Play 대화방 기록·이어하기, ChatBot에서 내보낸 JSON을 새 환경에서 가져와 사이드바 반영, 기존 Text-Play 흐름
- 데스크톱 빌드·자산 검사 통과, `pnpm exe:rebuild`로 실제 exe 화면 캡처 확인(앱 상태 버전 8 → 9 자동 변환 안내 표시)

---
### 남은 작업

- exe(WebView2)에서 JSON 내보내기 파일 저장, 링크 복사, `window.confirm` 확인 창 직접 확인
- 웹 ChatBot과 exe 기록의 자동 동기화는 서버나 공유 파일이 필요해 결정 대기(현재는 JSON 가져오기)

---
## 2026-10-01 — 내장 로컬 AI 작업 0 준비(측정 도구·고정 버전)

---
### 목표

내장 로컬 AI 후보(가벼움 Mi:dm 2.0 Mini, 가벼움 대체 Qwen3.5-2B, 표준 Qwen3.5-4B, 고성능 Qwen3.5-9B)를 Text-Play 문맥으로 실측할 수 있게 실행 엔진과 모델 버전을 고정하고, 받기·변환·측정 도구를 만듭니다. 계획은 `docs/plans/2026-10-01-bundled-local-ai.md`입니다.

---
### 변경 파일

- `src/features/text-play/ai/response-json-schema.ts`(새 파일): 작품별 응답 JSON 스키마
- `src/lib/adapters/structured-messages.ts`(새 파일), `src/lib/adapters/ollama-llm-adapter.ts`: 구조화 응답 메시지 생성을 공통 함수로 분리
- `scripts/local-ai/local-ai-pins.mjs`, `scripts/local-ai/text-play-eval.ts`, `scripts/lib/local-ai-files.mjs`, `scripts/lib/local-model-eval.mjs`(+ 타입 선언 `.d.mts`)
- `scripts/fetch-llama-runtime.mjs`, `scripts/build-local-models.mjs`, `scripts/evaluate-local-models.mjs`, `package.json`(`local-ai:runtime`·`local-ai:models`·`local-ai:eval`)
- `.gitignore`(`.local-ai/`), `tsconfig.json`·`eslint.config.mjs`(작업 폴더 검사 제외)
- 테스트: `tests/unit/text-play-response-json-schema.test.ts`, `structured-messages.test.ts`, `text-play-eval.test.ts`, `local-ai-pins.test.ts`, `local-ai-files.test.ts`, `local-model-eval.test.ts`, `local-ai-scripts.test.ts`
- 문서: 계획(`작업 0 준비 상태`), README, 인수인계, 구조

---
### 확인한 사실

- llama.cpp 안정판 `v0.5.0`은 빌드 `b11146`과 같은 커밋(`7fe450e`)이라 이 빌드로 고정하고 Windows Vulkan·CPU 압축 파일 SHA-256을 기록
- Mi:dm 2.0 Mini와 Qwen3.5 모두 공식 GGUF가 없음(커뮤니티 변환본만 있음) → 공식 가중치를 직접 변환
- Qwen3.5는 기본이 생각 모드이고 선형·전체 주의 혼합 구조이며 이미지 입력을 포함 → 요청마다 `enable_thinking: false`, 글자 부분만 변환
- Mi:dm 2.0 Mini는 Llama 구조 48층, 최대 문맥 32,768, 공식 생성 설정(온도 0.8, top-p 0.75, top-k 20)
- 작업 컴퓨터: Ryzen 7 9800X3D(8코어), RTX 5070 Ti 16GB와 내장 Radeon, RAM 32GB, 올라마 없음

---
### 사용자 기능

- 아직 사용자 화면 변화는 없음(측정 준비 단계)
- `pnpm local-ai:runtime`: 고정 실행 엔진 받기·검사·풀기
- `pnpm local-ai:models`: 공식 가중치 받기(해시 검사) → 변환 → 양자화 → 크기·SHA-256 목록 기록 → 원본 삭제
- `pnpm local-ai:eval`: 모델·실행 방식별 실행 엔진을 로컬 전용 주소와 일회용 키로 띄워 평가 문맥 30개 측정, `results.json`·`report.md` 저장(문맥별로 모델 응답을 나란히 비교)

---
### 검증 결과

- 새 테스트 41개는 구현 전 실패(모듈 없음)를 확인한 뒤 구현해 통과
- 가짜 OpenAI 호환 서버로 측정 실행기 전체 흐름 확인: 앱과 같은 메시지, JSON 스키마 강제, Qwen 생성 설정과 생각 끄기, 결과·보고서 저장
- 받다 만 파일 이어받기, 서버가 이어받기를 무시할 때 처음부터 받기, SHA-256 불일치 시 파일 삭제를 시험 서버로 확인
- `--dry-run`으로 실행 엔진·모델 만들기 계획 출력 확인
- 테스트 파일 102개, 테스트 592개 통과, 타입 검사와 코드 검사 통과

---
### 남은 작업

- 실행 엔진과 공식 가중치 다운로드가 작업 세션의 자동 권한 검사에서 막혀 실측은 아직 못 함. 사용자가 직접 실행하거나 허용한 뒤 `pnpm local-ai:runtime` → `pnpm local-ai:models` → `pnpm local-ai:eval`
- 실측 결과로 가벼움 모델 확정(Mi:dm Q4·Q5 대 Qwen3.5-2B), `model-catalog.json` 작성, 계획 문서 갱신
- 그래픽 6GB 기준은 내장 그래픽·`cpu:4` 측정과 메모리 대역폭 비율로 추정

---
## 2026-10-01 — 내장 AI 기반 1: AI 연결 통로

---
### 목표

사용자 지시에 따라 기반을 먼저 만들고 기능을 덧붙이는 순서로 내장 로컬 AI를 진행합니다. 첫 기반으로 앱이 `내장 AI`를 하나의 AI 선택지로 알고, 답변 형식(JSON 스키마)을 함께 보내 Rust를 거쳐 이 PC의 실행 엔진과 대화하는 통로를 만듭니다. 실행 엔진을 켜고 끄는 일은 다음 기반(엔진 관리자)에서 합니다.

---
### 변경 파일

- 새 파일: `src/lib/adapters/bundled-llm-adapter.ts`, `bundled-runtime-client.ts`, `chat-messages.ts`, `local-ai-stream.ts`, `src/desktop/tauri-bundled-client.ts`, `tauri-stream.ts`, `src-tauri/src/bundled_ai.rs`, `scripts/local-ai/fake-openai-server.mjs`(+ `.d.mts`)
- 수정: `src/desktop/tauri-ollama-client.ts`(공용 스트림 처리 사용), `src/desktop/desktop-llm.ts`, `src/lib/adapters/ollama-llm-adapter.ts`·`ollama-client.ts`·`llm-adapter.ts`·`llm-service-error.ts`·`create-llm-adapter.ts`, `src/features/text-play/ai/context-builder.ts`, `preferences/text-play-preferences.ts`, `session/text-play-controller.ts`, `ui/TextPlayScreen.tsx`, `ui/TextPlaySettingsDialog.tsx`, `src-tauri/src/main.rs`·`local_ai.rs`
- 테스트: `tests/unit/bundled-llm-adapter.test.ts`, `chat-messages.test.ts`, `fake-openai-server.test.ts`(새 파일), `desktop-llm.test.ts`, `text-play-preferences.test.ts`, `text-play-ai.test.ts`, `tests/integration/text-play-controller.test.ts`, `tests/components/text-play-screen.test.tsx`, `text-play-settings-dialog.test.tsx`, Rust `bundled_ai` 테스트 9개
- 문서: 계획(`진행 상태: 기반 1`), 인수인계, 구조

---
### 사용자 기능

- 플레이 화면 AI 선택과 게임 설정에 `내장 AI(이 PC)` 추가. Windows 실행 프로그램에서만 고를 수 있고 모델 선택은 필요 없음
- 실행 엔진이 아직 없으면 "내장 AI가 아직 준비되지 않았습니다. 다른 AI를 선택해 주세요."와 `같은 입력 다시 시도` 표시
- 확인용: `MATE_TEXT_PLAY_BUNDLED_AI_URL`(이 PC 주소만 허용)로 exe를 OpenAI 호환 서버에 연결할 수 있고, `node scripts/local-ai/fake-openai-server.mjs`가 모델 없이 Text-Play 형식 응답을 돌려줌

---
### 검증 결과

- 새·수정 테스트는 구현 전 실패(모듈 없음, 선택지 없음, 오류 안내 불일치, Rust 컴파일 실패)를 확인한 뒤 구현해 통과
- 테스트 파일 105개, 테스트 607개 통과, 타입 검사·코드 검사 통과, Rust 테스트 13개 통과·경고 없음
- 데스크톱 통합 테스트 13개 통과
- `pnpm exe:rebuild` 후 실제 exe에서 확인: 엔진 없음 → 미준비 안내, 가짜 서버 연결 → 서술·리라 대사 표시와 자동 저장(WebView2 원격 디버깅으로 조작·캡처)

---
### 남은 작업

- 기반 2 엔진 관리자: llama-server 실행·`/health` 대기·종료(Job Object), 연결 정보 채우기, Vulkan 실패 시 CPU 재시작
- 기반 3 모델 보관함, 기반 4 `AI 모델` 화면, 이후 모델 실측과 설치 프로그램

---
## 2026-10-01 — 내장 AI 기반 2: 엔진 관리자

---
### 목표

내장 AI 실행 엔진(llama-server)을 이 PC 안에서 켜고, 준비될 때까지 기다리고, 앱이 끝나거나 오래 쓰지 않으면 끄는 관리자를 만듭니다. 실제 엔진·모델 없이 가짜 프로세스와 가짜 엔진으로 확인합니다.

---
### 변경 파일

- 새 파일: `src-tauri/src/local_runtime.rs`, `src-tauri/examples/fake_llama_server.rs`(확인용, 설치본 제외)
- 수정: `src-tauri/src/bundled_ai.rs`(연결 정보가 없으면 엔진 관리자가 켬, 사용 시각 기록), `src-tauri/src/main.rs`(관리자 등록·쉬는 시간 감시·앱 종료 시 끄기, 상태·끄기 명령), `src-tauri/Cargo.toml`(`tokio`·`getrandom`·`windows-sys`, 모두 이미 받은 버전)
- 문서: 계획(`진행 상태: 기반 2`), 인수인계, 구조

---
### 사용자 기능

- 내장 AI로 첫 행동을 보내면 엔진이 자동으로 켜짐. 그래픽(Vulkan, 메모리가 가장 큰 장치 하나)으로 먼저 켜고 실패하면 CPU로 다시 켬
- 이미 켜진 엔진은 다음 행동에 그대로 사용, 10분 동안 쓰지 않으면 꺼서 메모리를 돌려줌
- 앱을 닫거나 강제로 끝내도 엔진이 남지 않음(Job Object)
- 실행 엔진·모델이 없으면 기존처럼 "내장 AI가 아직 준비되지 않았습니다" 안내

---
### 검증 결과

- Rust 테스트 10개를 먼저 써서 컴파일 실패를 확인한 뒤 구현: 장치 선택, 실행 인자, 일회용 키, 쉬는 시간, 설정 해석, 미준비, 그래픽 실패 → CPU 전환·재사용, 그래픽 장치 사용, 모두 실패, 끄기·쉬는 시간 내리기
- Rust 테스트 23개 통과, 앱 빌드 경고 없음
- `pnpm exe:rebuild` 후 가짜 엔진으로 실제 exe 확인: 꺼진 상태에서 첫 응답 3.9초(그래픽 실패 → CPU 전환 포함), 화면에 응답 표시, 앱 강제 종료 2초 뒤 엔진 프로세스 0개
- 백그라운드로 띄운 exe는 창 핸들이 없어 일반 닫기 신호를 받지 못해 정상 닫기 경로는 자동으로 확인하지 못함(강제 종료에서도 엔진이 끝나는 것은 확인)

---
### 남은 작업

- 기반 3 모델 보관함: 사양 확인, 모델 목록·다운로드·검사·삭제, 고른 모델을 엔진 관리자 설정에 넣기(지금은 환경 변수)
- 기반 4 `AI 모델` 화면(엔진 상태 표시 포함)

---
## 2026-10-01 — 내장 AI 기반 3: 모델 보관함

---
### 목표

이 PC 사양을 확인하고, 내장 AI 모델 목록·적합도·받기(이어받기·검사·취소)·삭제·선택을 맡는 보관함을 만듭니다. 고른 모델은 엔진 관리자가 바로 씁니다. 실제 모델 없이 시험 목록과 작은 가짜 모델 파일로 확인합니다.

---
### 변경 파일

- 새 파일: `src-tauri/src/hardware.rs`, `src-tauri/src/model_store.rs`, `src-tauri/resources/model-catalog.json`
- 수정: `src-tauri/src/local_runtime.rs`(`set_model`, 시작 중 모델 변경·끄기 감지), `src-tauri/src/main.rs`(보관함 생성·선택 모델 연결·명령 5개 등록), `src-tauri/Cargo.toml`(`sha2`, `windows` DXGI, `windows-sys` 메모리·디스크 기능, 모두 이미 받은 버전)
- 문서: 계획(`진행 상태: 기반 3`), 인수인계, 구조

---
### 사용자 기능

- (화면은 기반 4) 이 PC의 그래픽 메모리·RAM·남은 공간과 모델별 적합도(권장·가능·느릴 수 있음·부족) 확인
- 모델 받기: 끊기면 이어받기, 신뢰 주소(허깅페이스·깃허브)만 허용, SHA-256이 다르면 지우고 안내, 취소하면 받은 부분 보존, 공간이 모델 크기의 1.2배보다 적으면 시작 전에 막음
- 모델 선택은 앱을 다시 켜도 유지되고, 선택 모델을 지우면 엔진을 끄고 선택 해제
- 실제 모델 3종은 받기 정보가 아직 없어 `준비 중`(보관 위치 결정과 실측 뒤 채움)

---
### 검증 결과

- Rust 테스트를 먼저 써서 컴파일 실패를 확인한 뒤 구현: 내장 목록, 목록 검증, 허용 주소, 적합도 표, 디스크 여유, 받기·설치·선택·선택 유지, 이어받기, 해시 불일치 삭제, 받기 거부 이유, 취소, 삭제, 화면용 정보, 그래픽 장치 선택, 실제 PC 조회, 모델 변경
- exe 확인 중 "엔진이 켜지는 동안 모델을 지우면 지운 모델로 엔진이 남는" 문제를 발견해 테스트로 재현(실패 확인) 후 수정
- Rust 테스트 39개 통과, 앱 빌드 경고 없음
- `pnpm exe:rebuild` 후 실제 exe에서 확인: 이 PC를 RTX 5070 Ti 15.6GiB·RAM 31.2GiB·남은 공간 100GB로 판정하고 세 모델 모두 권장, 시험 목록으로 받기 → 검사 → 선택 → 내장 AI 응답(받은 모델로 엔진 시작) → 삭제 → 엔진 꺼짐·남은 프로세스 0개

---
### 남은 작업

- 기반 4 `AI 모델` 화면: 모델 카드·적합도·받기 진행률·취소·사용·삭제, 엔진 상태, 사이드바 메뉴(설정 · AI 모델 · 고객 지원)
- 실제 모델 받기 정보(주소·SHA-256·정확한 크기)는 결정 1과 작업 0 실측 뒤 목록에 채우기

---
## 2026-10-01 — 내장 AI 기반 4: AI 모델 화면(기반 완성)

---
### 목표

기반 1~3(연결 통로·엔진 관리자·모델 보관함)을 사용자가 보고 누를 수 있는 `AI 모델` 화면으로 묶어, 모델 파일만 넣으면 동작하는 내장 AI 기반을 완성합니다.

---
### 변경 파일

- 새 파일: `src/desktop/ai-models/AiModelsScreen.tsx`·`.module.css`, `model-store-client.ts`, `tauri-model-store-client.ts`, `ai-model-view.ts`
- 수정: `src/desktop/router/desktop-routes.ts`(`#/ai-models`), `desktop-areas.ts`(프로그램 메뉴 `AI 모델`), `src/desktop/shell/DesktopShell.tsx`(칩 아이콘), `src/desktop/DesktopRoutes.tsx`, `src/desktop/DesktopApp.tsx`(보관함 통신기 주입)
- 테스트: `tests/unit/ai-model-view.test.ts`, `tauri-model-store-client.test.ts`, `ai-models-screen-styles.test.ts`, `tests/components/ai-models-screen.test.tsx`(새 파일), `tests/unit/desktop-areas.test.ts`, `desktop-routes.test.ts`, `tests/integration/desktop-app.test.tsx`, `tests/e2e/desktop-preview.spec.ts`(화살표 순서)
- 문서: 계획(`진행 상태: 기반 4`), 인수인계, 구조

---
### 사용자 기능

- 사이드바 프로그램 메뉴 `설정 · AI 모델 · 고객 지원`, 상단 바 화살표도 이 순서
- `AI 모델` 화면: 이 PC 사양(그래픽·RAM·남은 공간), 실행 엔진 상태와 `엔진 끄기`, 가벼움·표준·고성능 카드(크기·라이선스·이 PC 적합도·사용 중)
- 카드 버튼: `준비 중`·`공간 부족`(막힘), `다운로드`·`그래도 다운로드`(부족 경고)·`이어받기`, 받는 중 진행 막대·속도·남은 시간·`취소`, 파일 검사 중, `사용하기`, `삭제`(화면 안에서 한 번 더 확인)
- 실제 모델 3종은 받기 정보가 아직 없어 `준비 중`

---
### 검증 결과

- 새·수정 테스트는 구현 전 실패(모듈 없음, 메뉴·경로 없음, 화살표 순서 불일치)를 확인한 뒤 구현해 통과. 실패 중 `그래픽(Vulkan)로` 조사 오류를 발견해 `으로`로 고침
- 테스트 파일 109개, 테스트 626개 통과, 타입 검사·코드 검사 통과, 데스크톱 통합 테스트 13개 통과
- `pnpm exe:rebuild` 후 실제 exe에서 확인: 이 PC 정보와 카드 3개(`준비 중`) 표시, 시험 목록으로 화면 버튼만 눌러 다운로드 → 사용하기 → 삭제 확인
- 처음 화면에서 창의 어두운 바탕 때문에 제목·설명이 보이지 않는 문제를 exe 캡처로 발견해 밝은 바탕을 직접 칠하도록 고치고 스타일 테스트 추가

---
### 남은 작업

- 덧붙이기 1: 모델 실측(작업 0, 다운로드 승인 필요)과 보관 위치 결정(결정 1) → `model-catalog.json` 받기 정보 채우기
- 덧붙이기 2: 설치 프로그램(실행 엔진 리소스 포함, 설치 때 가벼운 모델 받기, 제거 때 모델 삭제 질문)
- 덧붙이기 3: 응답 품질(장면 설명·인물 이름 문맥, 모델별 설정)

---
## 2026-10-01 — 가벼운 모델 Mi:dm 2.0 Mini 받기·적용

---
### 목표

사용자 요청으로 가벼운 기본 모델을 실제로 받아 GGUF로 만들고, 완성된 기반(연결 통로·엔진 관리자·모델 보관함·AI 모델 화면)에 적용해 exe에서 대답을 받아 봅니다.

---
### 변경 파일

- 새 파일: `scripts/install-local-ai.mjs`(`pnpm local-ai:install`)
- 수정: `src-tauri/src/local_runtime.rs`(전용 그래픽 이름으로 Vulkan 장치 선택, 전용 그래픽이 없으면 CPU만, 엔진 폴더 고르기), `src-tauri/src/main.rs`(DXGI 그래픽 이름 전달, `%LOCALAPPDATA%\MATE Text-Play\runtime` 폴더 사용), `src-tauri/resources/model-catalog.json`(가벼운 모델 실제 크기), `scripts/lib/local-model-eval.mjs`·`.d.mts`·`scripts/evaluate-local-models.mjs`(장치가 여럿이면 직접 고르게 함), `package.json`
- 테스트: Rust 장치 선택·내장 그래픽 공유 메모리·전용 그래픽 없음·엔진 폴더 선택, `tests/unit/local-model-eval.test.ts`, `local-ai-scripts.test.ts`(설치 계획)
- 문서: 계획(`가벼운 모델 … 적용`), 인수인계

---
### 사용자 기능

- 앱 `AI 모델` 화면의 가벼움 카드가 `사용하기`/`사용 중`으로 바뀌고, Text-Play에서 `내장 AI(이 PC)`를 고르면 이 PC의 Mi:dm 2.0 Mini가 대답함(RTX 5070 Ti에서 턴마다 약 0.8초)
- 그래픽 장치가 여럿인 PC에서 공유 메모리를 크게 보고하는 내장 그래픽 대신 전용 그래픽으로 실행

---
### 검증 결과

- 받기: llama.cpp b11146 Vulkan·CPU, Mi:dm 공식 가중치 4.29GB 모두 SHA-256 일치, 변환·양자화 성공(Q4_K_M `c5a7c32a…` 1.33GiB, Q5_K_M `df3b004a…` 1.54GiB), 중간 파일 자동 삭제
- 평가 문맥 30개: JSON 형식 모두 100%, 행동 통과 90~100%, 한국어 97%, 한 턴 중앙값 그래픽 0.5~0.7초·CPU 4.4~5.6초(90% 12.7초 이하)
- 실제 PC에서 내장 Radeon이 공유 메모리 16,209MiB를 보고해 RTX 5070 Ti보다 커 보이는 문제를 발견해 테스트로 재현(실패 확인) 후 수정
- 앱 테스트 627개, Rust 테스트 42개 통과, 타입 검사·코드 검사 통과
- exe: `AI 모델`에서 사용하기 → Text-Play 내장 AI 5턴 응답 성공. 첫 시도 한 번은 불가능한 행동 제안으로 턴 전체 거부

---
### 남은 작업

- 응답 품질(작업 5): 문맥이 식별자뿐이라 장면을 지어내거나 `Lyra` 같은 내부 이름, 사용자 대사 따라 하기, 영어 입력에 영어 응답이 보임 → 장면 서술·인물 표시 이름·역할 규칙을 문맥에 넣고, 잘못된 행동만 빼는 방식 검토
- 측정 보고서 메모리 칸(새 llama.cpp 기록 형식) 보완, 표준·고성능 모델 받기·측정, 보관 위치(결정 1)와 받기 정보, 설치 프로그램

---
## 2026-10-01 — 내장 AI 응답 품질 다듬기 1차

---
### 목표

가벼운 모델(Mi:dm 2.0 Mini)의 대답이 이야기 밖에서 설명하거나 사용자 말을 따라 하고, 내부 이름(`Lyra`)을 쓰고, 맞지 않는 행동으로 턴이 거부되던 문제를 줄입니다. 같은 평가 문맥 30개로 전후를 비교합니다.

---
### 변경 파일

- `src/features/text-play/core/types.ts`(`TextPlayGlossary`), `data/demo-package.ts`(리라 소개와 이름들)
- `src/features/text-play/ai/context-builder.ts`(쉬운 한국어 문맥, 이야기꾼 규칙, 짧은 예시), `response-json-schema.ts`(AI 행동은 능력치·관계·아이템만, 발화자는 등장인물 표시 이름만), `action-validator.ts`(`selectApplicableActions`)
- `src/features/text-play/session/text-play-controller.ts`(잘못된 행동만 빼고 반영), `scripts/local-ai/text-play-eval.ts`(같은 규칙으로 판정)
- 테스트: `tests/unit/text-play-ai.test.ts`, `text-play-response-json-schema.test.ts`, `tests/integration/text-play-controller.test.ts`
- 문서: 계획(`응답 품질 다듬기 1차`), 인수인계

---
### 사용자 기능

- 내장 AI 대답이 "당신은 …"으로 시작하는 이야기 서술과 리라의 대사로 나오고, 영어로 입력해도 한국어로 답함
- AI가 맞지 않는 행동을 제안해도 턴 전체가 거부되지 않고, 그 행동만 빠진 채 이야기가 이어짐
- 장소 이동·퀘스트·사건·엔딩은 작품 선택지로만 진행(AI가 퀘스트를 먼저 시작해 선택지가 막히는 일 방지)

---
### 검증 결과

- 새·수정 테스트는 구현 전 실패를 확인한 뒤 구현해 통과
- 평가(Q4·그래픽): 행동 통과 90% → 100%, 규칙 위반 차단 3/4 → 4/4, 한국어 97% → 100%, 한 턴 중앙값 0.7초 → 0.4초, CPU 90% 12.7초 → 4.3초
- 테스트 파일 109개, 테스트 632개 통과, 타입 검사·코드 검사 통과, 데스크톱 통합 테스트 13개 통과(1420 서버를 다시 띄운 뒤)
- exe에서 내장 AI 5턴 모두 반영, 이야기다운 서술·리라 대사 확인

---
### 남은 작업

- 응답 품질 2차: 상태를 잘못 읽는 경우, 서술이 행동과 어긋나는 경우, 예시 문장을 따라 쓰는 경우
- 화면에 보이는 내부 식별자(`FOREST-GATE` 장소 표시)를 용어집 이름으로 바꾸기

---
## 2026-10-01 — ChatBot 09ede9b(스토리 모드) 동기화

---
### 변경 내용

- `pnpm chatbot:sync`로 ChatBot `09ede9b`(스토리 모드와 안전·편의 보강) 소스·테스트 가져오기. 앱 상태 버전 9 → 10 변환은 ChatBot 규칙 그대로 사용
- exe 경로표에 스토리 모드 주소 추가: `#/stories`(스토리 홈), `#/stories/new`, `#/stories/<id>`, `#/stories/<id>/chat`, `#/stories/<id>/edit`. 홈·상세·대화는 메인 소속, 만들기·수정은 내 작품 소속으로 상단 바 화살표와 사이드바 강조를 따름
- 테스트: 경로·메뉴 소속 단위 테스트, 데스크톱 앱 통합 테스트(스토리 홈·새 스토리 화면)

---
### 검증 결과

- 테스트 파일 116개, 테스트 699개 통과(가져온 ChatBot 스토리 테스트 포함), 타입 검사·코드 검사 통과, 데스크톱 통합 테스트 13개 통과, `pnpm exe:rebuild` 성공
- 미리보기에서 스토리 모드 화면이 사이드바 틀 안에 열리는 것 확인

---
## 2026-10-01 — 한국어·영어 나누기 1~2단계(언어 설정, AI 답변 언어)

---
### 변경 파일

- `src/features/text-play/preferences/text-play-preferences.ts`(`AppLanguage`, `language` 기본 `ko`, 예전 저장값은 `ko`로 채움), `TextPlayPreferencesProvider.tsx`(문서 `lang` 반영), `ui/TextPlaySettingsDialog.tsx`(`언어 / Language` 선택)
- `src/features/text-play/core/types.ts`(`TextPlayPackageTranslation`, `translations.en`), `data/demo-package.ts`(샘플 작품 영어판), 새 `data/localize-package.ts`(고른 언어의 작품, 저장된 한국어 기록 바꾸기)
- `src/features/text-play/ai/context-builder.ts`(언어별 이야기꾼 규칙·예시·문맥 문구), `response-json-schema.ts`(영어 글자 수 상한 2배)
- `src/lib/adapters/llm-adapter.ts`(`StructuredLLMInput.language`), `mock-llm-adapter.ts`(영어 응답)
- 언어 전달: `session/text-play-controller.ts` → `session/TextPlayProvider.tsx` → `src/desktop/DesktopRoutes.tsx`
- 테스트: 설정·설정 창·창 해상도·데스크톱 AI 선택, `text-play-ai`, `mock-adapters`, 세션 제어기
- 문서: 계획 `docs/plans/2026-10-01-language-ko-en.md`

---
### 사용자 기능

- Text-Play 설정 창에서 `한국어`·`English`를 고르면 AI의 **다음 답변부터** 그 언어로 나옴(이미 나온 기록은 그대로). 한국어로 입력해도 English를 골랐으면 영어로 답함
- 영어 답변의 대사 인물 이름은 `Lyra`, AI 문맥의 작품 제목·장면·선택지도 영어판 사용

---
### 검증 결과

- 새 테스트는 구현 전 실패를 확인한 뒤 구현해 통과
- 테스트 파일 116개, 테스트 707개 통과, 타입 검사·코드 검사 통과, `pnpm exe:rebuild` 성공
- exe(내장 AI Mi:dm, 그래픽)에서 English로 9턴: 모두 영어 답변, 한 턴 0.5~1초, 골드·엔딩 요구 4번 모두 능력치 변화 없음

---
### 남은 작업

- 3단계: 화면 글자 영어판(Text-Play 플레이·홈·설정·저장 창, 사이드바·상단 바·AI 모델 화면)
- 4단계: ChatBot 저장소에 언어 기능 요청 후 동기화
- 영어 답변 품질: 가끔 `The player`로 부름, 리라 대사가 서술처럼 나옴, 1번은 서술이 끊기고 저장 안내 없이 끝남(다시 3번 해 보니 재현 안 됨)

---
## 2026-10-01 — 한국어·영어 나누기 3단계(화면 글자 영어판)

---
### 변경 파일

- 기반: 새 `src/features/text-play/i18n/localized-text.ts`(`defineText(한국어, 영어)`, `dateLocale`), `TextPlayPreferencesProvider.tsx`(`useAppLanguage`)
- Text-Play 화면: 새 `ui/text-play-ui-text.ts`, `TextPlayScreen`·`StoryLog`·`ChoiceList`·`StatusPanel`·`InventoryPanel`·`SaveManager`·`TextPlaySettingsDialog`·`TextPlayDialog`·`TextPlayHome`, `text-play-recommendations.ts`, `text-play-save-summary.ts`, `catalog/text-play-catalog.ts`(`localizeTextPlayWork`)
- 세션 안내: 새 `session/session-messages.ts`, `text-play-controller.ts`, `TextPlayProvider.tsx`(언어 기본값은 설정, 안내는 참조로 읽어 언어를 바꿔도 저장을 다시 불러오지 않음), `text-play-reducer.ts`(중지 안내 문구 전달)
- 작품 언어판: `data/localize-package.ts`(`createSpeakerNamer`), `ai/context-builder.ts`(같은 함수 사용)
- 데스크톱: 새 `src/desktop/desktop-ui-text.ts`, `router/desktop-routes.ts`(`getDesktopRouteTitle(match, language)`), `shell/DesktopShell.tsx`, `shell/TextPlayRoomPanel.tsx`, `desktop-llm.ts`, `DesktopRoutes.tsx`, `ai-models/ai-model-view.ts`(`AI_MODELS_TEXT`, `modelDisplayName`), `ai-models/AiModelsScreen.tsx`
- 테스트: 새 `tests/components/text-play-english-ui.test.tsx`, `tests/unit/desktop-english-text.test.ts`, AI 모델 화면 영어 테스트, 제어기 영어 안내 테스트, 내부 식별자 대신 표시 이름을 보는 기존 테스트 3개·데스크톱 통합 테스트 2개 수정

---
### 사용자 기능

- 설정에서 English를 고르면 Text-Play 메인·플레이 화면·상태 패널·저장 창·설정 창, 사이드바 메뉴·상단 바 제목·Text-Play 대화방, AI 모델 화면이 영어로 바뀜
- 샘플 작품은 제목·장면·선택지·엔딩·아이템·퀘스트 이름까지 영어. 이미 저장된 한국어 장면 서술·선택 기록도 영어로 보임(AI가 이미 한 말은 그대로)
- 한국어 화면에서도 `FOREST-GATE`, `lyra`, `moon-lantern`, `voices-below` 같은 내부 식별자 대신 표시 이름이 보임

---
### 검증 결과

- 새 테스트는 구현 전 실패를 확인한 뒤 구현해 통과
- 테스트 파일 118개, 테스트 718개 통과, 타입 검사·코드 검사 통과, 데스크톱 통합 테스트 13개 통과(1420 서버를 다시 띄운 뒤), `pnpm exe:rebuild` 성공
- exe에서 English로 메인·플레이·설정·AI 모델 화면 캡처 확인

---
### 남은 작업

- 4단계: ChatBot 저장소에 언어 기능 요청(요청 문장은 계획 문서 끝) 후 동기화. 그 전까지 사이드바 대화방 목록·캐릭터·설정 화면은 한국어
- 메인의 샘플 외 작품 50개 내용(제목·소개·태그) 영어판, 엔진(Rust)이 보내는 실패 이유 문구 영어판

---
## 2026-10-01 — 한국어·영어 나누기 4단계 요청과 메인 작품 50개 영어판

---
### 변경 내용

- ChatBot 세션에 언어 기능 요청 전달(요청 문장은 계획 문서 끝). ChatBot 쪽 커밋 후 동기화 예정
- 새 `src/features/text-play/catalog/text-play-catalog-en.ts`: 메인 작품 50개 영어판(기본 캐릭터 작품 7개, 콘셉트 작품 43개)과 공통 태그 사전
- `catalog/text-play-catalog.ts`: `localizeTextPlayWork`가 모든 작품 영어판을 쓰고, 검색은 한국어·영어 모두로 찾음(장르 필터는 한국어 태그 기준 그대로)
- `ui/TextPlayHome.tsx`: 영어 화면에서 장르가 `기타`인 작품은 첫 영어 태그를 장르 표시로 사용
- 테스트: 새 `tests/unit/text-play-catalog-english.test.ts`(모든 작품 영어판 존재, 한국어 원문 유지, 영어 검색·장르 필터)

---
### 검증 결과

- 새 테스트는 구현 전 실패를 확인한 뒤 구현해 통과
- 테스트 파일 119개, 테스트 721개 통과, 타입 검사·코드 검사 통과, `pnpm exe:rebuild` 성공
- exe English 메인 화면(오늘의 작품·랭킹·전체 작품·작품 상세)에 한국어가 남지 않음 확인

---
## 2026-10-01 — ChatBot dd8fddb(밝은 디자인·채팅방 기능·이미지 스튜디오·알림함) 동기화

---
### 변경 내용

- `pnpm chatbot:sync`로 ChatBot `a337460`(밝은 디자인 전환 마무리, 메뉴 추천·관심 목록, 예시 스토리 확장, 이미지 스튜디오)과 `dd8fddb`(채팅방 기능 18종, 고정 INFO 상태창, 대화 폴더, 알림함)를 가져옴. exe 대화 화면이 ChatBot 웹과 같은 밝은 디자인이 됨(사용자 요청)
- 새 화면 이미지 스튜디오: 경로 `#/images`, 사이드바 `이미지` 메뉴(ChatBot 머리 메뉴처럼 내 작품 다음), 상단 바 제목 `이미지 스튜디오`·`Image studio`, 메뉴 대표색
- 상단 바에 ChatBot 알림함(종) 추가. 종 스타일은 ChatBot 셸 규칙이라 `.shell`로 감싸고 높이·바탕만 끔
- `vite.desktop.config.ts`: ChatBot 코드가 읽는 `process.env.NEXT_PUBLIC_SERVICE_REGION`을 빌드 때 채움(기본 `kr`). 없으면 이미지 스튜디오가 `process is not defined`로 열리지 않았음
- 테스트: 경로·메뉴 순서·화면 제목·빌드 설정 단위 테스트, 데스크톱 통합 테스트(이미지 메뉴 이동, 화살표 순서, 알림함 크기)

---
### 검증 결과

- 테스트 파일 127개, 테스트 787개 통과(가져온 ChatBot 테스트 포함), 타입 검사·코드 검사 통과, 데스크톱 통합 테스트 13개 통과, `pnpm exe:rebuild` 성공
- exe에서 대화 화면(흰 카드·보라 말풍선·INFO 상태창·오른쪽 설정 패널), 이미지 스튜디오, 상단 바 알림함 캡처 확인

---
## 2026-10-08 — ChatBot 03da2e4 동기화(커밋 66개)

---
### 변경 내용

- `pnpm chatbot:sync`로 ChatBot `03da2e4`까지 가져옴: 사이트 다크 모드, 관계 스탯, 채팅 화면 장면 영역 제거, 출석과 미션, 친구 초대, 스탯 이벤트, 토큰 내역, 제작 도구, 설정 페이지, 대화 다시 보기, 메인 정렬·검색, 한국어/영어(사전 약 1,660개), 실제 AI 통로, 로그인·서버 저장 틀(연습용)
- 동기화 스크립트: 번역 점검 테스트가 쓰는 `scripts/i18n-keys.ts`도 `tests/chatbot/scripts`로 가져오고 `src/chatbot`을 보도록 경로를 바꿈(자리를 못 찾으면 멈춰 알림)
- 테스트 준비: `src/test/setup.ts`가 브라우저 환경이면 ChatBot 준비 파일도 불러옴(화면 언어 한국어 고정). 데스크톱 통합 테스트 브라우저 언어 `ko-KR` 고정
- 새 화면 주소: `#/login`, `#/rewards`(설정 소속), `#/invite/<코드>`, `#/auth/callback`, `#/auth/reset`과 상단 바 제목(한국어·영어)
- 데스크톱 빌드: `process.env`를 빈 값으로 바꿔 넣음(새 환경 값이 생겨도 화면이 깨지지 않고, 계정 서비스는 연습용)
- 데스크톱 틀: 다크 모드 스위치와 테마 적용, 다크 로고, 이용 시간 알림, 19+ 보기 끔 안내, 받을 보상 점, 사용자 패널의 출석·미션 카드·로그아웃·19+ 보기 끄기, 계정 맞추기, 틀 색을 밝게·어둡게 함께 바뀌는 값으로 변경
- 사이드바: ChatBot 대화방 목록에 탭·폴더 줄이 늘어 카드가 가려지던 문제 수정(대화방 영역 전체 스크롤, 목록 높이 상한), ChatBot `.grid`의 화면 높이 최소값 때문에 Text-Play 대화방이 화면 밖으로 밀리던 문제 수정

---
### 검증 결과

- 테스트 파일 188개, 테스트 1,194개 통과(가져온 ChatBot 테스트 포함), 타입 검사·코드 검사 통과, 데스크톱 통합 테스트 13개 통과, `pnpm exe:rebuild` 성공
- 개발 서버에서 메인·대화·출석과 미션·로그인·이미지·Text-Play·설정을 밝게·어둡게 캡처, 콘솔 오류 없음
- exe에서 같은 화면이 열리고 사이드바의 Text-Play 대화방이 ChatBot 대화방 바로 아래에 붙는 것 확인

---
### 남은 작업

- 어두운 테마에서 Text-Play 메인·AI 모델 화면은 아직 밝은 색 그대로(플레이 화면 디자인 작업에서 함께 맞춤)
- exe의 ChatBot 대화는 연습용 AI만 사용(실제 AI 통로는 Next 서버가 필요). 내장 로컬 AI를 ChatBot 대화에 연결하는 일은 미정
- 언어 연결: ChatBot `settings.language`와 Text-Play 설정 언어를 하나로 맞추기(다음 커밋)
