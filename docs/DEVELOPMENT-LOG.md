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

