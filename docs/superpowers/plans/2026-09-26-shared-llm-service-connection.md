# Shared LLM Service Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Character Chat과 Text-Play가 비밀키를 노출하지 않고 같은 LLM 서버 경계를 사용하게 한다.

**Architecture:** 브라우저의 `HttpLLMAdapter`가 같은 출처 `/api/llm`만 호출하고, Next.js 서버 프록시가 환경 변수로 지정한 실제 ChatBot LLM 엔드포인트에 검증된 요청만 전달한다. 실제 서버 정보가 없으면 Mock을 기본값으로 유지한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, NDJSON 스트림, Vitest

**Spec:** `docs/superpowers/specs/2026-09-26-shared-llm-service-connection-design.md`

## Global Constraints

- 모든 TypeScript 코드는 Allman 스타일과 줄별 한글 명사형 주석을 사용한다.
- 특정 LLM 공급자와 모델명을 추측하지 않는다.
- 비밀키·외부 URL·브라우저 쿠키를 클라이언트 응답이나 외부 전달 데이터에 포함하지 않는다.
- 외부 액션은 기존 Text-Play 검증기를 통과한 뒤에만 적용한다.
- 실제 서버 미설정 환경의 Mock 동작을 유지한다.

## Review Focus

- NDJSON 한 줄이 여러 네트워크 조각으로 나뉘는 경우에도 내용이 유실되지 않는가.
- 마지막 줄에 개행이 없어도 완료 프레임을 처리하는가.
- 401·402·429·503 상태가 서로 다른 오류로 전달되는가.
- 64KiB 초과 요청과 잘못된 모드가 외부 호출 전에 거부되는가.
- 중단된 요청이 게임 상태와 자동 저장을 변경하지 않는가.

---

### Task 1: HTTP LLM 어댑터와 오류 계약

**Files:**
- Create: `src/lib/adapters/llm-service-error.ts`
- Create: `src/lib/adapters/http-llm-adapter.ts`
- Modify: `src/lib/adapters/llm-adapter.ts`
- Test: `tests/unit/http-llm-adapter.test.ts`

**Interfaces:**
- Consumes: 기존 `LLMInput`, `StructuredLLMInput`, `SummaryInput`
- Produces: `LLMServiceErrorCode`, `LLMServiceError`, `HttpLLMAdapter`, 신호를 받는 `LLMAdapter` 메서드

- [x] 실패 테스트에서 분할 NDJSON, 마지막 무개행 프레임, 상태 코드 오류와 중단 신호를 검증한다.
- [x] `node_modules/.bin/vitest.cmd run tests/unit/http-llm-adapter.test.ts`로 기능 부재 실패를 확인한다.
- [x] 최소 HTTP 어댑터와 오류 매핑을 구현한다.
- [x] 같은 테스트를 실행해 통과를 확인한다.

---

### Task 2: 서버 전용 프록시와 입력 검증

**Files:**
- Create: `src/lib/server/llm-proxy.ts`
- Create: `src/app/api/llm/route.ts`
- Test: `tests/unit/llm-proxy.test.ts`

**Interfaces:**
- Consumes: Task 1의 세 요청 입력 타입
- Produces: `proxyLLMRequest(request, configuration, fetcher)`, Next.js `POST`

- [x] 실패 테스트에서 미설정 서버, 잘못된 모드, 과대 본문, 서버 토큰과 스트림 전달을 검증한다.
- [x] 대상 테스트를 실행해 기능 부재 실패를 확인한다.
- [x] 입력 검증과 서버 프록시를 구현한다.
- [x] 대상 테스트를 실행해 통과를 확인한다.

---

### Task 3: 공통 공급자 선택과 Text-Play 재시도 UI

**Files:**
- Create: `src/lib/adapters/create-llm-adapter.ts`
- Modify: `src/features/chat/ChatScreen.tsx`
- Modify: `src/features/text-play/session/TextPlayProvider.tsx`
- Modify: `src/features/text-play/session/text-play-controller.ts`
- Modify: `src/features/text-play/ui/TextPlayScreen.tsx`
- Modify: `src/features/text-play/ui/TextPlayScreen.module.css`
- Test: `tests/unit/create-llm-adapter.test.ts`
- Test: `tests/integration/text-play-controller.test.ts`
- Test: `tests/components/text-play-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `HttpLLMAdapter`, 오류 계약과 신호 지원
- Produces: `createLLMAdapter(mode)`, 공급자 라벨, 실패 입력 재시도 UI

- [x] 실패 테스트에서 두 모드 선택, 상태별 안내, 중단 전달과 재시도 버튼을 검증한다.
- [x] 대상 테스트를 실행해 기능 부재 실패를 확인한다.
- [x] 공통 생성기와 화면 연결을 구현한다.
- [x] 대상 테스트를 실행해 통과를 확인한다.

---

### Task 4: 환경 예시·문서·전체 검증

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/DEVELOPMENT-LOG.md`
- Modify: `docs/PROJECT-STRUCTURE.md`

**Interfaces:**
- Consumes: Tasks 1~3의 실제 환경 변수와 기능 상태
- Produces: 실제 서버 연결에 필요한 운영 문서와 검증 기록

- [x] 환경 변수와 확인된 제한을 문서에 기록한다.
- [x] 전체 테스트, 타입 검사, 린트와 운영 빌드를 실행한다.
- [x] Mock 브라우저 흐름과 서버 미설정 안내를 확인한다.
- [x] 한국어 제목으로 단일 `main` 최신 커밋을 갱신하고 원격에 푸시한다.
