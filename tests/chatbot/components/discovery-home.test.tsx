import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it } from "vitest"; // 테스트 도구
import { DiscoveryHome } from "@chatbot/features/discovery/DiscoveryHome"; // 탐색 화면
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태

describe("캐릭터 탐색", () => // 탐색 묶음
{ // 묶음 시작
    it("검색어와 카테고리를 함께 적용한다", async () => // 복합 필터 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        await user.type(screen.getByRole("searchbox", { name: "제목과 작가 검색" }), "하린"); // 검색 입력
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
        expect(within(ranking).getByText("예시 순위")).toBeVisible(); // 실제 집계가 아니라는 표시
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

    it("탐색 결과 아래에 유저 추천 캐릭터와 관심 목록을 차례로 보여 준다", () => // 추천·관심 영역 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        state.likedCharacterIds = ["harin"]; // 하린 좋아요
        state.bookmarkedCharacterIds = ["kyle"]; // 카일 보관
        renderWithApp(<DiscoveryHome />, state); // 탐색 렌더
        const regions = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label")); // 영역 순서
        expect(regions.slice(regions.indexOf("캐릭터 탐색 결과"))).toEqual(["캐릭터 탐색 결과", "유저 추천 캐릭터", "관심 목록"]); // 탐색 결과 아래 순서
        const recommended = screen.getByRole("region", { name: "유저 추천 캐릭터" }); // 추천 영역
        expect(within(recommended).getAllByRole("link")).toHaveLength(8); // 추천 개수
        expect(recommended).toHaveTextContent(/#.+ 취향을 바탕으로 골랐어요/); // 추천 기준 안내
        expect(within(recommended).queryByRole("link", { name: /퇴근길 카페의 하린/ })).toBeNull(); // 좋아요 캐릭터 제외
        const interests = screen.getByRole("region", { name: "관심 목록" }); // 관심 영역
        expect(within(interests).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/characters/harin", "/characters/kyle"]); // 좋아요·보관 캐릭터
        expect(interests).toHaveTextContent("좋아요 1 · 보관 1"); // 개수 안내
    }); // 검증 종료

    it("관심 캐릭터가 없으면 안내와 탐색 링크를 보여 주고 검색 중에는 두 영역을 숨긴다", async () => // 빈 관심·검색 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        const interests = screen.getByRole("region", { name: "관심 목록" }); // 관심 영역
        expect(interests).toHaveTextContent("아직 관심 캐릭터가 없어요."); // 빈 안내
        expect(within(interests).getByRole("link", { name: "캐릭터 탐색하기" })).toHaveAttribute("href", "/explore"); // 탐색 링크
        await user.type(screen.getByRole("searchbox", { name: "제목과 작가 검색" }), "하린"); // 검색 입력
        expect(screen.queryByRole("region", { name: "유저 추천 캐릭터" })).toBeNull(); // 추천 숨김
        expect(screen.queryByRole("region", { name: "관심 목록" })).toBeNull(); // 관심 숨김
    }); // 검증 종료

    it("장르를 여러 개 고르면 하나라도 맞는 캐릭터를 보여 주고, 전체를 누르면 모두 푼다", async () => // 여러 장르 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        const genres = screen.getByRole("group", { name: "캐릭터 카테고리" }); // 장르 버튼
        const count = screen.getByRole("status", { name: "찾은 캐릭터" }); // 찾은 수
        const total = Number(/캐릭터 (\d+)명/.exec(count.textContent ?? "")?.[1]); // 전체 수
        expect(within(genres).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true"); // 처음에는 전체
        await user.click(within(genres).getByRole("button", { name: "힐링" })); // 힐링
        const healing = Number(/캐릭터 (\d+)명/.exec(count.textContent ?? "")?.[1]); // 힐링 수
        expect(count).toHaveTextContent("조건 1개"); // 조건 수
        await user.click(within(genres).getByRole("button", { name: "SF" })); // SF도
        const both = Number(/캐릭터 (\d+)명/.exec(count.textContent ?? "")?.[1]); // 둘 중 하나
        expect(within(genres).getByRole("button", { name: "힐링" })).toHaveAttribute("aria-pressed", "true"); // 힐링 유지
        expect(within(genres).getByRole("button", { name: "SF" })).toHaveAttribute("aria-pressed", "true"); // SF 추가
        expect(within(genres).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "false"); // 전체 해제
        expect(count).toHaveTextContent("조건 2개"); // 조건 수
        expect(both).toBeGreaterThan(healing); // 하나라도 맞으면 보여 줌
        expect(both).toBeLessThan(total); // 전체보다는 적음
        expect(screen.queryByRole("region", { name: "실시간 랭킹" })).toBeNull(); // 조건을 걸면 기본 영역은 숨김
        await user.click(within(genres).getByRole("button", { name: "힐링" })); // 힐링 빼기
        expect(within(genres).getByRole("button", { name: "힐링" })).toHaveAttribute("aria-pressed", "false"); // 빠짐
        await user.click(within(genres).getByRole("button", { name: "전체" })); // 전체
        expect(count).toHaveTextContent(`캐릭터 ${total}명`); // 다시 전체
        expect(screen.getByRole("region", { name: "실시간 랭킹" })).toBeVisible(); // 기본 영역 복귀
    }); // 검증 종료

    it("정렬을 바꾸고 처음 만나는 캐릭터·관심 목록·이용 등급 조건을 함께 건 뒤 한 번에 지운다", async () => // 정렬과 조건 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태(리안·세라·노아와 대화 중)
        state.likedCharacterIds = ["harin", "rian"]; // 하린·리안 좋아요
        renderWithApp(<DiscoveryHome />, state); // 탐색 렌더
        const bar = screen.getByRole("region", { name: "정렬과 필터" }); // 정렬과 필터
        const count = within(bar).getByRole("status", { name: "찾은 캐릭터" }); // 찾은 수
        expect(within(bar).queryByRole("button", { name: "조건 지우기" })).toBeNull(); // 기본 화면에는 없음
        expect(within(within(bar).getByRole("combobox", { name: "이용 등급" })).queryByRole("option", { name: "19세 이용가" })).toBeNull(); // 19+를 켜지 않으면 19세 조건 없음
        await user.selectOptions(within(bar).getByRole("combobox", { name: "정렬" }), "name"); // 이름순
        const results = screen.getByRole("region", { name: "캐릭터 탐색 결과" }); // 결과 영역
        const names = within(results).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent ?? ""); // 카드 이름
        expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right, "ko"))); // 가나다순
        expect(screen.queryByRole("region", { name: "실시간 랭킹" })).toBeNull(); // 정렬을 바꾸면 결과만 보여 줌
        expect(count).not.toHaveTextContent("조건"); // 정렬은 조건 수에 넣지 않음
        await user.click(within(bar).getByRole("checkbox", { name: "관심 목록만" })); // 관심 목록만
        expect(within(results).getAllByRole("link").map((link) => link.getAttribute("href")).sort()).toEqual(["/characters/harin", "/characters/rian"]); // 좋아요한 둘
        await user.click(within(bar).getByRole("checkbox", { name: "처음 만나는 캐릭터만" })); // 대화해 보지 않은 캐릭터만
        expect(within(results).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/characters/harin"]); // 리안은 대화 중이라 빠짐
        expect(count).toHaveTextContent("캐릭터 1명 · 조건 2개"); // 수와 조건
        await user.selectOptions(within(bar).getByRole("combobox", { name: "이용 등급" }), "teen"); // 15세만
        expect(count).toHaveTextContent("조건 3개"); // 조건 추가
        await user.click(within(bar).getByRole("button", { name: "조건 지우기" })); // 지우기
        expect(within(bar).getByRole("combobox", { name: "정렬" })).toHaveValue("recommended"); // 추천순으로
        expect(within(bar).getByRole("checkbox", { name: "관심 목록만" })).not.toBeChecked(); // 조건 해제
        expect(screen.getByRole("region", { name: "실시간 랭킹" })).toBeVisible(); // 기본 화면 복귀
    }); // 검증 종료

    it("#태그를 치면 후보가 나오고, 여러 태그를 고르면 모두 가진 작품만 남도록 좁혀진다", async () => // 태그 검색 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        const search = screen.getByRole("searchbox", { name: "제목과 작가 검색" }); // 검색창
        const count = screen.getByRole("status", { name: "찾은 캐릭터" }); // 찾은 수
        const read = () => Number(/캐릭터 (\d+)명/.exec(count.textContent ?? "")?.[1]); // 찾은 수 읽기
        const total = read(); // 전체 수
        expect(screen.queryByRole("region", { name: "태그로 좁히기" })).toBeNull(); // 처음에는 없음
        await user.type(search, "#판"); // 태그 입력 시작
        const panel = screen.getByRole("region", { name: "태그로 좁히기" }); // 태그 영역
        const first = within(within(panel).getByRole("list", { name: "태그 제안" })).getAllByRole("button")[0]; // 첫 제안
        expect(first).toHaveAccessibleName(/^#판타지 태그 더하기, 작품 \d+개$/); // 앞부분이 맞는 태그가 먼저
        const fantasy = read(); // 입력 중에도 바로 좁혀짐
        expect(fantasy).toBeLessThan(total); // 줄어듦
        await user.keyboard("{Enter}"); // 첫 제안 고르기
        expect(search).toHaveValue(""); // 입력 중이던 토막은 지워짐
        expect(within(within(panel).getByRole("list", { name: "고른 태그" })).getByRole("button", { name: "#판타지 태그 빼기" })).toBeInTheDocument(); // 칩으로 붙음
        expect(read()).toBe(fantasy); // 같은 결과
        expect(count).toHaveTextContent("조건 1개"); // 조건 수
        expect(within(panel).getByText("이어서 좁히기")).toBeInTheDocument(); // 다음 제안 안내
        expect(within(panel).queryByRole("button", { name: /^#판타지 태그 더하기/ })).toBeNull(); // 고른 태그는 제안에서 빠짐
        await user.click(within(panel).getByRole("button", { name: /^#미스터리 태그 더하기/ })); // 미스터리도
        const both = read(); // 둘 다 가진 작품
        expect(both).toBeGreaterThan(0); // 결과 있음
        expect(both).toBeLessThan(fantasy); // 더 좁혀짐
        expect(count).toHaveTextContent("조건 2개"); // 조건 수
        expect(screen.getByRole("link", { name: /달빛 기록관의 노아/ })).toBeVisible(); // 판타지·미스터리를 모두 가진 노아
        expect(screen.queryByRole("link", { name: /새벽 도서관의 리안/ })).toBeNull(); // 미스터리가 없는 리안은 제외
        await user.click(within(panel).getByRole("button", { name: "#판타지 태그 빼기" })); // 판타지 빼기
        expect(read()).toBeGreaterThan(both); // 다시 넓어짐
        await user.click(search); // 검색창으로
        await user.keyboard("{Backspace}"); // 빈 검색창에서 지우기
        expect(screen.queryByRole("region", { name: "태그로 좁히기" })).toBeNull(); // 마지막 태그도 빠짐
        expect(read()).toBe(total); // 처음으로
    }); // 검증 종료

    it("다 적은 #태그는 띄어쓰면 칩이 되고, 없는 태그는 알려 주며, 조건 지우기로 태그도 함께 지운다", async () => // 띄어쓰기·없는 태그 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<DiscoveryHome />); // 탐색 렌더
        const search = screen.getByRole("searchbox", { name: "제목과 작가 검색" }); // 검색창
        await user.type(search, "#힐링 "); // 다 적고 띄어쓰기
        expect(screen.getByRole("button", { name: "#힐링 태그 빼기" })).toBeInTheDocument(); // 칩으로
        expect(search).toHaveValue(""); // 검색창은 비움
        await user.type(search, "#ㅇㅅ"); // 초성(일상)
        expect(screen.getByRole("button", { name: /^#일상 태그 더하기/ })).toBeInTheDocument(); // 초성으로 찾은 제안
        await user.clear(search); // 지움
        await user.type(search, "#없는태그"); // 없는 태그
        expect(screen.getByRole("status", { name: "태그 안내" })).toHaveTextContent("‘#없는태그’에 맞는 태그가 없어요."); // 안내
        expect(screen.getByText("조건에 맞는 캐릭터가 없습니다.")).toBeInTheDocument(); // 결과 없음
        await user.click(screen.getByRole("button", { name: "조건 지우기" })); // 지우기
        expect(search).toHaveValue(""); // 검색어 지움
        expect(screen.queryByRole("region", { name: "태그로 좁히기" })).toBeNull(); // 태그도 지움
        expect(screen.getByRole("region", { name: "실시간 랭킹" })).toBeVisible(); // 기본 화면
    }); // 검증 종료
}); // 묶음 종료
