import { selectApplicableActions } from "@/features/text-play/ai/action-validator"; // AI 행동 고르기
import { buildTextPlayContext } from "@/features/text-play/ai/context-builder"; // AI 문맥 생성기
import { parseTextPlayResponse } from "@/features/text-play/ai/response-schema"; // AI 응답 해석기
import { applyTextPlayActions } from "@/features/text-play/core/engine"; // 게임 액션 처리기
import type { TextPlayLogEntry, TextPlayPackage, TextPlayState } from "@/features/text-play/core/types"; // 게임 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import type { TextPlaySessionAction, TextPlaySessionState } from "@/features/text-play/session/text-play-reducer"; // 세션 계약
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import type { LLMAdapter } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류

interface TextPlayControllerDependencies // 제어기 의존성
{ // 구조 시작
    llm: LLMAdapter; // LLM 어댑터
    repository: TextPlaySaveRepository; // 저장소
    getState(): TextPlaySessionState; // 상태 조회기
    dispatch(action: TextPlaySessionAction): void; // 동작 전달기
    now(): string; // 현재 시각 생성기
    packageData?: TextPlayPackage; // 작품 패키지
} // 구조 종료

export interface TextPlayController // 제어기 계약
{ // 구조 시작
    sendFreeInput(input: string, signal: AbortSignal): Promise<void>; // 자유 입력 전송
} // 구조 종료

function getLLMErrorMessage(error: unknown): string // LLM 오류 안내 생성
{ // 함수 시작
    if (!(error instanceof LLMServiceError)) // 서비스 오류 확인
    { // 조건 시작
        return "응답을 생성하지 못했습니다."; // 기본 오류 반환
    } // 조건 종료
    if (error.code === "authentication-required") // 인증 오류 확인
    { // 조건 시작
        return "로그인이 필요합니다."; // 인증 안내 반환
    } // 조건 종료
    if (error.code === "insufficient-credit") // 크레딧 오류 확인
    { // 조건 시작
        return "AI 서비스 크레딧이 부족합니다."; // 크레딧 안내 반환
    } // 조건 종료
    if (error.code === "rate-limited") // 요청 제한 확인
    { // 조건 시작
        return "요청이 많습니다. 잠시 후 다시 시도하세요."; // 제한 안내 반환
    } // 조건 종료
    if (error.code === "unavailable") // 연결 오류 확인
    { // 조건 시작
        return "AI 서비스에 연결할 수 없습니다."; // 연결 안내 반환
    } // 조건 종료
    if (error.code === "model-unavailable") // 모델 누락 확인
    { // 조건 시작
        return "선택한 로컬 모델이 설치되어 있지 않습니다."; // 모델 누락 안내 반환
    } // 조건 종료
    if (error.code === "local-ai-not-ready") // 내장 AI 미준비 확인
    { // 조건 시작
        return "내장 AI가 아직 준비되지 않았습니다. 다른 AI를 선택해 주세요."; // 미준비 안내 반환
    } // 조건 종료
    return "AI 서비스 응답 형식이 올바르지 않습니다."; // 응답 안내 반환
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
    return { // 제어기 반환
        async sendFreeInput(input: string, signal: AbortSignal): Promise<void> // 자유 입력 처리
        { // 함수 시작
            const confirmed = dependencies.getState().game; // 확정 상태 보존
            dependencies.dispatch({ type: "ai-started", input }); // 스트리밍 시작
            let raw = ""; // 원본 응답 준비
            try // 응답 처리 시도
            { // 시도 시작
                for await (const chunk of dependencies.llm.streamStructuredReply(buildTextPlayContext(packageData, confirmed, input), signal)) // 응답 조각 순회
                { // 순회 시작
                    if (signal.aborted) // 중지 여부 확인
                    { // 조건 시작
                        dependencies.dispatch({ type: "ai-aborted" }); // 중지 상태 반영
                        return; // 처리 종료
                    } // 조건 종료
                    raw += chunk; // 원본 조각 누적
                    dependencies.dispatch({ type: "ai-chunk", chunk }); // 표시 조각 전달
                } // 순회 종료
                if (signal.aborted) // 최종 중지 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-aborted" }); // 중지 상태 반영
                    return; // 처리 종료
                } // 조건 종료
                const parsed = parseTextPlayResponse(raw); // 응답 해석
                if (!parsed.ok) // 해석 실패 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-failed", message: "응답을 해석하지 못했습니다." }); // 해석 오류 전달
                    return; // 처리 종료
                } // 조건 종료
                const selection = selectApplicableActions(packageData, confirmed, parsed.value.proposedActions); // 지금 적용할 수 있는 행동만 고르기(나머지는 빼고 서술은 살림)
                const now = dependencies.now(); // 확정 시각 생성
                const applied = applyTextPlayActions(packageData, confirmed, selection.accepted, now); // 고른 행동 일괄 적용
                if (!applied.ok) // 엔진 실패 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-failed", message: "게임 상태를 변경하지 못했습니다." }); // 엔진 오류 전달
                    return; // 처리 종료
                } // 조건 종료
                const completed = appendAIResponse(applied.state, input, parsed.value.narration, parsed.value.dialogue, now); // 기록 포함 상태 생성
                dependencies.dispatch({ type: "ai-succeeded", game: completed }); // 확정 상태 반영
                try // 자동 저장 시도
                { // 저장 시작
                    await dependencies.repository.save("auto", completed, parsed.value.narration); // 자동 저장 실행
                    dependencies.dispatch({ type: "save-notice", message: "자동 저장했습니다." }); // 저장 성공 안내
                } // 저장 종료
                catch // 저장 실패 처리
                { // 오류 시작
                    dependencies.dispatch({ type: "save-notice", message: "플레이는 계속할 수 있지만 저장하지 못했습니다." }); // 저장 실패 안내
                } // 오류 종료
            } // 시도 종료
            catch (error) // LLM 오류 처리
            { // 오류 시작
                if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) // 사용자 중단 확인
                { // 조건 시작
                    dependencies.dispatch({ type: "ai-aborted" }); // 중단 상태 반영
                    return; // 처리 종료
                } // 조건 종료
                dependencies.dispatch({ type: "ai-failed", message: getLLMErrorMessage(error) }); // 생성 오류 전달
            } // 오류 종료
        }, // 함수 종료
    }; // 제어기 종료
} // 함수 종료
