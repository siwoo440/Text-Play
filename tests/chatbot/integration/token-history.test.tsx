import { screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState, TokenRecord } from "@chatbot/features/core/types"; // 상태 타입
import { RewardsScreen } from "@chatbot/features/rewards/RewardsScreen"; // 출석과 미션 화면
import { TokenSettings } from "@chatbot/features/settings/TokenSettings"; // 토큰 이용 내역 화면
import { MockImageAdapter } from "@chatbot/lib/adapters/mock-image-adapter"; // 이미지 어댑터
import { MockLLMAdapter } from "@chatbot/lib/adapters/mock-llm-adapter"; // Mock 대화 어댑터
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ replace: () => undefined, push: () => undefined }), // 이동 대역
    usePathname: () => "/settings/tokens", // 현재 경로
})); // 대체 종료

const now = Date.now(); // 지금
const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString(); // 몇 시간 전
const records: TokenRecord[] = // 최근 순 기록(오늘 2건, 이틀 전 1건)
[ // 목록 시작
    { id: "spend-chat-1", direction: "spend", source: "chat", label: "대화", work: "새벽 도서관의 리안", amount: 3, balance: 1222, createdAt: hoursAgo(0) }, // 오늘 대화
    { id: "attendance-1", direction: "earn", source: "attendance", label: "출석 1일차", amount: 5, balance: 1225, createdAt: hoursAgo(0) }, // 오늘 출석
    { id: "spend-studio-1", direction: "spend", source: "studio-image", label: "이미지 만들기", work: "새벽 도서관 창가", amount: 20, balance: 1220, createdAt: hoursAgo(48) }, // 이틀 전 이미지
]; // 목록 종료

function withRecords(tokenRecords: TokenRecord[]): AppState // 기록이 있는 상태
{ // 함수 시작
    return { ...createInitialState(), tokenRecords }; // 상태 반환
} // 함수 종료

function Probe() // 최신 토큰 기록 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const latest = state.tokenRecords[0]; // 최신 기록
    return <output aria-label="최신 기록">{latest === undefined ? "없음" : `${latest.source}|${latest.label}|${latest.work ?? ""}|${latest.amount}|${latest.balance}`}</output>; // 표시 반환
} // 함수 종료

describe("토큰 이용 내역", () => // 화면 묶음
{ // 묶음 시작
    it("최근 7일 그래프와 날짜별 이용 기록을 보여 주고 받음·사용으로 거른다", async () => // 그래프·목록
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<TokenSettings />, withRecords(records)); // 렌더
        expect(screen.getByText("최근 7일 동안 5토큰을 받고 23토큰을 썼어요.")).toBeVisible(); // 7일 요약
        expect(screen.getByRole("img", { name: /^최근 7일 토큰: .*받음 5 사용 3$/ })).toBeInTheDocument(); // 그래프(오늘 값으로 끝남)
        expect(within(screen.getByRole("list", { name: "범례" })).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["받음", "사용"]); // 범례
        expect(within(screen.getByRole("table", { name: "최근 7일 토큰" })).getAllByRole("row")).toHaveLength(8); // 표로 보기(머리 + 7일)
        expect(within(screen.getByRole("table", { name: "항목별 비용" })).getAllByRole("row")).toHaveLength(10); // 비용표(머리 + 채팅 등급 일곱 + 이미지 둘)
        const filter = screen.getByRole("group", { name: "기록 종류" }); // 필터
        expect(within(filter).getByRole("button", { name: "전체 3" })).toHaveAttribute("aria-pressed", "true"); // 전체
        const list = () => screen.getAllByRole("list").filter((item) => item.tagName === "OL").flatMap((item) => within(item).getAllByRole("listitem")); // 기록 줄
        expect(list()).toHaveLength(3); // 세 건
        expect(list()[0]).toHaveTextContent("대화"); // 최신 기록
        expect(list()[0]).toHaveTextContent("새벽 도서관의 리안"); // 쓴 곳
        expect(list()[0]).toHaveTextContent("−3"); // 쓴 양
        expect(list()[1]).toHaveTextContent("+5"); // 받은 양
        await user.click(within(filter).getByRole("button", { name: "사용 2" })); // 사용만
        expect(list().map((item) => within(item).getByText(/^(대화|이미지 만들기|출석 1일차)$/).textContent)).toEqual(["대화", "이미지 만들기"]); // 쓴 기록만
        await user.click(within(filter).getByRole("button", { name: "받음 1" })); // 받음만
        expect(list()).toHaveLength(1); // 한 건
        expect(list()[0]).toHaveTextContent("출석 1일차"); // 받은 기록
    }); // 검증 종료

    it("기록이 많으면 50건씩 보여 주고 더 보기로 이어 본다", async () => // 더 보기
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const many = Array.from({ length: 60 }, (_item, index): TokenRecord => ({ id: `spend-${index}`, direction: "spend", source: "chat", label: "대화", work: "새벽 도서관의 리안", amount: 1, balance: 1240 - index, createdAt: hoursAgo(index / 10) })); // 60건
        renderWithApp(<TokenSettings />, withRecords(many)); // 렌더
        const count = () => screen.getAllByRole("list").filter((item) => item.tagName === "OL").flatMap((item) => within(item).getAllByRole("listitem")).length; // 기록 줄 수
        expect(count()).toBe(50); // 50건
        await user.click(screen.getByRole("button", { name: "기록 더 보기 (10건 남음)" })); // 더 보기
        expect(count()).toBe(60); // 모두
        expect(screen.queryByRole("button", { name: /기록 더 보기/ })).toBeNull(); // 버튼 사라짐
    }); // 검증 종료

    it("기록이 없으면 안내를 보여 준다", () => // 빈 상태
    { // 검증 시작
        renderWithApp(<TokenSettings />); // 기록 없는 초기 상태
        expect(screen.getByText(/아직 기록이 없어요/)).toBeVisible(); // 안내
        expect(screen.getByText("최근 7일 동안 0토큰을 받고 0토큰을 썼어요.")).toBeVisible(); // 요약
    }); // 검증 종료

    it("출석과 미션 화면의 받은 기록에는 쓴 기록이 섞이지 않는다", () => // 받은 기록 분리
    { // 검증 시작
        renderWithApp(<RewardsScreen />, withRecords(records)); // 보상 화면
        const list = screen.getByRole("list", { name: "받은 토큰 기록" }); // 받은 기록
        expect(within(list).getAllByRole("listitem")).toHaveLength(1); // 받은 것만
        expect(within(list).getByText("출석 1일차")).toBeVisible(); // 출석
    }); // 검증 종료
}); // 묶음 종료

describe("보내기 전 예상 비용과 대화 기록", () => // 채팅 묶음
{ // 묶음 시작
    function renderChat(mutate?: (state: AppState) => void) // 리안 대화 렌더
    { // 함수 시작
        const state = createInitialState(); // 초기 상태
        mutate?.(state); // 상태 변형
        renderWithApp(<><ChatScreen characterId="rian" llm={new MockLLMAdapter({ delayMs: 0 })} images={new MockImageAdapter()} /><Probe /></>, state); // 렌더
    } // 함수 종료

    it("전송 버튼 위에 이번 메시지 비용을 보여 주고, 보내면 대화 기록이 남는다", async () => // 예상 비용·기록
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderChat(); // 베이직챗(1토큰)
        expect(screen.getByText("1토큰 사용")).toBeVisible(); // 예상 비용
        await user.type(screen.getByLabelText("메시지"), "안녕"); // 입력
        expect(screen.getByRole("button", { name: "전송" })).toHaveAccessibleDescription("1토큰 사용"); // 버튼 설명
        await user.keyboard("{Enter}"); // 전송
        await waitFor(() => expect(screen.getByLabelText("메시지")).toBeEnabled()); // 응답 완료
        await waitFor(() => expect(screen.getByLabelText("최신 기록")).toHaveTextContent("chat|대화|새벽 도서관의 리안|1|1239")); // 대화 기록
        await user.click(screen.getByRole("button", { name: "장면 이미지 생성 · 20토큰" })); // 장면 이미지
        await waitFor(() => expect(screen.getByLabelText("최신 기록")).toHaveTextContent("scene-image|장면 이미지 만들기|새벽 도서관의 리안|20|1219")); // 장면 이미지 기록
    }); // 검증 종료

    it("채팅 등급에 따라 예상 비용이 바뀌고, 잔액이 모자라면 토큰 부족을 보여 준다", () => // 등급·부족
    { // 검증 시작
        renderChat((state) => // 플러스챗
        { // 변형 시작
            const conversation = state.conversations.find((item) => item.id === "conversation-rian")!; // 리안 대화
            conversation.settings = { ...conversation.settings, tier: "plus" }; // 플러스챗(3토큰)
            state.wallet = { ...state.wallet, balance: 2 }; // 잔액 2
        }); // 변형 종료
        expect(screen.getByText("토큰 부족")).toHaveAttribute("title", expect.stringContaining("3토큰")); // 부족 안내(비용은 설명으로)
        expect(screen.queryByText("3토큰 사용")).toBeNull(); // 비용 문구 대신
    }); // 검증 종료
}); // 묶음 종료
