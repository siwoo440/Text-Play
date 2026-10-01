import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { renderToString } from "react-dom/server"; // 서버 렌더 도구
import { chooseTextPlayRecommendation } from "@/test/text-play-recommendations"; // 추천 답안 선택 도우미
import { TEXT_PLAY_MEMORY_STORAGE_WARNING } from "@/features/text-play/storage/browser-save-repository"; // 메모리 저장 경고
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { TextPlayPlatformProvider, type TextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 계약
import { TextPlayPreferencesProvider } from "@/features/text-play/preferences/TextPlayPreferencesProvider"; // 설정 공급자
import { TextPlayProvider } from "@/features/text-play/session/TextPlayProvider"; // 세션 공급자
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import { TextPlayScreen } from "@/features/text-play/ui/TextPlayScreen"; // 플레이 화면
import { createPreparedTextPlaySessionState } from "@/test/text-play-fixtures"; // 세션 픽스처
import type { LLMAdapter, LLMInput, StructuredLLMInput, SummaryInput } from "@/lib/adapters/llm-adapter"; // LLM 계약
import { LLMServiceError } from "@/lib/adapters/llm-service-error"; // 서비스 오류

class RetryAdapter implements LLMAdapter // 재시도 어댑터
{ // 클래스 시작
    private attempts = 0; // 시도 횟수

    public async *streamStructuredReply(_input: StructuredLLMInput): AsyncIterable<string> // 구조화 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        this.attempts += 1; // 시도 증가
        if (this.attempts === 1) // 첫 시도 확인
        { // 조건 시작
            throw new LLMServiceError("unavailable"); // 연결 오류 발생
        } // 조건 종료
        yield JSON.stringify({ narration: "재시도 성공", dialogue: null, proposedActions: [] }); // 성공 응답 반환
    } // 함수 종료

    public async *streamReply(_input: LLMInput): AsyncIterable<string> // 일반 응답
    { // 함수 시작
        void _input; // 미사용 입력 표시
        yield "응답"; // 응답 반환
    } // 함수 종료

    public async summarizeConversation(_input: SummaryInput): Promise<string> // 대화 요약
    { // 함수 시작
        void _input; // 미사용 입력 표시
        return "요약"; // 요약 반환
    } // 함수 종료
} // 클래스 종료

function createPlatform(): TextPlayPlatform // 테스트 플랫폼 생성기
{ // 함수 시작
    return { applyWindowResolution: async () => undefined, navigate: vi.fn(), renderSceneImage: (source) => <span data-testid="scene-image">{source}</span> }; // 테스트 플랫폼 반환
} // 함수 종료

describe("Text-Play 플레이 화면", () => // 플레이 검증 묶음
{ // 묶음 시작
    it("선택지와 자유 입력과 상태 정보를 접근 가능한 요소로 제공한다", () => // 기본 UI 검증
    { // 테스트 시작
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        expect(screen.getByRole("heading", { name: "달빛 숲 입구" })).toBeInTheDocument(); // 장면 제목 확인
        expect(screen.getByRole("button", { name: "AI 추천 답안" })).toHaveAttribute("aria-expanded", "false"); // 추천 펼침 버튼 확인
        expect(screen.getByRole("textbox", { name: "행동 직접 입력" })).toBeInTheDocument(); // 자유 입력 확인
        expect(screen.getByRole("button", { name: "전송" })).toBeInTheDocument(); // 전송 버튼 확인
        expect(screen.getByRole("button", { name: "상태 패널 열기" })).toHaveAttribute("aria-controls", "text-play-state-panel"); // 패널 제어 확인
        expect(screen.getByRole("region", { name: "시스템 안내" })).toHaveAttribute("aria-live", "polite"); // 안내 영역 확인
        expect(screen.getByLabelText("AI 연결")).toHaveTextContent("임시 인공지능"); // 공급자 상태 확인
        expect(screen.getByTestId("scene-image")).toHaveTextContent("/images/scenes/moon-library.svg"); // 플랫폼 이미지 확인
    }); // 테스트 종료

    it("실패한 자유 입력을 같은 내용으로 다시 시도한다", async () => // 재시도 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()} llm={new RetryAdapter()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        await user.type(screen.getByRole("textbox", { name: "행동 직접 입력" }), "문양을 확인한다"); // 자유 입력 작성
        await user.click(screen.getByRole("button", { name: "전송" })); // 첫 전송 실행
        await user.click(await screen.findByRole("button", { name: "같은 입력 다시 시도" })); // 재시도 실행
        expect(await screen.findByText("재시도 성공")).toBeInTheDocument(); // 성공 기록 확인
    }); // 테스트 종료

    it("상단바와 장면 무대와 스토리 대화와 추천 답안 도크를 제공한다", async () => // 새 화면 구조 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const navigate = vi.fn(); // 이동 기록 함수
        const platform: TextPlayPlatform = { applyWindowResolution: async () => undefined, navigate, renderSceneImage: (source) => <span data-testid="scene-image">{source}</span> }; // 테스트 플랫폼
        render(<TextPlayPlatformProvider value={platform}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        expect(screen.getByRole("region", { name: "장면 무대" })).toBeInTheDocument(); // 장면 무대 확인
        expect(screen.getByRole("region", { name: "스토리 대화" })).toBeInTheDocument(); // 스토리 대화 확인
        expect(screen.getByRole("region", { name: "추천 답안" })).toBeInTheDocument(); // 추천 답안 확인
        expect(screen.getByRole("combobox", { name: "AI 챗봇 선택" })).toHaveValue("mock"); // AI 선택 확인
        expect(screen.getByRole("option", { name: "올라마 모델 미선택" })).toBeDisabled(); // 로컬 AI 확인
        await user.click(screen.getByRole("button", { name: "메인으로 돌아가기: 달빛 숲의 기록" })); // 작품 제목 선택
        expect(navigate).toHaveBeenCalledWith("home"); // 홈 이동 확인
        await user.click(screen.getByRole("button", { name: "게임 설정 열기" })); // 설정 열기
        expect(screen.getByRole("dialog", { name: "게임 화면 설정" })).toBeInTheDocument(); // 설정 대화상자 확인
    }); // 테스트 종료

    it("현재 턴과 전체 턴을 분리하고 이전 턴의 장면으로 이동한다", async () => // 턴 이동 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        expect(screen.getByLabelText("현재 턴 1")).toHaveTextContent("1"); // 초기 현재 턴 확인
        expect(screen.getByLabelText("전체 턴 1")).toHaveTextContent("1"); // 초기 전체 턴 확인
        await chooseTextPlayRecommendation(user, "달빛 등불을 든다"); // 다음 장면 생성
        expect(screen.getByLabelText("현재 턴 2")).toHaveTextContent("2"); // 최신 현재 턴 확인
        expect(screen.getByLabelText("전체 턴 2")).toHaveTextContent("2"); // 생성된 전체 턴 확인
        expect(screen.getByTestId("scene-image")).toHaveTextContent("/images/scenes/dawn-letter.svg"); // 최신 이미지 확인
        await user.click(screen.getByRole("button", { name: "이전 턴 보기" })); // 이전 턴 이동
        expect(screen.getByLabelText("현재 턴 1")).toHaveTextContent("1"); // 이동한 현재 턴 확인
        expect(screen.getByLabelText("전체 턴 2")).toHaveTextContent("2"); // 전체 턴 유지 확인
        expect(screen.getByTestId("scene-image")).toHaveTextContent("/images/scenes/moon-library.svg"); // 이전 이미지 확인
        expect(screen.getByText("은빛 안개 너머에서 낡은 등불이 희미하게 빛난다.")).toBeInTheDocument(); // 이전 이야기 확인
        expect(screen.getByRole("button", { name: "1턴 보기" })).toHaveAttribute("aria-current", "step"); // 현재 위치 점 확인
        await chooseTextPlayRecommendation(user, "봉인된 서재로 간다"); // 과거 열람 중 새 장면 생성
        expect(screen.getByLabelText("현재 턴 3")).toHaveTextContent("3"); // 새 최신 턴 이동 확인
        expect(screen.getByRole("heading", { name: "봉인된 서재" })).toBeInTheDocument(); // 새 최신 장면 확인
    }); // 테스트 종료

    it("AI 추천 답안은 접힌 상태로 시작하고 누르면 제목 아래에 답안 3개를 펼친다", async () => // 추천 펼침 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        expect(screen.queryByText("AI ASSIST")).not.toBeInTheDocument(); // AI 표제 제거 확인
        expect(screen.queryByText("다음 행동을 선택하세요")).not.toBeInTheDocument(); // 도크 안내 제거 확인
        const toggle = screen.getByRole("button", { name: "AI 추천 답안" }); // 펼침 버튼 조회
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 접힘 상태 확인
        expect(screen.queryByRole("button", { name: "달빛 등불을 든다" })).not.toBeInTheDocument(); // 답안 숨김 확인
        await user.click(toggle); // 추천 펼치기
        expect(toggle).toHaveAttribute("aria-expanded", "true"); // 펼침 상태 확인
        const list = screen.getByRole("list", { name: "AI 추천 답안 목록" }); // 답안 목록 조회
        const answers = within(list).getAllByRole("button"); // 답안 버튼 조회
        expect(answers).toHaveLength(3); // 답안 3개 확인
        expect(answers.map((answer) => answer.textContent)).toEqual(["달빛 등불을 든다", "숲 밖으로 후퇴한다", "주변을 자세히 살핀다"]); // 답안 순서 확인
        expect(toggle.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 제목 아래 목록 확인
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 답안 선택
        expect(screen.getByRole("button", { name: "AI 추천 답안" })).toHaveAttribute("aria-expanded", "false"); // 새 턴 접힘 확인
    }); // 테스트 종료

    it("선택지가 3개보다 적으면 자유 행동 추천으로 채우고 누르면 자유 입력으로 보낸다", async () => // 자유 행동 추천 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const inputs: string[] = []; // 받은 입력 목록
        const adapter: LLMAdapter = // 입력 기록 어댑터
        { // 객체 시작
            async *streamStructuredReply(input: StructuredLLMInput) // 구조화 응답
            { // 함수 시작
                inputs.push(input.userInput); // 입력 기록
                yield JSON.stringify({ narration: "주변을 살폈다", dialogue: null, proposedActions: [] }); // 응답 반환
            }, // 함수 종료
            async *streamReply() // 일반 응답
            { // 함수 시작
                yield "응답"; // 응답 반환
            }, // 함수 종료
            async summarizeConversation() // 대화 요약
            { // 함수 시작
                return "요약"; // 요약 반환
            }, // 함수 종료
        }; // 객체 종료
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()} llm={adapter}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "AI 추천 답안" })); // 추천 펼치기
        await user.click(screen.getByRole("button", { name: "주변을 자세히 살핀다" })); // 자유 행동 추천 선택
        expect(await screen.findByText("주변을 살폈다")).toBeInTheDocument(); // 응답 기록 확인
        expect(inputs).toEqual(["주변을 자세히 살핀다"]); // 자유 입력 전달 확인
    }); // 테스트 종료

    it("서버 첫 렌더의 플레이 화면에는 저장 경고를 넣지 않는다", () => // 화면 불일치 방지 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const warningRepository = Object.assign(repository, { getStorageWarning: () => TEXT_PLAY_MEMORY_STORAGE_WARNING }); // 경고 저장소 생성
        const html = renderToString(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={warningRepository}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 서버 렌더
        expect(html).not.toContain(TEXT_PLAY_MEMORY_STORAGE_WARNING); // 서버 경고 부재 확인
    }); // 테스트 종료

    it("응답을 받는 동안 원문 대신 생성 중 안내와 서술만 보여 준다", async () => // 스트리밍 표시 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        let releaseFirst = () => undefined as void; // 첫 조각 해제기
        let releaseRest = () => undefined as void; // 나머지 해제기
        const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; }); // 첫 조각 대기
        const restGate = new Promise<void>((resolve) => { releaseRest = resolve; }); // 나머지 대기
        const adapter: LLMAdapter = // 단계 응답 어댑터
        { // 객체 시작
            async *streamStructuredReply() // 구조화 응답
            { // 함수 시작
                await firstGate; // 첫 조각 대기
                yield "{\"narration\":\"안개가 \\\"천천히\\\""; // 서술 앞부분
                await restGate; // 나머지 대기
                yield " 걷힌다.\",\"dialogue\":null,\"proposedActions\":[]}"; // 서술 뒷부분
            }, // 함수 종료
            async *streamReply() // 일반 응답
            { // 함수 시작
                yield "응답"; // 응답 반환
            }, // 함수 종료
            async summarizeConversation() // 대화 요약
            { // 함수 시작
                return "요약"; // 요약 반환
            }, // 함수 종료
        }; // 객체 종료
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()} llm={adapter}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        await user.type(screen.getByRole("textbox", { name: "행동 직접 입력" }), "안개를 살핀다"); // 자유 입력 작성
        await user.click(screen.getByRole("button", { name: "전송" })); // 전송 실행
        expect(await screen.findByLabelText("생성 중인 이야기")).toHaveTextContent("응답 생성 중…"); // 대기 안내 확인
        releaseFirst(); // 첫 조각 해제
        expect(await screen.findByText("안개가 \"천천히\"")).toBeInTheDocument(); // 서술만 표시 확인
        expect(screen.getByLabelText("생성 중인 이야기")).not.toHaveTextContent("narration"); // 원문 숨김 확인
        releaseRest(); // 나머지 해제
        expect(await screen.findByText("안개가 \"천천히\" 걷힌다.")).toBeInTheDocument(); // 완성 서술 확인
    }); // 테스트 종료

    it("추천 답안을 직접 작성 영역 바로 위에 배치한다", () => // 도크 순서 검증
    { // 테스트 시작
        render(<TextPlayPlatformProvider value={createPlatform()}><TextPlayPreferencesProvider><TextPlayProvider initialState={createPreparedTextPlaySessionState()} repository={new MemoryTextPlaySaveRepository()}><TextPlayScreen /></TextPlayProvider></TextPlayPreferencesProvider></TextPlayPlatformProvider>); // 화면 렌더
        const recommendations = screen.getByRole("region", { name: "추천 답안" }); // 추천 영역 조회
        const input = screen.getByRole("textbox", { name: "행동 직접 입력" }); // 입력 영역 조회
        expect(recommendations.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 추천 영역 선행 확인
        expect(recommendations.parentElement?.nextElementSibling?.contains(input)).toBe(true); // 직접 입력 바로 위 확인
    }); // 테스트 종료
}); // 묶음 종료
