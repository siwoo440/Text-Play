import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTextPlayController } from "@/features/text-play/session/text-play-controller"; // 세션 제어기
import { textPlayReducer } from "@/features/text-play/session/text-play-reducer"; // 세션 리듀서
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처
import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { LLMServiceError, type LLMServiceErrorCode } from "@/lib/adapters/llm-service-error"; // 서비스 오류

class FixedAdapter implements LLMAdapter // 고정 응답 어댑터
{ // 클래스 시작
    public receivedSignal: AbortSignal | undefined; // 수신 중단 신호
    public receivedInput: StructuredLLMInput | undefined; // 수신 구조화 입력

    public constructor(private readonly raw: string) // 생성자
    { // 생성자 시작
    } // 생성자 종료

    public async *streamStructuredReply(_input: StructuredLLMInput, signal?: AbortSignal): AsyncIterable<string> // 구조화 응답
    { // 함수 시작
        this.receivedInput = _input; // 입력 저장
        this.receivedSignal = signal; // 중단 신호 저장
        yield this.raw.slice(0, 12); // 첫 조각 반환
        yield this.raw.slice(12); // 둘째 조각 반환
    } // 함수 종료

    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 일반 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        yield "응답"; // 응답 조각
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 미사용 입력 표시
        return "요약"; // 요약 반환
    } // 함수 종료
} // 클래스 종료

class FailingAdapter implements LLMAdapter // 실패 응답 어댑터
{ // 클래스 시작
    public constructor(private readonly code: LLMServiceErrorCode) // 생성자
    { // 생성자 시작
    } // 생성자 종료

    public async *streamStructuredReply(_input: StructuredLLMInput): AsyncIterable<string> // 구조화 실패 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        throw new LLMServiceError(this.code); // 서비스 오류 발생
    } // 함수 종료

    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 일반 실패 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        throw new LLMServiceError(this.code); // 서비스 오류 발생
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 요약 실패 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        throw new LLMServiceError(this.code); // 서비스 오류 발생
    } // 함수 종료
} // 클래스 종료

describe("Text-Play 세션 제어기", () => // 제어기 검증 묶음
{ // 묶음 시작
    it("검증된 AI 응답만 게임 상태와 자동 저장에 반영한다", async () => // 성공 흐름 검증
    { // 테스트 시작
        let state = createPreparedTextPlaySessionState(); // 세션 상태 생성
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const raw = JSON.stringify({ narration: "문양이 빛난다.", dialogue: { speaker: "lyra", content: "기록을 찾아요." }, proposedActions: [{ type: "change-relation", characterId: "lyra", amount: 2 }] }); // 응답 생성
        const adapter = new FixedAdapter(raw); // 고정 어댑터 생성
        const controller = createTextPlayController({ llm: adapter, repository, getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z" }); // 제어기 생성
        const signal = new AbortController().signal; // 중단 신호 생성
        await controller.sendFreeInput("문양을 읽는다", signal); // 자유 입력 전송
        expect(state.game.relations.lyra).toBe(2); // 관계도 반영 확인
        expect(state.game.log.at(-1)?.content).toBe("기록을 찾아요."); // 대사 기록 확인
        expect(await repository.load(state.game.packageId, "auto")).not.toBeNull(); // 자동 저장 확인
        expect(adapter.receivedSignal).toBe(signal); // 중단 신호 전달 확인
    }); // 테스트 종료

    it("고른 언어를 AI 요청에 담는다", async () => // 언어 전달 검증
    { // 테스트 시작
        let state = createPreparedTextPlaySessionState(); // 세션 상태 생성
        const adapter = new FixedAdapter(JSON.stringify({ narration: "The mist clears.", dialogue: null, proposedActions: [] })); // 고정 어댑터
        const controller = createTextPlayController({ llm: adapter, repository: new MemoryTextPlaySaveRepository(), getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z", language: "en" }); // 영어 제어기
        await controller.sendFreeInput("Look around", new AbortController().signal); // 자유 입력 전송
        expect(adapter.receivedInput?.language).toBe("en"); // 언어 전달 확인
        expect(adapter.receivedInput?.system).toContain("only in English"); // 영어 규칙 확인
        expect(state.game.log.at(-1)?.content).toBe("The mist clears."); // 영어 서술 기록 확인
    }); // 테스트 종료

    it("영어를 고르면 오류·저장 안내도 영어로 보여 준다", async () => // 영어 안내 검증
    { // 테스트 시작
        let state = createPreparedTextPlaySessionState(); // 세션 상태 생성
        const failing = createTextPlayController({ llm: new FailingAdapter("unavailable"), repository: new MemoryTextPlaySaveRepository(), getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z", language: "en" }); // 실패 제어기
        await failing.sendFreeInput("Look around", new AbortController().signal); // 자유 입력 전송
        expect(state.error).toBe("Could not connect to the AI service."); // 영어 오류 확인
        const broken = createTextPlayController({ llm: new FixedAdapter("broken"), repository: new MemoryTextPlaySaveRepository(), getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z", language: "en" }); // 해석 실패 제어기
        await broken.sendFreeInput("Look around", new AbortController().signal); // 자유 입력 전송
        expect(state.error).toBe("Could not read the response."); // 영어 해석 오류 확인
        const working = createTextPlayController({ llm: new FixedAdapter(JSON.stringify({ narration: "The mist clears.", dialogue: null, proposedActions: [] })), repository: new MemoryTextPlaySaveRepository(), getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z", language: "en" }); // 성공 제어기
        await working.sendFreeInput("Look around", new AbortController().signal); // 자유 입력 전송
        expect(state.saveNotice).toBe("Auto-saved."); // 영어 저장 안내 확인
        const aborter = new AbortController(); // 중지 제어기
        aborter.abort(); // 미리 중지
        await working.sendFreeInput("Look around", aborter.signal); // 중지된 입력 전송
        expect(state.error).toBe("Stopped generating the response."); // 영어 중지 안내 확인
    }); // 테스트 종료

    it("지금 상황에 맞지 않는 행동만 빼고 서술과 나머지 행동은 반영한다", async () => // 부분 적용 검증
    { // 테스트 시작
        let state = createPreparedTextPlaySessionState(); // 세션 상태 생성
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const raw = JSON.stringify({ narration: "안개가 걷힌다.", dialogue: null, proposedActions: [{ type: "complete-quest", questId: "voices-below" }, { type: "change-relation", characterId: "lyra", amount: 3 }] }); // 선택지 전용 행동이 섞인 응답
        const controller = createTextPlayController({ llm: new FixedAdapter(raw), repository, getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z" }); // 제어기 생성
        await controller.sendFreeInput("안개를 헤친다", new AbortController().signal); // 자유 입력 전송
        expect(state.error).toBeNull(); // 턴 거부 없음 확인
        expect(state.game.relations.lyra).toBe(3); // 가능한 행동 반영 확인
        expect(state.game.completedQuestIds).toEqual([]); // 선택지 전용 행동 제외 확인
        expect(state.game.log.at(-1)?.content).toBe("안개가 걷힌다."); // 서술 기록 확인
    }); // 테스트 종료

    it("잘못된 JSON 응답에서는 확정 상태를 유지하고 저장하지 않는다", async () => // 실패 흐름 검증
    { // 테스트 시작
        let state = createPreparedTextPlaySessionState(); // 세션 상태 생성
        const before = state.game; // 확정 상태 보존
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const controller = createTextPlayController({ llm: new FixedAdapter("잘못된 응답"), repository, getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z" }); // 제어기 생성
        await controller.sendFreeInput("확인한다", new AbortController().signal); // 자유 입력 전송
        expect(state.game).toEqual(before); // 게임 상태 유지 확인
        expect(state.error).toBe("응답을 해석하지 못했습니다."); // 오류 안내 확인
        expect(await repository.list(state.game.packageId)).toHaveLength(0); // 저장 생략 확인
    }); // 테스트 종료

    it.each([ // 서비스 오류 목록
        ["authentication-required", "로그인이 필요합니다."], // 인증 오류
        ["insufficient-credit", "AI 서비스 크레딧이 부족합니다."], // 크레딧 오류
        ["rate-limited", "요청이 많습니다. 잠시 후 다시 시도하세요."], // 요청 제한 오류
        ["unavailable", "AI 서비스에 연결할 수 없습니다."], // 연결 오류
        ["model-unavailable", "선택한 로컬 모델이 설치되어 있지 않습니다."], // 모델 누락 오류
        ["local-ai-not-ready", "내장 AI가 아직 준비되지 않았습니다. 다른 AI를 선택해 주세요."], // 내장 AI 미준비 오류
        ["invalid-response", "AI 서비스 응답 형식이 올바르지 않습니다."], // 응답 오류
    ] as const)("%s 오류를 사용자 안내로 변환한다", async (code, message) => // 오류 안내 검증
    { // 테스트 시작
        let state = createPreparedTextPlaySessionState(); // 세션 상태 생성
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        const controller = createTextPlayController({ llm: new FailingAdapter(code), repository, getState: () => state, dispatch: (action) => { state = textPlayReducer(state, action); }, now: () => "2026-09-26T00:00:00.000Z" }); // 제어기 생성
        await controller.sendFreeInput("다시 확인한다", new AbortController().signal); // 자유 입력 전송
        expect(state.error).toBe(message); // 오류 안내 확인
        expect(state.pendingInput).toBe("다시 확인한다"); // 재시도 입력 확인
    }); // 테스트 종료
}); // 묶음 종료
