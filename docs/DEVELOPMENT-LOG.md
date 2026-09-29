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
