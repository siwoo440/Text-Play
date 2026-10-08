import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, TokenRecord } from "@chatbot/features/core/types"; // 상태 타입
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지
import { createStoryConversation } from "@chatbot/features/story/story-model"; // 스토리 대화 시작
import { addTokenRecord, filterTokenRecords, groupTokenRecords, summarizeTokenDays, TOKEN_RECORD_LIMIT, tokenSourceLabels } from "@chatbot/lib/story/token-ledger"; // 토큰 기록
import { trySpend, trySpendAmount } from "@chatbot/lib/story/token-policy"; // 토큰 차감

const record = (id: string, direction: "earn" | "spend", amount: number, createdAt: string, source: TokenRecord["source"] = direction === "earn" ? "attendance" : "chat"): TokenRecord => ({ id, direction, source, label: direction === "earn" ? "출석 1일차" : "대화", amount, balance: 1000, createdAt }); // 기록 만들기
const merge = (state: AppState, chat: AppState, conversationId = "conversation-rian") => appReducer(state, { type: "merge-chat-state", conversationId, state: chat, allowCreate: true }); // 채팅 병합

describe("토큰 기록 다루기", () => // 기록 묶음
{ // 묶음 시작
    it("새 기록을 맨 앞에 넣고 같은 식별자는 바꾸며 최근 300개까지만 남긴다", () => // 추가
    { // 검증 시작
        expect(TOKEN_RECORD_LIMIT).toBe(300); // 한도
        const first = addTokenRecord([], record("a", "earn", 5, "2026-10-03T00:00:00.000Z")); // 하나
        const second = addTokenRecord(first, record("b", "spend", 1, "2026-10-03T01:00:00.000Z")); // 둘
        expect(second.map((item) => item.id)).toEqual(["b", "a"]); // 최근 순
        expect(addTokenRecord(second, record("a", "earn", 9, "2026-10-03T02:00:00.000Z")).map((item) => [item.id, item.amount])).toEqual([["a", 9], ["b", 1]]); // 같은 식별자 교체
        const full = Array.from({ length: TOKEN_RECORD_LIMIT }, (_item, index) => record(`old-${index}`, "spend", 1, "2026-09-01T00:00:00.000Z")); // 꽉 찬 기록
        const next = addTokenRecord(full, record("new", "earn", 5, "2026-10-03T00:00:00.000Z")); // 추가
        expect(next).toHaveLength(TOKEN_RECORD_LIMIT); // 한도 유지
        expect(next.at(-1)?.id).toBe(`old-${TOKEN_RECORD_LIMIT - 2}`); // 가장 오래된 기록 제거
    }); // 검증 종료

    it("종류로 거르고 한국 시간 날짜별로 묶어 받은 양과 쓴 양을 더한다", () => // 필터·묶기
    { // 검증 시작
        const records = [record("d", "spend", 3, "2026-10-03T15:30:00.000Z"), record("c", "spend", 1, "2026-10-03T14:59:00.000Z"), record("b", "earn", 5, "2026-10-03T00:10:00.000Z"), record("a", "earn", 20, "2026-10-02T03:00:00.000Z")]; // 최근 순(15:30Z는 한국 시간 4일 0시 30분)
        expect(filterTokenRecords(records, "earn").map((item) => item.id)).toEqual(["b", "a"]); // 받음
        expect(filterTokenRecords(records, "spend").map((item) => item.id)).toEqual(["d", "c"]); // 사용
        expect(groupTokenRecords(records).map((group) => [group.dateKey, group.label, group.records.map((item) => item.id), group.earned, group.spent])).toEqual([["2026-10-04", "10월 4일 (일)", ["d"], 0, 3], ["2026-10-03", "10월 3일 (토)", ["c", "b"], 5, 1], ["2026-10-02", "10월 2일 (금)", ["a"], 20, 0]]); // 날짜별 묶음
    }); // 검증 종료

    it("최근 7일의 하루 합계를 오래된 날부터 만들고 기록 없는 날은 0으로 둔다", () => // 7일 합계
    { // 검증 시작
        const records = [record("c", "spend", 4, "2026-10-03T03:00:00.000Z"), record("b", "earn", 5, "2026-10-03T00:10:00.000Z"), record("a", "earn", 20, "2026-10-01T03:00:00.000Z"), record("z", "spend", 99, "2026-09-20T03:00:00.000Z")]; // 2주 전 기록 포함
        const days = summarizeTokenDays(records, new Date("2026-10-03T12:00:00+09:00")); // 10월 3일 기준
        expect(days.map((day) => day.dateKey)).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"]); // 7일(달이 바뀌어도 이어짐)
        expect(days.map((day) => [day.earned, day.spent])).toEqual([[0, 0], [0, 0], [0, 0], [0, 0], [20, 0], [0, 0], [5, 4]]); // 하루 합계
        expect(days.at(-1)).toMatchObject({ label: "10/3", weekday: "토", fullLabel: "10월 3일 (토)" }); // 날짜 이름
    }); // 검증 종료

    it("출처마다 화면에 쓸 이름이 있다", () => // 출처 이름
    { // 검증 시작
        expect(tokenSourceLabels).toMatchObject({ attendance: "출석", chat: "대화", "scene-image": "장면 이미지", "studio-image": "이미지 스튜디오" }); // 이름
    }); // 검증 종료
}); // 묶음 종료

describe("쓴 토큰 기록", () => // 사용 기록 묶음
{ // 묶음 시작
    it("채팅에서 메시지 비용을 쓰면 작품 이름과 남은 잔액을 넣어 대화 기록을 남긴다", () => // 대화 기록
    { // 검증 시작
        const state = createInitialState(); // 전역 상태
        const chat = structuredClone(state); // 채팅 상태
        chat.wallet = trySpendAmount(chat.wallet, 3, "chat", "2026-10-03T03:00:00.000Z").wallet; // 플러스챗 3토큰
        const merged = merge(state, chat); // 병합
        expect(merged.tokenRecords).toEqual([{ id: "spend-chat-conversation-rian-2026-10-03T03:00:00.000Z", direction: "spend", source: "chat", label: "대화", work: "새벽 도서관의 리안", amount: 3, balance: state.wallet.balance - 3, createdAt: "2026-10-03T03:00:00.000Z" }]); // 대화 기록
        expect(merge(merged, structuredClone(merged)).tokenRecords).toHaveLength(1); // 쓴 토큰이 없으면 기록하지 않음
    }); // 검증 종료

    it("장면 이미지를 만든 비용은 장면 이미지 기록으로 나누고, 날짜가 바뀐 뒤에도 구분한다", () => // 장면 이미지 기록
    { // 검증 시작
        const state = createInitialState(); // 전역 상태
        state.wallet = { ...state.wallet, dailyImageUsed: 3, dailyChatUsed: 9, updatedAt: "2026-10-02T03:00:00.000Z" }; // 어제 이미지 3번
        const chat = structuredClone(state); // 채팅 상태
        chat.wallet = trySpend(chat.wallet, "manual-image", "2026-10-03T03:00:00.000Z").wallet; // 오늘 장면 이미지(20토큰)
        const merged = merge(state, chat); // 병합
        expect(merged.tokenRecords).toHaveLength(1); // 기록 하나
        expect(merged.tokenRecords[0]).toMatchObject({ id: "spend-scene-image-conversation-rian-2026-10-03T03:00:00.000Z", source: "scene-image", label: "장면 이미지 만들기", work: "새벽 도서관의 리안", amount: 20, balance: state.wallet.balance - 20 }); // 장면 이미지 기록
    }); // 검증 종료

    it("스토리 대화는 스토리 이름으로 기록하고, 그 사이 받은 토큰이 있어도 잔액이 맞는다", () => // 스토리·잔액
    { // 검증 시작
        const started = createStoryConversation(createInitialState(), "story-moonlit-archive", "2026-10-03T00:00:00.000Z"); // 스토리 시작
        const chat = structuredClone(started.state); // 채팅 상태
        chat.wallet = trySpendAmount(chat.wallet, 1, "chat", "2026-10-03T03:00:00.000Z").wallet; // 1토큰
        const rewarded = appReducer(started.state, { type: "check-attendance", now: "2026-10-03T02:00:00.000Z" }); // 그 사이 출석 +5
        const merged = merge(rewarded, chat, started.conversation.id); // 병합
        expect(merged.tokenRecords.map((item) => [item.source, item.amount, item.balance])).toEqual([["chat", 1, started.state.wallet.balance + 5 - 1], ["attendance", 5, started.state.wallet.balance + 5]]); // 쓴 기록이 최신, 잔액은 받은 토큰을 반영
        expect(merged.tokenRecords[0].work).toBe(started.state.stories.find((story) => story.id === "story-moonlit-archive")?.title); // 스토리 이름
    }); // 검증 종료

    it("이미지 스튜디오에서 만든 이미지는 이미지 스튜디오 기록으로 남긴다", () => // 스튜디오 기록
    { // 검증 시작
        const state = createInitialState(); // 전역 상태
        const image = createGeneratedImage({ prompt: "새벽 도서관 창가에 앉은 사서", style: "anime", aspect: "landscape", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-03T04:00:00.000Z", "image-1"); // 생성 이미지
        const next = appReducer(state, { type: "add-image", image, wallet: trySpend(state.wallet, "studio-image", "2026-10-03T04:00:00.000Z").wallet }); // 저장과 차감
        expect(next.tokenRecords[0]).toEqual({ id: "spend-studio-image-image-1", direction: "spend", source: "studio-image", label: "이미지 만들기", work: "새벽 도서관 창가에 앉은 사서", amount: 20, balance: state.wallet.balance - 20, createdAt: "2026-10-03T04:00:00.000Z" }); // 스튜디오 기록
        expect(appReducer(next, { type: "add-image", image, wallet: next.wallet }).tokenRecords).toHaveLength(1); // 같은 이미지는 다시 기록하지 않음
    }); // 검증 종료
}); // 묶음 종료
