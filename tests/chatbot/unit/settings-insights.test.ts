import { describe, expect, it } from "vitest"; // 테스트 도구
import { layoutChoices, toLayoutChoice } from "@chatbot/features/chat/layout-resolver"; // 레이아웃 선택지
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, CharacterMemory, LayoutId } from "@chatbot/features/core/types"; // 상태 타입
import { buildDiagnostics, formatBytes, getActivitySummary, getFollowedCreators, getMemoryGroups, getNotificationWindow, getReportEntries } from "@chatbot/features/settings/settings-insights"; // 설정 요약
import { faqs, faqTopics, filterFaqs } from "@chatbot/features/support/faq"; // 자주 묻는 질문

const memory = (id: string, conversationId: string, content: string, updatedAt: string, category: CharacterMemory["category"] = "long"): CharacterMemory => ({ id, characterId: "rian", conversationId, category, content, sourceMessageIds: [], editedByUser: false, createdAt: updatedAt, updatedAt }); // 메모리 만들기

describe("설정 페이지 요약", () => // 요약 묶음
{ // 묶음 시작
    it("내 활동은 내가 만든 작품과 대화·좋아요·보관·팔로우 수를 센다", () => // 활동 요약
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        expect(getActivitySummary(base)).toEqual({ characters: 0, stories: 0, conversations: 3, likes: 0, bookmarks: 0, follows: 0 }); // 처음 상태
        const state: AppState = { ...base, characters: base.characters.map((character, index) => index < 2 ? { ...character, creatorId: base.profile.id } : character), stories: base.stories.map((story, index) => index === 0 ? { ...story, creatorId: base.profile.id } : story), likedCharacterIds: ["rian", "sera", "noah"], bookmarkedCharacterIds: ["rian"], followedCreatorIds: ["creator-evening", "creator-rain"] }; // 활동이 있는 상태
        expect(getActivitySummary(state)).toEqual({ characters: 2, stories: 1, conversations: 3, likes: 3, bookmarks: 1, follows: 2 }); // 활동 수
    }); // 검증 종료

    it("팔로우한 제작자는 최근에 팔로우한 순서로 이름과 작품 수를 보여 준다", () => // 팔로우 목록
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        expect(getFollowedCreators(base)).toEqual([]); // 처음에는 없음
        const works = base.characters.filter((character) => character.creatorId === "creator-archive").length; // 아카이브 스튜디오의 작품 수
        expect(getFollowedCreators({ ...base, followedCreatorIds: ["creator-archive", "creator-evening", "creator-gone"] })).toEqual([{ creatorId: "creator-gone", name: "알 수 없는 제작자", works: 0 }, { creatorId: "creator-evening", name: "저녁다섯시", works: 1 }, { creatorId: "creator-archive", name: "아카이브 스튜디오", works }]); // 최근 순, 사라진 제작자는 이름 없이
    }); // 검증 종료

    it("요약 메모리는 대화방별로 묶고 최근에 바뀐 대화방과 메모리를 앞에 둔다", () => // 메모리 묶음
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        expect(getMemoryGroups(base)).toEqual([]); // 처음에는 없음
        const memories = [memory("m1", "conversation-rian", "커피를 싫어한다", "2026-10-01T09:00:00.000Z"), memory("m2", "conversation-sera", "비 오는 날을 좋아한다", "2026-10-02T09:00:00.000Z", "relation"), memory("m3", "conversation-rian", "창가 자리를 좋아한다", "2026-10-03T09:00:00.000Z", "short"), memory("m4", "conversation-gone", "지워진 대화의 기억", "2026-09-01T09:00:00.000Z")]; // 메모리
        const groups = getMemoryGroups({ ...base, memories }); // 묶음
        expect(groups.map((group) => [group.title, group.memories.map((item) => item.id)])).toEqual([["새벽 도서관의 리안", ["m3", "m1"]], ["비 오는 교실, 세라", ["m2"]], ["지워진 대화", ["m4"]]]); // 대화방 순서와 메모리 순서
        expect(groups[0].href).toBe("/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1"); // 대화 주소
        expect(groups[2].href).toBeNull(); // 지워진 대화는 주소 없음
    }); // 검증 종료

    it("내가 한 신고는 최근 순으로 캐릭터 이름과 사유 이름을 보여 주고, 취소하면 그 신고만 사라진다", () => // 신고 목록과 취소
    { // 검증 시작
        const base = createInitialState(); // 초기 상태
        const first = { id: "report-1", characterId: "rian", reason: "spam" as const, createdAt: "2026-10-01T10:00:00.000Z" }; // 첫 신고
        const second = { id: "report-2", characterId: "sera", reason: "incorrect-rating" as const, createdAt: "2026-10-02T10:00:00.000Z" }; // 둘째 신고
        const state = appReducer(appReducer(base, { type: "add-character-report", report: first }), { type: "add-character-report", report: second }); // 두 번 신고
        expect(getReportEntries(state)).toEqual([{ id: "report-2", characterName: "비 오는 교실, 세라", reason: "연령 등급이 부정확함", createdAt: second.createdAt }, { id: "report-1", characterName: "새벽 도서관의 리안", reason: "스팸 또는 반복 콘텐츠", createdAt: first.createdAt }]); // 최근 순
        const cancelled = appReducer(state, { type: "remove-character-report", reportId: "report-2" }); // 둘째 신고 취소
        expect(cancelled.localReports).toEqual([first]); // 첫 신고만 남음
        expect(appReducer(cancelled, { type: "remove-character-report", reportId: "없는-신고" })).toBe(cancelled); // 없는 신고는 그대로
    }); // 검증 종료

    it("허용 시간 막대는 하루 중 위치와 길이를 계산하고 잘못된 범위는 그리지 않는다", () => // 하루 막대
    { // 검증 시작
        expect(getNotificationWindow("09:00", "22:00")).toEqual({ startPercent: 37.5, widthPercent: (13 * 60) / 1440 * 100, label: "13시간" }); // 13시간
        expect(getNotificationWindow("06:00", "07:30")?.label).toBe("1시간 30분"); // 시간과 분
        expect(getNotificationWindow("12:00", "12:45")?.label).toBe("45분"); // 분만
        expect(getNotificationWindow("22:00", "09:00")).toBeNull(); // 종료가 더 이름
        expect(getNotificationWindow("09:00", "09:00")).toBeNull(); // 같은 시각
        expect(getNotificationWindow("", "22:00")).toBeNull(); // 빈 값
        expect(getNotificationWindow("25:00", "26:00")).toBeNull(); // 없는 시각
    }); // 검증 종료

    it("진단 정보에는 버전·용량·개수·화면·브라우저가 들어가고 이름과 대화 내용은 들어가지 않는다", () => // 진단 정보
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const text = buildDiagnostics({ appVersion: "1.0.0", state, storageBytes: 2048, viewport: { width: 1440, height: 900 }, userAgent: "TestBrowser/1.0" }); // 진단 정보
        expect(text.split("\n")).toEqual(["Mate Verse 진단 정보", "앱 버전: 1.0.0", "데이터 버전: 18", "응답 방식: 로컬 Mock(외부 API 없음)", "저장 용량: 2.0KB", `작품: 캐릭터 ${state.characters.length}개 · 스토리 ${state.stories.length}개 · 이미지 0장`, `대화: 대화방 3개 · 메시지 ${state.messages.length}개`, "화면: 1440×900", "브라우저: TestBrowser/1.0"]); // 줄 내용
        expect(text).not.toContain(state.profile.nickname); // 이름 없음
        expect(text).not.toContain(state.messages[0].content); // 대화 내용 없음
        expect(buildDiagnostics({ appVersion: "1.0.0", state, storageBytes: null, viewport: null, userAgent: null })).toContain("저장 용량: 알 수 없음\n"); // 알 수 없는 값
        expect([formatBytes(512), formatBytes(1536), formatBytes(3 * 1024 * 1024)]).toEqual(["512B", "1.5KB", "3.00MB"]); // 용량 단위
    }); // 검증 종료
}); // 묶음 종료

describe("채팅 화면 배치 선택지", () => // 배치 묶음
{ // 묶음 시작
    it("예전 아홉 가지 레이아웃을 서랍형·옆 열 좁게·옆 열 넓게로 묶는다", () => // 묶기
    { // 검증 시작
        const groups: Record<string, LayoutId[]> = { drawer: ["M1", "M2", "M3"], narrow: ["T2", "T3", "D1"], wide: ["T1", "D2", "D3"] }; // 묶음별 레이아웃
        for (const [choice, ids] of Object.entries(groups)) // 묶음 순회
        { // 순회 시작
            expect(ids.map(toLayoutChoice)).toEqual(ids.map(() => choice)); // 같은 배치
        } // 순회 종료
    }); // 검증 종료

    it("선택지를 고르면 저장하는 대표 레이아웃은 다시 같은 선택지로 읽힌다", () => // 대표 값
    { // 검증 시작
        expect(layoutChoices.map((choice) => [choice.id, choice.label, choice.layoutId])).toEqual([["drawer", "서랍형", "M1"], ["narrow", "옆 열 좁게", "D1"], ["wide", "옆 열 넓게", "D2"]]); // 세 가지
        expect(layoutChoices.every((choice) => toLayoutChoice(choice.layoutId) === choice.id)).toBe(true); // 왕복 일치
    }); // 검증 종료
}); // 묶음 종료

describe("자주 묻는 질문 찾기", () => // 질문 묶음
{ // 묶음 시작
    it("주제와 검색어(초성 포함)로 질문을 고른다", () => // 찾기
    { // 검증 시작
        expect(filterFaqs("", "all")).toHaveLength(faqs.length); // 전체
        expect(faqTopics.every((topic) => filterFaqs("", topic.id).length > 0)).toBe(true); // 주제마다 질문이 있음
        expect(filterFaqs("", "token").every((faq) => faq.topic === "token")).toBe(true); // 주제만
        expect(filterFaqs("시험 대화", "all").map((faq) => faq.question)).toEqual(["만들던 작품을 저장하기 전에 시험해 볼 수 있나요?"]); // 답에 있는 낱말
        expect(filterFaqs("ㅌㅋ", "all").length).toBeGreaterThan(0); // 초성(토큰)
        expect(filterFaqs("시험 대화", "token")).toEqual([]); // 주제와 검색어가 함께 맞아야 함
        expect(filterFaqs("없는낱말없는낱말", "all")).toEqual([]); // 없음
    }); // 검증 종료
}); // 묶음 종료
