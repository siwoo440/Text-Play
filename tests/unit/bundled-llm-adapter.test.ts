import { describe, expect, it } from "vitest"; // 테스트 도구
import { createTauriBundledClient } from "@/desktop/tauri-bundled-client"; // 데스크톱 내장 AI 통신기
import type { TauriChannel } from "@/desktop/tauri-stream"; // Tauri 채널 계약
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { BundledLLMAdapter } from "@/lib/adapters/bundled-llm-adapter"; // 내장 AI 어댑터
import type { BundledChatRequest, BundledRuntimeClient } from "@/lib/adapters/bundled-runtime-client"; // 내장 AI 통신 계약
import { createCharacterMessages } from "@/lib/adapters/chat-messages"; // 대화 메시지 생성기
import type { LocalAIStreamEvent } from "@/lib/adapters/local-ai-stream"; // 스트림 사건 계약
import { createStructuredMessages } from "@/lib/adapters/structured-messages"; // 구조화 메시지 생성기

class RecordingBundledClient implements BundledRuntimeClient // 기록용 내장 AI 통신기
{ // 클래스 시작
    public requests: BundledChatRequest[] = []; // 받은 요청

    public constructor(private readonly chunks: string[]) // 생성자
    { // 생성자 시작
    } // 생성자 종료

    public async *streamChat(request: BundledChatRequest): AsyncIterable<string> // 대화 스트림
    { // 함수 시작
        this.requests.push(request); // 요청 기록
        yield* this.chunks; // 조각 반환
    } // 함수 종료
} // 클래스 종료

async function collect(chunks: AsyncIterable<string>): Promise<string> // 스트림 수집기
{ // 함수 시작
    let result = ""; // 결과 문자열
    for await (const chunk of chunks) // 조각 순회
    { // 반복 시작
        result += chunk; // 조각 누적
    } // 반복 종료
    return result; // 결과 반환
} // 함수 종료

const STRUCTURED_INPUT = { system: "게임 규칙", context: "현재 장면", userInput: "문을 연다", responseSchema: "JSON 객체", jsonSchema: { type: "object" } }; // 구조화 입력

describe("내장 AI 어댑터", () => // 어댑터 묶음
{ // 묶음 시작
    it("구조화 응답은 앱 메시지와 작품 JSON 스키마를 함께 보낸다", async () => // 구조화 요청 검증
    { // 테스트 시작
        const client = new RecordingBundledClient(["{\"narration\":", "\"달빛\"}"]); // 기록 통신기
        const result = await collect(new BundledLLMAdapter(client).streamStructuredReply(STRUCTURED_INPUT)); // 응답 수집
        expect(result).toBe("{\"narration\":\"달빛\"}"); // 조각 순서 확인
        expect(client.requests).toEqual([{ messages: createStructuredMessages(STRUCTURED_INPUT), responseSchema: { type: "object" }, maxTokens: 640 }]); // 요청 확인
    }); // 테스트 종료

    it("JSON 스키마가 없는 구조화 입력은 형식 강제 없이 보낸다", async () => // 스키마 없음 검증
    { // 테스트 시작
        const client = new RecordingBundledClient(["{}"]); // 기록 통신기
        await collect(new BundledLLMAdapter(client).streamStructuredReply({ system: "규칙", context: "문맥", userInput: "입력", responseSchema: "설명" })); // 응답 수집
        expect(client.requests[0].responseSchema).toBeNull(); // 형식 강제 없음 확인
    }); // 테스트 종료

    it("캐릭터 대화는 캐릭터 메시지로 형식 강제 없이 보낸다", async () => // 캐릭터 대화 검증
    { // 테스트 시작
        const state = createInitialState(); // 초기 상태
        const conversation = state.conversations[0]; // 첫 대화방
        const character = state.characters.find((item) => item.id === conversation.characterId) ?? state.characters[0]; // 대화 캐릭터
        const input = { character, conversation, messages: state.messages.filter((message) => message.conversationId === conversation.id) }; // 대화 입력
        const client = new RecordingBundledClient(["안녕", "하세요"]); // 기록 통신기
        expect(await collect(new BundledLLMAdapter(client).streamReply(input))).toBe("안녕하세요"); // 응답 확인
        expect(client.requests).toEqual([{ messages: createCharacterMessages(input), responseSchema: null, maxTokens: 512 }]); // 요청 확인
    }); // 테스트 종료

    it("대화 요약은 160자로 자른다", async () => // 요약 검증
    { // 테스트 시작
        const state = createInitialState(); // 초기 상태
        const client = new RecordingBundledClient([" 가".repeat(100), "나".repeat(100)]); // 긴 요약 통신기
        const summary = await new BundledLLMAdapter(client).summarizeConversation({ conversation: state.conversations[0], messages: state.messages.slice(0, 2) }); // 요약 실행
        expect(summary).toHaveLength(160); // 길이 확인
        expect(summary.startsWith("가")).toBe(true); // 앞 공백 제거 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("Tauri 내장 AI 통신기", () => // 통신기 묶음
{ // 묶음 시작
    it("내장 AI 명령에 요청 식별자·메시지·스키마·최대 길이를 넘기고 조각을 순서대로 전달한다", async () => // 스트림 검증
    { // 테스트 시작
        const calls: { command: string; argumentsValue?: Record<string, unknown> }[] = []; // 명령 기록
        const invokeCommand = async <T,>(command: string, argumentsValue?: Record<string, unknown>): Promise<T> => // 명령 대역
        { // 함수 시작
            calls.push({ command, argumentsValue }); // 명령 기록
            const channel = argumentsValue?.onEvent as TauriChannel<LocalAIStreamEvent>; // 요청 채널
            queueMicrotask(() => // 사건 전달 예약
            { // 작업 시작
                channel.onmessage({ type: "chunk", content: "숲이" }); // 첫 조각
                channel.onmessage({ type: "chunk", content: " 깨어난다" }); // 둘째 조각
                channel.onmessage({ type: "done" }); // 완료
            }); // 작업 종료
            return undefined as T; // 명령 완료
        }; // 함수 종료
        const client = createTauriBundledClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }), createRequestId: () => "request-7" }); // 통신기 생성
        const request = { messages: [{ role: "user" as const, content: "안녕" }], responseSchema: { type: "object" }, maxTokens: 640 }; // 요청
        expect(await collect(client.streamChat(request))).toBe("숲이 깨어난다"); // 조각 순서 확인
        expect(calls[0].command).toBe("stream_bundled_chat"); // 명령 이름 확인
        expect(calls[0].argumentsValue?.request).toEqual({ ...request, requestId: "request-7" }); // 요청 내용 확인
    }); // 테스트 종료

    it("실행 엔진이 준비되지 않았다는 오류를 별도 오류 코드로 바꾼다", async () => // 미준비 검증
    { // 테스트 시작
        const invokeCommand = async <T,>(command: string): Promise<T> => // 명령 대역
        { // 함수 시작
            if (command === "stream_bundled_chat") // 스트림 명령 확인
            { // 조건 시작
                throw new Error("BUNDLED_NOT_READY: 내장 AI 실행 엔진이 아직 준비되지 않았습니다."); // 미준비 오류
            } // 조건 종료
            return undefined as T; // 기타 명령 완료
        }; // 함수 종료
        const client = createTauriBundledClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }) }); // 통신기 생성
        await expect(collect(client.streamChat({ messages: [{ role: "user", content: "안녕" }], responseSchema: null, maxTokens: 8 }))).rejects.toMatchObject({ code: "local-ai-not-ready" }); // 오류 코드 확인
    }); // 테스트 종료

    it("사용자가 멈추면 중단 오류를 내고 Rust에 같은 요청 중단을 알린다", async () => // 중단 검증
    { // 테스트 시작
        const commands: { command: string; argumentsValue?: Record<string, unknown> }[] = []; // 명령 기록
        const invokeCommand = async <T,>(command: string, argumentsValue?: Record<string, unknown>): Promise<T> => // 명령 대역
        { // 함수 시작
            commands.push({ command, argumentsValue }); // 명령 기록
            if (command === "stream_bundled_chat") // 스트림 명령 확인
            { // 조건 시작
                return await new Promise<T>(() => undefined); // 끝나지 않는 Rust 요청
            } // 조건 종료
            return undefined as T; // 중단 명령 완료
        }; // 함수 종료
        const controller = new AbortController(); // 중단 제어기
        const client = createTauriBundledClient({ invokeCommand, createChannel: () => ({ onmessage: () => undefined }), createRequestId: () => "request-9" }); // 통신기 생성
        const pending = collect(client.streamChat({ messages: [{ role: "user", content: "안녕" }], responseSchema: null, maxTokens: 8 }, controller.signal)); // 스트림 시작
        await Promise.resolve(); // 시작 대기
        controller.abort(); // 사용자 중단
        await expect(pending).rejects.toMatchObject({ name: "AbortError" }); // 중단 오류 확인
        expect(commands).toContainEqual({ command: "cancel_local_chat", argumentsValue: { requestId: "request-9" } }); // Rust 중단 확인
    }); // 테스트 종료
}); // 묶음 종료
