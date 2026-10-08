import { describe, expect, it } from "vitest"; // 테스트 도구
import { composeStatus, formatStoryTime } from "@chatbot/features/chat/status-model"; // 상태창
import { createSuggestedReplies, getStyleSample } from "@chatbot/features/chat/suggestion-model"; // 추천 답변·문체
import { createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본값
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { Message } from "@chatbot/features/core/types"; // 도메인 타입
import { translateTitle } from "@chatbot/features/core/use-document-language"; // 탭 제목 바꾸기
import { parseStoryMessage } from "@chatbot/features/story/story-model"; // 스토리 모델
import type { ChatReplyOptions, LLMInput } from "@chatbot/lib/adapters/llm-adapter"; // 대화 입력
import { decorateReply, MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // 대화 어댑터
import { localeTag, setActiveLocale, translateTo } from "@chatbot/lib/i18n"; // 번역 도구
import { composeStoryReply } from "@chatbot/lib/story/mock-story-writer"; // Mock 스토리 작성기
import { summarizeTokenDays } from "@chatbot/lib/story/token-ledger"; // 토큰 기록
import { mockCharacters, mockConversations, mockConversationVersions } from "@chatbot/mocks/fixtures"; // Mock 데이터

const hangul = /[가-힣]/; // 한글 글자
const options: ChatReplyOptions = { tier: "basic", length: 3, thinking: "off", writingStyle: "romance", preventImpersonation: false, persona: null, userNote: "", memories: [], playGuide: "", stats: [], lore: [{ title: "Moon Gate", keywords: ["gate"], content: "A gate that opens at midnight." }], examples: [], language: "en" }; // 영어 답변 조건
const statusBase = { template: { ...createDefaultStatusTemplate(true), customLabels: ["Clue"] }, people: ["Rian"], previous: null, turn: 1, userMessage: "hello", aiChanges: [], emotion: "설렘", tags: ["판타지"], startedAt: "2026-10-02T11:00:00.000Z", seed: "conversation-rian" }; // 상태창 입력

function userMessage(content: string): Message // 사용자 메시지 생성
{ // 함수 시작
    return { id: "user-1", conversationId: mockConversations[0].id, versionId: mockConversationVersions[0].id, sourceMessageId: null, role: "user", content, emotion: null, sceneEvent: null, createdAt: "2026-10-01T00:00:00.000Z" }; // 메시지 반환
} // 함수 종료

async function collect(chunks: AsyncIterable<string>): Promise<string> // 스트림 수집
{ // 함수 시작
    let text = ""; // 누적 문자열
    for await (const chunk of chunks) // 조각 순회
    { // 순회 시작
        text += chunk; // 조각 추가
    } // 순회 종료
    return text; // 전체 반환
} // 함수 종료

describe("AI 답변 언어", () => // 답변 언어 묶음
{ // 묶음 시작
    it("답변 언어가 영어면 연습용 AI가 영어로 답하고, 정하지 않으면 한국어로 답한다", async () => // 캐릭터 대화 검증
    { // 검증 시작
        const adapter = new MockLLMAdapter({ delayMs: 0, seed: 7 }); // 어댑터 생성
        const input: LLMInput = { character: mockCharacters[0], conversation: mockConversations[0], version: mockConversationVersions[0], messages: [userMessage("Tell me about the gate")], options }; // 영어 입력
        const english = await collect(adapter.streamReply(input)); // 영어 응답
        expect(english).not.toMatch(hangul); // 한글 없음
        expect(english).toContain("The story of ‘Moon Gate’ comes to mind."); // 설정집도 영어 문장으로
        const korean = await collect(adapter.streamReply({ ...input, options: { ...options, language: undefined } })); // 언어를 정하지 않은 응답
        expect(korean).toMatch(hangul); // 한국어 응답
        expect(decorateReply("Hi.", { ...options, length: 1, lore: [] }, 2, false)).toBe("*Their gaze rests on you for a moment.* Hi. *You hesitate for a moment, then nod.*"); // 문체 장식과 사칭 문장도 영어
    }); // 검증 종료

    it("스토리 응답은 내레이션 표시와 인물 이름은 그대로 두고 문장만 영어로 쓴다", () => // 스토리 검증
    { // 검증 시작
        const cast = createInitialState().stories.find((story) => story.id === "story-moonlit-archive")?.cast ?? []; // 등장인물
        const reply = composeStoryReply({ story: { title: "비 그친 밤의 기록관", synopsis: "", userRole: "", cast }, messages: [userMessage("Where are we?")], seed: 1, language: "en" }); // 영어 응답
        const segments = parseStoryMessage(reply, cast); // 대사 나누기
        expect(segments[0]?.kind).toBe("narration"); // 내레이션 표시는 그대로 읽힘
        expect(segments.slice(1).every((segment) => segment.kind === "character")).toBe(true); // 인물 대사
        const withoutNames = cast.reduce((text, member) => text.replaceAll(member.displayName, ""), segments.map((segment) => segment.text).join(" ")); // 이름을 뺀 문장
        expect(withoutNames).not.toMatch(hangul); // 문장은 영어
    }); // 검증 종료

    it("영어 화면에서는 상태창·추천 답변·문체 미리보기를 영어로 만든다", () => // 상태창·추천 검증
    { // 검증 시작
        setActiveLocale("en"); // 영어 화면
        const status = composeStatus(statusBase); // 상태창
        expect(status.location).not.toMatch(hangul); // 장소
        expect(status.tip).not.toMatch(hangul); // 진행 팁
        expect(status.time).toBe("Friday 20:06"); // 작품 속 시간
        expect(status.thoughts.map((item) => item.text).join(" ")).not.toMatch(hangul); // 속마음
        expect(status.custom.map((item) => item.value).join(" ")).not.toMatch(hangul); // 직접 항목 값
        expect(formatStoryTime("2026-10-02T11:00:00.000Z", 240)).toBe("Saturday 20:00"); // 자정 넘김
        expect(createSuggestedReplies({ names: ["Rian"], emotion: "설렘", turn: 3, seed: "c1" }).join(" ")).not.toMatch(hangul); // 추천 답변
        expect(createSuggestedReplies({ names: [], emotion: "설렘", turn: 3, seed: "c1" }).join(" ")).not.toMatch(hangul); // 이름이 없을 때
        expect(getStyleSample("comic", "Soha")[1]).toBe("Soha | …Pretend you didn't see that!"); // 문체 미리보기
        expect(getStyleSample("literary", "Soha").join(" ")).not.toMatch(hangul); // 다른 문체도 영어
    }); // 검증 종료

    it("한국어 화면에서는 상태창을 전과 같이 한국어로 만든다", () => // 한국어 유지 검증
    { // 검증 시작
        const status = composeStatus({ ...statusBase, people: ["리안"] }); // 상태창
        expect(status.location).toMatch(hangul); // 장소
        expect(status.tip).toMatch(hangul); // 진행 팁
        expect(status.time).toBe("금요일 20:06"); // 작품 속 시간
    }); // 검증 종료
}); // 묶음 종료

describe("날짜·숫자 형식과 탭 제목", () => // 형식 묶음
{ // 묶음 시작
    it("영어 화면에서는 날짜와 숫자를 영어식으로 쓴다", () => // 형식 검증
    { // 검증 시작
        expect(summarizeTokenDays([], new Date("2026-10-03T12:00:00+09:00")).at(-1)).toMatchObject({ label: "10/3", weekday: "토", fullLabel: "10월 3일 (토)" }); // 한국어 날짜 이름
        expect(new Intl.NumberFormat(localeTag(), { notation: "compact", maximumFractionDigits: 1 }).format(162_000)).toBe("16.2만"); // 한국어 줄임 숫자
        setActiveLocale("en"); // 영어 화면
        expect(summarizeTokenDays([], new Date("2026-10-03T12:00:00+09:00")).at(-1)).toMatchObject({ label: "10/3", weekday: "Sat", fullLabel: "Sat, Oct 3" }); // 영어 날짜 이름
        expect(new Intl.NumberFormat(localeTag(), { notation: "compact", maximumFractionDigits: 1 }).format(162_000)).toBe("162K"); // 영어 줄임 숫자
        expect(new Date("2026-09-01T00:00:00+09:00").toLocaleDateString(localeTag(), { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" })).toBe("September 1, 2026"); // 영어 날짜
    }); // 검증 종료

    it("정한 언어로 글자를 바꾸고 탭 제목은 앞부분만 바꾼다", () => // 제목 검증
    { // 검증 시작
        expect(translateTo("en", "탐색")).toBe("Explore"); // 영어로
        expect(translateTo("ko", "탐색")).toBe("탐색"); // 한국어는 그대로
        expect(translateTo("en", "사전에 없는 글자")).toBe("사전에 없는 글자"); // 없으면 그대로
        expect(translateTitle("탐색 | Mate Verse", "en")).toBe("Explore | Mate Verse"); // 앞부분만 바꿈
        expect(translateTitle("탐색 | Mate Verse", "ko")).toBe("탐색 | Mate Verse"); // 한국어는 그대로
        expect(translateTitle("새벽 도서관의 리안 | Mate Verse", "en")).toBe("새벽 도서관의 리안 | Mate Verse"); // 작품 이름은 그대로
        expect(translateTitle("Mate Verse", "en")).toBe("Mate Verse"); // 서비스 이름만 있을 때
    }); // 검증 종료
}); // 묶음 종료
