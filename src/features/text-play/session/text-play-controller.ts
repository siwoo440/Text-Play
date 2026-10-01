import { selectApplicableActions } from "@/features/text-play/ai/action-validator"; // AI 행동 고르기
import { buildTextPlayContext } from "@/features/text-play/ai/context-builder"; // AI 문맥 생성기
import { parseTextPlayResponse } from "@/features/text-play/ai/response-schema"; // AI 응답 해석기
import { applyTextPlayActions } from "@/features/text-play/core/engine"; // 게임 액션 처리기
import type { TextPlayLogEntry, TextPlayPackage, TextPlayState } from "@/features/text-play/core/types"; // 게임 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어
import type { TextPlaySessionAction, TextPlaySessionState } from "@/features/text-play/session/text-play-reducer"; // 세션 계약
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import type { LLMAdapter } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { SESSION_MESSAGES } from "@/features/text-play/session/session-messages"; // 언어별 세션 안내
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류

type SessionMessages = (typeof SESSION_MESSAGES)["ko"]; // 세션 안내 묶음

interface TextPlayControllerDependencies // 제어기 의존성
{ // 구조 시작
    llm: LLMAdapter; // LLM 어댑터
    repository: TextPlaySaveRepository; // 저장소
    getState(): TextPlaySessionState; // 상태 조회기
    dispatch(action: TextPlaySessionAction): void; // 동작 전달기
    now(): string; // 현재 시각 생성기
    packageData?: TextPlayPackage; // 작품 패키지
    language?: AppLanguage; // 답변 언어(없으면 한국어)
} // 구조 종료

export interface TextPlayController // 제어기 계약
{ // 구조 시작
    sendFreeInput(input: string, signal: AbortSignal): Promise<void>; // 자유 입력 전송
} // 구조 종료

function getLLMErrorMessage(error: unknown, messages: SessionMessages): string // LLM 오류 안내 생성
{ // 함수 시작
    return error instanceof LLMServiceError ? messages.errors[error.code] : messages.generationFailed; // 서비스 오류면 코드별 안내, 아니면 기본 안내
} // 함수 종료

function appendAIResponse(state: TextPlayState, input: string, narration: string, dialogue: { speaker: string; content: string } | null, now: string): TextPlayState // AI 기록 추가
{ // 함수 시작
    const entries: TextPlayLogEntry[] = // 추가 기록 목록
    [ // 목록 시작
        { id: `log-${state.log.length}`, kind: "system", speaker: null, content: input, createdAt: now }, // 사용자 입력 기록
        { id: `log-${state.log.length + 1}`, kind: "narration", speaker: null, content: narration, createdAt: now }, // AI 서술 기록
    ]; // 목록 종료
    if (dialogue !== null) // 대사 존재 확인
    { // 조건 시작
        entries.push({ id: `log-${state.log.length + 2}`, kind: "dialogue", speaker: dialogue.speaker, content: dialogue.content, createdAt: now }); // AI 대사 추가
    } // 조건 종료
    return { ...state, log: [...state.log, ...entries], updatedAt: now }; // 기록 상태 반환
} // 함수 종료

export function createTextPlayController(dependencies: TextPlayControllerDependencies): TextPlayController // 세션 제어기 생성
{ // 함수 시작
    const packageData = dependencies.packageData ?? DEMO_TEXT_PLAY_PACKAGE; // 작품 선택
    const messages = SESSION_MESSAGES[dependencies.language ?? "ko"]; // 고른 언어의 안내
    return { // 제어기 반환
        async sendFreeInput(input: string, signal: AbortSignal): Promise<void> // 자유 입력 처리
        { // 함수 시작
            const confirmed = dependencies.getState().game; // 확정 상태 보존
            dependencies.dispatch({ type: "ai-started", input }); // 스트리밍 시작
            let raw = ""; // 원본 응답 준비
            try // 응답 처리 시도
            { // 시도 시작
                for await (const chunk of dependencies.llm.streamStructuredReply(buildTextPlayContext(packageData, confirmed, input, dependencies.language), signal)) // 응답 조각 순회
                { // 순회 시작
                    if (signal.aborted) // 중지 여부 확인
                    { // 조건 시작
                        dependencies.dispatch({ type: "ai-aborted", message: messages.aborted }); // 중지 상태 반영
                        return; // 처리 종료
                    } // 조건 종료
                    raw += chunk; // 원본 조각 누적
                    dependencies.dispatch({ type: "ai-chunk", chunk }); // 표시 조각 전달
                } // 순회 종료
                if (signal.aborted) // 최종 중지 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-aborted", message: messages.aborted }); // 중지 상태 반영
                    return; // 처리 종료
                } // 조건 종료
                const parsed = parseTextPlayResponse(raw); // 응답 해석
                if (!parsed.ok) // 해석 실패 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-failed", message: messages.parseFailed }); // 해석 오류 전달
                    return; // 처리 종료
                } // 조건 종료
                const selection = selectApplicableActions(packageData, confirmed, parsed.value.proposedActions); // 지금 적용할 수 있는 행동만 고르기(나머지는 빼고 서술은 살림)
                const now = dependencies.now(); // 확정 시각 생성
                const applied = applyTextPlayActions(packageData, confirmed, selection.accepted, now); // 고른 행동 일괄 적용
                if (!applied.ok) // 엔진 실패 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-failed", message: messages.engineFailed }); // 엔진 오류 전달
                    return; // 처리 종료
                } // 조건 종료
                const completed = appendAIResponse(applied.state, input, parsed.value.narration, parsed.value.dialogue, now); // 기록 포함 상태 생성
                dependencies.dispatch({ type: "ai-succeeded", game: completed }); // 확정 상태 반영
                try // 자동 저장 시도
                { // 저장 시작
                    await dependencies.repository.save("auto", completed, parsed.value.narration); // 자동 저장 실행
                    dependencies.dispatch({ type: "save-notice", message: messages.autoSaved }); // 저장 성공 안내
                } // 저장 종료
                catch // 저장 실패 처리
                { // 오류 시작
                    dependencies.dispatch({ type: "save-notice", message: messages.saveFailed }); // 저장 실패 안내
                } // 오류 종료
            } // 시도 종료
            catch (error) // LLM 오류 처리
            { // 오류 시작
                if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) // 사용자 중단 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-aborted", message: messages.aborted }); // 중단 상태 반영
                    return; // 처리 종료
                } // 조건 종료
                dependencies.dispatch({ type: "ai-failed", message: getLLMErrorMessage(error, messages) }); // 생성 오류 전달
            } // 오류 종료
        }, // 함수 종료
    }; // 제어기 종료
} // 함수 종료
