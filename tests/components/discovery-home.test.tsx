import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it } from "vitest"; // 테스트 도구
import { DiscoveryHome } from "@/features/discovery/DiscoveryHome"; // 탐색 화면
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태

describe("캐릭터 탐색", () => // 탐색 묶음
{ // 묶음 시작
    it("검색어와 카테고리를 함께 적용한다", async () => // 복합 필터 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        await user.type(screen.getByRole("searchbox", { name: "캐릭터와 세계관 검색" }), "하린"); // 검색 입력
        await user.click(screen.getByRole("button", { name: "힐링" })); // 카테고리 선택
        expect(screen.getByRole("link", { name: /퇴근길 카페의 하린/ })).toBeVisible(); // 일치 카드
        expect(screen.queryByRole("link", { name: /별 항해사 카일/ })).toBeNull(); // 불일치 제외
    }); // 검증 종료

    it("비공개 캐릭터를 탐색에 노출하지 않는다", () => // 공개 범위 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 준비
        state.characters[0] = { ...state.characters[0], visibility: "private" }; // 비공개 적용
        renderWithApp(<DiscoveryHome />, state); // 탐색 렌더
        expect(screen.queryByRole("link", { name: /새벽 도서관의 리안/ })).toBeNull(); // 비공개 제외 확인
    }); // 검증 종료

    it("상위 열 명을 랭킹 영역에 제공한다", () => // 랭킹 영역 검증
    { // 검증 시작
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        const ranking = screen.getByRole("region", { name: "실시간 랭킹" }); // 랭킹 영역 조회
        expect(ranking).toHaveAttribute("id", "ranking"); // 앵커 식별자 확인
        expect(within(ranking).getAllByRole("link")).toHaveLength(10); // 상위 열 명 확인
        expect(within(ranking).getByText("1위")).toBeVisible(); // 첫 순위 확인
        expect(within(ranking).getByText("10위")).toBeVisible(); // 마지막 순위 확인
    }); // 검증 종료

    it("기본 목록을 열두 명씩 추가로 표시한다", async () => // 더 보기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        const results = screen.getByRole("region", { name: "캐릭터 탐색 결과" }); // 결과 영역 조회
        expect(within(results).getAllByRole("link")).toHaveLength(12); // 초기 목록 확인
        await user.click(screen.getByRole("button", { name: "캐릭터 더 보기" })); // 더 보기 실행
        expect(within(results).getAllByRole("link")).toHaveLength(24); // 추가 목록 확인
    }); // 검증 종료
}); // 묶음 종료
