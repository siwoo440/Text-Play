---
# 내장 로컬 인공지능(무료 로컬 LLM) 개발 계획

---
## 목표

- Windows 실행 프로그램(exe)을 설치하면 **가벼운 모델이 자동으로 함께 준비**되어, 사용자가 따로 설치하는 것 없이 Text-Play 자유 입력을 자기 PC에서 무료로 처리한다.
- 표준·고성능 모델은 `AI 모델` 화면의 **다운로드 버튼**으로 사용자가 원할 때 추가한다.
- 기존 임시 인공지능(Mock)과 올라마 연결은 그대로 유지한다.

---
## 확정한 결정

### 모델 3종

| 구분 | 모델 | 크기(Q4_K_M 기준) | 라이선스 | 권장 사양 | 받는 시점 |
| --- | --- | --- | --- | --- | --- |
| 가벼움(기본) | Mi:dm 2.0 Mini 2.3B (KT, Llama 구조, 한국어·영어) | 약 1.5GB | MIT | 그래픽 메모리 4GB 이상 또는 RAM 8GB 이상, CPU만으로도 동작 | **설치할 때 자동** |
| 표준 | Qwen3.5-4B (기본이 생각 모드라 요청마다 `enable_thinking: false`) | 약 3GB | Apache 2.0 | 그래픽 메모리 6~8GB | 다운로드 버튼 |
| 고성능 | Qwen3.5-9B | 약 5.5GB | Apache 2.0 | 그래픽 메모리 10GB 이상 | 다운로드 버튼 |

- 예비 후보: Qwen3.5-2B(가벼움 대체), Gemma 4 E4B(표준 대체). 작업 0의 실측 결과로 최종 확정한다.
- 제외: EXAONE 4.0·4.5, Kanana-2(비상업 라이선스), HyperCLOVA X SEED(경쟁 서비스 별도 계약 조항).

### 실행 방식

- 실행 엔진은 llama.cpp `llama-server`를 고정 버전으로 함께 배포한다. Windows Vulkan 빌드(NVIDIA·AMD·Intel 공통)와 CPU 빌드만 포함하고, CUDA 빌드는 이번 범위에서 제외한다.
- Rust가 `llama-server`를 `127.0.0.1`의 무작위 포트와 일회용 API 키로 실행·감시·종료한다. 화면(WebView)의 외부 연결 차단(`connect-src 'none'`)은 유지하고, 모든 통신은 지금의 올라마 연결처럼 Rust가 대신한다.
- 응답은 `response_format`의 JSON 스키마로 `narration`·`dialogue`·`proposedActions` 형식을 강제하고, 기존 응답 해석·행동 검증을 그대로 거친다.
- 모델 파일은 `%LOCALAPPDATA%\MATE Text-Play\models`에 저장한다. 앱을 업데이트해도 다시 받지 않는다.
- 설치 파일에 모델을 넣지 않는다. NSIS 설치 파일과 GitHub Release 파일은 각각 2GB(2GiB) 미만이어야 하고, 모델을 넣으면 앱을 업데이트할 때마다 모델까지 다시 받게 된다.

### 범위

- 이번 범위는 Text-Play 응답이다.
- ChatBot 대화 화면은 ChatBot 저장소 코드가 임시 인공지능 어댑터를 고정 생성하므로, ChatBot에 어댑터 주입 구조가 생긴 뒤 연결한다(`src/chatbot`은 직접 고치지 않음).

---
## 사용자 흐름

1. **설치:** 설치 파일 실행 → 앱 설치 → 설치 마지막 단계에서 `로컬 AI 준비` 창이 가벼운 모델(약 1.5GB)을 내려받는다. 진행률·남은 시간·`나중에 받기`를 표시한다.
2. **실패·오프라인:** 내려받지 못해도 설치는 끝난다. 첫 실행 때 `AI 준비` 안내가 자동으로 다시 받고, 그동안은 임시 인공지능으로 플레이할 수 있다.
3. **기본 사용:** 가벼운 모델이 준비되면 Text-Play의 AI 기본값이 `내장 로컬 AI · 가벼움`이 된다.
4. **추가 모델:** 사이드바 `AI 모델` 화면에서 표준·고성능 카드의 크기, 권장 사양, **이 PC 적합도**, 라이선스를 확인하고 `다운로드` → 진행률·취소·이어받기 → `사용하기`·`삭제`를 한다.
5. **전환:** Text-Play 설정의 AI 선택에서 설치된 모델 사이를 바꾼다. 일정 시간 쓰지 않으면 모델을 내려 메모리를 돌려준다.
6. **제거:** 설치 제거 때 `AI 모델도 삭제할까요?`를 묻는다(기본 `아니요`). 조용한 제거·업데이트 때는 묻지 않고 유지한다.

---
## 이 PC 적합도 규칙

| 모델 | 권장 | 가능 | 느릴 수 있음 | 부족(경고 후 다운로드) |
| --- | --- | --- | --- | --- |
| 가벼움 | 그래픽 4GB 이상 | 그래픽 없음, RAM 8GB 이상 | RAM 8GB 미만 | — |
| 표준 | 그래픽 6GB 이상 | 그래픽 4GB 또는 RAM 16GB 이상 | 그 밖 | — |
| 고성능 | 그래픽 10GB 이상 | 그래픽 8GB(문맥 축소) | RAM 32GB 이상 CPU | 그 밖 |

- 그래픽 메모리는 DXGI 전용 메모리, RAM은 전체 실장 메모리, 디스크는 모델 폴더 드라이브의 남은 공간으로 판정한다.
- 남은 디스크가 모델 크기의 1.2배보다 작으면 다운로드를 막는다.

---
## 구조

```text
Text-Play 화면(WebView, 외부 연결 차단 유지)
  → Tauri 명령·Channel
  → Rust
     ├─ hardware      그래픽 메모리·RAM·디스크 확인
     ├─ model_store   모델 목록·상태·다운로드(이어받기·SHA-256·취소)·삭제
     └─ local_runtime llama-server 실행·준비 확인·재시작·종료(Job Object)
  → llama-server.exe (127.0.0.1:무작위 포트, 일회용 API 키, Vulkan → 실패 시 CPU)
  → GGUF 모델 파일(%LOCALAPPDATA%\MATE Text-Play\models)
```

| 경로 | 내용 |
| --- | --- |
| `src-tauri/src/hardware.rs` (새 파일) | DXGI 그래픽 메모리, RAM, 남은 디스크 |
| `src-tauri/src/model_store.rs` (새 파일) | 모델 목록 읽기, 상태, 다운로드(`.part` 이어받기 → SHA-256 → 이름 바꾸기), 진행률 Channel, 취소, 삭제, 허용 호스트(HTTPS) 검사 |
| `src-tauri/src/local_runtime.rs` (새 파일) | 실행 명령줄, 포트·키 생성, 상태(꺼짐·시작 중·준비·오류), 준비 확인(`/health`), Vulkan 실패 시 CPU 재시작, 쉬는 시간 뒤 내리기, 앱 종료 시 정리 |
| `src-tauri/src/bundled_ai.rs` (기반 1에서 만듦) | `stream_bundled_chat`: `/v1/chat/completions` 스트리밍 + JSON 스키마, 연결 정보 없으면 미준비 오류. 기존 올라마 명령(`local_ai.rs`) 유지 |
| `src-tauri/resources/model-catalog.json` (새 파일) | 모델별 식별자·표시 이름·파일·주소·SHA-256·크기·라이선스·권장 사양·생성 설정 |
| `src-tauri/Tauri.toml`, `capabilities/` (수정) | 실행 엔진 리소스, NSIS 설치 훅, 새 명령 권한 |
| `src-tauri/windows/hooks.nsh` (새 파일) | 설치 후 가벼운 모델 준비 실행, 제거 시 모델 삭제 질문 |
| `scripts/fetch-llama-runtime.mjs` (작업 0에서 만듦) | 고정 버전 llama.cpp Windows Vulkan·CPU 압축 파일 받기·SHA-256 검사·풀기(저장소에는 넣지 않음). 작업 4에서 Tauri 리소스 위치로 배치 |
| `scripts/build-local-models.mjs` (작업 0에서 만듦) | 공식 가중치 받기·변환·양자화·SHA-256 기록(우리 모델 파일을 똑같이 다시 만드는 기준) |
| `scripts/evaluate-local-models.mjs` (작업 0에서 만듦) | Text-Play 문맥으로 모델별 JSON 성공률·행동 통과율·속도·메모리·응답 수집 |
| `scripts/local-ai/*`, `scripts/lib/local-ai-files.mjs`, `scripts/lib/local-model-eval.mjs` (작업 0에서 만듦) | 고정 버전 목록, 평가 문맥 30개와 판정, 이어받기 다운로드·해시, 측정 요약·보고서 |
| `src/features/text-play/ai/response-json-schema.ts` (작업 0에서 만듦) | 작품별 응답 JSON 스키마(식별자 목록·정수 범위·길이 상한) |
| `src/lib/adapters/structured-messages.ts` (작업 0에서 만듦) | 구조화 응답 메시지(올라마·내장 로컬 AI·측정 공통) |
| `src/lib/adapters/bundled-llm-adapter.ts` (기반 1에서 만듦) | 내장 로컬 AI 구조화 스트리밍 어댑터 |
| `src/desktop/tauri-bundled-client.ts`, `tauri-stream.ts` (기반 1에서 만듦) | 내장 AI 대화 Tauri 호출, 올라마와 공용 스트림 처리 |
| `src/desktop/tauri-local-runtime-client.ts` (새 파일) | 모델·실행 엔진 관리 Tauri 호출 |
| `src/desktop/ai-models/AiModelsScreen.tsx` (새 파일) | `AI 모델` 화면(모델 카드 3개, 적합도, 다운로드·사용·삭제, 라이선스) |
| `src/desktop/router/*`, `shell/*` (수정) | `#/ai-models` 경로, 프로그램 메뉴 `설정 · AI 모델 · 고객 지원`(화살표 순서에 포함) |
| `src/desktop/desktop-llm.ts`, `src/features/text-play/preferences/*` (수정) | 공급자 `bundled` 추가, 설정 형식 버전 3과 버전 2 이전 |
| `src/features/text-play/ai/context-builder.ts` (수정) | 장면 제목·서술, 최근 턴, 인물·표시 이름 문맥 |

---
## 작업 단계

모든 작업은 실패하는 테스트를 먼저 쓰고 실제 실패를 확인한 뒤 구현한다. 각 작업이 끝나면 `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, `pnpm tauri:check`, 데스크톱 통합 테스트, `pnpm exe:rebuild` 확인을 거친다.

### 작업 0: 실측과 확정 (1~2일)

- llama.cpp 고정 버전의 Vulkan·CPU 빌드와 세 모델을 준비한다. 가벼운 모델은 Q4_K_M과 Q5_K_M을 비교한다.
- 모델 파일은 공식 가중치를 llama.cpp로 GGUF 변환·양자화해 만들고 SHA-256을 기록한다. 공식 GGUF가 있으면 같은 파일인지 대조한다.
- `scripts/evaluate-local-models.mjs`로 Text-Play 문맥 30개 × 모델 3종 × GPU·CPU를 측정한다.
- 측정 항목: JSON 형식 성공률, 행동 검증 통과율, 첫 글자까지 시간, 생성 속도, 메모리 사용, 한국어 자연스러움(1~5점 사람 평가).
- 합격 기준
  - JSON 형식 성공률 98% 이상
  - 가벼움: CPU만(8코어)으로 한 턴 20초 이하, 그래픽 메모리 6GB에서 8초 이하
  - 미달하면 가벼움 기본 모델을 Qwen3.5-2B로 바꾼다.
- 결과를 이 문서와 `model-catalog.json`에 반영한다(파일 주소·SHA-256·생성 설정 확정, Mi:dm 문맥 길이 확인).

#### 작업 0 준비 상태 (2026-10-01)

측정 도구와 고정 버전은 준비했고, 실행 엔진·공식 가중치 다운로드가 작업 세션의 자동 권한 검사에서 막혀 실제 측정 전에서 멈춰 있다.

**고정 버전**

- llama.cpp 안정판 `v0.5.0` = 빌드 `b11146` = 커밋 `7fe450e19305b828c199d602c23a8337aaa1f03b`
  - `llama-b11146-bin-win-vulkan-x64.zip` 30.6MB, SHA-256 `55a378aa095b466979d85075234f66d7655c7a7483222af0c006c0e55b4d7bd6`
  - `llama-b11146-bin-win-cpu-x64.zip` 17.7MB, SHA-256 `14cf1303ca9ac3abd94816850532f9f9a69ac66fbaca3776fc6f9061c2fac1d1`

| 모델 | 공식 저장소 @ 리비전 | 원본 크기 | 구조 | 최대 문맥 | 생성 설정 |
| --- | --- | --- | --- | --- | --- |
| Mi:dm 2.0 Mini | `K-intelligence/Midm-2.0-Mini-Instruct` @ `383eb22` | 4.3GB | Llama 48층 | 32,768 | 공식 값: 온도 0.8, top-p 0.75, top-k 20 |
| Qwen3.5-2B(가벼움 대체) | `Qwen/Qwen3.5-2B` @ `15852e8` | 4.26GB | 선형·전체 주의 혼합, 이미지 입력 포함(글자 부분만 변환) | 262,144 | 공식 비생각 값: 온도 0.7, top-p 0.8, top-k 20, presence 1.5 |
| Qwen3.5-4B | `Qwen/Qwen3.5-4B` @ `851bf6e` | 8.7GB | 위와 같음 | 262,144 | 위와 같음 |
| Qwen3.5-9B | `Qwen/Qwen3.5-9B` @ `c202236` | 18GB | 위와 같음 | 262,144 | 위와 같음 |

- Mi:dm과 Qwen3.5 모두 공식 GGUF가 없다(커뮤니티 변환본만 있음). 계획대로 공식 가중치를 직접 변환한다.
- Qwen3.5는 기본이 생각 모드다. 요청마다 `chat_template_kwargs: { enable_thinking: false }`를 넣는다.
- 가벼움 대체 후보 Qwen3.5-2B도 처음부터 함께 재서 비교한다.

**만든 도구**

| 명령 | 내용 |
| --- | --- |
| `pnpm local-ai:runtime` (`scripts/fetch-llama-runtime.mjs`) | 고정 빌드를 받아 크기·SHA-256 검사 → `.local-ai/runtime/b11146/{vulkan,cpu}`에 풀기 |
| `pnpm local-ai:models` (`scripts/build-local-models.mjs`) | 공식 가중치를 리비전 고정으로 받기(큰 파일 SHA-256, 작은 파일 git 해시 검사) → 변환기(고정 커밋 소스와 파이썬 환경) 준비 → BF16 GGUF 변환 → 양자화 → `.local-ai/models/manifest.json`에 크기·SHA-256 기록 → 원본·중간 파일 삭제. 모델을 하나씩 끝내 디스크 최대 사용을 약 42GB(9B 기준)로 제한 |
| `pnpm local-ai:eval` (`scripts/evaluate-local-models.mjs`) | 모델 × 실행 방식(`vulkan`, `vulkan:<장치>`, `cpu`, `cpu:<스레드>`)마다 `llama-server`를 127.0.0.1 무작위 포트와 일회용 키로 띄워 평가 문맥 30개를 보내고 `.local-ai/eval/<시각>/results.json`·`report.md`로 저장. `--server-url`로 이미 떠 있는 OpenAI 호환 서버도 측정 |

- 평가 문맥(`scripts/local-ai/text-play-eval.ts`): 샘플 작품의 실제 상태 7개(숲 입구 시작·부상, 회랑·신뢰, 서재 조사 후·바로 들어감·흔들림)에 탐색·대화·아이템·이동·위험·회복·거래·감정·진행·형식 흔들기·짧은/긴/영어 입력·규칙 위반 4개를 섞었다.
- 요청은 앱과 같은 문맥(`buildTextPlayContext`)·메시지(`src/lib/adapters/structured-messages.ts`)와 작품 응답 JSON 스키마(`src/features/text-play/ai/response-json-schema.ts`)를 쓰고, 판정은 앱 해석기·행동 검증기로 한다. 스키마는 작품의 아이템·장소·인물·퀘스트·이벤트 식별자 목록, 정수 변화량(능력치 ±20, 관계 ±10, 수량 1~3), 서술 300자·대사 150자·행동 4개 상한을 강제한다. 작업 1 어댑터도 같은 스키마 함수를 쓴다.
- 측정 항목 추가: 규칙 위반 차단(골드·체력·정신력 증가, 퀘스트 완료·이벤트를 막아야 하는 입력), 한국어 비율(한글 80% 이상, 한자 섞임 없음), 길이 잘림, 실행 엔진 시작 시간과 첫 응답(셰이더 준비) 시간, 그래픽·주 메모리.

**측정 PC와 6GB 기준 추정**

- Ryzen 7 9800X3D(8코어 16스레드), RTX 5070 Ti 16GB와 내장 Radeon, RAM 32GB, C 드라이브 여유 약 107GB
- 그래픽 6GB 기준은 직접 잴 수 없어 다음으로 보완한다: 내장 그래픽(`vulkan:<내장 장치>`)으로 약한 그래픽 하한, `cpu:4`로 4코어 노트북 하한, 메모리 대역폭 비율로 6GB급 그래픽(예: RTX 3050 6GB) 생성 속도 추정

**이어서 실행할 명령** (다운로드 약 35GB, 파이썬 변환 도구 약 1GB 포함)

```powershell
pnpm local-ai:runtime
pnpm local-ai:models
pnpm local-ai:eval
pnpm local-ai:eval --models midm-2.0-mini:Q4_K_M,qwen3.5-2b:Q4_K_M --backends cpu:4
```

### 작업 1: 실행 엔진 내장 (2~3일)

- 실패 테스트
  - Rust: 실행 명령줄 구성(모델·포트·키·문맥 길이·스레드 수·GPU 층), 포트·키 생성, 상태 전이, Vulkan 실패 → CPU 재시작
  - TS: 공급자 `bundled` 선택, 어댑터의 스트림 해석·중단·오류 변환
- 구현
  - `local_runtime.rs`: 실행·`/health` 대기·종료, Job Object로 앱이 비정상 종료돼도 함께 종료, 쉬는 시간 뒤 내리기
  - `stream_bundled_chat`: OpenAI 호환 스트리밍과 JSON 스키마, Channel로 화면에 전달
  - `bundled-llm-adapter.ts`, `desktop-llm.ts` 공급자 연결
- 확인: exe에서 응답 생성, 작업 관리자에서 앱 종료 뒤 `llama-server`가 남지 않는지 확인

#### 진행 상태 (2026-10-01): 기반 1 "AI 연결 통로" 완료

기반을 먼저 만들고 기능을 덧붙이는 순서로 바꿔, 작업 1을 **연결 통로**(이번)와 **엔진 관리자**(`local_runtime.rs`, 다음)로 나눴다.

- 앱: 공급자 `bundled`(화면 표시 `내장 AI(이 PC)`, Windows 실행 프로그램에서만 선택 가능, 모델 선택 불필요), `BundledLLMAdapter`(구조화 응답에 작품 JSON 스키마 동봉, 최대 640토큰), `createTauriBundledClient`(`stream_bundled_chat` 호출, 중단은 `cancel_local_chat` 공용), 오류 `local-ai-not-ready` → "내장 AI가 아직 준비되지 않았습니다. 다른 AI를 선택해 주세요."
- 공통화: Tauri 스트림 처리(`src/desktop/tauri-stream.ts`), 스트림 사건 형식(`local-ai-stream.ts`), 캐릭터·요약 메시지(`chat-messages.ts`)를 올라마와 내장 AI가 함께 쓴다. `buildTextPlayContext`가 `jsonSchema`를 함께 담는다.
- Rust: `src-tauri/src/bundled_ai.rs`의 `stream_bundled_chat`이 연결 정보(`BundledAIState`)가 있을 때만 `/v1/chat/completions`로 스트리밍하고(일회용 키, 생성 설정·템플릿 인자·JSON 스키마 반영, 응답 2MB·10분 제한), 없으면 `BUNDLED_NOT_READY`를 돌려준다. 엔진 관리자가 생기면 실행한 엔진의 주소·키·모델 설정을 이 상태에 넣는다.
- 확인용 연결: 환경 변수 `MATE_TEXT_PLAY_BUNDLED_AI_URL`(127.0.0.1·localhost http 주소만 허용)과 가짜 서버 `node scripts/local-ai/fake-openai-server.mjs --port 8765`로 모델 없이 exe 전체 흐름을 확인할 수 있다.
- exe 확인: 엔진 없음 → 미준비 안내 표시, 가짜 서버 연결 → 응답 서술·리라 대사 표시와 자동 저장.

#### 진행 상태 (2026-10-01): 기반 2 "엔진 관리자" 완료

- `src-tauri/src/local_runtime.rs`의 `LocalRuntimeManager`: 내장 AI로 첫 요청이 오면 엔진을 켠다. `vulkan\llama-server.exe`가 있고 `--list-devices`에 그래픽 장치가 있으면 메모리가 가장 큰 장치 하나로(`--device`) 먼저 켜고, 시작 중 종료·준비 시간 초과(180초)면 끄고 `cpu\llama-server.exe`로 다시 켠다. 127.0.0.1 빈 포트, 실행마다 새 32바이트 키, 문맥 4096, 슬롯 1개, 웹 화면 끔.
- 준비 확인은 `/health` 200을 기다린다. 켜진 엔진은 다음 요청에 그대로 쓰고, 저절로 꺼졌으면 다음 요청에 다시 켠다. 동시에 두 번 켜지 않는다.
- 끄기: 앱 종료(`RunEvent::Exit`), 10분 동안 쓰지 않음(1분마다 확인), `stop_local_runtime` 명령. Windows Job Object(KILL_ON_JOB_CLOSE)로 앱이 강제 종료돼도 엔진이 함께 끝난다. 콘솔 창은 숨기고 출력은 앱 기록 폴더 `llama-server.log`에 남긴다.
- 상태 조회 `get_local_runtime_status`(꺼짐·시작 중·준비·실패와 실행 방식·실패 이유)는 기반 4 화면이 쓴다.
- 실행 엔진 폴더: 설치본은 리소스 `llama-runtime\{vulkan,cpu}`(작업 4에서 넣음), 개발·확인은 `MATE_TEXT_PLAY_LLAMA_RUNTIME_DIR`. 모델은 기반 3 보관함 전까지 `MATE_TEXT_PLAY_BUNDLED_MODEL`(있는 `.gguf`만)로 지정한다. 확인용 연결 주소(`MATE_TEXT_PLAY_BUNDLED_AI_URL`)가 있으면 그것을 먼저 쓴다.
- 확인용 가짜 엔진: `cargo build --release --example fake_llama_server --manifest-path src-tauri/Cargo.toml` 결과를 `.local-ai\fake-runtime\{vulkan,cpu}\llama-server.exe`로 복사(그래픽 폴더에서는 일부러 실패)
- exe 확인: 엔진 꺼진 상태에서 첫 응답까지 3.9초(그래픽 실패 → CPU 전환 포함), 응답 표시, 앱을 강제 종료하면 2초 안에 엔진도 종료

#### 진행 상태 (2026-10-01): 기반 3 "모델 보관함" 완료

- `src-tauri/src/hardware.rs`: DXGI로 전용 메모리가 가장 큰 실제 그래픽 장치(소프트웨어 장치 제외), `GlobalMemoryStatusEx`로 전체 RAM, `GetDiskFreeSpaceExW`로 모델 폴더 드라이브의 남은 공간
- `src-tauri/resources/model-catalog.json`(앱 실행 파일에 포함): 가벼움 Mi:dm 2.0 Mini, 표준 Qwen3.5-4B, 고성능 Qwen3.5-9B. 크기는 예상치이고 받기 정보(`download`)는 결정 1(보관 위치)과 작업 0 실측 뒤 채운다. 그 전까지 화면은 `준비 중`으로 표시한다.
- 목록 검증: 형식 버전 1, 식별자 중복·역할·안전한 파일 이름(폴더 밖 금지)·크기·문맥 길이, 받기 주소는 HTTPS와 허용 호스트(huggingface.co, *.hf.co, github.com, *.githubusercontent.com)만, SHA-256 64자리
- `src-tauri/src/model_store.rs`: 적합도(이 문서 표 그대로), 디스크 1.2배 여유 확인, 받기(`.part` 이어받기, 허용 호스트로만 최대 5번 이동, 크기 초과 차단, SHA-256 불일치 시 삭제, 취소 시 받은 부분 보존, 250ms마다 진행률·속도), 삭제(받는 중 금지, 선택 모델이면 엔진 끄고 선택 해제), 선택(설치된 모델만, `store.json`에 저장, 엔진 관리자에 반영)
- 모델 폴더: `%LOCALAPPDATA%\MATE Text-Play\models`. 앱을 시작할 때 저장된 선택 모델이 설치돼 있으면 엔진 관리자가 그 모델을 쓴다(개발용 `MATE_TEXT_PLAY_BUNDLED_MODEL`이 있으면 그것을 우선).
- Tauri 명령: `get_model_store`(PC 사양·남은 공간·모델별 상태·적합도·사용 중), `download_model`(Channel 진행률), `cancel_model_download`, `delete_model`, `select_model`
- 엔진 관리자 보강: 시작하는 동안 모델이 바뀌거나 꺼지면 막 켜진 엔진을 버린다(exe 확인 중 발견한 문제, 테스트로 재현 후 수정).
- 개발·확인용 목록: `MATE_TEXT_PLAY_MODEL_CATALOG`(이 목록에서만 `http://127.0.0.1` 받기 허용)
- exe 확인: 이 PC를 RTX 5070 Ti 그래픽 15.6GiB·RAM 31.2GiB·남은 공간 100GB·세 모델 모두 권장으로 판정, 시험 목록으로 받기 → 검사 → 선택 → 내장 AI 응답(받은 모델로 엔진 시작) → 삭제 → 엔진 꺼짐·프로세스 0개

#### 진행 상태 (2026-10-01): 기반 4 "AI 모델 화면" 완료 — 기반 완성

- 사이드바 프로그램 메뉴를 `설정 · AI 모델 · 고객 지원`으로 바꾸고 상단 바 화살표 순서에 넣었다(`#/ai-models`).
- `src/desktop/ai-models/AiModelsScreen.tsx`: 이 PC 사양 한 줄 요약, 실행 엔진 상태(켜짐이면 `엔진 끄기`), 모델 카드 3개(역할 색 띠·크기·라이선스·`이 PC: 권장/가능/느릴 수 있음/부족`·`사용 중`)와 상태별 버튼(`준비 중`, `공간 부족`, `다운로드`, `그래도 다운로드`(부족 경고), `이어받기`, 진행 막대·속도·남은 시간·`취소`, 파일 검사 중, `사용하기`, `삭제` → 화면 안 `삭제 확인`/`그만두기`), 결과 안내, 사용 방법 안내. 브라우저 확인 창(`window.confirm`)은 쓰지 않는다.
- `tauri-model-store-client.ts`가 기반 3 명령을 부르고(받기 진행률은 Channel), `ai-model-view.ts`가 크기·사양·엔진 상태·진행률·오류 문구를 만든다. Tauri가 없는 웹·미리보기에서는 "Windows 실행 프로그램에서 사용할 수 있습니다"를 보여 준다.
- exe 확인: 실제 PC 정보로 카드 3개가 `준비 중`으로 표시, 시험 목록으로 화면 버튼만 눌러 다운로드 → 사용하기(사용 중 표시) → 삭제 확인 → 다운로드로 돌아옴. 처음 만든 화면은 창의 어두운 바탕이 비쳐 제목·설명이 안 보여 밝은 바탕을 직접 칠하도록 고침(스타일 테스트 추가)
- 이로써 **모델 파일만 넣으면 동작하는 기반**이 갖춰졌다. 남은 것은 실제 모델 파일(작업 0 실측·결정 1 보관 위치 → `model-catalog.json` 받기 정보)과 설치 프로그램(작업 4: 실행 엔진 리소스 `llama-runtime\{vulkan,cpu}` 포함, 설치 때 가벼운 모델 받기), 응답 품질(작업 5)이다.

#### 진행 상태 (2026-10-01): 가벼운 모델 Mi:dm 2.0 Mini 받아서 적용

사용자 요청으로 가벼운 모델만 먼저 받아 만들고 exe에 적용했다(표준·고성능은 아직 받지 않음).

- 받은 것: llama.cpp b11146 Vulkan·CPU(GitHub, SHA-256 일치), Mi:dm 2.0 Mini 공식 가중치 4.29GB(허깅페이스 리비전 `383eb22`, SHA-256 일치), 변환 도구(llama.cpp 소스 고정 커밋, 파이썬 패키지). 변환기는 Mi:dm 토크나이저를 인식했고 중간 파일·원본은 자동으로 지웠다.
- 만든 파일(같은 원본·같은 llama.cpp면 같은 해시로 다시 만들 수 있음)

| 파일 | 크기 | SHA-256 |
| --- | --- | --- |
| `midm-2.0-mini-Q4_K_M.gguf` | 1,426,272,800바이트(1.33GiB) | `c5a7c32a4c6c2b492f5c0bb0d84886b05a917f511917e2ca8b3a8f1982127017` |
| `midm-2.0-mini-Q5_K_M.gguf` | 1,654,731,296바이트(1.54GiB) | `df3b004a0e9c07ae05e8ac0e9233d89758964c50ac9849ef08a492bcd4598271` |

- 첫 측정(평가 문맥 30개, `.local-ai/eval/midm-first/report.md`)

| 모델·실행 | JSON 형식 | 행동 통과 | 규칙 위반 차단 | 한국어 | 한 턴(중앙/90%) | 생성 속도 |
| --- | --- | --- | --- | --- | --- | --- |
| Q4_K_M · RTX 5070 Ti(Vulkan) | 100% | 90% (27/30) | 3/4 | 97% | 0.7초 / 1.2초 | 190토큰/초 |
| Q4_K_M · CPU 8코어 | 100% | 97% (29/30) | 4/4 | 97% | 4.4초 / 12.7초 | 25토큰/초 |
| Q5_K_M · RTX 5070 Ti(Vulkan) | 100% | 100% (30/30) | 3/4 | 97% | 0.5초 / 1.0초 | 183토큰/초 |
| Q5_K_M · CPU 8코어 | 100% | 97% (29/30) | 4/4 | 97% | 5.6초 / 9.3초 | 19토큰/초 |

  - 합격 기준 중 JSON 형식(98% 이상)과 CPU 한 턴 20초 이하는 통과. 그래픽 첫 응답은 셰이더 준비로 약 6초.
  - 응답 내용은 문맥이 식별자뿐이라 장면을 지어내거나(시작부터 등불을 들고 있음), `Lyra`·`lyra` 같은 내부 이름, 상황에 맞지 않는 이동 제안, 영어 입력에 영어 응답, 사용자 대사를 따라 하는 문제가 보인다 → 작업 5(응답 품질)에서 장면 서술·인물 표시 이름·역할 규칙을 문맥에 넣는다.
  - 새 llama.cpp 기록에는 메모리 버퍼 줄이 나오지 않아 보고서의 그래픽·주 메모리 칸이 0으로 나온다(프로세스 최대 작업 집합은 Q4 그래픽 2.2GB·CPU 3.3GB). 측정 도구 보완 필요.
- 실제 PC에서 발견해 고친 문제: 이 PC의 내장 Radeon은 공유 메모리를 16,209MiB로 보고해 RTX 5070 Ti(15,995MiB)보다 커 보인다. 엔진 관리자는 메모리 크기 대신 DXGI 전용 메모리 2GB 이상 그래픽의 이름과 같은 Vulkan 장치만 쓰고, 없으면 CPU로만 켜도록 바꿨다. 측정 도구도 장치가 여럿이면 자동으로 고르지 않고 `vulkan:<장치>`를 요구한다.
- 적용 방법: `model-catalog.json`의 가벼운 모델 크기를 실제 값으로 바꾸고(받기 정보는 결정 1 전까지 비움), `pnpm local-ai:install`로 실행 엔진·모델을 `%LOCALAPPDATA%\MATE Text-Play\{runtime,models}`에 복사(SHA-256 확인). 앱은 설치본 리소스에 엔진이 없으면 이 `runtime` 폴더를 쓴다.
- exe 확인: `AI 모델` 화면에서 가벼운 모델 `사용하기` → `사용 중`, Text-Play에서 `내장 AI(이 PC)`로 5턴 모두 응답(턴마다 약 0.8초, 엔진은 RTX 5070 Ti Vulkan). 첫 시도 한 번은 모델이 지금 상태에서 불가능한 행동을 제안해 턴 전체가 거부됐다("허용되지 않은 상태 변경을 거부했습니다") → 작업 5에서 잘못된 행동만 빼고 서술은 살리는 방식을 검토한다.



### 작업 2: 모델 관리 (2~3일)

- 실패 테스트(Rust 로컬 HTTP 테스트 서버)
  - 목록 검증: 필수 항목, SHA-256 형식, 라이선스 표시
  - 적합도 계산: 그래픽 메모리·RAM·디스크 → 권장·가능·느릴 수 있음·부족
  - 다운로드: 이어받기, 해시 불일치 시 삭제, 취소, 디스크 부족 차단, HTTPS·허용 호스트 외 주소 거부, 리다이렉트 허용 범위
- 구현: `hardware.rs`, `model_store.rs`, 진행률 Channel(받은 크기·전체 크기·속도)

### 작업 3: 화면 (2일)

- 실패 테스트(컴포넌트·통합·데스크톱 종단, 가짜 Tauri 명령 사용)
  - `AI 모델` 화면: 카드 3개, 적합도 표시, `다운로드` → 진행률 → `사용하기`, 취소, 삭제 확인
  - 사이드바 프로그램 메뉴와 화살표 순서: 메인 → 탐색 → 내 작품 → Text-Play → 설정 → AI 모델 → 고객 지원
  - Text-Play 설정 AI 선택에 `내장 로컬 AI` 추가, 설정 형식 버전 2 → 3 이전
  - 첫 실행 `AI 준비` 안내: 모델 없음·다운로드 중·완료·실패 재시도
- 구현: `AiModelsScreen`, 경로·사이드바, 설정 대화상자, 안내 배너

### 작업 4: 설치 프로그램 (1~2일)

- `scripts/fetch-llama-runtime.mjs`로 빌드 때 실행 엔진을 받아 배치하고 `.gitignore`에 추가한다.
- `Tauri.toml`: 실행 엔진 리소스, `bundle.windows.nsis.installerHooks`
- `hooks.nsh`
  - `NSIS_HOOK_POSTINSTALL`: `mate-text-play-preview.exe --setup-local-ai` 실행(가벼운 모델 준비 창). 이미 같은 해시의 모델이 있으면 바로 끝낸다. 조용한 설치(`/S`)에서는 건너뛰고 첫 실행에 맡긴다.
  - `NSIS_HOOK_PREUNINSTALL`: 모델 삭제 질문(조용한 제거에서는 묻지 않고 유지)
- `verify-desktop-assets.mjs`: 실행 엔진 파일과 모델 목록 포함 확인
- 확인: 새 Windows 사용자 계정에서 설치 → 자동 다운로드 → 첫 응답, 인터넷을 끈 설치 → 첫 실행 재시도, 제거 → 삭제 선택

### 작업 5: 응답 품질 (2일)

- 문맥 보강: 장면 제목·서술, 최근 N턴 기록, 인물 설명, 표시 이름
- 모델별 생성 설정(온도·top-p·최대 길이)과 짧은 예시 프롬프트
- 행동 검증 강화: 변화량 상한·정수 검사, 핵심 이벤트·퀘스트 완료·엔딩은 작품 선택지로만 확정
- 작업 0 평가 스크립트로 개선 전후를 비교한다.

### 작업 6: 문서·배포 (1일)

- 오픈소스·모델 라이선스 고지: llama.cpp(MIT), Mi:dm 2.0 Mini(MIT), Qwen3.5(Apache 2.0)
- README·인수인계·개발 기록·구조·로드맵 갱신, 시험판 Release 문서에 사양 안내 추가

예상 기간은 전체 2~3주다.

---
## 보안·개인정보 원칙

- WebView의 외부 연결 차단을 유지하고 모든 통신은 Rust가 한다.
- `llama-server`는 `127.0.0.1`에만 열고, 무작위 포트와 실행마다 새로 만드는 API 키를 쓴다.
- 다운로드는 HTTPS와 허용 호스트만 쓰고, SHA-256이 다르면 파일을 지운다.
- 대화 내용은 PC 밖으로 나가지 않는다.

---
## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 가벼운 모델의 한국어 서술·JSON 품질 부족 | 작업 0에서 Qwen3.5-2B로 교체, 작업 5 문맥 보강 |
| 일부 그래픽 드라이버에서 Vulkan 실패 | 준비 확인 실패 시 CPU 빌드로 자동 재시작, 설정에서 수동 선택 |
| 백신의 미서명 실행 파일 오탐 | 코드 서명 도입(결정 필요), 오탐 신고 |
| 다운로드 실패·느림 | 이어받기, 대체 주소, 첫 실행 재시도 |
| 게임 등과 그래픽 메모리 경쟁 | 쉬는 시간 뒤 내리기, CPU 모드 선택 |
| 설치 파일 크기 증가 | Vulkan·CPU 빌드만 포함, CUDA는 이후 선택 다운로드 |

---
## 완료 조건

- 새 PC에서 설치만으로 가벼운 모델이 준비되고, 인터넷 없이 Text-Play 자유 입력 응답이 나온다.
- `AI 모델` 화면에서 표준·고성능 모델을 받고, 바꾸고, 지울 수 있다.
- 응답이 항상 정해진 JSON 형식이고, 검증을 통과한 행동만 게임에 반영된다.
- 앱을 끄면 `llama-server`가 남지 않는다.
- 설치 제거 때 모델 삭제를 고를 수 있다.
- 전체 테스트·타입·코드 검사·데스크톱 통합 테스트가 통과하고, exe 실측 결과를 개발 기록에 남긴다.

---
## 결정이 필요한 항목

1. **모델 파일 보관 위치:** 직접 변환한 파일을 우리 저장소에 고정 게시(권장: 가벼움 1.5GB는 GitHub Release, 표준·고성능은 Hugging Face) / 공식·공개 GGUF를 그대로 사용
2. **오프라인 설치본:** 인터넷 없는 사용자용으로 가벼운 모델 포함 설치본(약 1.6GB)을 따로 제공할지
3. **코드 서명 시점:** 백신 오탐을 줄이려면 배포 전 필요
4. **ChatBot 대화 연결:** ChatBot 대화에도 로컬 AI를 쓸지(ChatBot 저장소에 어댑터 주입 구조가 필요)
