import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { afterEach, describe, expect, it } from "vitest"; // 테스트 도구
import { ExploreScreen } from "@chatbot/features/explore/ExploreScreen"; // 탐색 화면
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

describe("탐색 화면", () => // 탐색 묶음
{ // 묶음 시작
    afterEach(() => // 주소 정리
    { // 정리 시작
        window.history.replaceState(null, "", "/"); // 주소 초기화
    }); // 정리 종료

    it("추천 작품·제작자·태그를 각각 한 줄씩 보여 준다", () => // 줄 구성 검증
    { // 검증 시작
        renderWithApp(<ExploreScreen initialTag={null} />); // 탐색 렌더
        const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent); // 줄 제목
        expect(headings).toEqual(["장르별 추천 작품", "주목할 제작자", "인기 태그"]); // 줄 순서 확인
        expect(within(screen.getByRole("region", { name: "장르별 추천 작품" })).getAllByRole("link")).toHaveLength(12); // 추천 작품 수
        expect(within(screen.getByRole("region", { name: "주목할 제작자" })).getAllByRole("article").length).toBeGreaterThan(1); // 제작자 카드
    }); // 검증 종료

    it("태그를 검색해 고르면 결과와 주소를 갱신하고 해제할 수 있다", async () => // 태그 검색 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<ExploreScreen initialTag={null} />); // 탐색 렌더
        await user.type(screen.getByRole("searchbox", { name: "태그 검색" }), "힐링"); // 태그 입력
        const suggestions = screen.getByRole("group", { name: "태그 검색 결과" }); // 제안 영역
        await user.click(within(suggestions).getByRole("button", { name: /#힐링/ })); // 제안 선택
        const results = screen.getByRole("region", { name: /#힐링 작품/ }); // 결과 영역
        expect(within(results).getAllByRole("link").length).toBeGreaterThan(0); // 결과 작품 확인
        expect(window.location.search).toBe("?tag=%ED%9E%90%EB%A7%81"); // 주소 갱신 확인
        await user.click(screen.getByRole("button", { name: "태그 선택 해제" })); // 선택 해제
        expect(screen.queryByRole("region", { name: /#힐링 작품/ })).not.toBeInTheDocument(); // 결과 제거 확인
        expect(window.location.pathname + window.location.search).toBe("/explore"); // 주소 초기화 확인
    }); // 검증 종료

    it("검색창에서 Enter로 첫 제안 태그를 고르고 없는 태그를 안내한다", async () => // 키보드 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<ExploreScreen initialTag={null} />); // 탐색 렌더
        const search = screen.getByRole("searchbox", { name: "태그 검색" }); // 검색창
        await user.type(search, "없는태그"); // 없는 태그 입력
        expect(screen.getByRole("status")).toHaveTextContent("일치하는 태그가 없습니다"); // 없음 안내
        await user.clear(search); // 입력 지우기
        await user.type(search, "#SF{Enter}"); // 태그 확정
        expect(screen.getByRole("heading", { level: 2, name: /#SF 작품/ })).toBeInTheDocument(); // 결과 제목 확인
    }); // 검증 종료

    it("주소의 태그로 결과를 바로 보여 주고 제작자 팔로우를 전환한다", async () => // 초기 태그 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<ExploreScreen initialTag="#판타지" />); // 초기 태그 렌더
        expect(screen.getByRole("heading", { level: 2, name: /#판타지 작품/ })).toBeInTheDocument(); // 초기 결과 확인
        const creators = screen.getByRole("region", { name: "주목할 제작자" }); // 제작자 줄
        const follow = within(creators).getAllByRole("button", { name: /제작자 팔로우$/ })[0]!; // 첫 팔로우 버튼
        await user.click(follow); // 팔로우 실행
        expect(follow).toHaveAttribute("aria-pressed", "true"); // 팔로우 상태 확인
        expect(follow).toHaveTextContent("팔로잉"); // 표시 문구 확인
    }); // 검증 종료
}); // 묶음 종료
