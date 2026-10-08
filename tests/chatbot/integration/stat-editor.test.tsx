import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { CharacterEditor } from "@chatbot/features/character/CharacterEditor"; // 캐릭터 편집기
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

function StatProbe() // 저장된 리안 스탯 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const rian = state.characters.find((character) => character.id === "rian"); // 리안
    return <><output aria-label="리안 관계 스탯">{String(rian?.statusTemplate.relationStatId)}</output><output aria-label="리안 스탯">{JSON.stringify(rian?.statusTemplate.stats.map((stat) => ({ name: stat.name, icon: stat.icon, initial: stat.initial, min: stat.min, max: stat.max, mode: stat.mode, perTurn: stat.perTurn, rules: stat.rules, scope: stat.scope })))}</output></>; // JSON 출력
} // 함수 종료

function renderOwnedRian() // 내가 만든 리안으로 편집기 열기
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.characters[0] = { ...state.characters[0], creatorId: state.profile.id }; // 소유 캐릭터
    renderWithApp(<><CharacterEditor characterId="rian" /><StatProbe /></>, state); // 렌더
} // 함수 종료

describe("제작자 스탯 편집", () => // 묶음
{ // 묶음 시작
    it("스탯을 추가해 이름·아이콘·초기값·범위·규칙·적용 대상을 정하고 저장한다", async () => // 저장 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        renderOwnedRian(); // 렌더
        const list = screen.getByRole("list", { name: "스탯 목록" }); // 스탯 목록(기본 호감도)
        expect(within(list).getAllByRole("listitem")).toHaveLength(1); // 호감도 하나
        await user.click(screen.getByRole("button", { name: /＋ 스탯 추가/ })); // 추가
        const card = within(list).getAllByRole("listitem")[1]; // 새 스탯
        await user.type(within(card).getByLabelText("이름"), "체력"); // 이름
        await user.type(within(card).getByLabelText("아이콘"), "💪"); // 아이콘
        const initial = within(card).getByLabelText("초기값"); // 초기값
        await user.clear(initial); // 비우기
        await user.type(initial, "80"); // 초기값 80 입력
        await user.click(within(card).getByRole("radio", { name: /규칙대로/ })); // 규칙만
        expect(within(card).queryByLabelText("AI 한 턴 최대 변화")).toBeNull(); // AI 한도 숨김
        const perTurn = within(card).getByLabelText("매 턴 변화"); // 매 턴
        await user.clear(perTurn); // 비우기
        await user.type(perTurn, "-2"); // 턴마다 -2 입력
        await user.click(within(card).getByRole("button", { name: "＋ 낱말 규칙" })); // 낱말 규칙
        await user.type(within(card).getByLabelText("낱말 1"), "물약"); // 낱말
        const delta = within(card).getByLabelText("변화"); // 변화
        await user.clear(delta); // 비우기
        await user.type(delta, "30"); // 변화량 +30 입력
        await user.selectOptions(within(card).getByLabelText("적용 대상"), "shared"); // 공통
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("공개 저장했습니다."); // 저장 안내
        const saved = JSON.parse(screen.getByLabelText("리안 스탯").textContent ?? "[]"); // 저장 값
        expect(saved[1]).toEqual({ name: "체력", icon: "💪", initial: 80, min: 0, max: 100, mode: "rule", perTurn: -2, rules: [{ keyword: "물약", delta: 30 }], scope: "shared" }); // 저장 확인
    }); // 검증 종료

    it("범위를 벗어난 초기값이나 겹치는 이름은 안내하고 저장하지 않는다", async () => // 검증 오류
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        renderOwnedRian(); // 렌더
        const card = within(screen.getByRole("list", { name: "스탯 목록" })).getAllByRole("listitem")[0]; // 호감도
        const initial = within(card).getByLabelText("초기값"); // 초기값
        await user.clear(initial); // 비우기
        await user.type(initial, "150"); // 범위 밖
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장 시도
        expect(screen.getByText("‘호감도’의 초기값은 0~100 사이여야 합니다.")).toBeVisible(); // 안내
        expect(screen.getByLabelText("리안 스탯")).toHaveTextContent("\"initial\":0"); // 저장 안 됨
    }); // 검증 종료

    it("관계 스탯은 인물마다 따로인 스탯 하나만 지정할 수 있고, 공통으로 바꾸거나 지우면 지정이 풀린다", async () => // 관계 스탯 지정
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        renderOwnedRian(); // 렌더(호감도가 관계 스탯)
        const list = screen.getByRole("list", { name: "스탯 목록" }); // 스탯 목록
        const affection = within(list).getAllByRole("listitem")[0]; // 호감도
        expect(within(affection).getByRole("checkbox", { name: /관계 스탯으로 쓰기/ })).toBeChecked(); // 기본 지정
        await user.click(screen.getByRole("button", { name: /＋ 스탯 추가/ })); // 추가
        const trust = within(list).getAllByRole("listitem")[1]; // 새 스탯
        await user.type(within(trust).getByLabelText("이름"), "신뢰도"); // 이름
        await user.click(within(trust).getByRole("checkbox", { name: /관계 스탯으로 쓰기/ })); // 신뢰도로 바꿈
        expect(within(affection).getByRole("checkbox", { name: /관계 스탯으로 쓰기/ })).not.toBeChecked(); // 하나만 지정
        await user.selectOptions(within(trust).getByLabelText("적용 대상"), "shared"); // 공통으로
        expect(within(trust).queryByRole("checkbox", { name: /관계 스탯으로 쓰기/ })).toBeNull(); // 공통 스탯은 지정 불가
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장
        expect(screen.getByLabelText("리안 관계 스탯")).toHaveTextContent("null"); // 지정 해제 저장
    }); // 검증 종료

    it("스탯을 지우면 상태창에서도 빠지고, 상태창을 끄면 스탯 입력이 잠긴다", async () => // 삭제·잠금
    { // 검증 시작
        const user = userEvent.setup(); // 사용자
        renderOwnedRian(); // 렌더
        await user.click(screen.getByRole("button", { name: "호감도 스탯 삭제" })); // 삭제
        expect(screen.queryByRole("list", { name: "스탯 목록" })).toBeNull(); // 목록 비움
        await user.click(screen.getByRole("button", { name: /＋ 스탯 추가/ })); // 다시 추가
        await user.click(screen.getByRole("checkbox", { name: "매 턴 상태창 보여 주기" })); // 상태창 끔
        expect(within(screen.getByRole("list", { name: "스탯 목록" })).getByLabelText("이름")).toBeDisabled(); // 입력 잠김
    }); // 검증 종료
}); // 묶음 종료
