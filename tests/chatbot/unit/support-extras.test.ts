import { describe, expect, it } from "vitest"; // 테스트 도구
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { TokenRecord } from "@chatbot/features/core/types"; // 토큰 기록 타입
import { membershipPlans, membershipRows } from "@chatbot/features/settings/membership"; // 멤버십 비교표
import { buildInquiryText, createInquiryDraft, INQUIRY_BODY_LIMIT, INQUIRY_TITLE_LIMIT, inquiryKinds, validateInquiry } from "@chatbot/features/support/inquiry"; // 문의 초안
import { RELEASE_NOTE_PREVIEW, releaseNotes } from "@chatbot/features/support/release-notes"; // 업데이트 소식
import { setActiveLocale } from "@chatbot/lib/i18n"; // 화면 언어
import { en } from "@chatbot/lib/i18n/en"; // 영어 사전
import { filterTokenRecordsByPeriod, getTokenPeriodRange } from "@chatbot/lib/story/token-ledger"; // 토큰 기간

const now = new Date("2026-10-04T12:00:00+09:00"); // 기준 시각(한국 10월 4일 낮)
const record = (id: string, createdAt: string): TokenRecord => ({ id, direction: "spend", source: "chat", label: "대화", amount: 1, balance: 100, createdAt }); // 기록 생성
const records = [record("today", "2026-10-04T01:00:00+09:00"), record("yesterday-late", "2026-10-03T23:59:00+09:00"), record("six-days", "2026-09-28T09:00:00+09:00"), record("seven-days", "2026-09-27T09:00:00+09:00"), record("month-edge", "2026-09-05T09:00:00+09:00"), record("old", "2026-09-04T09:00:00+09:00")]; // 날짜가 다른 기록
const ids = (period: Parameters<typeof filterTokenRecordsByPeriod>[1]) => filterTokenRecordsByPeriod(records, period, now).map((item) => item.id); // 기간에 든 기록 이름

describe("토큰 기록 기간", () => // 기간 묶음
{ // 묶음 시작
    it("오늘·최근 7일·최근 30일을 한국 날짜로 가른다", () => // 정해진 기간 검증
    { // 검증 시작
        expect(ids({ id: "all", from: "", to: "" })).toHaveLength(6); // 전체
        expect(ids({ id: "today", from: "", to: "" })).toEqual(["today"]); // 오늘(자정 직전 기록은 어제)
        expect(ids({ id: "week", from: "", to: "" })).toEqual(["today", "yesterday-late", "six-days"]); // 오늘 포함 7일
        expect(ids({ id: "month", from: "", to: "" })).toEqual(["today", "yesterday-late", "six-days", "seven-days", "month-edge"]); // 오늘 포함 30일
        expect(getTokenPeriodRange({ id: "week", from: "", to: "" }, now)).toEqual({ from: "2026-09-28", to: "2026-10-04" }); // 범위
    }); // 검증 종료

    it("직접 고른 날짜는 한쪽만 적어도 되고, 거꾸로 골라도 바로잡는다", () => // 직접 고르기 검증
    { // 검증 시작
        expect(ids({ id: "custom", from: "2026-09-27", to: "2026-10-03" })).toEqual(["yesterday-late", "six-days", "seven-days"]); // 양쪽 포함
        expect(ids({ id: "custom", from: "2026-10-03", to: "2026-09-27" })).toEqual(["yesterday-late", "six-days", "seven-days"]); // 거꾸로 골라도 같음
        expect(ids({ id: "custom", from: "2026-10-03", to: "" })).toEqual(["today", "yesterday-late"]); // 시작만
        expect(ids({ id: "custom", from: "", to: "2026-09-05" })).toEqual(["month-edge", "old"]); // 끝만
        expect(ids({ id: "custom", from: "", to: "" })).toHaveLength(6); // 둘 다 비우면 전체
    }); // 검증 종료
}); // 묶음 종료

describe("문의 초안", () => // 문의 묶음
{ // 묶음 시작
    it("제목과 내용이 비었거나 길면 알려 준다", () => // 검사 검증
    { // 검증 시작
        expect(validateInquiry(createInquiryDraft())).toEqual({ title: "제목을 적어 주세요.", body: "내용을 적어 주세요." }); // 빈 초안
        expect(validateInquiry({ ...createInquiryDraft(), title: "가".repeat(INQUIRY_TITLE_LIMIT + 1), body: "나".repeat(INQUIRY_BODY_LIMIT + 1) })).toEqual({ title: `제목은 ${INQUIRY_TITLE_LIMIT}자까지 적을 수 있어요.`, body: `내용은 ${INQUIRY_BODY_LIMIT}자까지 적을 수 있어요.` }); // 긴 초안
        expect(validateInquiry({ ...createInquiryDraft(), title: " 저장이 안 돼요 ", body: "새로고침하면 사라져요." })).toEqual({}); // 정상
    }); // 검증 종료

    it("종류·제목·내용과 진단 정보를 한 글로 묶고, 화면 언어를 따른다", () => // 글 만들기 검증
    { // 검증 시작
        const draft = { kind: "data" as const, title: " 저장이 안 돼요 ", body: "새로고침하면 사라져요.\n", includeDiagnostics: true }; // 초안
        expect(buildInquiryText(draft, "앱 버전: 1.0.0")).toBe("[문의 종류] 저장과 데이터\n[제목] 저장이 안 돼요\n[내용]\n새로고침하면 사라져요.\n\n[진단 정보]\n앱 버전: 1.0.0"); // 진단 정보 포함
        expect(buildInquiryText({ ...draft, includeDiagnostics: false }, "앱 버전: 1.0.0")).toBe("[문의 종류] 저장과 데이터\n[제목] 저장이 안 돼요\n[내용]\n새로고침하면 사라져요."); // 진단 정보 뺌
        setActiveLocale("en"); // 영어 화면
        expect(buildInquiryText({ ...draft, includeDiagnostics: false }, "")).toBe("[Inquiry type] Storage & data\n[Title] 저장이 안 돼요\n[Content]\n새로고침하면 사라져요."); // 영어 머리말
        expect(inquiryKinds.every((item) => Object.hasOwn(en, item.label))).toBe(true); // 종류 이름 번역
    }); // 검증 종료
}); // 묶음 종료

describe("업데이트 소식과 멤버십 비교표", () => // 안내 자료 묶음
{ // 묶음 시작
    it("소식은 최근 순이고 묶음마다 달라진 점이 있으며 영어 문구가 모두 있다", () => // 소식 검증
    { // 검증 시작
        const dates = releaseNotes.map((note) => note.date); // 날짜
        expect(dates).toEqual([...dates].sort().reverse()); // 최근 순
        expect(new Set(dates).size).toBe(dates.length); // 날짜 겹침 없음(목록 열쇠)
        expect(releaseNotes.length).toBeGreaterThan(RELEASE_NOTE_PREVIEW); // 더 보기가 있음
        expect(releaseNotes.every((note) => note.items.length > 0)).toBe(true); // 달라진 점 있음
        expect(releaseNotes.flatMap((note) => [note.title, ...note.items]).filter((text) => !Object.hasOwn(en, text))).toEqual([]); // 빠진 영어 문구 없음
    }); // 검증 종료

    it("비교표는 모든 멤버십의 칸을 채우고 영어 문구가 모두 있다", () => // 비교표 검증
    { // 검증 시작
        expect(membershipPlans.map((plan) => plan.id)).toEqual(["free", "plus", "creator"]); // 열 순서
        expect(membershipRows.every((row) => membershipPlans.every((plan) => row.values[plan.id].length > 0))).toBe(true); // 빈 칸 없음
        expect([...membershipPlans.map((plan) => plan.summary), ...membershipRows.flatMap((row) => [row.label, ...Object.values(row.values)])].filter((text) => !Object.hasOwn(en, text))).toEqual([]); // 빠진 영어 문구 없음
    }); // 검증 종료
}); // 묶음 종료

describe("로그아웃", () => // 로그아웃 묶음
{ // 묶음 시작
    it("19+ 보기를 끄고 패널을 닫되 캐릭터·대화·토큰·성인 인증은 그대로 둔다", () => // 이 기기 정리 검증
    { // 검증 시작
        const initial = createInitialState(); // 초기 상태
        const before = { ...initial, settings: { ...initial.settings, matureContentEnabled: true, leftPanelOpen: true, rightPanelOpen: true } }; // 19+ 보기를 켠 상태
        const after = appReducer(before, { type: "end-local-session" }); // 로그아웃
        expect(after.settings).toMatchObject({ matureContentEnabled: false, leftPanelOpen: false, rightPanelOpen: false }); // 꺼지고 닫힘
        expect(after.characters).toBe(before.characters); // 캐릭터 그대로
        expect(after.conversations).toBe(before.conversations); // 대화 그대로
        expect(after.wallet).toBe(before.wallet); // 토큰 그대로
        expect(after.profile).toBe(before.profile); // 프로필(성인 인증 포함) 그대로
        expect(after.settings.theme).toBe(before.settings.theme); // 다른 설정 그대로
    }); // 검증 종료
}); // 묶음 종료
