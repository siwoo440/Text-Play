import { screen, within } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { DISCOVERY_FILTER_KEY } from "@chatbot/features/discovery/discovery-filter"; // 메인 조건 저장 키
import { DiscoveryHome } from "@chatbot/features/discovery/DiscoveryHome"; // 메인 화면
import { ExploreScreen } from "@chatbot/features/explore/ExploreScreen"; // 탐색 화면
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지 만들기
import { ImageStudio } from "@chatbot/features/images/ImageStudio"; // 이미지 스튜디오
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함
import { StoryHome } from "@chatbot/features/story/StoryHome"; // 스토리 목록
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
})); // 대체 종료

vi.setConfig({ testTimeout: 20_000 }); // 화면이 큰 테스트라 넉넉히 기다림

describe("탐색 페이지의 태그 여러 개", () => // 탐색 묶음
{ // 묶음 시작
    it("태그를 이어서 골라 좁히고, 칩이나 지우기 키로 하나씩 뺀다", async () => // 여러 태그 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<ExploreScreen initialTag={null} />); // 탐색 렌더
        const search = screen.getByRole("searchbox", { name: "태그 검색" }); // 검색창
        await user.type(search, "ㅎㄹ"); // 초성으로 찾기
        await user.click(within(screen.getByRole("group", { name: "태그 검색 결과" })).getByRole("button", { name: /#힐링/ })); // 힐링 고르기
        const results = screen.getByRole("region", { name: /#힐링 작품/ }); // 결과 영역
        const before = within(results).getAllByRole("link").length; // 힐링 작품 수
        const narrow = within(results).getByRole("group", { name: "이어서 좁힐 태그" }); // 이어서 좁히기
        const second = within(narrow).getAllByRole("button")[0]; // 첫 제안
        const secondTag = (second.querySelector("span")?.textContent ?? "").replace("#", ""); // 태그 이름
        await user.click(second); // 둘째 태그 고르기
        expect(screen.getByRole("heading", { level: 2, name: new RegExp(`#힐링 #${secondTag} 작품`) })).toBeInTheDocument(); // 두 태그 제목
        expect(within(screen.getByRole("region", { name: /#힐링/ })).getAllByRole("link").length).toBeLessThan(before); // 더 좁혀짐
        expect(window.location.search).toBe(`?tag=${encodeURIComponent("힐링")}&tag=${encodeURIComponent(secondTag)}`); // 주소에 두 태그
        await user.click(within(screen.getByRole("group", { name: "고른 태그" })).getByRole("button", { name: "#힐링 태그 빼기" })); // 힐링 빼기
        expect(screen.getByRole("heading", { level: 2, name: new RegExp(`^#${secondTag} 작품`) })).toBeInTheDocument(); // 남은 태그만
        await user.click(search); // 검색창으로
        await user.keyboard("{Backspace}"); // 빈 검색창에서 지우기
        expect(screen.queryByRole("region", { name: /작품 \d+개/ })).not.toBeInTheDocument(); // 태그가 모두 빠짐
        expect(window.location.pathname + window.location.search).toBe("/explore"); // 주소 초기화
    }); // 테스트 종료

    it("주소에 태그가 여러 개 있으면 모두 고른 채로 시작한다", () => // 초기 태그 검증
    { // 테스트 시작
        renderWithApp(<ExploreScreen initialTag={["#힐링", "힐링", "판타지"]} />); // 겹친 태그 포함
        expect(within(screen.getByRole("group", { name: "고른 태그" })).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["#힐링 태그 빼기", "#판타지 태그 빼기"]); // 겹침 없이 두 개
    }); // 테스트 종료
}); // 묶음 종료

describe("대화 목록과 보관함 검색", () => // 대화 검색 묶음
{ // 묶음 시작
    it("왼쪽 대화 목록은 지난 말로도 대화를 찾고, 누르면 그 말로 간다", async () => // 대화 전체 검색 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태
        state.settings.leftPanelOpen = true; // 대화 목록 열기
        renderWithApp(<AppShell><main>본문</main></AppShell>, state); // 화면 렌더
        const panel = screen.getByRole("complementary", { name: "진행 중인 대화방" }); // 대화 패널
        await user.type(within(panel).getByRole("searchbox", { name: "대화방 검색" }), "창가"); // 지난 말로 찾기
        const titles = Array.from(panel.querySelectorAll(".conversation-card-title")).map((title) => title.textContent); // 남은 카드
        expect(titles).toEqual(["새벽 도서관의 리안"]); // 리안 대화만
        const link = within(panel).getByRole("link", { name: /새벽 도서관의 리안/ }); // 카드 링크
        expect(link).toHaveTextContent("찾은 말 이 자리는 늘 네가 오던 창가야."); // 찾은 말 표시
        expect(link.getAttribute("href")).toContain("message=message-rian-1"); // 그 말로 가는 주소
    }); // 테스트 종료

    it("보관함은 지금 탭 안에서 이름과 대화 내용으로 찾는다", async () => // 보관함 검색 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<LibraryScreen />); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭
        const search = screen.getByRole("searchbox", { name: "보관함 검색" }); // 검색창
        await user.type(search, "우산"); // 세라 대화의 말
        const panel = screen.getByRole("tabpanel"); // 탭 내용
        expect(screen.getByRole("status", { name: "찾은 수" })).toHaveTextContent("1개 찾음"); // 찾은 수
        expect(panel).toHaveTextContent("비 오는 교실, 세라"); // 세라 대화
        expect(panel).not.toHaveTextContent("달빛 기록관의 노아"); // 다른 대화 숨김
        await user.clear(search); // 지우기
        await user.type(search, "없는말"); // 없는 낱말
        expect(panel).toHaveTextContent("‘없는말’에 맞는 항목이 없어요."); // 빈 안내
        await user.clear(search); // 지우기
        expect(panel).toHaveTextContent("달빛 기록관의 노아"); // 모두 다시 표시
        expect(screen.queryByRole("status", { name: "찾은 수" })).not.toBeInTheDocument(); // 검색어가 없으면 수를 숨김
    }); // 테스트 종료
}); // 묶음 종료

describe("스토리 목록과 내 이미지 검색", () => // 스토리·이미지 묶음
{ // 묶음 시작
    it("스토리는 제목·등장인물·태그로 찾는다", async () => // 스토리 검색 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<StoryHome />); // 스토리 목록 렌더
        const list = screen.getByRole("region", { name: "지금 시작할 수 있는 스토리" }); // 공개 스토리
        const all = within(list).getAllByRole("link").length; // 전체 수
        const search = screen.getByRole("searchbox", { name: "스토리 검색" }); // 검색창
        await user.type(search, "하린"); // 등장인물 이름
        const found = within(list).getAllByRole("link").length; // 찾은 수
        expect(found).toBeGreaterThan(0); // 결과 있음
        expect(found).toBeLessThan(all); // 좁혀짐
        expect(list).toHaveTextContent("하린"); // 등장인물 표시
        await user.clear(search); // 지우기
        await user.type(search, "없는스토리"); // 없는 낱말
        expect(list).toHaveTextContent("‘없는스토리’에 맞는 스토리가 없어요."); // 빈 안내
    }); // 테스트 종료

    it("내 이미지는 장면 설명과 그림체로 찾고, 잠긴 19세 이미지는 찾지 않는다", async () => // 이미지 검색 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태
        const garden = createGeneratedImage({ prompt: "숲속 정원", style: "watercolor", aspect: "square", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-01T00:00:00.000Z", "image-garden"); // 수채화
        const sea = createGeneratedImage({ prompt: "바닷가 노을", style: "anime", aspect: "landscape", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-01T00:01:00.000Z", "image-sea"); // 애니메이션
        const mature = createGeneratedImage({ prompt: "성인 바텐더의 밤", style: "cinematic", aspect: "portrait", referenceCharacterId: null, contentRating: "mature" }, "kr", "2026-10-01T00:02:00.000Z", "image-mature"); // 19세 이미지
        state.images = [mature, sea, garden]; // 갤러리 준비
        renderWithApp(<ImageStudio />, state); // 스튜디오 렌더
        const gallery = screen.getByRole("region", { name: "내 이미지" }); // 갤러리
        const search = within(gallery).getByRole("searchbox", { name: "내 이미지 검색" }); // 검색창
        await user.type(search, "정원"); // 장면 설명
        expect(within(gallery).getAllByRole("article")).toHaveLength(1); // 한 장
        expect(gallery).toHaveTextContent("숲속 정원"); // 정원 이미지
        await user.clear(search); // 지우기
        await user.type(search, "수채화"); // 그림체
        expect(within(gallery).getAllByRole("article")).toHaveLength(1); // 한 장
        await user.clear(search); // 지우기
        await user.type(search, "바텐더"); // 잠긴 이미지의 설명
        expect(within(gallery).queryAllByRole("article")).toHaveLength(0); // 찾지 않음
        expect(gallery).toHaveTextContent("‘바텐더’에 맞는 이미지가 없어요."); // 빈 안내
    }); // 테스트 종료
}); // 묶음 종료

describe("메인 조건 기억", () => // 조건 기억 묶음
{ // 묶음 시작
    it("고른 정렬과 검색어를 탭에 기억했다가 다시 열면 이어받고, 조건을 지우면 기억도 지운다", async () => // 기억 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const first = renderWithApp(<DiscoveryHome />); // 메인 렌더
        await user.selectOptions(screen.getByRole("combobox", { name: "정렬" }), "인기순"); // 정렬
        await user.type(screen.getByRole("searchbox", { name: "제목과 작가 검색" }), "하린"); // 검색어
        expect(JSON.parse(window.sessionStorage.getItem(DISCOVERY_FILTER_KEY) ?? "{}")).toMatchObject({ sort: "popular", query: "하린" }); // 기억됨
        first.unmount(); // 화면 닫기(새로고침·다른 페이지)
        renderWithApp(<DiscoveryHome />); // 다시 열기
        expect(screen.getByRole("combobox", { name: "정렬" })).toHaveValue("popular"); // 정렬 이어받음
        expect(screen.getByRole("searchbox", { name: "제목과 작가 검색" })).toHaveValue("하린"); // 검색어 이어받음
        expect(screen.getByRole("link", { name: /퇴근길 카페의 하린/ })).toBeVisible(); // 결과도 그대로
        await user.click(screen.getByRole("button", { name: "조건 지우기" })); // 조건 지우기
        expect(window.sessionStorage.getItem(DISCOVERY_FILTER_KEY)).toBeNull(); // 기억 지움
    }); // 테스트 종료
}); // 묶음 종료
